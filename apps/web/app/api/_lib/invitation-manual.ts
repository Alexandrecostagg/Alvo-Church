import { randomBytes, createHash } from "node:crypto";
import {
  campaignPersonalize,
  manualCampaignEligible,
  manualCampaignSlot,
  manualWhatsappLink,
} from "@alvo/domain";
import { AccountError, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";

export async function manualCampaignOperation(
  tx: AccountTransaction,
  raw: Record<string, any>,
  root: string,
  campaign: any,
  organization: any,
  uid: string,
  now: number,
) {
  if (campaign.deliveryMode !== "manual" || campaign.deliveryEnabled)
    throw new AccountError(
      409,
      "Esta campanha não usa envio manual assistido.",
    );
  const base = `${root}/invitationCampaigns/${campaign.id}`;
  const org = root.split("/")[1];
  const slot = manualCampaignSlot(campaign, now);
  const at = new Date(now).toISOString();
  const active =
    campaign.status === "active" &&
    Date.parse(campaign.event.startsAt) > now &&
    (!campaign.inviteOpensAt || Date.parse(campaign.inviteOpensAt) <= now);
  const dayPath = `${base}/manualDays/${slot.date}`;
  const sha = (s: string) => createHash("sha256").update(s).digest("hex");
  if (raw.action === "manual-queue") {
    const [day] = await tx.read(dayPath);
    if (!active || !slot.ready)
      return {
        rows: [],
        nextCursor: null,
        date: slot.date,
        reportedSent: day?.sent || 0,
        skipped: day?.skipped || 0,
        message: !active
          ? "Abra a campanha para organizar os envios manuais."
          : slot.index < 0
            ? "Não há mensagem programada para hoje. Confira o calendário da campanha."
            : `A fila de hoje fica disponível às ${campaign.hour}, no fuso ${campaign.timezone}.`,
      };
    const cursor = raw.cursor ? documentId(raw.cursor, "Página") : undefined;
    const guests = await tx.query(
      base,
      "guests",
      undefined,
      undefined,
      "EQUAL",
      51,
      undefined,
      { field: "__name__", direction: "ASCENDING" },
      cursor,
    );
    const batch = guests.slice(0, 50);
    const receipts = await tx.read(
      ...batch.map((g) => `${base}/manualMessages/${g.id}_${slot.index}`),
    );
    const contacts = await tx.read(
      ...batch.map((g) => `${root}/whatsappContacts/${sha(g.phone)}`),
    );
    return {
      date: slot.date,
      stepIndex: slot.index,
      reportedSent: day?.sent || 0,
      skipped: day?.skipped || 0,
      rows: batch.flatMap((g, i) => {
        const receipt = receipts[i];
        if (
          g.organizationId !== org ||
          !manualCampaignEligible(g, contacts[i]) ||
          ["sent", "skipped"].includes(receipt?.status)
        )
          return [];
        return [
          {
            id: g.id,
            name: g.name,
            phone: g.phone,
            inviterName: g.inviterName,
            status: g.status,
            reserved:
              receipt?.status === "reserved" &&
              Date.parse(receipt.leaseUntil) > now,
            reservedByYou: receipt?.actorId === uid,
          },
        ];
      }),
      nextCursor: guests.length > 50 ? batch.at(-1)!.id : null,
      message:
        "A fila usa a autorização dada no cadastro; a equipe confere o destinatário antes de enviar.",
    };
  }
  const guestId = documentId(raw.guestId, "Convidado");
  const guestPath = `${base}/guests/${guestId}`;
  const index = raw.stepIndex;
  if (!Number.isInteger(index) || index < 0 || index >= campaign.steps.length)
    throw new AccountError(400, "Etapa inválida.");
  const receiptPath = `${base}/manualMessages/${guestId}_${index}`;
  const [g, receipt] = await tx.read(guestPath, receiptPath);
  if (!g || g.organizationId !== org)
    throw new AccountError(404, "Convidado não encontrado.");
  const log = (action: string) =>
    tx.set(`${root}/campaignAudit/${crypto.randomUUID()}`, {
      action,
      campaignId: campaign.id,
      guestId,
      actorId: uid,
      stepIndex: index,
      at,
    });
  if (raw.action === "manual-claim") {
    if (!active || !slot.ready || index !== slot.index)
      throw new AccountError(
        409,
        "Atualize a fila: esta etapa não está disponível hoje.",
      );
    const requestId = documentId(raw.requestId, "Tentativa");
    const [contact] = await tx.read(`${root}/whatsappContacts/${sha(g.phone)}`);
    if (!manualCampaignEligible(g, contact))
      throw new AccountError(
        409,
        "Este convidado não pode receber lembretes. Atualize a fila.",
      );
    if (["sent", "skipped"].includes(receipt?.status))
      throw new AccountError(
        409,
        "Esta etapa já foi concluída. Atualize a fila.",
      );
    if (
      receipt?.status === "reserved" &&
      Date.parse(receipt.leaseUntil) > now
    ) {
      if (receipt.actorId === uid && receipt.requestId === requestId)
        return {
          ...receipt,
          name: g.name,
          phone: g.phone,
          senderPhone: campaign.manualSenderPhone,
          whatsappUrl: manualWhatsappLink(g.phone, receipt.text),
        };
      throw new AccountError(
        409,
        "Este contato está reservado por outra sessão por até 10 minutos.",
      );
    }
    const dt = new Date(campaign.event.startsAt);
    const step = campaign.steps[g.manualFirstSentAt ? index : 0];
    const text = campaignPersonalize(
      g.status === "confirmed" ? step.confirmedBody : step.body,
      {
        convidado: g.name.split(" ")[0],
        membro: g.inviterName,
        igreja: organization?.displayName || organization?.name || "Igreja",
        evento: campaign.event.name,
        data: dt.toLocaleDateString("pt-BR", { timeZone: campaign.timezone }),
        horario: dt.toLocaleTimeString("pt-BR", {
          timeZone: campaign.timezone,
          hour: "2-digit",
          minute: "2-digit",
        }),
        local: campaign.event.location,
      },
    ).text;
    const row = {
      organizationId: org,
      campaignId: campaign.id,
      guestId,
      stepIndex: index,
      date: slot.date,
      status: "reserved",
      actorId: uid,
      requestId,
      claimToken: randomBytes(24).toString("hex"),
      text,
      leaseUntil: new Date(now + 10 * 60000).toISOString(),
      updatedAt: at,
    };
    tx.set(receiptPath, row);
    log("manual_reserved");
    return {
      ...row,
      name: g.name,
      phone: g.phone,
      senderPhone: campaign.manualSenderPhone,
      whatsappUrl: manualWhatsappLink(g.phone, text),
    };
  }
  if (
    !receipt ||
    receipt.actorId !== uid ||
    typeof raw.claimToken !== "string" ||
    receipt.claimToken !== raw.claimToken
  )
    throw new AccountError(
      409,
      "A reserva mudou. Atualize a fila antes de continuar.",
    );
  if (raw.action === "manual-release") {
    if (receipt.status !== "reserved")
      throw new AccountError(409, "Esta etapa já foi concluída.");
    tx.patch(receiptPath, { status: "released", updatedAt: at });
    log("manual_released");
    return { ok: true };
  }
  if (
    raw.action !== "manual-complete" ||
    !["sent", "skipped"].includes(raw.outcome)
  )
    throw new AccountError(400, "Resultado inválido.");
  if (raw.outcome === "sent" && raw.acknowledgeManualSend !== true)
    throw new AccountError(
      400,
      "Confirme que você enviou a mensagem no WhatsApp.",
    );
  if (receipt.status === raw.outcome) return { ok: true, replayed: true };
  if (receipt.status !== "reserved")
    throw new AccountError(409, "Esta etapa já foi concluída.");
  const resultDay = `${base}/manualDays/${receipt.date}`;
  const [day] = await tx.read(resultDay);
  tx.patch(receiptPath, { status: raw.outcome, reportedAt: at, updatedAt: at });
  tx.set(resultDay, { ...day, [raw.outcome]: (day?.[raw.outcome] || 0) + 1 });
  if (raw.outcome === "sent")
    tx.patch(guestPath, {
      manualFirstSentAt: g.manualFirstSentAt || at,
      manualLastSentAt: at,
    });
  log(raw.outcome === "sent" ? "manual_send_reported" : "manual_skipped");
  return { ok: true };
}

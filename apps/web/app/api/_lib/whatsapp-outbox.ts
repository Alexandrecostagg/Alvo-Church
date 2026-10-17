import { assertWhatsappContactAllowed } from "./communication-operations";
import { assertModuleEnabled } from "./module-access";
import {
  channelForOrg,
  whatsappActor,
  type WhatsappChannel,
} from "./whatsapp-config";
import { AccountError, accountTransaction } from "./member-account-store";
import { digest } from "./participation";
import { documentId } from "./member-account";
import { whatsappPhone } from "@alvo/utils";

export function publicAppOrigin() {
  const value = process.env.PUBLIC_APP_ORIGIN;
  if (!value)
    throw new AccountError(503, "Configure o endereço público da plataforma.");
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !(
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new AccountError(503, "Endereço público inválido.");
  return url.origin;
}
export async function sendCloudMessage(
  channel: WhatsappChannel,
  message: Record<string, any>,
) {
  const version = process.env.WHATSAPP_GRAPH_VERSION;
  if (!/^v\d+\.\d+$/.test(version ?? ""))
    throw new AccountError(503, "Configure a versão da API do WhatsApp.");
  const payload =
    message.kind === "template"
      ? {
          type: "template",
          template: {
            name: message.templateName,
            language: { code: message.language },
            ...(message.parameters?.length
              ? {
                  components: [
                    {
                      type: "body",
                      parameters: message.parameters.map((text: string) => ({
                        type: "text",
                        text,
                      })),
                    },
                  ],
                }
              : {}),
          },
        }
      : { type: "text", text: { body: message.text, preview_url: false } };
  const response = await fetch(
    `https://graph.facebook.com/${version}/${channel.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${channel.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: message.to,
        ...payload,
      }),
      signal: AbortSignal.timeout(12000),
    },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("O provedor recusou a mensagem.") as Error & {
      definitive?: boolean;
    };
    // 5xx/transport failures may have been accepted remotely. Never auto resend them.
    error.definitive = response.status >= 400 && response.status < 500;
    throw error;
  }
  const id = result.messages?.[0]?.id;
  if (typeof id !== "string" || !id || id.length > 250)
    throw new Error("Resposta incerta do provedor.");
  return id;
}

/** Durable at-most-once dispatcher. Sending/uncertain records require human reconciliation, never a blind retry. */
export async function dispatchWhatsapp(
  orgId: string,
  outboxId: string,
  now = Date.now(),
) {
  const channel = channelForOrg(orgId);
  if (!channel) return { status: "not_configured" };
  const root = `organizations/${documentId(orgId, "Igreja")}`,
    path = `${root}/whatsappOutbox/${documentId(outboxId, "Mensagem")}`;
  const claimed = await accountTransaction(async (tx) => {
    const [row, org, profile] = await tx.read(
      path,
      root,
      `${root}/settings/pastoralAssistant`,
    );
    if (org?.status !== "active") return null;
    await assertModuleEnabled(tx, root, "communication");
    if (row && !row.createdBy && profile?.enabled !== true) {
      if (row.status === "pending") tx.patch(path, { status: "blocked" });
      return null;
    }
    if (
      !row ||
      row.status !== "pending" ||
      Date.parse(row.scheduledAt ?? row.createdAt) > now
    )
      return null;
    const [contact] = await tx.read(
      `${root}/whatsappContacts/${digest(row.to)}`,
    );
    if (!contact || (contact.optOut && !row.optOutAcknowledgement)) {
      tx.patch(path, {
        status: "blocked",
        updatedAt: new Date(now).toISOString(),
      });
      return null;
    }
    if(!row.optOutAcknowledgement){
      try { await assertWhatsappContactAllowed(tx,root,row.to); }
      catch(error){if(error instanceof AccountError && error.status===409){tx.patch(path,{status:"blocked",updatedAt:new Date(now).toISOString()});return null;}throw error;}
    }
    if (
      row.kind === "text" &&
      (!Number.isFinite(Date.parse(contact.lastInboundAt)) ||
        now - Date.parse(contact.lastInboundAt) >= 24 * 60 * 60 * 1000)
    ) {
      tx.patch(path, {
        status: "expired",
        updatedAt: new Date(now).toISOString(),
      });
      return null;
    }
    if (
      row.kind === "template" &&
      (!channel.paidMessagesEnabled || !(channel.templates ?? []).includes(row.templateName))
    ) {
      tx.patch(path, {
        status: "blocked",
        updatedAt: new Date(now).toISOString(),
      });
      return null;
    }
    tx.patch(path, {
      status: "sending",
      sendingAt: new Date(now).toISOString(),
    });
    return row;
  });
  if (!claimed) return { status: "unchanged" };
  let providerId: string;
  try {
    providerId = await sendCloudMessage(channel, claimed);
  } catch (error) {
    const status = (error as { definitive?: boolean }).definitive
      ? "failed"
      : "uncertain";
    await accountTransaction(async (tx) => {
      const [row] = await tx.read(path);
      if (row?.status === "sending")
        tx.patch(path, { status, updatedAt: new Date().toISOString() });
    });
    return { status };
  }
  // A failed local commit leaves 'sending'. It must be reconciled, not retried.
  await accountTransaction(async (tx) => {
    const [row, receipt, contact] = await tx.read(
      path,
      `${root}/whatsappReceipts/${digest(providerId)}`,
      `${root}/whatsappContacts/${digest(claimed.to)}`,
    );
    if (row?.status === "sending") {
      tx.patch(path, {
        status:
          receipt && receipt.recipient === claimed.to
            ? receipt.status
            : "accepted",
        providerId,
        updatedAt: new Date().toISOString(),
      });
      if (claimed.createdBy && contact)
        tx.patch(`${root}/whatsappContacts/${digest(claimed.to)}`, {
          thread: [
            ...(Array.isArray(contact.thread) ? contact.thread : []),
            {
              direction: "out",
              text:
                claimed.kind === "template"
                  ? `[Template: ${claimed.templateName}]`
                  : claimed.text,
              at: new Date().toISOString(),
            },
          ].slice(-20),
        });
    }
  });
  return { status: "accepted" };
}

export async function enqueueStaffWhatsapp(
  raw: Record<string, any>,
  uid: string,
) {
  const orgId = documentId(raw.organizationId, "Igreja"),
    requestId = documentId(raw.requestId, "Tentativa");
  const to = whatsappPhone(raw.to);
  if (!to) throw new AccountError(400, "Confira o telefone.");
  const kind = raw.kind === "template" ? "template" : "text";
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (kind === "text" && (!text || text.length > 4000))
    throw new AccountError(400, "Mensagem deve ter até 4000 caracteres.");
  const channel = channelForOrg(orgId);
  if (!channel) throw new AccountError(503, "WhatsApp ainda não conectado.");
  if (kind === "template" && !channel.paidMessagesEnabled)
    throw new AccountError(403, "Envios potencialmente pagos estão desativados até a definição do orçamento.");
  if (
    kind === "template" &&
    (!(channel.templates ?? []).includes(raw.templateName) ||
      !/^[a-z]{2}_[A-Z]{2}$/.test(raw.language ?? "") ||
      !Array.isArray(raw.parameters) ||
      raw.parameters.length > 10 ||
      raw.parameters.some(
        (p: unknown) => typeof p !== "string" || !p.trim() || p.length > 500,
      ))
  )
    throw new AccountError(
      400,
      "Confira o template aprovado, idioma e parâmetros.",
    );
  const scheduledAt = raw.scheduledAt
    ? Date.parse(raw.scheduledAt)
    : Date.now();
  if (!Number.isFinite(scheduledAt) || scheduledAt > Date.now() + 30 * 86400000)
    throw new AccountError(400, "Agende para os próximos 30 dias.");
  const fingerprint = digest(
    JSON.stringify({
      to,
      kind,
      text,
      templateName: raw.templateName,
      language: raw.language,
      parameters: raw.parameters,
      scheduledAt: raw.scheduledAt ?? null,
    }),
  );
  const id = `staff_${digest(`${uid}:${requestId}`)}`;
  await accountTransaction(async (tx) => {
    const { root } = await whatsappActor(tx, orgId, uid);
    const [contact, existing] = await tx.read(
      `${root}/whatsappContacts/${digest(to)}`,
      `${root}/whatsappOutbox/${id}`,
    );
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new AccountError(409, "Tentativa já usada.");
      return;
    }
    await assertWhatsappContactAllowed(tx,root,to);
    if (!contact || contact.optOut)
      throw new AccountError(
        409,
        "O contato precisa iniciar a conversa e permitir o atendimento.",
      );
    if (
      kind === "text" &&
      scheduledAt - Date.parse(contact.lastInboundAt) >= 24 * 60 * 60 * 1000
    )
      throw new AccountError(
        409,
        "Use um template aprovado fora da janela de atendimento.",
      );
    tx.set(`${root}/whatsappOutbox/${id}`, {
      id,
      organizationId: orgId,
      to,
      kind,
      text,
      ...(kind === "template"
        ? {
            templateName: raw.templateName,
            language: raw.language,
            parameters: raw.parameters,
          }
        : {}),
      status: "pending",
      scheduledAt: new Date(scheduledAt).toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: uid,
      fingerprint,
    });
    tx.set(`${root}/communicationAudit/${crypto.randomUUID()}`, {
      action: "provider_message_queued",
      outboxId: id,
      actorId: uid,
      at: new Date().toISOString(),
    });
  });
  return { id, ...(await dispatchWhatsapp(orgId, id)) };
}

export async function applyWhatsappStatus(
  orgId: string,
  providerId: string,
  recipient: string,
  incoming: string,
) {
  if (
    !["sent", "delivered", "read", "failed"].includes(incoming) ||
    !/^\d{10,15}$/.test(recipient)
  )
    return;
  await accountTransaction(async (tx) => {
    const root = `organizations/${orgId}`,
      receiptPath = `${root}/whatsappReceipts/${digest(providerId)}`;
    const [previous] = await tx.read(receiptPath);
    const rows = await tx.query(
      root,
      "whatsappOutbox",
      "providerId",
      providerId,
      "EQUAL",
      2,
    );
    const ranks: Record<string, number> = {
      accepted: 0,
      sent: 1,
      delivered: 2,
      read: 3,
    };
    const canAdvance = (current: string) =>
      incoming === "failed"
        ? !["delivered", "read"].includes(current)
        : (ranks[incoming] ?? -1) > (ranks[current] ?? -1);
    if (previous?.recipient && previous.recipient !== recipient) return;
    if (!previous || canAdvance(previous.status))
      tx.set(receiptPath, {
        recipient,
        status: incoming,
        updatedAt: new Date().toISOString(),
      });
    if (
      rows.length !== 1 ||
      rows[0].to !== recipient ||
      !canAdvance(rows[0].status)
    )
      return;
    tx.patch(`${root}/whatsappOutbox/${rows[0].id}`, {
      status: incoming,
      updatedAt: new Date().toISOString(),
    });
  });
}

import { randomBytes, createHash } from "node:crypto";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { documentId } from "./member-account";
import { financeActor, textField } from "./finance-operations";
import { assertModuleEnabled } from "./module-access";
import { whatsappPhone } from "@alvo/utils";
import {
  campaignDay,
  campaignLocalDate,
  invitationCalendar,
  campaignCadence,
  repeatedInvitationCopy,
  campaignTemplate,
  campaignPersonalize,
  campaignEligible,
  manualCampaignEligible,
  manualCampaignSlot,
  invitationGuestLabel,
  type InvitationStep,
  type CampaignField,
} from "@alvo/domain";
import {
  servingInstant,
  servingDate,
} from "../../../src/features/serving/serving-contract";
import { channelForOrg } from "./whatsapp-config";
import { manualCampaignOperation } from "./invitation-manual";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const token = () => randomBytes(24).toString("hex");
const secret = (value: unknown) => {
  if (typeof value !== "string" || !/^[a-f0-9]{48}$/.test(value))
    throw new AccountError(404, "Convite não encontrado.");
  return value;
};
const rootFor = (org: string) =>
  `organizations/${documentId(org, "Instituição")}`;
const admins = ["church_admin", "super_admin", "pastor", "secretary"];
function audit(
  tx: AccountTransaction,
  root: string,
  action: string,
  data: Record<string, any>,
  now: number,
) {
  tx.set(`${root}/campaignAudit/${crypto.randomUUID()}`, {
    action,
    ...data,
    at: new Date(now).toISOString(),
  });
}
async function context(
  tx: AccountTransaction,
  root: string,
  id: string,
  now: number,
  open = false,
) {
  await assertModuleEnabled(tx, root, "events");
  const [campaign, org] = await tx.read(
    `${root}/invitationCampaigns/${documentId(id, "Campanha")}`,
    root,
  );
  if (
    !campaign ||
    org?.status !== "active" ||
    campaign.organizationId !== root.split("/")[1]
  )
    throw new AccountError(404, "Campanha indisponível.");
  const [event] = await tx.read(`${root}/events/${campaign.eventId}`);
  if (
    !event ||
    event.organizationId !== campaign.organizationId ||
    event.isPaid === true ||
    event.status !== "published"
  )
    throw new AccountError(
      409,
      "O evento está indisponível para esta campanha.",
    );
  if (
    event.startsAt !== campaign.event.startsAt ||
    event.name !== campaign.event.name ||
    (event.location || "Local informado pela igreja") !==
      campaign.event.location
  )
    throw new AccountError(
      409,
      "O evento foi alterado. Pause esta campanha e prepare outra com as novas informações.",
    );
  if (
    open &&
    campaign.inviteOpensAt &&
    now < Date.parse(campaign.inviteOpensAt)
  )
    throw new AccountError(
      409,
      `Os convites abrem em ${campaign.inviteStartDate.split("-").reverse().join("/")}.`,
    );
  if (
    open &&
    (campaign.status !== "active" || Date.parse(event.startsAt) <= now)
  )
    throw new AccountError(
      409,
      "As inscrições desta campanha estão encerradas ou pausadas.",
    );
  return { campaign, org, event };
}
function validateSteps(raw: any, offsets?: number[]): InvitationStep[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 15)
    throw new AccountError(400, "Configure de 1 a 15 dias de mensagens.");
  if (offsets && offsets.length !== raw.length)
    throw new AccountError(
      400,
      "Recalcule a sequência para as datas e o intervalo escolhidos.",
    );
  const rows = raw.map((s: any, i: number) => {
    if (!s || typeof s !== "object")
      throw new AccountError(400, "Etapa de mensagem inválida.");
    if (offsets && s.daysBefore !== offsets[i])
      throw new AccountError(
        400,
        "As datas dos textos não correspondem ao calendário. Recrie a sequência.",
      );
    const body = textField(s.body, "Mensagem", 900),
      confirmedBody = textField(
        s.confirmedBody,
        "Mensagem para presença confirmada",
        900,
      );
    try {
      campaignTemplate(body);
      campaignTemplate(confirmedBody);
    } catch (e) {
      throw new AccountError(
        400,
        e instanceof Error ? e.message : "Mensagem inválida.",
      );
    }
    if (
      !body.includes("{{igreja}}") ||
      !confirmedBody.includes("{{igreja}}") ||
      (i === 0 &&
        (!body.includes("{{membro}}") || !confirmedBody.includes("{{membro}}")))
    )
      throw new AccountError(
        400,
        "Identifique a igreja em todas as mensagens e quem convidou na primeira.",
      );
    if (
      i === 0 &&
      /amanhã|\bhoje\b|\b(?:faltam?|daqui\s+a)\s+\d+\s+dias?\b/iu.test(
        body + " " + confirmedBody,
      )
    )
      throw new AccountError(
        400,
        "Use a data do evento na primeira mensagem: ela também recebe inscritos tardios.",
      );
    if (
      (offsets?.[i] ?? raw.length - i) !== 1 &&
      /amanhã/i.test(body + " " + confirmedBody)
    )
      throw new AccountError(400, "Use amanhã apenas na mensagem da véspera.");
    const names = [s.templateName || "", s.confirmedTemplateName || ""];
    if (
      names.some(
        (v) => typeof v !== "string" || (v && !/^[a-z0-9_]{1,128}$/.test(v)),
      )
    )
      throw new AccountError(400, "Nome de template inválido.");
    return {
      daysBefore: offsets?.[i] ?? raw.length - i,
      ...(s.focus ? { focus: textField(s.focus, "Assunto", 100) } : {}),
      body,
      confirmedBody,
      templateName: names[0],
      confirmedTemplateName: names[1],
    };
  });
  const repeated = repeatedInvitationCopy(rows);
  if (repeated)
    throw new AccountError(
      400,
      `As mensagens ${repeated[0]} e ${repeated[1]} estão repetidas. Varie o conteúdo antes de salvar.`,
    );
  return rows;
}
async function member(
  tx: AccountTransaction,
  root: string,
  uid: string,
  org: string,
) {
  const [user, link] = await tx.read(
    `${root}/users/${uid}`,
    `${root}/memberAccountLinks/${uid}`,
  );
  if (
    user?.isActive !== true ||
    user.organizationId !== org ||
    !link?.verifiedBy ||
    link.userId !== uid ||
    link.organizationId !== org ||
    user.personId !== link.personId
  )
    throw new AccountError(
      409,
      "Peça à secretaria para vincular sua conta ao cadastro de membro.",
    );
  const [person, claim] = await tx.read(
    `${root}/people/${documentId(link.personId, "Pessoa")}`,
    `${root}/memberAccountClaims/${link.personId}`,
  );
  if (
    person?.organizationId !== org ||
    person.status !== "active" ||
    person.personType === "child" ||
    claim?.userId !== uid ||
    claim.personId !== link.personId ||
    claim.organizationId !== org
  )
    throw new AccountError(409, "Cadastro de membro indisponível.");
  return {
    personId: link.personId,
    name: String(person.preferredName || person.firstName || "membro").split(
      " ",
    )[0],
  };
}
export function campaignSchedule(campaign: any, now: number) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: campaign.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(campaign.event.startsAt));
  return campaign.steps
    .map((s: InvitationStep, index: number) => {
      const day = new Date(`${date}T12:00:00Z`);
      day.setUTCDate(day.getUTCDate() - s.daysBefore);
      const at = servingInstant(
        day.toISOString().slice(0, 10),
        campaign.hour,
        campaign.timezone,
      );
      return { index, scheduledAt: at };
    })
    .filter((s: any) => Date.parse(s.scheduledAt) >= now);
}
export async function campaignOperation(
  raw: Record<string, any>,
  uid: string,
  now = Date.now(),
) {
  const org = documentId(raw.organizationId, "Instituição"),
    root = rootFor(org),
    isMember = ["missions", "my-link"].includes(raw.action);
  return accountTransaction(async (tx) => {
    const { actor } = await financeActor(tx, org, uid, !isMember, null);
    await assertModuleEnabled(tx, root, "events");
    if (raw.action === "missions") {
      const me = await member(tx, root, uid, org),
        campaigns = await tx.query(
          root,
          "invitationCampaigns",
          "status",
          "active",
          "EQUAL",
          41,
        );
      if (campaigns.length > 40)
        throw new AccountError(409, "Filtre as campanhas da instituição.");
      const rows = [];
      for (const c of campaigns.filter(
        (c) => c.organizationId === org && Date.parse(c.event.startsAt) > now,
      )) {
        const [link] = await tx.read(
          `${root}/campaignInviters/${hash(c.id + ":" + uid)}`,
        );
        const guests = link
          ? await tx.query(
              `${root}/invitationCampaigns/${c.id}`,
              "guests",
              "inviterId",
              link.id,
              "EQUAL",
              201,
            )
          : [];
        rows.push({
          id: c.id,
          name: c.name,
          event: c.event,
          timezone: c.timezone,
          goal: c.memberGoal,
          inviteStartDate: c.inviteStartDate || null,
          invitesOpen: !c.inviteOpensAt || now >= Date.parse(c.inviteOpensAt),
          link: link ? `/convite/${link.token}` : null,
          guests: guests.slice(0, 200).map(invitationGuestLabel),
          hasMore: guests.length > 200,
        });
      }
      return { campaigns: rows, memberName: me.name };
    }
    if (raw.action === "my-link") {
      const id = documentId(raw.campaignId, "Campanha"),
        { campaign } = await context(tx, root, id, now, true),
        me = await member(tx, root, uid, org);
      const linkId = hash(id + ":" + uid),
        path = `${root}/campaignInviters/${linkId}`,
        [old] = await tx.read(path);
      if (old) return { link: `/convite/${old.token}` };
      const value = token();
      tx.set(path, {
        id: linkId,
        organizationId: org,
        campaignId: id,
        userId: uid,
        ...me,
        token: value,
        createdAt: new Date(now).toISOString(),
      });
      tx.set(`campaignInvitationLinks/${hash(value)}`, {
        organizationId: org,
        campaignId: campaign.id,
        inviterId: linkId,
      });
      return { link: `/convite/${value}` };
    }
    if (raw.action === "list") {
      const [campaigns, events] = await Promise.all([
        tx.query(
          root,
          "invitationCampaigns",
          undefined,
          undefined,
          "EQUAL",
          101,
        ),
        tx.query(root, "events", undefined, undefined, "EQUAL", 501),
      ]);
      if (campaigns.length > 100 || events.length > 500)
        throw new AccountError(
          409,
          "Divida o período antes de carregar mais campanhas.",
        );
      const channel = channelForOrg(org);
      const [organization] = await tx.read(root);
      return {
        campaigns: campaigns
          .filter((c) => c.organizationId === org)
          .map((c) => ({ ...c, steps: undefined }))
          .map(({ steps, ...c }) => c),
        events: events
          .filter(
            (e) =>
              e.organizationId === org &&
              e.status === "published" &&
              e.isPaid !== true &&
              Date.parse(e.startsAt) > now,
          )
          .map((e) => ({
            id: e.id,
            name: e.name,
            startsAt: e.startsAt,
            location: e.location,
          })),
        churchName: organization?.displayName || organization?.name || "Igreja",
        timezone: organization?.timezone || "America/Belem",
        whatsappConnected: !!channel,
        paidMessagesEnabled: channel?.paidMessagesEnabled === true,
        templates: channel?.templates || [],
        canManage: actor.roles?.some((r: string) => admins.includes(r)),
      };
    }
    if (raw.action === "save") {
      const id = documentId(raw.id, "Campanha"),
        eventId = documentId(raw.eventId, "Evento"),
        path = `${root}/invitationCampaigns/${id}`,
        [old, event, organization] = await tx.read(
          path,
          `${root}/events/${eventId}`,
          root,
        );
      if (old && (old.organizationId !== org || old.status !== "draft"))
        throw new AccountError(409, "Somente rascunhos podem ser editados.");
      if (raw.version !== (old?.version || 0))
        throw new AccountError(
          409,
          "A campanha mudou. Atualize antes de salvar.",
        );
      if (
        event?.organizationId !== org ||
        event.status !== "published" ||
        event.isPaid === true ||
        Date.parse(event.startsAt) <= now
      )
        throw new AccountError(
          400,
          "Escolha um evento gratuito, publicado e futuro.",
        );
      const hour = textField(raw.hour, "Horário", 5);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hour))
        throw new AccountError(400, "Horário inválido.");
      const target = raw.target,
        memberGoal = raw.memberGoal;
      if (
        !Number.isInteger(target) ||
        target < 1 ||
        target > 5000 ||
        !Number.isInteger(memberGoal) ||
        memberGoal < 1 ||
        memberGoal > 20
      )
        throw new AccountError(
          400,
          "Meta: 1 a 5000 convidados; missão: 1 a 20 por membro.",
        );
      const timezone = organization?.timezone || "America/Belem";
      const deliveryMode =
        raw.deliveryMode ?? old?.deliveryMode ?? (old ? "api" : "manual");
      if (!["manual", "api"].includes(deliveryMode))
        throw new AccountError(400, "Escolha envio manual ou API oficial.");
      const manualSenderPhone = raw.manualSenderPhone
        ? whatsappPhone(raw.manualSenderPhone)
        : "";
      if (raw.manualSenderPhone && !manualSenderPhone)
        throw new AccountError(
          400,
          "Informe um WhatsApp da igreja válido com DDD e país.",
        );
      try {
        new Intl.DateTimeFormat("pt-BR", { timeZone: timezone });
      } catch {
        throw new AccountError(400, "Configure um fuso válido na instituição.");
      }
      if (
        raw.maxMessages !== undefined &&
        (!Number.isInteger(raw.maxMessages) ||
          raw.maxMessages < 1 ||
          raw.maxMessages > 100000)
      )
        throw new AccountError(400, "Teto de mensagens: 1 a 100000.");
      let calendarFields: Record<string, any> = {};
      let offsets: number[] | undefined;
      if (
        raw.messageStartDate !== undefined ||
        raw.intervalDays !== undefined ||
        raw.inviteStartDate !== undefined
      ) {
        try {
          const eventDate = campaignLocalDate(event.startsAt, timezone),
            calendar = invitationCalendar(
              eventDate,
              raw.messageStartDate,
              raw.intervalDays,
            );
          campaignDay(raw.inviteStartDate);
          if (
            raw.inviteStartDate > raw.messageStartDate ||
            raw.inviteStartDate < campaignDay(eventDate, -90)
          )
            throw Error(
              "Abra os convites até a data do primeiro lembrete, dentro dos 90 dias anteriores ao evento.",
            );
          offsets = calendar.map((d) => d.daysBefore);
          calendarFields = {
            messageStartDate: raw.messageStartDate,
            intervalDays: raw.intervalDays,
            inviteStartDate: raw.inviteStartDate,
            inviteOpensAt: servingInstant(
              raw.inviteStartDate,
              "00:00",
              timezone,
            ),
            copyReviewRequired: true,
            messagesReviewed: raw.messagesReviewed === true,
          };
        } catch (e) {
          throw new AccountError(400, (e as Error).message);
        }
      }
      const steps = validateSteps(raw.steps, offsets),
        campaign = {
          id,
          organizationId: org,
          eventId,
          name: textField(raw.name, "Nome da campanha", 120),
          hour,
          target,
          memberGoal,
          timezone,
          deliveryMode,
          manualSenderPhone,
          ...calendarFields,
          steps,
          status: "draft",
          deliveryEnabled: false,
          maxMessages:
            Number.isInteger(raw.maxMessages) &&
            raw.maxMessages > 0 &&
            raw.maxMessages <= 100000
              ? raw.maxMessages
              : target * steps.length,
          event: {
            id: event.id || eventId,
            name: event.name,
            startsAt: event.startsAt,
            location: event.location || "Local informado pela igreja",
          },
          version: (old?.version || 0) + 1,
          createdAt: old?.createdAt || new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
        };
      if (
        !campaignSchedule(campaign, now).length &&
        !(deliveryMode === "manual" && manualCampaignSlot(campaign, now).ready)
      )
        throw new AccountError(
          400,
          "Não há dia de envio futuro antes desse evento. Ajuste o horário ou a data.",
        );
      tx.set(path, campaign);
      audit(tx, root, "saved", { campaignId: id, actorId: uid }, now);
      return { campaign };
    }
    const id = documentId(raw.campaignId, "Campanha"),
      base = `${root}/invitationCampaigns/${id}`,
      [campaign, organization] = await tx.read(base, root);
    if (!campaign || campaign.organizationId !== org)
      throw new AccountError(404, "Campanha não encontrada.");
    if (raw.action === "detail") {
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
      const shards = await tx.read(
        ...Array.from({ length: 16 }, (_, i) => `${base}/stats/${i}`),
      );
      const stats: Record<string, number> = {};
      for (const s of shards)
        if (s)
          for (const [k, v] of Object.entries(s))
            if (typeof v === "number") stats[k] = (stats[k] || 0) + v;
      const [budget] = await tx.read(`${base}/control/budget`);
      return {
        campaign,
        guests: guests
          .slice(0, 50)
          .map((g) => ({
            ...g,
            phone: g.phone,
            manageToken: undefined,
            ticketToken: undefined,
          }))
          .map(({ manageToken, ticketToken, ...g }) => g),
        nextCursor: guests.length > 50 ? guests[49].id : null,
        stats,
        budget: budget?.used || 0,
        churchName: organization?.displayName || organization?.name || "Igreja",
      };
    }
    if (raw.action === "state") {
      const states: Record<string, string[]> = {
        draft: ["active", "closed"],
        active: ["paused", "closed"],
        paused: ["active", "closed"],
        closed: [],
      };
      if (!states[campaign.status]?.includes(raw.status))
        throw new AccountError(409, "Transição de campanha inválida.");
      if (
        raw.status === "active" &&
        campaign.copyReviewRequired &&
        !campaign.messagesReviewed
      )
        throw new AccountError(
          409,
          "Revise e aprove os textos no rascunho antes de abrir ou agendar a campanha.",
        );
      if (raw.status === "active") await context(tx, root, id, now, false);
      if (
        raw.status === "active" &&
        campaign.deliveryMode === "manual" &&
        !campaign.manualSenderPhone
      )
        throw new AccountError(
          400,
          "Informe no rascunho o WhatsApp da igreja que a equipe usará para enviar.",
        );
      if (
        raw.status === "active" &&
        !campaignSchedule(campaign, now).length &&
        !(
          campaign.deliveryMode === "manual" &&
          manualCampaignSlot(campaign, now).ready
        )
      )
        throw new AccountError(409, "O prazo desta campanha terminou.");
      tx.patch(base, {
        status: raw.status,
        deliveryEnabled: false,
        version: campaign.version + 1,
        updatedAt: new Date(now).toISOString(),
      });
      audit(
        tx,
        root,
        "state",
        { campaignId: id, actorId: uid, status: raw.status },
        now,
      );
      return { ok: true };
    }
    if (raw.action === "delivery") {
      const enable = raw.enabled === true,
        channel = channelForOrg(org);
      if (enable && campaign.deliveryMode === "manual")
        throw new AccountError(
          409,
          "O envio manual não usa a API nem ativa cobranças da Meta.",
        );
      if (enable) {
        const enabled = await tx.query(
          root,
          "invitationCampaigns",
          "deliveryEnabled",
          true,
          "EQUAL",
          11,
        );
        if (enabled.filter((c) => c.id !== id).length >= 10)
          throw new AccountError(
            409,
            "Até 10 campanhas podem enviar lembretes simultaneamente. Desative outra antes de continuar.",
          );
        await context(tx, root, id, now, false);
        if (Date.parse(campaign.event.startsAt) <= now)
          throw new AccountError(409, "O evento já começou.");
        await assertModuleEnabled(tx, root, "communication");
        if (campaign.status !== "active" || !channel?.paidMessagesEnabled)
          throw new AccountError(
            409,
            "Conclua a conexão Meta e a autorização de mensagens pagas antes de ativar os envios.",
          );
        if (raw.acknowledgeBudget !== true)
          throw new AccountError(
            400,
            "Confirme o teto de mensagens da campanha.",
          );
        for (const step of campaign.steps)
          if (
            !channel.templates?.includes(step.templateName) ||
            !channel.templates.includes(step.confirmedTemplateName)
          )
            throw new AccountError(
              409,
              "Configure e aprove os templates de todas as etapas antes de enviar.",
            );
      }
      tx.patch(base, {
        deliveryEnabled: enable,
        version: campaign.version + 1,
        updatedAt: new Date(now).toISOString(),
      });
      audit(
        tx,
        root,
        "delivery",
        {
          campaignId: id,
          actorId: uid,
          enabled: enable,
          maxMessages: campaign.maxMessages,
        },
        now,
      );
      return { ok: true };
    }
    if (raw.action === "templates") {
      if (campaign.deliveryMode === "manual")
        throw new AccountError(409, "O envio manual não usa modelos da Meta.");
      if (
        campaign.status === "closed" ||
        !Array.isArray(raw.templates) ||
        raw.templates.length !== campaign.steps.length
      )
        throw new AccountError(400, "Confira os templates de cada etapa.");
      const steps = campaign.steps.map((step: any, i: number) => {
        const names = raw.templates[i];
        if (
          !names ||
          [names.templateName, names.confirmedTemplateName].some(
            (v) =>
              typeof v !== "string" || (v && !/^[a-z0-9_]{1,128}$/.test(v)),
          )
        )
          throw new AccountError(400, "Nome de template inválido.");
        return {
          ...step,
          templateName: names.templateName,
          confirmedTemplateName: names.confirmedTemplateName,
        };
      });
      tx.patch(base, {
        steps,
        deliveryEnabled: false,
        version: campaign.version + 1,
      });
      audit(
        tx,
        root,
        "templates_updated",
        { campaignId: id, actorId: uid },
        now,
      );
      return { ok: true };
    }
    if (
      [
        "manual-queue",
        "manual-claim",
        "manual-complete",
        "manual-release",
      ].includes(raw.action)
    ) {
      await context(tx, root, id, now, false);
      return manualCampaignOperation(
        tx,
        raw,
        root,
        campaign,
        organization,
        uid,
        now,
      );
    }
    if (raw.action === "manual-response") {
      if (campaign.deliveryMode !== "manual")
        throw new AccountError(
          409,
          "Esta campanha não usa acompanhamento manual.",
        );
      const guestId = documentId(raw.guestId, "Convidado"),
        path = `${base}/guests/${guestId}`;
      const [g] = await tx.read(path);
      if (!g || g.organizationId !== org)
        throw new AccountError(404, "Convidado não encontrado.");
      if (raw.acknowledgeResponse !== true)
        throw new AccountError(
          400,
          "Confirme que a resposta foi recebida pela equipe.",
        );
      const patch: Record<string, any> = {
        updatedAt: new Date(now).toISOString(),
      };
      const delta: Record<string, number> = {};
      if (raw.response === "stop") {
        patch.consent = false;
        patch.optOut = true;
        if (g.consent) delta.optedOut = 1;
        const contactPath = `${root}/whatsappContacts/${hash(g.phone)}`;
        const [contact] = await tx.read(contactPath);
        const stopped = { optOut: true, optOutAt: new Date(now).toISOString() };
        if (contact) tx.patch(contactPath, stopped);
        else tx.set(contactPath, { phone: g.phone, ...stopped });
      } else if (raw.response === "handoff") patch.handoff = true;
      else if (["confirmed", "declined"].includes(raw.response)) {
        if (
          g.status === "attended" ||
          Date.parse(campaign.event.startsAt) <= now
        )
          throw new AccountError(
            409,
            "A presença já foi registrada ou o evento começou.",
          );
        patch.status = raw.response;
        if (g.status !== raw.response) {
          delta[raw.response] = 1;
          if (["confirmed", "declined"].includes(g.status))
            delta[g.status] = -1;
        }
      } else throw new AccountError(400, "Resposta inválida.");
      if (Object.keys(delta).length) await count(tx, base, guestId, delta);
      tx.patch(path, patch);
      audit(
        tx,
        root,
        "manual_response",
        { campaignId: id, guestId, actorId: uid, response: raw.response },
        now,
      );
      return { ok: true };
    }
    if (raw.action === "preview") {
      const guestId = documentId(raw.guestId, "Convidado"),
        [guest] = await tx.read(`${base}/guests/${guestId}`);
      if (!guest || guest.organizationId !== org)
        throw new AccountError(404, "Convidado não encontrado.");
      const dt = new Date(campaign.event.startsAt),
        values: Record<CampaignField, string> = {
          convidado: guest.name.split(" ")[0],
          membro: guest.inviterName,
          igreja: organization?.displayName || organization?.name || "Igreja",
          evento: campaign.event.name,
          data: dt.toLocaleDateString("pt-BR", { timeZone: campaign.timezone }),
          horario: dt.toLocaleTimeString("pt-BR", {
            timeZone: campaign.timezone,
            hour: "2-digit",
            minute: "2-digit",
          }),
          local: campaign.event.location,
        };
      return {
        messages: campaignSchedule(campaign, now).map((s: any, i: number) => {
          const step =
            campaign.steps[i === 0 && !guest.firstDeliveredAt ? 0 : s.index];
          const body =
            guest.status === "confirmed" ? step.confirmedBody : step.body;
          return {
            scheduledAt: s.scheduledAt,
            ...campaignPersonalize(body, values),
            eligible:
              campaign.deliveryMode === "manual"
                ? manualCampaignEligible(guest)
                : campaignEligible(guest),
            template: campaignTemplate(body).template,
          };
        }),
      };
    }
    if (raw.action === "guest") {
      const guestId = documentId(raw.guestId, "Convidado"),
        path = `${base}/guests/${guestId}`,
        [g] = await tx.read(path);
      if (!g || g.organizationId !== org)
        throw new AccountError(404, "Convidado não encontrado.");
      const patch: Record<string, any> = {
        updatedAt: new Date(now).toISOString(),
      };
      if (raw.operation === "prayed")
        patch.lastPrayedAt = new Date(now).toISOString();
      else if (raw.operation === "handoff") {
        if (typeof raw.value !== "boolean")
          throw new AccountError(400, "Informe a situação do atendimento.");
        patch.handoff = raw.value;
        if (!raw.value) {
          const path = `${root}/whatsappContacts/${hash(g.phone)}`,
            [contact, handoff] = await tx.read(
              path,
              `${root}/whatsappHandoffs/${hash(g.phone)}`,
            );
          if (
            contact?.state?.type === "invitation_campaign" &&
            contact.state.campaignId === id &&
            contact.state.guestId === guestId
          ) {
            tx.patch(path, { handoff: false });
            if (handoff)
              tx.patch(`${root}/whatsappHandoffs/${hash(g.phone)}`, {
                status: "completed",
                updatedAt: new Date(now).toISOString(),
              });
          }
        }
      } else if (raw.operation === "followup")
        patch.followUpDoneAt = new Date(now).toISOString();
      else throw new AccountError(400, "Ação inválida.");
      tx.patch(path, patch);
      audit(
        tx,
        root,
        raw.operation,
        { campaignId: id, guestId, actorId: uid },
        now,
      );
      return { ok: true };
    }
    throw new AccountError(400, "Operação inválida.");
  });
}
async function count(
  tx: AccountTransaction,
  base: string,
  id: string,
  delta: Record<string, number>,
) {
  const path = `${base}/stats/${parseInt(hash(id).slice(0, 2), 16) % 16}`,
    [old] = await tx.read(path);
  const values: Record<string, number> = {};
  for (const [k, v] of Object.entries(delta)) values[k] = (old?.[k] || 0) + v;
  tx.set(path, { ...old, ...values });
}
async function publicContext(
  tx: AccountTransaction,
  invite: unknown,
  now: number,
) {
  const value = secret(invite),
    [mapping] = await tx.read(`campaignInvitationLinks/${hash(value)}`);
  if (!mapping) throw new AccountError(404, "Convite não encontrado.");
  const root = rootFor(mapping.organizationId),
    { campaign, org, event } = await context(
      tx,
      root,
      mapping.campaignId,
      now,
      true,
    );
  await assertModuleEnabled(tx, root, "publicForms");
  const [inviter] = await tx.read(
    `${root}/campaignInviters/${mapping.inviterId}`,
  );
  if (
    !inviter ||
    inviter.id !== mapping.inviterId ||
    inviter.campaignId !== campaign.id
  )
    throw new AccountError(404, "Convite indisponível.");
  const [user, person] = await tx.read(
    `${root}/users/${inviter.userId}`,
    `${root}/people/${inviter.personId}`,
  );
  if (
    inviter.organizationId !== campaign.organizationId ||
    user?.isActive !== true ||
    user.organizationId !== campaign.organizationId ||
    person?.status !== "active" ||
    person.organizationId !== campaign.organizationId ||
    user.personId !== inviter.personId
  )
    throw new AccountError(404, "Convite indisponível.");
  await member(tx, root, inviter.userId, campaign.organizationId);
  return { root, campaign, org, event, inviter };
}
export async function publicCampaign(invite: unknown, now = Date.now()) {
  return accountTransaction(async (tx) => {
    const { campaign, org, inviter } = await publicContext(tx, invite, now);
    return {
      campaignName: campaign.name,
      churchName: org.displayName || org.name,
      inviterName: inviter.name,
      event: campaign.event,
      timezone: campaign.timezone,
      days: campaign.steps.length,
      deliveryMode: campaign.deliveryMode || "api",
      hour: campaign.hour,
      intervalDays: campaign.intervalDays || 1,
      messageStartDate: campaign.messageStartDate || null,
      lastMessageDate: campaignDay(
        campaignLocalDate(campaign.event.startsAt, campaign.timezone),
        -campaign.steps.at(-1).daysBefore,
      ),
      whatsappConnected: !!channelForOrg(campaign.organizationId),
    };
  });
}
export async function registerCampaignGuest(
  raw: Record<string, any>,
  clientKey: string,
  now = Date.now(),
) {
  return accountTransaction(async (tx) => {
    const { root, campaign, inviter } = await publicContext(
        tx,
        raw.invite,
        now,
      ),
      base = `${root}/invitationCampaigns/${campaign.id}`;
    const name = textField(raw.name, "Nome", 120),
      phone = whatsappPhone(raw.phone);
    if (
      !phone ||
      typeof raw.consent !== "boolean" ||
      typeof raw.allowInviterView !== "boolean" ||
      raw.acceptRegistration !== true
    )
      throw new AccountError(400, "Confira telefone e autorizações.");
    if (
      typeof raw.requestId !== "string" ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(raw.requestId)
    )
      throw new AccountError(
        400,
        "Reabra o formulário para iniciar a inscrição.",
      );
    if (raw.companyWebsite) return { ok: true };
    const attemptPath = `${root}/campaignIntakeAttempts/${hash(raw.invite + raw.requestId)}`,
      fingerprint = hash(
        JSON.stringify({
          name,
          phone,
          consent: raw.consent,
          share: raw.allowInviterView,
        }),
      ),
      [attempt] = await tx.read(attemptPath);
    if (attempt) {
      if (attempt.fingerprint !== fingerprint)
        throw new AccountError(
          409,
          "Esta tentativa já foi usada com outros dados.",
        );
      return { ...attempt.result, replayed: true };
    }
    const id = hash(campaign.id + ":" + phone),
      path = `${base}/guests/${id}`,
      [old] = await tx.read(path);
    if (old) return { ok: true, alreadyRegistered: true };
    const limits = [
        `${root}/campaignIntakeLimits/ip_${hash(clientKey).slice(0, 24)}`,
        `${root}/campaignIntakeLimits/day_${hash(phone).slice(0, 2)}`,
      ],
      states = await tx.read(...limits);
    for (let i = 0; i < limits.length; i++) {
      const window = Math.floor(now / (i ? 86400000 : 60000)),
        value = states[i]?.window === window ? states[i]?.count : 0;
      if (!Number.isInteger(value) || value >= (i ? 100 : 60))
        throw new AccountError(
          429,
          "Muitas inscrições. Aguarde um pouco e tente novamente.",
        );
      tx.set(limits[i], { window, count: value + 1 });
    }
    const manage = token(),
      ticket = token(),
      steps = campaignSchedule(campaign, now),
      createdAt = new Date(now).toISOString();
    await count(tx, base, id, {
      registered: 1,
      consentRequested: raw.consent ? 1 : 0,
      planned: raw.consent ? steps.length : 0,
    });
    tx.set(path, {
      id,
      organizationId: campaign.organizationId,
      campaignId: campaign.id,
      inviterId: inviter.id,
      inviterPersonId: inviter.personId,
      inviterName: inviter.name,
      name,
      phone,
      consent: raw.consent,
      consentAt: raw.consent ? createdAt : null,
      consentVersion: campaign.version,
      consentText: `Até ${campaign.steps.length} mensagens pelo WhatsApp, ${campaignCadence(campaign.intervalDays || 1)}, ${campaign.messageStartDate ? "a partir de " + campaign.messageStartDate : "nos dias anteriores"} antes de ${campaign.event.name} (${campaign.event.startsAt}), a partir de ${campaign.hour} (${campaign.timezone}). SAIR interrompe.${campaign.deliveryMode === "manual" ? " Envio manual pela equipe; respostas e pedidos de parada são atendidos por ela. Também é possível cancelar no convite pessoal." : ""}`,
      registrationConsentAt: createdAt,
      registrationConsentVersion: 1,
      registrationConsentText:
        "Autorizo usar meu nome e telefone para organizar minha inscrição e acolhida neste evento. Isso não me torna membro da igreja.",
      allowInviterView: raw.allowInviterView,
      status: "invited",
      handoff: false,
      optOut: false,
      createdAt,
      updatedAt: createdAt,
    });
    tx.set(`campaignGuestLinks/${hash(manage)}`, {
      organizationId: campaign.organizationId,
      campaignId: campaign.id,
      guestId: id,
      ticketToken: ticket,
    });
    tx.set(`campaignTickets/${hash(ticket)}`, {
      organizationId: campaign.organizationId,
      campaignId: campaign.id,
      guestId: id,
    });
    if (raw.consent && campaign.deliveryMode !== "manual")
      for (const s of steps)
        tx.set(`${root}/campaignDeliveries/${campaign.id}_${id}_${s.index}`, {
          id: `${campaign.id}_${id}_${s.index}`,
          organizationId: campaign.organizationId,
          campaignId: campaign.id,
          guestId: id,
          stepIndex: s.index,
          scheduledAt: s.scheduledAt,
          status: "planned",
          createdAt,
        });
    const result = { ok: true, manageToken: manage };
    tx.set(attemptPath, { fingerprint, result });
    audit(
      tx,
      root,
      "guest_registered",
      { campaignId: campaign.id, guestId: id },
      now,
    );
    return result;
  });
}
async function guestContext(
  tx: AccountTransaction,
  value: unknown,
  now: number,
) {
  const s = secret(value),
    [mapping] = await tx.read(`campaignGuestLinks/${hash(s)}`);
  if (!mapping) throw new AccountError(404, "Inscrição não encontrada.");
  const root = rootFor(mapping.organizationId),
    base = `${root}/invitationCampaigns/${mapping.campaignId}`;
  const [org, campaign, guest] = await tx.read(
    root,
    base,
    `${base}/guests/${mapping.guestId}`,
  );
  if (
    org?.status !== "active" ||
    !campaign ||
    !guest ||
    guest.organizationId !== mapping.organizationId ||
    now > Date.parse(campaign.event.startsAt) + 30 * 86400000
  )
    throw new AccountError(404, "Inscrição indisponível.");
  return { root, base, campaign, guest, mapping };
}
export async function publicGuest(value: unknown, now = Date.now()) {
  return accountTransaction(async (tx) => {
    const { campaign, guest, mapping } = await guestContext(tx, value, now),
      channel = channelForOrg(campaign.organizationId);
    return {
      campaignName: campaign.name,
      event: campaign.event,
      timezone: campaign.timezone,
      name: guest.name,
      status: guest.status,
      consent: guest.consent,
      verified: !!guest.verifiedAt,
      optOut: guest.optOut,
      handoff: guest.handoff,
      ticketCode: `INV-${mapping.ticketToken}`,
      deliveryMode: campaign.deliveryMode || "api",
      whatsappUrl:
        campaign.deliveryMode === "manual"
          ? campaign.manualSenderPhone
            ? `https://wa.me/${campaign.manualSenderPhone}?text=${encodeURIComponent("Olá! Quero falar com a equipe sobre " + campaign.event.name + ".")}`
            : null
          : channel
            ? `https://wa.me/${channel.publicPhone}?text=${encodeURIComponent("CAMPANHA " + value)}`
            : null,
    };
  });
}
export async function respondCampaignGuest(
  raw: Record<string, any>,
  now = Date.now(),
) {
  return accountTransaction(async (tx) => {
    const { base, root, campaign, guest } = await guestContext(
      tx,
      raw.token,
      now,
    );
    const patch: Record<string, any> = {
      updatedAt: new Date(now).toISOString(),
    };
    const delta: Record<string, number> = {};
    if (raw.operation === "stop") {
      patch.consent = false;
      patch.optOut = true;
      if (guest.consent) delta.optedOut = 1;
    } else if (raw.operation === "handoff") {
      patch.handoff = true;
    } else if (["confirmed", "declined"].includes(raw.operation)) {
      if (
        guest.status === "attended" ||
        Date.parse(campaign.event.startsAt) <= now
      )
        throw new AccountError(
          409,
          "A presença já foi registrada ou o evento começou.",
        );
      patch.status = raw.operation;
      if (guest.status !== raw.operation) {
        delta[raw.operation] = 1;
        if (["confirmed", "declined"].includes(guest.status))
          delta[guest.status] = -1;
      }
    } else throw new AccountError(400, "Resposta inválida.");
    if (Object.keys(delta).length) await count(tx, base, guest.id, delta);
    tx.patch(`${base}/guests/${guest.id}`, patch);
    audit(
      tx,
      root,
      "guest_response",
      { campaignId: campaign.id, guestId: guest.id, operation: raw.operation },
      now,
    );
    return { ok: true };
  });
}
export async function campaignWhatsappCommand(
  org: string,
  phone: string,
  raw: string,
  now = Date.now(),
) {
  return accountTransaction(async (tx) => {
    const { root, base, campaign, guest } = await guestContext(tx, raw, now);
    if (campaign.organizationId !== org || guest.phone !== whatsappPhone(phone))
      throw new AccountError(403, "Use o mesmo WhatsApp informado no convite.");
    await context(tx, root, campaign.id, now, true);
    if (!guest.consent || guest.optOut)
      throw new AccountError(
        409,
        "A autorização desta campanha está pausada. Use seu convite para falar com a igreja.",
      );
    if (!guest.verifiedAt) {
      await count(tx, base, guest.id, { verified: 1 });
      tx.patch(`${base}/guests/${guest.id}`, {
        verifiedAt: new Date(now).toISOString(),
      });
    }
    return { campaignId: campaign.id, guestId: guest.id, name: campaign.name };
  });
}
export async function checkInCampaign(
  raw: Record<string, any>,
  uid: string,
  now = Date.now(),
) {
  const org = documentId(raw.organizationId, "Instituição"),
    root = rootFor(org),
    code = String(raw.code || "").trim();
  if (!/^INV-[a-f0-9]{48}$/.test(code))
    throw new AccountError(400, "Leia ou cole o código completo da pulseira.");
  return accountTransaction(async (tx) => {
    await financeActor(tx, org, uid, true, null);
    await assertModuleEnabled(tx, root, "visitors");
    const [mapping] = await tx.read(`campaignTickets/${hash(code.slice(4))}`);
    if (mapping?.organizationId !== org)
      throw new AccountError(404, "Pulseira não encontrada nesta igreja.");
    const { campaign } = await context(tx, root, mapping.campaignId, now),
      base = `${root}/invitationCampaigns/${campaign.id}`,
      [g] = await tx.read(`${base}/guests/${mapping.guestId}`);
    if (!g) throw new AccountError(404, "Convidado não encontrado.");
    if (g.status === "attended")
      return { ok: true, replayed: true, name: g.name };
    if (
      now < Date.parse(campaign.event.startsAt) - 12 * 3600000 ||
      now > Date.parse(campaign.event.startsAt) + 86400000
    )
      throw new AccountError(
        409,
        "O check-in abre 12 horas antes e encerra 24 horas após o início do evento.",
      );
    const eventPath = `${root}/events/${campaign.eventId}`,
      registrationId = `contact_${hash(g.phone).slice(0, 32)}`,
      [reg] = await tx.read(`${eventPath}/registrations/${registrationId}`),
      registrations = await tx.query(
        eventPath,
        "registrations",
        undefined,
        undefined,
        "EQUAL",
        5001,
      ),
      [event] = await tx.read(eventPath);
    if (
      (!reg || reg.status === "cancelled") &&
      ((event &&
        event.capacity > 0 &&
        registrations.filter((r) => r.status !== "cancelled").length >=
          event.capacity) ||
        registrations.length >= 5001)
    )
      throw new AccountError(
        409,
        "Não há vagas neste evento. Procure a organização.",
      );
    const intakeId = `campaign_${campaign.eventId}_${hash(g.phone).slice(0, 24)}`,
      [intake] = await tx.read(`${root}/visitorIntakes/${intakeId}`);
    await count(tx, base, g.id, {
      attended: 1,
      ...(["confirmed", "declined"].includes(g.status)
        ? { [g.status]: -1 }
        : {}),
    });
    tx.patch(`${base}/guests/${g.id}`, {
      status: "attended",
      attendedAt: new Date(now).toISOString(),
    });
    tx.set(`${eventPath}/registrations/${registrationId}`, {
      ...reg,
      id: registrationId,
      organizationId: org,
      eventId: campaign.eventId,
      status: "confirmed",
      paymentStatus: "not_required",
      personName: reg?.personName || g.name,
      registrationCode: reg?.registrationCode || code,
      registeredAt: reg?.registeredAt || g.createdAt,
      checkedInAt: new Date(now).toISOString(),
      checkedInByUserId: uid,
      campaignId: campaign.id,
      campaignGuestId: g.id,
    });
    if (!intake)
      tx.set(`${root}/visitorIntakes/${intakeId}`, {
        id: intakeId,
        organizationId: org,
        name: g.name,
        phone: g.phone,
        source: `Convite de membro · ${campaign.name}`,
        campaignId: campaign.id,
        inviterPersonId: g.inviterPersonId,
        status: "captured",
        firstVisit: true,
        consentMarketing: false,
        createdAt: new Date(now).toISOString(),
      });
    audit(
      tx,
      root,
      "checkin",
      { campaignId: campaign.id, guestId: g.id, actorId: uid },
      now,
    );
    return { ok: true, name: g.name };
  });
}
export async function prepareCampaignDeliveries(org: string, now = Date.now()) {
  const root = rootFor(org),
    channel = channelForOrg(org);
  if (!channel?.paidMessagesEnabled) return { prepared: 0 };
  const campaigns = await accountTransaction((tx) =>
    tx.query(root, "invitationCampaigns", "deliveryEnabled", true, "EQUAL", 11),
  );
  if (campaigns.length > 10)
    throw new AccountError(409, "Divida o processamento entre as campanhas.");
  let prepared = 0;
  for (const c of campaigns.filter(
    (c) => c.status === "active" && c.deliveryMode !== "manual",
  ))
    prepared += await accountTransaction(async (tx) => {
      const rows = await tx.query(
        root,
        "campaignDeliveries",
        "campaignId",
        c.id,
        "EQUAL",
        20,
        { field: "status", value: "planned" },
        { field: "scheduledAt", direction: "ASCENDING" },
      );
      let total = 0;
      for (const row of rows) {
        if (Date.parse(row.scheduledAt) > now) continue;
        const base = `${root}/invitationCampaigns/${row.campaignId}`,
          [campaign, guest] = await tx.read(
            base,
            `${base}/guests/${row.guestId}`,
          );
        if (!campaign?.deliveryEnabled || campaign.status !== "active")
          continue;
        let reason = "";
        if (now - Date.parse(row.scheduledAt) > 4 * 3600000)
          reason = "window_expired";
        else if (!guest || !campaignEligible(guest))
          reason = "guest_not_eligible";
        if (reason || !guest) {
          tx.patch(`${root}/campaignDeliveries/${row.id}`, {
            status: "skipped",
            reason,
          });
          continue;
        }
        const outboxId = `campaign_${row.id}`,
          [old] = await tx.read(`${root}/whatsappOutbox/${outboxId}`);
        if (!old)
          tx.set(`${root}/whatsappOutbox/${outboxId}`, {
            id: outboxId,
            organizationId: org,
            to: guest.phone,
            kind: "template",
            status: "pending",
            campaignId: row.campaignId,
            campaignGuestId: row.guestId,
            campaignStepIndex: row.stepIndex,
            scheduledAt: row.scheduledAt,
            createdAt: new Date(now).toISOString(),
            createdBy: "campaign_scheduler",
          });
        tx.patch(`${root}/campaignDeliveries/${row.id}`, { status: "queued" });
        total++;
      }
      return total;
    });
  return { prepared };
}
/** Must run inside the same transaction that claims the provider send. */
export async function campaignDeliveryGuard(
  tx: AccountTransaction,
  root: string,
  row: any,
  now: number,
) {
  if (!row.campaignId) return row;
  const { campaign, org } = await context(tx, root, row.campaignId, now),
    base = `${root}/invitationCampaigns/${row.campaignId}`,
    [guest, budget] = await tx.read(
      `${base}/guests/${row.campaignGuestId}`,
      `${base}/control/budget`,
    );
  if (
    campaign.status !== "active" ||
    campaign.deliveryMode === "manual" ||
    (campaign.inviteOpensAt && Date.parse(campaign.inviteOpensAt) > now) ||
    !campaign.deliveryEnabled ||
    !guest ||
    guest.phone !== row.to ||
    !campaignEligible(guest) ||
    now - Date.parse(row.scheduledAt) > 4 * 3600000 ||
    Date.parse(campaign.event.startsAt) <= now
  )
    throw new AccountError(409, "Envio da campanha pausado ou fora do prazo.");
  if ((budget?.used || 0) >= campaign.maxMessages)
    throw new AccountError(409, "Teto de mensagens da campanha atingido.");
  const step =
    campaign.steps[guest.firstDeliveredAt ? row.campaignStepIndex : 0];
  if (!step) throw new AccountError(409, "Etapa de campanha inválida.");
  const date = new Intl.DateTimeFormat("pt-BR", {
      timeZone: campaign.timezone,
    }).format(new Date(campaign.event.startsAt)),
    time = new Intl.DateTimeFormat("pt-BR", {
      timeZone: campaign.timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(campaign.event.startsAt));
  const values: Record<CampaignField, string> = {
    convidado: guest.name.split(" ")[0],
    membro: guest.inviterName,
    igreja: org.displayName || org.name,
    evento: campaign.event.name,
    data: date,
    horario: time,
    local: campaign.event.location,
  };
  const body = guest.status === "confirmed" ? step.confirmedBody : step.body,
    templateName =
      guest.status === "confirmed"
        ? step.confirmedTemplateName
        : step.templateName,
    { text, parameters } = campaignPersonalize(body, values);
  const channel = channelForOrg(campaign.organizationId);
  if (
    !channel?.paidMessagesEnabled ||
    !channel.templates?.includes(templateName)
  )
    throw new AccountError(409, "Template não autorizado.");
  tx.set(`${base}/control/budget`, { used: (budget?.used || 0) + 1 });
  return { ...row, text, templateName, parameters, language: "pt_BR" };
}
export async function campaignReceipt(
  tx: AccountTransaction,
  root: string,
  row: any,
  status: string,
  now = Date.now(),
) {
  if (!row.campaignId) return;
  const base = `${root}/invitationCampaigns/${row.campaignId}`;
  if (["delivered", "read"].includes(status)) {
    const [g] = await tx.read(`${base}/guests/${row.campaignGuestId}`);
    if (g && !g.firstDeliveredAt)
      tx.patch(`${base}/guests/${row.campaignGuestId}`, {
        firstDeliveredAt: new Date(now).toISOString(),
      });
  }
  const keys =
    status === "read"
      ? ["accepted", "delivered", "read"]
      : status === "delivered"
        ? ["accepted", "delivered"]
        : status === "sent"
          ? ["accepted"]
          : ["accepted", "failed", "uncertain"].includes(status)
            ? [status]
            : [];
  const delta: Record<string, number> = {};
  for (const key of keys) {
    const path = `${base}/deliveryReceipts/${row.id}_${key}`,
      [receipt] = await tx.read(path);
    if (!receipt) {
      delta[key] = 1;
      tx.set(path, { at: new Date(now).toISOString() });
    }
  }
  if (Object.keys(delta).length)
    await count(tx, base, row.campaignGuestId, delta);
}
export async function respondCampaignWhatsapp(
  org: string,
  phone: string,
  campaignId: unknown,
  guestId: unknown,
  operation: string,
  now = Date.now(),
) {
  const root = rootFor(org),
    base = `${root}/invitationCampaigns/${documentId(campaignId, "Campanha")}`,
    id = documentId(guestId, "Convidado");
  return accountTransaction(async (tx) => {
    const [g, c] = await tx.read(`${base}/guests/${id}`, base);
    if (
      g?.organizationId !== org ||
      g.phone !== whatsappPhone(phone) ||
      !g.verifiedAt
    )
      throw new AccountError(403, "Convite indisponível neste contato.");
    const patch: Record<string, any> = {
      updatedAt: new Date(now).toISOString(),
    };
    let delta: Record<string, number> = {};
    if (operation === "handoff") patch.handoff = true;
    else if (operation === "stop") {
      patch.optOut = true;
      patch.consent = false;
      if (g.consent) delta.optedOut = 1;
    } else if (["confirmed", "declined"].includes(operation)) {
      if (
        g.status === "attended" ||
        c?.status !== "active" ||
        Date.parse(c.event.startsAt) <= now
      )
        throw new AccountError(409, "O convite já foi encerrado.");
      patch.status = operation;
      if (g.status !== operation) {
        delta[operation] = 1;
        if (["confirmed", "declined"].includes(g.status)) delta[g.status] = -1;
      }
    } else throw new AccountError(400, "Resposta inválida.");
    if (Object.keys(delta).length) await count(tx, base, id, delta);
    tx.patch(`${base}/guests/${id}`, patch);
    return { ok: true };
  });
}

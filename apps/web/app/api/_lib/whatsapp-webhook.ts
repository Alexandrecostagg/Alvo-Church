import { createHmac, timingSafeEqual } from "node:crypto";
import { accountTransaction, AccountError } from "./member-account-store";
import { whatsappChannels } from "./whatsapp-config";
import {
  conversationReply,
  type IncomingWhatsapp,
} from "./whatsapp-conversation";
import { applyWhatsappStatus, dispatchWhatsapp } from "./whatsapp-outbox";
import { digest } from "./participation";
import { assertModuleEnabled } from "./module-access";

export function verifyWhatsappSignature(
  body: Uint8Array,
  signature: string | null,
  secret = process.env.WHATSAPP_APP_SECRET,
) {
  if (!secret) throw new AccountError(503, "WhatsApp não configurado.");
  if (!/^sha256=[a-f0-9]{64}$/.test(signature ?? ""))
    throw new AccountError(401, "Assinatura inválida.");
  const actual = Buffer.from(signature!.slice(7), "hex"),
    expected = createHmac("sha256", secret).update(body).digest();
  if (!timingSafeEqual(actual, expected))
    throw new AccountError(401, "Assinatura inválida.");
}
export function webhookChanges(raw: unknown): Array<Record<string, any>> {
  if (
    !raw ||
    typeof raw !== "object" ||
    (raw as any).object !== "whatsapp_business_account" ||
    !Array.isArray((raw as any).entry) ||
    (raw as any).entry.length > 20
  )
    throw new AccountError(400, "Webhook inválido.");
  const result: Array<Record<string, any>> = [];
  for (const entry of (raw as any).entry) {
    if (!Array.isArray(entry.changes) || entry.changes.length > 20)
      throw new AccountError(400, "Webhook inválido.");
    for (const change of entry.changes)
      if (
        change.field === "messages" &&
        change.value &&
        typeof change.value === "object"
      )
        result.push(change.value);
  }
  if (result.length > 20)
    throw new AccountError(413, "Lote de mensagens muito grande.");
  return result;
}
export function incomingWhatsapp(
  value: Record<string, any>,
  raw: Record<string, any>,
): IncomingWhatsapp {
  if (
    typeof raw.id !== "string" ||
    raw.id.length > 250 ||
    !raw.id ||
    !/^\d{10,15}$/.test(raw.from ?? "")
  )
    throw new AccountError(400, "Mensagem inválida.");
  const timestamp = Number(raw.timestamp) * 1000;
  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0 ||
    timestamp > Date.now() + 5 * 60000
  )
    throw new AccountError(400, "Data da mensagem inválida.");
  const name = value.contacts?.find((c: any) => c.wa_id === raw.from)?.profile
    ?.name;
  const text =
    raw.type === "text" && typeof raw.text?.body === "string"
      ? raw.text.body
      : "HUMANO";
  if (text.length > 4096) throw new AccountError(400, "Mensagem muito longa.");
  return {
    id: raw.id,
    from: raw.from,
    name: typeof name === "string" ? name.slice(0, 120) : "Contato",
    text,
    timestamp,
    phoneNumberId: value.metadata.phone_number_id,
  };
}

async function processInbound(orgId: string, msg: IncomingWhatsapp) {
  const root = `organizations/${orgId}`,
    id = digest(msg.id),
    inboxPath = `${root}/whatsappInbox/${id}`,
    contactPath = `${root}/whatsappContacts/${digest(msg.from)}`,
    outboxId = `reply_${id}`;
  const lease = crypto.randomUUID();
  const claimed = await accountTransaction(async (tx) => {
    const [org, profile, inbox, contact] = await tx.read(
      root,
      `${root}/settings/pastoralAssistant`,
      inboxPath,
      contactPath,
    );
    if (org?.status !== "active") return null;
    await assertModuleEnabled(tx, root, "communication");
    if (inbox?.status === "completed") return { replayed: true };
    if (inbox?.leaseUntil > Date.now() || contact?.leaseUntil > Date.now())
      throw new AccountError(503, "A conversa está sendo processada.");
    if (!org.slug || profile?.enabled !== true) return null;
    if (msg.timestamp < Date.now() - 24 * 60 * 60 * 1000) {
      tx.set(inboxPath, {
        id,
        status: "expired",
        createdAt: new Date().toISOString(),
      });
      return null;
    }
    // No out-of-order state transitions. Do not create an operation from an older message.
    if (
      contact?.lastMessageTimestamp &&
      msg.timestamp < contact.lastMessageTimestamp
    ) {
      tx.set(inboxPath, {
        id,
        status: "completed",
        ignored: true,
        createdAt: new Date().toISOString(),
      });
      return null;
    }
    const minute = Math.floor(Date.now() / 60000),
      count = contact?.rateWindow === minute ? contact.rateCount : 0;
    if (!Number.isInteger(count) || count < 0 || count >= 15)
      throw new AccountError(429, "Limite temporário da conversa.");
    tx.set(inboxPath, {
      id,
      organizationId: orgId,
      status: "processing",
      lease,
      leaseUntil: Date.now() + 90000,
      receivedAt: new Date(msg.timestamp).toISOString(),
      createdAt: inbox?.createdAt ?? new Date().toISOString(),
    });
    tx.set(contactPath, {
      ...contact,
      id: digest(msg.from),
      organizationId: orgId,
      phone: msg.from,
      name: msg.name,
      lastInboundAt: new Date(
        Math.max(msg.timestamp, Date.parse(contact?.lastInboundAt) || 0),
      ).toISOString(),
      lease,
      leaseUntil: Date.now() + 90000,
      rateWindow: minute,
      rateCount: count + 1,
    });
    return { replayed: false, org, profile, contact };
  });
  if (!claimed) return;
  if (claimed.replayed) {
    await dispatchWhatsapp(orgId, outboxId);
    return;
  }
  try {
    const reply = await conversationReply(
      {
        orgId,
        slug: claimed.org!.slug,
        name: claimed.org!.displayName || claimed.org!.name || "nossa igreja",
        profile: claimed.profile!,
        state: {
          ...(claimed.contact?.state ?? {}),
          handoff: claimed.contact?.handoff === true,
        },
        optOut: claimed.contact?.optOut === true,
      },
      msg,
    );
    await accountTransaction(async (tx) => {
      const [inbox, contact] = await tx.read(inboxPath, contactPath);
      if (inbox?.lease !== lease || contact?.lease !== lease)
        throw new AccountError(409, "A conversa mudou durante o atendimento.");
      tx.patch(inboxPath, {
        status: "completed",
        leaseUntil: 0,
        completedAt: new Date().toISOString(),
      });
      tx.patch(contactPath, {
        state: reply.state,
        handoff: reply.handoff ?? contact.handoff ?? false,
        optOut: reply.optOut ?? contact.optOut ?? false,
        lastMessageTimestamp: msg.timestamp,
        lastText: msg.text.slice(0, 2000),
        thread: [
          ...(Array.isArray(contact.thread) ? contact.thread : []),
          {
            direction: "in",
            text: msg.text,
            at: new Date(msg.timestamp).toISOString(),
          },
          { direction: "out", text: reply.text, at: new Date().toISOString() },
        ].slice(-20),
        leaseUntil: 0,
      });
      tx.set(`${root}/whatsappOutbox/${outboxId}`, {
        id: outboxId,
        organizationId: orgId,
        to: msg.from,
        text: reply.text,
        kind: "text",
        status: "pending",
        scheduledAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        optOutAcknowledgement: reply.optOut === true,
      });
      if(reply.handoff === false && contact.handoff)tx.set(`${root}/whatsappHandoffs/${digest(msg.from)}`,{id:digest(msg.from),organizationId:orgId,phone:msg.from,name:msg.name,status:"completed",updatedAt:new Date().toISOString()});
      // Human handoff is durable and visible in the communication inbox.
      if (reply.handoff === true)
        tx.set(`${root}/whatsappHandoffs/${digest(msg.from)}`, {
          id: digest(msg.from),
          organizationId: orgId,
          phone: msg.from,
          name: msg.name,
          status: "open",
          updatedAt: new Date().toISOString(),
        });
    });
  } catch (error) {
    await accountTransaction(async (tx) => {
      const [inbox, contact] = await tx.read(inboxPath, contactPath);
      if (inbox?.lease === lease)
        tx.patch(inboxPath, { status: "retryable", leaseUntil: 0 });
      if (contact?.lease === lease) tx.patch(contactPath, { leaseUntil: 0 });
    }).catch(() => {});
    throw error;
  }
  await dispatchWhatsapp(orgId, outboxId);
}
export async function receiveWhatsapp(raw: unknown) {
  const channels = whatsappChannels();
  let count = 0;
  for (const value of webhookChanges(raw)) {
    const channel = channels.find(
      (c) => c.phoneNumberId === value.metadata?.phone_number_id,
    );
    if (!channel) continue; // Never accept a tenant id supplied in the payload.
    const messages = Array.isArray(value.messages) ? value.messages : [],
      statuses = Array.isArray(value.statuses) ? value.statuses : [];
    count += messages.length + statuses.length;
    if (count > 40) throw new AccountError(413, "Lote muito grande.");
    for (const status of statuses)
      if (typeof status.id === "string" && status.id.length <= 250)
        await applyWhatsappStatus(
          channel.organizationId,
          status.id,
          String(status.recipient_id),
          String(status.status),
        );
    for (const message of messages)
      await processInbound(
        channel.organizationId,
        incomingWhatsapp(value, message),
      );
  }
}

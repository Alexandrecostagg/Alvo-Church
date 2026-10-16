import { PASTORAL_CONTEXT_LIMITS } from "@alvo/ai";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";

export interface WhatsappChannel {
  organizationId: string;
  phoneNumberId: string;
  accessToken: string;
  publicPhone: string;
  templates?: string[];
}
/** Provisioned by platform operations, never written by tenant clients. */
export function whatsappChannels(): WhatsappChannel[] {
  if (!process.env.WHATSAPP_CHANNELS_JSON) return [];
  let list: unknown;
  try {
    list = JSON.parse(process.env.WHATSAPP_CHANNELS_JSON);
  } catch {
    throw new AccountError(
      503,
      "A conexão do WhatsApp precisa de conferência pela plataforma.",
    );
  }
  if (!Array.isArray(list) || list.length > 500)
    throw new AccountError(503, "Configuração do WhatsApp inválida.");
  const seen = new Set<string>();
  return list.map((item) => {
    if (
      !item ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(item.organizationId) ||
      !/^\d{5,30}$/.test(item.phoneNumberId) ||
      !/^\d{10,15}$/.test(item.publicPhone) ||
      typeof item.accessToken !== "string" ||
      !item.accessToken ||
      seen.has(item.phoneNumberId) ||
      seen.has(`org:${item.organizationId}`)
    )
      throw new AccountError(
        503,
        "Configuração do WhatsApp inválida ou duplicada.",
      );
    seen.add(item.phoneNumberId);
    seen.add(`org:${item.organizationId}`);
    if (
      item.templates !== undefined &&
      (!Array.isArray(item.templates) ||
        item.templates.length > 50 ||
        item.templates.some(
          (v: unknown) =>
            typeof v !== "string" || !/^[a-z0-9_]{1,128}$/.test(v),
        ))
    )
      throw new AccountError(503, "Templates do WhatsApp inválidos.");
    return {
      organizationId: item.organizationId,
      phoneNumberId: item.phoneNumberId,
      accessToken: item.accessToken,
      publicPhone: item.publicPhone,
      templates: item.templates ?? [],
    };
  });
}
export function channelForOrg(id: string) {
  return whatsappChannels().find((c) => c.organizationId === id);
}
export async function whatsappActor(
  tx: AccountTransaction,
  orgId: unknown,
  uid: string,
) {
  const id = documentId(orgId, "Igreja"),
    root = `organizations/${id}`;
  const [org, actor] = await tx.read(
    root,
    `${root}/users/${documentId(uid, "Conta")}`,
  );
  if (
    org?.status !== "active" ||
    actor?.isActive !== true ||
    actor.organizationId !== id ||
    !Array.isArray(actor.roles) ||
    !actor.roles.some((r: string) =>
      ["church_admin", "super_admin", "pastor", "secretary"].includes(r),
    )
  )
    throw new AccountError(403, "Acesso restrito à equipe desta igreja.");
  await assertModuleEnabled(tx, root, "communication");
  return { root, org, id };
}
export function assistantSettings(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new AccountError(400, "Configuração inválida.");
  const data = raw as Record<string, unknown>,
    result: Record<string, string | boolean> = {};
  for (const [key, max] of Object.entries(PASTORAL_CONTEXT_LIMITS)) {
    const value = data[key] ?? "";
    if (typeof value !== "string" || value.length > max)
      throw new AccountError(400, `Confira ${key} (até ${max} caracteres).`);
    result[key] = value.trim();
  }
  for (const key of [
    "enabled",
    "aiEnabled",
    "eventsEnabled",
    "careEnabled",
    "visitorsEnabled",
    "groupsEnabled",
  ]) {
    if (data[key] !== undefined && typeof data[key] !== "boolean")
      throw new AccountError(400, `Confira ${key}.`);
    result[key] = data[key] === true;
  }
  return result;
}
export async function whatsappSettings(
  orgId: string,
  uid: string,
  update?: unknown,
) {
  return accountTransaction(async (tx) => {
    const { root, org, id } = await whatsappActor(tx, orgId, uid);
    const [profile] = await tx.read(`${root}/settings/pastoralAssistant`);
    const inbox = await tx.query(
      root,
      "whatsappContacts",
      undefined,
      undefined,
      "EQUAL",
      30,
      undefined,
      {field:"lastInboundAt",direction:"DESCENDING"},
    );
    const outbox = await tx.query(
      root,
      "whatsappOutbox",
      undefined,
      undefined,
      "EQUAL",
      30,
      undefined,
      {field:"createdAt",direction:"DESCENDING"},
    );
    const channel = channelForOrg(id);
    let settings = profile ?? assistantSettings({});
    if (update !== undefined) {
      settings = assistantSettings(update);
      tx.set(`${root}/settings/pastoralAssistant`, {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: uid,
      });
    }
    return {
      settings,
      connection: {
        configured: Boolean(
          channel &&
          process.env.WHATSAPP_APP_SECRET &&
          process.env.WHATSAPP_VERIFY_TOKEN &&
          process.env.WHATSAPP_GRAPH_VERSION &&
          process.env.PUBLIC_APP_ORIGIN,
        ),
        publicPhone: channel?.publicPhone ?? "",
        templates: channel?.templates ?? [],
      },
      slug: org.slug ?? "",
      inbox: inbox
        .sort((a, b) =>
          String(b.lastInboundAt).localeCompare(String(a.lastInboundAt)),
        )
        .slice(0, 30)
        .map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          lastInboundAt: c.lastInboundAt,
          lastText: c.lastText ?? "",
          handoff: c.handoff === true,
        })),
      outbox: outbox
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 30)
        .map((m) => ({
          id: m.id,
          to: m.to,
          status: m.status,
          createdAt: m.createdAt,
          providerId: m.providerId ?? null,
          kind: m.kind,
          scheduledAt: m.scheduledAt ?? null,
        })),
    };
  });
}

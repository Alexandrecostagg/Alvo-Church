import { createHash } from "node:crypto";
import { AccountError, accountTransaction, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";

const MANAGERS = ["super_admin", "church_admin", "pastor", "secretary"];
export const MAX_MANUAL_WHATSAPP_RECIPIENTS = 100;

function requiredText(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new AccountError(400, `${label} deve ter entre 1 e ${max} caracteres.`);
  }
  return value.trim();
}

function ids(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MANUAL_WHATSAPP_RECIPIENTS) {
    throw new AccountError(400, `${label} deve conter de 1 a ${MAX_MANUAL_WHATSAPP_RECIPIENTS} pessoas.`);
  }
  const result = [...new Set(value.map((item) => documentId(item, "Pessoa")))];
  if (result.length !== value.length) throw new AccountError(400, `${label} contém pessoas repetidas.`);
  return result;
}

export function normalizeBrazilianWhatsapp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (!/^[1-9]{2}9?\d{8}$/.test(digits)) return null;
  return `55${digits}`;
}

export function manualCampaignInput(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AccountError(400, "Campanha inválida.");
  const data = raw as Record<string, unknown>;
  return {
    organizationId: documentId(data.organizationId, "Igreja"),
    requestId: documentId(data.requestId, "Tentativa"),
    message: requiredText(data.message, "Mensagem", 2000),
    recipientIds: ids(data.recipientIds, "Destinatários"),
  };
}

export function campaignCompletionInput(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AccountError(400, "Confirmação inválida.");
  const data = raw as Record<string, unknown>;
  return {
    organizationId: documentId(data.organizationId, "Igreja"),
    campaignId: documentId(data.campaignId, "Campanha"),
    confirmedRecipientIds: ids(data.confirmedRecipientIds, "Envios confirmados"),
  };
}

async function authorize(tx: AccountTransaction, orgId: string, uid: string) {
  documentId(uid, "Conta");
  const root = `organizations/${orgId}`;
  await assertModuleEnabled(tx, root, "communication");
  const [org, actor] = await tx.read(root, `${root}/users/${uid}`);
  const roles = Array.isArray(actor?.roles) ? actor.roles : [];
  if (!org || org.status !== "active" || !actor || actor.organizationId !== orgId || actor.isActive !== true || !roles.some((role: string) => MANAGERS.includes(role))) {
    throw new AccountError(403, "Você não pode preparar comunicados nesta igreja.");
  }
  return root;
}

function campaignFingerprint(message: string, recipientIds: string[]) {
  return createHash("sha256").update(JSON.stringify({ message, recipientIds: [...recipientIds].sort() })).digest("hex");
}

function personName(person: Record<string, any>) {
  return [person.preferredName || person.firstName, person.preferredName ? "" : person.lastName]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ")
    .trim();
}

export async function prepareManualWhatsapp(raw: unknown, uid: string) {
  const input = manualCampaignInput(raw);
  return accountTransaction(async (tx) => {
    const root = await authorize(tx, input.organizationId, uid);
    const campaignPath = `${root}/communicationCampaigns/${input.requestId}`;
    const [existing, ...people] = await tx.read(campaignPath, ...input.recipientIds.map((id) => `${root}/people/${id}`));
    const fingerprint = campaignFingerprint(input.message, input.recipientIds);
    if (existing && existing.fingerprint !== fingerprint) {
      throw new AccountError(409, "Esta tentativa já pertence a outra campanha. Atualize a tela.");
    }

    const recipients: Array<{ personId: string; name: string; whatsapp: string }> = [];
    const skipped: Array<{ personId: string; reason: string }> = [];
    people.forEach((person, index) => {
      const personId = input.recipientIds[index];
      if (!person || person.organizationId !== input.organizationId || person.status !== "active") {
        skipped.push({ personId, reason: "cadastro inativo ou inexistente" });
        return;
      }
      if (person.communicationOptOut === true || person.whatsappOptOutAt) {
        skipped.push({ personId, reason: "pessoa optou por não receber mensagens" });
        return;
      }
      const whatsapp = normalizeBrazilianWhatsapp(person.whatsappPhone || person.mobilePhone);
      if (!whatsapp) {
        skipped.push({ personId, reason: "WhatsApp inválido" });
        return;
      }
      recipients.push({ personId, name: personName(person) || "Pessoa", whatsapp });
    });
    if (recipients.length === 0) throw new AccountError(409, "Nenhum destinatário elegível para WhatsApp.");

    if (!existing) {
      const now = new Date().toISOString();
      const record = {
        id: input.requestId,
        organizationId: input.organizationId,
        channel: "whatsapp",
        mode: "manual",
        status: "prepared",
        message: input.message,
        recipientIds: recipients.map((recipient) => recipient.personId),
        recipientCount: recipients.length,
        skippedCount: skipped.length,
        openedCount: 0,
        sentCount: 0,
        failedCount: 0,
        sentByUserId: uid,
        fingerprint,
        createdAt: now,
        updatedAt: now,
      };
      tx.set(campaignPath, record);
      tx.set(`${root}/communicationLog/${input.requestId}`, record);
      tx.set(`${root}/communicationAudit/${crypto.randomUUID()}`, {
        organizationId: input.organizationId,
        campaignId: input.requestId,
        action: "manual_campaign_prepared",
        actorId: uid,
        recipientCount: recipients.length,
        skippedCount: skipped.length,
        at: now,
      });
    }
    return { campaignId: input.requestId, recipients, skipped, replayed: Boolean(existing) };
  });
}

export async function completeManualWhatsapp(raw: unknown, uid: string) {
  const input = campaignCompletionInput(raw);
  return accountTransaction(async (tx) => {
    const root = await authorize(tx, input.organizationId, uid);
    const campaignPath = `${root}/communicationCampaigns/${input.campaignId}`;
    const logPath = `${root}/communicationLog/${input.campaignId}`;
    const [campaign] = await tx.read(campaignPath);
    if (!campaign || campaign.organizationId !== input.organizationId || campaign.mode !== "manual") {
      throw new AccountError(404, "Campanha não encontrada.");
    }
    const eligible = new Set(Array.isArray(campaign.recipientIds) ? campaign.recipientIds : []);
    if (input.confirmedRecipientIds.some((id) => !eligible.has(id))) {
      throw new AccountError(409, "A confirmação contém uma pessoa que não pertence à campanha.");
    }
    if (campaign.confirmedAt) {
      const previous = Array.isArray(campaign.confirmedRecipientIds)
        ? [...campaign.confirmedRecipientIds].sort()
        : [];
      const requested = [...input.confirmedRecipientIds].sort();
      if (JSON.stringify(previous) !== JSON.stringify(requested)) {
        throw new AccountError(409, "Esta campanha já teve seus envios confirmados.");
      }
      return {
        campaignId: input.campaignId,
        status: campaign.status,
        sentCount: campaign.sentCount,
        replayed: true,
      };
    }
    const now = new Date().toISOString();
    const patch = {
      status: input.confirmedRecipientIds.length === eligible.size ? "confirmed" : "partially_confirmed",
      openedCount: input.confirmedRecipientIds.length,
      sentCount: input.confirmedRecipientIds.length,
      confirmedRecipientIds: input.confirmedRecipientIds,
      confirmedByUserId: uid,
      confirmedAt: now,
      updatedAt: now,
    };
    tx.patch(campaignPath, patch);
    tx.patch(logPath, patch);
    tx.set(`${root}/communicationAudit/${crypto.randomUUID()}`, {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      action: "manual_sends_confirmed",
      actorId: uid,
      confirmedCount: input.confirmedRecipientIds.length,
      at: now,
    });
    return { campaignId: input.campaignId, status: patch.status, sentCount: patch.sentCount, replayed: false };
  });
}

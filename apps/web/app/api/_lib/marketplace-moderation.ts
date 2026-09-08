import { createHash } from "node:crypto";
import { AccountError, accountTransaction, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";

const MODERATOR_ROLES = ["super_admin", "church_admin", "pastor", "secretary"];
const TRANSITIONS = {
  approve: { from: ["pending"], to: "approved" },
  reject: { from: ["pending"], to: "rejected" },
  suspend: { from: ["approved"], to: "suspended" },
} as const;

export type MarketplaceModerationAction = keyof typeof TRANSITIONS;

export interface MarketplaceModerationOperation {
  organizationId: string;
  requestId: string;
  storeId: string;
  action: MarketplaceModerationAction;
  reason: string;
}

function text(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) {
    throw new AccountError(400, `${label} inválido.`);
  }
  return value.trim();
}

export function marketplaceModerationInput(raw: unknown): MarketplaceModerationOperation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AccountError(400, "Operação de moderação inválida.");
  }
  const data = raw as Record<string, unknown>;
  const action = text(data.action, "Operação", 20) as MarketplaceModerationAction;
  if (!(action in TRANSITIONS)) throw new AccountError(400, "Operação de moderação inválida.");
  const reason = text(data.reason ?? "", "Motivo", 500, action !== "approve");
  if (reason && reason.length < 5) throw new AccountError(400, "Explique o motivo com pelo menos 5 caracteres.");
  return {
    organizationId: documentId(data.organizationId, "Igreja"),
    requestId: documentId(data.requestId, "Tentativa"),
    storeId: documentId(data.storeId, "Loja"),
    action,
    reason,
  };
}

async function authorize(tx: AccountTransaction, orgId: string, uid: string) {
  documentId(uid, "Conta");
  const root = `organizations/${orgId}`;
  await assertModuleEnabled(tx, root, "marketplace");
  const [org, actor] = await tx.read(root, `${root}/users/${uid}`);
  const roles = Array.isArray(actor?.roles) ? actor.roles : [];
  if (!org || org.status !== "active" || !actor || actor.organizationId !== orgId || actor.isActive !== true || !roles.some((role: string) => MODERATOR_ROLES.includes(role))) {
    throw new AccountError(403, "Você não pode moderar lojas nesta igreja.");
  }
  return root;
}

export async function moderateMarketplaceStore(raw: unknown, uid: string) {
  const operation = marketplaceModerationInput(raw);
  const fingerprint = createHash("sha256").update(JSON.stringify(operation)).digest("hex");
  return accountTransaction(async (tx) => {
    const root = await authorize(tx, operation.organizationId, uid);
    const storePath = `${root}/communityStores/${operation.storeId}`;
    const attemptPath = `${root}/communityStoreModerationAttempts/${uid}_${operation.requestId}`;
    const [attempt, store] = await tx.read(attemptPath, storePath);

    if (attempt) {
      if (attempt.fingerprint !== fingerprint) throw new AccountError(409, "Esta tentativa já foi usada em outra moderação.");
      return { ...attempt.result, replayed: true };
    }
    if (!store || store.organizationId !== operation.organizationId) throw new AccountError(404, "Loja não encontrada.");

    const transition = TRANSITIONS[operation.action];
    if (!(transition.from as readonly string[]).includes(String(store.status))) {
      throw new AccountError(409, "A situação atual da loja não permite esta ação.");
    }

    const now = new Date().toISOString();
    const { rejectionReason: _oldRejection, suspensionReason: _oldSuspension, ...preserved } = store;
    const updatedStore = {
      ...preserved,
      id: operation.storeId,
      organizationId: operation.organizationId,
      status: transition.to,
      moderatedBy: uid,
      updatedAt: now,
      ...(operation.action === "approve" ? { approvedAt: now } : {}),
      ...(operation.action === "reject" ? { rejectionReason: operation.reason } : {}),
      ...(operation.action === "suspend" ? { suspensionReason: operation.reason } : {}),
    };
    const result = { store: updatedStore };

    tx.set(storePath, updatedStore);
    tx.set(`${root}/communityStoreModerationLogs/${crypto.randomUUID()}`, {
      organizationId: operation.organizationId,
      storeId: operation.storeId,
      action: `${operation.action}${operation.action === "approve" ? "d" : "ed"}`,
      moderatedBy: uid,
      ...(operation.reason ? { reason: operation.reason } : {}),
      previousStatus: store.status,
      newStatus: transition.to,
      timestamp: now,
    });
    tx.set(attemptPath, { organizationId: operation.organizationId, fingerprint, result, createdAt: now });
    return { ...result, replayed: false };
  });
}

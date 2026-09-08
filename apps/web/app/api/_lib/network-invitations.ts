import { createHash } from "node:crypto";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { documentId } from "./member-account";

const NETWORK_ADMINS = ["super_admin", "church_admin"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function text(value: unknown, label: string, max: number, required = true) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  ) {
    throw new AccountError(400, `${label} inválido.`);
  }
  return value.trim();
}

function inviteCode(value: unknown) {
  const code = text(value, "Código do convite", 16).toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{10}$/.test(code)) {
    throw new AccountError(400, "Código do convite inválido.");
  }
  return code;
}

function codeHash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function newInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

function affiliateResponse(affiliate: Record<string, any>) {
  const {
    inviteCodeHash: _inviteCodeHash,
    invitedByUserId: _invitedByUserId,
    acceptedByUserId: _acceptedByUserId,
    deactivatedByUserId: _deactivatedByUserId,
    ...safe
  } = affiliate;
  return safe;
}

function resolvedPlan(subscription: Record<string, any> | null) {
  if (typeof subscription?.plan === "string") return subscription.plan;
  return subscription?.planTier === "enterprise"
    ? "enterprise"
    : subscription?.planTier === "advanced"
      ? "pastoral"
      : subscription?.planTier === "growth"
        ? "comunidade"
        : "free";
}

function networkLimit(subscription: Record<string, any> | null) {
  const plan = resolvedPlan(subscription);
  return plan === "rede" ? 50 : plan === "enterprise" ? 999 : 0;
}

async function networkAdmin(
  tx: AccountTransaction,
  organizationId: string,
  uid: string,
) {
  documentId(organizationId, "Instituição");
  documentId(uid, "Conta");
  const root = `organizations/${organizationId}`;
  const [organization, actor, subscription] = await tx.read(
    root,
    `${root}/users/${uid}`,
    `${root}/settings/subscription`,
  );
  const roles = Array.isArray(actor?.roles) ? actor.roles : [];
  if (
    organization?.status !== "active" ||
    actor?.organizationId !== organizationId ||
    actor?.isActive !== true ||
    !roles.some((role: string) => NETWORK_ADMINS.includes(role))
  ) {
    throw new AccountError(403, "Apenas administradores ativos podem gerenciar a rede.");
  }
  return { root, organization, subscription };
}

export function createNetworkInviteInput(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AccountError(400, "Convite inválido.");
  }
  const data = raw as Record<string, unknown>;
  return {
    organizationId: documentId(data.organizationId, "Instituição sede"),
    requestId: documentId(data.requestId, "Tentativa"),
    childName: text(data.childName, "Nome da igreja", 160),
    childCity: text(data.childCity ?? "", "Cidade", 120, false),
    childState: text(data.childState ?? "", "Estado", 2, false).toUpperCase(),
  };
}

export async function createNetworkInvite(raw: unknown, uid: string) {
  const input = createNetworkInviteInput(raw);
  const code = newInviteCode();
  const digest = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  return accountTransaction(async (tx) => {
    const { root, subscription } = await networkAdmin(tx, input.organizationId, uid);
    const attemptPath = `${root}/networkInviteAttempts/${uid}_${input.requestId}`;
    const [attempt] = await tx.read(attemptPath);
    if (attempt) {
      if (attempt.fingerprint !== digest) {
        throw new AccountError(409, "Esta tentativa já foi usada em outro convite.");
      }
      return { ...attempt.result, replayed: true };
    }

    const limit = networkLimit(subscription);
    if (!limit) {
      throw new AccountError(403, "O plano atual não permite administrar uma rede de igrejas.");
    }
    const affiliates = await tx.query(root, "affiliates", undefined, undefined, "EQUAL", limit + 1);
    const occupied = affiliates.filter((affiliate) => affiliate.status !== "inactive");
    if (occupied.length >= limit) {
      throw new AccountError(409, `O plano atingiu o limite de ${limit} instituições vinculadas ou convidadas.`);
    }

    const hash = codeHash(code);
    const claimPath = `networkInviteClaims/${hash}`;
    const [claim] = await tx.read(claimPath);
    if (claim) throw new AccountError(409, "Não foi possível reservar um código. Tente novamente.");

    const id = `affiliate_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const expiresAt = Date.now() + INVITE_TTL_MS;
    const affiliate = {
      id,
      parentOrganizationId: input.organizationId,
      childOrganizationId: "",
      childName: input.childName,
      ...(input.childCity ? { childCity: input.childCity } : {}),
      ...(input.childState ? { childState: input.childState } : {}),
      status: "pending",
      inviteCodeHash: hash,
      invitedByUserId: uid,
      invitedAt: now,
      expiresAt,
    };
    const result = { affiliate: affiliateResponse(affiliate), inviteCode: code, expiresAt };
    tx.set(`${root}/affiliates/${id}`, affiliate);
    tx.set(claimPath, {
      parentOrganizationId: input.organizationId,
      affiliateId: id,
      status: "active",
      expiresAt,
      createdAt: now,
    });
    tx.patch(root, { affiliateCount: occupied.length + 1 });
    tx.set(`${root}/networkAudit/${crypto.randomUUID()}`, {
      action: "invite_created",
      affiliateId: id,
      actorId: uid,
      targetName: input.childName,
      at: now,
    });
    tx.set(attemptPath, {
      organizationId: input.organizationId,
      fingerprint: digest,
      result,
      createdAt: now,
    });
    return { ...result, replayed: false };
  });
}

async function inviteContext(
  tx: AccountTransaction,
  raw: unknown,
  uid: string,
) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AccountError(400, "Convite inválido.");
  }
  const data = raw as Record<string, unknown>;
  const childOrganizationId = documentId(data.organizationId, "Instituição");
  const code = inviteCode(data.inviteCode);
  const child = await networkAdmin(tx, childOrganizationId, uid);
  const hash = codeHash(code);
  const [claim] = await tx.read(`networkInviteClaims/${hash}`);
  if (!claim || claim.status !== "active" || claim.expiresAt < Date.now()) {
    throw new AccountError(404, "Convite inválido, expirado ou já utilizado.");
  }
  const parentOrganizationId = documentId(claim.parentOrganizationId, "Instituição sede");
  const affiliateId = documentId(claim.affiliateId, "Convite");
  if (parentOrganizationId === childOrganizationId) {
    throw new AccountError(409, "Uma instituição não pode ser vinculada a ela mesma.");
  }
  const parentRoot = `organizations/${parentOrganizationId}`;
  const [parent, affiliate, existingAffiliation] = await tx.read(
    parentRoot,
    `${parentRoot}/affiliates/${affiliateId}`,
    `networkAffiliations/${childOrganizationId}`,
  );
  if (
    parent?.status !== "active" ||
    affiliate?.status !== "pending" ||
    affiliate.inviteCodeHash !== hash
  ) {
    throw new AccountError(404, "Convite indisponível.");
  }
  if (existingAffiliation && existingAffiliation.status !== "inactive") {
    throw new AccountError(409, "Esta instituição já está vinculada a uma rede.");
  }
  return {
    childOrganizationId,
    child: child.organization,
    codeHash: hash,
    claim,
    parentOrganizationId,
    parentRoot,
    parent,
    affiliateId,
    affiliate,
  };
}

export async function inspectNetworkInvite(raw: unknown, uid: string) {
  return accountTransaction(async (tx) => {
    const context = await inviteContext(tx, raw, uid);
    return {
      parentName: context.parent.displayName || context.parent.name || "Instituição sede",
      invitedName: context.affiliate.childName,
      childName: context.child.displayName || context.child.name || "Sua instituição",
      expiresAt: context.claim.expiresAt,
    };
  });
}

export async function acceptNetworkInvite(raw: unknown, uid: string) {
  return accountTransaction(async (tx) => {
    const context = await inviteContext(tx, raw, uid);
    const now = new Date().toISOString();
    const affiliate = {
      ...context.affiliate,
      childOrganizationId: context.childOrganizationId,
      childName: context.child.displayName || context.child.name || context.affiliate.childName,
      status: "active",
      inviteCodeHash: null,
      expiresAt: null,
      joinedAt: now,
      acceptedByUserId: uid,
    };
    tx.set(`${context.parentRoot}/affiliates/${context.affiliateId}`, affiliate);
    tx.patch(`networkInviteClaims/${context.codeHash}`, {
      status: "consumed",
      childOrganizationId: context.childOrganizationId,
      consumedByUserId: uid,
      consumedAt: now,
    });
    tx.set(`networkAffiliations/${context.childOrganizationId}`, {
      childOrganizationId: context.childOrganizationId,
      parentOrganizationId: context.parentOrganizationId,
      affiliateId: context.affiliateId,
      status: "active",
      joinedAt: now,
    });
    tx.set(`${context.parentRoot}/networkAudit/${crypto.randomUUID()}`, {
      action: "invite_accepted",
      affiliateId: context.affiliateId,
      childOrganizationId: context.childOrganizationId,
      actorId: uid,
      at: now,
    });
    return {
      affiliate: affiliateResponse(affiliate),
      parentName: context.parent.displayName || context.parent.name || "Instituição sede",
    };
  });
}

async function managedAffiliateContext(
  tx: AccountTransaction,
  raw: unknown,
  uid: string,
) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AccountError(400, "Vínculo inválido.");
  }
  const data = raw as Record<string, unknown>;
  const organizationId = documentId(data.organizationId, "Instituição sede");
  const affiliateId = documentId(data.affiliateId, "Instituição vinculada");
  const admin = await networkAdmin(tx, organizationId, uid);
  const [affiliate] = await tx.read(`${admin.root}/affiliates/${affiliateId}`);
  if (!affiliate || affiliate.parentOrganizationId !== organizationId) {
    throw new AccountError(404, "Instituição vinculada não encontrada.");
  }
  return { ...admin, organizationId, affiliateId, affiliate };
}

export async function renewNetworkInvite(raw: unknown, uid: string) {
  const code = newInviteCode();
  return accountTransaction(async (tx) => {
    const context = await managedAffiliateContext(tx, raw, uid);
    if (context.affiliate.status !== "pending") {
      throw new AccountError(409, "Somente convites pendentes podem ser reemitidos.");
    }
    if (!networkLimit(context.subscription)) {
      throw new AccountError(403, "O plano atual não permite administrar uma rede de igrejas.");
    }

    const hash = codeHash(code);
    const claimPath = `networkInviteClaims/${hash}`;
    const oldClaimPath = context.affiliate.inviteCodeHash
      ? `networkInviteClaims/${context.affiliate.inviteCodeHash}`
      : null;
    const [claim, oldClaim] = await tx.read(claimPath, ...(oldClaimPath ? [oldClaimPath] : []));
    if (claim) throw new AccountError(409, "Não foi possível reservar um código. Tente novamente.");

    const now = new Date().toISOString();
    const expiresAt = Date.now() + INVITE_TTL_MS;
    if (oldClaimPath && oldClaim) {
      tx.patch(oldClaimPath, { status: "revoked", revokedAt: now, revokedByUserId: uid });
    }
    tx.patch(`${context.root}/affiliates/${context.affiliateId}`, {
      inviteCodeHash: hash,
      expiresAt,
      invitedAt: now,
      invitedByUserId: uid,
    });
    tx.set(claimPath, {
      parentOrganizationId: context.organizationId,
      affiliateId: context.affiliateId,
      status: "active",
      expiresAt,
      createdAt: now,
    });
    tx.set(`${context.root}/networkAudit/${crypto.randomUUID()}`, {
      action: "invite_renewed",
      affiliateId: context.affiliateId,
      actorId: uid,
      at: now,
    });
    return { inviteCode: code, expiresAt };
  });
}

export async function deactivateNetworkAffiliate(raw: unknown, uid: string) {
  return accountTransaction(async (tx) => {
    const context = await managedAffiliateContext(tx, raw, uid);
    if (context.affiliate.status === "inactive") {
      return { affiliate: affiliateResponse(context.affiliate), replayed: true };
    }

    const affiliationPath = context.affiliate.childOrganizationId
      ? `networkAffiliations/${documentId(context.affiliate.childOrganizationId, "Instituição vinculada")}`
      : null;
    const claimPath = context.affiliate.inviteCodeHash
      ? `networkInviteClaims/${context.affiliate.inviteCodeHash}`
      : null;
    const related = await tx.read(...[claimPath, affiliationPath].filter((path): path is string => Boolean(path)));
    const claim = claimPath ? related.shift() : null;
    const affiliation = affiliationPath ? related.shift() : null;
    const affiliates = await tx.query(context.root, "affiliates", undefined, undefined, "EQUAL", 1000);
    const remaining = affiliates.filter((affiliate) =>
      affiliate.id !== context.affiliateId && affiliate.status !== "inactive"
    ).length;
    const now = new Date().toISOString();
    const affiliate = {
      ...context.affiliate,
      status: "inactive",
      inviteCodeHash: null,
      deactivatedAt: now,
      deactivatedByUserId: uid,
    };
    tx.set(`${context.root}/affiliates/${context.affiliateId}`, affiliate);
    if (claimPath && claim) tx.patch(claimPath, { status: "revoked", revokedAt: now, revokedByUserId: uid });
    if (affiliationPath && affiliation?.parentOrganizationId === context.organizationId) {
      tx.patch(affiliationPath, { status: "inactive", deactivatedAt: now, deactivatedByUserId: uid });
    }
    tx.patch(context.root, { affiliateCount: remaining });
    tx.set(`${context.root}/networkAudit/${crypto.randomUUID()}`, {
      action: context.affiliate.status === "pending" ? "invite_revoked" : "affiliate_deactivated",
      affiliateId: context.affiliateId,
      childOrganizationId: context.affiliate.childOrganizationId || null,
      actorId: uid,
      at: now,
    });
    return { affiliate: affiliateResponse(affiliate), replayed: false };
  });
}

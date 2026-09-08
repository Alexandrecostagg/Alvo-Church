import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { documentId } from "./member-account";

const PLANS = ["free", "comunidade", "pastoral", "rede", "enterprise"] as const;
const BILLING = ["active", "overdue", "suspended"] as const;
const ORG_STATUSES = ["active", "inactive", "suspended"] as const;
const ROLES = [
  "super_admin",
  "church_admin",
  "pastor",
  "secretary",
  "group_leader",
  "ministry_leader",
  "member",
] as const;
const ADMIN_ROLES = new Set(["super_admin", "church_admin"]);
export const PLATFORM_MODULES = [
  "visitors",
  "groups",
  "events",
  "children",
  "youth",
  "volunteers",
  "tribes",
  "journeys",
  "communication",
  "marketplace",
  "giving",
  "publicForms",
  "finance",
  "ai",
] as const;

type Plan = (typeof PLANS)[number];
type Billing = (typeof BILLING)[number];
type OrgStatus = (typeof ORG_STATUSES)[number];
type Role = (typeof ROLES)[number];

const PLAN_PROVISIONING: Record<Plan, Record<string, unknown>> = {
  free: {
    planCode: "gratuito",
    planTier: "base",
    seatLimit: 4,
    campusLimit: 1,
    aiQuota: 0,
    whiteLabelEnabled: false,
    coBrandingEnabled: true,
    multiCampusEnabled: false,
    denominationalModeEnabled: false,
  },
  comunidade: {
    planCode: "comunidade",
    planTier: "growth",
    seatLimit: 12,
    campusLimit: 1,
    aiQuota: 50,
    whiteLabelEnabled: false,
    coBrandingEnabled: true,
    multiCampusEnabled: false,
    denominationalModeEnabled: false,
  },
  pastoral: {
    planCode: "pastoral",
    planTier: "advanced",
    seatLimit: 30,
    campusLimit: 1,
    aiQuota: 500,
    whiteLabelEnabled: false,
    coBrandingEnabled: true,
    multiCampusEnabled: false,
    denominationalModeEnabled: false,
  },
  rede: {
    planCode: "rede",
    planTier: "enterprise",
    seatLimit: 100,
    campusLimit: 50,
    aiQuota: 500,
    whiteLabelEnabled: true,
    coBrandingEnabled: true,
    multiCampusEnabled: true,
    denominationalModeEnabled: false,
  },
  enterprise: {
    planCode: "enterprise",
    planTier: "enterprise",
    seatLimit: 999,
    campusLimit: 999,
    aiQuota: 9999,
    whiteLabelEnabled: true,
    coBrandingEnabled: true,
    multiCampusEnabled: true,
    denominationalModeEnabled: true,
  },
};

function choice<T extends readonly string[]>(
  value: unknown,
  options: T,
  label: string,
): T[number] {
  if (typeof value !== "string" || !options.includes(value))
    throw new AccountError(400, `${label} inválido.`);
  return value as T[number];
}

function text(value: unknown, label: string, max: number, required = true) {
  const result = typeof value === "string" ? value.trim() : "";
  if ((required && !result) || result.length > max)
    throw new AccountError(400, `${label} inválido.`);
  return result;
}

function reason(value: unknown) {
  const result = text(value, "Motivo", 500);
  if (result.length < 8)
    throw new AccountError(
      400,
      "Informe um motivo com pelo menos 8 caracteres.",
    );
  return result;
}

async function authorizePlatformAdmin(tx: AccountTransaction, uid: string) {
  const actorId = documentId(uid, "Conta");
  const [admin] = await tx.read(`platformAdmins/${actorId}`);
  if (!admin)
    throw new AccountError(
      403,
      "Acesso exclusivo da administração da Plataforma Esdras.",
    );
  return actorId;
}

function audit(
  tx: AccountTransaction,
  orgId: string,
  actorId: string,
  action: string,
  targetId: string,
  why: string,
  before: unknown,
  after: unknown,
) {
  tx.set(`organizations/${orgId}/platformAdminAudit/${crypto.randomUUID()}`, {
    organizationId: orgId,
    actorId,
    action,
    targetId,
    reason: why,
    before,
    after,
    createdAt: new Date().toISOString(),
  });
}

function safeUser(row: Record<string, any>) {
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    roles: Array.isArray(row.roles)
      ? row.roles.filter((role): role is Role => ROLES.includes(role))
      : ["member"],
    isActive: row.isActive === true,
    linked: typeof row.personId === "string" && !!row.personId,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : undefined,
  };
}

function activeAdminCount(
  users: Record<string, any>[],
  excludingId: string,
  nextRoles?: Role[],
  nextActive?: boolean,
) {
  return users.filter((row) => {
    const active =
      row.id === excludingId && nextActive !== undefined
        ? nextActive
        : row.isActive === true;
    const roles =
      row.id === excludingId && nextRoles
        ? nextRoles
        : Array.isArray(row.roles)
          ? row.roles
          : [];
    return active && roles.some((role: string) => ADMIN_ROLES.has(role));
  }).length;
}

export async function readPlatformOrganization(
  raw: Record<string, unknown>,
  uid: string,
) {
  const organizationId = documentId(raw.organizationId, "Instituição");
  return accountTransaction(async (tx) => {
    await authorizePlatformAdmin(tx, uid);
    const root = `organizations/${organizationId}`;
    const [organization, subscription, features] = await tx.read(
      root,
      `${root}/settings/subscription`,
      `${root}/settings/features`,
    );
    if (!organization)
      throw new AccountError(404, "Instituição não encontrada.");
    const [users, entries] = await Promise.all([
      tx.query(root, "users", undefined, undefined, "EQUAL", 250),
      tx.query(root, "platformAdminAudit", undefined, undefined, "EQUAL", 30),
    ]);
    const audits = entries
      .map((entry) => ({
        id: String(entry.id),
        action: String(entry.action ?? ""),
        targetId: String(entry.targetId ?? ""),
        reason: String(entry.reason ?? ""),
        actorId: String(entry.actorId ?? ""),
        createdAt: String(entry.createdAt ?? ""),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      organization: {
        id: organizationId,
        name: String(organization.name ?? ""),
        displayName: String(
          organization.displayName ??
            organization.publicName ??
            organization.name ??
            organizationId,
        ),
        publicName: String(organization.publicName ?? ""),
        slug: String(organization.slug ?? ""),
        status: ORG_STATUSES.includes(organization.status)
          ? organization.status
          : "active",
        memberCount: Number(organization.memberCount ?? 0),
        ownerUid: String(organization.ownerUid ?? ""),
      },
      subscription: {
        plan:
          subscription && PLANS.includes(subscription.plan)
            ? subscription.plan
            : "free",
        billingStatus:
          subscription && BILLING.includes(subscription.billingStatus)
            ? subscription.billingStatus
            : "active",
      },
      modules: Object.fromEntries(
        PLATFORM_MODULES.map((key) => [
          key,
          features?.modules?.[key]?.enabled !== false,
        ]),
      ),
      users: users.map(safeUser).sort((a, b) => a.email.localeCompare(b.email)),
      audits,
    };
  });
}

export async function updatePlatformOrganization(
  raw: Record<string, unknown>,
  uid: string,
) {
  const organizationId = documentId(raw.organizationId, "Instituição");
  const why = reason(raw.reason);
  return accountTransaction(async (tx) => {
    const actorId = await authorizePlatformAdmin(tx, uid);
    const root = `organizations/${organizationId}`;
    const [organization] = await tx.read(root);
    if (!organization)
      throw new AccountError(404, "Instituição não encontrada.");
    const next = {
      displayName: text(raw.displayName, "Nome de exibição", 160),
      publicName: text(raw.publicName, "Nome público", 160, false),
      status: choice(raw.status, ORG_STATUSES, "Status"),
      updatedAt: new Date().toISOString(),
    };
    tx.patch(root, next);
    audit(
      tx,
      organizationId,
      actorId,
      "organization_updated",
      organizationId,
      why,
      {
        displayName: organization.displayName,
        publicName: organization.publicName,
        status: organization.status,
      },
      next,
    );
    return { ok: true };
  });
}

export async function updatePlatformPlan(
  raw: Record<string, unknown>,
  uid: string,
) {
  const organizationId = documentId(raw.organizationId, "Instituição");
  const plan = choice(raw.plan, PLANS, "Plano");
  const billingStatus = choice(
    raw.billingStatus,
    BILLING,
    "Situação da cobrança",
  );
  const why = reason(raw.reason);
  return accountTransaction(async (tx) => {
    const actorId = await authorizePlatformAdmin(tx, uid);
    const root = `organizations/${organizationId}`;
    const [organization, subscription] = await tx.read(
      root,
      `${root}/settings/subscription`,
    );
    if (!organization)
      throw new AccountError(404, "Instituição não encontrada.");
    const memberCount = Number(organization.memberCount ?? 0);
    const limit = plan === "free" ? 50 : plan === "comunidade" ? 300 : Infinity;
    if (memberCount > limit && raw.confirmOverLimit !== true)
      throw new AccountError(
        409,
        `Esta instituição tem ${memberCount} membros e o plano ${plan} permite ${limit}. Confirme o bloqueio de novos cadastros.`,
      );
    const now = new Date().toISOString();
    const next = {
      ...(subscription ?? {}),
      organizationId,
      plan,
      billingStatus,
      overdueSince:
        billingStatus === "overdue"
          ? (subscription?.overdueSince ?? now)
          : null,
      ...PLAN_PROVISIONING[plan],
      startedAt: subscription?.startedAt ?? now,
      updatedAt: now,
      updatedBy: actorId,
    };
    tx.set(`${root}/settings/subscription`, next);
    audit(
      tx,
      organizationId,
      actorId,
      "plan_updated",
      organizationId,
      why,
      {
        plan: subscription?.plan ?? "free",
        billingStatus: subscription?.billingStatus ?? "active",
      },
      { plan, billingStatus },
    );
    return {
      ok: true,
      memberCount,
      memberLimit: Number.isFinite(limit) ? limit : null,
    };
  });
}

export async function updatePlatformModules(
  raw: Record<string, unknown>,
  uid: string,
) {
  const organizationId = documentId(raw.organizationId, "Instituição");
  const why = reason(raw.reason);
  if (
    !raw.modules ||
    typeof raw.modules !== "object" ||
    Array.isArray(raw.modules)
  )
    throw new AccountError(400, "Módulos inválidos.");
  const requested = raw.modules as Record<string, unknown>;
  if (
    Object.keys(requested).some(
      (key) =>
        !PLATFORM_MODULES.includes(key as any) ||
        typeof requested[key] !== "boolean",
    )
  )
    throw new AccountError(400, "Módulos inválidos.");
  return accountTransaction(async (tx) => {
    const actorId = await authorizePlatformAdmin(tx, uid);
    const root = `organizations/${organizationId}`;
    const [organization, features] = await tx.read(
      root,
      `${root}/settings/features`,
    );
    if (!organization)
      throw new AccountError(404, "Instituição não encontrada.");
    const before = features?.modules ?? {};
    const modules = {
      ...before,
      core: before.core ?? { enabled: true, source: "plan" },
    };
    for (const key of PLATFORM_MODULES) {
      if (typeof requested[key] === "boolean")
        modules[key] = {
          ...(modules[key] ?? {}),
          enabled: requested[key],
          source: "manual",
        };
    }
    tx.set(`${root}/settings/features`, {
      ...(features ?? {}),
      organizationId,
      modules,
      updatedAt: new Date().toISOString(),
      updatedBy: actorId,
    });
    audit(
      tx,
      organizationId,
      actorId,
      "modules_updated",
      organizationId,
      why,
      Object.fromEntries(
        PLATFORM_MODULES.map((key) => [key, before[key]?.enabled !== false]),
      ),
      Object.fromEntries(
        PLATFORM_MODULES.map((key) => [key, modules[key]?.enabled !== false]),
      ),
    );
    return { ok: true };
  });
}

export async function updatePlatformUser(
  raw: Record<string, unknown>,
  uid: string,
) {
  const organizationId = documentId(raw.organizationId, "Instituição");
  const userId = documentId(raw.userId, "Usuário");
  const why = reason(raw.reason);
  const isActive = typeof raw.isActive === "boolean" ? raw.isActive : null;
  const roles = Array.isArray(raw.roles)
    ? [...new Set(raw.roles.map((role) => choice(role, ROLES, "Papel")))]
    : null;
  if (isActive === null && !roles)
    throw new AccountError(400, "Nenhuma alteração informada.");
  if (roles && !roles.length)
    throw new AccountError(400, "O usuário precisa ter ao menos um papel.");
  return accountTransaction(async (tx) => {
    const actorId = await authorizePlatformAdmin(tx, uid);
    const root = `organizations/${organizationId}`;
    const [organization, target] = await tx.read(
      root,
      `${root}/users/${userId}`,
    );
    if (!organization || !target || target.organizationId !== organizationId)
      throw new AccountError(404, "Usuário não encontrado nesta instituição.");
    const users = await tx.query(
      root,
      "users",
      undefined,
      undefined,
      "EQUAL",
      250,
    );
    const nextRoles =
      roles ?? (Array.isArray(target.roles) ? target.roles : ["member"]);
    const nextActive = isActive ?? target.isActive === true;
    if (activeAdminCount(users, userId, nextRoles, nextActive) === 0)
      throw new AccountError(
        409,
        "Mantenha ao menos um administrador ativo na instituição.",
      );
    const next = {
      roles: nextRoles,
      isActive: nextActive,
      accessUpdatedAt: new Date().toISOString(),
      accessUpdatedBy: actorId,
    };
    tx.patch(`${root}/users/${userId}`, next);
    audit(
      tx,
      organizationId,
      actorId,
      "user_access_updated",
      userId,
      why,
      { roles: target.roles ?? ["member"], isActive: target.isActive === true },
      { roles: nextRoles, isActive: nextActive },
    );
    return { ok: true };
  });
}

export async function removePlatformUser(
  raw: Record<string, unknown>,
  uid: string,
) {
  const organizationId = documentId(raw.organizationId, "Instituição");
  const userId = documentId(raw.userId, "Usuário");
  const why = reason(raw.reason);
  return accountTransaction(async (tx) => {
    const actorId = await authorizePlatformAdmin(tx, uid);
    const root = `organizations/${organizationId}`;
    const [organization, target, link] = await tx.read(
      root,
      `${root}/users/${userId}`,
      `${root}/memberAccountLinks/${userId}`,
    );
    if (!organization || !target || target.organizationId !== organizationId)
      throw new AccountError(404, "Usuário não encontrado nesta instituição.");
    if (link || target.personId)
      throw new AccountError(
        409,
        "Este usuário possui cadastro vinculado. Desative o acesso para preservar o histórico.",
      );
    const users = await tx.query(
      root,
      "users",
      undefined,
      undefined,
      "EQUAL",
      250,
    );
    if (activeAdminCount(users, userId, [], false) === 0)
      throw new AccountError(
        409,
        "Mantenha ao menos um administrador ativo na instituição.",
      );
    tx.remove(`${root}/users/${userId}`);
    audit(
      tx,
      organizationId,
      actorId,
      "user_access_removed",
      userId,
      why,
      {
        email: target.email ?? "",
        roles: target.roles ?? ["member"],
        isActive: target.isActive === true,
      },
      null,
    );
    return { ok: true };
  });
}

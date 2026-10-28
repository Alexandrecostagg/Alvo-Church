import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { documentId } from "./member-account";
import {
  PLAN_LIMITS,
  planHasModule,
  planModuleDefaults,
  planTierToPlanId,
} from "@alvo/firebase/src/plans";
import {
  COMPANY_FIELDS,
  type CompanyProfile,
} from "../../../src/lib/platform-organization";
import {
  readPlatformAuthProfiles,
  type PlatformAuthProfile,
} from "./platform-auth-profiles";

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
    displayName: String(row.displayName ?? row.name ?? ""),
    phone: String(row.phone ?? row.mobilePhone ?? ""),
    personId: String(row.personId ?? ""),
    campusIds: Array.isArray(row.campusIds)
      ? row.campusIds.filter((id): id is string => typeof id === "string")
      : [],
    createdBy: String(row.createdBy ?? row.createdByUserId ?? ""),
    updatedAt: String(row.accessUpdatedAt ?? row.updatedAt ?? ""),
    roles: Array.isArray(row.roles)
      ? row.roles.filter((role): role is Role => ROLES.includes(role))
      : ([] as Role[]),
    isActive: row.isActive === true,
    linked: typeof row.personId === "string" && !!row.personId,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : undefined,
  };
}

async function assertRemainingAdmin(
  tx: AccountTransaction,
  root: string,
  targetId: string,
  roles: string[],
  active: boolean,
) {
  if (active && roles.some((role) => ADMIN_ROLES.has(role))) return;
  let cursor: string | undefined;
  for (;;) {
    const users = await tx.query(
      root,
      "users",
      "isActive",
      true,
      "EQUAL",
      100,
      undefined,
      { field: "__name__", direction: "ASCENDING" },
      cursor,
    );
    if (
      users.some(
        (row) =>
          row.id !== targetId &&
          row.isActive === true &&
          Array.isArray(row.roles) &&
          row.roles.some((role: string) => ADMIN_ROLES.has(role)),
      )
    )
      return;
    if (users.length < 100)
      throw new AccountError(
        409,
        "Mantenha ao menos um administrador ativo na instituição.",
      );
    cursor = String(users.at(-1)!.id);
  }
}

const USER_PAGE_SIZE = 100;
function subscriptionPlan(subscription: Record<string, any> | null): Plan {
  return subscription && PLANS.includes(subscription.plan)
    ? subscription.plan
    : planTierToPlanId(subscription?.planTier);
}
async function userPage(tx: AccountTransaction, root: string, after?: string) {
  const rows = await tx.query(
    root,
    "users",
    undefined,
    undefined,
    "EQUAL",
    USER_PAGE_SIZE + 1,
    undefined,
    { field: "__name__", direction: "ASCENDING" },
    after,
  );
  return {
    users: rows.slice(0, USER_PAGE_SIZE).map(safeUser),
    usersPage: {
      nextCursor:
        rows.length > USER_PAGE_SIZE
          ? String(rows[USER_PAGE_SIZE - 1].id)
          : null,
    },
  };
}
async function enrichUsers(
  users: ReturnType<typeof safeUser>[],
  ownerUid = "",
) {
  let authWarning = "";
  const profiles = await readPlatformAuthProfiles([
    ...users.map((row) => row.id),
    ownerUid,
  ]).catch(() => {
    authWarning =
      "Não foi possível consultar os dados de autenticação. Os vínculos da instituição continuam disponíveis; tente atualizar a ficha.";
    return new Map<string, PlatformAuthProfile>();
  });
  return {
    users: users.map((row) => {
      const profile = profiles.get(row.id);
      return {
        ...row,
        displayName: profile?.displayName || row.displayName,
        email: profile?.email || row.email,
        phone: profile?.phone || row.phone,
        authStatus: authWarning
          ? "unavailable"
          : profile
            ? profile.disabled
              ? "disabled"
              : "active"
            : "missing",
        emailVerified: profile ? profile.emailVerified : null,
        authCreatedAt: profile?.createdAt ?? "",
        lastSignInAt: profile?.lastSignInAt ?? "",
      };
    }),
    ownerProfile: profiles.get(ownerUid),
    authWarning,
  };
}
export async function readPlatformOrganizationUsers(
  raw: Record<string, unknown>,
  uid: string,
) {
  const organizationId = documentId(raw.organizationId, "Instituição");
  const cursor = raw.cursor ? documentId(raw.cursor, "Página") : undefined;
  const page = await accountTransaction(async (tx) => {
    await authorizePlatformAdmin(tx, uid);
    const root = `organizations/${organizationId}`;
    const [organization] = await tx.read(root);
    if (!organization)
      throw new AccountError(404, "Instituição não encontrada.");
    return userPage(tx, root, cursor);
  });
  const { users, authWarning } = await enrichUsers(page.users);
  return { users, usersPage: page.usersPage, authWarning };
}
export async function readPlatformOrganization(
  raw: Record<string, unknown>,
  uid: string,
) {
  const organizationId = documentId(raw.organizationId, "Instituição");
  const detail = await accountTransaction(async (tx) => {
    await authorizePlatformAdmin(tx, uid);
    const root = `organizations/${organizationId}`;
    const [organization, subscription, features] = await tx.read(
      root,
      `${root}/settings/subscription`,
      `${root}/settings/features`,
    );
    if (!organization)
      throw new AccountError(404, "Instituição não encontrada.");
    const ownerUid =
      typeof organization.ownerUid === "string" &&
      /^[A-Za-z0-9_-]{1,128}$/.test(organization.ownerUid)
        ? organization.ownerUid
        : "";
    const [ownerUser] = ownerUid
      ? await tx.read(`${root}/users/${ownerUid}`)
      : [null];
    const [page, entries] = await Promise.all([
      userPage(tx, root),
      tx.query(
        root,
        "platformAdminAudit",
        undefined,
        undefined,
        "EQUAL",
        30,
        undefined,
        { field: "createdAt", direction: "DESCENDING" },
      ),
    ]);
    const plan = subscriptionPlan(subscription);
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
          ? (organization.status as OrgStatus)
          : ("active" as OrgStatus),
        memberCount: Number(organization.memberCount ?? 0),
        ownerUid,
        registrationEmail: String(
          organization.registrationEmail ??
            organization.ownerEmail ??
            ownerUser?.email ??
            "",
        ),
        createdAt: String(organization.createdAt ?? ""),
        updatedAt: String(organization.updatedAt ?? ""),
        organizationType: String(organization.organizationType ?? ""),
        timezone: String(organization.timezone ?? ""),
        locale: String(organization.locale ?? ""),
        countryCode: String(organization.countryCode ?? ""),
      },
      company: Object.fromEntries(
        COMPANY_FIELDS.map(([key]) => [key, String(organization[key] ?? "")]),
      ) as CompanyProfile,
      subscription: {
        plan,
        billingStatus:
          subscription && BILLING.includes(subscription.billingStatus)
            ? (subscription.billingStatus as Billing)
            : ("active" as Billing),
      },
      modules: Object.fromEntries(
        PLATFORM_MODULES.map((key) => [
          key,
          planHasModule(plan, key) &&
            features?.modules?.[key]?.enabled !== false,
        ]),
      ),
      ...page,
      audits: entries
        .map((entry) => ({
          id: String(entry.id),
          action: String(entry.action ?? ""),
          targetId: String(entry.targetId ?? ""),
          reason: String(entry.reason ?? ""),
          actorId: String(entry.actorId ?? ""),
          createdAt: String(entry.createdAt ?? ""),
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  });
  const { users, ownerProfile, authWarning } = await enrichUsers(
    detail.users,
    detail.organization.ownerUid,
  );
  return {
    ...detail,
    users,
    authWarning,
    organization: {
      ...detail.organization,
      registrationEmail:
        detail.organization.registrationEmail || ownerProfile?.email || "",
    },
    owner: {
      id: detail.organization.ownerUid,
      displayName: ownerProfile?.displayName ?? "",
      email: ownerProfile?.email ?? detail.organization.registrationEmail,
      phone: ownerProfile?.phone ?? "",
      createdAt: ownerProfile?.createdAt ?? "",
    },
  };
}

export type PlatformOrganizationDetail = Awaited<
  ReturnType<typeof readPlatformOrganization>
>;

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
    const profile: Record<string, string> = {};
    for (const [key, label, max] of COMPANY_FIELDS) {
      if (raw[key] !== undefined)
        profile[key] = text(raw[key], label, max, false);
    }
    if (
      profile.contactEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail)
    )
      throw new AccountError(400, "E-mail de contato inválido.");
    if (profile.addressState && !/^[A-Za-z]{2}$/.test(profile.addressState))
      throw new AccountError(400, "Estado deve ter duas letras (UF).");
    if (profile.addressState)
      profile.addressState = profile.addressState.toUpperCase();
    if (
      profile.taxId &&
      !/^(?:\d{11}|\d{14})$/.test(profile.taxId.replace(/\D/g, ""))
    )
      throw new AccountError(400, "Informe CPF com 11 ou CNPJ com 14 dígitos.");
    if (profile.taxId) profile.taxId = profile.taxId.replace(/\D/g, "");
    if (profile.website && !/^https?:\/\//i.test(profile.website))
      throw new AccountError(
        400,
        "O site deve começar com https:// ou http://.",
      );
    const next = {
      ...profile,
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
        ...Object.fromEntries(
          Object.keys(profile).map((key) => [key, organization[key] ?? ""]),
        ),
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
    const [organization, subscription, features] = await tx.read(
      root,
      `${root}/settings/subscription`,
      `${root}/settings/features`,
    );
    if (!organization)
      throw new AccountError(404, "Instituição não encontrada.");
    const memberCount = Number(organization.memberCount ?? 0);
    const limit = PLAN_LIMITS[plan].maxMembers;
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
    const defaults = planModuleDefaults(plan);
    const modules = { ...(features?.modules ?? {}) };
    for (const [key, enabled] of Object.entries(defaults))
      modules[key] = { ...(modules[key] ?? {}), enabled, source: "plan" };
    tx.set(`${root}/settings/features`, {
      ...(features ?? {}),
      organizationId,
      modules,
      updatedAt: now,
      updatedBy: actorId,
    });
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
        modules: features?.modules ?? {},
      },
      { plan, billingStatus, modules },
    );
    return {
      ok: true,
      memberCount,
      memberLimit: Number.isFinite(limit) ? limit : null,
      modules: defaults,
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
    const [organization, features, subscription] = await tx.read(
      root,
      `${root}/settings/features`,
      `${root}/settings/subscription`,
    );
    if (!organization)
      throw new AccountError(404, "Instituição não encontrada.");
    const plan = subscriptionPlan(subscription);
    if (
      PLATFORM_MODULES.some(
        (key) => requested[key] === true && !planHasModule(plan, key),
      )
    )
      throw new AccountError(
        400,
        "O plano atual não inclui uma das funções selecionadas. Aplique um plano compatível primeiro.",
      );
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
    const nextRoles =
      roles ?? (Array.isArray(target.roles) ? target.roles : ["member"]);
    const nextActive = isActive ?? target.isActive === true;
    await assertRemainingAdmin(tx, root, userId, nextRoles, nextActive);
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
    await assertRemainingAdmin(tx, root, userId, [], false);
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

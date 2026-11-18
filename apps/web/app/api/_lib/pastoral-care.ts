import { createHash } from "node:crypto";
import {
  homeProfiles,
  isActiveGroupMembership,
  isCellGroup,
} from "@alvo/domain";
import { planHasModule } from "@alvo/firebase";
import {
  accountTransaction,
  AccountError,
  type AccountTransaction,
} from "./member-account-store";
import { financeActor, textField } from "./finance-operations";
import { documentId } from "./member-account";
import { boundPerson } from "./journey-operations";
import { assertModuleEnabled } from "./module-access";
import { whatsappPhone, whatsappHref } from "@alvo/utils";
import { assertWhatsappContactAllowed } from "./communication-operations";

type Data = Record<string, any>;
export const pastoralRoles = ["super_admin", "church_admin", "pastor"];
const hash = (s: string) =>
  createHash("sha256").update(s).digest("hex").slice(0, 40);
export const careName = (p: Data) =>
  String(
    p.preferredName ||
      [p.firstName, p.lastName].filter(Boolean).join(" ") ||
      p.displayName ||
      "Pessoa",
  );
export const carePlan = (sub: Data | null) =>
  sub?.plan ||
  (
    {
      advanced: "pastoral",
      growth: "comunidade",
      enterprise: "enterprise",
    } as Data
  )[sub?.planTier] ||
  "free";
export async function careEnabled(tx: AccountTransaction, root: string) {
  await assertModuleEnabled(tx, root, "ai");
  const [sub] = await tx.read(root + "/settings/subscription");
  if (
    !planHasModule(carePlan(sub), "ai") ||
    !["pastoral", "rede", "enterprise"].includes(carePlan(sub))
  )
    throw new AccountError(
      403,
      "O acompanhamento pastoral exige plano Pastoral ou superior.",
    );
}
export async function careContext(
  tx: AccountTransaction,
  body: Data,
  uid: string,
) {
  const orgId = documentId(body.organizationId, "Instituição");
  const { root, org, actor } = await financeActor(tx, orgId, uid, false, null);
  await careEnabled(tx, root);
  const [sub] = await tx.read(root + "/settings/subscription");
  const profiles = homeProfiles(
    actor.roles || [],
    org.organizationTier || org.organizationType || "solo",
    ["rede", "enterprise"].includes(carePlan(sub)),
  );
  const profile =
    body.profile ||
    (profiles.includes("network")
      ? "network"
      : actor.roles?.some((r: string) => pastoralRoles.includes(r))
        ? "pastoral"
        : "cell_leader");
  if (profile === "network" && profiles.includes("network"))
    return { root, orgId, org, actor, uid, profile, staff: false };
  const staff =
    profile !== "cell_leader" &&
    actor.roles?.some((r: string) => pastoralRoles.includes(r));
  if (
    !["pastoral", "administration", "cell_leader"].includes(profile) ||
    (!staff && !actor.roles?.includes("group_leader"))
  )
    throw new AccountError(
      403,
      "Esta visão exige liderança pastoral ou de célula.",
    );
  return { root, orgId, org, actor, uid, profile, staff: !!staff };
}
export type CareContext = Awaited<ReturnType<typeof careContext>>;
export async function leaderCanCare(
  tx: AccountTransaction,
  c: CareContext,
  uid: string,
  personId: unknown,
  groupId: unknown,
) {
  if (typeof personId !== "string" || typeof groupId !== "string") return false;
  documentId(personId, "Pessoa");
  documentId(groupId, "Célula");
  const bound = await boundPerson(tx, c.root, c.orgId, uid);
  if (!bound) return false;
  const [user, g, leader, member, p, features] = await tx.read(
    c.root + "/users/" + uid,
    c.root + "/groups/" + groupId,
    c.root + "/groups/" + groupId + "/members/" + groupId + "_" + bound,
    c.root + "/groups/" + groupId + "/members/" + groupId + "_" + personId,
    c.root + "/people/" + personId,
    c.root + "/settings/features",
  );
  return (
    features?.modules?.groups?.enabled !== false &&
    user?.isActive === true &&
    user.organizationId === c.orgId &&
    user.roles?.includes("group_leader") &&
    g?.organizationId === c.orgId &&
    g.status === "active" &&
    isCellGroup(g) &&
    isActiveGroupMembership(leader) &&
    leader?.organizationId === c.orgId &&
    leader.personId === bound &&
    leader.groupId === groupId &&
    ["leader", "co_leader", "supervisor"].includes(leader.roleInGroup) &&
    isActiveGroupMembership(member) &&
    member?.organizationId === c.orgId &&
    member.groupId === groupId &&
    member.personId === personId &&
    p?.organizationId === c.orgId &&
    p.status === "active"
  );
}
export async function careRecord(
  tx: AccountTransaction,
  c: CareContext,
  id: string,
) {
  const [r] = await tx.read(
    c.root + "/prayerRequests/" + documentId(id, "Pedido"),
  );
  if (!r || r.organizationId !== c.orgId)
    throw new AccountError(404, "Pedido indisponível.");
  if (
    c.profile === "network" ||
    (!c.staff &&
      (r.assignedToUserId !== c.uid ||
        !(await leaderCanCare(tx, c, c.uid, r.personId, r.groupId))))
  )
    throw new AccountError(
      403,
      "Pedido fora do seu acompanhamento autorizado.",
    );
  return { ...r, id } as Data;
}
const dto = (r: Data) => ({
  id: r.id,
  personName: r.personName || "Pessoa",
  personId: r.personId || null,
  groupId: r.groupId || null,
  message: r.message || "",
  phone: r.phone || "",
  category: r.category || "Oração",
  priority: r.priority || "normal",
  status: r.status,
  stage: r.stage || (r.status === "open" ? "new" : r.status),
  assignedToUserId: r.assignedToUserId || null,
  ownerName: r.ownerName || r.careOwner || "",
  dueAt: r.dueAt || null,
  createdAt: r.createdAt || "",
  updatedAt: r.updatedAt || r.createdAt || "",
  source: r.source || "reception",
  revision: r.revision || 0,
  isPublic: r.isPublic === true,
});
async function visibleRequests(
  tx: AccountTransaction,
  c: CareContext,
  rows: Data[],
) {
  const valid = rows.filter((r) => r.organizationId === c.orgId);
  if (c.staff) return valid;
  const personId = await boundPerson(tx, c.root, c.orgId, c.uid);
  const [features] = await tx.read(c.root + "/settings/features");
  if (!personId || features?.modules?.groups?.enabled === false) return [];
  const candidates = valid.filter(
    (r) =>
      r.assignedToUserId === c.uid &&
      typeof r.personId === "string" &&
      /^[A-Za-z0-9_-]{1,128}$/.test(r.personId) &&
      typeof r.groupId === "string" &&
      /^[A-Za-z0-9_-]{1,128}$/.test(r.groupId),
  );
  const visible: Data[] = [];
  for (let offset = 0; offset < candidates.length; offset += 50) {
    const slice = candidates.slice(offset, offset + 50);
    const docs = await tx.read(
      ...slice.flatMap((r) => [
        c.root + "/groups/" + r.groupId,
        c.root +
          "/groups/" +
          r.groupId +
          "/members/" +
          r.groupId +
          "_" +
          personId,
        c.root +
          "/groups/" +
          r.groupId +
          "/members/" +
          r.groupId +
          "_" +
          r.personId,
        c.root + "/people/" + r.personId,
      ]),
    );
    slice.forEach((r, i) => {
      const [g, leader, member, p] = docs.slice(i * 4, i * 4 + 4);
      if (
        g?.organizationId === c.orgId &&
        g.status === "active" &&
        isCellGroup(g) &&
        leader?.organizationId === c.orgId &&
        leader.personId === personId &&
        leader.groupId === r.groupId &&
        isActiveGroupMembership(leader) &&
        ["leader", "co_leader", "supervisor"].includes(leader.roleInGroup) &&
        member?.organizationId === c.orgId &&
        member.groupId === r.groupId &&
        member.personId === r.personId &&
        isActiveGroupMembership(member) &&
        p?.organizationId === c.orgId &&
        p.status === "active"
      )
        visible.push(r);
    });
  }
  return visible;
}
export async function careQueue(
  tx: AccountTransaction,
  c: CareContext,
  now = Date.now(),
) {
  const rows = c.staff
    ? (
        await Promise.all(
          ["open", "in_progress"].map((status) =>
            tx.query(c.root, "prayerRequests", "status", status, "EQUAL", 1001),
          ),
        )
      ).flat()
    : await tx.query(
        c.root,
        "prayerRequests",
        "assignedToUserId",
        c.uid,
        "EQUAL",
        1001,
      );
  const partial = c.staff
    ? rows.filter((r) => r.status === "open").length > 1000 ||
      rows.filter((r) => r.status === "in_progress").length > 1000
    : rows.length > 1000;
  const scoped = await visibleRequests(
    tx,
    c,
    rows.filter((r) => ["open", "in_progress"].includes(r.status)),
  );
  const priority = (r: Data) =>
    r.priority === "urgent" ? 0 : r.priority === "important" ? 1 : 2;
  scoped.sort(
    (a, b) =>
      priority(a) - priority(b) ||
      (Date.parse(a.dueAt) || Infinity) - (Date.parse(b.dueAt) || Infinity) ||
      String(a.createdAt).localeCompare(String(b.createdAt)) ||
      a.id.localeCompare(b.id),
  );
  return {
    requests: scoped.map(dto),
    partial,
    summary: {
      open: scoped.length,
      urgent: scoped.filter((r) => r.priority === "urgent").length,
      unassigned: scoped.filter((r) => !r.assignedToUserId).length,
      overdue: scoped.filter((r) => r.dueAt && Date.parse(r.dueAt) < now)
        .length,
      inProgress: scoped.filter((r) => r.status === "in_progress").length,
    },
    asOf: new Date(now).toISOString(),
  };
}
export async function networkCare(tx: AccountTransaction, c: CareContext) {
  if (c.profile !== "network")
    throw new AccountError(403, "Visão de rede indisponível.");
  const aff = await tx.query(
    c.root,
    "affiliates",
    "status",
    "active",
    "EQUAL",
    51,
  );
  const churches = [];
  for (const a of aff.slice(0, 50)) {
    if (
      a.parentOrganizationId !== c.orgId ||
      typeof a.childOrganizationId !== "string" ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(a.childOrganizationId)
    )
      continue;
    const id = a.childOrganizationId,
      root = "organizations/" + id;
    const [child, link] = await tx.read(root, "networkAffiliations/" + id);
    if (
      child?.status !== "active" ||
      link?.status !== "active" ||
      link.parentOrganizationId !== c.orgId ||
      link.childOrganizationId !== id ||
      link.affiliateId !== a.id
    )
      continue;
    let available = true;
    try {
      await careEnabled(tx, root);
    } catch (e) {
      if (!(e instanceof AccountError)) throw e;
      available = false;
    }
    const counts = available
      ? await Promise.all([
          tx.count(root, "prayerRequests", "status", "open"),
          tx.count(root, "prayerRequests", "status", "in_progress"),
          ...["open", "in_progress"].map((status) =>
            tx.count(root, "prayerRequests", "status", status, {
              field: "priority",
              value: "urgent",
            }),
          ),
          ...["open", "in_progress"].map((status) =>
            tx.count(root, "prayerRequests", "status", status, {
              field: "dueAt",
              value: new Date().toISOString(),
              op: "LESS_THAN_OR_EQUAL",
            }),
          ),
        ])
      : null;
    churches.push({
      id,
      name: child.displayName || child.name || a.childName || "Instituição",
      open: counts ? counts[0] + counts[1] : null,
      waiting: counts?.[0] ?? null,
      inProgress: counts?.[1] ?? null,
      urgent: counts ? counts[2] + counts[3] : null,
      overdue: counts ? counts[4] + counts[5] : null,
      available,
    });
  }
  return {
    scope: "network",
    churches,
    partial: aff.length > 50,
    asOf: new Date().toISOString(),
    summary: {
      open: churches.reduce((n, c) => n + (c.open || 0), 0),
      inProgress: churches.reduce((n, c) => n + (c.inProgress || 0), 0),
      urgent: churches.reduce((n, c) => n + (c.urgent || 0), 0),
      overdue: churches.reduce((n, c) => n + (c.overdue || 0), 0),
      covered: churches.filter((c) => c.available).length,
      total: churches.length,
    },
  };
}
function audit(
  tx: AccountTransaction,
  c: CareContext,
  id: string,
  action: string,
  revision: number,
  extra: Data = {},
) {
  tx.set(c.root + "/pastoralAudit/" + crypto.randomUUID(), {
    organizationId: c.orgId,
    requestId: id,
    action,
    actorId: c.uid,
    revision,
    at: new Date().toISOString(),
    ...extra,
  });
}
function dueDate(raw: unknown) {
  if (raw === undefined || raw === null || raw === "") return null;
  if (
    typeof raw !== "string" ||
    !/^20\d{2}-\d{2}-\d{2}$/.test(raw) ||
    !Number.isFinite(Date.parse(raw)) ||
    new Date(raw).toISOString().slice(0, 10) !== raw
  )
    throw new AccountError(400, "Prazo inválido.");
  return raw + "T23:59:59.999Z";
}
export async function pastoralOperation(body: Data, uid: string) {
  return accountTransaction(async (tx) => {
    // Member submission and wall do not grant pastoral access.
    if (["submit", "wall", "pray"].includes(body.action)) {
      const orgId = documentId(body.organizationId, "Instituição");
      const { root, actor } = await financeActor(tx, orgId, uid, false, null);
      await assertModuleEnabled(tx, root, "ai");
      if (body.action === "wall") {
        const rows = await tx.query(
          root,
          "prayerRequests",
          "isPublic",
          true,
          "EQUAL",
          51,
          undefined,
          { field: "createdAt", direction: "DESCENDING" },
        );
        return {
          items: rows
            .slice(0, 50)
            .filter((r) => r.organizationId === orgId)
            .map((r) => ({
              id: r.id,
              personName: r.personName,
              message: r.message,
              createdAt: r.createdAt,
              prayerCount: r.prayerCount || 0,
            })),
          partial: rows.length > 50,
        };
      }
      if (body.action === "pray") {
        const id = documentId(body.requestId, "Pedido"),
          [r, v] = await tx.read(
            root + "/prayerRequests/" + id,
            root + "/prayerReactions/" + hash(id + ":" + uid),
          );
        if (r?.organizationId !== orgId || r.isPublic !== true)
          throw new AccountError(404, "Pedido indisponível.");
        if (v) return { ok: true, replayed: true };
        tx.set(root + "/prayerReactions/" + hash(id + ":" + uid), {
          organizationId: orgId,
          requestId: id,
          userId: uid,
        });
        tx.patch(root + "/prayerRequests/" + id, {
          prayerCount: Math.max(0, Number(r.prayerCount) || 0) + 1,
        });
        return { ok: true };
      }
      const requestId = documentId(body.requestId, "Tentativa"),
        id = "app_" + hash(uid + ":" + requestId),
        path = root + "/prayerRequests/" + id;
      const message = textField(body.message, "Pedido", 2000),
        isPublic = body.isPublic === true;
      const [existing, limit] = await tx.read(
        path,
        root + "/pastoralLimits/" + uid,
      );
      const fingerprint = hash(message + ":" + isPublic);
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new AccountError(409, "Esta tentativa já foi utilizada.");
        return { id, replayed: true };
      }
      const window = Math.floor(Date.now() / 86400000),
        count = limit?.window === window ? limit.count : 0;
      if (!Number.isInteger(count) || count >= 20)
        throw new AccountError(
          429,
          "Limite diário de pedidos atingido. Procure sua liderança para atendimento.",
        );
      const personId = await boundPerson(tx, root, orgId, uid),
        [p] = personId ? await tx.read(root + "/people/" + personId) : [null];
      tx.set(path, {
        id,
        organizationId: orgId,
        personId: personId || null,
        personName: p ? careName(p) : actor.displayName || "Membro",
        message,
        isPublic,
        source: "app",
        status: "open",
        priority: "normal",
        prayerCount: 0,
        createdByUserId: uid,
        createdAt: new Date().toISOString(),
        revision: 0,
        fingerprint,
      });
      tx.set(root + "/pastoralLimits/" + uid, { window, count: count + 1 });
      return { id };
    }
    const c = await careContext(tx, body, uid);
    if (c.profile === "network") {
      if (body.action !== "overview")
        throw new AccountError(
          403,
          "A rede recebe indicadores consolidados; não altera pedidos das instituições.",
        );
      return networkCare(tx, c);
    }
    if (body.action === "overview") {
      const queue = await careQueue(tx, c);
      const offset = Number(body.offset || 0);
      if (!Number.isInteger(offset) || offset < 0 || offset > 2000)
        throw new AccountError(400, "Página inválida.");
      let list = queue.requests;
      if (body.resolved === true) {
        const rows = await tx.query(
          c.root,
          "prayerRequests",
          "status",
          "resolved",
          "EQUAL",
          1001,
        );
        const allowed = await visibleRequests(tx, c, rows);
        list = allowed
          .sort((a, b) =>
            String(b.updatedAt || b.createdAt).localeCompare(
              String(a.updatedAt || a.createdAt),
            ),
          )
          .map(dto);
        queue.partial ||= rows.length > 1000;
      }
      return {
        scope: c.staff ? "institution" : "assigned",
        ...queue,
        requests: list.slice(offset, offset + 100),
        offset,
        hasMore: list.length > offset + 100,
        canManage: c.staff,
      };
    }
    if (body.action === "directory") {
      if (!c.staff)
        throw new AccountError(403, "Diretório restrito à equipe pastoral.");
      const [people, users, groups] = await Promise.all([
        tx.query(c.root, "people", "status", "active", "EQUAL", 501),
        tx.query(c.root, "users", "isActive", true, "EQUAL", 501),
        tx.query(c.root, "groups", "status", "active", "EQUAL", 501),
      ]);
      return {
        people: people
          .slice(0, 500)
          .filter((p) => p.organizationId === c.orgId)
          .map((p) => ({ id: p.id, name: careName(p) })),
        owners: users
          .slice(0, 500)
          .filter(
            (u) =>
              u.organizationId === c.orgId &&
              u.roles?.some((r: string) =>
                [...pastoralRoles, "group_leader"].includes(r),
              ),
          )
          .map((u) => ({
            id: u.id,
            name: u.displayName || u.email || "Liderança",
            leader: !u.roles.some((r: string) => pastoralRoles.includes(r)),
          })),
        groups: groups
          .slice(0, 500)
          .filter((g) => g.organizationId === c.orgId && isCellGroup(g))
          .map((g) => ({ id: g.id, name: g.name })),
        partial: [people, users, groups].some((a) => a.length > 500),
      };
    }
    if (body.action === "checkin") {
      if (!c.staff)
        throw new AccountError(
          403,
          "Registro de culto restrito à equipe pastoral.",
        );
      const personId = documentId(body.personId, "Pessoa"),
        date = String(body.date || "");
      dueDate(date);
      if (!date || date > new Date().toISOString().slice(0, 10))
        throw new AccountError(400, "Escolha uma data de culto realizada.");
      const [p] = await tx.read(c.root + "/people/" + personId);
      if (p?.organizationId !== c.orgId || p.status !== "active")
        throw new AccountError(404, "Pessoa indisponível.");
      tx.set(c.root + "/churchAttendance/" + date + "_" + personId, {
        id: date + "_" + personId,
        organizationId: c.orgId,
        personId,
        serviceDate: date,
        registeredByUserId: uid,
        createdAt: new Date().toISOString(),
      });
      audit(tx, c, date + "_" + personId, "church_checkin", 0);
      return { ok: true };
    }
    if (body.action === "create") {
      if (!c.staff)
        throw new AccountError(
          403,
          "Registro de recepção restrito à equipe pastoral.",
        );
      const requestId = documentId(body.requestId, "Tentativa"),
        id = "care_" + hash(uid + ":" + requestId),
        path = c.root + "/prayerRequests/" + id;
      const personId = body.personId
        ? documentId(body.personId, "Pessoa")
        : null;
      const [p, existing] = await tx.read(
        personId ? c.root + "/people/" + personId : c.root + "/people/_none",
        path,
      );
      if (personId && (p?.organizationId !== c.orgId || p.status !== "active"))
        throw new AccountError(404, "Pessoa indisponível.");
      const data = {
        personId,
        personName: p ? careName(p) : textField(body.personName, "Nome", 160),
        message: textField(body.message, "Pedido", 2000),
        category: textField(body.category || "Oração", "Categoria", 80),
        phone: textField(body.phone, "Telefone", 30, true),
      };
      const fingerprint = hash(JSON.stringify(data));
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new AccountError(409, "Tentativa já utilizada.");
        return { id, replayed: true };
      }
      tx.set(path, {
        id,
        organizationId: c.orgId,
        ...data,
        status: "open",
        stage: "new",
        priority: "normal",
        isPublic: false,
        prayerCount: 0,
        source: "reception",
        createdAt: new Date().toISOString(),
        createdByUserId: uid,
        revision: 0,
        fingerprint,
      });
      audit(tx, c, id, "created", 0);
      return { id };
    }
    const id = documentId(body.requestId, "Pedido"),
      r = await careRecord(tx, c, id);
    if (body.action === "detail") {
      const events = await tx.query(
        c.root,
        "pastoralAudit",
        "requestId",
        id,
        "EQUAL",
        51,
        undefined,
        { field: "at", direction: "DESCENDING" },
      );
      return {
        request: dto(r),
        history: events
          .slice(0, 50)
          .map((e) => ({ action: e.action, at: e.at, revision: e.revision })),
        partial: events.length > 50,
      };
    }
    if (body.action === "whatsapp-link") {
      const phone = whatsappPhone(r.phone);
      if (!phone)
        throw new AccountError(409, "Telefone indisponível neste pedido.");
      if (r.personId) {
        const [person] = await tx.read(
          c.root + "/people/" + documentId(r.personId, "Pessoa"),
        );
        if (
          person?.organizationId !== c.orgId ||
          person.status !== "active" ||
          person.communicationOptOut ||
          person.whatsappOptOutAt
        )
          throw new AccountError(409, "O cadastro não permite este contato.");
      }
      await assertWhatsappContactAllowed(tx, c.root, phone);
      const message = textField(body.message, "Mensagem", 2000);
      return { url: whatsappHref({ mobilePhone: phone }, message) };
    }
    if (body.revision !== (r.revision || 0))
      throw new AccountError(
        409,
        "Este pedido foi atualizado por outra pessoa. Atualize antes de salvar.",
      );
    const revision = (r.revision || 0) + 1,
      patch: Data = {
        revision,
        updatedAt: new Date().toISOString(),
        updatedByUserId: uid,
      };
    if (body.action === "link-person") {
      if (!c.staff)
        throw new AccountError(403, "Vinculação restrita à equipe pastoral.");
      if (r.personId || r.status === "resolved")
        throw new AccountError(
          409,
          "Somente pedidos abertos sem pessoa vinculada podem ser associados.",
        );
      const personId = documentId(body.personId, "Pessoa");
      const [person] = await tx.read(c.root + "/people/" + personId);
      if (person?.organizationId !== c.orgId || person.status !== "active")
        throw new AccountError(404, "Pessoa indisponível.");
      Object.assign(patch, {
        personId,
        personName: careName(person),
        assignedToUserId: null,
        ownerName: "",
        groupId: null,
        status: "open",
        stage: "triage",
      });
    } else if (body.action === "assign") {
      if (r.status === "resolved")
        throw new AccountError(409, "Reabra o pedido antes de encaminhar.");
      if (!c.staff)
        throw new AccountError(
          403,
          "Somente a equipe pastoral pode encaminhar.",
        );
      const ownerId = documentId(body.ownerId, "Responsável"),
        groupId = body.groupId ? documentId(body.groupId, "Célula") : null;
      const [owner] = await tx.read(c.root + "/users/" + ownerId);
      if (owner?.organizationId !== c.orgId || owner.isActive !== true)
        throw new AccountError(
          403,
          "Responsável inativo ou de outra instituição.",
        );
      if (
        !owner.roles?.some((s: string) => pastoralRoles.includes(s)) &&
        !(await leaderCanCare(tx, c, ownerId, r.personId, groupId))
      )
        throw new AccountError(
          403,
          "O líder precisa estar vinculado à mesma célula da pessoa.",
        );
      Object.assign(patch, {
        assignedToUserId: ownerId,
        ownerName: owner.displayName || "Equipe pastoral",
        groupId,
        dueAt: dueDate(body.dueAt),
        status: "in_progress",
        stage: "assigned",
        resolvedAt: null,
      });
    } else if (body.action === "triage") {
      if (!c.staff)
        throw new AccountError(403, "Triagem restrita à equipe pastoral.");
      if (!["normal", "important", "urgent"].includes(body.priority))
        throw new AccountError(400, "Prioridade inválida.");
      if (r.status === "resolved")
        throw new AccountError(409, "Reabra o pedido antes da triagem.");
      Object.assign(patch, {
        priority: body.priority,
        stage: r.assignedToUserId ? "assigned" : "triage",
        dueAt: dueDate(body.dueAt),
      });
    } else if (body.action === "resolve") {
      if (r.status === "resolved") return { ok: true, replayed: true };
      Object.assign(patch, {
        status: "resolved",
        stage: "resolved",
        resolvedAt: patch.updatedAt,
        respondedByUserId: uid,
        respondedAt: patch.updatedAt,
      });
    } else if (body.action === "reopen") {
      if (!c.staff)
        throw new AccountError(403, "Reabertura restrita à equipe pastoral.");
      Object.assign(patch, {
        status: "open",
        stage: "triage",
        resolvedAt: null,
        assignedToUserId: null,
        ownerName: "",
        groupId: null,
        dueAt: null,
      });
    } else if (body.action === "contact") {
      if (r.status === "resolved")
        throw new AccountError(409, "Pedido já concluído.");
      Object.assign(patch, {
        lastContactAt: patch.updatedAt,
        lastContactByUserId: uid,
      });
    } else throw new AccountError(400, "Operação de cuidado inválida.");
    tx.patch(c.root + "/prayerRequests/" + id, patch);
    audit(tx, c, id, body.action, revision);
    return { ok: true, revision };
  });
}
export async function careReplyInput(
  orgId: string,
  uid: string,
  requestId: string,
  profile?: string,
) {
  return accountTransaction(async (tx) => {
    const c = await careContext(tx, { organizationId: orgId, profile }, uid),
      r = await careRecord(tx, c, requestId);
    return {
      personName: "Pessoa acolhida",
      request: r.message,
      category: r.category || "Oração",
    };
  });
}

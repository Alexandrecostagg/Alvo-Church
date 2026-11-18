import { createHash } from "node:crypto";
import {
  attendanceSummary,
  currentGroupMeeting,
  groupWeek,
  isActiveGroupMembership,
  isCellGroup,
  isChurchStaff,
  homeProfiles,
  isGroupLeader,
} from "@alvo/domain";
import { planHasModule } from "@alvo/firebase";
import {
  accountTransaction,
  AccountError,
  type AccountTransaction,
} from "./member-account-store";
import { financeActor } from "./finance-operations";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";
import { boundPerson, journeyEnabled } from "./journey-operations";
import { servingInstant } from "../../../src/features/serving/serving-contract";
type Data = Record<string, any>;
const hash = (s: string) =>
  createHash("sha256").update(s).digest("hex").slice(0, 40);
const name = (p: Data) =>
  p.preferredName ||
  [p.firstName, p.lastName].filter(Boolean).join(" ") ||
  "Pessoa";
const text = (v: unknown, max: number, required = false) => {
  if (v != null && typeof v !== "string")
    throw new AccountError(400, "Texto inválido.");
  const s = String(v || "").trim();
  if (s.length > max || (required && !s))
    throw new AccountError(400, `Preencha o texto em até ${max} caracteres.`);
  return s;
};
async function context(tx: AccountTransaction, body: Data, uid: string) {
  const orgId = documentId(body.organizationId, "Instituição");
  const { root, org, actor } = await financeActor(tx, orgId, uid, false, null);
  await assertModuleEnabled(tx, root, "groups");
  const [sub] = await tx.read(`${root}/settings/subscription`);
  const plan =
    sub?.plan ||
    (
      {
        enterprise: "enterprise",
        advanced: "pastoral",
        growth: "comunidade",
      } as Data
    )[sub?.planTier] ||
    "free";
  if (!planHasModule(plan, "groups"))
    throw new AccountError(403, "Células não está disponível no plano.");
  if (
    body.profile !== undefined &&
    (!homeProfiles(actor.roles || []).includes(body.profile) ||
      !["pastoral", "administration", "cell_leader"].includes(body.profile))
  )
    throw new AccountError(
      403,
      "Perfil não autorizado para gestão de células.",
    );
  const staff =
    isChurchStaff(actor.roles || []) && body.profile !== "cell_leader";
  const personId = await boundPerson(tx, root, orgId, uid);
  return {
    root,
    orgId,
    actor,
    personId,
    staff,
    timezone: org.timezone || "America/Belem",
  };
}
type Context = Awaited<ReturnType<typeof context>>;
async function groupAccess(
  tx: AccountTransaction,
  c: Context,
  id: string,
  manage = true,
): Promise<Data> {
  const [g] = await tx.read(`${c.root}/groups/${id}`);
  if (g?.organizationId !== c.orgId || g.status !== "active")
    throw new AccountError(404, "Grupo indisponível ou arquivado.");
  if (!c.staff) {
    const [m] = c.personId
      ? await tx.read(`${c.root}/groups/${id}/members/${id}_${c.personId}`)
      : [null];
    if (
      !isActiveGroupMembership(m) ||
      m?.organizationId !== c.orgId ||
      m.personId !== c.personId ||
      m.groupId !== id ||
      (manage &&
        (!c.actor.roles?.includes("group_leader") || !isGroupLeader(m)))
    )
      throw new AccountError(
        403,
        "Você não possui vínculo ativo para esta operação.",
      );
  }
  return { ...g, id };
}
async function members(
  tx: AccountTransaction,
  c: Context,
  id: string,
): Promise<Data[]> {
  const all = await tx.query(
    `${c.root}/groups/${id}`,
    "members",
    undefined,
    undefined,
    "EQUAL",
    501,
  );
  if (all.length > 500)
    throw new AccountError(
      409,
      "Este grupo excede 500 vínculos. A secretaria deve revisar os registros antes de continuar.",
    );
  const active = all.filter(
    (m) =>
      m.organizationId === c.orgId &&
      m.groupId === id &&
      isActiveGroupMembership(m) &&
      typeof m.personId === "string",
  );
  const people = await tx.read(
    ...active.map(
      (m) => `${c.root}/people/${documentId(m.personId, "Pessoa")}`,
    ),
  );
  return active.flatMap((m, i) =>
    people[i]?.organizationId === c.orgId && people[i]?.status === "active"
      ? [{ ...m, name: name(people[i]!), person: people[i] }]
      : [],
  );
}
async function verifiedUser(
  tx: AccountTransaction,
  c: Context,
  personId: string,
): Promise<Data | null> {
  const [claim] = await tx.read(`${c.root}/memberAccountClaims/${personId}`);
  if (!claim?.userId) return null;
  if ((await boundPerson(tx, c.root, c.orgId, claim.userId)) !== personId)
    return null;
  const [u] = await tx.read(`${c.root}/users/${claim.userId}`);
  return u ? { ...u, id: claim.userId } : null;
}
function publicGroup(g: Data) {
  return {
    id: g.id,
    name: g.name,
    type: g.type || "cell",
    status: g.status,
    capacity: g.capacity ?? null,
    meetingDayOfWeek: g.meetingDayOfWeek ?? null,
    meetingTime: g.meetingTime || "",
    city: g.city || "",
    state: g.state || "",
    address: g.address || "",
    location: g.location || "",
    revision: g.revision || 0,
  };
}
export async function groupOperation(
  body: Data,
  uid: string,
  now = Date.now(),
): Promise<any> {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new AccountError(400, "Solicitação inválida.");
  return accountTransaction(async (tx) => {
    const c = await context(tx, body, uid),
      { root, orgId } = c,
      at = new Date(now).toISOString();
    if (body.action === "weekly-read" || body.action === "weekly-list") {
      const week = body.week || groupWeek(now, c.timezone);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || Number.isNaN(Date.parse(week)))
        throw new AccountError(400, "Semana inválida.");
      let allowedIds: string[] = [];
      const allGroups = await tx.query(
        root,
        "groups",
        "status",
        "active",
        "EQUAL",
        201,
      );
      if (allGroups.length > 200)
        throw new AccountError(
          409,
          "Consulta de temas limitada a 200 grupos. Procure a secretaria.",
        );
      if (c.staff)
        allowedIds = allGroups
          .filter((g) => g.organizationId === orgId && isCellGroup(g))
          .map((g) => g.id);
      else if (c.personId) {
        const links = await tx.read(
          ...allGroups.map(
            (g) => `${root}/groups/${g.id}/members/${g.id}_${c.personId}`,
          ),
        );
        allowedIds = allGroups
          .filter(
            (g, i) =>
              g.organizationId === orgId &&
              isCellGroup(g) &&
              isActiveGroupMembership(links[i]) &&
              links[i]?.personId === c.personId &&
              links[i]?.organizationId === orgId &&
              links[i]?.groupId === g.id,
          )
          .map((g) => g.id);
      }
      const id = body.groupId ? documentId(body.groupId, "Célula") : null;
      if (id && !allowedIds.includes(id))
        throw new AccountError(403, "Tema fora das suas células ativas.");
      const rows = await tx.query(
        root,
        "weeklyThemes",
        "weekStartDate",
        week,
        "EQUAL",
        201,
      );
      if (rows.length > 200)
        throw new AccountError(409, "Revise os temas duplicados desta semana.");
      const themes = rows
        .filter(
          (t) =>
            t.organizationId === orgId &&
            t.status !== "archived" &&
            (c.staff ||
              t.scope !== "specific" ||
              (t.groupIds || []).some((g: string) => allowedIds.includes(g))),
        )
        .sort(
          (a, b) =>
            String(b.updatedAt || b.createdAt || "").localeCompare(
              String(a.updatedAt || a.createdAt || ""),
            ) || a.id.localeCompare(b.id),
        );
      const project = (t: Data) => ({
        id: t.id,
        title: t.title,
        bibleVerse: t.bibleVerse || "",
        description: t.description || "",
        durationMinutes: t.durationMinutes ?? null,
        scope: t.scope,
        groupIds: t.groupIds || [],
        weekStartDate: t.weekStartDate,
        revision: t.revision || 0,
      });
      if (body.action === "weekly-list") {
        if (!c.staff)
          throw new AccountError(
            403,
            "Gestão de temas reservada à equipe da igreja.",
          );
        return {
          week,
          timezone: c.timezone,
          themes: themes.map(project),
          groups: allGroups
            .filter((g) => allowedIds.includes(g.id))
            .map(publicGroup),
        };
      }
      const chosen =
        (id
          ? themes.find(
              (t) => t.scope === "specific" && t.groupIds?.includes(id),
            )
          : undefined) ||
        themes.find((t) => t.scope === "open") ||
        themes.find((t) => t.scope === "all");
      return {
        theme: chosen ? project(chosen) : null,
        week,
        timezone: c.timezone,
        groups: allGroups
          .filter((g) => allowedIds.includes(g.id))
          .map((g) => ({ id: g.id, name: g.name })),
      };
    }
    if (!c.staff && !c.actor.roles?.includes("group_leader"))
      throw new AccountError(403, "Gestão disponível à liderança autorizada.");
    if (body.action === "overview") {
      const all = await tx.query(
        root,
        "groups",
        "status",
        "active",
        "EQUAL",
        201,
      );
      const candidates = all
        .slice(0, 200)
        .filter((g) => g.organizationId === orgId && g.status === "active");
      const visible: Data[] = [];
      for (const g of candidates) {
        try {
          await groupAccess(tx, c, g.id);
          visible.push(g);
        } catch (e) {
          if (!(e instanceof AccountError)) throw e;
        }
      }
      const rosters = await Promise.all(
        visible.map((g) => members(tx, c, g.id)),
      );
      const rows = c.staff
        ? await tx.query(root, "people", "status", "active", "EQUAL", 2001)
        : [];
      const people = rows
        .slice(0, 2000)
        .filter((p) => p.organizationId === orgId)
        .map((p) => ({
          id: p.id,
          name: name(p),
          memberStatus: p.memberStatus || "visitor",
        }));
      const cellIds = new Set(visible.filter(isCellGroup).map((g) => g.id));
      const cellMembers = rosters.flat().filter((m) => cellIds.has(m.groupId));
      return {
        canManage: c.staff,
        timezone: c.timezone,
        partial: all.length > 200 || rows.length > 2000,
        groups: visible.map((g, i) => ({
          ...publicGroup(g),
          memberCount: rosters[i].length,
          leaderPersonId:
            rosters[i].find((m) => m.roleInGroup === "leader")?.personId || "",
        })),
        people,
        withoutCell: people.filter(
          (p) => !cellMembers.some((m) => m.personId === p.id),
        ),
        stats: {
          cells: cellIds.size,
          people: new Set(cellMembers.map((m) => m.personId)).size,
          links: cellMembers.length,
          available: visible
            .filter((g) => cellIds.has(g.id) && g.capacity != null)
            .reduce(
              (n, g) =>
                n +
                Math.max(0, g.capacity - rosters[visible.indexOf(g)].length),
              0,
            ),
          unlimited: visible.filter(
            (g) => cellIds.has(g.id) && g.capacity == null,
          ).length,
        },
      };
    }
    if (body.action === "detail") {
      const id = documentId(body.groupId, "Grupo"),
        g = await groupAccess(tx, c, id),
        roster = await members(tx, c, id);
      const page =
        Number.isInteger(body.page) && body.page >= 0
          ? Math.min(body.page, 100)
          : 0;
      const all = await tx.query(
        `${root}/groups/${id}`,
        "meetings",
        undefined,
        undefined,
        "EQUAL",
        1001,
        undefined,
        { field: "scheduledStartAt", direction: "DESCENDING" },
      );
      const rows = all
        .slice(0, 1000)
        .filter((m) => m.organizationId === orgId && m.groupId === id);
      const requested = body.meetingId
        ? documentId(body.meetingId, "Encontro")
        : null;
      const [explicit] = requested
        ? await tx.read(`${root}/groups/${id}/meetings/${requested}`)
        : [null];
      if (
        requested &&
        (explicit?.organizationId !== orgId || explicit.groupId !== id)
      )
        throw new AccountError(404, "Encontro não encontrado.");
      const current: Data | undefined = requested
        ? { ...explicit, id: requested }
        : currentGroupMeeting(rows as any, now) ||
          [...rows]
            .reverse()
            .find(
              (m) =>
                m.meetingStatus === "scheduled" &&
                Date.parse(m.scheduledStartAt) > now,
            ) ||
          rows[0];
      const records = current
        ? await tx.query(
            `${root}/groups/${id}/meetings/${current.id}`,
            "attendance",
            undefined,
            undefined,
            "EQUAL",
            501,
          )
        : [];
      const valid = records
        .slice(0, 500)
        .filter(
          (a) =>
            a.organizationId === orgId &&
            a.groupId === id &&
            a.groupMeetingId === current?.id,
        );
      const expected =
        current?.expectedPersonIds || roster.map((m) => m.personId);
      const [report] = current
        ? await tx.read(
            `${root}/groups/${id}/meetings/${current.id}/reports/summary`,
          )
        : [null];
      return {
        group: publicGroup(g),
        timezone: c.timezone,
        partial: all.length > 1000 || records.length > 500,
        canManage: c.staff,
        page,
        hasMore: (page + 1) * 25 < rows.length,
        meetings: rows.slice(page * 25, page * 25 + 25).map((m) => ({
          id: m.id,
          startsAt: m.scheduledStartAt,
          status: m.meetingStatus,
          revision: m.revision || 0,
        })),
        meeting: current
          ? {
              id: current.id,
              startsAt: current.scheduledStartAt,
              status: current.meetingStatus,
              revision: current.revision || 0,
              legacyRoster: !current.expectedPersonIds,
            }
          : null,
        summary: attendanceSummary(valid as any, expected),
        report: report
          ? {
              text: report.text,
              revision: report.revision || 0,
              updatedAt: report.updatedAt,
            }
          : null,
        people: roster.map((m) => ({
          personId: m.personId,
          name: m.name,
          role: m.roleInGroup,
          status:
            valid.find((a) => a.personId === m.personId)?.attendanceStatus ||
            null,
        })),
        historicalRecords: valid.filter(
          (a) => !roster.some((m) => m.personId === a.personId),
        ).length,
        openOld: rows.filter(
          (m) =>
            m.meetingStatus === "scheduled" &&
            Date.parse(m.scheduledStartAt) < now - 3 * 3600000,
        ).length,
      };
    }
    const action = String(body.action);
    if (
      ![
        "save-group",
        "archive-group",
        "assign-member",
        "remove-member",
        "create-meeting",
        "attendance",
        "close-meeting",
        "save-report",
        "follow-up",
        "weekly-save",
        "weekly-delete",
      ].includes(action)
    )
      throw new AccountError(400, "Operação inválida.");
    if (
      [
        "save-group",
        "archive-group",
        "assign-member",
        "remove-member",
        "weekly-save",
        "weekly-delete",
      ].includes(action) &&
      !c.staff
    )
      throw new AccountError(
        403,
        "Esta alteração exige a equipe pastoral/administrativa.",
      );
    // Attendance from older app releases has no requestId; expectedStatus still guards conflicts.
    const requestId = body.requestId
      ? documentId(body.requestId, "Solicitação")
      : action === "attendance"
        ? hash(JSON.stringify(body) + uid + now)
        : documentId(body.requestId, "Solicitação");
    const opId = hash(uid + requestId),
      opPath = `${root}/groupOperations/${opId}`,
      fingerprint = hash(JSON.stringify(body));
    const [previous] = await tx.read(opPath);
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new AccountError(
          409,
          "Solicitação já usada para outro conteúdo.",
        );
      return { ...previous.result, replayed: true };
    }
    let result: Data = { ok: true },
      groupId = body.groupId
        ? documentId(body.groupId, "Grupo")
        : `group_${opId}`,
      notifyPeople: string[] = [],
      kind = "group";
    if (action.startsWith("weekly-")) {
      const id = body.id ? documentId(body.id, "Tema") : `theme_${opId}`,
        path = `${root}/weeklyThemes/${id}`,
        [old] = await tx.read(path);
      if (old && old.organizationId !== orgId)
        throw new AccountError(403, "Tema indisponível.");
      if (old && (old.revision || 0) !== body.expectedRevision)
        throw new AccountError(409, "Tema alterado. Atualize antes de salvar.");
      if (action === "weekly-delete") {
        if (!old) throw new AccountError(404, "Tema não encontrado.");
        tx.patch(path, {
          status: "archived",
          updatedAt: at,
          revision: (old.revision || 0) + 1,
        });
      } else {
        const week = text(body.week, 10, true);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(week) ||
          !Number.isFinite(Date.parse(week)) ||
          new Date(week + "T12:00Z").getUTCDay() !== 1
        )
          throw new AccountError(400, "Selecione a segunda-feira da semana.");
        if (!["all", "specific", "open"].includes(body.scope))
          throw new AccountError(400, "Destinatários inválidos.");
        const ids =
          body.scope === "specific" && Array.isArray(body.groupIds)
            ? [...new Set(body.groupIds as string[])]
            : [];
        if (body.scope === "specific" && !ids.length)
          throw new AccountError(400, "Selecione as células.");
        if (ids.length > 100)
          throw new AccountError(400, "Máximo de 100 células por tema.");
        for (const id of ids) {
          const g = await groupAccess(tx, c, documentId(id, "Célula"));
          if (!isCellGroup(g))
            throw new AccountError(
              400,
              "Temas são destinados a células e pequenos grupos.",
            );
        }
        const duration =
          body.durationMinutes === null ||
          body.durationMinutes === "" ||
          body.durationMinutes === undefined
            ? null
            : Number(body.durationMinutes);
        if (
          duration !== null &&
          (!Number.isInteger(duration) || duration < 5 || duration > 480)
        )
          throw new AccountError(400, "Duração entre 5 e 480 minutos.");
        const existing = await tx.query(
          root,
          "weeklyThemes",
          "weekStartDate",
          week,
          "EQUAL",
          201,
        );
        if (existing.length > 200)
          throw new AccountError(409, "Revise os temas desta semana.");
        if (
          existing.some(
            (t) =>
              t.id !== id &&
              t.status !== "archived" &&
              (body.scope === "specific"
                ? t.scope === "specific" &&
                  ids.some((g) => t.groupIds?.includes(g))
                : ["all", "open"].includes(t.scope)),
          )
        )
          throw new AccountError(
            409,
            "Já existe tema para estes destinatários nesta semana. Edite o tema existente.",
          );
        tx.set(path, {
          id,
          organizationId: orgId,
          title: text(body.title, 180, true),
          bibleVerse: text(body.bibleVerse, 240),
          description: text(body.description, 6000),
          durationMinutes: duration,
          scope: body.scope,
          groupIds: ids,
          weekStartDate: week,
          status: "active",
          createdAt: old?.createdAt || at,
          createdBy: old?.createdBy || uid,
          updatedAt: at,
          revision: (old?.revision || 0) + 1,
        });
      }
      result.id = id;
    } else if (action === "save-group") {
      const [old] = await tx.read(`${root}/groups/${groupId}`);
      if (old && (old.organizationId !== orgId || old.status !== "active"))
        throw new AccountError(409, "Grupo arquivado ou indisponível.");
      if (old && (old.revision || 0) !== body.expectedRevision)
        throw new AccountError(
          409,
          "Grupo alterado. Atualize antes de salvar.",
        );
      const type = body.type || "cell";
      if (!["cell", "small_group", "class", "youth_group"].includes(type))
        throw new AccountError(400, "Tipo de grupo inválido.");
      const capacity =
        body.capacity === null ||
        body.capacity === "" ||
        body.capacity === undefined
          ? null
          : Number(body.capacity);
      if (
        capacity !== null &&
        (!Number.isInteger(capacity) || capacity < 1 || capacity > 500)
      )
        throw new AccountError(
          400,
          "Capacidade deve ser entre 1 e 500, ou ficar em branco.",
        );
      const day = Number(body.meetingDayOfWeek);
      if (!Number.isInteger(day) || day < 0 || day > 6)
        throw new AccountError(400, "Dia inválido.");
      const time = text(body.meetingTime, 5);
      if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
        throw new AccountError(400, "Horário inválido.");
      const roster = old ? await members(tx, c, groupId) : [];
      const leaderId = body.leaderPersonId
        ? documentId(body.leaderPersonId, "Líder")
        : null;
      if (leaderId) {
        const u = await verifiedUser(tx, c, leaderId);
        if (
          !u ||
          (!isChurchStaff(u.roles || []) && !u.roles?.includes("group_leader"))
        )
          throw new AccountError(
            409,
            "O líder precisa de conta ativa vinculada e papel de líder de célula. Ajuste esse acesso em Pessoas/Configurações antes de selecioná-lo.",
          );
      }
      const count =
        roster.length +
        (leaderId && !roster.some((m) => m.personId === leaderId) ? 1 : 0);
      if (capacity !== null && capacity < count)
        throw new AccountError(
          409,
          "Capacidade menor que o número de participantes. Revise os vínculos primeiro.",
        );
      // Replace the primary leader atomically; co-leaders/supervisors are deliberately preserved.
      for (const m of roster.filter(
        (m) => m.roleInGroup === "leader" && m.personId !== leaderId,
      ))
        tx.patch(`${root}/groups/${groupId}/members/${m.id}`, {
          roleInGroup: "member",
          updatedAt: at,
        });
      if (leaderId) {
        const m = roster.find((m) => m.personId === leaderId);
        tx.set(`${root}/groups/${groupId}/members/${groupId}_${leaderId}`, {
          id: `${groupId}_${leaderId}`,
          organizationId: orgId,
          groupId,
          personId: leaderId,
          roleInGroup: "leader",
          status: "active",
          leftAt: null,
          joinedAt: m?.joinedAt || at,
        });
        notifyPeople.push(leaderId);
      }
      const data = {
        id: groupId,
        organizationId: orgId,
        name: text(body.name, 160, true),
        type,
        status: "active",
        visibility: "internal",
        capacity,
        meetingDayOfWeek: day,
        meetingTime: time,
        city: text(body.city, 100),
        state: text(body.state, 30),
        location: text(body.location, 160),
        address: text(body.address, 350),
        revision: (old?.revision || 0) + 1,
        updatedAt: at,
      };
      if (old) tx.patch(`${root}/groups/${groupId}`, data);
      else
        tx.set(`${root}/groups/${groupId}`, {
          ...data,
          createdAt: at,
          createdByUserId: uid,
        });
      result.id = groupId;
    } else {
      const g = await groupAccess(tx, c, groupId),
        roster = await members(tx, c, groupId);
      if (
        ["archive-group", "assign-member", "remove-member"].includes(action) &&
        (g.revision || 0) !== body.expectedRevision
      )
        throw new AccountError(
          409,
          "Grupo alterado. Atualize antes de continuar.",
        );
      if (action === "archive-group")
        tx.patch(`${root}/groups/${groupId}`, {
          status: "archived",
          updatedAt: at,
          revision: (g.revision || 0) + 1,
        });
      if (action === "assign-member" || action === "remove-member") {
        const pid = documentId(body.personId, "Pessoa"),
          [p] = await tx.read(`${root}/people/${pid}`);
        if (p?.organizationId !== orgId || p.status !== "active")
          throw new AccountError(404, "Pessoa indisponível.");
        const path = `${root}/groups/${groupId}/members/${groupId}_${pid}`,
          [m] = await tx.read(path);
        if (action === "remove-member") {
          if (!m) throw new AccountError(404, "Vínculo não encontrado.");
          tx.patch(path, {
            status: "inactive",
            leftAt: at,
            updatedByUserId: uid,
          });
        } else {
          if (isActiveGroupMembership(m))
            throw new AccountError(409, "Pessoa já vinculada.");
          if (g.capacity != null && roster.length >= g.capacity)
            throw new AccountError(
              409,
              "Capacidade atingida. Revise a capacidade ou os vínculos.",
            );
          tx.set(path, {
            id: `${groupId}_${pid}`,
            organizationId: orgId,
            groupId,
            personId: pid,
            roleInGroup: p.memberStatus === "visitor" ? "visitor" : "member",
            status: "active",
            leftAt: null,
            joinedAt: at,
          });
          notifyPeople.push(pid);
        }
        tx.patch(`${root}/groups/${groupId}`, {
          revision: (g.revision || 0) + 1,
          updatedAt: at,
        });
      }
      if (action === "create-meeting") {
        let startsAt: string;
        try {
          startsAt = servingInstant(body.date, body.time, c.timezone);
        } catch {
          throw new AccountError(
            400,
            "Confira a data e o horário no fuso da instituição.",
          );
        }
        if (
          Date.parse(startsAt) < now - 30 * 86400000 ||
          Date.parse(startsAt) > now + 365 * 86400000
        )
          throw new AccountError(
            400,
            "Agende entre os últimos 30 dias e os próximos 12 meses.",
          );
        const id = `meeting_${hash(groupId + startsAt)}`,
          path = `${root}/groups/${groupId}/meetings/${id}`;
        const [canonical] = await tx.read(path);
        const existing = await tx.query(
          `${root}/groups/${groupId}`,
          "meetings",
          "scheduledStartAt",
          startsAt,
          "EQUAL",
          10,
        );
        if (canonical && !existing.some((m) => m.id === id))
          existing.push({ ...canonical, id });
        const same = existing.find((m) => m.meetingStatus !== "cancelled");
        if (same) result = { id: same.id, replayed: true };
        else {
          tx.set(path, {
            id,
            organizationId: orgId,
            groupId,
            scheduledStartAt: startsAt,
            meetingStatus: "scheduled",
            expectedPersonIds: roster.map((m) => m.personId),
            revision: 0,
            createdAt: at,
            createdByUserId: uid,
          });
          result.id = id;
          notifyPeople = roster.map((m) => m.personId);
          kind = "meeting";
        }
      }
      if (["attendance", "close-meeting", "save-report"].includes(action)) {
        const mid = documentId(body.meetingId, "Encontro"),
          path = `${root}/groups/${groupId}/meetings/${mid}`,
          [m] = await tx.read(path);
        if (
          m?.organizationId !== orgId ||
          m.groupId !== groupId ||
          m.meetingStatus === "cancelled"
        )
          throw new AccountError(409, "Encontro indisponível.");
        if (action === "attendance") {
          if (
            Date.parse(m.scheduledStartAt) > now + 3 * 3600000 ||
            Date.parse(m.scheduledStartAt) < now - 90 * 86400000
          )
            throw new AccountError(
              409,
              "Chamada disponível entre 90 dias atrás e três horas antes do encontro.",
            );
          const pid = documentId(body.personId, "Pessoa");
          if (!roster.some((p) => p.personId === pid))
            throw new AccountError(
              403,
              "Pessoa sem vínculo ativo neste grupo.",
            );
          if (
            !["present", "absent", "justified", "first_time_guest"].includes(
              body.status,
            )
          )
            throw new AccountError(400, "Presença inválida.");
          const ap = `${path}/attendance/${mid}_${pid}`,
            [a] = await tx.read(ap);
          if (a?.attendanceStatus === body.status) result.replayed = true;
          else {
            if ((a?.attendanceStatus || null) !== body.expectedStatus)
              throw new AccountError(
                409,
                "Presença alterada. Atualize antes de salvar.",
              );
            tx.set(ap, {
              id: `${mid}_${pid}`,
              organizationId: orgId,
              groupId,
              groupMeetingId: mid,
              personId: pid,
              attendanceStatus: body.status,
              recordedByUserId: uid,
              recordedAt: at,
            });
          }
        }
        if (action === "close-meeting") {
          if (
            m.meetingStatus !== "scheduled" ||
            (m.revision || 0) !== body.expectedRevision
          )
            throw new AccountError(409, "Encontro alterado ou já encerrado.");
          if (Date.parse(m.scheduledStartAt) > now)
            throw new AccountError(
              409,
              "Não é possível encerrar um encontro futuro.",
            );
          tx.patch(path, {
            meetingStatus: "completed",
            revision: (m.revision || 0) + 1,
            completedAt: at,
            updatedByUserId: uid,
          });
        }
        if (action === "save-report") {
          const rp = `${path}/reports/summary`,
            [old] = await tx.read(rp);
          if ((old?.revision || 0) !== body.expectedRevision)
            throw new AccountError(
              409,
              "Relatório alterado. Atualize antes de salvar.",
            );
          tx.set(rp, {
            organizationId: orgId,
            groupId,
            meetingId: mid,
            text: text(body.text, 12000, true),
            revision: (old?.revision || 0) + 1,
            updatedAt: at,
            updatedByUserId: uid,
          });
        }
      }
      if (action === "follow-up") {
        await journeyEnabled(tx, root);
        const pid = documentId(body.personId, "Pessoa");
        if (!roster.some((p) => p.personId === pid))
          throw new AccountError(403, "Pessoa sem vínculo ativo.");
        const assignee = body.assignedToUserId
          ? documentId(body.assignedToUserId, "Responsável")
          : uid;
        const ac = await context(tx, { organizationId: orgId }, assignee);
        await groupAccess(tx, ac, groupId);
        const due = text(body.dueAt, 40, true);
        if (!Number.isFinite(Date.parse(due)))
          throw new AccountError(400, "Prazo inválido.");
        const open = await tx.query(
          root,
          "followUpTasks",
          "personId",
          pid,
          "EQUAL",
          1001,
        );
        if (open.length > 1000)
          throw new AccountError(409, "Revise o histórico da pessoa.");
        if (
          open.some(
            (t) =>
              t.groupId === groupId &&
              t.assignedToUserId === assignee &&
              ["open", "in_progress"].includes(t.status),
          )
        )
          throw new AccountError(
            409,
            "Já existe acompanhamento pendente para esta pessoa neste grupo.",
          );
        const id = `group_${opId}`;
        tx.set(`${root}/followUpTasks/${id}`, {
          id,
          organizationId: orgId,
          personId: pid,
          groupId,
          assignedToUserId: assignee,
          type: "pastoral_contact",
          title: "Acompanhamento da célula",
          status: "open",
          dueAt: new Date(due).toISOString(),
          createdAt: at,
          revision: 0,
        });
        const noticeId = `group_${opId}`;
        tx.set(`${root}/journeyNotices/${noticeId}`, {
          id: noticeId,
          organizationId: orgId,
          personId: pid,
          recipientUserId: assignee,
          kind: "task",
          taskId: id,
          createdAt: at,
          pushStatus: "pending",
        });
        result.journeyNoticeIds = [noticeId];
      }
    }
    // One durable notice per operation, no personal/pastoral details in push payload.
    if (notifyPeople.length) {
      const recipients = await Promise.all(
        [...new Set(notifyPeople)].map((p) => verifiedUser(tx, c, p)),
      );
      const ids = recipients.filter(Boolean).map((u) => u!.id);
      if (ids.length) {
        tx.set(`${root}/groupNotices/${opId}`, {
          organizationId: orgId,
          groupId,
          recipientIds: ids,
          kind,
          createdAt: at,
          pushStatus: "pending",
        });
        result.noticeId = opId;
      }
    }
    tx.set(`${root}/groupAudit/${opId}`, {
      organizationId: orgId,
      groupId: action.startsWith("weekly-") ? null : groupId,
      action,
      actorUserId: uid,
      at,
    });
    tx.set(opPath, { fingerprint, result, at });
    return result;
  });
}

/** Claims a single provider attempt. Ticket acceptance is not a delivery receipt. */
export async function dispatchGroupNotice(
  orgId: string,
  id: string,
  transport: typeof fetch = fetch,
) {
  const { isLocalQaFirebase } = await import("./firebase-server-env");
  const root = `organizations/${documentId(orgId, "Instituição")}`,
    path = `${root}/groupNotices/${documentId(id, "Aviso")}`;
  const attempt = await accountTransaction(async (tx) => {
    const [n] = await tx.read(path);
    const [g, org] = await tx.read(
      `${root}/groups/${n?.groupId || "missing"}`,
      root,
    );
    if (!n || n.organizationId !== orgId || n.pushStatus !== "pending")
      return null;
    if (
      g?.organizationId !== orgId ||
      g.status !== "active" ||
      org?.status !== "active"
    ) {
      tx.patch(path, { pushStatus: "unavailable" });
      return null;
    }
    if (isLocalQaFirebase() && transport === fetch) {
      tx.patch(path, { pushStatus: "test_mode" });
      return null;
    }
    const tokens: string[] = [];
    for (const uid of n.recipientIds || []) {
      try {
        const c = await context(tx, { organizationId: orgId }, uid);
        if (!c.personId) continue;
        const [m] = await tx.read(
          `${root}/groups/${n.groupId}/members/${n.groupId}_${c.personId}`,
        );
        if (
          !isActiveGroupMembership(m) ||
          m?.personId !== c.personId ||
          m.organizationId !== orgId ||
          m.groupId !== n.groupId
        )
          continue;
        if (
          /^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(
            c.actor.expoPushToken || "",
          )
        )
          tokens.push(c.actor.expoPushToken);
      } catch {}
    }
    if (!tokens.length) {
      tx.patch(path, { pushStatus: "no_device" });
      return null;
    }
    tx.patch(path, {
      pushStatus: "sending",
      attemptedAt: new Date().toISOString(),
    });
    return { tokens: [...new Set(tokens)], groupId: n.groupId };
  });
  if (!attempt) return;
  let status = "accepted";
  let accepted = 0;
  for (let i = 0; i < attempt.tokens.length; i += 100) {
    try {
      const r = await transport("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN
            ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
            : {}),
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify(
          attempt.tokens.slice(i, i + 100).map((to) => ({
            to,
            title: "Atualização da sua célula",
            body: "Abra o Esdras para conferir os detalhes.",
            sound: "default",
            data: {
              type: "group_update",
              organizationId: orgId,
              groupId: attempt.groupId,
            },
          })),
        ),
      });
      const b = await r.json();
      const rows = Array.isArray(b.data) ? b.data : [];
      accepted += rows.filter((t: Data) => t.status === "ok").length;
      if (
        !r.ok ||
        rows.some((t: Data) => t.status !== "ok") ||
        rows.length !== attempt.tokens.slice(i, i + 100).length
      )
        status = "partial_or_failed";
    } catch {
      status = "uncertain";
    }
  }
  await accountTransaction(async (tx) => {
    const [n] = await tx.read(path);
    if (n?.pushStatus === "sending")
      tx.patch(path, {
        pushStatus: status,
        accepted,
        attempted: attempt.tokens.length,
      });
  });
}

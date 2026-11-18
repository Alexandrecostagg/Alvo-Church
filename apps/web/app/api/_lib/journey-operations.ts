import { isCellGroup, isActiveGroupMembership } from "@alvo/domain";
import { createHash } from "node:crypto";
import {
  CARE_TASKS,
  INTEGRATION_STAGES,
  INTEGRATION_LABELS,
  hasCompletedContact,
  isCarePending,
  isChurchStaff,
  type IntegrationPerson,
  type IntegrationSnapshot,
  type IntegrationSummary,
  type IntegrationStage,
  type PersonalIntegration,
} from "@alvo/domain";
import { planHasModule } from "@alvo/firebase";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { documentId } from "./member-account";
import { financeActor, textField } from "./finance-operations";
import { assertModuleEnabled } from "./module-access";

type Data = Record<string, any>;
const validId = (id: unknown): id is string =>
  typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);
const fullName = (p: Data) =>
  String(
    p.preferredName ||
      [p.firstName, p.lastName].filter(Boolean).join(" ") ||
      "Pessoa",
  );
const member = (p: Data) =>
  ["member", "leader", "volunteer"].includes(p.memberStatus);
const stage = (j?: Data): IntegrationStage | null =>
  j && INTEGRATION_STAGES.includes(j.currentStage) ? j.currentStage : null;
export function currentIntegration(rows: Data[]) {
  return rows
    .filter((j) => j.status !== "archived")
    .sort(
      (a, b) =>
        Number(b.status === "active") - Number(a.status === "active") ||
        String(b.firstVisitDate || b.createdAt || "").localeCompare(
          String(a.firstVisitDate || a.createdAt || ""),
        ) ||
        a.id.localeCompare(b.id),
    )[0];
}
export async function journeyEnabled(tx: AccountTransaction, root: string) {
  await assertModuleEnabled(tx, root, "journeys");
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
  if (sub && !planHasModule(plan, "journeys"))
    throw new AccountError(
      403,
      "Jornadas não está incluído no plano desta instituição.",
    );
}
export async function boundPerson(
  tx: AccountTransaction,
  root: string,
  orgId: string,
  uid: string,
) {
  const [u, l] = await tx.read(
    `${root}/users/${uid}`,
    `${root}/memberAccountLinks/${uid}`,
  );
  if (
    u?.organizationId !== orgId ||
    !u.isActive ||
    !l?.verifiedBy ||
    l.organizationId !== orgId ||
    l.userId !== uid ||
    u.personId !== l.personId ||
    !validId(l.personId)
  )
    return null;
  const [p, c] = await tx.read(
    `${root}/people/${l.personId}`,
    `${root}/memberAccountClaims/${l.personId}`,
  );
  return p?.organizationId === orgId &&
    p.status === "active" &&
    c?.organizationId === orgId &&
    c.userId === uid &&
    c.personId === l.personId
    ? (l.personId as string)
    : null;
}
async function cellData(tx: AccountTransaction, root: string, orgId: string) {
  const [features] = await tx.read(`${root}/settings/features`);
  if (features?.modules?.groups?.enabled === false)
    return { cells: [] as Data[], memberships: [] as Data[], partial: false };
  const all = await tx.query(root, "groups", "status", "active", "EQUAL", 201);
  const cells = all
    .slice(0, 200)
    .filter((g) => g.organizationId === orgId && isCellGroup(g));
  const rows = await Promise.all(
    cells.map((g) =>
      tx.query(
        `${root}/groups/${g.id}`,
        "members",
        undefined,
        undefined,
        "EQUAL",
        2001,
      ),
    ),
  );
  return {
    cells,
    memberships: rows.flatMap((r, i) =>
      r
        .slice(0, 2000)
        .filter(
          (m) =>
            m.organizationId === orgId &&
            m.groupId === cells[i].id &&
            isActiveGroupMembership(m),
        ),
    ),
    partial: all.length > 200 || rows.some((r) => r.length > 2000),
  };
}
async function context(tx: AccountTransaction, body: Data, uid: string) {
  const orgId = documentId(body.organizationId, "Instituição");
  const { root, org, actor } = await financeActor(tx, orgId, uid, false, null);
  await journeyEnabled(tx, root);
  const staff =
    isChurchStaff(actor.roles || []) && body.profile !== "cell_leader";
  if (!staff && !actor.roles?.includes("group_leader"))
    throw new AccountError(
      403,
      "Acompanhamento disponível apenas à liderança autorizada.",
    );
  const cd = await cellData(tx, root, orgId);
  const personId = await boundPerson(tx, root, orgId, uid);
  const led = new Set(
    cd.memberships
      .filter(
        (m) =>
          m.personId === personId &&
          ["leader", "co_leader", "supervisor"].includes(m.roleInGroup),
      )
      .map((m) => m.groupId),
  );
  const scope = new Set(
    cd.memberships.filter((m) => led.has(m.groupId)).map((m) => m.personId),
  );
  return { root, orgId, org, actor, staff, scope, ...cd };
}
function scoped(c: Awaited<ReturnType<typeof context>>, personId: string) {
  if (!c.staff && !c.scope.has(personId))
    throw new AccountError(
      403,
      "Esta pessoa não pertence às células sob sua responsabilidade.",
    );
}
export async function personalIntegration(
  tx: AccountTransaction,
  root: string,
  orgId: string,
  personId: string,
): Promise<PersonalIntegration> {
  const [person] = await tx.read(`${root}/people/${personId}`);
  const rows = await tx.query(
    root,
    "visitorJourneys",
    "personId",
    personId,
    "EQUAL",
    101,
  );
  if (rows.length > 100)
    throw new AccountError(
      409,
      "Há muitos registros de integração. Procure a secretaria.",
    );
  const current = currentIntegration(
    rows.filter((j) => j.organizationId === orgId),
  );
  const [features] = await tx.read(`${root}/settings/features`);
  const all =
    features?.modules?.groups?.enabled === false
      ? []
      : await tx.query(root, "groups", "status", "active", "EQUAL", 201);
  if (all.length > 200)
    throw new AccountError(
      409,
      "Consulte a secretaria para revisar suas células.",
    );
  const cells = all.filter((g) => g.organizationId === orgId && isCellGroup(g));
  const links = await tx.read(
    ...cells.map((g) => `${root}/groups/${g.id}/members/${g.id}_${personId}`),
  );
  const own = cells.filter(
    (g, i) =>
      links[i]?.organizationId === orgId &&
      links[i]?.personId === personId &&
      links[i]?.groupId === g.id &&
      isActiveGroupMembership(links[i]),
  );
  return {
    stage: stage(current),
    label: stage(current)
      ? INTEGRATION_LABELS[stage(current)!]
      : "Integração ainda não iniciada",
    cells: own.map((g) => ({ id: g.id, name: g.name })),
    updatedAt: person?.integrationUpdatedAt || current?.updatedAt || null,
    notice: person?.integrationUpdatedAt
      ? "A liderança atualizou sua integração. Confira sua etapa e sua célula."
      : null,
  };
}
function summarize(
  people: IntegrationPerson[],
  history: Data[],
  partial: boolean,
  now: number,
): IntegrationSummary {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7) - 49);
  const weeks = Array.from({ length: 8 }, (_, i) => ({
    date: new Date(start.getTime() + i * 604800000).toISOString().slice(0, 10),
    transitions: 0,
    completed: 0,
  }));
  for (const h of history) {
    const week = [...weeks]
      .reverse()
      .find((w) => w.date <= String(h.at).slice(0, 10));
    if (week && h.action === "stage") {
      week.transitions++;
      if (h.to === "completed") week.completed++;
    }
  }
  return {
    total: people.length,
    needsContact: people.filter((p) => p.needsContact).length,
    withoutCell: people.filter((p) => !p.cells.length).length,
    ready: people.filter(
      (p) => p.stage === "ready_for_membership" && !member(p),
    ).length,
    pending: people.reduce((n, p) => n + p.openTasks, 0),
    stages: [
      ...INTEGRATION_STAGES.map((key) => ({
        key,
        label: INTEGRATION_LABELS[key],
        value: people.filter((p) => p.stage === key).length,
      })),
      {
        key: "none",
        label: "Sem jornada iniciada",
        value: people.filter((p) => !p.stage).length,
      },
    ],
    weeks,
    historySince: history.map((h) => h.at).sort()[0] || null,
    partial,
  };
}
export async function journeyOperation(
  body: Data,
  uid: string,
  now = Date.now(),
): Promise<any> {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new AccountError(400, "Solicitação inválida.");
  return accountTransaction(async (tx) => {
    const c = await context(tx, body, uid),
      { root, orgId } = c;
    if (["overview", "summary"].includes(body.action)) {
      const [persons, journeys, tasks, users, history] = await Promise.all([
        tx.query(root, "people", "status", "active", "EQUAL", 2001),
        tx.query(root, "visitorJourneys", undefined, undefined, "EQUAL", 4001),
        tx.query(root, "followUpTasks", undefined, undefined, "EQUAL", 5001),
        c.staff
          ? tx.query(root, "users", "isActive", true, "EQUAL", 2001)
          : Promise.resolve([]),
        tx.query(
          root,
          "journeyHistory",
          "at",
          new Date(now - 56 * 86400000).toISOString(),
          "GREATER_THAN_OR_EQUAL",
          2001,
        ),
      ]);
      const partial =
        c.partial ||
        persons.length > 2000 ||
        journeys.length > 4000 ||
        tasks.length > 5000 ||
        users.length > 2000 ||
        history.length > 2000;
      const people: IntegrationPerson[] = persons
        .slice(0, 2000)
        .filter(
          (p) => p.organizationId === orgId && (c.staff || c.scope.has(p.id)),
        )
        .map((p) => {
          const j = currentIntegration(
            journeys.filter(
              (j) => j.organizationId === orgId && j.personId === p.id,
            ),
          );
          const care = tasks.filter(
            (t) =>
              t.organizationId === orgId &&
              t.personId === p.id &&
              (c.staff || t.assignedToUserId === uid),
          );
          return {
            id: p.id,
            name: fullName(p),
            memberStatus: p.memberStatus || "visitor",
            phone:
              c.staff && !p.communicationOptOut && !p.whatsappOptOutAt
                ? p.whatsappPhone || p.mobilePhone || ""
                : "",
            email: c.staff ? p.email || "" : "",
            stage: stage(j),
            journeyId: j?.id || null,
            revision: p.integrationRevision || 0,
            cells: c.cells
              .filter((g) =>
                c.memberships.some(
                  (m) => m.groupId === g.id && m.personId === p.id,
                ),
              )
              .map((g) => ({ id: g.id, name: g.name })),
            tasks: care.map((t) => ({
              id: t.id,
              personId: p.id,
              title: t.title,
              type: t.type,
              status: t.status,
              dueAt: t.dueAt,
              assignedToUserId: t.assignedToUserId,
              revision: t.revision || 0,
            })),
            needsContact:
              (p.memberStatus || "visitor") === "visitor" &&
              !hasCompletedContact(
                tasks.filter(
                  (t) => t.organizationId === orgId && t.personId === p.id,
                ) as any,
              ),
            overdue: care.some(
              (t) => isCarePending(t) && Date.parse(t.dueAt) < now,
            ),
            openTasks: care.filter(isCarePending).length,
          };
        });
      const summary = summarize(
        people,
        history
          .slice(0, 2000)
          .filter(
            (h) =>
              h.organizationId === orgId &&
              (c.staff || c.scope.has(h.personId)),
          ),
        partial,
        now,
      );
      if (body.action === "summary") return summary;
      const q = String(body.query || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .slice(0, 100);
      const filter = String(body.filter || "all");
      const filtered = people
        .filter(
          (p) =>
            [p.name, p.email, p.phone]
              .join(" ")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .includes(q) &&
            (filter === "contact"
              ? p.needsContact
              : filter === "cell"
                ? !p.cells.length
                : filter === "ready"
                  ? p.stage === "ready_for_membership" && !member(p)
                  : filter === "tasks"
                    ? p.openTasks > 0
                    : true),
        )
        .sort(
          (a, b) =>
            Number(b.overdue) - Number(a.overdue) ||
            Number(b.needsContact) - Number(a.needsContact) ||
            a.name.localeCompare(b.name) ||
            a.id.localeCompare(b.id),
        );
      const page =
        Number.isInteger(body.page) && body.page >= 0
          ? Math.min(body.page, 100)
          : 0;
      return {
        people: filtered.slice(page * 40, page * 40 + 40),
        totalFiltered: filtered.length,
        page,
        hasMore: (page + 1) * 40 < filtered.length,
        summary,
        partial,
        canManage: c.staff,
        timezone: c.org.timezone || "America/Belem",
        cells: c.cells.map((g) => ({ id: g.id, name: g.name })),
        assignees: users
          .filter(
            (u) =>
              u.organizationId === orgId &&
              (isChurchStaff(u.roles || []) ||
                u.roles?.includes("group_leader")),
          )
          .map((u) => ({
            id: u.id,
            name: u.displayName || u.email || "Líder",
          })),
      } satisfies IntegrationSnapshot;
    }
    if (
      ![
        "stage",
        "member-status",
        "assign-cell",
        "create-task",
        "task-status",
      ].includes(body.action)
    )
      throw new AccountError(400, "Operação inválida.");
    const personId = documentId(body.personId, "Pessoa");
    scoped(c, personId);
    if (!c.staff && body.action !== "task-status")
      throw new AccountError(
        403,
        "Esta decisão exige a equipe pastoral ou administrativa.",
      );
    const requestId = documentId(body.requestId, "Solicitação"),
      requestPath = `${root}/journeyOperations/${uid}_${requestId}`;
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(body))
      .digest("hex");
    const [person, previous] = await tx.read(
      `${root}/people/${personId}`,
      requestPath,
    );
    if (person?.organizationId !== orgId || person.status !== "active")
      throw new AccountError(404, "Pessoa indisponível.");
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new AccountError(
          409,
          "Solicitação já utilizada. Atualize a página.",
        );
      return { ...previous.result, replayed: true };
    }
    if (
      body.action !== "task-status" &&
      body.expectedRevision !== (person.integrationRevision || 0)
    )
      throw new AccountError(
        409,
        "Este cadastro mudou. Atualize antes de continuar.",
      );
    const rows = await tx.query(
      root,
      "visitorJourneys",
      "personId",
      personId,
      "EQUAL",
      101,
    );
    if (rows.length > 100)
      throw new AccountError(
        409,
        "Revise as jornadas desta pessoa antes de continuar.",
      );
    const journeys = rows.filter((j) => j.organizationId === orgId),
      j = currentIntegration(journeys);
    const at = new Date(now).toISOString(),
      id = `j_${requestId}`;
    let recipient: string | null = null,
      eventAction = String(body.action),
      from: string | null = null,
      to: string | null = null;
    if (body.action === "stage") {
      const next = body.stage as IntegrationStage;
      if (
        !INTEGRATION_STAGES.includes(next) ||
        (next === "completed" && !member(person))
      )
        throw new AccountError(
          400,
          "Confirme a membresia antes de concluir a integração.",
        );
      const rank = j ? INTEGRATION_STAGES.indexOf(j.currentStage) : -1;
      if (INTEGRATION_STAGES.indexOf(next) !== rank + 1)
        throw new AccountError(
          409,
          "Avance uma etapa por vez e confirme o que foi realizado.",
        );
      if (next === "welcomed") {
        const care = await tx.query(
          root,
          "followUpTasks",
          "personId",
          personId,
          "EQUAL",
          1001,
        );
        if (
          care.length > 1000 ||
          !hasCompletedContact(
            care.filter((t) => t.organizationId === orgId) as any,
          )
        )
          throw new AccountError(
            409,
            "Conclua o registro do primeiro contato antes de avançar.",
          );
      }
      from = stage(j);
      to = next;
      const patch = {
        currentStage: next,
        status: next === "completed" ? "completed" : "active",
        updatedAt: at,
        updatedByUserId: uid,
      };
      if (j) tx.patch(`${root}/visitorJourneys/${j.id}`, patch);
      else
        tx.set(`${root}/visitorJourneys/${id}`, {
          ...patch,
          id,
          organizationId: orgId,
          personId,
          originChannel: "secretary",
          firstVisitDate: at,
          createdAt: at,
        });
    }
    if (body.action === "member-status") {
      if (
        ![
          "visitor",
          "congregant",
          "new_believer",
          "member",
          "leader",
          "volunteer",
        ].includes(body.memberStatus)
      )
        throw new AccountError(400, "Situação inválida.");
      if (body.memberStatus === person.memberStatus)
        throw new AccountError(409, "Esta já é a situação atual.");
      tx.patch(`${root}/people/${personId}`, {
        memberStatus: body.memberStatus,
        memberStatusUpdatedAt: at,
        memberStatusUpdatedByUserId: uid,
      });
      from = person.memberStatus;
      to = body.memberStatus;
      if (member({ memberStatus: body.memberStatus })) {
        for (const row of journeys.filter((r) => r.status === "active"))
          tx.patch(`${root}/visitorJourneys/${row.id}`, {
            currentStage: "completed",
            status: "completed",
            updatedAt: at,
            updatedByUserId: uid,
          });
        // A deliberate membership decision is recorded even when no prior journey exists.
        if (
          !journeys.some((r) => r.status === "active") &&
          stage(j) !== "completed"
        )
          tx.set(`${root}/visitorJourneys/${id}`, {
            id,
            organizationId: orgId,
            personId,
            currentStage: "completed",
            status: "completed",
            originChannel: "secretary",
            firstVisitDate: at,
            createdAt: at,
            updatedAt: at,
          });
        eventAction = "stage";
        from = stage(j);
        to = "completed";
      }
    }
    if (body.action === "assign-cell") {
      await assertModuleEnabled(tx, root, "groups");
      const groupId = documentId(body.groupId, "Célula"),
        g = c.cells.find((g) => g.id === groupId);
      if (!g) throw new AccountError(409, "Escolha uma célula ativa.");
      const path = `${root}/groups/${groupId}/members/${groupId}_${personId}`,
        [existing] = await tx.read(path);
      if (isActiveGroupMembership(existing))
        throw new AccountError(
          409,
          "A pessoa já está vinculada a esta célula.",
        );
      const [currentGroup] = await tx.read(`${root}/groups/${groupId}`);
      if (currentGroup?.status !== "active")
        throw new AccountError(409, "Célula indisponível.");
      const links = await tx.query(
        `${root}/groups/${groupId}`,
        "members",
        undefined,
        undefined,
        "EQUAL",
        501,
      );
      if (links.length > 500)
        throw new AccountError(
          409,
          "Revise os vínculos desta célula antes de continuar.",
        );
      const activeLinks = links.filter(
        (m) =>
          m.organizationId === orgId &&
          m.groupId === groupId &&
          isActiveGroupMembership(m),
      );
      const linkedPeople = await tx.read(
        ...activeLinks.map(
          (m) => `${root}/people/${documentId(m.personId, "Pessoa")}`,
        ),
      );
      const size = linkedPeople.filter(
        (p) => p?.organizationId === orgId && p.status === "active",
      ).length;
      if (currentGroup.capacity != null && size >= currentGroup.capacity)
        throw new AccountError(
          409,
          "Capacidade da célula atingida. Revise os vínculos ou a capacidade.",
        );
      tx.patch(`${root}/groups/${groupId}`, {
        revision: (currentGroup.revision || 0) + 1,
        updatedAt: at,
      });
      tx.set(path, {
        id: `${groupId}_${personId}`,
        organizationId: orgId,
        groupId,
        personId,
        roleInGroup: person.memberStatus === "visitor" ? "visitor" : "member",
        joinedAt: at,
        assignedByUserId: uid,
      });
      to = groupId;
    }
    if (body.action === "create-task") {
      if (!Object.hasOwn(CARE_TASKS, body.type))
        throw new AccountError(400, "Tipo de acompanhamento inválido.");
      const assignedToUserId = documentId(body.assignedToUserId, "Responsável");
      const [assignee] = await tx.read(`${root}/users/${assignedToUserId}`);
      if (assignee?.organizationId !== orgId || !assignee.isActive)
        throw new AccountError(409, "Responsável indisponível.");
      if (!isChurchStaff(assignee.roles || [])) {
        const bound = await boundPerson(tx, root, orgId, assignedToUserId);
        const groups = c.memberships.filter(
          (m) =>
            m.personId === bound &&
            ["leader", "co_leader", "supervisor"].includes(m.roleInGroup),
        );
        if (
          !assignee.roles?.includes("group_leader") ||
          !groups.some((g) =>
            c.memberships.some(
              (m) => m.groupId === g.groupId && m.personId === personId,
            ),
          )
        )
          throw new AccountError(
            403,
            "O líder deve ser responsável por uma célula desta pessoa.",
          );
      }
      const dueAt = textField(body.dueAt, "Prazo", 40);
      if (!Number.isFinite(Date.parse(dueAt)))
        throw new AccountError(400, "Informe um prazo válido.");
      const open = await tx.query(
        root,
        "followUpTasks",
        "personId",
        personId,
        "EQUAL",
        1001,
      );
      if (open.length > 1000)
        throw new AccountError(409, "Revise o histórico desta pessoa.");
      if (
        open.some(
          (t) =>
            isCarePending(t) &&
            t.type === body.type &&
            t.assignedToUserId === assignedToUserId,
        )
      )
        throw new AccountError(
          409,
          "Já existe uma tarefa deste tipo para esse responsável.",
        );
      tx.set(`${root}/followUpTasks/${id}`, {
        id,
        organizationId: orgId,
        personId,
        visitorJourneyId: j?.id || "",
        assignedToUserId,
        title: CARE_TASKS[body.type as keyof typeof CARE_TASKS],
        type: body.type,
        status: "open",
        dueAt: new Date(dueAt).toISOString(),
        createdAt: at,
        revision: 0,
      });
      recipient = assignedToUserId;
      to = "open";
    }
    if (body.action === "task-status") {
      const taskId = documentId(body.taskId, "Tarefa"),
        [task] = await tx.read(`${root}/followUpTasks/${taskId}`);
      if (
        task?.organizationId !== orgId ||
        task.personId !== personId ||
        (!c.staff && task.assignedToUserId !== uid)
      )
        throw new AccountError(
          403,
          "Acompanhamento não disponível para esta conta.",
        );
      if (body.expectedTaskRevision !== (task.revision || 0))
        throw new AccountError(
          409,
          "A tarefa foi alterada. Atualize antes de continuar.",
        );
      if (
        !isCarePending(task) ||
        !["in_progress", "completed", "cancelled"].includes(body.status) ||
        task.status === body.status
      )
        throw new AccountError(
          409,
          "Esta transição de tarefa não está disponível.",
        );
      if (!c.staff && body.status === "cancelled")
        throw new AccountError(
          403,
          "Cancelamento reservado à equipe pastoral.",
        );
      tx.patch(`${root}/followUpTasks/${taskId}`, {
        status: body.status,
        revision: (task.revision || 0) + 1,
        updatedAt: at,
        updatedByUserId: uid,
        ...(body.status === "completed"
          ? { completedAt: at, completedByUserId: uid }
          : {}),
      });
      from = task.status;
      to = body.status;
    }
    if (["stage", "member-status", "assign-cell"].includes(body.action)) {
      const [claim] = await tx.read(`${root}/memberAccountClaims/${personId}`);
      if (
        validId(claim?.userId) &&
        (await boundPerson(tx, root, orgId, claim!.userId)) === personId
      )
        recipient = claim!.userId;
    }
    const noticeIds: string[] = [];
    if (recipient) {
      const noticeId = `${uid}_${requestId}`;
      noticeIds.push(noticeId);
      tx.set(`${root}/journeyNotices/${noticeId}`, {
        id: noticeId,
        organizationId: orgId,
        personId,
        recipientUserId: recipient,
        kind: body.action === "create-task" ? "task" : "progress",
        taskId: body.action === "create-task" ? id : null,
        createdAt: at,
        pushStatus: "pending",
      });
    }
    tx.patch(`${root}/people/${personId}`, {
      integrationRevision: (person.integrationRevision || 0) + 1,
      ...(["stage", "member-status", "assign-cell"].includes(body.action)
        ? { integrationUpdatedAt: at }
        : {}),
    });
    tx.set(`${root}/journeyHistory/${uid}_${requestId}`, {
      organizationId: orgId,
      personId,
      action: eventAction,
      sourceAction: body.action,
      from,
      to,
      at,
      actorUserId: uid,
    });
    const result = {
      ok: true,
      noticeIds,
      message:
        "Alteração salva. Os painéis e o app consultarão o registro atualizado.",
    };
    tx.set(requestPath, { fingerprint, result, at });
    return result;
  });
}

/** One provider attempt per notice. A provider ticket is not a delivery receipt. */
export async function dispatchJourneyPush(
  orgId: string,
  noticeId: string,
  transport: typeof fetch = fetch,
) {
  const { isLocalQaFirebase } = await import("./firebase-server-env");
  const path = `organizations/${documentId(orgId, "Instituição")}/journeyNotices/${documentId(noticeId, "Aviso")}`;
  const attempt = await accountTransaction(async (tx) => {
    const [n] = await tx.read(path);
    if (!n || n.organizationId !== orgId || n.pushStatus !== "pending")
      return null;
    const root = `organizations/${orgId}`;
    const [org, user, person] = await tx.read(
      root,
      `${root}/users/${n.recipientUserId}`,
      `${root}/people/${n.personId}`,
    );
    let allowed =
      org?.status === "active" &&
      user?.organizationId === orgId &&
      user.isActive === true &&
      person?.organizationId === orgId &&
      person.status === "active";
    try {
      await journeyEnabled(tx, root);
      if (n.kind === "progress")
        allowed =
          allowed &&
          (await boundPerson(tx, root, orgId, n.recipientUserId)) ===
            n.personId;
      else {
        const c = await context(
          tx,
          { organizationId: orgId },
          n.recipientUserId,
        );
        const [task] = await tx.read(`${root}/followUpTasks/${n.taskId}`);
        allowed =
          allowed &&
          !!task &&
          task.personId === n.personId &&
          task.assignedToUserId === n.recipientUserId &&
          isCarePending(task) &&
          (c.staff || c.scope.has(n.personId));
      }
    } catch {
      allowed = false;
    }
    if (!allowed) {
      tx.patch(path, { pushStatus: "unavailable" });
      return null;
    }
    if (
      !/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(
        user!.expoPushToken || "",
      )
    ) {
      tx.patch(path, { pushStatus: "no_device" });
      return null;
    }
    if (isLocalQaFirebase() && transport === fetch) {
      tx.patch(path, { pushStatus: "test_mode" });
      return null;
    }
    tx.patch(path, {
      pushStatus: "sending",
      attemptedAt: new Date().toISOString(),
    });
    return { token: user!.expoPushToken, kind: n.kind };
  });
  if (!attempt) return;
  let state: Data = { pushStatus: "uncertain" };
  try {
    const response = await transport("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN
          ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        to: attempt.token,
        title:
          attempt.kind === "task"
            ? "Novo acompanhamento"
            : "Sua integração foi atualizada",
        body: "Abra o Esdras para conferir os próximos passos.",
        sound: "default",
        data: { type: "journey_update", organizationId: orgId },
      }),
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    const body = await response.json(),
      ticket = Array.isArray(body.data) ? body.data[0] : body.data;
    state =
      response.ok && ticket?.status === "ok" && typeof ticket.id === "string"
        ? { pushStatus: "accepted", ticketId: ticket.id }
        : { pushStatus: response.status >= 500 ? "uncertain" : "failed" };
  } catch {}
  await accountTransaction(async (tx) => {
    const [n] = await tx.read(path);
    if (n?.pushStatus === "sending") tx.patch(path, state);
  });
}

import { assertWhatsappContactAllowed } from "./communication-operations";
import {
  careContext,
  careQueue,
  networkCare,
  pastoralRoles,
} from "./pastoral-care";
import { tribeHomeSummary } from "./tribe-operations";
import { groupOperation } from "./group-operations";
import { isCellGroup, isActiveGroupMembership } from "@alvo/domain";
import { isCarePending } from "@alvo/domain";
import { whatsappHref, whatsappPhone } from "@alvo/utils";
import { homeEvolution } from "./home-evolution";
import { createHash } from "node:crypto";
import {
  homeProfiles,
  isChurchStaff,
  birthdayInPeriod,
  HOME_PROFILES,
  type HomeProfile,
  type RoleHomeSnapshot,
} from "@alvo/domain";
import { planHasModule, type PlanId } from "@alvo/firebase";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { documentId } from "./member-account";
import { financeActor, textField } from "./finance-operations";
import { servingInstant } from "../../../src/features/serving/serving-contract";

type Data = Record<string, any>;
const validId = (id: unknown): id is string =>
  typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);
const day = (now: number, tz: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
const name = (p: Data) =>
  String(
    p.preferredName ||
      [p.firstName, p.lastName].filter(Boolean).join(" ") ||
      "Pessoa",
  );
const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex").slice(0, 40);

async function context(tx: AccountTransaction, raw: Data, uid: string) {
  const organizationId = documentId(raw.organizationId, "Instituição");
  const { root, org, actor } = await financeActor(
    tx,
    organizationId,
    uid,
    false,
    null,
  );
  const roles: string[] = Array.isArray(actor.roles)
    ? actor.roles.filter((r: unknown) => typeof r === "string")
    : [];
  if (!roles.length)
    throw new AccountError(
      403,
      "Sua conta não tem uma função ativa nesta instituição.",
    );
  const [features, subscription, branding] = await tx.read(
    `${root}/settings/features`,
    `${root}/settings/subscription`,
    `${root}/settings/branding`,
  );
  const fallback =
    subscription?.planTier === "enterprise"
      ? "enterprise"
      : subscription?.planTier === "advanced"
        ? "pastoral"
        : subscription?.planTier === "growth"
          ? "comunidade"
          : "free";
  const plan: PlanId = [
    "free",
    "comunidade",
    "pastoral",
    "rede",
    "enterprise",
  ].includes(subscription?.plan)
    ? subscription!.plan
    : fallback;
  // Match the client parser's legacy defaults when a features document exists.
  const legacyOff = new Set([
    "children",
    "youth",
    "volunteers",
    "tribes",
    "communication",
    "marketplace",
    "giving",
    "publicForms",
    "finance",
    "ai",
  ]);
  const enabled = (key: string) =>
    features?.modules?.[key]?.enabled !== false &&
    !(features && !features.modules?.[key] && legacyOff.has(key)) &&
    (roles.includes("super_admin") || planHasModule(plan, key));
  const tier =
    org.organizationTier ||
    (org.organizationType === "network"
      ? "network"
      : org.organizationType === "denomination"
        ? "denomination"
        : "solo");
  const profiles = homeProfiles(
    roles,
    tier,
    ["rede", "enterprise"].includes(plan),
  );
  const profile = raw.profile === undefined ? profiles[0] : raw.profile;
  if (!HOME_PROFILES.includes(profile) || !profiles.includes(profile))
    throw new AccountError(
      403,
      "Esta visão não está disponível para sua função nesta instituição.",
    );
  const timezone = org.timezone || "America/Belem";
  try {
    day(Date.now(), timezone);
  } catch {
    throw new AccountError(409, "Configure o fuso da instituição.");
  }
  return {
    root,
    org,
    actor,
    roles,
    enabled,
    profiles,
    profile: profile as HomeProfile,
    timezone,
    organizationId,
    groupsLabel: branding?.groupsModuleLabel || "Células",
  };
}
type Context = Awaited<ReturnType<typeof context>>;
async function personBinding(tx: AccountTransaction, c: Context, uid: string) {
  const [link] = await tx.read(`${c.root}/memberAccountLinks/${uid}`);
  if (
    !link?.verifiedBy ||
    link.userId !== uid ||
    link.organizationId !== c.organizationId ||
    link.personId !== c.actor.personId ||
    !validId(link.personId)
  )
    return null;
  const [person, claim] = await tx.read(
    `${c.root}/people/${link.personId}`,
    `${c.root}/memberAccountClaims/${link.personId}`,
  );
  if (
    person?.organizationId !== c.organizationId ||
    person.status !== "active" ||
    claim?.organizationId !== c.organizationId ||
    claim.userId !== uid ||
    claim.personId !== link.personId
  )
    return null;
  return { ...person, id: link.personId };
}
async function ownGroups(
  tx: AccountTransaction,
  c: Context,
  personId: string,
  led: boolean,
) {
  if (!c.enabled("groups")) return [];
  const groups = await tx.query(
    c.root,
    "groups",
    "status",
    "active",
    "EQUAL",
    501,
  );
  if (groups.length > 500)
    throw new AccountError(
      409,
      "Há muitas células para esta visão. Procure a administração para organizar o acesso.",
    );
  const memberships = await tx.read(
    ...groups.map(
      (g) => `${c.root}/groups/${g.id}/members/${g.id}_${personId}`,
    ),
  );
  return groups.filter((g, i) => {
    const m = memberships[i];
    return (
      g.organizationId === c.organizationId &&
      isCellGroup(g) &&
      isActiveGroupMembership(m) &&
      m?.organizationId === c.organizationId &&
      m.groupId === g.id &&
      m.personId === personId &&
      (!led || ["leader", "co_leader", "supervisor"].includes(m.roleInGroup))
    );
  });
}
async function authorizeGroup(
  tx: AccountTransaction,
  c: Context,
  groupId: string,
  person: Data | null,
) {
  if (!c.enabled("groups"))
    throw new AccountError(403, "O módulo de células não está disponível.");
  const [group] = await tx.read(`${c.root}/groups/${groupId}`);
  if (group?.organizationId !== c.organizationId || group.status !== "active")
    throw new AccountError(404, "Célula indisponível.");
  if (
    ["pastoral", "administration"].includes(c.profile) &&
    isChurchStaff(c.roles)
  )
    return group;
  if (c.profile !== "cell_leader" || !person)
    throw new AccountError(
      403,
      "Esta operação exige liderança vinculada à célula.",
    );
  const [m] = await tx.read(
    `${c.root}/groups/${groupId}/members/${groupId}_${person.id}`,
  );
  if (
    !isActiveGroupMembership(m) ||
    m?.organizationId !== c.organizationId ||
    m.groupId !== groupId ||
    m.personId !== person.id ||
    !["leader", "co_leader", "supervisor"].includes(m.roleInGroup)
  )
    throw new AccountError(403, "Você não é responsável por esta célula.");
  return group;
}
async function roster(tx: AccountTransaction, c: Context, groupId: string) {
  const rows = await tx.query(
    `${c.root}/groups/${groupId}`,
    "members",
    undefined,
    undefined,
    "EQUAL",
    501,
  );
  if (rows.length > 500)
    throw new AccountError(
      409,
      "Consulte a secretaria para dividir esta célula.",
    );
  const members = rows.filter(
    (m) =>
      isActiveGroupMembership(m) &&
      m.organizationId === c.organizationId &&
      m.groupId === groupId &&
      validId(m.personId),
  );
  const people = await tx.read(
    ...members.map((m) => `${c.root}/people/${m.personId}`),
  );
  return members.flatMap((m, i) =>
    people[i]?.organizationId === c.organizationId &&
    people[i]?.status === "active"
      ? [{ ...people[i], id: m.personId, roleInGroup: m.roleInGroup }]
      : [],
  );
}
function audit(
  tx: AccountTransaction,
  c: Context,
  uid: string,
  action: string,
  now: number,
  extra: Data,
) {
  tx.set(`${c.root}/dashboardAudit/${crypto.randomUUID()}`, {
    organizationId: c.organizationId,
    actorId: uid,
    action,
    at: new Date(now).toISOString(),
    ...extra,
  });
}
function actionList(c: Context) {
  const staff = ["pastoral", "administration"].includes(c.profile);
  const actions: Array<{
    key: string;
    title: string;
    detail: string;
    href: string;
    module?: string;
  }> =
    c.profile === "network"
      ? [
          {
            key: "network",
            title: "Igrejas da rede",
            detail: "Vínculos e indicadores compartilhados",
            href: "/network",
          },
        ]
      : staff
        ? [
            {
              key: "absence",
              title: "Ausência percebida",
              detail: "Registrar quem precisa de acompanhamento",
              href: "#acompanhamento",
              module: "core",
            },
            {
              key: "people",
              title: "Pessoas e famílias",
              detail: "Consultar e manter cadastros",
              href: "/members",
              module: "core",
            },
            {
              key: "reception",
              title: "Receber visitantes",
              detail: "Acolher quem está chegando",
              href: "/reception",
              module: "visitors",
            },
            {
              key: "groups",
              title: c.groupsLabel,
              detail: "Líderes, encontros e presenças",
              href: "/groups",
              module: "groups",
            },
            {
              key: "campaigns",
              title: "Campanhas de convites",
              detail: "Convidados e fila manual de WhatsApp",
              href: "/campaigns",
              module: "events",
            },
            {
              key: "serving",
              title: "Áreas e escalas",
              detail: "Organizar o serviço das equipes",
              href: "/serving",
              module: "volunteers",
            },
            {
              key: "finance",
              title: "Finanças",
              detail: "Consultar a operação financeira",
              href: "/finance",
              module: "finance",
            },
            {
              key: "operations",
              title: "Operação detalhada",
              detail: "Ferramentas e relatórios operacionais",
              href: "/operations",
            },
          ]
        : c.profile === "cell_leader"
          ? [
              {
                key: "groups",
                title: `Minhas ${c.groupsLabel.toLocaleLowerCase("pt-BR")}`,
                detail: "Abrir encontro e registrar presenças",
                href: "/my-groups",
                module: "groups",
              },
              {
                key: "absence",
                title: "Quem precisa de cuidado",
                detail: "Acompanhar pessoas das suas células",
                href: "#acompanhamento",
                module: "groups",
              },
              {
                key: "invites",
                title: "Meus convidados",
                detail: "Compartilhar seu convite pessoal",
                href: "/my-invites",
                module: "events",
              },
            ]
          : [
              {
                key: "profile",
                title: "Meu perfil e passe",
                detail: "Meus dados e identificação",
                href: "/me",
                module: "core",
              },
              {
                key: "groups",
                title: "Minhas células",
                detail: "Consultar meus encontros",
                href: "/my-groups",
                module: "groups",
              },
              {
                key: "serving",
                title: "Minhas escalas",
                detail: "Consultar e responder à liderança",
                href: "/serving",
                module: "volunteers",
              },
              {
                key: "invites",
                title: "Meus convidados",
                detail: "Convidar e acompanhar minhas indicações",
                href: "/my-invites",
                module: "events",
              },
              {
                key: "events",
                title: "Agenda da igreja",
                detail: "Eventos publicados e inscrições",
                href: "/events",
                module: "events",
              },
              {
                key: "learning",
                title: "Meu aprendizado",
                detail: "Cursos e próximos passos",
                href: "/learning/academy",
                module: "journeys",
              },
            ];
  if (c.profile !== "network") {
    const extra = [
      {
        key: "events",
        title: "Agenda da igreja",
        detail: "Eventos publicados e inscrições",
        href: "/events",
        module: "events",
      },
      {
        key: "learning",
        title: "Meu aprendizado",
        detail: "Cursos e próximos passos",
        href: "/learning/academy",
        module: "journeys",
      },
      ...(staff || c.profile === "cell_leader"
        ? [
            {
              key: "journeys",
              title: "Jornadas de integração",
              detail: "Acompanhar próximos passos e tarefas",
              href: "/journeys",
              module: "journeys",
            },
          ]
        : []),
    ];
    actions.push(
      ...extra.filter(
        (a) => !actions.some((existing) => existing.key === a.key),
      ),
    );
  }
  return actions
    .filter((a) => !a.module || c.enabled(a.module))
    .map(({ module, ...a }) => a);
}
export async function roleHomeOperation(
  raw: Data,
  uid: string,
  now = Date.now(),
) {
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    ![
      "overview",
      "evolution",
      "contact",
      "my-groups",
      "group-detail",
      "create-meeting",
      "close-meeting",
      "save-report",
      "attendance",
      "absence",
      "close-absence",
      "search-people",
    ].includes(raw.action)
  )
    throw new AccountError(400, "Operação inválida.");
  if (
    ["create-meeting", "attendance", "close-meeting", "save-report"].includes(
      raw.action,
    )
  )
    return groupOperation(raw, uid, now);
  if (raw.action === "group-detail") {
    const d = await groupOperation({ ...raw, action: "detail" }, uid, now);
    return {
      ...d,
      meetingId: d.meeting?.id || null,
      people: d.people.map((p: Data) => ({ ...p, id: p.personId })),
    };
  }
  return accountTransaction(async (tx) => {
    const c = await context(tx, raw, uid);
    const person = await personBinding(tx, c, uid);
    const staff = ["pastoral", "administration"].includes(c.profile);
    const led = c.profile === "cell_leader";
    if (raw.action === "contact") {
      if ((!staff && !led) || !c.enabled(staff ? "core" : "groups"))
        throw new AccountError(403, "Contato indisponível para esta visão.");
      const personId = documentId(raw.personId, "Pessoa");
      if (!staff) {
        const groupId = documentId(raw.groupId, "Célula");
        await authorizeGroup(tx, c, groupId, person);
        if (!(await roster(tx, c, groupId)).some((p) => p.id === personId))
          throw new AccountError(403, "Pessoa fora da sua célula.");
      }
      const [target] = await tx.read(`${c.root}/people/${personId}`);
      if (
        target?.organizationId !== c.organizationId ||
        target.status !== "active"
      )
        throw new AccountError(404, "Pessoa indisponível.");
      if (!["care", "birthday"].includes(raw.reason))
        throw new AccountError(400, "Motivo de contato inválido.");
      const church = c.org.displayName || c.org.name || "nossa igreja";
      const message =
        raw.reason === "birthday"
          ? `Olá, ${name(target)}! Aqui é da ${church}. Passando para desejar um feliz aniversário! Que seu novo ano seja cheio de paz e alegria.`
          : `Olá, ${name(target)}! Aqui é da ${church}. Como você está? Gostaríamos de saber se podemos ajudar em algo. Quando puder, fale com a gente.`;
      if (raw.channel === "whatsapp") {
        if (!c.enabled("communication"))
          throw new AccountError(
            403,
            "Comunicação indisponível nesta instituição.",
          );
        const url = whatsappHref(target, message);
        if (!url)
          throw new AccountError(
            409,
            "WhatsApp indisponível: confira o telefone e a preferência de contato no cadastro.",
          );
        await assertWhatsappContactAllowed(
          tx,
          c.root,
          whatsappPhone(target.whatsappPhone || target.mobilePhone)!,
        );
        return { url, message };
      }
      if (raw.channel !== "map") throw new AccountError(400, "Canal inválido.");
      const a = target.address;
      if (!a?.street || !a?.city)
        throw new AccountError(
          409,
          "Endereço incompleto. Cadastre rua e cidade antes de abrir o mapa.",
        );
      const address = [
        a.street,
        a.number,
        a.district,
        a.city,
        a.state,
        a.postalCode,
        a.countryCode,
      ]
        .filter(Boolean)
        .join(", ");
      return {
        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        address,
      };
    }
    if (raw.action === "evolution") {
      if ((!staff && !led) || !c.enabled("groups"))
        throw new AccountError(403, "Evolução indisponível para esta visão.");
      const candidates = staff
        ? await tx.query(c.root, "groups", "status", "active", "EQUAL", 501)
        : person
          ? await ownGroups(tx, c, person.id, true)
          : [];
      const groups = candidates.filter(
        (g) => g.organizationId === c.organizationId && isCellGroup(g),
      );
      const result = await homeEvolution(
        tx,
        c.root,
        c.organizationId,
        groups.map((g) => ({ id: g.id, name: g.name })),
        c.timezone,
        now,
      );
      if (staff && candidates.length > 500) result.partial = true;
      return result;
    }

    if (raw.action === "search-people") {
      if (!staff || !c.enabled("core"))
        throw new AccountError(403, "Consulta restrita à equipe da igreja.");
      const search = textField(raw.search, "Nome", 80)
        .trim()
        .toLocaleLowerCase("pt-BR");
      if (search.length < 2) return { people: [], partial: false };
      const rows = await tx.query(
        c.root,
        "people",
        "status",
        "active",
        "EQUAL",
        1001,
      );
      return {
        people: rows
          .filter(
            (p) =>
              p.organizationId === c.organizationId &&
              name(p).toLocaleLowerCase("pt-BR").includes(search),
          )
          .slice(0, 30)
          .map((p) => ({ id: p.id, name: name(p) })),
        partial: rows.length > 1000,
      };
    }
    if (
      ["my-groups", "group-detail", "create-meeting", "attendance"].includes(
        raw.action,
      )
    ) {
      if (raw.action === "my-groups") {
        const groups = person ? await ownGroups(tx, c, person.id, led) : [];
        return {
          profile: c.profile,
          linked: !!person,
          groups: groups.map((g) => ({
            id: g.id,
            name: g.name,
            meetingTime: g.meetingTime || null,
          })),
          timezone: c.timezone,
        };
      }
      const groupId = documentId(raw.groupId, "Célula");
      const group = await authorizeGroup(tx, c, groupId, person);
      const base = `${c.root}/groups/${groupId}`;
      const people = await roster(tx, c, groupId);
      const meetings = (
        await tx.query(
          base,
          "meetings",
          undefined,
          undefined,
          "EQUAL",
          51,
          undefined,
          { field: "scheduledStartAt", direction: "DESCENDING" },
        )
      ).filter(
        (m) =>
          m.organizationId === c.organizationId &&
          m.groupId === groupId &&
          m.meetingStatus !== "cancelled",
      );
      const meetingId = raw.meetingId
        ? documentId(raw.meetingId, "Encontro")
        : meetings.find(
            (m) => Date.parse(m.scheduledStartAt) <= now + 3 * 3600000,
          )?.id || meetings[0]?.id;
      if (meetingId && !meetings.some((m) => m.id === meetingId))
        throw new AccountError(404, "Encontro não encontrado nesta seleção.");
      const attendance = meetingId
        ? await tx.query(
            `${base}/meetings/${meetingId}`,
            "attendance",
            undefined,
            undefined,
            "EQUAL",
            501,
          )
        : [];
      return {
        group: { id: group.id, name: group.name },
        timezone: c.timezone,
        meetingId: meetingId || null,
        meetings: meetings.slice(0, 50).map((m) => ({
          id: m.id,
          startsAt: m.scheduledStartAt,
          status: m.meetingStatus,
          revision: m.revision || 0,
        })),
        people: people.map((p) => ({
          id: p.id,
          name: name(p),
          role: p.roleInGroup,
          status:
            attendance.find(
              (a) =>
                a.organizationId === c.organizationId &&
                a.groupId === groupId &&
                a.personId === p.id &&
                a.groupMeetingId === meetingId,
            )?.attendanceStatus || null,
        })),
      };
    }
    if (raw.action === "absence" || raw.action === "close-absence") {
      if (!staff && !led)
        throw new AccountError(
          403,
          "Seu perfil não registra acompanhamento pastoral.",
        );
      if (!c.enabled(staff ? "core" : "groups"))
        throw new AccountError(403, "O acompanhamento está indisponível.");
      if (raw.action === "close-absence") {
        const id = documentId(raw.id, "Acompanhamento"),
          path = `${c.root}/perceivedAbsences/${id}`;
        const [record] = await tx.read(path);
        if (record?.organizationId !== c.organizationId)
          throw new AccountError(404, "Acompanhamento não encontrado.");
        if (!staff) {
          if (!record.groupId)
            throw new AccountError(
              403,
              "Acompanhamento fora das suas células.",
            );
          await authorizeGroup(tx, c, record.groupId, person);
          const current = await roster(tx, c, record.groupId);
          if (!current.some((p) => p.id === record.personId))
            throw new AccountError(
              403,
              "Pessoa não pertence mais à sua célula.",
            );
        }
        if (record.status === "contacted") return { ok: true, replayed: true };
        tx.patch(path, {
          status: "contacted",
          contactedByUserId: uid,
          contactedAt: new Date(now).toISOString(),
        });
        audit(tx, c, uid, "absence_contact_recorded", now, { absenceId: id });
        return { ok: true };
      }
      const personId = documentId(raw.personId, "Pessoa"),
        groupId = raw.groupId ? documentId(raw.groupId, "Célula") : null;
      if (!staff || groupId) {
        if (!groupId)
          throw new AccountError(403, "Escolha uma das suas células.");
        await authorizeGroup(tx, c, groupId, person);
        const members = await roster(tx, c, groupId);
        if (!members.some((m) => m.id === personId))
          throw new AccountError(403, "Pessoa fora da célula.");
      }
      const [target] = await tx.read(`${c.root}/people/${personId}`);
      if (
        target?.organizationId !== c.organizationId ||
        target.status !== "active"
      )
        throw new AccountError(404, "Pessoa não encontrada.");
      const date = textField(raw.date, "Data", 10),
        today = day(now, c.timezone);
      const parsed = new Date(date + "T12:00:00Z");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date ||
        date > today ||
        now - parsed.getTime() > 91 * 86400000
      )
        throw new AccountError(
          400,
          "Informe uma data válida dos últimos 90 dias.",
        );
      const note = textField(raw.note || "", "Observação", 500, true);
      const id = `absence_${digest(personId + date + (groupId || "church"))}`;
      const [old] = await tx.read(`${c.root}/perceivedAbsences/${id}`);
      if (old) return { id, replayed: true };
      tx.set(`${c.root}/perceivedAbsences/${id}`, {
        id,
        organizationId: c.organizationId,
        personId,
        groupId,
        date,
        note,
        status: "open",
        createdByUserId: uid,
        createdAt: new Date(now).toISOString(),
      });
      audit(tx, c, uid, "perceived_absence_recorded", now, {
        absenceId: id,
        personId,
        groupId,
      });
      return { id };
    }
    const out: RoleHomeSnapshot = {
      profile: c.profile,
      profiles: c.profiles,
      organizationId: c.organizationId,
      organizationName: c.org.displayName || c.org.name || "Minha igreja",
      timezone: c.timezone,
      groupsLabel: c.groupsLabel,
      scopeLabel:
        c.profile === "network"
          ? "Igrejas com vínculo ativo na sua rede"
          : staff
            ? "Instituição ativa"
            : led
              ? "Somente as células em que você está vinculado como líder"
              : "Seus vínculos e atividades pessoais",
      asOf: new Date(now).toISOString(),
      linked: !!person,
      metrics: [],
      actions: actionList(c),
      warnings: [],
      events: [],
      groups: [],
      birthdays: [],
      tasks: [],
      integrationEnabled: c.enabled("journeys"),
      absences: [],
      churches: [],
    };
    if (
      c.profile !== "network" &&
      (led || c.roles.some((r) => pastoralRoles.includes(r))) &&
      c.profile !== "member" &&
      c.enabled("ai")
    ) {
      try {
        const care = await careQueue(
          tx,
          await careContext(
            tx,
            { organizationId: c.organizationId, profile: c.profile },
            uid,
          ),
          now,
        );
        out.care = {
          scope: led
            ? "Somente pedidos atribuídos a você em suas células"
            : "Fila pastoral da instituição",
          asOf: care.asOf,
          partial: care.partial,
          summary: care.summary,
          requests: care.requests.slice(0, 5).map((r) => ({
            id: r.id,
            personName: r.personName,
            priority: r.priority,
            dueAt: r.dueAt,
            ownerName: r.ownerName,
            status: r.status,
            revision: r.revision,
          })),
        };
        out.actions.push({
          key: "pastoral-care",
          title: "Cuidado Pastoral",
          detail: led
            ? "Meus pedidos atribuídos"
            : "Triagem, responsáveis e prazos",
          href: "/pastoral-ai?profile=" + c.profile,
        });
      } catch (e) {
        if (!(e instanceof AccountError) || e.status !== 403) throw e;
      }
    }
    if (c.profile !== "network" && c.enabled("marketplace")) {
      out.actions.push({
        key: "marketplace",
        title: "Marketplace da Comunidade",
        detail: "Conhecer negócios e acompanhar suas lojas",
        href: "/marketplace-community",
      });
      if (staff) {
        const pending = await tx.count(
          c.root,
          "communityStores",
          "status",
          "pending",
        );
        out.metrics.push({
          key: "marketplace-pending",
          label: "Lojas aguardando análise",
          value: pending,
          href: "/marketplace-community/admin/moderation",
        });
        if (pending)
          out.warnings.push(
            `${pending} loja(s) aguardando análise para publicação no Marketplace.`,
          );
      }
    }
    if (c.profile !== "network" && staff && c.enabled("communication")) {
      const prepared = await tx.count(
        c.root,
        "communicationCampaigns",
        "status",
        "prepared",
      );
      const partial = await tx.count(
        c.root,
        "communicationCampaigns",
        "status",
        "partially_confirmed",
      );
      const handoffs = await tx.count(
        c.root,
        "whatsappHandoffs",
        "status",
        "open",
      );
      out.actions.push({
        key: "communication",
        title: "Comunicação",
        detail: "Retomar listas e atender conversas",
        href: "/communication",
      });
      out.metrics.push({
        key: "communication-pending",
        label: "Listas manuais a concluir",
        value: prepared + partial,
        href: "/communication",
      });
      out.metrics.push({
        key: "communication-handoffs",
        label: "Conversas aguardando equipe",
        value: handoffs,
        href: "/communication",
      });
      if (prepared + partial)
        out.warnings.push(
          `${prepared + partial} lista(s) de WhatsApp com envios manuais ainda não registrados.`,
        );
      if (handoffs)
        out.warnings.push(
          `${handoffs} conversa(s) aguardando atendimento da equipe em Comunicação.`,
        );
    }
    if (c.profile !== "network" && c.enabled("giving")) {
      out.actions.push({
        key: "giving",
        title: staff ? "Doações e campanhas" : "Minhas contribuições",
        detail: staff
          ? "Campanhas e declarações recebidas"
          : "Campanhas da igreja e situação das minhas declarações",
        href: "/giving",
      });
    }
    if (c.profile !== "network" && staff && c.enabled("finance")) {
      const pending = await tx.count(
        c.root,
        "contributions",
        "status",
        "pending",
      );
      out.metrics.push({
        key: "giving-pending",
        label: "Contribuições a conferir",
        value: pending,
        href: "/finance",
      });
      if (pending)
        out.warnings.push(
          `${pending} contribuição(ões) aguardando conferência em Finanças. Ainda não são recebimentos confirmados.`,
        );
    }
    if (c.profile === "network") {
      const active = await tx.query(
        c.root,
        "affiliates",
        "status",
        "active",
        "EQUAL",
        1001,
      );
      const usable = active
        .filter(
          (a) =>
            a.parentOrganizationId === c.organizationId &&
            validId(a.childOrganizationId),
        )
        .slice(0, 50);
      let members = 0,
        groups = 0,
        covered = 0;
      for (const a of usable) {
        const [affiliation, child] = await tx.read(
          `networkAffiliations/${a.childOrganizationId}`,
          `organizations/${a.childOrganizationId}`,
        );
        if (
          affiliation?.status !== "active" ||
          affiliation.parentOrganizationId !== c.organizationId ||
          affiliation.childOrganizationId !== a.childOrganizationId ||
          affiliation.affiliateId !== a.id ||
          child?.status !== "active"
        )
          continue;
        const snapshots = await tx.query(
          `organizations/${a.childOrganizationId}`,
          "networkSnapshots",
          undefined,
          undefined,
          "EQUAL",
          1,
          undefined,
          { field: "date", direction: "DESCENDING" },
        );
        const s =
          snapshots[0]?.organizationId === a.childOrganizationId &&
          Number.isSafeInteger(snapshots[0]?.totalMembers) &&
          snapshots[0].totalMembers >= 0 &&
          Number.isSafeInteger(snapshots[0]?.activeGroups) &&
          snapshots[0].activeGroups >= 0 &&
          /^\d{4}-\d{2}-\d{2}$/.test(snapshots[0]?.date || "") &&
          Number.isFinite(Date.parse(snapshots[0].date + "T00:00:00Z")) &&
          snapshots[0].date <= day(now, c.timezone)
            ? snapshots[0]
            : null;
        if (snapshots.length && !s)
          out.warnings.push(
            `${child.displayName || child.name || a.childName}: consolidado inválido; indicadores indisponíveis.`,
          );
        if (
          s &&
          Date.parse(day(now, c.timezone) + "T00:00:00Z") -
            Date.parse(s.date + "T00:00:00Z") >
            7 * 86400000
        )
          out.warnings.push(
            `${child.displayName || child.name || a.childName}: consolidado de ${s.date}, com mais de 7 dias. Os totais incluem esse período anterior.`,
          );
        if (s) {
          covered++;
          members += Number(s.totalMembers || 0);
          groups += Number(s.activeGroups || 0);
        }
        const childRoot = `organizations/${a.childOrganizationId}`;
        const [childFeatures, childSubscription] = await tx.read(
          childRoot + "/settings/features",
          childRoot + "/settings/subscription",
        );
        const childPlan =
          childSubscription?.plan ||
          (
            {
              enterprise: "enterprise",
              advanced: "pastoral",
              growth: "comunidade",
            } as Data
          )[childSubscription?.planTier] ||
          "free";
        const receptionAvailable =
          c.enabled("visitors") &&
          childFeatures?.modules?.visitors?.enabled !== false &&
          planHasModule(childPlan, "visitors");
        const receptionPending = receptionAvailable
          ? await tx.count(childRoot, "visitorIntakes", "status", "captured")
          : null;
        out.churches.push({
          id: a.childOrganizationId,
          name: child.displayName || child.name || a.childName,
          date: s?.date || null,
          members: s ? Number(s.totalMembers || 0) : null,
          groups: s ? Number(s.activeGroups || 0) : null,
          receptionPending,
          receptionAsOf: new Date(now).toISOString(),
        });
      }
      out.metrics = [
        {
          key: "churches",
          label: "Igrejas verificadas nesta visão",
          value: out.churches.length,
          href: "/network",
        },
        {
          key: "coverage",
          label: "Igrejas com indicadores nesta visão",
          value: covered,
        },
        {
          key: "members",
          label: "Membros nas igrejas com indicadores",
          value: covered ? members : null,
        },
        {
          key: "groups",
          label: "Células nas igrejas com indicadores",
          value: covered ? groups : null,
        },
      ];
      if (c.enabled("visitors")) {
        const coveredReception = out.churches.filter(
          (ch) => ch.receptionPending !== null,
        );
        out.metrics.push({
          key: "network-reception",
          label: "Entradas aguardando integração nas igrejas cobertas",
          value: coveredReception.length
            ? coveredReception.reduce(
                (sum, ch) => sum + (ch.receptionPending || 0),
                0,
              )
            : null,
        });
        out.metrics.push({
          key: "network-reception-coverage",
          label: "Igrejas com dados da recepção disponíveis",
          value: coveredReception.length,
        });
        if (coveredReception.length < out.churches.length)
          out.warnings.push(
            "Há igrejas com recepção indisponível. Ausência de dados não significa fila vazia.",
          );
      }
      out.warnings.push(
        "Os indicadores usam os últimos consolidados compartilhados por cada igreja. Não dão acesso a fichas pessoais das filiais.",
      );
      if (active.length > 50)
        out.warnings.push(
          "A visão rápida reúne até 50 igrejas. Abra Rede de Igrejas para consultar a relação completa.",
        );
      if (c.enabled("ai")) {
        try {
          const care = await networkCare(
            tx,
            await careContext(
              tx,
              { organizationId: c.organizationId, profile: "network" },
              uid,
            ),
          );
          for (const church of out.churches) {
            const row = care.churches.find((x) => x.id === church.id);
            church.careOpen = row?.open ?? null;
            church.careInProgress = row?.inProgress ?? null;
            church.careUrgent = row?.urgent ?? null;
            church.careOverdue = row?.overdue ?? null;
            church.careAsOf = care.asOf;
          }
          out.metrics.push({
            key: "network-care",
            label: "Pedidos pastorais abertos nas igrejas cobertas",
            value: care.summary.covered ? care.summary.open : null,
          });
          out.metrics.push({
            key: "network-care-urgent",
            label: "Pedidos urgentes nas igrejas cobertas",
            value: care.summary.covered ? care.summary.urgent : null,
          });
          out.metrics.push({
            key: "network-care-overdue",
            label: "Prazos vencidos nas igrejas cobertas",
            value: care.summary.covered ? care.summary.overdue : null,
          });
          out.metrics.push({
            key: "network-care-coverage",
            label: "Igrejas com dados pastorais disponíveis",
            value: care.summary.covered,
          });
          out.actions.push({
            key: "pastoral-care",
            title: "Cuidado da rede",
            detail: "Comparar filas e cobertura, sem relatos pessoais",
            href: "/pastoral-ai?profile=network",
          });
          if (care.summary.covered < care.summary.total)
            out.warnings.push(
              "Há instituições sem dados pastorais disponíveis. Ausência de dados não significa ausência de pedidos.",
            );
        } catch (e) {
          if (!(e instanceof AccountError) || e.status !== 403) throw e;
        }
      }
      return out;
    }
    const own = person ? await ownGroups(tx, c, person.id, led) : [];
    if (c.enabled("tribes")) {
      try {
        const t = await tribeHomeSummary(
          tx,
          c.root,
          c.organizationId,
          uid,
          c.roles,
          c.profile,
          now,
        );
        out.metrics.push({
          key: "tribe-next-steps",
          label: "Próximos passos para servir",
          value: t.pending,
          href: t.href,
        });
        out.actions.unshift({
          key: "tribes",
          title: t.pending
            ? `${t.pending} próximo(s) passo(s) para servir`
            : "Descobrir e experimentar servir",
          detail:
            staff || led
              ? "Interesses, experiências e retornos para acompanhar"
              : "Meus interesses, convites e retorno à liderança",
          href: t.href,
        });
      } catch (e) {
        out.warnings.push(
          "Não foi possível consultar as experiências de serviço. Abra Tribos para conferir seus vínculos.",
        );
      }
    }
    out.groups = own.map((g) => ({
      id: g.id,
      name: g.name,
      meetingTime: g.meetingTime,
    }));
    if (!staff && !person)
      out.warnings.push(
        "Peça à secretaria para vincular sua conta ao cadastro de membro. O vínculo é necessário para consultar seus dados pessoais e responsabilidades.",
      );
    if (led && person && !own.length)
      out.warnings.push(
        "Você tem o cargo de líder, mas ainda não está vinculado como responsável por uma célula. Peça à administração para ajustar o vínculo.",
      );
    if (c.enabled("events")) {
      const events = await tx.query(
        c.root,
        "events",
        "startsAt",
        new Date(now).toISOString(),
        "GREATER_THAN_OR_EQUAL",
        7,
        { field: "status", value: "published" },
        { field: "startsAt", direction: "ASCENDING" },
      );
      out.events = events
        .filter(
          (e) =>
            e.organizationId === c.organizationId &&
            Date.parse(e.startsAt) >= now,
        )
        .slice(0, 6)
        .map((e) => ({
          id: e.id,
          name: e.name,
          startsAt: e.startsAt,
          location: e.locationName || e.location || "Local a confirmar",
        }));
      if (events.length > 6)
        out.warnings.push(
          "Agenda resumida aos próximos 6 eventos. Abra a agenda para consultar os demais.",
        );
    }

    const period = raw.birthdayPeriod || "week";
    if (!["today", "week", "month"].includes(period))
      throw new AccountError(400, "Período de aniversários inválido.");
    let people: Data[] = [];
    let leaderRoster: Data[] = [];
    if (staff && c.enabled("core")) {
      people = await tx.query(
        c.root,
        "people",
        "status",
        "active",
        "EQUAL",
        501,
      );
      if (people.length > 500) {
        people = people.slice(0, 500);
        out.warnings.push(
          "A lista rápida de aniversariantes pode estar incompleta. Consulte Pessoas para conferir toda a instituição.",
        );
      }
      const count = await tx.count(c.root, "people", "status", "active");
      out.metrics.push({
        key: "people",
        label: "Pessoas ativas",
        value: count,
        href: "/members",
      });
    } else if (led) {
      for (const g of own)
        people.push(
          ...(await roster(tx, c, g.id)).map((p) => ({ ...p, groupId: g.id })),
        );
      leaderRoster = people;
      people = [...new Map(people.map((p) => [p.id, p])).values()];
      out.metrics.push(
        {
          key: "groups",
          label: "Células sob sua responsabilidade",
          value: own.length,
          href: "/my-groups",
        },
        {
          key: "people",
          label: "Pessoas nas suas células",
          value: people.length,
        },
      );
    }
    const birthdayPeople = people
      .filter(
        (p) =>
          p.organizationId === c.organizationId &&
          birthdayInPeriod(p.birthDate, day(now, c.timezone), period),
      )
      .sort((a, b) => a.birthDate.slice(5).localeCompare(b.birthDate.slice(5)));
    if (birthdayPeople.length > 20)
      out.warnings.push(
        "Aniversários: mostrando até 20 pessoas do período. Consulte os cadastros da sua área para os demais.",
      );
    out.birthdays = birthdayPeople.slice(0, 20).map((p) => ({
      id: p.id,
      name: name(p),
      date: p.birthDate.slice(8, 10) + "/" + p.birthDate.slice(5, 7),
      ...(p.groupId ? { groupId: p.groupId } : {}),
    }));
    if (staff && c.enabled("groups")) {
      const activeGroups = await tx.query(
        c.root,
        "groups",
        "status",
        "active",
        "EQUAL",
        501,
      );
      if (activeGroups.length > 500)
        out.warnings.push(
          "Contagem de células parcial: mais de 500 grupos ativos.",
        );
      out.metrics.push({
        key: "groups",
        label: "Células ativas",
        value:
          activeGroups.length > 500
            ? null
            : activeGroups.filter(isCellGroup).length,
        href: "/groups",
      });
    }
    if (staff && c.enabled("visitors")) {
      out.metrics.push({
        key: "visitors",
        label: "Entradas registradas na recepção",
        value: await tx.count(c.root, "visitorIntakes"),
        href: "/reception",
      });
      out.metrics.push({
        key: "reception-pending",
        label: "Entradas aguardando integração",
        value: await tx.count(c.root, "visitorIntakes", "status", "captured"),
        href: "/reception",
      });
    }
    if (staff || led) {
      if (c.enabled("journeys")) {
        const tasks = staff
          ? (
              await Promise.all(
                ["open", "in_progress"].map((status) =>
                  tx.query(
                    c.root,
                    "followUpTasks",
                    "status",
                    status,
                    "EQUAL",
                    101,
                  ),
                ),
              )
            ).flat()
          : await tx.query(
              c.root,
              "followUpTasks",
              "assignedToUserId",
              uid,
              "EQUAL",
              501,
            );
        const pending = tasks
          .filter(
            (t) =>
              t.organizationId === c.organizationId &&
              isCarePending(t) &&
              validId(t.personId) &&
              (staff ||
                (t.assignedToUserId === uid &&
                  leaderRoster.some((p) => p.id === t.personId))),
          )
          .sort(
            (a, b) =>
              (Date.parse(a.dueAt) || Infinity) -
                (Date.parse(b.dueAt) || Infinity) || a.id.localeCompare(b.id),
          );
        if (
          staff &&
          tasks.some(
            (t) =>
              t.organizationId === c.organizationId &&
              isCarePending(t) &&
              !validId(t.personId),
          )
        )
          out.warnings.push(
            "Há acompanhamentos antigos sem pessoa vinculada. Revise esses registros antes de considerar o cuidado concluído.",
          );
        const targets = await tx.read(
          ...pending.slice(0, 10).map((t) => `${c.root}/people/${t.personId}`),
        );
        out.tasks = pending.slice(0, 10).flatMap((t, i) =>
          targets[i]?.organizationId === c.organizationId &&
          targets[i]?.status === "active" &&
          targets[i]?.status === "active"
            ? [
                {
                  id: t.id,
                  title: t.title,
                  dueAt: t.dueAt,
                  personId: t.personId,
                  personName: name(targets[i]!),
                  status: t.status,
                  revision: t.revision || 0,
                },
              ]
            : [],
        );
        if (staff && out.tasks.length < Math.min(pending.length, 10))
          out.warnings.push(
            "Alguns acompanhamentos estão vinculados a cadastros indisponíveis ou inativos e não aparecem nesta lista.",
          );
        if (pending.length > 10 || tasks.length >= (staff ? 101 : 501))
          out.warnings.push(
            "Acompanhamentos: lista resumida. Abra Jornadas para consultar as demais tarefas.",
          );
      }
      if (c.enabled(staff ? "core" : "groups")) {
        const records = staff
          ? await tx.query(
              c.root,
              "perceivedAbsences",
              "status",
              "open",
              "EQUAL",
              51,
            )
          : (
              await Promise.all(
                own.map((g) =>
                  tx.query(
                    c.root,
                    "perceivedAbsences",
                    "groupId",
                    g.id,
                    "EQUAL",
                    51,
                    { field: "status", value: "open" },
                  ),
                ),
              )
            ).flat();
        const scopedRecords = records.filter(
          (a) =>
            a.organizationId === c.organizationId &&
            a.status === "open" &&
            (staff ||
              leaderRoster.some(
                (p) => p.id === a.personId && p.groupId === a.groupId,
              )),
        );
        const open = scopedRecords.slice(0, 30);
        if (scopedRecords.length > 30 || records.length >= 51)
          out.warnings.push(
            "A lista rápida de acompanhamento é parcial. Consulte a administração para conferir todos os registros.",
          );
        const targets = await tx.read(
          ...open.map((a) => `${c.root}/people/${a.personId}`),
        );
        out.absences = open.flatMap((a, i) =>
          targets[i]?.organizationId === c.organizationId &&
          targets[i]?.status === "active" &&
          (staff ||
            leaderRoster.some(
              (p) => p.id === a.personId && p.groupId === a.groupId,
            ))
            ? [
                {
                  id: a.id,
                  personId: a.personId,
                  name: name(targets[i]!),
                  date: a.date,
                  groupId: a.groupId || null,
                  note: a.note || "",
                },
              ]
            : [],
        );
        if (out.absences.length < open.length)
          out.warnings.push(
            "Há contatos vinculados a cadastros inativos ou indisponíveis. O total inclui esses registros; a lista mostra apenas pessoas ativas.",
          );
        out.metrics.push({
          key: "care",
          label: staff
            ? "Contatos e ausências em aberto"
            : "Acompanhamentos nas suas células",
          value: staff
            ? await tx.count(c.root, "perceivedAbsences", "status", "open")
            : records.length >= 51
              ? null
              : scopedRecords.length,
          href: "#acompanhamento",
        });
      }
    }
    if (c.profile === "member") {
      const assignments =
        person && c.enabled("volunteers")
          ? await tx.query(
              c.root,
              "serviceAssignments",
              "personId",
              person.id,
              "EQUAL",
              501,
            )
          : [];
      if (assignments.length > 500)
        out.warnings.push(
          "Há muitas escalas no histórico. Abra Minhas escalas para conferir todas as pendências.",
        );
      const upcoming = assignments.filter(
        (a) =>
          a.organizationId === c.organizationId &&
          a.personId === person?.id &&
          a.status === "pending" &&
          Date.parse(a.serviceDate) >= now,
      );
      out.metrics = [
        ...out.metrics,
        ...(c.enabled("groups")
          ? [
              {
                key: "groups",
                label: "Minhas células",
                value: own.length,
                href: "/my-groups",
              },
            ]
          : []),
        ...(c.enabled("volunteers")
          ? [
              {
                key: "serving",
                label: "Escalas aguardando minha resposta",
                value: assignments.length > 500 ? null : upcoming.length,
                href: "/serving",
              },
            ]
          : []),
        ...(c.enabled("events")
          ? [
              {
                key: "events",
                label: "Próximos eventos nesta agenda",
                value: out.events.length,
                href: "/events",
              },
            ]
          : []),
      ];
    }
    return out;
  });
}

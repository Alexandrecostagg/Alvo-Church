import { isCarePending } from "@alvo/domain";
import { whatsappHref } from "@alvo/utils";
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
      "attendance",
      "absence",
      "close-absence",
      "search-people",
    ].includes(raw.action)
  )
    throw new AccountError(400, "Operação inválida.");
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
        const url = whatsappHref(target, message);
        if (!url)
          throw new AccountError(
            409,
            "WhatsApp indisponível: confira o telefone e a preferência de contato no cadastro.",
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
      const groups = staff
        ? (
            await tx.query(c.root, "groups", "status", "active", "EQUAL", 31)
          ).filter((g) => g.organizationId === c.organizationId)
        : person
          ? await ownGroups(tx, c, person.id, true)
          : [];
      return homeEvolution(
        tx,
        c.root,
        c.organizationId,
        groups.map((g) => ({ id: g.id, name: g.name })),
        c.timezone,
        now,
      );
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
      if (raw.action === "create-meeting") {
        const requestId = documentId(raw.requestId, "Tentativa");
        let startsAt: string;
        try {
          startsAt = servingInstant(raw.date, raw.time, c.timezone);
        } catch {
          throw new AccountError(400, "Confira data e horário do encontro.");
        }
        if (
          Date.parse(startsAt) < now - 30 * 86400000 ||
          Date.parse(startsAt) > now + 365 * 86400000
        )
          throw new AccountError(
            400,
            "Agende entre os últimos 30 dias e os próximos 12 meses.",
          );
        const id = `meeting_${digest(uid + groupId + requestId)}`;
        const [old] = await tx.read(`${base}/meetings/${id}`);
        if (old) {
          if (old.scheduledStartAt !== startsAt)
            throw new AccountError(
              409,
              "Tentativa já usada para outro horário.",
            );
          return { id, replayed: true };
        }
        tx.set(`${base}/meetings/${id}`, {
          id,
          organizationId: c.organizationId,
          groupId,
          scheduledStartAt: startsAt,
          meetingStatus: "scheduled",
          createdByUserId: uid,
        });
        audit(tx, c, uid, "meeting_created", now, { groupId, meetingId: id });
        return { id };
      }
      const people = await roster(tx, c, groupId);
      if (raw.action === "attendance") {
        const meetingId = documentId(raw.meetingId, "Encontro"),
          personId = documentId(raw.personId, "Pessoa");
        if (!people.some((p) => p.id === personId))
          throw new AccountError(403, "Esta pessoa não pertence à célula.");
        const meetingPath = `${base}/meetings/${meetingId}`,
          path = `${meetingPath}/attendance/${meetingId}_${personId}`;
        const [meeting, existing] = await tx.read(meetingPath, path);
        if (
          meeting?.organizationId !== c.organizationId ||
          meeting.groupId !== groupId ||
          meeting.meetingStatus === "cancelled" ||
          !Number.isFinite(Date.parse(meeting.scheduledStartAt)) ||
          Date.parse(meeting.scheduledStartAt) > now + 3 * 3600000 ||
          Date.parse(meeting.scheduledStartAt) < now - 90 * 86400000
        )
          throw new AccountError(
            409,
            "Este encontro não está disponível para registrar presença.",
          );
        if (
          !["present", "absent", "justified", "first_time_guest"].includes(
            raw.status,
          )
        )
          throw new AccountError(400, "Situação de presença inválida.");
        if (existing?.attendanceStatus === raw.status)
          return { ok: true, replayed: true };
        if ((existing?.attendanceStatus || null) !== raw.expectedStatus)
          throw new AccountError(
            409,
            "A presença mudou. Atualize o encontro antes de salvar.",
          );
        tx.set(path, {
          id: `${meetingId}_${personId}`,
          organizationId: c.organizationId,
          groupId,
          groupMeetingId: meetingId,
          personId,
          attendanceStatus: raw.status,
          recordedByUserId: uid,
          updatedAt: new Date(now).toISOString(),
        });
        audit(tx, c, uid, "attendance_recorded", now, {
          groupId,
          personId,
          meetingId,
          status: raw.status,
        });
        return { ok: true };
      }
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
        meetings: meetings
          .slice(0, 50)
          .map((m) => ({ id: m.id, startsAt: m.scheduledStartAt })),
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
          snapshots[0]?.organizationId === a.childOrganizationId
            ? snapshots[0]
            : null;
        if (s) {
          covered++;
          members += Number(s.totalMembers || 0);
          groups += Number(s.activeGroups || 0);
        }
        out.churches.push({
          id: a.childOrganizationId,
          name: child.displayName || child.name || a.childName,
          date: s?.date || null,
          members: s ? Number(s.totalMembers || 0) : null,
          groups: s ? Number(s.activeGroups || 0) : null,
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
      out.warnings.push(
        "Os indicadores usam os últimos consolidados compartilhados por cada igreja. Não dão acesso a fichas pessoais das filiais.",
      );
      if (active.length > 50)
        out.warnings.push(
          "A visão rápida reúne até 50 igrejas. Abra Rede de Igrejas para consultar a relação completa.",
        );
      return out;
    }
    const own = person ? await ownGroups(tx, c, person.id, led) : [];
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
        "status",
        "published",
        "EQUAL",
        501,
      );
      out.events = events
        .filter(
          (e) =>
            e.organizationId === c.organizationId &&
            Date.parse(e.startsAt) >= now,
        )
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
        .slice(0, 6)
        .map((e) => ({
          id: e.id,
          name: e.name,
          startsAt: e.startsAt,
          location: e.locationName || e.location || "Local a confirmar",
        }));
      if (events.length > 500)
        out.warnings.push(
          "Há muitos eventos publicados. Abra a agenda para consultar todos os períodos.",
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
    out.birthdays = people
      .filter(
        (p) =>
          p.organizationId === c.organizationId &&
          birthdayInPeriod(p.birthDate, day(now, c.timezone), period),
      )
      .sort((a, b) => a.birthDate.slice(5).localeCompare(b.birthDate.slice(5)))
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        name: name(p),
        date: p.birthDate.slice(8, 10) + "/" + p.birthDate.slice(5, 7),
        ...(p.groupId ? { groupId: p.groupId } : {}),
      }));
    if (staff && c.enabled("groups"))
      out.metrics.push({
        key: "groups",
        label: "Células ativas",
        value: await tx.count(c.root, "groups", "status", "active"),
        href: "/groups",
      });
    if (staff && c.enabled("visitors"))
      out.metrics.push({
        key: "visitors",
        label: "Cadastros de visitantes",
        value: await tx.count(c.root, "visitorIntakes"),
        href: "/reception",
      });
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
        if (!staff && records.length >= 51)
          out.warnings.push(
            "A lista rápida de acompanhamento é parcial. Consulte a administração para conferir todos os registros.",
          );
        const targets = await tx.read(
          ...open.map((a) => `${c.root}/people/${a.personId}`),
        );
        out.absences = open.flatMap((a, i) =>
          targets[i]?.organizationId === c.organizationId &&
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
        out.metrics.push({
          key: "care",
          label: staff
            ? "Acompanhamentos em aberto"
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

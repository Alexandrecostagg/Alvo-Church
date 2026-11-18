import { whatsappHref, whatsappPhone } from "@alvo/utils";
import { assertWhatsappContactAllowed } from "./communication-operations";
import { createHash } from "node:crypto";
import {
  TRIBE_CODES,
  OPEN_TRIAL_STATES,
  tribeTrialTransition,
  isChurchStaff,
  isActiveGroupMembership,
  isCellGroup,
  isGroupLeader,
  type TribeSnapshot,
} from "@alvo/domain";
import { planHasModule } from "@alvo/firebase";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { financeActor, textField } from "./finance-operations";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";
import { boundPerson } from "./journey-operations";
type Data = Record<string, any>;
const hash = (s: string) =>
  createHash("sha256").update(s).digest("hex").slice(0, 40);
const name = (p: Data) =>
  p.preferredName ||
  [p.firstName, p.lastName].filter(Boolean).join(" ") ||
  "Pessoa";
const text = (v: any, label: string, max = 500, optional = false) =>
  textField(v, label, max, optional);
const validTribe = (v: any) => (TRIBE_CODES as readonly string[]).includes(v);
async function enabled(
  tx: AccountTransaction,
  root: string,
  key: "tribes" | "volunteers" | "groups",
) {
  await assertModuleEnabled(tx, root, key);
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
  if (!planHasModule(plan, key))
    throw new AccountError(
      403,
      "Este recurso não está incluído no plano da instituição.",
    );
}
/** Only active members of cells actually led by this linked account. */
export async function tribeScope(
  tx: AccountTransaction,
  root: string,
  orgId: string,
  uid: string,
  roles: string[],
  scope: string,
) {
  const personId = await boundPerson(tx, root, orgId, uid);
  if (scope === "personal")
    return {
      staff: false,
      manager: false,
      personId,
      ids: new Set(personId ? [personId] : []),
    };
  if (isChurchStaff(roles) && scope !== "cell_leader")
    return { staff: true, manager: true, personId, ids: null };
  if (!roles.includes("group_leader") || !personId)
    throw new AccountError(403, "É necessário um vínculo ativo de liderança.");
  await enabled(tx, root, "groups");
  const groups = await tx.query(
    root,
    "groups",
    "status",
    "active",
    "EQUAL",
    501,
  );
  if (groups.length > 500)
    throw new AccountError(
      409,
      "Há muitas células para esta consulta. Procure o suporte.",
    );
  const own = await tx.read(
    ...groups.map((g) => `${root}/groups/${g.id}/members/${g.id}_${personId}`),
  );
  const ids = new Set<string>();
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i],
      m = own[i];
    if (
      g.organizationId !== orgId ||
      !isCellGroup(g) ||
      !isActiveGroupMembership(m) ||
      !isGroupLeader(m) ||
      m?.organizationId !== orgId ||
      m.personId !== personId ||
      m.groupId !== g.id
    )
      continue;
    const rows = await tx.query(
      `${root}/groups/${g.id}`,
      "members",
      undefined,
      undefined,
      "EQUAL",
      501,
    );
    if (rows.length > 500)
      throw new AccountError(
        409,
        "Há muitos vínculos nesta célula. Procure o suporte.",
      );
    for (const row of rows)
      if (
        row.organizationId === orgId &&
        row.groupId === g.id &&
        isActiveGroupMembership(row)
      )
        ids.add(documentId(row.personId, "Pessoa"));
  }
  return { staff: false, manager: true, personId, ids };
}
export async function tribeOperation(
  body: Data,
  uid: string,
  now = Date.now(),
): Promise<any> {
  const orgId = documentId(body.organizationId, "Instituição");
  return accountTransaction(async (tx) => {
    const { root, org, actor } = await financeActor(
      tx,
      orgId,
      uid,
      false,
      null,
    );
    if (!Array.isArray(actor.roles) || !actor.roles.length)
      throw new AccountError(
        403,
        "Sua conta não tem uma função ativa nesta instituição.",
      );
    await enabled(tx, root, "tribes");
    if (!["personal", "leadership", "cell_leader"].includes(body.scope))
      throw new AccountError(400, "Escolha uma visão válida.");
    const c = await tribeScope(
      tx,
      root,
      orgId,
      uid,
      actor.roles || [],
      body.scope,
    );
    const at = new Date(now).toISOString();
    let servingEnabled = true;
    try {
      await enabled(tx, root, "volunteers");
    } catch (e) {
      if (e instanceof AccountError && e.status === 403) servingEnabled = false;
      else throw e;
    }
    const personAccess = async (id: string): Promise<Data> => {
      if (c.ids && !c.ids.has(id))
        throw new AccountError(403, "Pessoa fora do seu acompanhamento.");
      const [p] = await tx.read(`${root}/people/${id}`);
      if (
        p?.organizationId !== orgId ||
        p.status !== "active" ||
        p.personType === "child"
      )
        throw new AccountError(404, "Cadastro ativo indisponível.");
      return { ...p, id };
    };
    if (body.action === "snapshot") {
      const all = c.ids
        ? await tx.read(...[...c.ids].map((id) => `${root}/people/${id}`))
        : await tx.query(root, "people", "status", "active", "EQUAL", 1001);
      if (all.length > 1000)
        throw new AccountError(
          409,
          "Há mais de 1.000 pessoas nesta visão. Solicite uma consulta segmentada.",
        );
      const people = all.filter(
        (p): p is Data =>
          !!p &&
          p.organizationId === orgId &&
          p.status === "active" &&
          p.personType !== "child",
      );
      // read() includes stored IDs; legacy records are recovered from the scoped document path.
      if (c.ids) {
        const ids = [...c.ids];
        all.forEach((p, i) => {
          if (p) p.id = ids[i];
        });
      }
      const allowed = new Set(people.map((p) => p.id));
      const [teams, links, trials] = await Promise.all([
        servingEnabled
          ? tx.query(root, "serviceTeams", "status", "active", "EQUAL", 501)
          : [],
        servingEnabled
          ? tx.query(root, "tribeAreaLinks", undefined, undefined, "EQUAL", 501)
          : [],
        c.manager
          ? tx.query(root, "tribeTrials", undefined, undefined, "EQUAL", 1001)
          : c.personId
            ? tx.query(
                root,
                "tribeTrials",
                "personId",
                c.personId,
                "EQUAL",
                1001,
              )
            : [],
      ]);
      if (teams.length > 500 || trials.length > 1000)
        throw new AccountError(
          409,
          "Esta consulta excede o limite. Procure o suporte para segmentar o histórico.",
        );
      const result: TribeSnapshot = {
        staff: c.staff,
        manager: c.manager,
        linked: !!c.personId,
        servingEnabled,
        timezone: org.timezone || "America/Belem",
        people: people.map((p) => ({
          id: p.id,
          name: name(p),
          tribe: validTribe(p.tribePrimaryCode) ? p.tribePrimaryCode : "",
          secondary: validTribe(p.tribeSecondaryCode)
            ? p.tribeSecondaryCode
            : "",
          reason: p.tribeClassificationReason || "",
          revision: p.tribeRevision || 0,
          interests: Array.isArray(p.ministerialInterests)
            ? p.ministerialInterests
            : [],
          servingProfile: p.servingProfile || "",
          availability: Array.isArray(p.availability) ? p.availability : [],
        })),
        areas: teams
          .filter((t) => t.organizationId === orgId)
          .map((t) => {
            const l = links.find(
              (l) => l.id === t.id && l.organizationId === orgId,
            );
            return {
              id: t.id,
              name: t.name,
              summary: t.summary || "",
              roles: t.roles || [],
              tribe: l?.tribe || "",
              revision: l?.revision || 0,
            };
          }),
        trials: trials
          .filter((t) => t.organizationId === orgId && allowed.has(t.personId))
          .map((t) => ({
            id: t.id,
            personId: t.personId,
            personName: people.find((p) => p.id === t.personId)
              ? name(people.find((p) => p.id === t.personId)!)
              : "Pessoa",
            areaId: t.areaId,
            areaName: t.areaName,
            status: t.status,
            revision: t.revision,
            purpose: t.purpose || "",
            scheduledAt: t.scheduledAt || "",
            feedback: t.feedback || "",
            interest: t.interest || "",
            outcome: t.outcome || "",
            updatedAt: t.updatedAt,
            responseSource: t.responseSource || "",
            responseNote: t.responseNote || "",
          }))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      };
      return result;
    }
    if (body.action === "contact") {
      if (!c.manager)
        throw new AccountError(
          403,
          "Somente a liderança prepara este convite.",
        );
      const p = await personAccess(documentId(body.personId, "Pessoa"));
      const [trial] = await tx.read(
        `${root}/tribeTrials/${documentId(body.id, "Experiência")}`,
      );
      if (
        trial?.organizationId !== orgId ||
        trial.personId !== p.id ||
        !["invited", "accepted"].includes(trial.status)
      )
        throw new AccountError(409, "Não há convite ativo para esta pessoa.");
      const message = `Olá, ${name(p)}! Aqui é da ${org.displayName || org.name || "sua igreja"}. Gostaríamos de conversar sobre sua experiência em ${trial.areaName}, em ${new Date(trial.scheduledAt).toLocaleString("pt-BR", { timeZone: org.timezone || "America/Belem" })}. ${trial.purpose} Você pode conferir o convite em Meu lugar para servir, no Esdras. Pode nos dizer se deseja participar?`;
      const phone = whatsappPhone(p.whatsappPhone || p.mobilePhone),
        url = whatsappHref(p, message);
      if (!url || !phone)
        throw new AccountError(
          409,
          "Telefone inválido ou contato sem permissão para mensagens.",
        );
      await assertWhatsappContactAllowed(tx, root, phone);
      return { url, message };
    }
    const opId = documentId(body.requestId, "Identificador da operação"),
      attempt = `${root}/tribeAttempts/${uid}_${opId}`;
    const [previous] = await tx.read(attempt);
    if (previous) {
      if (previous.digest !== hash(JSON.stringify(body)))
        throw new AccountError(
          409,
          "Identificador já usado em outra operação.",
        );
      return previous.result;
    }
    const save = (result: Data) => {
      tx.set(attempt, {
        organizationId: orgId,
        actorId: uid,
        action: body.action,
        digest: hash(JSON.stringify(body)),
        result,
        at,
      });
      return result;
    };
    const checkRevision = (d: Data | null) => {
      if (
        !Number.isInteger(body.revision) ||
        body.revision !== (d?.revision || 0)
      )
        throw new AccountError(
          409,
          "O registro mudou. Atualize a tela antes de salvar.",
        );
    };
    if (body.action === "classify") {
      if (!c.staff)
        throw new AccountError(
          403,
          "A revisão da tribo é feita pela equipe pastoral ou administração.",
        );
      const p = await personAccess(documentId(body.personId, "Pessoa"));
      checkRevision({ revision: p.tribeRevision || 0 });
      if (
        !validTribe(body.tribe) ||
        (body.secondary &&
          (!validTribe(body.secondary) || body.secondary === body.tribe))
      )
        throw new AccountError(400, "Confira a tribo principal e secundária.");
      if (body.memberAgreed !== true)
        throw new AccountError(
          400,
          "Converse com a pessoa e confirme sua concordância antes de registrar.",
        );
      const reason = text(body.reason, "Motivo da revisão");
      tx.patch(`${root}/people/${p.id}`, {
        tribePrimaryCode: body.tribe,
        tribeSecondaryCode: body.secondary || null,
        tribeClassificationReason: reason,
        tribeClassificationSource: "manual",
        tribeClassifiedAt: at,
        tribeRevision: (p.tribeRevision || 0) + 1,
      });
      tx.set(`${root}/people/${p.id}/tribeHistory/${opId}`, {
        id: opId,
        organizationId: orgId,
        personId: p.id,
        oldPrimaryTribeCode: p.tribePrimaryCode || null,
        newPrimaryTribeCode: body.tribe,
        oldSecondaryTribeCode: p.tribeSecondaryCode || null,
        newSecondaryTribeCode: body.secondary || null,
        reason,
        source: "manual",
        changeType: p.tribePrimaryCode
          ? "full_reclassification"
          : "initial_assignment",
        effectiveFrom: at,
        actorId: uid,
        memberAgreementAttestedBy: uid,
      });
      return save({ ok: true });
    }
    if (!servingEnabled)
      throw new AccountError(
        403,
        "Ative o módulo de Escalas para oferecer experiências de serviço.",
      );
    if (body.action === "map-area") {
      if (!c.staff)
        throw new AccountError(
          403,
          "Somente a administração configura as áreas.",
        );
      const id = documentId(body.areaId, "Área");
      const [area, link] = await tx.read(
        `${root}/serviceTeams/${id}`,
        `${root}/tribeAreaLinks/${id}`,
      );
      if (area?.organizationId !== orgId || area.status !== "active")
        throw new AccountError(404, "Área indisponível.");
      checkRevision(link);
      if (body.tribe && !validTribe(body.tribe))
        throw new AccountError(400, "Tribo inválida.");
      tx.set(`${root}/tribeAreaLinks/${id}`, {
        id,
        organizationId: orgId,
        tribe: body.tribe || "",
        revision: (link?.revision || 0) + 1,
        updatedAt: at,
        updatedBy: uid,
      });
      return save({ ok: true });
    }
    const personId = c.manager
      ? documentId(body.personId, "Pessoa")
      : c.personId;
    if (!personId)
      throw new AccountError(
        403,
        "Peça à secretaria para vincular sua conta ao cadastro.",
      );
    const person = await personAccess(personId);
    if (body.action === "request" || body.action === "create-invite") {
      if ((body.action === "request") === c.manager)
        throw new AccountError(403, "Operação não permitida nesta visão.");
      const areaId = documentId(body.areaId, "Área"),
        id = hash(`${personId}:${areaId}`),
        path = `${root}/tribeTrials/${id}`;
      const [area, old] = await tx.read(`${root}/serviceTeams/${areaId}`, path);
      if (area?.organizationId !== orgId || area.status !== "active")
        throw new AccountError(404, "Área indisponível.");
      if (old && OPEN_TRIAL_STATES.includes(old.status))
        throw new AccountError(
          409,
          "Já existe uma experiência em andamento para essa pessoa e área.",
        );
      const purpose = c.manager
        ? text(body.purpose, "Atividade combinada")
        : text(body.purpose, "Interesse", 500, true);
      const scheduledAt = c.manager ? validateDate(body.scheduledAt, now) : "";
      const revision = (old?.revision || 0) + 1;
      const record = {
        id,
        organizationId: orgId,
        personId,
        areaId,
        areaName: area.name,
        status: c.manager ? "invited" : "requested",
        purpose,
        scheduledAt,
        revision,
        feedback: "",
        interest: "",
        outcome: "",
        createdBy: uid,
        createdAt: at,
        updatedAt: at,
      };
      tx.set(path, record);
      tx.set(`${path}/history/${opId}`, {
        ...record,
        actorId: uid,
        action: body.action,
      });
      return save({ ok: true, id });
    }
    const id = documentId(body.id, "Experiência"),
      path = `${root}/tribeTrials/${id}`;
    const [trial] = await tx.read(path);
    if (trial?.organizationId !== orgId || trial.personId !== person.id)
      throw new AccountError(404, "Experiência indisponível.");
    checkRevision(trial);
    const manualResponse = body.action === "record-response";
    if (
      manualResponse &&
      (!c.manager ||
        body.confirmedByPerson !== true ||
        !["accept", "decline", "feedback"].includes(body.response))
    )
      throw new AccountError(
        400,
        "Registre apenas uma resposta recebida da própria pessoa.",
      );
    const transitionAction = manualResponse ? body.response : body.action;
    const next = tribeTrialTransition(
      trial.status,
      transitionAction,
      manualResponse ? false : c.manager,
    );
    if (!next)
      throw new AccountError(
        409,
        "Esta ação não está disponível na etapa atual. Atualize a tela.",
      );
    const patch: Data = {
      status: next,
      revision: trial.revision + 1,
      updatedAt: at,
      updatedBy: uid,
    };
    if (manualResponse) {
      patch.responseSource = "leadership_record";
      patch.responseNote = text(body.responseNote, "Resposta recebida", 1000);
      patch.responseRecordedBy = uid;
    } else if (!c.manager) {
      patch.responseSource = "person";
      patch.responseNote = "";
    }
    if (["invite", "accept"].includes(transitionAction)) {
      const [area] = await tx.read(`${root}/serviceTeams/${trial.areaId}`);
      if (area?.organizationId !== orgId || area.status !== "active")
        throw new AccountError(
          409,
          "A área foi desativada. Converse com a liderança.",
        );
    }
    if (body.action === "invite") {
      patch.purpose = text(body.purpose, "Atividade combinada");
      patch.scheduledAt = validateDate(body.scheduledAt, now);
    }
    if (transitionAction === "accept" && Date.parse(trial.scheduledAt) <= now)
      throw new AccountError(
        409,
        "A data passou. Peça à liderança um novo convite.",
      );
    if (transitionAction === "feedback") {
      if (Date.parse(trial.scheduledAt) > now)
        throw new AccountError(
          409,
          "O retorno fica disponível a partir da data combinada.",
        );
      if (!["continue", "explore", "pause"].includes(body.interest))
        throw new AccountError(400, "Informe como deseja continuar.");
      patch.interest = body.interest;
      patch.feedback = text(body.feedback, "Seu retorno", 1000);
    }
    if (body.action === "close")
      patch.outcome = text(body.outcome, "Próximo passo acordado", 1000);
    tx.patch(path, patch);
    tx.set(`${path}/history/${opId}`, {
      organizationId: orgId,
      actorId: uid,
      action: body.action,
      before: trial.status,
      after: next,
      at,
      ...patch,
    });
    return save({ ok: true, id });
  });
}
function validateDate(raw: any, now: number) {
  const s = text(raw, "Data da experiência", 40),
    time = Date.parse(s);
  if (
    !/(Z|[+-]\d\d:\d\d)$/.test(s) ||
    !Number.isFinite(time) ||
    time <= now ||
    time > now + 180 * 86400000
  )
    throw new AccountError(
      400,
      "Escolha uma data futura, dentro dos próximos 180 dias.",
    );
  return new Date(time).toISOString();
}

/** Dashboard totals use the same scope as the workflow. No personal details in the card. */
export async function tribeHomeSummary(
  tx: AccountTransaction,
  root: string,
  orgId: string,
  uid: string,
  roles: string[],
  profile: string,
  now: number,
) {
  const scope =
    profile === "member"
      ? "personal"
      : profile === "cell_leader"
        ? "cell_leader"
        : "leadership";
  const c = await tribeScope(tx, root, orgId, uid, roles, scope);
  const rows = c.manager
    ? await tx.query(root, "tribeTrials", undefined, undefined, "EQUAL", 1001)
    : c.personId
      ? await tx.query(
          root,
          "tribeTrials",
          "personId",
          c.personId,
          "EQUAL",
          1001,
        )
      : [];
  if (rows.length > 1000)
    throw new AccountError(
      409,
      "Histórico de experiências acima do limite da visão rápida.",
    );
  const scoped = rows.filter(
    (t) => t.organizationId === orgId && (!c.ids || c.ids.has(t.personId)),
  );
  const ids = [...new Set(scoped.map((t) => t.personId))];
  const people = await tx.read(
    ...ids.map((id) => `${root}/people/${documentId(id, "Pessoa")}`),
  );
  const active = new Set(
    ids.filter(
      (id, i) =>
        people[i]?.organizationId === orgId &&
        people[i]?.status === "active" &&
        people[i]?.personType !== "child",
    ),
  );
  const pending = scoped.filter(
    (t) =>
      active.has(t.personId) &&
      (c.manager
        ? ["requested", "completed"].includes(t.status) ||
          (["invited", "accepted"].includes(t.status) &&
            Date.parse(t.scheduledAt) <= now)
        : t.status === "invited" ||
          (t.status === "accepted" && Date.parse(t.scheduledAt) <= now)),
  ).length;
  return {
    pending,
    href: c.manager
      ? `/tribes${scope === "cell_leader" ? "?scope=cell_leader" : ""}`
      : "/my-tribe",
  };
}

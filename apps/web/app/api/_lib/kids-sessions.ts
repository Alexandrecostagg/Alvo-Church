import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { documentId } from "./member-account";
const ADMIN = ["super_admin", "church_admin", "pastor", "secretary"];
export const isKidsAdmin = (actor: any) =>
  Array.isArray(actor?.roles) &&
  actor.roles.some((r: string) => ADMIN.includes(r));
export function eligibleKids(actor: any, settings: any, orgId: string) {
  return (
    actor?.organizationId === orgId &&
    actor.isActive === true &&
    (isKidsAdmin(actor) ||
      actor.roles?.some((r: string) => settings?.qrGeneratorRoles?.includes(r)))
  );
}
export async function kidsActor(
  tx: AccountTransaction,
  orgId: string,
  uid: string,
) {
  documentId(orgId, "Igreja");
  documentId(uid, "Conta");
  const root = `organizations/${orgId}`;
  const [org, actor, settings] = await tx.read(
    root,
    `${root}/users/${uid}`,
    `${root}/settings/kids`,
  );
  if (org?.status !== "active" || !eligibleKids(actor, settings, orgId))
    throw new AccountError(403, "Acesso restrito à equipe Kids ativa.");
  return { actor, settings, root };
}
export async function authorizeSession(
  tx: AccountTransaction,
  orgId: string,
  uid: string,
  sessionId: unknown,
  entry = false,
) {
  const { actor, settings, root } = await kidsActor(tx, orgId, uid);
  if (!sessionId) {
    if (isKidsAdmin(actor) && !entry) return null; // Administrative recovery of legacy check-ins.
    throw new AccountError(
      409,
      "Escolha uma sessão Kids com sala, evento e equipe confirmados.",
    );
  }
  const id = documentId(sessionId, "Sessão");
  const [session] = await tx.read(`${root}/kidsOperationSessions/${id}`);
  if (
    !session ||
    session.organizationId !== orgId ||
    session.status !== "open" ||
    (!isKidsAdmin(actor) && !session.operatorIds?.includes(uid))
  )
    throw new AccountError(
      403,
      "Você não está escalado nesta sessão Kids ou ela foi encerrada.",
    );
  if (entry) {
    const [event, team] = await tx.read(
      `${root}/events/${session.eventId}`,
      `${root}/serviceTeams/${session.serviceTeamId}`,
    );
    if (
      !settings?.kidsTeamIds?.includes(session.serviceTeamId) ||
      team?.organizationId !== orgId ||
      team.status === "inactive" ||
      event?.organizationId !== orgId ||
      event.status === "cancelled"
    )
      throw new AccountError(
        409,
        "Sala ou evento indisponível para novas entradas.",
      );
    if (
      Date.now() < Date.parse(session.startsAt) ||
      Date.now() > Date.parse(session.endsAt)
    )
      throw new AccountError(409, "Fora do horário de entrada desta sessão.");
    if (
      !Number.isInteger(session.occupancy) ||
      session.occupancy < 0 ||
      session.occupancy >= session.capacity
    )
      throw new AccountError(
        409,
        "Sala sem vagas. Confira a ocupação antes de continuar.",
      );
  }
  return session;
}
export function sessionInput(raw: any) {
  const organizationId = documentId(raw.organizationId, "Igreja"),
    id = documentId(raw.sessionId, "Sessão");
  const serviceTeamId = documentId(raw.serviceTeamId, "Sala"),
    eventId = documentId(raw.eventId, "Evento");
  if (
    !Number.isInteger(raw.capacity) ||
    raw.capacity < 1 ||
    raw.capacity > 100 ||
    !Number.isInteger(raw.expectedVersion) ||
    raw.expectedVersion < 0
  )
    throw new AccountError(
      400,
      "Informe capacidade de 1 a 100 e versão válida.",
    );
  if (
    !Array.isArray(raw.operatorIds) ||
    raw.operatorIds.length < 1 ||
    raw.operatorIds.length > 20
  )
    throw new AccountError(400, "Selecione de 1 a 20 operadores.");
  const operatorIds: string[] = [
    ...new Set<string>(
      raw.operatorIds.map((id: unknown) => documentId(id, "Operador")),
    ),
  ];
  const start = Date.parse(raw.startsAt),
    end = Date.parse(raw.endsAt);
  if (
    typeof raw.startsAt !== "string" ||
    typeof raw.endsAt !== "string" ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > 86400000
  )
    throw new AccountError(
      400,
      "Informe início e fim com duração máxima de 24 horas.",
    );
  return {
    organizationId,
    id,
    serviceTeamId,
    eventId,
    capacity: raw.capacity as number,
    expectedVersion: raw.expectedVersion as number,
    operatorIds,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
  };
}
export async function configureSession(raw: any, uid: string) {
  const input = sessionInput(raw),
    { organizationId, id, expectedVersion, ...values } = input;
  return accountTransaction(async (tx) => {
    const { actor, settings, root } = await kidsActor(tx, organizationId, uid);
    if (!isKidsAdmin(actor))
      throw new AccountError(
        403,
        "Somente a administração pode confirmar a escala Kids.",
      );
    const [current, team, event, ...operators] = await tx.read(
      `${root}/kidsOperationSessions/${id}`,
      `${root}/serviceTeams/${input.serviceTeamId}`,
      `${root}/events/${input.eventId}`,
      ...input.operatorIds.map((id) => `${root}/users/${id}`),
    );
    if ((current?.version ?? 0) !== expectedVersion)
      throw new AccountError(409, "Sessão alterada. Atualize antes de salvar.");
    if (current?.status === "closed")
      throw new AccountError(
        409,
        "Uma sessão encerrada não pode ser reaberta.",
      );
    if (
      !settings?.kidsTeamIds?.includes(input.serviceTeamId) ||
      team?.organizationId !== organizationId ||
      team.status === "inactive" ||
      event?.organizationId !== organizationId ||
      event.status === "cancelled"
    )
      throw new AccountError(
        409,
        "Selecione uma sala Kids configurada e um evento ativo da igreja.",
      );
    if (operators.some((op) => !eligibleKids(op, settings, organizationId)))
      throw new AccountError(
        409,
        "Todos os operadores precisam de conta ativa e papel habilitado no Kids.",
      );
    if (
      current &&
      (current.serviceTeamId !== input.serviceTeamId ||
        current.eventId !== input.eventId)
    )
      throw new AccountError(
        409,
        "Sala e evento são fixos. Crie outra sessão.",
      );
    if (current && current.occupancy > input.capacity)
      throw new AccountError(409, "Capacidade menor que a ocupação atual.");
    const lockPath = `${root}/kidsRoomLocks/${input.serviceTeamId}`;
    const [roomLock] = await tx.read(lockPath);
    const openSessions = await tx.query(
      root,
      "kidsOperationSessions",
      "status",
      "open",
      "EQUAL",
      201,
    );
    if (openSessions.length > 200)
      throw new AccountError(
        409,
        "Encerre as sessões antigas antes de abrir outra.",
      );
    if (
      openSessions.some(
        (s) =>
          s.id !== id &&
          s.serviceTeamId === input.serviceTeamId &&
          (s.occupancy > 0 ||
            (Date.parse(s.startsAt) < Date.parse(input.endsAt) &&
              Date.parse(s.endsAt) > Date.parse(input.startsAt))),
      )
    )
      throw new AccountError(
        409,
        "Esta sala já possui sessão no horário ou crianças presentes.",
      );
    tx.set(lockPath, { version: (roomLock?.version ?? 0) + 1 });
    const session = {
      ...values,
      id,
      organizationId,
      roomName: team.name,
      eventName: event.name,
      status: "open",
      occupancy: current?.occupancy ?? 0,
      version: expectedVersion + 1,
      updatedBy: uid,
      updatedAt: new Date().toISOString(),
    };
    tx.set(`${root}/kidsOperationSessions/${id}`, session);
    tx.set(`${root}/kidsCustodyAudit/${crypto.randomUUID()}`, {
      action: "session_configured",
      sessionId: id,
      actorId: uid,
      previousOperatorIds: current?.operatorIds ?? [],
      operatorIds: input.operatorIds,
      version: session.version,
      at: session.updatedAt,
    });
    return { session };
  });
}
export async function kidsOperations(raw: any, uid: string) {
  if (raw.action === "configure") return configureSession(raw, uid);
  const orgId = documentId(raw.organizationId, "Igreja");
  return accountTransaction(async (tx) => {
    const { actor, settings, root } = await kidsActor(tx, orgId, uid);
    if (raw.action === "sessions") {
      const sessions = await tx.query(
        root,
        "kidsOperationSessions",
        isKidsAdmin(actor) ? "status" : "operatorIds",
        isKidsAdmin(actor) ? "open" : uid,
        isKidsAdmin(actor) ? "EQUAL" : "ARRAY_CONTAINS",
        200,
        isKidsAdmin(actor) ? undefined : { field: "status", value: "open" },
      );
      return {
        sessions: sessions.filter((s) => s.status === "open"),
        admin: isKidsAdmin(actor),
      };
    }
    if (raw.action === "close") {
      if (!isKidsAdmin(actor))
        throw new AccountError(403, "Somente a administração encerra sessões.");
      const session = await authorizeSession(tx, orgId, uid, raw.sessionId);
      if (
        !session ||
        session.version !== raw.expectedVersion ||
        session.occupancy !== 0
      )
        throw new AccountError(
          409,
          "Atualize a sessão e retire todas as crianças antes de encerrar.",
        );
      tx.patch(`${root}/kidsOperationSessions/${session.id}`, {
        status: "closed",
        version: session.version + 1,
      });
      tx.set(`${root}/kidsCustodyAudit/${crypto.randomUUID()}`, {
        action: "session_closed",
        sessionId: session.id,
        actorId: uid,
        at: new Date().toISOString(),
      });
      return { ok: true };
    }
    if (raw.action === "list") {
      await authorizeSession(tx, orgId, uid, raw.sessionId);
      const rows = await tx.query(
        root,
        "kidsCheckIns",
        raw.sessionId ? "sessionId" : "status",
        raw.sessionId || "checked_in",
        "EQUAL",
        501,
        raw.sessionId ? { field: "status", value: "checked_in" } : undefined,
      );
      if (rows.length > 500)
        throw new AccountError(
          409,
          "Selecione uma sessão para consultar as crianças presentes.",
        );
      return { checkIns: rows.filter((r) => r.status === "checked_in") };
    }
    if (raw.action === "lookup") {
      if (
        typeof raw.proof !== "string" ||
        !raw.proof.trim() ||
        raw.proof.length > 128
      )
        throw new AccountError(400, "Informe o QR ou código.");
      const proof = raw.proof.trim();
      const rows = await tx.query(
        root,
        "kidsCheckIns",
        proof.startsWith("KID-") ? "securityToken" : "pickupCode",
        proof.startsWith("KID-") ? proof : proof.toUpperCase(),
        "EQUAL",
        2,
      );
      if (rows.length !== 1 || rows[0].status !== "checked_in")
        throw new AccountError(404, "Check-in ativo não encontrado.");
      await authorizeSession(tx, orgId, uid, rows[0].sessionId);
      return { checkIn: rows[0] };
    }
    throw new AccountError(400, "Operação inválida.");
  });
}

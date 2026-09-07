import { createHash } from "node:crypto";
import { AccountError, accountTransaction, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";

const EVENT_OPERATORS = ["super_admin", "church_admin", "pastor", "secretary"];

function text(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== "string" || (required && !value.trim()) || value.trim().length > max) {
    throw new AccountError(400, `${label} inválido.`);
  }
  return value.trim();
}

function eventInput(raw: unknown, action: "guest" | "member" | "checkin" | "payment") {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AccountError(400, "Operação de evento inválida.");
  const data = raw as Record<string, unknown>;
  const common = {
    organizationId: documentId(data.organizationId, "Igreja"),
    eventId: documentId(data.eventId, "Evento"),
  };
  if (action === "guest") {
    const email = text(data.email ?? "", "E-mail", 254, false).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccountError(400, "E-mail inválido.");
    return {
      ...common,
      requestId: documentId(data.requestId, "Tentativa"),
      firstName: text(data.firstName, "Nome", 80),
      lastName: text(data.lastName ?? "", "Sobrenome", 120, false),
      email,
    };
  }
  if (action === "member") return { ...common, requestId: documentId(data.requestId, "Tentativa") };
  return { ...common, registrationId: documentId(data.registrationId, "Inscrição") };
}

async function authorize(tx: AccountTransaction, orgId: string, uid: string, operator = true) {
  documentId(uid, "Conta");
  const root = `organizations/${orgId}`;
  const [org, actor] = await tx.read(root, `${root}/users/${uid}`);
  const roles = Array.isArray(actor?.roles) ? actor.roles : [];
  if (!org || org.status !== "active" || !actor || actor.organizationId !== orgId || actor.isActive !== true || (operator && !roles.some((role: string) => EVENT_OPERATORS.includes(role)))) {
    throw new AccountError(403, "Você não pode operar eventos nesta igreja.");
  }
  return root;
}

export async function registerEventMember(raw: unknown, uid: string) {
  const input = eventInput(raw, "member") as ReturnType<typeof eventInput> & { requestId: string };
  return accountTransaction(async (tx) => {
    const root = await authorize(tx, input.organizationId, uid, false);
    const eventPath = `${root}/events/${input.eventId}`;
    const registrationId = `member_${documentId(uid, "Conta")}`;
    const registrationPath = `${eventPath}/registrations/${registrationId}`;
    const attemptPath = `${root}/eventAttempts/${uid}_${input.requestId}`;
    const [event, existing, attempt, actor] = await tx.read(eventPath, registrationPath, attemptPath, `${root}/users/${uid}`);
    if (!event || event.organizationId !== input.organizationId || event.status !== "published") throw new AccountError(404, "Evento indisponível para inscrição.");
    const fingerprint = createHash("sha256").update(`${input.eventId}:${uid}`).digest("hex");
    if (attempt) {
      if (attempt.fingerprint !== fingerprint) throw new AccountError(409, "Esta tentativa já pertence a outro evento.");
      return { registration: attempt.registration, replayed: true };
    }
    if (existing && existing.status !== "cancelled") return { registration: existing, replayed: true };
    const registrations = await tx.query(eventPath, "registrations", undefined, undefined, "EQUAL", 1001);
    const activeCount = registrations.filter((registration) => registration.status !== "cancelled").length;
    if (typeof event.capacity === "number" && event.capacity > 0 && activeCount >= event.capacity) throw new AccountError(409, "A capacidade deste evento foi atingida.");
    const now = new Date().toISOString();
    const registration = {
      id: registrationId,
      organizationId: input.organizationId,
      eventId: input.eventId,
      responsiblePersonId: uid,
      registrationCode: `ESD-${createHash("sha256").update(`${input.organizationId}:${input.eventId}:${uid}`).digest("hex").slice(0, 8).toUpperCase()}`,
      status: "confirmed",
      paymentStatus: event.isPaid === true ? "pending" : "not_required",
      registeredAt: now,
      personName: typeof actor?.displayName === "string" ? actor.displayName : null,
      personEmail: typeof actor?.email === "string" ? actor.email : null,
    };
    tx.set(registrationPath, registration);
    tx.set(attemptPath, { organizationId: input.organizationId, fingerprint, registration, createdAt: now });
    tx.set(`${root}/eventAttendanceAudit/${crypto.randomUUID()}`, {
      organizationId: input.organizationId, eventId: input.eventId, registrationId,
      action: "member_registered", actorId: uid, at: now,
    });
    return { registration, replayed: false };
  });
}

export async function registerEventGuest(raw: unknown, uid: string) {
  const input = eventInput(raw, "guest") as ReturnType<typeof eventInput> & { requestId: string; firstName: string; lastName: string; email: string };
  return accountTransaction(async (tx) => {
    const root = await authorize(tx, input.organizationId, uid);
    const eventPath = `${root}/events/${input.eventId}`;
    const attemptPath = `${root}/eventAttempts/${uid}_${input.requestId}`;
    const [event, attempt] = await tx.read(eventPath, attemptPath);
    if (!event || event.organizationId !== input.organizationId || !["published", "draft"].includes(event.status)) throw new AccountError(404, "Evento indisponível para inscrição.");
    const fingerprint = createHash("sha256").update(`${input.eventId}:${input.firstName}:${input.lastName}:${input.email}`).digest("hex");
    if (attempt) {
      if (attempt.fingerprint !== fingerprint) throw new AccountError(409, "Esta tentativa já registrou outro convidado.");
      return { registration: attempt.registration, replayed: true };
    }
    const registrations = await tx.query(eventPath, "registrations", undefined, undefined, "EQUAL", 1001);
    const activeCount = registrations.filter((registration) => registration.status !== "cancelled").length;
    if (typeof event.capacity === "number" && event.capacity > 0 && activeCount >= event.capacity) throw new AccountError(409, "A capacidade deste evento foi atingida.");
    const id = `reg_${input.requestId}`;
    const now = new Date().toISOString();
    const registration = {
      id,
      organizationId: input.organizationId,
      eventId: input.eventId,
      responsiblePersonId: `guest_${input.requestId}`,
      registrationCode: `ESD-${createHash("sha256").update(`${input.organizationId}:${input.eventId}:${id}`).digest("hex").slice(0, 8).toUpperCase()}`,
      status: "confirmed",
      paymentStatus: event.isPaid === true ? "pending" : "not_required",
      registeredAt: now,
      registeredByUserId: uid,
      personName: `${input.firstName} ${input.lastName}`.trim(),
      personEmail: input.email || null,
    };
    tx.set(`${eventPath}/registrations/${id}`, registration);
    tx.set(attemptPath, { organizationId: input.organizationId, fingerprint, registration, createdAt: now });
    tx.set(`${root}/eventAttendanceAudit/${crypto.randomUUID()}`, {
      organizationId: input.organizationId, eventId: input.eventId, registrationId: id,
      action: "guest_registered", actorId: uid, at: now,
    });
    return { registration, replayed: false };
  });
}

export async function checkInEventRegistration(raw: unknown, uid: string) {
  const input = eventInput(raw, "checkin") as ReturnType<typeof eventInput> & { registrationId: string };
  return accountTransaction(async (tx) => {
    const root = await authorize(tx, input.organizationId, uid);
    const eventPath = `${root}/events/${input.eventId}`;
    const registrationPath = `${eventPath}/registrations/${input.registrationId}`;
    const [event, registration] = await tx.read(eventPath, registrationPath);
    if (!event || event.organizationId !== input.organizationId || !registration || registration.organizationId !== input.organizationId || registration.eventId !== input.eventId) throw new AccountError(404, "Ingresso não encontrado neste evento.");
    if (registration.status !== "confirmed") throw new AccountError(409, "Esta inscrição não está confirmada.");
    if (event.isPaid === true && registration.paymentStatus !== "paid") throw new AccountError(409, "Confirme o pagamento antes do check-in.");
    if (registration.checkedInAt) return { registration, replayed: true };
    const now = new Date().toISOString();
    const updated = { ...registration, checkedInAt: now, checkedInByUserId: uid };
    tx.patch(registrationPath, { checkedInAt: now, checkedInByUserId: uid });
    tx.set(`${root}/eventAttendanceAudit/${crypto.randomUUID()}`, {
      organizationId: input.organizationId, eventId: input.eventId, registrationId: input.registrationId,
      action: "checked_in", actorId: uid, at: now,
    });
    return { registration: updated, replayed: false };
  });
}

export async function confirmEventPayment(raw: unknown, uid: string) {
  const input = eventInput(raw, "payment") as ReturnType<typeof eventInput> & { registrationId: string };
  return accountTransaction(async (tx) => {
    const root = await authorize(tx, input.organizationId, uid);
    const eventPath = `${root}/events/${input.eventId}`;
    const registrationPath = `${eventPath}/registrations/${input.registrationId}`;
    const [event, registration] = await tx.read(eventPath, registrationPath);
    if (!event || event.organizationId !== input.organizationId || event.isPaid !== true || !registration || registration.organizationId !== input.organizationId || registration.eventId !== input.eventId) throw new AccountError(404, "Cobrança de evento não encontrada.");
    if (registration.status === "cancelled") throw new AccountError(409, "A inscrição está cancelada.");
    if (registration.paymentStatus === "paid") return { registration, replayed: true };
    if (registration.paymentStatus !== "pending") throw new AccountError(409, "Esta inscrição não possui pagamento pendente.");
    const now = new Date().toISOString();
    const updated = { ...registration, paymentStatus: "paid", paymentConfirmedAt: now, paymentConfirmedByUserId: uid };
    tx.patch(registrationPath, { paymentStatus: "paid", paymentConfirmedAt: now, paymentConfirmedByUserId: uid });
    tx.set(`${root}/eventAttendanceAudit/${crypto.randomUUID()}`, {
      organizationId: input.organizationId, eventId: input.eventId, registrationId: input.registrationId,
      action: "payment_confirmed", actorId: uid, at: now,
    });
    return { registration: updated, replayed: false };
  });
}

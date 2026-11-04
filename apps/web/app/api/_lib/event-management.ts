import { createHash } from "node:crypto";
import { AccountError, accountTransaction, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";

const EVENT_MANAGERS = ["super_admin", "church_admin", "pastor", "secretary"];
const EVENT_TYPES = ["service", "conference", "retreat", "training", "integration_class", "kids_event"];
const EVENT_STATUSES = ["draft", "published", "closed", "cancelled"];
const LOCATION_TYPES = ["onsite", "online", "hybrid"];

type EventOperation =
  | { action: "remove"; organizationId: string; requestId: string; eventId: string }
  | { action: "save"; organizationId: string; requestId: string; eventId: string; name: string; description: string; type: string; status: string; locationType: string; startsAt: string; endsAt: string | null; capacity: number; isPaid: boolean; locationName: string; priceAmount: number };

function text(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new AccountError(400, `${label} inválido.`);
  return value.trim();
}

function enumValue(value: unknown, label: string, values: string[]) {
  const result = text(value, label, 40);
  if (!values.includes(result)) throw new AccountError(400, `${label} inválido.`);
  return result;
}

function dateTime(value: unknown, label: string, required = true) {
  const result = text(value ?? "", label, 40, required);
  if (!result) return null;
  const date = new Date(result);
  if (!Number.isFinite(date.getTime())) throw new AccountError(400, `${label} inválido.`);
  return date.toISOString();
}

function slugify(value: string) {
  const slug = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
  return slug || "evento";
}

function input(raw: unknown): EventOperation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AccountError(400, "Operação de evento inválida.");
  const data = raw as Record<string, unknown>;
  const action = enumValue(data.action, "Operação", ["save", "remove"]);
  const base = {
    organizationId: documentId(data.organizationId, "Igreja"),
    requestId: documentId(data.requestId, "Tentativa"),
    eventId: documentId(data.eventId, "Evento"),
  };
  if (action === "remove") return { ...base, action: "remove" };
  const startsAt = dateTime(data.startsAt, "Início")!;
  const endsAt = dateTime(data.endsAt, "Fim", false);
  if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) throw new AccountError(400, "O fim deve ser posterior ao início.");
  const capacity = Number(data.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) throw new AccountError(400, "Capacidade inválida.");
  const isPaid = data.isPaid === true;
  const priceAmount = isPaid ? Number(data.priceAmount) : 0;
  if (!Number.isFinite(priceAmount) || priceAmount < 0.01 || priceAmount > 1000000) {
    if (isPaid) throw new AccountError(400, "Valor do ingresso inválido.");
  }
  return {
    ...base,
    action: "save",
    name: text(data.name, "Nome", 180),
    description: text(data.description ?? "", "Descrição", 5000, false),
    type: enumValue(data.type, "Tipo", EVENT_TYPES),
    status: enumValue(data.status, "Status", EVENT_STATUSES),
    locationType: enumValue(data.locationType, "Localização", LOCATION_TYPES),
    startsAt,
    endsAt,
    capacity,
    isPaid,
    locationName: text(data.locationName ?? "", "Local", 240, false),
    priceAmount,
  };
}

async function authorize(tx: AccountTransaction, orgId: string, uid: string) {
  documentId(uid, "Conta");
  const root = `organizations/${orgId}`;
  await assertModuleEnabled(tx, root, "events");
  const [org, actor] = await tx.read(root, `${root}/users/${uid}`);
  const roles = Array.isArray(actor?.roles) ? actor.roles : [];
  if (!org || org.status !== "active" || !actor || actor.organizationId !== orgId || actor.isActive !== true || !roles.some((role: string) => EVENT_MANAGERS.includes(role))) {
    throw new AccountError(403, "Você não pode gerenciar eventos nesta igreja.");
  }
  return root;
}

export async function manageEvent(raw: unknown, uid: string) {
  const operation = input(raw);
  const digest = createHash("sha256").update(JSON.stringify(operation)).digest("hex");
  return accountTransaction(async (tx) => {
    const root = await authorize(tx, operation.organizationId, uid);
    const eventPath = `${root}/events/${operation.eventId}`;
    const attemptPath = `${root}/eventManagementAttempts/${uid}_${operation.requestId}`;
    const [attempt] = await tx.read(attemptPath);
    if (attempt) {
      if (attempt.fingerprint !== digest) throw new AccountError(409, "Esta tentativa já foi usada em outra alteração.");
      return { ...attempt.result, replayed: true };
    }

    const now = new Date().toISOString();
    let result: Record<string, unknown>;
    if (operation.action === "save") {
      const [existing] = await tx.read(eventPath);
      if (existing && existing.organizationId !== operation.organizationId) throw new AccountError(404, "Evento não encontrado.");
      const registrations = existing
        ? await tx.query(eventPath, "registrations", "status", "cancelled", "NOT_EQUAL", Math.min(operation.capacity + 1, 100001))
        : [];
      if (registrations.length > operation.capacity) throw new AccountError(409, "A capacidade não pode ficar abaixo das inscrições ativas.");
      if (registrations.length && (existing?.isPaid !== operation.isPaid || (operation.isPaid && existing?.priceAmount !== operation.priceAmount))) {
        throw new AccountError(409, "Cobrança não pode mudar depois da primeira inscrição.");
      }
      if (["closed", "cancelled"].includes(String(existing?.status)) && !["closed", "cancelled"].includes(operation.status)) {
        throw new AccountError(409, "Evento encerrado ou cancelado não pode ser reaberto.");
      }
      const event = {
        id: operation.eventId,
        organizationId: operation.organizationId,
        name: operation.name,
        slug: typeof existing?.slug === "string" ? existing.slug : `${slugify(operation.name)}-${operation.eventId.slice(-6).toLowerCase()}`,
        description: operation.description,
        type: operation.type,
        status: operation.status,
        locationType: operation.locationType,
        startsAt: operation.startsAt,
        ...(operation.endsAt ? { endsAt: operation.endsAt } : {}),
        capacity: operation.capacity,
        isPaid: operation.isPaid,
        locationName: operation.locationName,
        ...(operation.isPaid ? { priceAmount: operation.priceAmount } : {}),
        createdAt: typeof existing?.createdAt === "string" ? existing.createdAt : now,
        updatedAt: now,
      };
      tx.set(eventPath, event);
      result = { event };
    } else {
      const [existing, registrations] = await Promise.all([
        tx.read(eventPath).then(([value]) => value),
        tx.query(eventPath, "registrations", undefined, undefined, "EQUAL", 1),
      ]);
      if (!existing || existing.organizationId !== operation.organizationId) throw new AccountError(404, "Evento não encontrado.");
      if (registrations.length) {
        tx.patch(eventPath, { status: "cancelled", cancelledAt: now, cancelledByUserId: uid, updatedAt: now });
        result = { event: { ...existing, status: "cancelled", cancelledAt: now, updatedAt: now }, removal: "cancelled" };
      } else {
        tx.remove(eventPath);
        result = { deletedEventId: operation.eventId, removal: "deleted" };
      }
    }

    tx.set(`${root}/eventManagementAudit/${crypto.randomUUID()}`, {
      organizationId: operation.organizationId,
      eventId: operation.eventId,
      action: operation.action === "remove" ? result.removal : "saved",
      actorId: uid,
      at: now,
    });
    tx.set(attemptPath, { organizationId: operation.organizationId, fingerprint: digest, result, createdAt: now });
    return { ...result, replayed: false };
  });
}

export function publicEventProjection(raw: Record<string, unknown>) {
  if (raw.status !== "published") return null;
  const startsAt = typeof raw.startsAt === "string" ? raw.startsAt : "";
  if (!Number.isFinite(new Date(startsAt).getTime())) return null;
  return {
    id: typeof raw.id === "string" ? raw.id : "",
    name: typeof raw.name === "string" ? raw.name.slice(0, 180) : "Evento",
    description: typeof raw.description === "string" ? raw.description.slice(0, 1000) : "",
    type: typeof raw.type === "string" ? raw.type : "service",
    locationType: typeof raw.locationType === "string" ? raw.locationType : "onsite",
    startsAt,
    endsAt: typeof raw.endsAt === "string" ? raw.endsAt : null,
    locationName: typeof raw.locationName === "string" ? raw.locationName.slice(0, 240) : "",
    isPaid: raw.isPaid === true,
    priceAmount: raw.isPaid === true && typeof raw.priceAmount === "number" ? raw.priceAmount : null,
  };
}

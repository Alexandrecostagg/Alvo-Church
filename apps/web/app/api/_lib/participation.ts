import { createHash, randomBytes } from "node:crypto";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { assertModuleEnabled } from "./module-access";
import { publicPortalSlug } from "./public-portal";
import { whatsappPhone } from "@alvo/utils";

export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function participationInput(raw: unknown, kind: "care" | "event") {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new AccountError(400, "Solicitação inválida.");
  const data = raw as Record<string, unknown>;
  const text = (key: string, max: number, required = true) => {
    const value = data[key];
    if (!required && (value === undefined || value === "")) return "";
    if (typeof value !== "string" || !value.trim() || value.trim().length > max)
      throw new AccountError(400, `Confira ${key}.`);
    return value.trim();
  };
  const requestId = text("requestId", 36);
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestId))
    throw new AccountError(400, "Tentativa inválida.");
  const rawPhone = text("phone", 30, kind === "event");
  const phone = rawPhone ? whatsappPhone(rawPhone) : null;
  if (rawPhone && !phone)
    throw new AccountError(400, "Confira o WhatsApp com DDD.");
  const name = text("name", 160);
  if (name.length < 2) throw new AccountError(400, "Informe seu nome.");
  if (data.consent !== true)
    throw new AccountError(
      400,
      "Autorize o contato necessário para este atendimento.",
    );
  const eventId = kind === "event" ? text("eventId", 128) : "";
  if (eventId && !/^[A-Za-z0-9_-]+$/.test(eventId))
    throw new AccountError(400, "Evento inválido.");
  return {
    orgSlug: publicPortalSlug(data.orgSlug),
    requestId,
    name,
    phone: phone ?? "",
    consent: true,
    eventId,
    message: kind === "care" ? text("message", 2000) : "",
    companyWebsite: text("companyWebsite", 200, false),
  };
}

export async function participationOrganization(
  tx: AccountTransaction,
  slug: string,
) {
  const [mapping] = await tx.read(`org_slugs/${publicPortalSlug(slug)}`);
  const orgId = mapping?.organizationId;
  if (typeof orgId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(orgId))
    throw new AccountError(404, "Igreja não encontrada.");
  const root = `organizations/${orgId}`;
  const [org] = await tx.read(root);
  if (org?.status !== "active")
    throw new AccountError(404, "Igreja indisponível.");
  await assertModuleEnabled(tx, root, "publicForms");
  return { root, orgId, org };
}

export async function participationQuota(
  tx: AccountTransaction,
  root: string,
  key: string,
  now: number,
) {
  const paths = [
    `${root}/publicIntakeLimits/participation_${digest(key).slice(0, 16)}`,
    `${root}/publicIntakeLimits/participation_day`,
  ];
  const states = await tx.read(...paths);
  for (let i = 0; i < paths.length; i++) {
    const window = Math.floor(now / (i ? 86400000 : 60000));
    const count = states[i]?.window === window ? states[i]?.count : 0;
    if (!Number.isInteger(count) || count < 0 || count >= (i ? 500 : 5))
      throw new AccountError(
        429,
        "Muitas solicitações. Aguarde e tente novamente.",
      );
    tx.set(paths[i], { window, count: count + 1 });
  }
}

/** Called by verified web forms or the signed WhatsApp receiver; never trusts an organizationId from a public client. */
export async function submitParticipation(
  raw: unknown,
  kind: "care" | "event",
  clientKey: string,
  source: "public_form" | "whatsapp" = "public_form",
  now = Date.now(),
) {
  const input = participationInput(raw, kind);
  if (input.companyWebsite) return { ok: true as const };
  return accountTransaction(async (tx) => {
    const { root, orgId } = await participationOrganization(tx, input.orgSlug);
    await assertModuleEnabled(tx, root, kind === "event" ? "events" : "ai");
    const attemptPath = `${root}/participationAttempts/${digest(`${kind}:${input.requestId}`)}`;
    const fingerprint = digest(JSON.stringify({ ...input, source }));
    const [attempt] = await tx.read(attemptPath);
    if (attempt) {
      if (attempt.fingerprint !== fingerprint)
        throw new AccountError(
          409,
          "Esta tentativa já foi usada. Atualize o formulário.",
        );
      return { ...attempt.result, replayed: true };
    }
    const createdAt = new Date(now).toISOString();
    let result: Record<string, unknown>;
    if (kind === "care") {
      const id = `care_${digest(input.requestId).slice(0, 32)}`;
      await participationQuota(tx, root, clientKey, now);
      tx.set(`${root}/prayerRequests/${id}`, {
        id,
        organizationId: orgId,
        personName: input.name,
        phone: input.phone,
        message: input.message,
        source,
        status: "open",
        isPublic: false,
        prayerCount: 0,
        consentContactAt: createdAt,
        createdAt,
      });
      result = { ok: true, requestId: id };
    } else {
      const eventPath = `${root}/events/${input.eventId}`;
      const registrationId = `contact_${digest(input.phone).slice(0, 32)}`;
      const registrationPath = `${eventPath}/registrations/${registrationId}`;
      const [event, existing] = await tx.read(eventPath, registrationPath);
      if (
        !event ||
        event.organizationId !== orgId ||
        event.status !== "published" ||
        !Number.isFinite(Date.parse(event.startsAt)) ||
        Date.parse(event.startsAt) < now
      )
        throw new AccountError(404, "Evento indisponível para inscrição.");
      if (existing && existing.status !== "cancelled") {
        // No disclosure of an existing attendee's name, code or private record.
        result = { ok: true, alreadyRegistered: true };
      } else {
        const registrations = await tx.query(
          eventPath,
          "registrations",
          undefined,
          undefined,
          "EQUAL",
          1001,
        );
        const count = registrations.filter(
          (r) => r.status !== "cancelled",
        ).length;
        if (
          registrations.length >= 1001 ||
          (typeof event.capacity === "number" &&
            event.capacity > 0 &&
            count >= event.capacity)
        )
          throw new AccountError(
            409,
            "Não há vagas disponíveis. Procure a organização do evento.",
          );
        await participationQuota(tx, root, clientKey, now);
        const registrationCode = `ESD-${randomBytes(12).toString("hex").toUpperCase()}`;
        const paymentStatus =
          event.isPaid === true ? "pending" : "not_required";
        tx.set(registrationPath, {
          id: registrationId,
          organizationId: orgId,
          eventId: input.eventId,
          responsiblePersonId: registrationId,
          personName: input.name,
          phone: input.phone,
          source,
          status: "confirmed",
          paymentStatus,
          registrationCode,
          registeredAt: createdAt,
          consentContactAt: createdAt,
        });
        tx.set(`${root}/eventAttendanceAudit/${crypto.randomUUID()}`, {
          organizationId: orgId,
          eventId: input.eventId,
          registrationId,
          action: "public_registered",
          source,
          at: createdAt,
        });
        result = { ok: true, registrationCode, paymentStatus };
      }
    }
    tx.set(attemptPath, { fingerprint, result, createdAt });
    return { ...result, replayed: false };
  });
}

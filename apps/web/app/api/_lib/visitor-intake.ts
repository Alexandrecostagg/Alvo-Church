import { createHash } from "node:crypto";
import { AccountError, accountTransaction } from "./member-account-store";
import { birthDateError } from "../../../src/lib/member-form";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function validateVisitor(raw: any) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new AccountError(400, "Cadastro inválido.");
  const text = (key: string, max: number, required = false) => {
    const value = raw[key];
    if (value == null && !required) return "";
    if (
      typeof value !== "string" ||
      value.length > max ||
      (required && !value.trim())
    )
      throw new AccountError(400, `Campo ${key} inválido.`);
    return value.trim();
  };
  const orgSlug = text("orgSlug", 119, true).toLowerCase(),
    name = text("name", 120, true),
    phone = text("phone", 30, true).replace(/\D/g, "");
  const email = text("email", 254).toLowerCase(),
    birthDate = text("birthDate", 10),
    neighborhood = text("neighborhood", 120),
    howHeard = text("howHeard", 200),
    companyWebsite = text("companyWebsite", 200);
  if (
    !/^[a-z0-9][a-z0-9-]{1,118}$/.test(orgSlug) ||
    name.length < 2 ||
    !/^\d{10,14}$/.test(phone)
  )
    throw new AccountError(400, "Confira igreja, nome e telefone.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AccountError(400, "E-mail inválido.");
  if (birthDate) {
    const [y, m, d] = birthDate.split("-");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDateError(d, m, y))
      throw new AccountError(400, "Nascimento inválido.");
  }
  if (typeof raw.consent !== "boolean" || typeof raw.firstVisit !== "boolean")
    throw new AccountError(400, "Confira as opções do formulário.");
  return {
    orgSlug,
    name,
    phone,
    email,
    birthDate,
    neighborhood,
    howHeard,
    companyWebsite,
    consentMarketing: raw.consent,
    firstVisit: raw.firstVisit,
  };
}
export async function capturePublicVisitor(
  raw: unknown,
  clientKey: string,
  now = Date.now(),
) {
  const input = validateVisitor(raw);
  if (input.companyWebsite) return { ok: true };
  const day = Math.floor(now / 86400000),
    hour = Math.floor(now / 3600000),
    minute = Math.floor(now / 60000);
  // Stable for retransmission of the same form that day. No raw IP in storage.
  const id = hash(JSON.stringify({ ...input, day }));
  return accountTransaction(async (tx) => {
    const [slug] = await tx.read(`org_slugs/${input.orgSlug}`);
    const orgId = slug?.organizationId;
    if (typeof orgId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(orgId))
      throw new AccountError(404, "Igreja não encontrada.");
    const root = `organizations/${orgId}`;
    const path = `${root}/visitorIntakes/public_${id}`;
    const limits = [
      `${root}/publicIntakeLimits/ip_${hash(clientKey).slice(0, 2)}`,
      `${root}/publicIntakeLimits/hour`,
      `${root}/publicIntakeLimits/day`,
    ];
    const [org, previous, ipLimit, hourLimit, dayLimit] = await tx.read(
      root,
      path,
      ...limits,
    );
    if (org?.status !== "active")
      throw new AccountError(404, "Igreja indisponível.");
    if (previous) return { ok: true, intakeId: `public_${id}`, replayed: true };
    for (const [i, state, window, max] of [
      [0, ipLimit, minute, 5],
      [1, hourLimit, hour, 60],
      [2, dayLimit, day, 200],
    ] as const) {
      const count = state?.window === window ? state.count : 0;
      if (!Number.isInteger(count) || count < 0)
        throw new AccountError(503, "Formulário temporariamente indisponível.");
      if (count >= max)
        throw new AccountError(
          429,
          "Muitos cadastros. Aguarde e tente novamente ou procure a recepção.",
        );
      tx.set(limits[i], {
        window,
        count: count + 1,
        updatedAt: new Date(now).toISOString(),
      });
    }
    const { companyWebsite, ...data } = input;
    tx.set(path, {
      ...data,
      id: `public_${id}`,
      organizationId: orgId,
      source: "public_form",
      status: "captured",
      createdAt: new Date(now).toISOString(),
    });
    return { ok: true, intakeId: `public_${id}`, replayed: false };
  });
}

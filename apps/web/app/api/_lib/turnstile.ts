import { AccountError } from "./member-account-store";
import { isLocalQaFirebase } from "./firebase-server-env";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TEST_SECRET = "1x0000000000000000000000000000000AA";

interface TurnstileResponse {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

interface TurnstileInput {
  token: unknown;
  expectedAction: "public_visit" | "public_giving";
  remoteIp?: string;
  idempotencyKey?: unknown;
}

export function localQaTurnstileToken(
  action: TurnstileInput["expectedAction"],
) {
  return `local-qa-turnstile:${action}`;
}

function secretKey() {
  const configured = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return TEST_SECRET;
  throw new AccountError(
    503,
    "A verificação de segurança está temporariamente indisponível.",
  );
}

function allowedHostnames() {
  return (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
}

function challengeToken(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 2048)
    throw new AccountError(
      400,
      "Conclua a verificação de segurança e tente novamente.",
    );
  return value.trim();
}

function uuid(value: unknown) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : "";
}

function validateResult(
  result: TurnstileResponse,
  expectedAction: TurnstileInput["expectedAction"],
  allowed: string[],
) {
  if (!result.success || result.action !== expectedAction)
    throw new AccountError(
      400,
      "A verificação de segurança expirou ou não foi concluída. Tente novamente.",
    );
  const hostname = result.hostname?.toLowerCase();
  if (allowed.length && (!hostname || !allowed.includes(hostname)))
    throw new AccountError(
      400,
      "Não foi possível confirmar a origem deste formulário.",
    );
}

export async function verifyTurnstile({
  token,
  expectedAction,
  remoteIp,
  idempotencyKey,
}: TurnstileInput) {
  const challenge = challengeToken(token);
  if (isLocalQaFirebase()) {
    if (challenge !== localQaTurnstileToken(expectedAction))
      throw new AccountError(
        400,
        "A verificação de segurança de QA é inválida.",
      );
    return;
  }
  const allowed = allowedHostnames();
  if (process.env.NODE_ENV === "production" && !allowed.length)
    throw new AccountError(
      503,
      "A verificação de segurança está temporariamente indisponível.",
    );
  const body = new URLSearchParams({
    secret: secretKey(),
    response: challenge,
  });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
  const requestId = uuid(idempotencyKey);
  if (requestId) body.set("idempotency_key", requestId);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`siteverify ${response.status}`);
    const result = (await response.json()) as TurnstileResponse;
    validateResult(result, expectedAction, allowed);
  } catch (error) {
    if (error instanceof AccountError) throw error;
    if (process.env.NODE_ENV === "production")
      console.error(
        "Turnstile Siteverify failed:",
        error instanceof Error ? `${error.name}: ${error.message}` : "unknown",
      );
    throw new AccountError(
      503,
      "A verificação de segurança não respondeu. Aguarde um instante e tente novamente.",
    );
  }
}

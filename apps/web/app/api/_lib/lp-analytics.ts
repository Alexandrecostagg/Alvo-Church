import { createHash } from "node:crypto";
import { AccountError, accountTransaction } from "./member-account-store";

const EVENTS = new Set([
  "lp_view",
  "primary_cta_click",
  "secondary_cta_click",
  "pricing_toggle",
  "module_view",
  "faq_open",
  "contact_click",
]);
const TOKEN = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function token(value: unknown, label: string) {
  if (typeof value !== "string" || !TOKEN.test(value))
    throw new AccountError(400, `${label} inválido.`);
  return value;
}

export function validateLpEvent(raw: Record<string, unknown>) {
  const event = token(raw.event, "Evento");
  if (!EVENTS.has(event)) throw new AccountError(400, "Evento inválido.");
  const sessionId = typeof raw.sessionId === "string" ? raw.sessionId : "";
  if (!UUID.test(sessionId)) throw new AccountError(400, "Sessão inválida.");
  return {
    event,
    placement: token(raw.placement, "Posição"),
    target: token(raw.target, "Destino"),
    sessionId,
  };
}

export async function recordLpEvent(raw: Record<string, unknown>) {
  const data = validateLpEvent(raw);
  const day = new Date().toISOString().slice(0, 10);
  const sessionHash = createHash("sha256")
    .update(`${day}:${data.sessionId}`)
    .digest("hex");
  const key = `${data.event}:${data.placement}:${data.target}`;
  const sessionPath = `publicAnalyticsSessions/${day}_${sessionHash}`;
  const dailyPath = `publicAnalyticsDaily/${day}`;
  return accountTransaction(async (tx) => {
    const [session, daily] = await tx.read(sessionPath, dailyPath);
    const keys = Array.isArray(session?.keys) ? session.keys : [];
    if (keys.includes(key)) return { ok: true, replayed: true };
    if (keys.length >= 40)
      throw new AccountError(429, "Limite de eventos desta sessão atingido.");
    const nextKeys = [...keys, key];
    const now = new Date().toISOString();
    if (session) tx.patch(sessionPath, { keys: nextKeys, updatedAt: now });
    else
      tx.set(sessionPath, {
        day,
        keys: nextKeys,
        createdAt: now,
        updatedAt: now,
      });
    const counts =
      daily?.counts && typeof daily.counts === "object" ? daily.counts : {};
    const nextCounts = { ...counts, [key]: Number(counts[key] ?? 0) + 1 };
    if (daily) tx.patch(dailyPath, { counts: nextCounts, updatedAt: now });
    else
      tx.set(dailyPath, {
        day,
        counts: nextCounts,
        createdAt: now,
        updatedAt: now,
      });
    return { ok: true, replayed: false };
  });
}

export async function readLpAnalytics(actorId: string, days = 7) {
  const safeDays = Math.min(Math.max(Math.trunc(days), 1), 30);
  const dates = Array.from({ length: safeDays }, (_, offset) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    return date.toISOString().slice(0, 10);
  }).reverse();
  return accountTransaction(async (tx) => {
    const [admin, ...daily] = await tx.read(
      `platformAdmins/${actorId}`,
      ...dates.map((day) => `publicAnalyticsDaily/${day}`),
    );
    if (!admin)
      throw new AccountError(
        403,
        "Acesso exclusivo da administração da Plataforma Esdras.",
      );
    const series = dates.map((day, index) => {
      const raw = daily[index]?.counts;
      const counts: Record<string, number> = {};
      if (raw && typeof raw === "object") {
        for (const [key, value] of Object.entries(raw)) {
          const event = key.split(":", 1)[0];
          if (EVENTS.has(event) && Number.isFinite(Number(value)))
            counts[event] = (counts[event] ?? 0) + Number(value);
        }
      }
      return { day, counts };
    });
    const totals: Record<string, number> = {};
    for (const row of series)
      for (const [event, count] of Object.entries(row.counts))
        totals[event] = (totals[event] ?? 0) + count;
    return { days: safeDays, totals, series };
  });
}

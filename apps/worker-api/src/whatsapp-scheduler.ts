interface WhatsappSchedulerEnv {
  WHATSAPP_PROCESS_ORIGIN?: string;
  WHATSAPP_PROCESS_TOKEN?: string;
  WHATSAPP_PROCESS_ORGANIZATIONS?: string;
}
export async function processWhatsappQueue(env: WhatsappSchedulerEnv) {
  if (!env.WHATSAPP_PROCESS_ORIGIN || !env.WHATSAPP_PROCESS_TOKEN) return;
  const origin = new URL(env.WHATSAPP_PROCESS_ORIGIN);
  if (origin.protocol !== "https:" || origin.username || origin.password)
    throw new Error("Invalid WhatsApp processor origin");
  const ids = (env.WHATSAPP_PROCESS_ORGANIZATIONS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.some((id) => !/^[A-Za-z0-9_-]{1,128}$/.test(id)) || ids.length > 100)
    throw new Error("Invalid WhatsApp organization list");
  for (const id of ids.length ? ids : [""]) {
    const url = new URL("/api/whatsapp/process", origin.origin);
    if (id) url.searchParams.set("organizationId", id);
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_PROCESS_TOKEN}` },
      signal: AbortSignal.timeout(25000),
      redirect: "error",
    });
    await response.body?.cancel();
    if (!response.ok)
      throw new Error(`WhatsApp processor HTTP ${response.status}`);
  }
}
export function isDailySnapshotTime(scheduledTime: number): boolean {
  const time = new Date(scheduledTime);
  return time.getUTCHours() === 6 && time.getUTCMinutes() === 0;
}

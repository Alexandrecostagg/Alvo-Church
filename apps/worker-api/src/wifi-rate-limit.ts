// One persisted counter per IP, shared by every Worker isolate. No raw IP is stored.
export class WifiRateLimit {
  constructor(private state: DurableObjectState) {}
  async fetch(): Promise<Response> {
    const now = Date.now();
    const allowed = await this.state.storage.transaction(async tx => {
      let counter = await tx.get<{ start: number; count: number }>("window");
      if (!counter || counter.start + 60_000 <= now) counter = { start: now, count: 0 };
      if (counter.count >= 5) return false;
      counter.count++;
      await tx.put("window", counter);
      return true;
    });
    await this.state.storage.setAlarm(now + 120_000);
    return new Response(null, { status: allowed ? 204 : 429 });
  }
  async alarm() { await this.state.storage.deleteAll(); }
}

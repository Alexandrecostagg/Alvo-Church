import { expect, it, vi } from "vitest";
import { WifiRateLimit } from "./wifi-rate-limit";
it("retains the limit across instances and resets an expired window", async () => {
  vi.useFakeTimers();
  const store = new Map();
  const tx = { get: async (key: string) => store.get(key), put: async (key: string, value: unknown) => { store.set(key, value); } };
  const state = { storage: { transaction: async (fn: any) => fn(tx), setAlarm: async () => {}, deleteAll: async () => store.clear() } } as any;
  try {
    for (let i = 0; i < 5; i++) expect((await new WifiRateLimit(state).fetch()).status).toBe(204);
    expect((await new WifiRateLimit(state).fetch()).status).toBe(429);
    vi.advanceTimersByTime(60_001);
    expect((await new WifiRateLimit(state).fetch()).status).toBe(204);
    await new WifiRateLimit(state).alarm();
    expect(store.size).toBe(0);
  } finally { vi.useRealTimers(); }
});

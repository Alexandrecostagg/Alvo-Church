import { beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const state = vi.hoisted(() => new Map<string, any>());
vi.mock("./member-account-store", async (original) => ({
  ...await original<any>(),
  accountTransaction: async (work: any) => {
    const staged = new Map<string, any>();
    const result = await work({
      read: async (...paths: string[]) => paths.map(p => structuredClone(state.get(p) ?? null)),
      set: (p: string, value: any) => staged.set(p, value),
      patch: (p: string, value: any) => staged.set(p, { ...state.get(p), ...value }),
    });
    for (const [p, value] of staged) state.set(p, value);
    return result;
  },
}));
import { recordLpEvent } from "./lp-analytics";
const payload = () => ({ event: "lp_view", placement: "page", target: "landing", sessionId: crypto.randomUUID() });
beforeEach(() => { state.clear(); vi.useRealTimers(); });
it("rejects new metric keys when the daily map is full without making writes", async () => {
  const day = new Date().toISOString().slice(0,10);
  state.set(`publicAnalyticsDaily/${day}`, { counts: Object.fromEntries(Array.from({length:500},(_,i)=>[`lp_view:page:k${i}`,1])) });
  await expect(recordLpEvent(payload())).rejects.toMatchObject({status:429});
  expect(state.size).toBe(1);
});
it("does not reset the server-side burst limit when the client changes session IDs", async () => {
  const minute = Math.floor(Date.now()/60000);
  const hash = createHash("sha256").update("synthetic-client").digest("hex");
  state.set(`publicAnalyticsLimits/${hash}`, {minute,count:119});
  await recordLpEvent(payload(), "synthetic-client");
  await expect(recordLpEvent(payload(), "synthetic-client")).rejects.toMatchObject({status:429});
  expect(state.get(`publicAnalyticsLimits/${hash}`).count).toBe(120);
});
it("resets an expired burst window without creating another counter", async () => {
  const hash = createHash("sha256").update("synthetic-client").digest("hex");
  state.set(`publicAnalyticsLimits/${hash}`, {minute:Math.floor(Date.now()/60000)-1,count:120});
  await recordLpEvent(payload(), "synthetic-client");
  expect(state.get(`publicAnalyticsLimits/${hash}`).count).toBe(1);
  expect([...state.keys()].filter(key=>key.startsWith("publicAnalyticsLimits/"))).toHaveLength(1);
});
it("caps daily writes even across different client addresses", async () => {
  const day = new Date().toISOString().slice(0,10);
  state.set(`publicAnalyticsDaily/${day}`, {counts:{"lp_view:page:landing":50_000}});
  await expect(recordLpEvent(payload(), "another-client")).rejects.toMatchObject({status:429});
  expect(state.size).toBe(1);
});
it("deduplicates the same event without consuming another burst slot", async () => {
  const p = payload();
  expect(await recordLpEvent(p)).toEqual({ok:true,replayed:false});
  expect(await recordLpEvent(p)).toEqual({ok:true,replayed:true});
});

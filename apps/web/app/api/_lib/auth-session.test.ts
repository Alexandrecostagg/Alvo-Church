import { it, expect } from "vitest";
import { activeAuthSession } from "./auth-session";
it("rejects disabled, deleted, revoked and mismatched sessions", () => {
  expect(activeAuthSession({ localId: "u", validSince: "100" }, "u", 100)).toBe(true);
  expect(activeAuthSession({ localId: "u", validSince: "101" }, "u", 100)).toBe(false);
  expect(activeAuthSession({ localId: "u", disabled: true }, "u", 100)).toBe(false);
  expect(activeAuthSession(undefined, "u", 100)).toBe(false);
  expect(activeAuthSession({ localId: "other" }, "u", 100)).toBe(false);
  expect(activeAuthSession({ localId: "u" }, "u", undefined)).toBe(false);
});

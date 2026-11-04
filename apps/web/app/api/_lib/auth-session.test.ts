import { it, expect } from "vitest";
import { activeAuthSession, safeAuthLookupFailure } from "./auth-session";
it("rejects disabled, deleted, revoked and mismatched sessions", () => {
  expect(activeAuthSession({ localId: "u", validSince: "100" }, "u", 100)).toBe(true);
  expect(activeAuthSession({ localId: "u", validSince: "101" }, "u", 100)).toBe(false);
  expect(activeAuthSession({ localId: "u", disabled: true }, "u", 100)).toBe(false);
  expect(activeAuthSession(undefined, "u", 100)).toBe(false);
  expect(activeAuthSession({ localId: "other" }, "u", 100)).toBe(false);
  expect(activeAuthSession({ localId: "u" }, "u", undefined)).toBe(false);
});

it("logs only allowlisted provider codes, never raw account or token details", () => {
  expect(safeAuthLookupFailure({ error: { message: "PROJECT_NOT_FOUND" } })).toEqual({ reason: "PROJECT_NOT_FOUND" });
  expect(safeAuthLookupFailure({ error: { message: "private@example.test secret-token", status: "INVALID_ARGUMENT" } })).toEqual({ reason: "INVALID_ARGUMENT" });
  expect(safeAuthLookupFailure({ error: { message: "PRIVATE_TOKEN_OR_ID" } })).toEqual({ reason: "PROVIDER_REQUEST_REJECTED" });
  expect(safeAuthLookupFailure(null)).toEqual({ reason: "PROVIDER_REQUEST_REJECTED" });
});

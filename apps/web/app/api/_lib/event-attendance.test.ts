import { describe, expect, it } from "vitest";
import { AccountError } from "./member-account-store";
import { documentId } from "./member-account";

describe("event attendance identifiers", () => {
  it.each(["../event", "event/registrations", "event?x", "", "x".repeat(129)])(
    "rejects unsafe event id %s",
    (value) => expect(() => documentId(value, "Evento")).toThrow(AccountError),
  );
  it("accepts generated request ids", () => expect(documentId("event_attempt-123", "Tentativa")).toBe("event_attempt-123"));
});

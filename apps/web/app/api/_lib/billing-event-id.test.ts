import { describe, expect, it } from "vitest";
import { billingEventId } from "./billing-operations";
import { documentId } from "./member-account";

describe("Asaas event identifiers", () => {
  it("preserves the provider delivery suffix for idempotency", () => {
    const id = "evt_d26e303b238e509335ac9ba210e51b0f&19713993";
    expect(billingEventId(id)).toBe(id);
    expect(billingEventId("evt_legacy-123")).toBe("evt_legacy-123");
    expect(billingEventId("evt_same&1")).not.toBe(billingEventId("evt_same&2"));
  });
  it("rejects path injection, whitespace and unbounded identifiers", () => {
    for (const id of [null, 1, "", "../org", "evt/a", "evt%2Fa", "evt?x", "evt#x", "evt\n1", " evt", "evt&", "&1", "a".repeat(129)])
      expect(() => billingEventId(id)).toThrow("Evento inválido.");
  });
  it("keeps tenant and resource ID validation unchanged", () => {
    expect(() => documentId("org&1", "Igreja")).toThrow("Igreja inválido.");
  });
});

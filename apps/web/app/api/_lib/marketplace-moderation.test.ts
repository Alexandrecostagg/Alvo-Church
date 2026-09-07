import { describe, expect, it } from "vitest";
import { marketplaceModerationInput } from "./marketplace-moderation";

describe("marketplace moderation boundaries", () => {
  it("accepts an approval without a reason", () => {
    expect(marketplaceModerationInput({ organizationId: "org", requestId: "attempt", storeId: "store", action: "approve" }))
      .toMatchObject({ action: "approve", reason: "" });
  });

  it.each(["reject", "suspend"])("requires a useful reason for %s", (action) => {
    expect(() => marketplaceModerationInput({ organizationId: "org", requestId: "attempt", storeId: "store", action, reason: "não" })).toThrow(/5 caracteres/);
  });

  it("rejects unknown actions and unbounded reasons", () => {
    expect(() => marketplaceModerationInput({ organizationId: "org", requestId: "attempt", storeId: "store", action: "delete" })).toThrow();
    expect(() => marketplaceModerationInput({ organizationId: "org", requestId: "attempt", storeId: "store", action: "reject", reason: "x".repeat(501) })).toThrow();
  });
});

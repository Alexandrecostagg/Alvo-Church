import { describe, expect, it } from "vitest";
import { campaignCompletionInput, manualCampaignInput, normalizeBrazilianWhatsapp } from "./communication-operations";

describe("manual WhatsApp campaign boundaries", () => {
  it.each([
    ["(62) 99999-1234", "5562999991234"],
    ["+55 11 98888-7777", "5511988887777"],
    ["6233334444", "556233334444"],
  ])("normalizes %s", (input, expected) => expect(normalizeBrazilianWhatsapp(input)).toBe(expected));

  it.each(["", "123", "+1 212 555 0100", "5500999999999", null, {}])(
    "rejects invalid destination %s",
    (value) => expect(normalizeBrazilianWhatsapp(value)).toBeNull(),
  );

  it("rejects duplicate recipients and oversized messages", () => {
    expect(() => manualCampaignInput({ organizationId: "org", requestId: "attempt", message: "Oi", recipientIds: ["p1", "p1"] })).toThrow();
    expect(() => manualCampaignInput({ organizationId: "org", requestId: "attempt", message: "x".repeat(2001), recipientIds: ["p1"] })).toThrow();
  });

  it("requires an explicit non-empty confirmation", () => {
    expect(() => campaignCompletionInput({ organizationId: "org", campaignId: "campaign", confirmedRecipientIds: [] })).toThrow();
  });
});

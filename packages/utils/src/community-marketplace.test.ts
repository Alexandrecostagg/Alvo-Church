import { describe, it, expect } from "vitest";
import {
  safeCommunityUrl,
  communityWhatsapp,
  communityMaps,
  communityPromotionActive,
} from "./community-marketplace";
describe("Community marketplace links and offer dates", () => {
  it("only permits public web schemes without embedded credentials", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,bad",
      "https://user:password@example.test",
      "file:///tmp/a",
    ])
      expect(safeCommunityUrl(url)).toBe("");
    expect(safeCommunityUrl("https://example.test")).toBe(
      "https://example.test/",
    );
  });
  it("normalizes phone, encodes context and supports WhatsApp Web", () => {
    const s = {
      name: "Pão & Café",
      socialLinks: { whatsapp: "(91) 99999-0001" },
    };
    const link = communityWhatsapp(s, "Café 50%", true);
    expect(link).toContain("https://web.whatsapp.com/send?phone=5591999990001");
    expect(new URL(link).searchParams.get("text")).toContain("Café 50%");
    expect(communityWhatsapp({ ...s, socialLinks: { whatsapp: "123" } })).toBe(
      "",
    );
  });
  it("does not offer maps for an empty address", () => {
    expect(communityMaps({})).toBe("");
    expect(
      decodeURIComponent(
        communityMaps({
          contact: { address: { street: "Rua A", number: "8", city: "Belém" } },
        }),
      ),
    ).toContain("Rua A, 8, Belém");
  });
  it("keeps date-only promotions through their final local day", () => {
    expect(
      communityPromotionActive(
        { status: "active", validUntil: "2026-11-17" },
        "2026-11-17",
        Date.parse("2026-11-18T02:00:00Z"),
      ),
    ).toBe(true);
    expect(
      communityPromotionActive(
        { status: "active", validUntil: "2026-11-17" },
        "2026-11-18",
      ),
    ).toBe(false);
    expect(communityPromotionActive({ status: "expired" }, "2026-11-17")).toBe(
      false,
    );
    expect(
      communityPromotionActive(
        { status: "active", validUntil: "not-a-date" },
        "2026-11-17",
      ),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  manualCampaignEligible,
  manualCampaignSlot,
  manualWhatsappLink,
} from "./invitation-manual";
const campaign = {
  timezone: "America/Belem",
  hour: "10:00",
  event: { startsAt: "2026-11-20T22:00:00Z" },
  steps: [{ daysBefore: 3 }, { daysBefore: 1 }],
};
describe("manual invitation workflow", () => {
  it("offers only today's stage after the local start time, without backfill", () => {
    expect(
      manualCampaignSlot(campaign, Date.parse("2026-11-17T12:59:00Z")),
    ).toMatchObject({ index: 0, ready: false });
    expect(
      manualCampaignSlot(campaign, Date.parse("2026-11-17T23:59:00Z")),
    ).toMatchObject({ index: 0, ready: true });
    expect(
      manualCampaignSlot(campaign, Date.parse("2026-11-18T04:00:00Z")),
    ).toMatchObject({ index: -1, ready: false });
    expect(
      manualCampaignSlot(campaign, Date.parse("2026-11-19T13:00:00Z")),
    ).toMatchObject({ index: 1, ready: true });
  });
  it("requires consent and respects refusal, attendance, human follow-up and global opt-out", () => {
    const guest = { consent: true, status: "invited" };
    expect(manualCampaignEligible(guest)).toBe(true);
    for (const patch of [
      { consent: false },
      { optOut: true },
      { handoff: true },
      { status: "declined" },
      { status: "attended" },
    ])
      expect(manualCampaignEligible({ ...guest, ...patch })).toBe(false);
    expect(manualCampaignEligible(guest, { optOut: true })).toBe(false);
    expect(manualCampaignEligible(guest, { handoff: true })).toBe(false);
  });
  it("prepares encoded text for an ordinary WhatsApp chat without any send API", () => {
    const text = "Olá, Ana! João convidou você. A & B\n19h";
    const link = new URL(manualWhatsappLink("5562999990000", text));
    expect(link.origin).toBe("https://wa.me");
    expect(link.pathname).toBe("/5562999990000");
    expect(link.searchParams.get("text")).toBe(text);
    expect(() => manualWhatsappLink("javascript:alert(1)", text)).toThrow();
  });
});

import { describe, it, expect } from "vitest";
import {
  campaignDay,
  campaignLocalDate,
  invitationCalendar,
  repeatedInvitationCopy,
} from "./invitation-calendar";
import { defaultInvitationSteps } from "./invitation-campaign";
describe("campaign calendar", () => {
  it("schedules day yes/day no until the eve, not fifteen daily sends", () => {
    const rows = invitationCalendar("2026-11-28", "2026-11-13", 2);
    expect(rows.map((r) => r.date)).toEqual([
      "2026-11-13",
      "2026-11-15",
      "2026-11-17",
      "2026-11-19",
      "2026-11-21",
      "2026-11-23",
      "2026-11-25",
      "2026-11-27",
    ]);
    expect(rows.map((r) => r.daysBefore)).toEqual([15, 13, 11, 9, 7, 5, 3, 1]);
  });
  it("crosses month/year and leap day without relying on host timezone", () => {
    expect(
      invitationCalendar("2027-01-03", "2026-12-29", 2).map((r) => r.date),
    ).toEqual(["2026-12-29", "2026-12-31", "2027-01-02"]);
    expect(campaignDay("2028-02-28", 1)).toBe("2028-02-29");
    expect(campaignLocalDate("2026-11-04T01:00:00Z", "America/Belem")).toBe(
      "2026-11-03",
    );
  });
  it.each([
    ["2026-11-28", "2026-11-28", 1],
    ["2026-11-28", "2026-11-29", 1],
    ["2026-11-28", "2026-11-01", 1],
    ["2026-11-28", "2026-11-13", 0],
    ["2026-11-28", "2026-11-13", 1.5],
    ["2026-11-28", "2026-02-30", 2],
  ] as const)("rejects invalid or excessive schedules %s %s %s", (e, s, n) =>
    expect(() => invitationCalendar(e, s, n)).toThrow(),
  );
  it("does not call a message three days out tomorrow", () => {
    const rows = invitationCalendar("2026-11-28", "2026-11-13", 3);
    const copy = defaultInvitationSteps(
      rows.length,
      rows.map((r) => r.daysBefore),
    );
    expect(copy.at(-1)?.body).not.toContain("Amanhã");
    expect(copy.at(-1)?.body).toContain("3 dias");
    expect(repeatedInvitationCopy(copy)).toBeNull();
  });
  it("detects the same text disguised by punctuation, accents or numbers", () => {
    expect(
      repeatedInvitationCopy([
        { body: "Olá! Faltam 2 dias.", confirmedBody: "A" },
        { body: "Ola, faltam 3 dias!", confirmedBody: "B" },
      ]),
    ).toEqual([1, 2]);
  });
});

import { describe, expect, it } from "vitest";
import { money } from "./finance-operations";
import { checkoutUrl } from "./billing-operations";
import { reportMonth, csvCell } from "./finance-report";
import { retentionDays, retentionEligible } from "./kids-retention";
describe("financial boundaries", () => {
  it.each([0, -1, 0.001, 1e-10, 1000000.01, NaN, Infinity, "79", null, {}])(
    "rejects invalid money %s",
    (value) => expect(() => money(value)).toThrow(),
  );
  it.each([
    [0.01, 1],
    [19.9, 1990],
    [79, 7900],
    [1000000, 100000000],
  ])("keeps cents %s", (value, cents) => expect(money(value)).toBe(cents));
  it.each([
    "http://asaas.com/i/x",
    "https://asaas.com.evil.test/i/x",
    "https://evil.test",
    "https://user@asaas.com/i/x",
    "javascript:alert(1)",
    null,
  ])("rejects unsafe checkout %s", (url) =>
    expect(() => checkoutUrl(url)).toThrow(),
  );
  it("accepts provider hosted checkout", () =>
    expect(checkoutUrl("https://sandbox.asaas.com/i/qa")).toBe(
      "https://sandbox.asaas.com/i/qa",
    ));
});
describe("Kids retention eligibility", () => {
  it.each([0, 1, 29, 366, "30", null])("rejects unreviewed policy %s", (days) =>
    expect(() => retentionDays(days)).toThrow(),
  );
  const now = Date.parse("2026-09-05T12:00:00Z"),
    old = {
      status: "checked_out",
      photoRetentionPending: true,
      checkedOutAt: "2026-07-01T12:00:00Z",
    };
  it("accepts old withdrawn media", () =>
    expect(retentionEligible(old, 30, now)).toBe(true));
  it.each([
    { status: "checked_in" },
    { photoRetentionPending: false },
    { checkedOutAt: "invalid" },
    { checkedOutAt: "2026-09-05T11:00:00Z" },
  ])("keeps ineligible photos", (patch) =>
    expect(retentionEligible({ ...old, ...patch }, 30, now)).toBe(false),
  );
});

describe("monthly CSV", () => {
  it.each(["2026-13", "2026-00", "../../file", null])(
    "rejects month %s",
    (value) => expect(() => reportMonth(value)).toThrow(),
  );
  it("neutralizes spreadsheet formulas", () =>
    expect(csvCell("=1+1").startsWith("\"'")).toBe(true));
  it("preserves quoted multiline text", () =>
    expect(csvCell('Linha; "QA"\nNota')).toBe('"Linha; ""QA""\nNota"'));
});

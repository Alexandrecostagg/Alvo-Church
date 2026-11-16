import { describe, expect, it } from "vitest";
import { parseGivingAmount } from "./giving";
describe("giving amounts", () => {
  it.each([
    ["4.000,00", 4000],
    ["4000.00", 4000],
    ["4000", 4000],
    ["0,01", 0.01],
    ["1.000.000,00", 1000000],
  ])("parses %s without inflating amounts", (raw, value) =>
    expect(parseGivingAmount(String(raw))).toBe(value),
  );
  it.each([
    "-100",
    "R$ abc",
    "12abc",
    "0",
    "1e3",
    "1,234",
    "1.234.56",
    "1000000.01",
    "",
  ])("rejects %s", (raw) => expect(parseGivingAmount(raw)).toBeNull());
});

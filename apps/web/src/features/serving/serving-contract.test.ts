import { it, expect } from "vitest";
import { servingInstant, servingDate } from "./serving-contract";
it("uses the church timezone and selected hour instead of a fixed Sunday time", () => {
  expect(servingInstant("2030-11-09", "19:45", "America/Belem")).toBe(
    "2030-11-09T22:45:00.000Z",
  );
  expect(servingInstant("2030-11-09", "19:45", "America/Manaus")).toBe(
    "2030-11-09T23:45:00.000Z",
  );
  expect(servingDate("2030-11-09T22:45:00Z", "America/Belem")).toContain(
    "19:45",
  );
});
it.each([
  ["2030-02-30", "19:00"],
  ["2030-02-01", "25:00"],
  ["invalid", "19:00"],
])("rejects impossible calendar input %s %s", (day, time) =>
  expect(() => servingInstant(day, time, "America/Belem")).toThrow(),
);
it("rejects a non-existent daylight saving clock time", () =>
  expect(() =>
    servingInstant("2030-03-10", "02:30", "America/New_York"),
  ).toThrow());

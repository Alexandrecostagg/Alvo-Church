import { describe, expect, it } from "vitest";
import {
  homeProfiles,
  homeRouteAllowed,
  birthdayInPeriod,
} from "./home-profiles";
describe("home responsibilities", () => {
  it("separates each responsibility and permits accumulated roles", () => {
    expect(homeProfiles(["member"])).toEqual(["member"]);
    expect(homeProfiles(["group_leader"])).toEqual(["cell_leader", "member"]);
    expect(homeProfiles(["pastor", "group_leader"])).toEqual([
      "pastoral",
      "cell_leader",
      "member",
    ]);
    expect(homeProfiles(["secretary"])).toEqual(["administration", "member"]);
    expect(homeProfiles([])).toEqual([]);
  });
  it("does not derive network authority from pastoral office, paid plan or tier alone", () => {
    expect(homeProfiles(["pastor"], "network", true)).not.toContain("network");
    expect(homeProfiles(["church_admin"], "solo", true)).not.toContain(
      "network",
    );
    expect(homeProfiles(["church_admin"], "network", false)).not.toContain(
      "network",
    );
    expect(homeProfiles(["church_admin"], "network", true)[0]).toBe("network");
  });
  it.each([
    "/members/new",
    "/finance",
    "/reports",
    "/groups",
    "/groups/other/banner",
    "/settings/users",
    "/operations",
    "/media/banner",
  ])("blocks member and cell leader from broad route %s", (route) => {
    expect(homeRouteAllowed(["member"], route)).toBe(false);
    expect(homeRouteAllowed(["group_leader"], route)).toBe(false);
    expect(homeRouteAllowed(["pastor"], route)).toBe(true);
  });
  it("keeps own participation routes available", () => {
    for (const href of [
      "/app",
      "/my-groups",
      "/me",
      "/serving",
      "/my-invites",
      "/learning/academy",
    ])
      expect(homeRouteAllowed(["member"], href)).toBe(true);
    expect(
      homeRouteAllowed(["church_admin"], "/network", "network", true),
    ).toBe(true);
    expect(homeRouteAllowed(["pastor"], "/network", "network", true)).toBe(
      false,
    );
  });
  it("handles birthdays across year boundaries without using birth year", () => {
    expect(birthdayInPeriod("1978-01-02", "2026-12-29", "week")).toBe(true);
    expect(birthdayInPeriod("1978-01-06", "2026-12-29", "week")).toBe(false);
    expect(birthdayInPeriod("1988-11-14", "2026-11-14", "today")).toBe(true);
    expect(birthdayInPeriod("1980-02-31", "2026-02-01", "month")).toBe(false);
    expect(birthdayInPeriod(undefined, "2026-11-14", "today")).toBe(false);
  });
});

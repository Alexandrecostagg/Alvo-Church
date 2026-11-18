import { describe, it, expect } from "vitest";
import { tribeTrialTransition } from "./tribe-service";
import { homeRouteAllowed } from "./home-profiles";
describe("Experiências de serviço: limites da decisão humana", () => {
  it("leadership cannot accept or write personal feedback", () => {
    expect(tribeTrialTransition("invited", "accept", true)).toBeNull();
    expect(tribeTrialTransition("accepted", "feedback", true)).toBeNull();
  });
  it("members cannot invite themselves or conclude pastoral follow-up", () => {
    expect(tribeTrialTransition("requested", "invite", false)).toBeNull();
    expect(tribeTrialTransition("completed", "close", false)).toBeNull();
  });
  it("allows withdrawing before or after accepting without forcing service", () => {
    for (const state of ["requested", "invited", "accepted"])
      expect(tribeTrialTransition(state, "decline", false)).toBe("declined");
  });
  it("does not rewrite finished experiences", () => {
    for (const state of ["closed", "declined", "cancelled"])
      for (const manager of [true, false])
        for (const action of [
          "invite",
          "accept",
          "feedback",
          "close",
          "decline",
          "cancel",
        ])
          expect(tribeTrialTransition(state, action, manager)).toBeNull();
  });
  it("separates leadership route and member participation", () => {
    expect(homeRouteAllowed(["member"], "/tribes")).toBe(false);
    expect(
      homeRouteAllowed(["group_leader"], "/tribes?scope=cell_leader"),
    ).toBe(true);
    expect(homeRouteAllowed(["member"], "/my-tribe")).toBe(true);
  });
});

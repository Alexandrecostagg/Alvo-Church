import { describe, expect, it } from "vitest";
import { mobileCapabilities, parseContributionAmount, imageDataUrl, type MobileModules } from "./mobile-flow";
describe("mobile routes and amounts", () => {
  it("keeps legacy modules usable, but leader tools require a role", () => {
    expect(mobileCapabilities(undefined, ["member"])).toMatchObject({ events: true, groups: true, leader: false });
    expect(mobileCapabilities(undefined, ["group_leader"]).leader).toBe(true);
  });
  it("hides paused modules regardless of administrative role", () => {
    const modules = { groups: { enabled: false }, volunteers: { enabled: false }, events: { enabled: false } } as MobileModules;
    expect(mobileCapabilities(modules, ["church_admin"])).toMatchObject({ leader: false, groups: false, volunteers: false, events: false });
  });
  it("does not expose leader tools when AI is paused", () => expect(mobileCapabilities({ ai: { enabled: false } } as MobileModules, ["pastor"]).leader).toBe(false));
  it.each([["50,50", 50.5], ["1.234,56", 1234.56], ["50.50", 50.5], ["1.000", 1000], ["50", 50]])("parses %s", (value, expected) => expect(parseContributionAmount(String(value))).toBe(expected));
  it.each(["", "-1", "0", "Infinity", "1e3", "12abc", "1,2,3", "1000001", "1.234.56"])("rejects %s", value => expect(parseContributionAmount(value)).toBeNull());
});

it("preserves JPEG/PNG MIME and rejects unsupported image formats", () => {
  expect(imageDataUrl("/9j/fixture")).toBe("data:image/jpeg;base64,/9j/fixture");
  expect(imageDataUrl("iVBORw0KGgofixture")).toBe("data:image/png;base64,iVBORw0KGgofixture");
  expect(imageDataUrl("unsupported")).toBeNull();
});

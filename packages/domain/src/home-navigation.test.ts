import { describe, expect, it } from "vitest";
import { homeDestination } from "./home-navigation";

describe("dashboard destinations", () => {
  it("opens personal capabilities natively and administrative ones on the web", () => {
    expect(homeDestination("/my-groups", "cell_leader")).toMatchObject({
      kind: "native",
      key: "groups",
    });
    expect(homeDestination("/groups", "administration")).toMatchObject({
      kind: "web",
    });
    expect(homeDestination("/serving", "pastoral")).toMatchObject({
      kind: "web",
    });
    expect(homeDestination("/serving", "member")).toMatchObject({
      kind: "native",
      key: "serving",
    });
    expect(homeDestination("/my-tribe", "member")).toMatchObject({
      kind: "native",
      key: "tribes",
    });
  });
  it("supports scoped pastoral and tribe links and care metrics", () => {
    expect(
      homeDestination("/tribes?scope=cell_leader", "cell_leader"),
    ).toMatchObject({ kind: "web" });
    expect(
      homeDestination("/pastoral-ai?profile=cell_leader", "cell_leader"),
    ).toMatchObject({ kind: "web" });
    expect(homeDestination("#acompanhamento", "pastoral")).toEqual({
      kind: "section",
      section: "care",
    });
  });
  it.each([
    "constructor",
    "__proto__",
    "https://evil.test",
    "//evil.test",
    "javascript:alert(1)",
    "/tribes?redirect=https://evil.test",
    "/finance/../settings",
    undefined,
  ])("rejects unrecognized destination %s", (href) => {
    expect(homeDestination(href, "administration")).toBeNull();
  });
});

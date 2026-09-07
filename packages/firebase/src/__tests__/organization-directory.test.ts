import { describe, expect, it } from "vitest";
import { normalizeOrganizationDirectory, parseOrganizationDirectoryEntry } from "../organization-directory";

describe("diretório de instituições", () => {
  it("retorna apenas os campos públicos esperados", () => {
    expect(parseOrganizationDirectoryEntry("igreja-alvorecer", {
      organizationId: "org_alvorecer_123",
      displayName: "  Igreja Alvorecer  ",
      ownerUid: "não deve sair no resultado",
    })).toEqual({
      organizationId: "org_alvorecer_123",
      slug: "igreja-alvorecer",
      displayName: "Igreja Alvorecer",
    });
  });

  it.each([
    ["../outra", { organizationId: "org_ok", displayName: "Igreja" }],
    ["igreja-ok", { organizationId: "../org", displayName: "Igreja" }],
    ["igreja-ok", { organizationId: "org_ok", displayName: "" }],
    ["igreja-ok", { organizationId: "org_ok", displayName: "a".repeat(161) }],
  ])("ignora entrada inválida (%#)", (slug, data) => {
    expect(parseOrganizationDirectoryEntry(slug, data)).toBeNull();
  });

  it("ordena os nomes e mostra uma única opção por instituição", () => {
    expect(normalizeOrganizationDirectory([
      { organizationId: "org_b", slug: "igreja-b", displayName: "Igreja Batista" },
      { organizationId: "org_a", slug: "igreja-z", displayName: "Igreja Alvorecer" },
      { organizationId: "org_a", slug: "igreja-a", displayName: "Igreja Alvorecer" },
      null,
    ])).toEqual([
      { organizationId: "org_a", slug: "igreja-z", displayName: "Igreja Alvorecer" },
      { organizationId: "org_b", slug: "igreja-b", displayName: "Igreja Batista" },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { boundedJson, kidsAccess, photoBytes, photoObjectPrefix, validPhotoPath } from "./kids-media";
const actor = { organizationId: "org", isActive: true, roles: ["member"] };
const record = { organizationId: "org", parentId: "parent", authorizedPickUpIds: ["authorized"] };
describe("política de mídia Kids", () => {
  it.each(["parent", "authorized"])("%s lê, mas não anexa", uid => expect(kidsAccess(actor, record, {}, "org", uid)).toEqual({ read: true, upload: false }));
  it.each(["church_admin", "super_admin", "pastor", "secretary"])("%s opera", role => expect(kidsAccess({ ...actor, roles: [role] }, record, {}, "org", "operator")).toEqual({ read: true, upload: true }));
  it("honra cargo Kids configurado", () => expect(kidsAccess({ ...actor, roles: ["ministry_leader"] }, record, { qrGeneratorRoles: ["ministry_leader"] }, "org", "operator").upload).toBe(true));
  it.each([null, { ...actor, isActive: false }, { ...actor, organizationId: "foreign" }])("nega conta inválida (%#)", value => expect(kidsAccess(value, record, {}, "org", "parent").read).toBe(false));
  it("nega estranho", () => expect(kidsAccess(actor, record, {}, "org", "stranger").read).toBe(false));
  it("nega cadastro de outra igreja", () => expect(kidsAccess(actor, { ...record, organizationId: "foreign" }, {}, "org", "parent").read).toBe(false));
  it.each(["https://evil.test/p", "data:image/jpeg;base64,aaaa", "kids-private/other/id/photo", "kids-private/org/id/../photo", "kids-private/org/id/photo?alt=media"])("não busca foto arbitrária (%#)", path => expect(validPhotoPath(path, "org", "id")).toBe(false));
  it("não usa o ID/token legado no caminho do objeto", () => expect(photoObjectPrefix("org", "KID-segredo")).toMatch(/^kids-private\/org\/[a-f0-9]{64}\/$/));
  it("aceita apenas prefixo exato do check-in", () => expect(validPhotoPath(`${photoObjectPrefix("org", "id")}123-456`, "org", "id")).toBe(true));
});
describe("entrada limitada", () => {
  it.each([undefined, "data:image/jpeg;base64,a", "data:image/svg+xml;base64,PHN2Zy8+", "data:image/jpeg;base64,aGVsbG8=", "https://example.test/a.png", "data:image/png;base64," + "A".repeat(700000)])("rejeita imagem inválida (%#)", value => expect(() => photoBytes(value)).toThrow());
  it("interrompe corpo acima do limite antes de interpretar JSON", async () => {
    await expect(boundedJson(new Request("https://local.test", { method: "POST", body: JSON.stringify({ data: "x".repeat(3000) }) }), 100)).rejects.toMatchObject({ status: 413 });
  });
  it.each(["[]", "null", "invalid"])("recusa JSON inválido (%s)", async body => {
    await expect(boundedJson(new Request("https://local.test", { method: "POST", body }))).rejects.toMatchObject({ status: 400 });
  });
});

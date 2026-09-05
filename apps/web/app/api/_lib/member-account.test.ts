import { describe, expect, it, vi } from "vitest";
vi.mock("./member-account-store", () => ({ AccountError: class extends Error { constructor(public status: number, message: string) { super(message); } }, accountTransaction: vi.fn() }));
import { activePass, documentId, linkInput } from "./member-account";

const person = { organizationId: "org", status: "active", firstName: "Ana", lastName: "Silva", partnerBenefitsEnabled: true, consentLgpdAt: "2026-09-05T12:00:00Z", memberCardCode: "ESDRAS-ABCDEFGHJKLMNPQRSTUVWXYZ23", cpf: "private", email: "private@example.test" };
describe("elegibilidade e minimização do Passe", () => {
  it("retorna somente nome e código de um cadastro elegível", () => expect(activePass(person, "org")).toEqual({ name: "Ana Silva", code: person.memberCardCode }));
  it.each([
    null, { ...person, organizationId: "other" }, { ...person, status: "inactive" }, { ...person, status: "archived" },
    { ...person, partnerBenefitsEnabled: false }, { ...person, partnerBenefitsEnabled: "true" },
    { ...person, consentLgpdAt: undefined }, { ...person, consentLgpdAt: "invalid" },
    { ...person, memberCardCode: "https://untrusted.test" }, { ...person, memberCardCode: "a".repeat(129) },
    { ...person, firstName: " ", lastName: null },
  ])("nega cartão sem todos os requisitos (%#)", value => expect(activePass(value, "org")).toBeNull());
});
describe("entrada do vínculo", () => {
  it.each([undefined, null, "", "../users", "a?x=y", "a/b", "a%2fb", "a".repeat(129), 123])("recusa identificadores ambíguos (%#)", value => expect(() => documentId(value, "Conta")).toThrow());
  it("aceita IDs de cadastros existentes", () => expect(documentId("person_123-456", "Pessoa")).toBe("person_123-456"));
  it("exige vínculo anterior explícito para evitar sobrescrita acidental", () => expect(() => linkInput({ organizationId: "org", userId: "user", personId: "person" })).toThrow());
  it("aceita remoção explícita", () => expect(linkInput({ organizationId: "org", userId: "user", personId: null, expectedPersonId: "person" }).personId).toBeNull());
});

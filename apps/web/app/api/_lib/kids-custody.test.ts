import { describe, expect, it } from "vitest";
import { guardianInput } from "./kids-custody";
const input = { guardianName: "Ana Silva", guardianEmail: "Ana@Example.test", authorizedNames: ["Maria Silva"], identityConfirmed: true };
describe("confirmação de responsáveis Kids", () => {
  it("normaliza o e-mail escolhido sem inferir identidade pelo nome", () => expect(guardianInput(input)).toEqual({ guardianName: "Ana Silva", guardianEmail: "ana@example.test", authorizedNames: ["Maria Silva"], guardianPhone: "" }));
  it("aceita responsável sem conta explicitamente", () => expect(guardianInput({ ...input, guardianEmail: "" }).guardianEmail).toBe(""));
  it.each([
    { ...input, identityConfirmed: false }, { ...input, identityConfirmed: "true" },
    { ...input, guardianName: " " }, { ...input, guardianName: "a".repeat(121) },
    { ...input, guardianEmail: "invalid" }, { ...input, guardianEmail: "a".repeat(255) },
    { ...input, authorizedNames: ["ana silva"] }, { ...input, authorizedNames: ["Maria", " maria "] },
    { ...input, authorizedNames: [""] }, { ...input, authorizedNames: "Maria" },
    { ...input, authorizedNames: Array.from({ length: 6 }, (_, i) => `Pessoa ${i}`) },
  ])("rejeita autorização ausente, ambígua ou fora dos limites (%#)", raw => expect(() => guardianInput(raw)).toThrow());
});

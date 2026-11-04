import { beforeEach, describe, expect, it, vi } from "vitest";
import { callChatWithFallback } from "./fallback";
import { generateCommunicationDraft } from "./tasks";

vi.mock("./fallback", () => ({
  callChatWithFallback: vi.fn(async () => ({
    content: "Rascunho",
    model: "qa",
  })),
}));

describe("generateCommunicationDraft", () => {
  beforeEach(() => vi.mocked(callChatWithFallback).mockClear());

  it("gera apenas um rascunho revisável sem enviar nem incluir dados pessoais", async () => {
    await expect(
      generateCommunicationDraft(
        { groqApiKey: "test" },
        {
          objective: "Lembrar o culto",
          audience: "Famílias",
          tone: "acolhedor",
          details: "Domingo às 19h",
        },
      ),
    ).resolves.toEqual({ content: "Rascunho", model: "qa" });
    const messages = vi.mocked(callChatWithFallback).mock.calls[0][1];
    expect(messages[0].content).toContain("Nunca inclua dados pessoais");
    expect(messages[0].content).toContain("O líder sempre revisará");
    expect(messages[1].content).toContain("Domingo às 19h");
    expect(messages[1].content).toContain("Gere apenas o texto final");
  });

  it("recusa campos vazios ou grandes antes de chamar o provedor", async () => {
    await expect(
      generateCommunicationDraft({}, { objective: "", audience: "Todos" }),
    ).rejects.toThrow("Objetivo inválido");
    await expect(
      generateCommunicationDraft(
        {},
        { objective: "Avisar", audience: "x".repeat(201) },
      ),
    ).rejects.toThrow("Público inválido");
    expect(callChatWithFallback).not.toHaveBeenCalled();
  });
});

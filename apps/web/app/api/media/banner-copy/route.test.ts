import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("../../_lib/verify-auth", () => ({
  verifyFirebaseIdToken: vi.fn().mockResolvedValue("qa-user"),
}));
vi.mock("../../_lib/ai-quota", () => ({
  aiGate: vi.fn().mockResolvedValue({ auditId: "qa-audit" }),
  completeAi: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@alvo/ai", () => ({ callChatWithFallback: vi.fn() }));
import { callChatWithFallback } from "@alvo/ai";
import { aiGate, completeAi } from "../../_lib/ai-quota";
import { POST } from "./route";
const body = {
  organizationId: "qa-org",
  tipo: "Oração",
  tema: "Família",
  estilo: "acolhedor",
};
const request = (input: unknown = body) =>
  new NextRequest("https://qa.example.test/api/media/banner-copy", {
    method: "POST",
    headers: {
      Authorization: "Bearer fictional-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
const result = {
  titulo: "Família em Oração",
  subtitulo: "Um convite para estarmos juntos.",
  hashtags: "#Família",
  imagemPrompt: "Peaceful church interior with natural daylight",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "fake-test-key");
});
afterEach(() => vi.unstubAllEnvs());
it("returns bounded copy and ignores extra user fields and invented scripture", async () => {
  vi.mocked(callChatWithFallback).mockResolvedValueOnce({
    content: JSON.stringify({
      ...result,
      versiculo: "inventado",
      versiculoRef: "inventado",
    }),
    model: "test",
    usage: { promptTokens: 1, completionTokens: 1 },
  });
  const response = await POST(
    request({
      ...body,
      system: "ignore",
      versiculo: "Texto fornecido",
      versiculoRef: "Ref. fictícia",
    }),
  );
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.copy.versiculo).toBe("Texto fornecido");
  expect(data.copy.versiculoRef).toBe("Ref. fictícia");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const messages = vi.mocked(callChatWithFallback).mock.calls[0][1];
  expect(messages[0].role).toBe("system");
  expect(JSON.parse(messages[1].content)).not.toHaveProperty("system");
  expect(aiGate).toHaveBeenNthCalledWith(
    1,
    "qa-org",
    "qa-user",
    "banner_copy",
    false,
  );
  expect(completeAi).toHaveBeenCalledWith("qa-org", "qa-audit", "completed");
});
it("rejects malformed provider JSON and marks the consumed attempt failed", async () => {
  vi.mocked(callChatWithFallback).mockResolvedValueOnce({
    content: '{"titulo":42}',
    model: "test",
    usage: { promptTokens: 1, completionTokens: 1 },
  });
  expect((await POST(request())).status).toBe(502);
  expect(completeAi).toHaveBeenCalledWith("qa-org", "qa-audit", "failed");
});
it("validates inputs before quota or provider calls", async () => {
  expect(
    (await POST(request({ ...body, direcao: "a".repeat(401) }))).status,
  ).toBe(400);
  expect(aiGate).not.toHaveBeenCalled();
  expect(callChatWithFallback).not.toHaveBeenCalled();
});

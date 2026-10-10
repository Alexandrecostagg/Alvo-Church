import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callChatWithFallback } from "./fallback";
import { DEFAULT_GEMINI_MODEL } from "./gemini";

const messages = [{ role: "user" as const, content: "Convite fictício" }];
const keys = { geminiApiKey: "test-gemini", groqApiKey: "test-groq" };
const answer = (model: string, content = "Resposta", finish = "stop") =>
  Response.json({ model, choices: [{ message: { content }, finish_reason: finish }], usage: { prompt_tokens: 8, completion_tokens: 4 } });

describe("Gemini → Groq", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("prioriza Gemini, mantém chave no header e pede JSON para banners", async () => {
    fetchMock.mockResolvedValueOnce(answer(DEFAULT_GEMINI_MODEL, '{"titulo":"Bem-vindos"}'));
    const result = await callChatWithFallback(keys, messages, { jsonMode: true, maxTokens: 500 });
    expect(result.model).toBe(DEFAULT_GEMINI_MODEL);
    expect(result.usage).toEqual({ promptTokens: 8, completionTokens: 4 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer test-gemini" });
    expect(JSON.parse(String(init?.body))).toMatchObject({ model: DEFAULT_GEMINI_MODEL, messages, response_format: { type: "json_object" }, stream: false });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([401, 429, 503])("cai para Groq em HTTP %i sem registrar resposta privada", async (status) => {
    fetchMock.mockResolvedValueOnce(new Response("PRIVATE-PROVIDER-BODY", { status }))
      .mockResolvedValueOnce(answer("openai/gpt-oss-20b"));
    const result = await callChatWithFallback(keys, messages);
    expect(result.model).toBe("openai/gpt-oss-20b");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ Authorization: "Bearer test-groq" });
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("PRIVATE-PROVIDER-BODY");
  });

  it("cai para Groq quando o Gemini excede o tempo", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("Private details", "TimeoutError"))
      .mockResolvedValueOnce(answer("openai/gpt-oss-20b"));
    expect((await callChatWithFallback(keys, messages)).model).toBe("openai/gpt-oss-20b");
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("Private details");
  });

  it.each([["", "stop"], ["Resposta cortada", "length"]])("não aceita resposta vazia ou truncada", async (content, finish) => {
    fetchMock.mockResolvedValueOnce(answer(DEFAULT_GEMINI_MODEL, content, finish))
      .mockResolvedValueOnce(answer("openai/gpt-oss-20b"));
    expect((await callChatWithFallback(keys, messages)).model).toBe("openai/gpt-oss-20b");
  });

  it("cai para Groq quando o JSON de banner é inválido", async () => {
    fetchMock.mockResolvedValueOnce(answer(DEFAULT_GEMINI_MODEL, "not-json"))
      .mockResolvedValueOnce(answer("openai/gpt-oss-20b", "{}"));
    expect((await callChatWithFallback(keys, messages, { jsonMode: true })).model).toBe("openai/gpt-oss-20b");
  });

  it("mantém Groq disponível enquanto a chave Gemini não foi preenchida", async () => {
    fetchMock.mockResolvedValueOnce(answer("openai/gpt-oss-20b"));
    await callChatWithFallback({ groqApiKey: keys.groqApiKey }, messages);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("api.groq.com");
  });

  it("permite configurar o modelo Gemini no servidor", async () => {
    fetchMock.mockResolvedValueOnce(answer("gemini-override"));
    await callChatWithFallback({ ...keys, geminiModel: "gemini-override" }, messages);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).model).toBe("gemini-override");
  });

  it("não faz chamadas sem credenciais", async () => {
    await expect(callChatWithFallback({}, messages)).rejects.toThrow("Nenhuma API");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retorna falha de disponibilidade quando só Gemini está configurado e falha", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Private details"));
    await expect(callChatWithFallback({ geminiApiKey: keys.geminiApiKey }, messages))
      .rejects.toThrow("Serviço de Sabedoria Pastoral indisponível.");
  });
});

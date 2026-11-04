import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("../../_lib/verify-auth", () => ({
  verifyFirebaseIdToken: vi.fn().mockResolvedValue("qa-admin"),
}));
vi.mock("../../_lib/ai-quota", () => ({
  aiGate: vi
    .fn()
    .mockResolvedValue({ auditId: "qa-audit", used: 1, limit: 100 }),
  completeAi: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../_lib/member-account-store", async () => {
  const actual = await vi.importActual<any>("../../_lib/member-account-store");
  return {
    ...actual,
    accountTransaction: vi.fn(async (work: any) => work({})),
  };
});
vi.mock("../../_lib/finance-operations", async () => {
  const actual = await vi.importActual<any>("../../_lib/finance-operations");
  return {
    ...actual,
    financeActor: vi.fn().mockResolvedValue({ root: "organizations/qa-org" }),
  };
});
vi.mock("../../_lib/module-access", () => ({
  assertModuleEnabled: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@alvo/ai", () => ({
  callChatWithFallback: vi.fn(),
  callGroq: vi.fn(),
}));
import { POST } from "./route";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { financeActor } from "../../_lib/finance-operations";
import { AccountError } from "../../_lib/member-account-store";
import { aiGate, completeAi } from "../../_lib/ai-quota";
import { callChatWithFallback, callGroq } from "@alvo/ai";
const body = {
  organizationId: "qa-org",
  action: "generate",
  objective: "Acolhida fictícia sem pressão",
  tone: "acolhedor",
  offsets: [5, 3, 1],
};
const providerSteps = () =>
  body.offsets.map((daysBefore, i) => ({
    daysBefore,
    focus: `Assunto ${i}`,
    body: [
      "Venha para {{evento}} em {{data}}.",
      "Como podemos ajudar na sua chegada?",
      "Amanhã nos encontraremos em {{local}}.",
    ][i],
    confirmedBody: [
      "Esperamos você às {{horario}}.",
      "Combine a chegada com quem convidou você.",
      "Se os planos mudarem, fale com a equipe.",
    ][i],
  }));
const request = (data: unknown = body) =>
  new NextRequest("http://127.0.0.1/api/campaigns/copy", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "fake-local-key");
  vi.stubEnv("GROQ_API_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());
it("requires authenticated tenant admin before quota or provider", async () => {
  vi.mocked(verifyFirebaseIdToken).mockResolvedValueOnce(null);
  expect((await POST(request())).status).toBe(401);
  vi.mocked(financeActor).mockRejectedValueOnce(
    new AccountError(403, "Sem acesso"),
  );
  expect((await POST(request())).status).toBe(403);
  expect(aiGate).not.toHaveBeenCalled();
  expect(callChatWithFallback).not.toHaveBeenCalled();
});
it("checks availability without consuming or calling provider", async () => {
  expect((await POST(request({ ...body, action: "status" }))).status).toBe(200);
  expect(aiGate).toHaveBeenCalledWith(
    "qa-org",
    "qa-admin",
    "campaign_sequence",
    false,
  );
  expect(callChatWithFallback).not.toHaveBeenCalled();
});
it("rejects duplicate/inverted dates before consuming allowance", async () => {
  expect((await POST(request({ ...body, offsets: [5, 5, 1] }))).status).toBe(
    400,
  );
  expect(aiGate).not.toHaveBeenCalled();
});
it("does not charge missing provider configuration", async () => {
  vi.stubEnv("GEMINI_API_KEY", "");
  expect((await POST(request())).status).toBe(503);
  expect(aiGate).toHaveBeenCalledTimes(1);
  expect(aiGate).toHaveBeenLastCalledWith(
    "qa-org",
    "qa-admin",
    "campaign_sequence",
    false,
  );
  expect(callChatWithFallback).not.toHaveBeenCalled();
});
it("generates one reviewed sequence without transmitting extra guest/contact data", async () => {
  vi.mocked(callChatWithFallback).mockResolvedValueOnce({
    content: JSON.stringify({
      steps: providerSteps(),
    }),
    model: "mock",
    usage: { promptTokens: 1, completionTokens: 1 },
  });
  const r = await POST(
    request({
      ...body,
      guests: [{ name: "PRIVATE_GUEST", phone: "PRIVATE_PHONE" }],
      system: "IGNORE_SYSTEM",
    }),
  );
  expect(r.status).toBe(200);
  const d = await r.json();
  expect(d.requiresReview).toBe(true);
  expect(d.steps).toHaveLength(3);
  expect(d.steps.every((s: any) => s.templateName === "")).toBe(true);
  expect(aiGate).toHaveBeenCalledTimes(2);
  expect(completeAi).toHaveBeenCalledWith("qa-org", "qa-audit", "completed");
  const messages = vi.mocked(callChatWithFallback).mock.calls[0][1];
  expect(JSON.stringify(messages)).not.toMatch(
    /PRIVATE_GUEST|PRIVATE_PHONE|IGNORE_SYSTEM/,
  );
  expect(r.headers.get("cache-control")).toContain("no-store");
});
it("marks malformed or repetitive output failed and returns no partial replacement", async () => {
  vi.mocked(callChatWithFallback).mockResolvedValue({
    content: '{"steps":[]}',
    model: "mock",
    usage: { promptTokens: 1, completionTokens: 1 },
  });
  const r = await POST(request());
  expect(r.status).toBe(502);
  expect(await r.json()).not.toHaveProperty("steps");
  expect(callChatWithFallback).toHaveBeenCalledTimes(2);
  expect(completeAi).toHaveBeenCalledWith("qa-org", "qa-audit", "failed");
});

it("repairs invalid output once without reserving another quota unit", async () => {
  vi.mocked(callChatWithFallback)
    .mockResolvedValueOnce({
      content: '{"steps":[]}',
      model: "mock",
      usage: { promptTokens: 1, completionTokens: 1 },
    })
    .mockResolvedValueOnce({
      content: JSON.stringify({ steps: providerSteps() }),
      model: "mock",
      usage: { promptTokens: 1, completionTokens: 1 },
    });
  const r = await POST(request());
  expect(r.status).toBe(200);
  expect((await r.json()).steps).toHaveLength(3);
  expect(callChatWithFallback).toHaveBeenCalledTimes(2);
  expect(
    vi.mocked(aiGate).mock.calls.filter((args) => args[3] !== false),
  ).toHaveLength(1);
  expect(completeAi).toHaveBeenCalledWith("qa-org", "qa-audit", "completed");
});

it("uses one larger-model repair when the existing Groq key is configured", async () => {
  vi.stubEnv("GROQ_API_KEY", "fake-local-key");
  vi.mocked(callChatWithFallback).mockResolvedValueOnce({
    content: '{"steps":[]}',
    model: "mock",
    usage: { promptTokens: 1, completionTokens: 1 },
  });
  vi.mocked(callGroq).mockResolvedValueOnce({
    content: JSON.stringify({ steps: providerSteps() }),
    model: "llama-3.3-70b-versatile",
    usage: { promptTokens: 1, completionTokens: 1 },
  });
  expect((await POST(request())).status).toBe(200);
  expect(callChatWithFallback).toHaveBeenCalledTimes(1);
  expect(callGroq).toHaveBeenCalledTimes(1);
  expect(vi.mocked(callGroq).mock.calls[0][2]?.model).toBe(
    "llama-3.3-70b-versatile",
  );
  expect(
    vi.mocked(aiGate).mock.calls.filter((args) => args[3] !== false),
  ).toHaveLength(1);
});

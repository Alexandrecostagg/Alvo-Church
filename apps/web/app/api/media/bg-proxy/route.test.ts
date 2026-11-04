import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("../../_lib/verify-auth", () => ({
  verifyFirebaseIdToken: vi.fn().mockResolvedValue("qa-user"),
}));
vi.mock("../../_lib/ai-quota", () => ({
  aiGate: vi.fn().mockResolvedValue({ auditId: "qa-audit" }),
  completeAi: vi.fn().mockResolvedValue(undefined),
}));
import { aiGate, completeAi } from "../../_lib/ai-quota";
import { GET } from "./route";
const fetchMock = vi.fn();
const jpeg = new Uint8Array([255, 216, 255, 224, 0, 0]);
const request = (query = "") =>
  new NextRequest(
    `https://qa.example.test/api/media/bg-proxy?organizationId=qa-org&prompt=peaceful%20lake${query}`,
    { headers: { Authorization: "Bearer fictitious-token" } },
  );
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  vi.stubEnv("POLLINATIONS_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("returns private images and preserves story aspect ratio", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(jpeg, { headers: { "Content-Type": "image/jpeg" } }),
  );
  const response = await GET(request("&w=1080&h=1920"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.searchParams.get("width")).toBe("864");
  expect(url.searchParams.get("height")).toBe("1536");
  expect(completeAi).toHaveBeenCalledWith("qa-org", "qa-audit", "completed");
});
it("uses the authenticated API with the secret only in a server-side header", async () => {
  vi.stubEnv("POLLINATIONS_API_KEY", "fictional-provider-key");
  fetchMock.mockResolvedValueOnce(
    new Response(jpeg, { headers: { "Content-Type": "image/jpeg" } }),
  );
  expect((await GET(request())).status).toBe(200);
  const [url, options] = fetchMock.mock.calls[0];
  expect(new URL(url).hostname).toBe("gen.pollinations.ai");
  expect(url).not.toContain("fictional-provider-key");
  expect(options.headers.Authorization).toBe("Bearer fictional-provider-key");
});
it("rejects a provider error disguised as a JPEG and marks the attempt failed", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response("not an image", { headers: { "Content-Type": "image/jpeg" } }),
  );
  const response = await GET(request());
  expect(response.status).toBe(502);
  expect(completeAi).toHaveBeenCalledWith("qa-org", "qa-audit", "failed");
});
it("validates the prompt before consuming quota", async () => {
  const response = await GET(
    new NextRequest(
      "https://qa.example.test/api/media/bg-proxy?organizationId=qa-org&prompt=" +
        "a".repeat(601),
      { headers: { Authorization: "Bearer fictitious-token" } },
    ),
  );
  expect(response.status).toBe(422);
  expect(aiGate).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("does not retry the provider automatically after a failure", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response("upstream unavailable", { status: 503 }),
  );
  expect((await GET(request())).status).toBe(502);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(completeAi).toHaveBeenCalledWith("qa-org", "qa-audit", "failed");
});

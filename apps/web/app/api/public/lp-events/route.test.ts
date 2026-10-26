import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { OPTIONS } from "./route";
afterEach(() => vi.unstubAllEnvs());
it("only allows local analytics origins outside production", async () => {
  const req = () => new NextRequest("https://qa.example.test/api/public/lp-events", {method:"OPTIONS",headers:{origin:"http://localhost:3000"}});
  vi.stubEnv("NODE_ENV","production");
  expect((await OPTIONS(req())).status).toBe(403);
  vi.stubEnv("NODE_ENV","development");
  expect((await OPTIONS(req())).status).toBe(204);
});
it("allows the public landing origin in production without credentials", async () => {
  vi.stubEnv("NODE_ENV","production");
  const response = await OPTIONS(new NextRequest("https://qa.example.test/api/public/lp-events",{method:"OPTIONS",headers:{origin:"https://plataformaesdras.com.br"}}));
  expect(response.status).toBe(204);
  expect(response.headers.get("access-control-allow-origin")).toBe("https://plataformaesdras.com.br");
  expect(response.headers.get("access-control-allow-credentials")).toBeNull();
});

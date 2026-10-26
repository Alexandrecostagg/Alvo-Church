import { expect, it, vi } from "vitest";
import worker from "./index";

const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII="), c => c.charCodeAt(0));
function upload() {
  const body = new FormData();
  body.set("organizationId", "synthetic-org");
  body.set("assetKind", "logoLight");
  body.set("file", new File([png], "synthetic.png", {type:"image/png"}));
  return new Request("https://worker.example.test/tenant-assets/upload", {method:"POST",headers:{Authorization:"Bearer synthetic-only"},body});
}
it("rejects unconfigured and unauthenticated upload without writing storage", async () => {
  const put = vi.fn();
  const request = new Request("https://worker.example.test/tenant-assets/upload",{method:"POST"});
  expect((await worker.fetch(request, {} as any)).status).toBe(503);
  expect((await worker.fetch(request, {UPLOAD_API_BEARER_TOKEN:"synthetic-only",BRAND_ASSETS_BUCKET:{put}} as any)).status).toBe(401);
  expect(put).not.toHaveBeenCalled();
});
it("writes only the validated branding path for an authorized raster upload", async () => {
  const put = vi.fn(async (_key: string, _bytes: Uint8Array) => undefined);
  const response = await worker.fetch(upload(),{UPLOAD_API_BEARER_TOKEN:"synthetic-only",BRAND_ASSETS_BUCKET:{put}} as any);
  expect(response.status).toBe(200);
  expect(put).toHaveBeenCalledOnce();
  expect(put.mock.calls[0][0]).toMatch(/^organizations\/synthetic-org\/branding\/logoLight\//);
});
it("does not disclose unexpected storage exception details to callers", async () => {
  const put = vi.fn(async () => {throw new Error("SYNTHETIC_INTERNAL_PROVIDER_DETAIL");});
  const response = await worker.fetch(upload(),{UPLOAD_API_BEARER_TOKEN:"synthetic-only",BRAND_ASSETS_BUCKET:{put}} as any);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("SYNTHETIC_INTERNAL_PROVIDER_DETAIL");
});

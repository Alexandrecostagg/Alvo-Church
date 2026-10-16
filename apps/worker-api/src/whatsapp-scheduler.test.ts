import { afterEach, expect, it, vi } from "vitest";
import { processWhatsappQueue } from "./whatsapp-scheduler";
afterEach(() => vi.unstubAllGlobals());
it("does nothing before the queue is configured", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await processWhatsappQueue({});
  expect(fetcher).not.toHaveBeenCalled();
});
it("uses only the configured origin, authenticated endpoint and selected tenants", async () => {
  const fetcher = vi.fn(async () => new Response("{}"));
  vi.stubGlobal("fetch", fetcher);
  await processWhatsappQueue({
    WHATSAPP_PROCESS_ORIGIN: "https://church.example/untrusted-path",
    WHATSAPP_PROCESS_TOKEN: "test",
    WHATSAPP_PROCESS_ORGANIZATIONS: "org_a,org_b",
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
  const [url, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
  expect(url.toString()).toBe(
    "https://church.example/api/whatsapp/process?organizationId=org_a",
  );
  expect(options.headers).toEqual({ Authorization: "Bearer test" });
  expect(options.redirect).toBe("error");
});
it("rejects non-HTTPS and invalid tenant identifiers", async () => {
  await expect(
    processWhatsappQueue({
      WHATSAPP_PROCESS_ORIGIN: "http://church.example",
      WHATSAPP_PROCESS_TOKEN: "x",
    }),
  ).rejects.toThrow();
  await expect(
    processWhatsappQueue({
      WHATSAPP_PROCESS_ORIGIN: "https://church.example",
      WHATSAPP_PROCESS_TOKEN: "x",
      WHATSAPP_PROCESS_ORGANIZATIONS: "../org",
    }),
  ).rejects.toThrow();
});

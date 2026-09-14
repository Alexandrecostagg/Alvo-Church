import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { billingEvent } from "../../_lib/billing-operations";

vi.mock("../../_lib/billing-operations", () => ({
  billingEvent: vi.fn().mockResolvedValue({ ok: true }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("webhook authentication diagnostics", () => {
  it("rejects a pasted assignment without logging credentials or processing payment data", async () => {
    const secret = "a7c3e9b1".repeat(8);
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", secret);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await POST(
      new NextRequest("https://example.com/api/billing/webhook", {
        method: "POST",
        headers: { "asaas-access-token": `ASAAS_WEBHOOK_TOKEN=${secret}` },
        body: JSON.stringify({ privatePayment: "must-not-be-logged" }),
      }),
    );
    expect(response.status).toBe(401);
    expect(billingEvent).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "asaas_webhook_auth_rejected",
      expect.objectContaining({ containsAssignment: true }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("must-not-be-logged");
  });

  it("continues processing authenticated events without authentication warnings", async () => {
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "test-token");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await POST(
      new NextRequest("https://example.com/api/billing/webhook", {
        method: "POST",
        headers: {
          "asaas-access-token": "test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event: "DIAGNOSTIC" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(billingEvent).toHaveBeenCalledWith({ event: "DIAGNOSTIC" });
    expect(warn).not.toHaveBeenCalled();
  });
});

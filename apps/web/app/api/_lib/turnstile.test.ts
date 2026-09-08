import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const validRequest = {
  token: "valid-turnstile-token",
  expectedAction: "public_visit" as const,
  remoteIp: "203.0.113.8",
  idempotencyKey: "4aa71ab6-4e1d-4be1-85c4-e7569408b9e8",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Turnstile server validation", () => {
  it("fails closed in production when the secret is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("TURNSTILE_ALLOWED_HOSTNAMES", "example.com");

    await expect(verifyTurnstile(validRequest)).rejects.toMatchObject({
      status: 503,
    });
  });

  it("fails closed in production when allowed hostnames are not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "server-secret");
    vi.stubEnv("TURNSTILE_ALLOWED_HOSTNAMES", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstile(validRequest)).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["", " ", "x".repeat(2049), null, { token: "x" }])(
    "rejects an invalid challenge token",
    async (token) => {
      vi.stubEnv("TURNSTILE_SECRET_KEY", "server-secret");
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        verifyTurnstile({ ...validRequest, token }),
      ).rejects.toMatchObject({ status: 400 });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("sends the private secret and binds action, hostname, IP, and retry ID", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "server-secret");
    vi.stubEnv("TURNSTILE_ALLOWED_HOSTNAMES", " app.example.com,example.com ");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        action: "public_visit",
        hostname: "app.example.com",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await verifyTurnstile(validRequest);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(init.method).toBe("POST");
    const body = init.body as URLSearchParams;
    expect(Object.fromEntries(body.entries())).toEqual({
      secret: "server-secret",
      response: "valid-turnstile-token",
      remoteip: "203.0.113.8",
      idempotency_key: "4aa71ab6-4e1d-4be1-85c4-e7569408b9e8",
    });
  });

  it.each([
    [{ success: false, "error-codes": ["invalid-input-response"] }, 400],
    [{ success: true, action: "different", hostname: "example.com" }, 400],
    [{ success: true, action: "public_visit", hostname: "evil.test" }, 400],
  ])("rejects an untrusted validation response", async (result, status) => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "server-secret");
    vi.stubEnv("TURNSTILE_ALLOWED_HOSTNAMES", "example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(result)));

    await expect(verifyTurnstile(validRequest)).rejects.toMatchObject({
      status,
    });
  });

  it("returns a retryable error when Siteverify is unavailable", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "server-secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(verifyTurnstile(validRequest)).rejects.toMatchObject({
      status: 503,
    });
  });
});

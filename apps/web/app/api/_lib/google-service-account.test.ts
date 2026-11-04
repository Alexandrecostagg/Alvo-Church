import { afterEach, expect, it, vi } from "vitest";
import { getGoogleAccessToken, googleServiceAccountIdentity } from "./google-service-account";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("não reutiliza token do Firestore para Storage com outro escopo", async () => {
  const key = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const pem = Buffer.from(await crypto.subtle.exportKey("pkcs8", key.privateKey)).toString("base64");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", JSON.stringify({ client_email: "qa@example.test", private_key: `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----` }));
  const scopes: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    const assertion = (options.body as URLSearchParams).get("assertion")!;
    const scope = JSON.parse(Buffer.from(assertion.split(".")[1], "base64url").toString()).scope;
    scopes.push(scope);
    return Response.json({ access_token: `token-${scope}`, expires_in: 3600 });
  }));
  expect(await getGoogleAccessToken("datastore-test")).toBe("token-datastore-test");
  expect(await getGoogleAccessToken("storage-test")).toBe("token-storage-test");
  expect(await getGoogleAccessToken("datastore-test")).toBe("token-datastore-test");
  expect(scopes).toEqual(["datastore-test", "storage-test"]);
});

it("exposes only a validated service identity for backend diagnostics", () => {
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", JSON.stringify({ client_email: "runtime@alvo-church.iam.gserviceaccount.com", private_key: "must-not-leak" }));
  expect(googleServiceAccountIdentity()).toBe("runtime@alvo-church.iam.gserviceaccount.com");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", JSON.stringify({ client_email: "not-a-service-account", private_key: "must-not-leak" }));
  expect(googleServiceAccountIdentity()).toBe("unavailable");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", "invalid-json-secret");
  expect(googleServiceAccountIdentity()).toBe("unavailable");
});

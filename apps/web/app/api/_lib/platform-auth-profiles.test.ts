import { afterEach, expect, it, vi } from "vitest";
vi.mock("./google-service-account", () => ({
  getGoogleAccessToken: vi.fn(async () => "fake-service-token"),
}));
import { readPlatformAuthProfiles } from "./platform-auth-profiles";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("projects only account profile fields, never credentials, and ignores unrequested accounts", async () => {
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-alvo-qa");
  const fetcher = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          users: [
            {
              localId: "user1",
              email: "fictional@example.test",
              displayName: "Fictício",
              emailVerified: true,
              disabled: false,
              createdAt: "1700000000000",
              lastLoginAt: "1700000100000",
              passwordHash: "secret",
              salt: "secret",
              customAttributes: "secret",
              mfaInfo: "secret",
            },
            { localId: "not-requested", email: "outside@example.test" },
          ],
        }),
        { status: 200 },
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  const result = await readPlatformAuthProfiles(["user1"]);
  expect([...result.keys()]).toEqual(["user1"]);
  expect(result.get("user1")).toMatchObject({
    displayName: "Fictício",
    emailVerified: true,
    lastSignInAt: "2023-11-14T22:15:00.000Z",
  });
  expect(JSON.stringify([...result.values()])).not.toContain("secret");
  expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)).toEqual({
    localId: ["user1"],
  });
});

it("batches unique IDs without requesting all Firebase users", async () => {
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-alvo-qa");
  const fetcher = vi.fn(
    async () => new Response('{"users":[]}', { status: 200 }),
  );
  vi.stubGlobal("fetch", fetcher);
  await readPlatformAuthProfiles([
    ...Array.from({ length: 205 }, (_, n) => `user${n}`),
    "user1",
  ]);
  expect(fetcher).toHaveBeenCalledTimes(3);
});

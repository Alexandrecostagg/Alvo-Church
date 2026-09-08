import { describe, expect, it } from "vitest";
import { type AccountTransaction } from "./member-account-store";
import { assertModuleEnabled } from "./module-access";

function transaction(features: unknown): AccountTransaction {
  return {
    query: async () => [],
    usersByEmail: async () => [],
    read: async () => [features as Record<string, unknown> | null],
    set: () => {},
    patch: () => {},
    remove: () => {},
  };
}

describe("server module access", () => {
  it.each([null, {}, { modules: {} }, { modules: { children: { enabled: true } } }])(
    "keeps legacy or enabled settings accessible",
    async (features) => {
      await expect(
        assertModuleEnabled(transaction(features), "organizations/org", "children"),
      ).resolves.toBeUndefined();
    },
  );

  it("rejects a module explicitly paused by the platform administrator", async () => {
    await expect(
      assertModuleEnabled(
        transaction({ modules: { children: { enabled: false } } }),
        "organizations/org",
        "children",
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});

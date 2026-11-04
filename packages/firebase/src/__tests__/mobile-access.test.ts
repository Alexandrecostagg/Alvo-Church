import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("firebase/firestore", () => ({ doc: (_db: unknown, ...path: string[]) => path.join("/"), getDocFromServer: mocks.read }));
vi.mock("../client", () => ({ getFirebaseFirestore: () => ({}) }));
import { fetchMobileTenantAccess } from "../mobile-access";
const config = { apiKey: "test", authDomain: "test", projectId: "test", storageBucket: "test" };
const snap = (data: Record<string, unknown> | null) => ({ exists: () => data !== null, data: () => data });
beforeEach(() => { mocks.read.mockReset(); });
describe("mobile server access", () => {
  it("reads the current tenant membership and organization from the server", async () => {
    mocks.read.mockResolvedValueOnce(snap({ organizationId: "org", isActive: true })).mockResolvedValueOnce(snap({ status: "active" }));
    expect(await fetchMobileTenantAccess(config, "org", "uid")).toBe(true);
    expect(mocks.read.mock.calls).toEqual([["organizations/org/users/uid"], ["organizations/org"]]);
  });
  it.each([null, { organizationId: "org", isActive: false }, { organizationId: "org" }, { organizationId: "other", isActive: true }])("denies absent, inactive or mismatched membership (%#)", async member => {
    mocks.read.mockResolvedValueOnce(snap(member));
    expect(await fetchMobileTenantAccess(config, "org", "uid")).toBe(false);
    expect(mocks.read).toHaveBeenCalledTimes(1);
  });
  it.each([null, { status: "inactive" }, { status: "suspended" }])("denies unavailable organization (%#)", async org => {
    mocks.read.mockResolvedValueOnce(snap({ organizationId: "org", isActive: true })).mockResolvedValueOnce(snap(org));
    expect(await fetchMobileTenantAccess(config, "org", "uid")).toBe(false);
  });
  it("preserves the legacy organization status rule", async () => {
    mocks.read.mockResolvedValueOnce(snap({ organizationId: "org", isActive: true })).mockResolvedValueOnce(snap({}));
    expect(await fetchMobileTenantAccess(config, "org", "uid")).toBe(true);
  });
  it("propagates offline failures instead of authorizing from cached data", async () => {
    mocks.read.mockRejectedValue(new Error("offline"));
    await expect(fetchMobileTenantAccess(config, "org", "uid")).rejects.toThrow("offline");
  });
});

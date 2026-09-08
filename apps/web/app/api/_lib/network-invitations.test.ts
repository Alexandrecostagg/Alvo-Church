import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  docs: new Map<string, Record<string, any>>(),
  queries: new Map<string, Record<string, any>[]>(),
  writes: [] as Array<{ kind: string; path: string; data?: Record<string, any> }>,
}));

vi.mock("./member-account-store", async () => {
  class AccountError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  }
  return {
    AccountError,
    accountTransaction: async (work: (tx: any) => Promise<unknown>) => work({
      read: async (...paths: string[]) => paths.map((path) => state.docs.get(path) ?? null),
      query: async (parent: string, collection: string) => state.queries.get(`${parent}/${collection}`) ?? [],
      usersByEmail: async () => [],
      set: (path: string, data: Record<string, any>) => state.writes.push({ kind: "set", path, data }),
      patch: (path: string, data: Record<string, any>) => state.writes.push({ kind: "patch", path, data }),
      remove: (path: string) => state.writes.push({ kind: "remove", path }),
    }),
  };
});

import {
  acceptNetworkInvite,
  createNetworkInvite,
  deactivateNetworkAffiliate,
  inspectNetworkInvite,
  renewNetworkInvite,
} from "./network-invitations";

const parentId = "parent_org";
const childId = "child_org";
const parentRoot = `organizations/${parentId}`;
const childRoot = `organizations/${childId}`;

function adminOrganization(id: string, uid: string, plan = "rede") {
  const root = `organizations/${id}`;
  state.docs.set(root, { id, displayName: id === parentId ? "Rede Esperança" : "Igreja Filial", status: "active" });
  state.docs.set(`${root}/users/${uid}`, { organizationId: id, isActive: true, roles: ["church_admin"] });
  state.docs.set(`${root}/settings/subscription`, { plan });
}

beforeEach(() => {
  state.docs.clear();
  state.queries.clear();
  state.writes.length = 0;
});

describe("network invitations", () => {
  it("creates a unique server invitation and updates the authoritative count", async () => {
    adminOrganization(parentId, "parent_admin");
    const result = await createNetworkInvite({
      organizationId: parentId,
      requestId: "attempt_1",
      childName: "Igreja Norte",
      childCity: "Belém",
      childState: "PA",
    }, "parent_admin");
    expect(result.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
    expect(result.affiliate).toMatchObject({ parentOrganizationId: parentId, status: "pending" });
    expect(result.affiliate).not.toHaveProperty("inviteCodeHash");
    expect(state.writes.some((write) => write.path.startsWith("networkInviteClaims/"))).toBe(true);
    expect(state.writes.find((write) => write.path === parentRoot)?.data).toEqual({ affiliateCount: 1 });
  });

  it("refuses invitations outside the Rede or Enterprise plans", async () => {
    adminOrganization(parentId, "parent_admin", "comunidade");
    await expect(createNetworkInvite({
      organizationId: parentId,
      requestId: "attempt_2",
      childName: "Igreja Norte",
    }, "parent_admin")).rejects.toMatchObject({ status: 403 });
    expect(state.writes).toHaveLength(0);
  });

  it("enforces the 50-institution Rede limit with pending invitations included", async () => {
    adminOrganization(parentId, "parent_admin");
    state.queries.set(`${parentRoot}/affiliates`, Array.from({ length: 50 }, (_, index) => ({ id: `a${index}`, status: "active" })));
    await expect(createNetworkInvite({
      organizationId: parentId,
      requestId: "attempt_3",
      childName: "Igreja Norte",
    }, "parent_admin")).rejects.toMatchObject({ status: 409 });
  });

  it("lets an authenticated child administrator inspect and accept once", async () => {
    adminOrganization(childId, "child_admin", "free");
    const code = "ABCDEFGHJK";
    const hash = createHash("sha256").update(code).digest("hex");
    state.docs.set(`networkInviteClaims/${hash}`, {
      parentOrganizationId: parentId,
      affiliateId: "affiliate_one",
      status: "active",
      expiresAt: Date.now() + 60_000,
    });
    state.docs.set(parentRoot, { displayName: "Rede Esperança", status: "active" });
    state.docs.set(`${parentRoot}/affiliates/affiliate_one`, {
      id: "affiliate_one",
      parentOrganizationId: parentId,
      childOrganizationId: "",
      childName: "Igreja Norte",
      status: "pending",
      inviteCodeHash: hash,
    });
    await expect(inspectNetworkInvite({ organizationId: childId, inviteCode: code }, "child_admin"))
      .resolves.toMatchObject({ parentName: "Rede Esperança", childName: "Igreja Filial" });
    const accepted = await acceptNetworkInvite({ organizationId: childId, inviteCode: code }, "child_admin");
    expect(accepted.affiliate).toMatchObject({ childOrganizationId: childId, status: "active" });
    expect(state.writes.some((write) => write.path === `networkAffiliations/${childId}`)).toBe(true);
    expect(state.writes.some((write) => write.path.endsWith("/networkAudit/"))).toBe(false);
    expect(state.writes.some((write) => write.path.includes("/networkAudit/"))).toBe(true);
  });

  it("prevents an institution from joining a second network", async () => {
    adminOrganization(childId, "child_admin", "free");
    const code = "KLMNPQRSTU";
    const hash = createHash("sha256").update(code).digest("hex");
    state.docs.set(`networkInviteClaims/${hash}`, { parentOrganizationId: parentId, affiliateId: "affiliate_two", status: "active", expiresAt: Date.now() + 60_000 });
    state.docs.set(parentRoot, { displayName: "Rede Esperança", status: "active" });
    state.docs.set(`${parentRoot}/affiliates/affiliate_two`, { status: "pending", inviteCodeHash: hash });
    state.docs.set(`networkAffiliations/${childId}`, { parentOrganizationId: "another_parent" });
    await expect(acceptNetworkInvite({ organizationId: childId, inviteCode: code }, "child_admin"))
      .rejects.toMatchObject({ status: 409 });
    expect(state.writes).toHaveLength(0);
  });

  it("allows a previously deactivated institution to join a new network", async () => {
    adminOrganization(childId, "child_admin", "free");
    const code = "NPQRSTUVWX";
    const hash = createHash("sha256").update(code).digest("hex");
    state.docs.set(`networkInviteClaims/${hash}`, { parentOrganizationId: parentId, affiliateId: "affiliate_new", status: "active", expiresAt: Date.now() + 60_000 });
    state.docs.set(parentRoot, { displayName: "Rede Esperança", status: "active" });
    state.docs.set(`${parentRoot}/affiliates/affiliate_new`, { status: "pending", inviteCodeHash: hash });
    state.docs.set(`networkAffiliations/${childId}`, { parentOrganizationId: "old_parent", status: "inactive" });
    await expect(acceptNetworkInvite({ organizationId: childId, inviteCode: code }, "child_admin"))
      .resolves.toMatchObject({ affiliate: { childOrganizationId: childId, status: "active" } });
  });

  it("rejects expired invitations without writing anything", async () => {
    adminOrganization(childId, "child_admin", "free");
    const code = "23456789AB";
    const hash = createHash("sha256").update(code).digest("hex");
    state.docs.set(`networkInviteClaims/${hash}`, {
      parentOrganizationId: parentId,
      affiliateId: "affiliate_expired",
      status: "active",
      expiresAt: Date.now() - 1,
    });
    await expect(inspectNetworkInvite({ organizationId: childId, inviteCode: code }, "child_admin"))
      .rejects.toMatchObject({ status: 404 });
    expect(state.writes).toHaveLength(0);
  });

  it("prevents a network administrator from linking the parent to itself", async () => {
    adminOrganization(parentId, "parent_admin");
    const code = "CDEFGHJKLM";
    const hash = createHash("sha256").update(code).digest("hex");
    state.docs.set(`networkInviteClaims/${hash}`, {
      parentOrganizationId: parentId,
      affiliateId: "affiliate_self",
      status: "active",
      expiresAt: Date.now() + 60_000,
    });
    await expect(acceptNetworkInvite({ organizationId: parentId, inviteCode: code }, "parent_admin"))
      .rejects.toMatchObject({ status: 409 });
    expect(state.writes).toHaveLength(0);
  });

  it("reissues a pending invitation and revokes the previous claim", async () => {
    adminOrganization(parentId, "parent_admin");
    const oldHash = createHash("sha256").update("ABCDEFGHJK").digest("hex");
    state.docs.set(`${parentRoot}/affiliates/affiliate_pending`, {
      id: "affiliate_pending",
      parentOrganizationId: parentId,
      status: "pending",
      inviteCodeHash: oldHash,
    });
    state.docs.set(`networkInviteClaims/${oldHash}`, { status: "active" });
    const result = await renewNetworkInvite({ organizationId: parentId, affiliateId: "affiliate_pending" }, "parent_admin");
    expect(result.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
    expect(state.writes).toContainEqual(expect.objectContaining({ kind: "patch", path: `networkInviteClaims/${oldHash}`, data: expect.objectContaining({ status: "revoked" }) }));
    expect(state.writes.some((write) => write.kind === "set" && write.path.startsWith("networkInviteClaims/") && write.path !== `networkInviteClaims/${oldHash}`)).toBe(true);
  });

  it("deactivates an affiliate, releases the count, and closes the global link", async () => {
    adminOrganization(parentId, "parent_admin");
    state.docs.set(`${parentRoot}/affiliates/affiliate_active`, {
      id: "affiliate_active",
      parentOrganizationId: parentId,
      childOrganizationId: childId,
      childName: "Igreja Filial",
      status: "active",
    });
    state.docs.set(`networkAffiliations/${childId}`, { parentOrganizationId: parentId, status: "active" });
    state.queries.set(`${parentRoot}/affiliates`, [
      { id: "affiliate_active", status: "active" },
      { id: "affiliate_other", status: "pending" },
    ]);
    const result = await deactivateNetworkAffiliate({ organizationId: parentId, affiliateId: "affiliate_active" }, "parent_admin");
    expect(result.affiliate.status).toBe("inactive");
    expect(state.writes).toContainEqual(expect.objectContaining({ kind: "patch", path: `networkAffiliations/${childId}`, data: expect.objectContaining({ status: "inactive" }) }));
    expect(state.writes).toContainEqual({ kind: "patch", path: parentRoot, data: { affiliateCount: 1 } });
  });
});

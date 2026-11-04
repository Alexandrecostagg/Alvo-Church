import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountTransaction } from "./member-account-store";
const store = vi.hoisted(() => ({
  docs: new Map<string, any>(),
  writes: [] as Array<{ path: string; data: any; kind: string }>,
}));
vi.mock("./member-account-store", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./member-account-store")>();
  return {
    ...original,
    accountTransaction: async (work: (tx: AccountTransaction) => unknown) =>
      work({
        read: async (...paths) => paths.map((p) => store.docs.get(p) ?? null),
        query: async (parent, collection, field, value) =>
          [...store.docs]
            .filter(
              ([path, data]) =>
                path.startsWith(`${parent}/${collection}/`) &&
                path.split("/").length === parent.split("/").length + 2 &&
                (!field || data[field] === value),
            )
            .map(([path, data]) => ({ ...data, id: path.split("/").at(-1) })),
        set: (path, data) => {
          store.writes.push({ path, data, kind: "set" });
          store.docs.set(path, data);
        },
        patch: (path, data) => {
          store.writes.push({ path, data, kind: "patch" });
          store.docs.set(path, { ...store.docs.get(path), ...data });
        },
        remove: () => {},
        usersByEmail: async () => [],
      }),
  };
});
import { mobileMemberOperation } from "./mobile-member";
const root = "organizations/test";
const call = (body: Record<string, unknown>, uid = "uid") =>
  mobileMemberOperation({ organizationId: "test", ...body }, uid);
beforeEach(() => {
  store.docs.clear();
  store.writes.length = 0;
  Object.entries({
    [root]: { status: "active" },
    [`${root}/users/uid`]: {
      organizationId: "test",
      isActive: true,
      personId: "person",
    },
    [`${root}/memberAccountLinks/uid`]: {
      organizationId: "test",
      userId: "uid",
      personId: "person",
      verifiedBy: "admin",
    },
    [`${root}/people/person`]: { organizationId: "test", status: "active" },
    [`${root}/memberAccountClaims/person`]: {
      organizationId: "test",
      personId: "person",
      userId: "uid",
    },
    [`${root}/serviceAssignments/own`]: {
      organizationId: "test",
      personId: "person",
      serviceTeamId: "music",
      ministryCode: "LEVI",
      role: "Voz",
      serviceDate: "2026-12-01T20:00:00Z",
      createdAt: "original",
      status: "pending",
    },
    [`${root}/serviceAssignments/other`]: {
      organizationId: "test",
      personId: "other",
      status: "pending",
    },
    [`${root}/groups/cell`]: {
      organizationId: "test",
      status: "active",
      name: "Célula fictícia",
    },
    [`${root}/groups/cell/members/cell_person`]: {
      organizationId: "test",
      groupId: "cell",
      personId: "person",
    },
    [`${root}/groups/cell/meetings/today`]: {
      organizationId: "test",
      groupId: "cell",
      meetingStatus: "scheduled",
      scheduledStartAt: new Date().toISOString(),
    },
  }).forEach(([path, value]) => store.docs.set(path, value));
});
describe("mobile member operations", () => {
  it("reads assignments using verified person, ignoring caller supplied identity", async () => {
    const data = await call({ action: "assignments", personId: "other" });
    expect(data.assignments?.map((a) => a.id)).toEqual(["own"]);
  });
  it("responds by patching only response fields, preserving the original schedule", async () => {
    await call({
      action: "respond",
      assignmentId: "own",
      status: "confirmed",
      serviceDate: "corrupt",
      personId: "other",
    });
    expect(store.docs.get(`${root}/serviceAssignments/own`)).toMatchObject({
      serviceTeamId: "music",
      ministryCode: "LEVI",
      serviceDate: "2026-12-01T20:00:00Z",
      createdAt: "original",
      personId: "person",
      status: "confirmed",
    });
    expect(store.writes[0].kind).toBe("patch");
  });
  it("refuses another member's assignment", async () => {
    await expect(
      call({ action: "respond", assignmentId: "other", status: "declined" }),
    ).rejects.toMatchObject({ status: 404 });
    expect(store.writes).toHaveLength(0);
  });
  it("makes repeated responses idempotent and prevents overwriting another response", async () => {
    await call({
      action: "respond",
      assignmentId: "own",
      status: "declined",
      note: "  Indisponível  ",
    });
    expect(
      await call({
        action: "respond",
        assignmentId: "own",
        status: "declined",
      }),
    ).toMatchObject({ replayed: true });
    await expect(
      call({ action: "respond", assignmentId: "own", status: "confirmed" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      store.writes.filter((w) => w.path.includes("/serviceAssignments/")),
    ).toHaveLength(1);
    expect(
      store.writes.filter((w) => w.path.includes("/servingAudit/")),
    ).toHaveLength(1);
    expect(store.writes[0].data.responseNote).toBe("Indisponível");
  });
  it("does not treat auth UID as a person or trust an unverified link", async () => {
    store.docs.delete(`${root}/memberAccountLinks/uid`);
    expect(await call({ action: "assignments" })).toMatchObject({
      status: "unlinked",
      assignments: [],
    });
    await expect(
      call({ action: "attendance", groupId: "cell", meetingId: "today" }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it.each(["memberAccountClaims/person", "people/person"])(
    "requires %s",
    async (path) => {
      store.docs.delete(`${root}/${path}`);
      expect(await call({ action: "groups" })).toMatchObject({
        status: "unlinked",
        groups: [],
      });
    },
  );
  it.each(["groups", "volunteers", "journeys"])(
    "rejects paused module %s",
    async (module) => {
      store.docs.set(`${root}/settings/features`, {
        modules: { [module]: { enabled: false } },
      });
      await expect(
        call({
          action:
            module === "groups"
              ? "groups"
              : module === "journeys"
                ? "journey"
                : "assignments",
        }),
      ).rejects.toMatchObject({ status: 403 });
    },
  );
  it("rejects inactive user and foreign organization", async () => {
    await expect(call({ action: "groups" }, "outsider")).rejects.toMatchObject({
      status: 403,
    });
    store.docs.set(`${root}/users/uid`, {
      organizationId: "test",
      isActive: false,
    });
    await expect(call({ action: "groups" })).rejects.toMatchObject({
      status: 403,
    });
  });
  it("shows only own cells and persists attendance", async () => {
    store.docs.set(`${root}/groups/foreign`, {
      organizationId: "test",
      status: "active",
      name: "Outra",
    });
    const data = await call({ action: "groups" });
    expect(data.groups?.map((g) => g.id)).toEqual(["cell"]);
    await call({
      action: "attendance",
      groupId: "cell",
      meetingId: "today",
      personId: "other",
    });
    expect(store.writes[0].data).toMatchObject({
      personId: "person",
      attendanceStatus: "present",
      recordedBySource: "mobile",
    });
    expect(
      await call({ action: "attendance", groupId: "cell", meetingId: "today" }),
    ).toMatchObject({ replayed: true });
    expect(store.writes).toHaveLength(1);
  });
  it("does not overwrite the leader's attendance", async () => {
    store.docs.set(
      `${root}/groups/cell/meetings/today/attendance/today_person`,
      { attendanceStatus: "absent", recordedByUserId: "leader" },
    );
    await expect(
      call({ action: "attendance", groupId: "cell", meetingId: "today" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(store.writes).toHaveLength(0);
  });
  it.each(["invalid", "2020-01-01T00:00:00Z"])(
    "rejects outside/invalid meeting time %s",
    async (date) => {
      store.docs.get(`${root}/groups/cell/meetings/today`).scheduledStartAt =
        date;
      await expect(
        call({ action: "attendance", groupId: "cell", meetingId: "today" }),
      ).rejects.toMatchObject({ status: 409 });
    },
  );
  it("requires cell membership", async () => {
    store.docs.delete(`${root}/groups/cell/members/cell_person`);
    await expect(
      call({ action: "attendance", groupId: "cell", meetingId: "today" }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it.each(["../test", "test/users"])(
    "rejects unsafe identifiers %s",
    async (organizationId) => {
      await expect(
        call({ action: "groups", organizationId }),
      ).rejects.toMatchObject({ status: 400 });
    },
  );
  it("reads only own journey and projects its public member fields", async () => {
    store.docs.set(`${root}/journeyProfiles/person`, {
      organizationId: "test",
      personId: "person",
      currentStage: "serving",
      internalNote: "private",
    });
    const result = await call({ action: "journey" });
    expect(result.profile).toMatchObject({ currentStage: "serving" });
    expect(result.profile).not.toHaveProperty("internalNote");
  });
});

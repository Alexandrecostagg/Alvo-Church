import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ docs: new Map<string, Record<string, any>>(), lessons: [{ id: "lesson", videoUrl: "https://youtu.be/owned", materialUrl: "https://example.test/owned.pdf" }] as Record<string, any>[], writes: new Map<string, Record<string, any>>() }));
vi.mock("./member-account-store", () => ({
  AccountError: class extends Error { constructor(public status: number, message: string) { super(message); } },
  accountTransaction: async (work: (tx: any) => Promise<unknown>) => work({
    read: async (...paths: string[]) => paths.map(path => state.docs.get(path) ?? state.writes.get(path) ?? null),
    query: async (_parent: string, collection: string) => collection === "modules" ? [{ id: "module" }] : state.lessons,
    set: (path: string, data: Record<string, any>) => state.writes.set(path, data),
  }),
}));
import { manageCourse } from "./course-management";
import { COURSE_RIGHTS_DECLARATION, COURSE_RIGHTS_VERSION } from "../../../src/lib/course-content-rights";

const root = "organizations/org";
const input = { action: "save_course", organizationId: "org", requestId: "attempt", courseId: "course", title: "Curso", isActive: true };
const rights = { accepted: true, version: COURSE_RIGHTS_VERSION, reference: "Vídeo próprio e licença dos materiais guardados pela secretaria." };
beforeEach(() => {
  state.docs.clear(); state.writes.clear();
  state.lessons = [{ id: "lesson", videoUrl: "https://youtu.be/owned", materialUrl: "https://example.test/owned.pdf" }];
  state.docs.set(root, { status: "active" });
  state.docs.set(`${root}/users/admin`, { organizationId: "org", isActive: true, roles: ["church_admin"] });
});

describe("course publication rights", () => {
  it.each([undefined, null, { ...rights, accepted: false }, { ...rights, accepted: "true" }, { ...rights, version: "old" }, { ...rights, reference: "" }, { ...rights, reference: "ok" }, { ...rights, reference: "x".repeat(1001) }])("rejects missing/invalid declarations without writing", async contentRights => {
    await expect(manageCourse({ ...input, contentRights }, "admin")).rejects.toMatchObject({ status: 400 });
    expect(state.writes.size).toBe(0);
  });
  it("requires a declaration when updating an already published legacy course", async () => {
    state.docs.set(`${root}/courses/course`, { organizationId: "org", isActive: true });
    await expect(manageCourse(input, "admin")).rejects.toMatchObject({ status: 400 });
  });
  it("allows drafts and unpublishing without an authorization claim", async () => {
    state.docs.set(`${root}/courses/course`, { organizationId: "org", isActive: true });
    await manageCourse({ ...input, isActive: false }, "admin");
    expect(state.writes.get(`${root}/courses/course`)?.isActive).toBe(false);
    expect([...state.writes.values()].some(doc => doc.contentRights)).toBe(false);
  });
  it("records identity, server date, declaration and content privately and retries only once", async () => {
    const request = { ...input, contentRights: { ...rights, acceptedBy: "spoof", acceptedAt: "yesterday" } };
    await manageCourse(request, "admin");
    const audit = [...state.writes.entries()].find(([path]) => path.includes("/courseManagementAudit/"))![1];
    expect(audit.contentRights).toMatchObject({ ...rights, declaration: COURSE_RIGHTS_DECLARATION, acceptedBy: "admin", content: { lessons: state.lessons } });
    expect(Number.isFinite(Date.parse(audit.contentRights.acceptedAt))).toBe(true);
    expect(state.writes.get(`${root}/courses/course`)).not.toHaveProperty("contentRights");
    const count = state.writes.size;
    expect(await manageCourse(request, "admin")).toMatchObject({ replayed: true });
    expect(state.writes.size).toBe(count);
    await expect(manageCourse({ ...request, contentRights: { ...rights, reference: "Outra autorização informada depois" } }, "admin")).rejects.toMatchObject({ status: 409 });
  });
  it("does not let a member publish even with acceptance", async () => {
    state.docs.set(`${root}/users/admin`, { organizationId: "org", isActive: true, roles: ["member"] });
    await expect(manageCourse({ ...input, contentRights: rights }, "admin")).rejects.toMatchObject({ status: 403 });
    expect(state.writes.size).toBe(0);
  });
  it("rejects an audit snapshot too large for storage without partially publishing", async () => {
    state.lessons = [{ id: "lesson", description: "x".repeat(500001) }];
    await expect(manageCourse({ ...input, contentRights: rights }, "admin")).rejects.toMatchObject({ status: 409 });
    expect(state.writes.size).toBe(0);
  });
  it.each([{ lessons: [] }, { lessons: Array.from({ length: 401 }, (_, id) => ({ id })) }])("rejects empty or oversized catalogs before writing", async ({ lessons }) => {
    state.lessons = lessons;
    await expect(manageCourse({ ...input, contentRights: rights }, "admin")).rejects.toMatchObject({ status: 409 });
    expect(state.writes.size).toBe(0);
  });
});

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  journeyOperation,
  dispatchJourneyPush,
} from "../apps/web/app/api/_lib/journey-operations";
import { mobileMemberOperation } from "../apps/web/app/api/_lib/mobile-member";
import { roleHomeOperation } from "../apps/web/app/api/_lib/role-home";
import { POST } from "../apps/web/app/api/journeys/route";
import {
  hasCompletedContact,
  isCarePending,
  homeRouteAllowed,
} from "../packages/domain/src/index";
async function main() {
  assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-alvo-qa");
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
  const realFetch = global.fetch;
  global.fetch = ((input: any, init: any) => {
    const u = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    assert.ok(
      ["localhost", "127.0.0.1"].includes(u.hostname),
      "External network prohibited",
    );
    return realFetch(input, init);
  }) as typeof fetch;
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth(),
    suffix = randomUUID().slice(0, 8),
    org = `qa_journey_${suffix}`,
    root = `organizations/${org}`;
  const pastor = `jp_${suffix}`,
    leader = `jl_${suffix}`,
    otherLeader = `jo_${suffix}`,
    guest = `jg_${suffix}`;
  let checks = 0;
  const check = (actual: unknown, expected: unknown, label: string) => {
    assert.deepEqual(actual, expected, label);
    checks++;
    console.log("OK " + label);
  };
  const seed = (path: string, data: object) =>
    db.doc(`${root}/${path}`).set({ organizationId: org, ...data });
  const op = (body: any, uid = pastor) =>
    journeyOperation({ organizationId: org, ...body }, uid);
  const overview = (uid = pastor) => op({ action: "overview" }, uid);
  const mobile = () =>
    mobileMemberOperation(
      { organizationId: org, action: "journey" },
      guest,
    ) as Promise<any>;
  const home = (profile = "pastoral", uid = pastor) =>
    roleHomeOperation(
      { organizationId: org, action: "overview", profile },
      uid,
    ) as Promise<any>;
  const mutation = async (body: any, uid = pastor) => {
    const p = (await db.doc(`${root}/people/p_guest`).get()).data();
    return op(
      {
        requestId: randomUUID(),
        personId: "p_guest",
        expectedRevision: p?.integrationRevision || 0,
        ...body,
      },
      uid,
    );
  };
  const deny = async (
    body: any,
    uid: number | string = leader,
    status = 403,
  ) => {
    await assert.rejects(
      () => mutation(body, String(uid)),
      (e: any) => e.status === status,
    );
    checks++;
  };
  try {
    await db.doc(root).set({
      id: org,
      name: "Igreja fictícia de integração",
      status: "active",
      timezone: "America/Belem",
    });
    await seed("settings/subscription", {
      plan: "enterprise",
      billingStatus: "active",
    });
    await seed("settings/features", {
      modules: {
        core: { enabled: true },
        journeys: { enabled: true },
        visitors: { enabled: true },
        groups: { enabled: true },
      },
    });
    for (const [uid, pid, roles] of [
      [pastor, "p_pastor", ["pastor"]],
      [leader, "p_leader", ["group_leader"]],
      [otherLeader, "p_other", ["group_leader"]],
      [guest, "p_guest", ["member"]],
    ] as const) {
      await auth.createUser({
        uid,
        email: `${uid}@example.test`,
        password: "Only-QA-2026!",
      });
      await seed(`users/${uid}`, {
        isActive: true,
        personId: pid,
        roles,
        displayName: `Fictício ${pid}`,
        expoPushToken: "ExponentPushToken[fictional]",
      });
      await seed(`people/${pid}`, {
        id: pid,
        firstName: `Fictício ${pid}`,
        status: "active",
        memberStatus: pid === "p_guest" ? "visitor" : "member",
        privateNote: "PRIVATE",
        whatsappPhone: "55999999999",
      });
      await seed(`memberAccountLinks/${uid}`, {
        userId: uid,
        personId: pid,
        verifiedBy: pastor,
      });
      await seed(`memberAccountClaims/${pid}`, { userId: uid, personId: pid });
    }
    await seed("groups/cell", {
      id: "cell",
      name: "Célula QA",
      type: "cell",
      status: "active",
    });
    await seed("groups/class", {
      id: "class",
      name: "Classe QA",
      type: "class",
      status: "active",
    });
    await seed("groups/other", {
      id: "other",
      name: "Outra célula QA",
      type: "cell",
      status: "active",
    });
    await seed("groups/cell/members/cell_p_leader", {
      personId: "p_leader",
      groupId: "cell",
      roleInGroup: "leader",
    });
    await seed("groups/other/members/other_p_other", {
      personId: "p_other",
      groupId: "other",
      roleInGroup: "leader",
    });
    await seed("groups/class/members/class_p_guest", {
      personId: "p_guest",
      groupId: "class",
      roleInGroup: "member",
    });
    check(
      (await overview()).people.find((p: any) => p.id === "p_guest").cells,
      [],
      "class does not count as cell",
    );
    check((await overview()).cells.length, 2, "only active cells selectable");
    await db.doc(`${root}/people/p_guest`).update({ memberStatus: null });
    check(
      (await overview()).people.find((p: any) => p.id === "p_guest")
        .needsContact,
      true,
      "legacy visitor without status still needs contact",
    );
    await db.doc(`${root}/people/p_guest`).update({ memberStatus: "visitor" });
    const start = await mutation({ action: "stage", stage: "new_visitor" });
    check(
      (await mobile()).integration.stage,
      "new_visitor",
      "web stage immediately appears in member API without journeyProfiles",
    );
    check(
      (await mobile()).profile,
      null,
      "legacy ministry profile remains independent",
    );
    await deny({ action: "stage", stage: "welcomed" }, pastor, 409);
    await deny({ action: "stage", stage: "welcomed" }, leader);
    await deny({ action: "assign-cell", groupId: "class" }, pastor, 409);
    await mutation({ action: "assign-cell", groupId: "cell" });
    check(
      (await mobile()).integration.cells.map((g: any) => g.id),
      ["cell"],
      "cell syncs to app",
    );
    check(
      (await home("cell_leader", leader)).metrics.find(
        (m: any) => m.key === "people",
      ).value,
      2,
      "cell leader count updates",
    );
    await deny({ action: "assign-cell", groupId: "cell" }, pastor, 409);
    await deny(
      {
        action: "create-task",
        type: "first_contact",
        assignedToUserId: otherLeader,
        dueAt: new Date().toISOString(),
      },
      pastor,
    );
    const createBody = {
      action: "create-task",
      type: "first_contact",
      assignedToUserId: leader,
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      requestId: randomUUID(),
      personId: "p_guest",
      expectedRevision: (await db.doc(`${root}/people/p_guest`).get()).data()!
        .integrationRevision,
    };
    const created = await op(createBody);
    check((await op(createBody)).replayed, true, "retry is idempotent");
    await assert.rejects(
      () => op({ ...createBody, type: "invite_to_class" }),
      (e: any) => e.status === 409,
    );
    checks++;
    const task = (await db.collection(`${root}/followUpTasks`).get()).docs[0];
    check(
      (await overview()).people.find((p: any) => p.id === "p_guest")
        .needsContact,
      true,
      "creating task does not mark contact done",
    );
    check(
      (await home("cell_leader", leader)).tasks[0].personName,
      "Fictício p_guest",
      "leader sees assigned person context",
    );
    await mutation(
      {
        action: "task-status",
        taskId: task.id,
        expectedTaskRevision: 0,
        status: "in_progress",
      },
      leader,
    );
    check(
      (await home()).tasks[0].status,
      "in_progress",
      "pastoral dashboard retains task in progress",
    );
    check(
      (await home("cell_leader", leader)).tasks[0].status,
      "in_progress",
      "leader dashboard retains task in progress",
    );
    await deny(
      {
        action: "task-status",
        taskId: task.id,
        expectedTaskRevision: 0,
        status: "completed",
      },
      leader,
      409,
    );
    await deny(
      {
        action: "task-status",
        taskId: task.id,
        expectedTaskRevision: 1,
        status: "completed",
      },
      otherLeader,
    );
    await mutation(
      {
        action: "task-status",
        taskId: task.id,
        expectedTaskRevision: 1,
        status: "completed",
      },
      leader,
    );
    check(
      (await home()).tasks.length,
      0,
      "completed task removed from pending dashboard",
    );
    check(
      (await overview()).people.find((p: any) => p.id === "p_guest")
        .needsContact,
      false,
      "completed task resolves first contact",
    );
    await mutation({ action: "stage", stage: "welcomed" });
    check(
      (await mobile()).integration.stage,
      "welcomed",
      "next web stage syncs to app",
    );
    check(
      "privateNote" in (await mobile()).integration,
      false,
      "member projection excludes pastoral notes",
    );
    await mutation({
      action: "create-task",
      type: "pastoral_contact",
      assignedToUserId: pastor,
      dueAt: new Date().toISOString(),
    });
    const cancelled = (
      await db
        .collection(`${root}/followUpTasks`)
        .where("type", "==", "pastoral_contact")
        .get()
    ).docs[0];
    await mutation({
      action: "task-status",
      taskId: cancelled.id,
      expectedTaskRevision: 0,
      status: "cancelled",
    });
    check((await overview()).summary.pending, 0, "cancelled task not pending");
    check(
      isCarePending({ status: "cancelled" }),
      false,
      "shared pending semantics",
    );
    check(
      hasCompletedContact([{ type: "first_contact", status: "cancelled" }]),
      false,
      "cancelled is not contact evidence",
    );
    const before = (await db.doc(`${root}/people/p_guest`).get()).data()!
      .integrationRevision;
    await mutation({ action: "member-status", memberStatus: "member" });
    check(
      (await mobile()).integration.stage,
      "completed",
      "membership closes integration and updates app",
    );
    check(
      (await overview()).summary.ready,
      0,
      "membership removes decision backlog",
    );
    await deny(
      { action: "stage", stage: "completed", expectedRevision: before },
      pastor,
      409,
    );
    const summary = await op({ action: "summary" });
    check(
      summary.weeks.reduce((n: number, w: any) => n + w.completed, 0),
      1,
      "evolution records actual membership completion",
    );
    check(
      summary.weeks.reduce((n: number, w: any) => n + w.transitions, 0),
      3,
      "evolution records new, welcomed and completed transitions",
    );
    check(
      (await overview(leader)).people.map((p: any) => p.id).sort(),
      ["p_guest", "p_leader"],
      "leader restricted to own cells",
    );
    check(
      (await overview(otherLeader)).people.some((p: any) => p.id === "p_guest"),
      false,
      "other leader cannot see guest",
    );
    check(
      homeRouteAllowed(["group_leader"], "/journeys"),
      true,
      "leader has scoped journey route",
    );
    check(
      homeRouteAllowed(["member"], "/journeys"),
      false,
      "member cannot open management route",
    );
    await assert.rejects(
      () => op({ action: "overview" }, guest),
      (e: any) => e.status === 403,
    );
    checks++;
    await assert.rejects(
      () =>
        journeyOperation(
          { organizationId: "other_org", action: "overview" },
          pastor,
        ),
      (e: any) => e.status === 403,
    );
    checks++;
    await dispatchJourneyPush(org, start.noticeIds[0]);
    check(
      (
        await db.doc(`${root}/journeyNotices/${start.noticeIds[0]}`).get()
      ).data()!.pushStatus,
      "test_mode",
      "emulator never sends real notification",
    );
    let sent = 0;
    const fake = (async (_url: any, init: any) => {
      sent++;
      const body = JSON.parse(init.body);
      check(body.data.organizationId, org, "push is scoped to institution");
      check(
        body.body.includes("p_guest"),
        false,
        "push contains no personal pastoral details",
      );
      return new Response(
        JSON.stringify({ data: { status: "ok", id: "fake-ticket" } }),
        { status: 200 },
      );
    }) as typeof fetch;
    // Assigned task was completed: do not send a stale notification.
    await dispatchJourneyPush(org, created.noticeIds[0], fake);
    check(sent, 0, "completed assignment does not send stale push");
    const notice = (
      await db
        .collection(`${root}/journeyNotices`)
        .where("pushStatus", "==", "pending")
        .get()
    ).docs.find((d) => d.data().kind === "progress")!;
    await dispatchJourneyPush(org, notice.id, fake);
    await dispatchJourneyPush(org, notice.id, fake);
    check(sent, 1, "push dispatch is claimed once");
    check(
      (await notice.ref.get()).data()!.pushStatus,
      "accepted",
      "provider acceptance recorded without claiming device delivery",
    );
    await seed("settings/features", {
      modules: { journeys: { enabled: false }, groups: { enabled: true } },
    });
    await deny({ action: "member-status", memberStatus: "visitor" }, pastor);
    await seed("settings/features", {
      modules: { journeys: { enabled: true }, groups: { enabled: true } },
    });
    await seed("settings/subscription", { plan: "free" });
    await deny({ action: "member-status", memberStatus: "visitor" }, pastor);
    await seed("settings/subscription", { plan: "enterprise" });
    const authResponse = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: `${pastor}@example.test`,
          password: "Only-QA-2026!",
          returnSecureToken: true,
        }),
      },
    );
    const token = (await authResponse.json()).idToken;
    const api = await POST(
      new Request("http://localhost/api/journeys", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organizationId: org, action: "overview" }),
      }) as Parameters<typeof POST>[0],
    );
    check(api.status, 200, "authenticated route works");
    check(
      api.headers.get("cache-control")?.includes("no-store"),
      true,
      "route is private no-store",
    );
    const anon = await POST(
      new Request("http://localhost/api/journeys", {
        method: "POST",
        body: JSON.stringify({ organizationId: org, action: "overview" }),
      }) as Parameters<typeof POST>[0],
    );
    check(anon.status, 401, "anonymous route denied");
    await seed("people/inactive", {
      status: "inactive",
      firstName: "Do not count",
    });
    check((await overview()).summary.total, 4, "inactive people excluded");
    // More than the old 120 person limit: totals remain complete and navigation is paginated.
    const batch = db.batch();
    for (let i = 0; i < 130; i++)
      batch.set(db.doc(`${root}/people/extra_${String(i).padStart(3, "0")}`), {
        organizationId: org,
        status: "active",
        firstName: `Fictício ${i}`,
        memberStatus: "visitor",
      });
    await batch.commit();
    check(
      (await overview()).summary.total,
      134,
      "counts exceed legacy 120 limit",
    );
    check((await overview()).people.length, 40, "first page bounded");
    check(
      (await op({ action: "overview", page: 1 })).people.length,
      40,
      "second page available",
    );
    console.log(
      JSON.stringify({
        ok: true,
        checks,
        scope:
          "demo-alvo-qa; actual transactions and handlers; no real notifications",
      }),
    );
  } finally {
    await db.recursiveDelete(db.doc(root));
    await auth.deleteUsers([pastor, leader, otherLeader, guest]);
    console.log("Fictional fixtures removed.");
  }
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import * as sdk from "../packages/firebase/src/index.ts";
import { roleHomeOperation } from "../apps/web/app/api/_lib/role-home.ts";
import { mobileMemberOperation } from "../apps/web/app/api/_lib/mobile-member.ts";
import { journeyOperation } from "../apps/web/app/api/_lib/journey-operations.ts";
import {
  groupOperation,
  dispatchGroupNotice,
} from "../apps/web/app/api/_lib/group-operations";
import { groupWeek } from "../packages/domain/src/groups";
import { GET as weeklyGET } from "../apps/web/app/api/weekly-theme/route.ts";
const req = createRequire(import.meta.url);
const { initializeApp } = req("firebase-admin/app"),
  { getFirestore } = req("firebase-admin/firestore"),
  { getAuth } = req("firebase-admin/auth");
async function main() {
  if (
    process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
  )
    throw Error("QA only");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth(),
    s = randomUUID().slice(0, 8),
    org = "qa_cells_" + s,
    root = "organizations/" + org;
  const ids = {
    pastor: "cp_" + s,
    leader: "cl_" + s,
    member: "cm_" + s,
    replacement: "cr_" + s,
  };
  const config = {
    apiKey: "demo-alvo-qa-key",
    authDomain: "demo-alvo-qa.firebaseapp.com",
    projectId: "demo-alvo-qa",
    storageBucket: "demo-alvo-qa.firebasestorage.app",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:localqa",
    useEmulator: true,
  };
  const ctx = { organizationId: org },
    results: any[] = [];
  let token = "";
  const realFetch = global.fetch;
  let rewriteWeekly = false,
    externalAttempt = false;
  global.fetch = (async (input: any, init: any) => {
    let u = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    if (u.hostname === "firestore.googleapis.com" && rewriteWeekly) {
      u = new URL(u.pathname, "http://127.0.0.1:8080");
      return realFetch(u, init);
    }
    if (!["localhost", "127.0.0.1"].includes(u.hostname)) {
      externalAttempt = true;
      throw Error("External requests blocked");
    }
    return realFetch(input, init);
  }) as typeof fetch;
  const check = (label: string, actual: any, expected: any) => {
    assert.deepEqual(actual, expected, label);
    results.push({ label, actual });
    console.log("OK " + label);
  };
  const seed = (path: string, data: any) =>
    db.doc(root + "/" + path).set({ organizationId: org, ...data });
  const home = (body: any, uid = ids.pastor) =>
    roleHomeOperation({ ...ctx, ...body }, uid) as Promise<any>;
  const mobile = (body: any, uid = ids.member) =>
    mobileMemberOperation({ ...ctx, ...body }, uid) as Promise<any>;
  const denied = async (
    fn: () => Promise<any>,
    label: string,
    expected = 403,
  ) => {
    let status = 0;
    try {
      await fn();
    } catch (e: any) {
      status = e.status;
    }
    check(label, status, expected);
  };
  try {
    await db.doc(root).set({
      id: org,
      status: "active",
      name: "Igreja fictícia auditoria Células",
      timezone: "America/Belem",
    });
    await seed("settings/subscription", {
      plan: "enterprise",
      billingStatus: "active",
    });
    await seed("settings/features", {
      modules: {
        core: { enabled: true },
        groups: { enabled: true },
        journeys: { enabled: true },
        communication: { enabled: true },
      },
    });
    for (const [role, uid] of Object.entries(ids)) {
      await auth.createUser({
        uid,
        email: uid + "@example.test",
        password: "Fictitious-QA-2026!",
      });
      await seed("users/" + uid, {
        isActive: true,
        roles:
          role === "pastor"
            ? ["pastor"]
            : ["leader", "replacement"].includes(role)
              ? ["group_leader"]
              : ["member"],
        personId: role,
      });
      await seed("people/" + role, {
        id: role,
        firstName: "Fictício " + role,
        status: "active",
        memberStatus: "member",
      });
      await seed("memberAccountLinks/" + uid, {
        userId: uid,
        personId: role,
        verifiedBy: ids.pastor,
      });
      await seed("memberAccountClaims/" + role, {
        userId: uid,
        personId: role,
      });
    }
    const login = await sdk.signInWithFirebaseEmailPassword({
      config,
      email: ids.pastor + "@example.test",
      password: "Fictitious-QA-2026!",
    });
    token = await login.user.getIdToken();

    const op = (body: any, uid = ids.pastor) =>
      groupOperation({ ...ctx, ...body }, uid);
    const mutate = (body: any, uid = ids.pastor) =>
      op({ requestId: randomUUID(), ...body }, uid);
    const cell = await mutate({
      action: "save-group",
      name: "Célula fictícia",
      capacity: 2,
      meetingDayOfWeek: 3,
      meetingTime: "19:30",
      leaderPersonId: "leader",
      address: "Rua Fictícia, 10",
      city: "Cidade QA",
    });
    let g = (await op({ action: "detail", groupId: cell.id })).group;
    check("Web cell persists address", g.address, "Rua Fictícia, 10");
    await mutate({
      action: "assign-member",
      groupId: cell.id,
      personId: "member",
      expectedRevision: g.revision,
    });
    g = (await op({ action: "detail", groupId: cell.id })).group;
    await denied(
      () =>
        mutate({
          action: "assign-member",
          groupId: cell.id,
          personId: "replacement",
          expectedRevision: g.revision,
        }),
      "Capacity enforced",
      409,
    );
    await denied(
      () =>
        journeyOperation(
          {
            ...ctx,
            action: "assign-cell",
            personId: "replacement",
            groupId: cell.id,
            expectedRevision: 0,
            requestId: randomUUID(),
          },
          ids.pastor,
        ),
      "Journey assignment also enforces capacity",
      409,
    );
    await denied(
      () =>
        mutate({
          action: "save-group",
          ...g,
          groupId: g.id,
          expectedRevision: g.revision,
          capacity: -2,
        }),
      "Negative capacity rejected",
      400,
    );
    check(
      "Web membership reaches mobile",
      (await mobile({ action: "groups" })).groups[0].id,
      cell.id,
    );
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Belem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(Date.now() - 60000));
    const part = (k: string) => parts.find((p) => p.type === k)!.value;
    const date = [part("year"), part("month"), part("day")].join("-"),
      time = part("hour") + ":" + part("minute");
    const sameRequest = randomUUID();
    const meeting = await mutate({
      action: "create-meeting",
      groupId: cell.id,
      date,
      time,
      requestId: sameRequest,
    });
    check(
      "Retry reuses meeting",
      (
        await mutate({
          action: "create-meeting",
          groupId: cell.id,
          date,
          time,
          requestId: sameRequest,
        })
      ).id,
      meeting.id,
    );
    check(
      "Second click same date reuses meeting",
      (await mutate({ action: "create-meeting", groupId: cell.id, date, time }))
        .id,
      meeting.id,
    );
    await dispatchGroupNotice(org, meeting.noticeId);
    check(
      "QA push does not reach external provider",
      (await db.doc(root + "/groupNotices/" + meeting.noticeId).get()).data()
        .pushStatus,
      "test_mode",
    );
    await seed("users/" + ids.leader, {
      isActive: true,
      roles: ["group_leader"],
      personId: "leader",
      expoPushToken: "ExpoPushToken[fictional_qa_only]",
    });
    await seed("groupNotices/push_qa", {
      groupId: cell.id,
      recipientIds: [ids.leader],
      kind: "meeting",
      pushStatus: "pending",
    });
    let pushCalls = 0;
    let pushBody: any[] = [];
    const transport = (async (_url: any, init: any) => {
      pushCalls++;
      pushBody = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          data: pushBody.map(() => ({ status: "ok", id: "fictional_ticket" })),
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    await dispatchGroupNotice(org, "push_qa", transport);
    await dispatchGroupNotice(org, "push_qa", transport);
    check("Push provider attempt claimed once", pushCalls, 1);
    check("Push scoped to institution and cell", pushBody[0].data, {
      type: "group_update",
      organizationId: org,
      groupId: cell.id,
    });
    check(
      "Push excludes personal pastoral details",
      JSON.stringify(pushBody).includes("Relatório"),
      false,
    );
    check(
      "Acceptance recorded without claiming device delivery",
      (await db.doc(root + "/groupNotices/push_qa").get()).data().pushStatus,
      "accepted",
    );
    check(
      "Current meeting reaches app",
      (await mobile({ action: "groups" })).groups[0].meeting.id,
      meeting.id,
    );
    await mobile({
      action: "attendance",
      groupId: cell.id,
      meetingId: meeting.id,
    });
    let detail = await home(
      { action: "group-detail", profile: "cell_leader", groupId: cell.id },
      ids.leader,
    );
    check(
      "App self checkin visible in leader dashboard",
      detail.people.find((p: any) => p.id === "member").status,
      "present",
    );
    await home(
      {
        action: "attendance",
        profile: "cell_leader",
        groupId: cell.id,
        meetingId: meeting.id,
        personId: "member",
        expectedStatus: "present",
        status: "justified",
      },
      ids.leader,
    );
    check(
      "Leader correction visible in app",
      (await mobile({ action: "groups" })).groups[0].meeting.attendanceStatus,
      "justified",
    );
    detail = await op({ action: "detail", groupId: cell.id });
    check("Absent/justified not counted present", detail.summary.present, 0);
    check("Unmarked is pending", detail.summary.pending, 1);
    await denied(
      () =>
        home(
          { action: "group-detail", profile: "member", groupId: cell.id },
          ids.member,
        ),
      "Member cannot see leadership roster",
    );
    await mutate(
      {
        action: "save-report",
        groupId: cell.id,
        meetingId: meeting.id,
        expectedRevision: 0,
        text: "Relatório inteiramente fictício.",
      },
      ids.leader,
    );
    check(
      "Report persists and reaches dashboard",
      (
        await home(
          { action: "group-detail", profile: "cell_leader", groupId: cell.id },
          ids.leader,
        )
      ).report.text,
      "Relatório inteiramente fictício.",
    );
    await denied(
      () =>
        mutate({
          action: "save-report",
          groupId: cell.id,
          meetingId: meeting.id,
          expectedRevision: 0,
          text: "Stale",
        }),
      "Stale report rejected",
      409,
    );
    const task = await mutate(
      {
        action: "follow-up",
        groupId: cell.id,
        personId: "member",
        dueAt: new Date().toISOString(),
      },
      ids.leader,
    );
    check(
      "Followup creates durable journey task",
      (
        await db
          .collection(root + "/followUpTasks")
          .where("personId", "==", "member")
          .get()
      ).size,
      1,
    );
    await denied(
      () =>
        mutate(
          {
            action: "follow-up",
            groupId: cell.id,
            personId: "member",
            dueAt: new Date().toISOString(),
          },
          ids.leader,
        ),
      "Duplicate pending followup rejected",
      409,
    );
    const clazz = await mutate({
      action: "save-group",
      name: "Classe fictícia",
      type: "class",
      capacity: 20,
      meetingDayOfWeek: 0,
    });
    await mutate({
      action: "assign-member",
      groupId: clazz.id,
      personId: "replacement",
      expectedRevision: 1,
    });
    const overview = await op({ action: "overview" });
    check("Classes excluded from cell count", overview.stats.cells, 1);
    check(
      "Class-only person remains without cell",
      overview.withoutCell.some((p: any) => p.id === "replacement"),
      true,
    );
    check(
      "Classes excluded from member app",
      (await mobile({ action: "groups" }, ids.replacement)).groups.length,
      0,
    );
    const week = groupWeek(Date.now(), "America/Belem");
    await mutate({
      action: "weekly-save",
      title: "Geral QA",
      scope: "all",
      week,
      durationMinutes: 60,
    });
    const specific = await mutate({
      action: "weekly-save",
      title: "Específico QA",
      scope: "specific",
      groupIds: [cell.id],
      week,
      durationMinutes: 75,
    });
    check(
      "Specific theme wins",
      (await op({ action: "weekly-read", groupId: cell.id }, ids.leader)).theme
        .title,
      "Específico QA",
    );
    check(
      "Duration persisted",
      (await op({ action: "weekly-read", groupId: cell.id }, ids.leader)).theme
        .durationMinutes,
      75,
    );
    await denied(
      () => op({ action: "weekly-read", groupId: cell.id }, ids.replacement),
      "Specific theme denies unrelated member",
    );
    const response = await weeklyGET({
      headers: new Headers({ Authorization: "Bearer " + token }),
      nextUrl: new URL(
        "http://127.0.0.1/api/weekly-theme?organizationId=" +
          org +
          "&groupId=" +
          cell.id,
      ),
    } as any);
    check("Weekly route uses emulator", response.status, 200);
    check(
      "Weekly route does not cache",
      response.headers.get("cache-control")!.includes("no-store"),
      true,
    );
    await denied(
      () =>
        mutate({
          action: "weekly-save",
          title: "Dup",
          scope: "specific",
          groupIds: [cell.id],
          week,
        }),
      "Duplicate theme conflict rejected",
      409,
    );
    await mutate({
      action: "save-group",
      ...g,
      groupId: g.id,
      expectedRevision: g.revision,
      capacity: 3,
      city: "",
      leaderPersonId: "replacement",
    });
    check(
      "Cleared city persists",
      (await op({ action: "detail", groupId: cell.id })).group.city,
      "",
    );
    check(
      "Prior primary leader demoted",
      (
        await db
          .doc(root + "/groups/" + cell.id + "/members/" + cell.id + "_leader")
          .get()
      ).data().roleInGroup,
      "member",
    );
    await denied(
      () =>
        home(
          { action: "group-detail", profile: "cell_leader", groupId: cell.id },
          ids.leader,
        ),
      "Replaced leader loses leadership scope",
    );
    detail = await op({ action: "detail", groupId: cell.id });
    await mutate({
      action: "remove-member",
      groupId: cell.id,
      personId: "member",
      expectedRevision: detail.group.revision,
    });
    check(
      "Inactive member disappears from app",
      (await mobile({ action: "groups" })).groups.length,
      0,
    );
    await denied(
      () =>
        mobile({
          action: "attendance",
          groupId: cell.id,
          meetingId: meeting.id,
        }),
      "Inactive member cannot check in",
      409,
    );
    detail = await op({ action: "detail", groupId: cell.id });
    check(
      "Meeting retains expected roster snapshot",
      detail.summary.expected,
      2,
    );
    check("Historic attendance retained", detail.historicalRecords, 1);
    await mutate(
      {
        action: "close-meeting",
        groupId: cell.id,
        meetingId: meeting.id,
        expectedRevision: 0,
      },
      ids.replacement,
    );
    check(
      "Meeting closes in shared dashboard",
      (
        await home(
          { action: "group-detail", profile: "cell_leader", groupId: cell.id },
          ids.replacement,
        )
      ).meeting.status,
      "completed",
    );
    for (let i = 0; i < 30; i++)
      await seed("groups/" + cell.id + "/meetings/history_" + i, {
        id: "history_" + i,
        groupId: cell.id,
        meetingStatus: "completed",
        scheduledStartAt: new Date(
          Date.now() - (i + 1) * 86400000,
        ).toISOString(),
      });
    detail = await op({ action: "detail", groupId: cell.id });
    check("History sorted newest first", detail.meetings[0].id, meeting.id);
    check("History pagination exposed", detail.hasMore, true);
    check(
      "Second history page accessible",
      (await op({ action: "detail", groupId: cell.id, page: 1 })).meetings
        .length,
      6,
    );
    await mutate({
      action: "archive-group",
      groupId: cell.id,
      expectedRevision: detail.group.revision,
    });
    check(
      "Archived cell excluded from dashboard",
      (await op({ action: "overview" })).stats.cells,
      0,
    );
    check(
      "Archive retains meeting/report",
      (
        await db
          .doc(
            root +
              "/groups/" +
              cell.id +
              "/meetings/" +
              meeting.id +
              "/reports/summary",
          )
          .get()
      ).exists,
      true,
    );
    let directWriteDenied = false;
    try {
      await sdk.createGroup(config, ctx, { name: "Bypass QA" });
    } catch (e: any) {
      directWriteDenied =
        String(e.code || e.message).includes("permission-denied") ||
        String(e.message).includes("permissions");
    }
    check(
      "Direct client cannot bypass validated service",
      directWriteDenied,
      true,
    );
    check("External requests never attempted", externalAttempt, false);
    console.log(JSON.stringify({ checks: results.length, ok: true }));
  } finally {
    await sdk.signOutFromFirebase(config).catch(() => {});
    await db.recursiveDelete(db.doc(root));
    await auth.deleteUsers(Object.values(ids));
    writeFileSync(
      "/tmp/cells-retest-results.json",
      JSON.stringify({ results, cleaned: true }, null, 2),
    );
    console.log("Own fictional fixtures removed");
  }
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

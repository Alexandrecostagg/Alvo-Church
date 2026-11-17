import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { NextRequest } from "next/server";
import { peopleDirectoryOperation } from "../apps/web/app/api/_lib/people-directory";
import { mobileMemberOperation } from "../apps/web/app/api/_lib/mobile-member";
import { roleHomeOperation } from "../apps/web/app/api/_lib/role-home";
import { POST } from "../apps/web/app/api/members/directory/route";

async function main() {
  assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-alvo-qa");
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth();
  const org = "qa_people_" + randomUUID().slice(0, 8),
    root = `organizations/${org}`;
  const users = {
    pastor: org + "_pastor",
    member: org + "_member",
    leader: org + "_leader",
  };
  const realFetch = global.fetch;
  global.fetch = (async (input: any, init: any) => {
    const url = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    assert.ok(
      ["localhost", "127.0.0.1"].includes(url.hostname),
      "External network blocked",
    );
    return realFetch(input, init);
  }) as typeof fetch;
  let checks = 0;
  const check = (a: any, b: any, label: string) => {
    assert.deepEqual(a, b, label);
    checks++;
    console.log("OK " + label);
  };
  const denied = async (
    work: () => Promise<any>,
    code: number,
    label: string,
  ) => {
    await assert.rejects(work, (e: any) => e.status === code, label);
    checks++;
    console.log("OK " + label);
  };
  const seed = (path: string, data: any) =>
    db.doc(`${root}/${path}`).set({ organizationId: org, ...data });
  const op = (body: any, uid = users.pastor) =>
    peopleDirectoryOperation({ organizationId: org, ...body }, uid);
  try {
    await db.doc(root).set({
      name: "Igreja fictícia de auditoria",
      status: "active",
      timezone: "America/Belem",
    });
    await seed("settings/subscription", {
      plan: "enterprise",
      billingStatus: "active",
    });
    for (const [role, uid] of Object.entries(users)) {
      await auth.createUser({
        uid,
        email: uid + "@example.test",
        password: "Only-QA-2026!",
      });
      await auth.setCustomUserClaims(uid, { organizationId: org });
      await seed("users/" + uid, {
        isActive: true,
        roles: [role === "leader" ? "group_leader" : role],
        personId: role === "member" ? "p_200" : "p_000",
        displayName: "Pessoa fictícia",
      });
    }
    await seed(`memberAccountLinks/${users.leader}`, {
      userId: users.leader,
      personId: "p_000",
      verifiedBy: users.pastor,
    });
    await seed("memberAccountClaims/p_000", {
      userId: users.leader,
      personId: "p_000",
    });
    const batch = db.batch();
    for (let i = 0; i < 205; i++) {
      const id = "p_" + String(i).padStart(3, "0");
      batch.set(db.doc(`${root}/people/${id}`), {
        id,
        organizationId: org,
        firstName: i === 200 ? "Ana" : "Pessoa",
        lastName: i === 200 ? "Fictícia" : String(i),
        status: "active",
        memberStatus: i === 200 ? "member" : "visitor",
        primaryFamilyId: i >= 200 ? "family_100" : "",
        mobilePhone: i === 200 ? "91999990001" : "",
        ...(i === 200
          ? {
              address: {
                street: "Rua Fictícia",
                number: "100",
                city: "Belém",
                state: "PA",
              },
            }
          : {}),
      });
    }
    for (let i = 0; i < 102; i++)
      batch.set(
        db.doc(`${root}/families/family_${String(i).padStart(3, "0")}`),
        {
          organizationId: org,
          familyName: "Família fictícia " + i,
          status: "active",
        },
      );
    await batch.commit();
    await seed(`memberAccountLinks/${users.member}`, {
      userId: users.member,
      personId: "p_200",
      verifiedBy: users.pastor,
    });
    await seed("memberAccountClaims/p_200", {
      userId: users.member,
      personId: "p_200",
    });
    await seed("groups/cell", {
      name: "Célula fictícia",
      status: "active",
      type: "cell",
      meetingTime: "19:30",
    });
    await seed("groups/cell/members/cell_p_200", {
      personId: "p_200",
      groupId: "cell",
      roleInGroup: "member",
    });
    await seed("groups/cell/members/cell_p_000", {
      personId: "p_000",
      groupId: "cell",
      roleInGroup: "leader",
    });
    await seed("groups/class", {
      name: "Classe fictícia",
      status: "active",
      type: "class",
    });
    await seed("groups/class/members/class_p_200", {
      personId: "p_200",
      groupId: "class",
      roleInGroup: "member",
    });
    await seed("visitorJourneys/journey", {
      personId: "p_200",
      status: "active",
      currentStage: "welcomed",
      createdAt: new Date().toISOString(),
    });
    for (const status of ["confirmed", "pending", "rejected", "legacy"])
      await seed("contributions/" + status, {
        personId: "p_200",
        amount: status === "confirmed" ? 25 : 100,
        date: "2026-11-17",
        type: "oferta",
        ...(status === "legacy" ? {} : { status }),
      });
    await seed("serviceAssignments/target", {
      personId: "p_200",
      ministryCode: "reception",
      role: "Recepção",
      serviceDate: "2099-01-01T19:00:00Z",
      status: "confirmed",
    });
    const unrelated = db.batch();
    for (let i = 0; i < 301; i++)
      unrelated.set(db.doc(`${root}/serviceAssignments/a_${i}`), {
        organizationId: org,
        personId: "p_001",
        serviceDate: "2026-01-01",
        status: "confirmed",
      });
    await unrelated.commit();
    const first = await op({ action: "people" });
    check(first.items.length, 100, "Paginated people");
    check(first.total, 205, "Exact total beyond old 40 limit");
    const second = await op({ action: "people", cursor: first.nextCursor });
    const third = await op({ action: "people", cursor: second.nextCursor });
    check(
      new Set(
        [...first.items, ...second.items, ...third.items].map((p) => p.id),
      ).size,
      205,
      "No people omitted or duplicated across pages",
    );
    check(third.nextCursor, null, "Pagination ends");
    const families = await op({ action: "families" });
    const lastFamilies = await op({
      action: "families",
      cursor: families.nextCursor,
    });
    check(families.total, 102, "Families beyond old 20 limit");
    check(
      lastFamilies.items.find((f: any) => f.id === "family_100").peopleCount,
      5,
      "Family count includes people beyond first page",
    );
    const detail = await op({ action: "detail", personId: "p_200" });
    check(
      detail.familyPeople.length,
      5,
      "Profile resolves relatives beyond old 80 limit",
    );
    check(
      detail.groups.map((g: any) => g.id),
      ["cell"],
      "Class excluded from cells",
    );
    check(
      detail.assignments.map((a: any) => a.id),
      ["target"],
      "Personal assignments beyond 300 unrelated records",
    );
    check(
      detail.contributions.length,
      4,
      "Explicit statuses and legacy contributions retained",
    );
    check(
      detail.integration.stage,
      "welcomed",
      "Real journey is independent of member status",
    );
    const mobile: any = await mobileMemberOperation(
      { organizationId: org, action: "journey" },
      users.member,
    );
    check(
      mobile.integration,
      detail.integration,
      "Mobile and pastoral ficha share integration",
    );
    const home: any = await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "pastoral" },
      users.pastor,
    );
    check(home.organizationId, org, "Pastoral dashboard uses same tenant");
    check(
      home.actions.some((a: any) => a.href === "/members"),
      true,
      "Pastoral dashboard links Pessoas",
    );
    check(
      home.metrics.find((m: any) => m.key === "people")?.value,
      205,
      "Pastoral dashboard total matches Pessoas",
    );
    const leaderHome: any = await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "cell_leader" },
      users.leader,
    );
    check(
      leaderHome.metrics.find((m: any) => m.key === "people")?.value,
      2,
      "Leader dashboard includes only own cell people",
    );
    await denied(
      () => op({ action: "people" }, users.member),
      403,
      "Member cannot list sensitive directory",
    );
    await denied(
      () => op({ action: "detail", personId: "p_200" }, users.leader),
      403,
      "Cell leader cannot read unrestricted ficha",
    );
    await denied(
      () => op({ action: "people", organizationId: org + "_other" }),
      403,
      "Cross-tenant denied",
    );
    await denied(
      () => op({ action: "detail", personId: "../users" }),
      400,
      "Invalid document ID denied",
    );
    await denied(
      () => op({ action: "detail", personId: "missing" }),
      404,
      "Missing person explicit",
    );
    await denied(
      () => op({ action: "unknown" }),
      400,
      "Unknown operation rejected",
    );
    await op({
      action: "preference",
      personId: "p_200",
      expectedOptOut: false,
      optOut: true,
    });
    check(
      (await db.doc(root + "/people/p_200").get()).data()?.firstName,
      "Ana",
      "Preference update preserves other fields",
    );
    await denied(
      () =>
        op({
          action: "preference",
          personId: "p_200",
          expectedOptOut: false,
          optOut: true,
        }),
      409,
      "Stale preference rejected",
    );
    await denied(
      () =>
        op({
          action: "preference",
          personId: "p_200",
          expectedOptOut: true,
          optOut: false,
        }),
      400,
      "Reauthorization requires confirmation",
    );
    await op({
      action: "preference",
      personId: "p_200",
      expectedOptOut: true,
      optOut: false,
      consentConfirmed: true,
    });
    check(
      (await db.doc(root + "/people/p_200").get()).data()?.whatsappOptOutAt,
      null,
      "Reauthorization clears old opt-out timestamp",
    );
    check(
      (await db.collection(root + "/peoplePreferenceAudit").get()).size,
      2,
      "Changes have actor audit trail",
    );
    await seed("settings/features", {
      modules: {
        finance: { enabled: false },
        volunteers: { enabled: false },
        journeys: { enabled: false },
      },
    });
    const paused = await op({ action: "detail", personId: "p_200" });
    check(paused.contributions, null, "Finance pause respected");
    check(paused.assignments, null, "Serving pause respected");
    check(paused.integration, null, "Journey pause respected");
    check(paused.notices.length, 3, "Unavailable is distinguished from empty");
    await seed("settings/features", { modules: {} });
    const login = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: users.pastor + "@example.test",
          password: "Only-QA-2026!",
          returnSecureToken: true,
        }),
      },
    );
    const { idToken } = await login.json();
    assert.ok(idToken);
    const request = (body: any, token = idToken) =>
      new NextRequest("http://localhost/api/members/directory", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: "Bearer " + token } : {}),
        },
        body: JSON.stringify(body),
      });
    check(
      (await POST(request({ action: "people", organizationId: org }, "")))
        .status,
      401,
      "Route requires auth",
    );
    const response = await POST(
      request({ action: "people", organizationId: org }),
    );
    check(response.status, 200, "Authenticated route");
    check(
      response.headers.get("cache-control")?.includes("no-store"),
      true,
      "PII response never cached",
    );
    const direct = await fetch(
      `http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${root}/people/p_200?updateMask.fieldPaths=communicationOptOut`,
      {
        method: "PATCH",
        headers: {
          authorization: "Bearer " + idToken,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fields: { communicationOptOut: { booleanValue: true } },
        }),
      },
    );
    check(direct.status, 403, "Direct preference writes cannot bypass audit");
    await seed("users/" + users.pastor, { isActive: false, roles: ["pastor"] });
    await denied(() => op({ action: "people" }), 403, "Inactive staff denied");
    await seed("users/" + users.pastor, {
      isActive: true,
      roles: ["pastor"],
      displayName: "Pastor fictício",
    });
    console.log(JSON.stringify({ result: "PASS", checks, org }));
    if (process.env.PEOPLE_QA_KEEP === "1")
      writeFileSync(
        "/tmp/people-ui-fixture.json",
        JSON.stringify({
          org,
          users,
          email: users.pastor + "@example.test",
          password: "Only-QA-2026!",
        }),
      );
  } finally {
    global.fetch = realFetch;
    if (process.env.PEOPLE_QA_KEEP !== "1") {
      await db.recursiveDelete(db.doc(root));
      await Promise.all(
        Object.values(users).map((uid) => auth.deleteUser(uid).catch(() => {})),
      );
    }
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

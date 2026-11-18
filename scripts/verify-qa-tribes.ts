import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import * as sdk from "../packages/firebase/src/index.ts";
import { tribeOperation } from "../apps/web/app/api/_lib/tribe-operations";
import { roleHomeOperation } from "../apps/web/app/api/_lib/role-home";
import { aiGate } from "../apps/web/app/api/_lib/ai-quota";
import { POST } from "../apps/web/app/api/tribes/route";
import { NextRequest } from "next/server";
const req = createRequire(import.meta.url),
  { initializeApp } = req("firebase-admin/app"),
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
    suffix = randomUUID().slice(0, 8),
    org = "qa_tribes_" + suffix,
    root = "organizations/" + org;
  const users = {
    pastor: "tp_" + suffix,
    leader: "tl_" + suffix,
    member: "tm_" + suffix,
    other: "to_" + suffix,
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
  const results: any[] = [],
    now = Date.now(),
    later = now + 86400000;
  const realFetch = global.fetch;
  let external = false;
  global.fetch = (async (input: any, init: any) => {
    const u = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    if (!["localhost", "127.0.0.1"].includes(u.hostname)) {
      external = true;
      throw Error("External blocked");
    }
    return realFetch(input, init);
  }) as typeof fetch;
  const check = (label: string, a: any, b: any) => {
    assert.deepEqual(a, b, label);
    results.push({ label, ok: true });
    console.log("OK " + label);
  };
  const denied = async (
    fn: () => Promise<any>,
    label: string,
    status = 403,
  ) => {
    let actual = 0;
    try {
      await fn();
    } catch (e: any) {
      actual = e.status;
    }
    check(label, actual, status);
  };
  const seed = (path: string, data: any) =>
    db.doc(root + "/" + path).set({ organizationId: org, ...data });
  const op = (body: any, uid = users.pastor, at = now) =>
    tribeOperation(
      { organizationId: org, scope: "leadership", ...body },
      uid,
      at,
    );
  const mutate = (body: any, uid = users.pastor, at = now) =>
    op({ requestId: randomUUID(), ...body }, uid, at);
  const snapshot = () => op({ action: "snapshot" });
  try {
    await db.doc(root).set({
      id: org,
      status: "active",
      name: "Igreja fictícia Tribos QA",
      timezone: "America/Belem",
    });
    await seed("settings/subscription", {
      plan: "enterprise",
      billingStatus: "active",
    });
    await seed("settings/features", {
      modules: {
        tribes: { enabled: true },
        volunteers: { enabled: true },
        groups: { enabled: true },
        ai: { enabled: true },
      },
    });
    for (const [personId, uid] of Object.entries(users)) {
      await auth.createUser({
        uid,
        email: uid + "@example.test",
        password: "Fictitious-QA-2026!",
      });
      await auth.setCustomUserClaims(uid, { organizationId: org });
      await seed("users/" + uid, {
        isActive: true,
        personId,
        roles: [
          personId === "pastor"
            ? "pastor"
            : personId === "leader"
              ? "group_leader"
              : "member",
        ],
      });
      await seed("people/" + personId, {
        id: personId,
        firstName: "Fictício " + personId,
        status: "active",
        memberStatus: "member",
        ministerialInterests: ["Recepção"],
        mobilePhone: "11900000001",
      });
      await seed("memberAccountLinks/" + uid, {
        userId: uid,
        personId,
        verifiedBy: users.pastor,
      });
      await seed("memberAccountClaims/" + personId, { userId: uid, personId });
    }
    await seed("people/inactive", {
      id: "inactive",
      firstName: "Inativo fictício",
      status: "inactive",
      tribePrimaryCode: "LEVI",
    });
    await seed("people/child", {
      id: "child",
      status: "active",
      personType: "child",
      firstName: "Criança fictícia",
    });
    await seed("groups/g1", {
      id: "g1",
      name: "Célula QA",
      status: "active",
      type: "cell",
    });
    for (const p of ["leader", "member"])
      await seed("groups/g1/members/g1_" + p, {
        id: "g1_" + p,
        groupId: "g1",
        personId: p,
        status: "active",
        roleInGroup: p === "leader" ? "leader" : "member",
      });
    await seed("serviceTeams/area", {
      id: "area",
      name: "Boas-vindas QA",
      summary: "Acompanhar a recepção",
      roles: ["Anfitrião"],
      status: "active",
    });
    await seed("serviceTeams/inactive", {
      id: "inactive",
      name: "Área arquivada",
      status: "inactive",
    });
    const s = await snapshot();
    check("Only active non-child people", s.people.length, 4);
    check("Only real active service areas", s.areas.length, 1);
    const scoped = await op({ action: "snapshot" }, users.leader);
    check(
      "Leader sees own active cell only",
      scoped.people.map((p: any) => p.id).sort(),
      ["leader", "member"],
    );
    const mine = await op(
      { action: "snapshot", scope: "personal" },
      users.member,
    );
    check(
      "Member sees only own profile",
      mine.people.map((p: any) => p.id),
      ["member"],
    );
    await denied(
      () => op({ action: "snapshot" }, users.member),
      "Member cannot enter leadership",
    );
    await denied(
      () =>
        mutate(
          {
            action: "create-invite",
            personId: "other",
            areaId: "area",
            purpose: "QA",
            scheduledAt: new Date(later).toISOString(),
          },
          users.leader,
        ),
      "Leader cannot invite outside own cell",
    );
    await denied(
      () =>
        mutate(
          { action: "map-area", areaId: "area", tribe: "ASHER", revision: 0 },
          users.leader,
        ),
      "Leader cannot change church mapping",
    );
    await mutate({
      action: "map-area",
      areaId: "area",
      tribe: "ASHER",
      revision: 0,
    });
    check("Area mapping persists", (await snapshot()).areas[0].tribe, "ASHER");
    await denied(
      () =>
        mutate({
          action: "map-area",
          areaId: "area",
          tribe: "LEVI",
          revision: 0,
        }),
      "Stale area revision rejected",
      409,
    );
    await denied(
      () =>
        mutate({
          action: "classify",
          personId: "member",
          tribe: "ASHER",
          reason: "Conversa QA",
          revision: 0,
        }),
      "Classification requires agreement attestation",
      400,
    );
    const classify = {
      action: "classify",
      personId: "member",
      tribe: "ASHER",
      secondary: "",
      reason: "Interesse declarado em acolher, conversado com a pessoa.",
      revision: 0,
      memberAgreed: true,
      requestId: randomUUID(),
    };
    await op(classify);
    await op(classify);
    check(
      "Classification replay does not duplicate history",
      (await db.collection(root + "/people/member/tribeHistory").get()).size,
      1,
    );
    check(
      "Classification atomic and versioned",
      (await db.doc(root + "/people/member").get()).data().tribeRevision,
      1,
    );
    await denied(
      () => mutate({ ...classify, requestId: randomUUID() }),
      "Stale classification rejected",
      409,
    );
    await denied(
      () =>
        mutate({
          action: "classify",
          personId: "member",
          tribe: "ASHER",
          secondary: "ASHER",
          reason: "QA",
          memberAgreed: true,
          revision: 1,
        }),
      "Duplicate secondary rejected",
      400,
    );
    await denied(
      () =>
        mutate(
          { scope: "personal", action: "request", areaId: "inactive" },
          users.member,
        ),
      "Inactive area unavailable",
      404,
    );
    const request = {
      scope: "personal",
      action: "request",
      areaId: "area",
      purpose: "Quero conhecer a recepção",
      personId: "other",
      requestId: randomUUID(),
    };
    const r = await op(request, users.member);
    await op(request, users.member);
    let trial = (await snapshot()).trials[0];
    check("Self request cannot spoof another person", trial.personId, "member");
    check("Only one trial after replay", (await snapshot()).trials.length, 1);
    await denied(
      () => mutate({ ...request, requestId: randomUUID() }, users.member),
      "Duplicate open trial prevented",
      409,
    );
    const home = (await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "pastoral" },
      users.pastor,
      now,
    )) as any;
    check(
      "Pastor dashboard flags interest",
      home.metrics.find((m: any) => m.key === "tribe-next-steps")?.value,
      1,
    );
    check(
      "Pastor dashboard links workflow",
      home.actions.find((a: any) => a.key === "tribes")?.href,
      "/tribes",
    );
    await denied(
      () =>
        mutate(
          {
            action: "invite",
            id: r.id,
            personId: "member",
            revision: 1,
            purpose: "Acompanhar a equipe",
            scheduledAt: new Date(now - 1).toISOString(),
          },
          users.leader,
        ),
      "Past dates rejected",
      400,
    );
    await mutate(
      {
        action: "invite",
        id: r.id,
        personId: "member",
        revision: 1,
        purpose: "Acompanhar a equipe na entrada",
        scheduledAt: new Date(later).toISOString(),
      },
      users.leader,
    );
    trial = (await snapshot()).trials[0];
    check("Leader invitation persists", trial.status, "invited");
    const mh = (await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "member" },
      users.member,
      now,
    )) as any;
    check(
      "Mobile member dashboard signals invitation",
      mh.metrics.find((m: any) => m.key === "tribe-next-steps")?.value,
      1,
    );
    check(
      "Mobile member dashboard opens personal flow",
      mh.actions.find((a: any) => a.key === "tribes")?.href,
      "/my-tribe",
    );
    const contact = await op(
      { action: "contact", id: r.id, personId: "member" },
      users.leader,
    );
    check(
      "Manual WhatsApp message personalized",
      contact.message.includes("Fictício member") &&
        contact.message.includes("Boas-vindas QA"),
      true,
    );
    await db.doc(root + "/people/member").update({ communicationOptOut: true });
    await denied(
      () =>
        op({ action: "contact", id: r.id, personId: "member" }, users.leader),
      "WhatsApp opt-out respected",
      409,
    );
    await db
      .doc(root + "/people/member")
      .update({ communicationOptOut: false });
    await denied(
      () =>
        mutate(
          { scope: "personal", action: "accept", id: r.id, revision: 2 },
          users.other,
        ),
      "Another member cannot respond",
      404,
    );
    await denied(
      () =>
        mutate({ action: "accept", id: r.id, personId: "member", revision: 2 }),
      "Leader cannot accept on behalf of member",
      409,
    );
    await mutate(
      { scope: "personal", action: "accept", id: r.id, revision: 2 },
      users.member,
    );
    check(
      "Member acceptance visible to pastor",
      (await snapshot()).trials[0].status,
      "accepted",
    );
    await denied(
      () =>
        mutate(
          {
            scope: "personal",
            action: "feedback",
            id: r.id,
            revision: 3,
            feedback: "Gostei",
            interest: "continue",
          },
          users.member,
        ),
      "Feedback cannot precede experience",
      409,
    );
    await mutate(
      {
        scope: "personal",
        action: "feedback",
        id: r.id,
        revision: 3,
        feedback: "Gostei de acolher; gostaria de continuar.",
        interest: "continue",
      },
      users.member,
      later + 1,
    );
    check(
      "Feedback is shared and persisted",
      (await snapshot()).trials[0].status,
      "completed",
    );
    const lh = (await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "cell_leader" },
      users.leader,
      later + 1,
    )) as any;
    check(
      "Cell leader sees follow-up in dashboard",
      lh.metrics.find((m: any) => m.key === "tribe-next-steps")?.value,
      1,
    );
    await mutate(
      {
        action: "close",
        id: r.id,
        personId: "member",
        revision: 4,
        outcome: "Conversar com a equipe e combinar treinamento.",
      },
      users.leader,
      later + 1,
    );
    check(
      "Follow-up ends with concrete next step",
      (await snapshot()).trials[0].outcome,
      "Conversar com a equipe e combinar treinamento.",
    );
    check(
      "No automatic assignments created",
      (await db.collection(root + "/serviceAssignments").get()).size,
      0,
    );
    check(
      "No automatic WhatsApp messages created",
      (await db.collection(root + "/whatsappOutbox").get()).size,
      0,
    );
    await db.doc(root + "/memberAccountClaims/other").delete();
    const manual = await mutate({
      action: "create-invite",
      personId: "other",
      areaId: "area",
      purpose: "Experiência sem instalar app",
      scheduledAt: new Date(later).toISOString(),
    });
    await denied(
      () =>
        mutate({
          action: "record-response",
          id: manual.id,
          personId: "other",
          revision: 1,
          response: "accept",
          responseNote: "Aceitou por conversa.",
        }),
      "Manual reply requires explicit attestation",
      400,
    );
    await mutate({
      action: "record-response",
      id: manual.id,
      personId: "other",
      revision: 1,
      response: "accept",
      responseNote: "Aceitou na conversa com a liderança.",
      confirmedByPerson: true,
    });
    let manualTrial = (await snapshot()).trials.find(
      (t: any) => t.id === manual.id,
    );
    check(
      "Member without linked app can respond through leadership",
      manualTrial.status,
      "accepted",
    );
    check(
      "Recorded reply is distinguished from personal login",
      manualTrial.responseSource,
      "leadership_record",
    );
    await mutate(
      {
        action: "record-response",
        id: manual.id,
        personId: "other",
        revision: 2,
        response: "feedback",
        responseNote: "Disse que prefere outra área.",
        feedback: "Prefiro experimentar outra área.",
        interest: "explore",
        confirmedByPerson: true,
      },
      users.pastor,
      later + 1,
    );
    check(
      "Manual feedback persists own choice",
      (await snapshot()).trials.find((t: any) => t.id === manual.id).interest,
      "explore",
    );
    await mutate(
      {
        action: "close",
        id: manual.id,
        personId: "other",
        revision: 3,
        outcome: "Conversar sobre outras áreas.",
      },
      users.pastor,
      later + 1,
    );
    check(
      "Creation and replies retained in history",
      (
        await db
          .collection(root + "/tribeTrials/" + manual.id + "/history")
          .get()
      ).size,
      4,
    );
    await db
      .doc(root + "/groups/g1/members/g1_member")
      .update({ status: "inactive" });
    check(
      "Former cell member disappears from leader view",
      (await op({ action: "snapshot" }, users.leader)).trials.length,
      0,
    );
    await denied(
      () =>
        mutate(
          {
            action: "create-invite",
            personId: "member",
            areaId: "area",
            purpose: "QA",
            scheduledAt: new Date(later).toISOString(),
          },
          users.leader,
        ),
      "Revoked cell scope blocks new invitations",
    );
    await denied(
      () => aiGate(org, users.member, "tribe_classify", false),
      "Member cannot use classification AI",
    );
    await db.doc(root + "/settings/features").set({
      organizationId: org,
      modules: { tribes: { enabled: false }, ai: { enabled: true } },
    });
    await denied(() => snapshot(), "Disabled module blocks API");
    await denied(
      () => aiGate(org, users.pastor, "tribe_classify", false),
      "Disabled module blocks classification AI",
    );
    await db.doc(root + "/settings/features").set({
      organizationId: org,
      modules: {
        tribes: { enabled: true },
        volunteers: { enabled: true },
        groups: { enabled: true },
        ai: { enabled: true },
      },
    });
    await db.doc(root + "/settings/subscription").update({ plan: "free" });
    await denied(() => snapshot(), "Plan ceiling enforced");
    await db
      .doc(root + "/settings/subscription")
      .update({ plan: "enterprise" });
    await denied(
      () =>
        tribeOperation(
          {
            organizationId: "another_org",
            action: "snapshot",
            scope: "leadership",
          },
          users.pastor,
        ),
      "Tenant isolation",
    );
    const anonymous = await POST(
      new NextRequest("http://127.0.0.1:3001/api/tribes", {
        method: "POST",
        body: JSON.stringify({
          organizationId: org,
          action: "snapshot",
          scope: "personal",
        }),
      }),
    );
    check("HTTP boundary rejects anonymous", anonymous.status, 401);
    const login = await sdk.signInWithFirebaseEmailPassword({
      config,
      email: users.pastor + "@example.test",
      password: "Fictitious-QA-2026!",
    });
    const token = await login.user.getIdToken();
    const http = await POST(
      new NextRequest("http://127.0.0.1:3001/api/tribes", {
        method: "POST",
        headers: {
          authorization: "Bearer " + token,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          organizationId: org,
          action: "snapshot",
          scope: "leadership",
        }),
      }),
    );
    check("HTTP authenticated snapshot", http.status, 200);
    let blocked = false;
    try {
      await sdk.savePersonProfile(config, { organizationId: org }, {
        id: "member",
        tribePrimaryCode: "LEVI",
      } as any);
    } catch (e: any) {
      blocked =
        String(e.code || e.message).includes("permission-denied") ||
        String(e.message).includes("permissions");
    }
    check("SDK cannot bypass atomic tribe revision", blocked, true);
    blocked = false;
    try {
      await sdk.addMemberTribeHistory(
        config,
        { organizationId: org },
        "member",
        {
          newPrimaryTribeCode: "LEVI",
          changeType: "initial_assignment",
          source: "manual",
        } as any,
      );
    } catch (e: any) {
      blocked =
        String(e.code || e.message).includes("permission-denied") ||
        String(e.message).includes("permissions");
    }
    check("SDK cannot forge audit history", blocked, true);
    check("No external calls", external, false);
    console.log(JSON.stringify({ checks: results.length, ok: true }));
  } finally {
    global.fetch = realFetch;
    await sdk.signOutFromFirebase(config).catch(() => {});
    await db.recursiveDelete(db.doc(root));
    await auth.deleteUsers(Object.values(users));
    writeFileSync(
      "/tmp/tribes-retest-results.json",
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

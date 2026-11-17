import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import {
  pastoralOperation,
  careReplyInput,
} from "../apps/web/app/api/_lib/pastoral-care";
import { pastoralRadar } from "../apps/web/app/api/_lib/pastoral-radar";
import { roleHomeOperation } from "../apps/web/app/api/_lib/role-home";
import { POST } from "../apps/web/app/api/pastoral/route";
import { NextRequest } from "next/server";
async function main() {
  assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-alvo-qa");
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth();
  const org = "qa_care_" + randomUUID().slice(0, 8),
    network = org + "_net",
    other = org + "_other",
    root = "organizations/" + org;
  const ids = {
    pastor: org + "_pastor",
    leader: org + "_leader",
    outsider: org + "_outsider",
    member: org + "_member",
    secretary: org + "_secretary",
    president: org + "_president",
  };
  let checks = 0,
    completed = false;
  const eq = (a: any, b: any, label: string) => {
    assert.deepEqual(a, b, label);
    checks++;
    console.log("OK " + label);
  };
  const deny = async (
    fn: () => Promise<any>,
    status: number,
    label: string,
  ) => {
    await assert.rejects(fn, (e) => (e as any).status === status, label);
    checks++;
    console.log("OK " + label);
  };
  const realFetch = global.fetch;
  global.fetch = (async (input: any, init: any) => {
    const url = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    assert.ok(
      ["localhost", "127.0.0.1"].includes(url.hostname),
      "External access forbidden",
    );
    return realFetch(input, init);
  }) as typeof fetch;
  const set = (path: string, data: any) =>
    db.doc(root + "/" + path).set({ organizationId: org, ...data });
  const call = (body: any, uid = ids.pastor, organizationId = org) =>
    pastoralOperation({ organizationId, ...body }, uid) as Promise<any>;
  const home = (profile: string, uid: string, organizationId = org) =>
    roleHomeOperation(
      { action: "overview", profile, organizationId },
      uid,
    ) as Promise<any>;
  try {
    for (const id of [org, network, other]) {
      await db.doc("organizations/" + id).set({
        organizationId: id,
        name:
          id === org
            ? "Igreja Esperança QA"
            : id === network
              ? "Rede Pastoral QA"
              : "Igreja Caminho QA",
        displayName:
          id === org
            ? "Igreja Esperança QA"
            : id === network
              ? "Rede Pastoral QA"
              : "Igreja Caminho QA",
        slug: id,
        status: "active",
        organizationTier: id === network ? "network" : "solo",
        timezone: "America/Belem",
      });
      await db
        .doc("organizations/" + id + "/settings/subscription")
        .set({ plan: id === network ? "rede" : "pastoral" });
      await db.doc("organizations/" + id + "/settings/features").set({
        modules: Object.fromEntries(
          ["core", "ai", "groups", "journeys", "volunteers", "events"].map(
            (k) => [k, { enabled: true }],
          ),
        ),
      });
    }
    for (const [role, uid] of Object.entries(ids)) {
      const email = uid + "@example.test";
      await auth.createUser({
        uid,
        email,
        password: "Fictitious-QA-2026!",
        displayName: role + " fictício",
      });
      const id = role === "president" ? network : org;
      await db.doc("organizations/" + id + "/users/" + uid).set({
        organizationId: id,
        isActive: true,
        roles: [
          role === "leader" || role === "outsider"
            ? "group_leader"
            : role === "president"
              ? "church_admin"
              : role,
        ],
        displayName: role + " fictício",
        email,
        personId: role,
      });
      if (role !== "president") {
        await set("people/" + role, {
          firstName: role,
          lastName: "Fictício",
          status: "active",
          memberStatus: "member",
        });
        await set("memberAccountLinks/" + uid, {
          userId: uid,
          personId: role,
          verifiedBy: ids.pastor,
        });
        await set("memberAccountClaims/" + role, {
          userId: uid,
          personId: role,
        });
      }
    }
    for (const groupId of ["g1", "g2"])
      await set("groups/" + groupId, {
        name: groupId === "g1" ? "Célula Esperança" : "Célula Caminho",
        type: "cell",
        groupType: "cell",
        status: "active",
      });
    for (const [g, p, role] of [
      ["g1", "leader", "leader"],
      ["g1", "member", "member"],
      ["g2", "outsider", "leader"],
    ])
      await set("groups/" + g + "/members/" + g + "_" + p, {
        groupId: g,
        personId: p,
        roleInGroup: role,
        status: "active",
        joinedAt: "2026-01-01",
      });
    await db.doc("organizations/" + network + "/affiliates/a1").set({
      parentOrganizationId: network,
      childOrganizationId: org,
      status: "active",
    });
    await db.doc("networkAffiliations/" + org).set({
      parentOrganizationId: network,
      childOrganizationId: org,
      affiliateId: "a1",
      status: "active",
    });
    await db.doc("organizations/" + network + "/affiliates/a2").set({
      parentOrganizationId: network,
      childOrganizationId: other,
      status: "active",
    });
    await db.doc("networkAffiliations/" + other).set({
      parentOrganizationId: network,
      childOrganizationId: other,
      affiliateId: "a2",
      status: "active",
    });
    await db.doc("organizations/" + network + "/affiliates/fake").set({
      parentOrganizationId: network,
      childOrganizationId: "unverified",
      status: "active",
    });
    await db.doc("organizations/" + other + "/prayerRequests/private").set({
      organizationId: other,
      personName: "NOME PROTEGIDO",
      message: "SEGREDO DA FILIAL",
      phone: "99999999",
      status: "open",
    });
    const create = {
      action: "create",
      requestId: "new1",
      personId: "member",
      message: "Pedido fictício de acolhimento",
      category: "Oração",
      phone: "91999999999",
    };
    const first = await call(create);
    eq(typeof first.id, "string", "Create request");
    eq((await call(create)).id, first.id, "Idempotent creation");
    await deny(
      () => call({ ...create, message: "changed" }),
      409,
      "Conflicting retry",
    );
    await deny(
      () => call(create, ids.member),
      403,
      "Member cannot create reception report",
    );
    await deny(
      () => call({ action: "overview" }, ids.secretary),
      403,
      "Secretary cannot read private pastoral queue",
    );
    await deny(
      () => call({ action: "overview" }, ids.member),
      403,
      "Member denied private queue",
    );
    eq(
      (await call({ action: "overview" }, ids.leader)).summary.open,
      0,
      "Leader does not see unassigned report",
    );
    let detail = (await call({ action: "detail", requestId: first.id }))
      .request;
    eq(detail.personName, "member Fictício", "Name comes from linked person");
    eq(detail.isPublic, false, "Private by default");
    await deny(
      () => call({ action: "detail", requestId: first.id }, ids.outsider),
      403,
      "Outsider leader denied detail",
    );
    await deny(
      () =>
        call({
          action: "assign",
          requestId: first.id,
          revision: 0,
          ownerId: ids.outsider,
          groupId: "g1",
        }),
      403,
      "Cannot assign to unrelated leader",
    );
    await deny(
      () =>
        call({
          action: "assign",
          requestId: first.id,
          revision: 0,
          ownerId: ids.leader,
        }),
      403,
      "Leader assignment requires group",
    );
    await call({
      action: "triage",
      requestId: first.id,
      revision: 0,
      priority: "urgent",
      dueAt: "2026-01-01",
    });
    await deny(
      () =>
        call({
          action: "triage",
          requestId: first.id,
          revision: 0,
          priority: "normal",
        }),
      409,
      "Stale update denied",
    );
    await deny(
      () =>
        call({
          action: "assign",
          requestId: first.id,
          revision: 1,
          ownerId: ids.leader,
          groupId: "g1",
          dueAt: "2026-02-30",
        }),
      400,
      "Invalid deadline rejected",
    );
    await call({
      action: "assign",
      requestId: first.id,
      revision: 1,
      ownerId: ids.leader,
      groupId: "g1",
      dueAt: "2026-01-01",
    });
    const urgentNetwork = await call(
      { action: "overview" },
      ids.president,
      network,
    );
    eq(urgentNetwork.summary.urgent, 1, "President sees urgent aggregate");
    eq(urgentNetwork.summary.overdue, 1, "President sees overdue aggregate");
    const led = await call({ action: "overview" }, ids.leader);
    eq(led.summary.open, 1, "Assigned leader sees request");
    eq(led.summary.overdue, 1, "Overdue count");
    eq(led.summary.urgent, 1, "Urgent count");
    const pastor = await home("pastoral", ids.pastor);
    eq(pastor.care.summary.open, 1, "Pastor dashboard shares queue");
    eq(
      pastor.care.summary.unassigned,
      0,
      "Real owner removes unassigned metric",
    );
    const leader = await home("cell_leader", ids.leader);
    eq(
      leader.care.requests[0].id,
      first.id,
      "Leader dashboard shares assigned request",
    );
    eq(
      JSON.stringify(leader.care).includes("Pedido fictício"),
      false,
      "Dashboard minimizes report text",
    );
    const out = await home("cell_leader", ids.outsider);
    eq(out.care.summary.open, 0, "Unrelated leader dashboard isolated");
    eq(
      (await careReplyInput(org, ids.leader, first.id, "cell_leader"))
        .personName,
      "Pessoa acolhida",
      "Generation omits personal name",
    );
    await deny(
      () => careReplyInput(org, ids.outsider, first.id, "cell_leader"),
      403,
      "Generation enforces report scope",
    );
    await call(
      { action: "contact", requestId: first.id, revision: 2 },
      ids.leader,
    );
    eq(
      (await call({ action: "detail", requestId: first.id })).history.length,
      4,
      "Persistent action history",
    );
    await deny(
      () =>
        call(
          {
            action: "triage",
            requestId: first.id,
            revision: 3,
            priority: "normal",
          },
          ids.leader,
        ),
      403,
      "Leader cannot change priority",
    );
    await set("groups/g1/members/g1_member", {
      groupId: "g1",
      personId: "member",
      roleInGroup: "member",
      status: "inactive",
    });
    eq(
      (await call({ action: "overview" }, ids.leader)).summary.open,
      0,
      "Removed member revokes leader visibility",
    );
    await deny(
      () =>
        call(
          { action: "resolve", requestId: first.id, revision: 3 },
          ids.leader,
        ),
      403,
      "Removed member revokes mutation",
    );
    await set("groups/g1/members/g1_member", {
      groupId: "g1",
      personId: "member",
      roleInGroup: "member",
      status: "active",
    });
    await db
      .doc(root + "/memberAccountClaims/leader")
      .update({ userId: ids.outsider });
    await deny(
      () => call({ action: "detail", requestId: first.id }, ids.leader),
      403,
      "Invalid leader claim denied",
    );
    await db
      .doc(root + "/memberAccountClaims/leader")
      .update({ userId: ids.leader });
    await call(
      { action: "resolve", requestId: first.id, revision: 3 },
      ids.leader,
    );
    eq(
      (await home("pastoral", ids.pastor)).care.summary.open,
      0,
      "Resolution updates pastor dashboard",
    );
    eq(
      (await call({ action: "overview", resolved: true }, ids.leader)).requests
        .length,
      1,
      "Resolved history available",
    );
    await deny(
      () =>
        call(
          { action: "reopen", requestId: first.id, revision: 4 },
          ids.leader,
        ),
      403,
      "Only pastoral staff can reopen",
    );
    await deny(
      () =>
        call({
          action: "assign",
          requestId: first.id,
          revision: 4,
          ownerId: ids.pastor,
        }),
      409,
      "Resolved report cannot be assigned without reopening",
    );
    await call({ action: "reopen", requestId: first.id, revision: 4 });
    eq(
      (await call({ action: "overview" })).summary.unassigned,
      1,
      "Reopen requires new assignment",
    );
    const sub = await call(
      {
        action: "submit",
        requestId: "mobile1",
        message: "Oração pública fictícia",
        isPublic: true,
        assignedToUserId: ids.outsider,
        personId: "secretary",
      },
      ids.member,
    );
    eq(
      (
        await call(
          {
            action: "submit",
            requestId: "mobile1",
            message: "Oração pública fictícia",
            isPublic: true,
          },
          ids.member,
        )
      ).id,
      sub.id,
      "Mobile submit idempotent",
    );
    const saved = (
      await db.doc(root + "/prayerRequests/" + sub.id).get()
    ).data()!;
    eq(saved.personId, "member", "App uses verified person binding");
    eq(saved.assignedToUserId, undefined, "App cannot inject assignee");
    await db.doc(root + "/prayerRequests/" + sub.id).update({
      phone: "SENSITIVE",
      ownerName: "INTERNAL",
      careOwner: "INTERNAL",
    });
    const wall = await call({ action: "wall" }, ids.member);
    eq(wall.items.length, 1, "Only opted-in public request on wall");
    eq(
      Object.keys(wall.items[0]).sort(),
      ["id", "personName", "message", "createdAt", "prayerCount"].sort(),
      "Public wall strips internal fields",
    );
    await call({ action: "pray", requestId: sub.id }, ids.member);
    await call({ action: "pray", requestId: sub.id }, ids.member);
    eq(
      (await db.doc(root + "/prayerRequests/" + sub.id).get()).data()!
        .prayerCount,
      1,
      "One prayer reaction per account",
    );
    await deny(
      () => call({ action: "pray", requestId: first.id }, ids.member),
      404,
      "Cannot react to private report",
    );
    let net = await call({ action: "overview" }, ids.president, network);
    eq(net.churches.length, 2, "Network validates reciprocal affiliations");
    eq(net.summary.open, 3, "Network totals confirmed institutions");
    eq(JSON.stringify(net).includes("SEGREDO"), false, "Network no reports");
    eq(
      JSON.stringify(net).includes("NOME PROTEGIDO"),
      false,
      "Network no personal names",
    );
    const netHome = await home("network", ids.president, network);
    eq(
      netHome.churches.find((r: any) => r.id === org).careOpen,
      2,
      "President dashboard current pastoral count",
    );
    await deny(
      () => call({ action: "detail", requestId: first.id }, ids.president, org),
      403,
      "President role does not grant local records",
    );
    await deny(
      () =>
        call({ action: "detail", requestId: first.id }, ids.president, network),
      403,
      "Network detail operation rejected",
    );
    await db.doc("networkAffiliations/" + other).update({ status: "inactive" });
    eq(
      (await call({ action: "overview" }, ids.president, network)).churches
        .length,
      1,
      "Inactive affiliation excluded immediately",
    );
    await db.doc("networkAffiliations/" + other).update({ status: "active" });
    await db
      .doc("organizations/" + other + "/settings/features")
      .update({ "modules.ai.enabled": false });
    net = await call({ action: "overview" }, ids.president, network);
    eq(
      net.churches.find((r: any) => r.id === other).open,
      null,
      "Unavailable data is not zero",
    );
    eq(net.summary.covered, 1, "Network coverage reported");
    await deny(
      () => call({ action: "overview", profile: "network" }),
      403,
      "Local pastor cannot impersonate network",
    );
    await db.doc(root + "/users/" + ids.leader).update({ isActive: false });
    await deny(
      () => call({ action: "overview" }, ids.leader),
      403,
      "Inactive leader denied",
    );
    await db.doc(root + "/users/" + ids.leader).update({ isActive: true });
    await set("prayerRequests/whatsapp", {
      personName: "Entrada WhatsApp",
      message: "Fictício",
      status: "open",
      source: "whatsapp",
      createdAt: new Date().toISOString(),
      isPublic: false,
    });
    eq(
      (await call({ action: "overview" })).requests.some(
        (r: any) => r.source === "whatsapp",
      ),
      true,
      "WhatsApp existing source joins unified queue",
    );
    // Radar fixtures: explicit recent absences, historical ministries ignored.
    const today = new Date().toISOString().slice(0, 10),
      old = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    await set("churchAttendance/old_member", {
      personId: "member",
      serviceDate: old,
    });
    for (let i = 0; i < 2; i++) {
      const id = "meet" + i;
      await set("groups/g1/meetings/" + id, {
        groupId: "g1",
        meetingStatus: "completed",
        scheduledStartAt: new Date(
          Date.now() - (i + 1) * 7 * 86400000,
        ).toISOString(),
      });
      await set("groups/g1/meetings/" + id + "/attendance/member", {
        groupId: "g1",
        groupMeetingId: id,
        personId: "member",
        attendanceStatus: "absent",
      });
    }
    for (let i = 0; i < 3; i++)
      await set("serviceAssignments/old" + i, {
        personId: "member",
        serviceTeamId: "t" + i,
        status: "confirmed",
        serviceDate: "2020-01-01",
      });
    const radar = await pastoralRadar({ organizationId: org }, ids.pastor);
    eq(
      radar.signals.some((r) => r.kind === "culto" && r.personId === "member"),
      true,
      "Radar shows dated attendance gap",
    );
    eq(
      radar.signals.some((r) => r.kind === "culto" && r.personId === "pastor"),
      false,
      "Missing record not presumed absence",
    );
    eq(
      radar.signals.some((r) => r.kind === "celula" && r.personId === "member"),
      true,
      "Radar uses explicit absences in completed meetings",
    );
    eq(
      radar.signals.some((r) => r.kind === "escala"),
      false,
      "Old assignments not simultaneous overload",
    );
    const lr = await pastoralRadar(
      { organizationId: org, profile: "cell_leader" },
      ids.leader,
    );
    eq(
      lr.signals.every((r) => r.kind === "celula" && r.groupId === "g1"),
      true,
      "Leader radar limited to own cells",
    );
    eq(
      (
        await pastoralRadar(
          { organizationId: org, profile: "cell_leader" },
          ids.outsider,
        )
      ).signals.length,
      0,
      "Other cell signals hidden",
    );
    await call({ action: "checkin", personId: "member", date: today });
    eq(
      (await pastoralRadar({ organizationId: org }, ids.pastor)).signals.some(
        (r) => r.kind === "culto",
      ),
      false,
      "New check-in clears dated gap",
    );
    await deny(
      () =>
        call(
          { action: "checkin", personId: "member", date: today },
          ids.leader,
        ),
      403,
      "Leader cannot record church-wide attendance",
    );
    const batch = db.batch();
    for (let i = 0; i < 105; i++)
      batch.set(
        db.doc(root + "/prayerRequests/older_" + String(i).padStart(3, "0")),
        {
          organizationId: org,
          personName: "Pedido fictício " + i,
          message: "Acolhimento",
          status: "open",
          createdAt: "2025-01-01",
          isPublic: false,
        },
      );
    await batch.commit();
    const page = await call({ action: "overview" });
    eq(page.requests.length, 100, "Bounded queue page");
    eq(page.hasMore, true, "Queue pagination explicit");
    eq(
      (await call({ action: "overview", offset: 100 })).requests.length,
      8,
      "Old requests accessible on next page",
    );
    await db
      .doc(root + "/settings/features")
      .update({ "modules.ai.enabled": false });
    await deny(
      () => call({ action: "overview" }),
      403,
      "Paused module enforced",
    );
    await deny(
      () =>
        call(
          { action: "submit", requestId: "paused", message: "test" },
          ids.member,
        ),
      403,
      "Paused module blocks app submit",
    );
    await db
      .doc(root + "/settings/features")
      .update({ "modules.ai.enabled": true });
    await db.doc(root + "/settings/subscription").set({ plan: "free" });
    await deny(
      () => call({ action: "overview" }),
      403,
      "Plan restriction enforced",
    );
    await db.doc(root + "/settings/subscription").set({ plan: "pastoral" });
    const anonymous = await POST(
      new NextRequest("http://127.0.0.1/api/pastoral", {
        method: "POST",
        body: JSON.stringify({ action: "overview", organizationId: org }),
      }),
    );
    eq(anonymous.status, 401, "API requires authentication");
    eq(
      anonymous.headers.get("cache-control")?.includes("no-store"),
      true,
      "Private response uncached",
    );
    // Emulator token and direct rules tests: even public documents cannot leak internal fields.
    const login = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: ids.member + "@example.test",
          password: "Fictitious-QA-2026!",
          returnSecureToken: true,
        }),
      },
    );
    const token = (await login.json()).idToken;
    assert.ok(token);
    const docUrl =
      "http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/" +
      root +
      "/prayerRequests/" +
      sub.id;
    eq(
      (await fetch(docUrl, { headers: { Authorization: "Bearer " + token } }))
        .status,
      403,
      "Direct public report read denied",
    );
    eq(
      (
        await fetch(docUrl, {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + token,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            fields: { status: { stringValue: "resolved" } },
          }),
        })
      ).status,
      403,
      "Direct workflow write denied",
    );
    const api = await POST(
      new NextRequest("http://127.0.0.1/api/pastoral", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "wall", organizationId: org }),
      }),
    );
    eq(api.status, 200, "Member wall works through authenticated API");
    const unlinked = await call({
      action: "create",
      requestId: "unlinked",
      personName: "Visitante fictício",
      message: "Solicita acolhimento",
    });
    await deny(
      () =>
        call({
          action: "link-person",
          requestId: unlinked.id,
          revision: 0,
          personId: "missing",
        }),
      404,
      "Cannot link nonexistent person",
    );
    await call({
      action: "link-person",
      requestId: unlinked.id,
      revision: 0,
      personId: "member",
    });
    eq(
      (await call({ action: "detail", requestId: unlinked.id })).request
        .personId,
      "member",
      "Reception report linked to verified person",
    );
    await deny(
      () =>
        call({
          action: "link-person",
          requestId: unlinked.id,
          revision: 1,
          personId: "secretary",
        }),
      409,
      "Cannot replace linked identity",
    );
    await call({
      action: "assign",
      requestId: unlinked.id,
      revision: 1,
      ownerId: ids.leader,
      groupId: "g1",
    });
    eq(
      (await call({ action: "detail", requestId: unlinked.id }, ids.leader))
        .request.personId,
      "member",
      "Linked reception reaches correct leader",
    );
    const contactLink = await call({
      action: "whatsapp-link",
      requestId: first.id,
      message: "Mensagem fictícia revisada",
    });
    eq(
      new URL(contactLink.url).hostname,
      "wa.me",
      "Pastor prepares manual contact through authorized request",
    );
    await set("people/member", {
      firstName: "member",
      lastName: "Fictício",
      status: "active",
      communicationOptOut: true,
    });
    await deny(
      () =>
        call({
          action: "whatsapp-link",
          requestId: first.id,
          message: "Mensagem fictícia",
        }),
      409,
      "Current contact preference blocks WhatsApp",
    );
    await set("people/member", {
      firstName: "member",
      lastName: "Fictício",
      status: "active",
      communicationOptOut: false,
    });
    await deny(
      () =>
        call(
          {
            action: "whatsapp-link",
            requestId: first.id,
            message: "Mensagem fictícia",
          },
          ids.outsider,
        ),
      403,
      "Unrelated leader cannot obtain contact link",
    );
    completed = true;
    console.log(JSON.stringify({ result: "PASS", checks, org, network }));
    if (process.env.PASTORAL_QA_KEEP === "1")
      writeFileSync(
        "/tmp/pastoral-ui-fixture.json",
        JSON.stringify({
          org,
          network,
          other,
          ids,
          password: "Fictitious-QA-2026!",
        }),
      );
  } finally {
    global.fetch = realFetch;
    if (process.env.PASTORAL_QA_KEEP !== "1" || !completed) {
      for (const id of [org, network, other]) {
        await db.recursiveDelete(db.doc("organizations/" + id));
        await db.doc("networkAffiliations/" + id).delete();
      }
      for (const uid of Object.values(ids))
        await auth.deleteUser(uid).catch(() => {});
    }
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

import assert from "node:assert/strict";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { POST as serving } from "../apps/web/app/api/serving/route";
import { POST as mobile } from "../apps/web/app/api/mobile/member/route";
import { dispatchServingPush } from "../apps/web/app/api/_lib/serving-operations";
import { conversationReply } from "../apps/web/app/api/_lib/whatsapp-conversation";
import { digest } from "../apps/web/app/api/_lib/participation";
import {
  signInWithFirebaseMobileEmailPassword,
  signOutFromFirebaseMobile,
} from "../packages/firebase/src/index";
async function main() {
  if (
    process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
  )
    throw new Error("Only isolated demo-alvo-qa emulators are allowed.");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth(),
    suffix = crypto.randomUUID().slice(0, 8),
    orgId = `qa_serving_${suffix}`,
    root = `organizations/${orgId}`,
    admin = `admin_${suffix}`,
    member = `member_${suffix}`,
    other = `other_${suffix}`,
    pid = "person_fictional",
    phone = "5562999990001",
    password = "Local-QA-2026!";
  const config = {
    apiKey: "demo-alvo-qa-key",
    authDomain: "demo-alvo-qa.firebaseapp.com",
    projectId: "demo-alvo-qa",
    storageBucket: "demo-alvo-qa.firebasestorage.app",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:localqa",
    useEmulator: true,
  };
  let adminToken = "",
    memberToken = "",
    checks = 0;
  const eq = (a: unknown, b: unknown, label: string) => {
    assert.deepEqual(a, b, label);
    checks++;
  };
  const seed = async (path: string, data: object) =>
    db.doc(`${root}/${path}`).set(data);
  const api = async (
    handler: typeof serving,
    body: object,
    token = adminToken,
  ) => {
    const response = await handler(
      new NextRequest("http://127.0.0.1:3001/api/serving", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organizationId: orgId, ...body }),
      }),
    );
    return { status: response.status, data: await response.json() };
  };
  const allPeople = [pid, "second_person"];
  try {
    await db.doc(root).set({
      id: orgId,
      status: "active",
      name: "Igreja fictícia de escalas",
      timezone: "America/Belem",
    });
    for (const [uid, roles, personId] of [
      [admin, ["church_admin"], null],
      [member, ["member"], pid],
      [other, ["member"], null],
    ] as const) {
      await auth.createUser({ uid, email: `${uid}@example.test`, password });
      await seed(`users/${uid}`, {
        organizationId: orgId,
        isActive: true,
        roles,
        personId,
      });
    }
    for (const id of allPeople)
      await seed(`people/${id}`, {
        id,
        organizationId: orgId,
        status: "active",
        firstName: id === pid ? "Pessoa fictícia" : "Substituto fictício",
        memberStatus: "volunteer",
        personType: "adult",
        whatsappPhone: phone,
      });
    await seed(`memberAccountLinks/${member}`, {
      organizationId: orgId,
      userId: member,
      personId: pid,
      verifiedBy: admin,
    });
    await seed(`memberAccountClaims/${pid}`, {
      organizationId: orgId,
      userId: member,
      personId: pid,
    });
    const a = await signInWithFirebaseMobileEmailPassword({
      config,
      email: `${admin}@example.test`,
      password,
    });
    adminToken = await a.user.getIdToken();
    const m = await signInWithFirebaseMobileEmailPassword({
      config,
      email: `${member}@example.test`,
      password,
    });
    memberToken = await m.user.getIdToken();
    eq(
      (await api(serving, { action: "snapshot" }, "invalid")).status,
      401,
      "invalid auth",
    );
    eq(
      (await api(serving, { action: "snapshot" }, memberToken)).status,
      403,
      "member cannot manage all schedules",
    );
    const first = await api(serving, { action: "snapshot" });
    eq(first.status, 200, JSON.stringify(first.data));
    eq(
      first.data.teams.length,
      0,
      "opening an empty church never creates default areas",
    );
    eq(
      (await db.collection(`${root}/serviceTeams`).get()).size,
      0,
      "no silent default writes",
    );
    eq(
      (
        await api(serving, {
          action: "save-area",
          name: "Equipe fictícia",
          summary: "QA",
          roles: [],
          status: "active",
          targetVolunteers: 2,
        })
      ).status,
      400,
      "area requires prior roles",
    );
    const area = await api(serving, {
      action: "save-area",
      name: "Pastoral da acolhida QA",
      summary: "Nome escolhido pela igreja fictícia",
      roles: ["Acolher visitantes", "Organizar entrada"],
      status: "active",
      targetVolunteers: 2,
    });
    eq(area.status, 200, "custom area saved");
    const team = area.data.team;
    eq(
      (
        await api(serving, {
          action: "save-area",
          name: "Pastoral da acolhida QA",
          roles: ["Apoio"],
          status: "active",
          targetVolunteers: 2,
        })
      ).status,
      409,
      "duplicate area rejected",
    );
    const input = {
      action: "create",
      requestId: crypto.randomUUID(),
      teamId: team.id,
      role: team.roles[0],
      serviceName: "Encontro fictício de sábado",
      date: "2030-11-09",
      time: "19:45",
      durationMinutes: 90,
      personIds: [pid],
    };
    eq(
      (await api(serving, { ...input, role: "Função não cadastrada" })).status,
      409,
      "only registered roles",
    );
    const concurrent = await Promise.all([
      api(serving, input),
      api(serving, input),
    ]);
    eq(
      concurrent.map((r) => r.status),
      [200, 200],
      "concurrent idempotent creation",
    );
    eq(
      (await db.collection(`${root}/serviceAssignments`).get()).size,
      1,
      "one assignment after replay",
    );
    const id = concurrent[0].data.assignments[0].id;
    let row = (await db.doc(`${root}/serviceAssignments/${id}`).get()).data()!;
    eq(
      row.serviceDate,
      "2030-11-09T22:45:00.000Z",
      "selected church-local hour persisted",
    );
    eq(
      row.pushStatus,
      "no_device",
      "no false notification sent claim without device",
    );
    eq(
      (
        await api(serving, {
          ...input,
          requestId: crypto.randomUUID(),
          time: "20:00",
        })
      ).status,
      409,
      "overlapping interval rejected atomically",
    );
    eq(
      (
        await api(serving, {
          ...input,
          requestId: crypto.randomUUID(),
          personIds: ["person_from_other_org"],
        })
      ).status,
      409,
      "foreign person rejected",
    );
    eq(
      (
        await api(serving, {
          action: "save-area",
          id: team.id,
          name: "Departamento de boas-vindas QA",
          roles: team.roles,
          summary: "Renomeada",
          status: "active",
          targetVolunteers: 2,
        })
      ).status,
      200,
      "church can rename an area",
    );
    const mine = await api(mobile, { action: "assignments" }, memberToken);
    eq(mine.status, 200, "real mobile Firebase SDK authentication");
    eq(
      mine.data.assignments[0].areaName,
      "Departamento de boas-vindas QA",
      "mobile resolves current area name",
    );
    eq(
      mine.data.assignments[0].serviceName,
      input.serviceName,
      "mobile gets event identity",
    );
    await seed(`users/${member}`, {
      organizationId: orgId,
      isActive: true,
      roles: ["member"],
      personId: pid,
      expoPushToken: "ExpoPushToken[FICTIONAL_ONLY]",
    });
    await db
      .doc(`${root}/serviceAssignments/${id}`)
      .update({ pushStatus: "pending" });
    let pushes = 0;
    const transport: typeof fetch = async (url, options) => {
      eq(
        String(url),
        "https://exp.host/--/api/v2/push/send",
        "fixed Expo destination",
      );
      const payload = JSON.parse(String(options?.body));
      eq(
        payload.data,
        { type: "serving_assignment", organizationId: orgId, assignmentId: id },
        "notification deep link binds organization and assignment",
      );
      pushes++;
      return Response.json({ data: { status: "ok", id: "fictional-ticket" } });
    };
    await Promise.all([
      dispatchServingPush(orgId, id, transport),
      dispatchServingPush(orgId, id, transport),
    ]);
    eq(pushes, 1, "one claimed push attempt under concurrency");
    eq(
      (await db.doc(`${root}/serviceAssignments/${id}`).get()).data()
        ?.pushStatus,
      "accepted",
      "provider acceptance stored separately from phone delivery",
    );
    await dispatchServingPush(orgId, id, transport);
    eq(pushes, 1, "no automatic duplicate push");
    await seed(`whatsappContacts/${digest(phone)}`, {
      organizationId: orgId,
      phone,
      userId: member,
      personId: pid,
      optOut: false,
      lastInboundAt: new Date().toISOString(),
    });
    await seed(`whatsappBindings/${pid}`, {
      organizationId: orgId,
      phone,
      userId: member,
      personId: pid,
    });
    process.env.PUBLIC_APP_ORIGIN = "https://qa.example.test";
    const ctx = {
      orgId,
      slug: orgId,
      name: "Igreja fictícia",
      profile: {},
      state: {},
    };
    const msg = {
      id: "fake-inbound",
      from: phone,
      name: "Pessoa fictícia",
      text: "MINHAS ESCALAS",
      timestamp: Date.now(),
      phoneNumberId: "9990001",
    };
    const menu = await conversationReply(ctx, msg);
    assert.match(menu.text, /Departamento de boas-vindas QA/);
    checks++;
    const choice = await conversationReply(ctx, {
      ...msg,
      text: `ACEITAR ESCALA ${id}`,
    });
    eq(
      (await db.doc(`${root}/serviceAssignments/${id}`).get()).data()?.status,
      "pending",
      "WhatsApp asks confirmation before mutating",
    );
    const confirmation = await conversationReply(
      { ...ctx, state: choice.state },
      { ...msg, text: "CONFIRMAR" },
    );
    assert.match(confirmation.text, /Resposta registrada/);
    checks++;
    eq(
      (await api(mobile, { action: "assignments" }, memberToken)).data
        .assignments[0].status,
      "confirmed",
      "WhatsApp response reaches mobile",
    );
    eq(
      (await db.doc(`${root}/serviceAssignments/${id}`).get()).data()
        ?.responseSource,
      "whatsapp",
      "response source recorded",
    );
    eq(
      (
        await api(
          mobile,
          { action: "respond", assignmentId: id, status: "confirmed" },
          memberToken,
        )
      ).data.replayed,
      true,
      "repeated same response idempotent",
    );
    eq(
      (
        await api(
          mobile,
          { action: "respond", assignmentId: id, status: "declined" },
          memberToken,
        )
      ).status,
      409,
      "cannot overwrite existing response",
    );
    const second = await api(serving, {
        ...input,
        requestId: crypto.randomUUID(),
        date: "2030-11-10",
      }),
      secondId = second.data.assignments[0].id;
    eq(
      (
        await api(
          mobile,
          {
            action: "respond",
            assignmentId: secondId,
            status: "declined",
            note: "Motivo fictício de indisponibilidade",
          },
          memberToken,
        )
      ).status,
      200,
      "mobile can decline with note",
    );
    eq(
      (await api(serving, { action: "snapshot" })).data.assignments.find(
        (a: any) => a.id === secondId,
      ).responseNote,
      "Motivo fictício de indisponibilidade",
      "admin sees mobile reason",
    );
    const prepared = await api(serving, {
      action: "manual-whatsapp",
      assignmentId: id,
      requestId: crypto.randomUUID(),
    });
    eq(
      prepared.status,
      200,
      "manual WhatsApp preparation resolves phone on server",
    );
    assert.match(prepared.data.url, /^https:\/\/wa.me\/5562999990001\?text=/);
    checks++;
    await db.doc(`${root}/people/${pid}`).update({ communicationOptOut: true });
    eq(
      (
        await api(serving, {
          action: "manual-whatsapp",
          assignmentId: id,
          requestId: crypto.randomUUID(),
        })
      ).status,
      409,
      "manual invitation respects opt-out",
    );
    await db
      .doc(`${root}/people/${pid}`)
      .update({ communicationOptOut: false });
    const replace = await api(serving, {
      action: "replace",
      assignmentId: secondId,
      personId: "second_person",
    });
    eq(replace.status, 200, "atomic replacement");
    eq(
      (await db.doc(`${root}/serviceAssignments/${secondId}`).get()).data()
        ?.status,
      "cancelled",
      "original preserved as cancelled",
    );
    eq(
      (
        await db
          .doc(
            `${root}/serviceAssignments/${replace.data.notifyAssignmentIds[0]}`,
          )
          .get()
      ).data()?.status,
      "pending",
      "replacement gets separate response",
    );
    const replacementRow = (
      await db
        .doc(
          `${root}/serviceAssignments/${replace.data.notifyAssignmentIds[0]}`,
        )
        .get()
    ).data();
    eq(
      replacementRow?.responseSource,
      null,
      "replacement does not inherit the previous person's response source",
    );
    eq(
      replacementRow?.pushTicketId,
      null,
      "replacement does not inherit the previous push ticket",
    );
    eq(
      (await api(serving, { action: "notify", assignmentId: id })).status,
      409,
      "accepted push cannot be duplicated by retry",
    );
    eq(
      (
        await api(serving, {
          action: "whatsapp",
          assignmentId: id,
          requestId: crypto.randomUUID(),
        })
      ).status,
      409,
      "local real WhatsApp sends remain blocked",
    );
    const third = await api(serving, {
      ...input,
      requestId: crypto.randomUUID(),
      date: "2030-11-11",
    });
    const thirdId = third.data.assignments[0].id;
    await seed("scheduleSwapRequests/legacy_swap", {
      id: "legacy_swap",
      organizationId: orgId,
      assignmentId: thirdId,
      requestorPersonId: pid,
      proposedReplacementPersonId: "second_person",
      status: "pending",
    });
    eq(
      (await api(serving, { action: "snapshot" })).data.swaps.length,
      1,
      "legacy swap requests remain visible",
    );
    eq(
      (
        await api(serving, {
          action: "swap",
          swapId: "legacy_swap",
          decision: "accepted",
        })
      ).status,
      200,
      "legacy swap approved atomically",
    );
    eq(
      (await db.doc(`${root}/serviceAssignments/${thirdId}`).get()).data()
        ?.status,
      "cancelled",
      "legacy swap preserves original assignment",
    );
    eq(
      (await db.doc(`${root}/scheduleSwapRequests/legacy_swap`).get()).data()
        ?.status,
      "accepted",
      "swap completion persisted",
    );
    await seed("settings/features", {
      modules: { volunteers: { enabled: false } },
    });
    eq(
      (await api(serving, { action: "snapshot" })).status,
      403,
      "paused module enforced on server",
    );
    eq(
      (await api(mobile, { action: "assignments" }, memberToken)).status,
      403,
      "paused module enforced in mobile API",
    );
    console.log(
      JSON.stringify({
        ok: true,
        checks,
        scope:
          "fictional data; real Auth/Firestore emulators, real mobile Firebase SDK, serving/mobile/WhatsApp handlers; Expo transport simulated; no external sends",
      }),
    );
  } finally {
    await signOutFromFirebaseMobile(config).catch(() => {});
    await db.recursiveDelete(db.doc(root));
    await auth.deleteUsers([admin, member, other]);
    await db.terminate();
    console.log("Isolated serving fixtures removed.");
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

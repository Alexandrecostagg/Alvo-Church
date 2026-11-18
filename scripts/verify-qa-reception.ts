import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { receptionOperation } from "../apps/web/app/api/_lib/reception-operations";
import { capturePublicVisitor } from "../apps/web/app/api/_lib/visitor-intake";
import { registerMember } from "../apps/web/app/api/_lib/member-registration";
import { roleHomeOperation } from "../apps/web/app/api/_lib/role-home";
import { pastoralOperation } from "../apps/web/app/api/_lib/pastoral-care";
import { POST } from "../apps/web/app/api/reception/route";
import { NextRequest } from "next/server";
async function main() {
  assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-alvo-qa");
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth(),
    org = "qa_reception_" + randomUUID().slice(0, 8),
    network = org + "_net",
    other = org + "_other",
    root = "organizations/" + org,
    slug = org.replaceAll("_", "-");
  const ids = {
    pastor: org + "_pastor",
    secretary: org + "_secretary",
    leader: org + "_leader",
    member: org + "_member",
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
    const u = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    assert.ok(
      ["127.0.0.1", "localhost"].includes(u.hostname),
      "No external access",
    );
    return realFetch(input, init);
  }) as typeof fetch;
  const set = (path: string, data: any) =>
    db.doc(root + "/" + path).set({ organizationId: org, ...data });
  const read = async (path: string) =>
    (await db.doc(root + "/" + path).get()).data()!;
  const call = (body: any, uid = ids.pastor, organizationId = org) =>
    receptionOperation({ organizationId, ...body }, uid);
  const home = (profile: string, uid = ids.pastor, organizationId = org) =>
    roleHomeOperation(
      { action: "overview", profile, organizationId },
      uid,
    ) as Promise<any>;
  async function mutate(
    id: string,
    action: string,
    extra: any = {},
    uid = ids.pastor,
  ) {
    const r = await read("visitorIntakes/" + id);
    return call(
      { action, intakeId: id, revision: r.revision || 0, ...extra },
      uid,
    );
  }
  try {
    for (const id of [org, network, other]) {
      await db.doc("organizations/" + id).set({
        id,
        organizationId: id,
        name:
          id === org
            ? "Recepção Esperança QA"
            : id === network
              ? "Rede QA"
              : "Instituição QA",
        displayName:
          id === org
            ? "Recepção Esperança QA"
            : id === network
              ? "Rede QA"
              : "Instituição QA",
        slug: id === org ? slug : id.replaceAll("_", "-"),
        status: "active",
        organizationTier: id === network ? "network" : "solo",
        timezone: "America/Belem",
        memberCount: 0,
      });
      await db.doc("organizations/" + id + "/settings/subscription").set({
        plan: id === network ? "rede" : "pastoral",
        billingStatus: "active",
      });
      await db
        .doc("organizations/" + id + "/settings/features")
        .set({ modules: {} });
    }
    await db.doc("org_slugs/" + slug).set({ organizationId: org });
    for (const [role, uid] of Object.entries(ids)) {
      const id = role === "president" ? network : org,
        email = uid + "@example.test";
      await auth.createUser({
        uid,
        email,
        password: "Fictitious-QA-2026!",
        displayName: role + " QA",
      });
      await auth.setCustomUserClaims(uid, { organizationId: id });
      await db.doc("organizations/" + id + "/users/" + uid).set({
        organizationId: id,
        isActive: true,
        email,
        roles: [
          role === "president"
            ? "church_admin"
            : role === "leader"
              ? "group_leader"
              : role,
        ],
        displayName: role + " QA",
      });
    }
    eq(
      (await call({ action: "overview" })).summary,
      { total: 0, pending: 0, greetings: 0, activeJourneys: 0 },
      "Empty overview precise",
    );
    for (const role of ["leader", "member"] as const)
      await deny(
        () => call({ action: "overview" }, ids[role]),
        403,
        role + " cannot read reception PII",
      );
    await deny(
      () => call({ action: "overview" }, ids.pastor, other),
      403,
      "Cross-institution access denied",
    );
    await deny(
      () => call({ action: "pulpit" }, ids.president, org),
      403,
      "Network presidency does not grant local pulpit access",
    );
    const body = {
      action: "capture",
      requestId: randomUUID(),
      name: "Visitante Fictício",
      phone: "11912345678",
      source: "Recepção",
      note: "INTERNAL_PRIVATE_NOTE",
      consentContact: true,
    };
    const first = await call(body, ids.secretary);
    const intakeId = first.intakeId;
    eq(
      (await call(body, ids.secretary)).personId,
      first.personId,
      "Capture idempotent",
    );
    eq(
      (await db.collection(root + "/people").get()).size,
      1,
      "Retry does not duplicate person",
    );
    eq(
      (await db.collection(root + "/followUpTasks").get()).size,
      2,
      "Capture creates welcome and cell tasks",
    );
    eq(
      (await read("visitorJourneys/" + first.journeyId)).status,
      "active",
      "Capture creates active journey",
    );
    await deny(
      () => call({ ...body, name: "Different" }, ids.secretary),
      409,
      "Changed replay rejected",
    );
    let overview = await call({ action: "overview" });
    eq(overview.summary.total, 1, "Exact intake total");
    eq(overview.summary.greetings, 0, "No automatic public greeting");
    const today = overview.today;
    eq(
      (await call({ action: "pulpit" })).items.length,
      0,
      "Pulpit starts empty without approval",
    );
    const prepared = await mutate(intakeId, "prepare-whatsapp", {
      message: "Olá, mensagem de QA.",
    });
    eq(
      prepared.url.startsWith("https://wa.me/55"),
      true,
      "Manual WhatsApp URL only",
    );
    let saved = await read("visitorIntakes/" + intakeId);
    eq(
      saved.status,
      "journey_created",
      "Preparing WhatsApp never advances greeting",
    );
    eq(saved.welcomeContactAt, undefined, "Preparing is not confirmed contact");
    await mutate(intakeId, "contact-complete", { channel: "presential" });
    eq(
      (await read("visitorIntakes/" + intakeId)).welcomeContactChannel,
      "presential",
      "Actual contact recorded independently",
    );
    await mutate(intakeId, "approve-greeting", {
      approved: true,
      day: today,
      text: "Seja bem-vindo!",
    });
    const pulpit = await call({ action: "pulpit" });
    eq(pulpit.items.length, 1, "Approved name appears on correct date");
    eq(
      Object.keys(pulpit.items[0]).sort(),
      ["id", "name", "revision", "text"],
      "Pulpit minimal projection",
    );
    eq(
      JSON.stringify(pulpit).includes("INTERNAL_PRIVATE_NOTE"),
      false,
      "Private notes excluded from pulpit",
    );
    eq(
      JSON.stringify(pulpit).includes("11912345678"),
      false,
      "Phones excluded from pulpit",
    );
    eq(
      (await call({ action: "pulpit", day: "2020-01-01" })).items.length,
      0,
      "Pulpit separated by date",
    );
    await mutate(intakeId, "greet");
    saved = await read("visitorIntakes/" + intakeId);
    eq(saved.status, "journey_created", "Greeting does not archive entry");
    eq(
      (await read("visitorJourneys/" + first.journeyId)).status,
      "active",
      "Greeting preserves journey",
    );
    eq(
      (await call({ action: "pulpit" })).items.length,
      0,
      "Completed greeting removed from queue",
    );
    await deny(
      () =>
        call({
          action: "contact-complete",
          intakeId,
          revision: 0,
          channel: "phone",
        }),
      409,
      "Stale revision rejected",
    );
    const revision = saved.revision;
    const competing = await Promise.allSettled([
      call({ action: "contact-consent", intakeId, revision, allowed: false }),
      call({ action: "contact-consent", intakeId, revision, allowed: true }),
    ]);
    eq(
      competing.filter((r) => r.status === "fulfilled").length,
      1,
      "Only one concurrent update succeeds",
    );
    await mutate(intakeId, "contact-consent", { allowed: false });
    await deny(
      () => mutate(intakeId, "prepare-whatsapp", { message: "QA" }),
      409,
      "No-contact preference enforced",
    );
    await mutate(intakeId, "contact-consent", { allowed: true });
    await db
      .doc(root + "/people/" + first.personId)
      .update({ communicationOptOut: true });
    await deny(
      () => mutate(intakeId, "prepare-whatsapp", { message: "QA" }),
      409,
      "Person opt-out overrides entry consent",
    );
    await db
      .doc(root + "/people/" + first.personId)
      .update({ communicationOptOut: false });
    const care = await mutate(intakeId, "pastoral-care", {
      message: "Pedido fictício autorizado para acompanhamento.",
    });
    eq(
      (await read("prayerRequests/" + care.id)).isPublic,
      false,
      "Care handoff is private",
    );
    eq(
      (await read("prayerRequests/" + care.id)).personId,
      first.personId,
      "Care links same canonical person",
    );
    eq(
      (
        await mutate(intakeId, "pastoral-care", {
          message: "Pedido fictício autorizado para acompanhamento.",
        })
      ).id,
      care.id,
      "Care handoff idempotent",
    );
    await deny(
      () =>
        mutate(
          intakeId,
          "pastoral-care",
          { message: "Outro pedido" },
          ids.secretary,
        ),
      403,
      "Secretary cannot create private pastoral care",
    );
    eq(
      (
        await pastoralOperation(
          { organizationId: org, action: "overview" },
          ids.pastor,
        )
      ).requests.some((r: any) => r.id === care.id),
      true,
      "Pastoral queue receives reception request",
    );
    const pubBody = {
      orgSlug: slug,
      name: "Pessoa Pública QA",
      phone: "11987654321",
      email: "public.qa@example.test",
      birthDate: "1990-04-12",
      neighborhood: "Bairro Fictício",
      consent: false,
      firstVisit: true,
    };
    const pub = await capturePublicVisitor(pubBody, "qa-client");
    eq(
      (await call({ action: "overview" })).summary.pending,
      1,
      "Public capture reaches pending queue",
    );
    const integratedBody = {
      action: "integrate-new",
      intakeId: pub.intakeId,
      requestId: randomUUID(),
    };
    const integrated = await call(integratedBody);
    eq(
      (await call(integratedBody)).personId,
      integrated.personId,
      "Integration retry idempotent",
    );
    const person = await read("people/" + integrated.personId);
    eq(person.email, pubBody.email, "Public email retained");
    eq(person.birthDate, pubBody.birthDate, "Public birth date retained");
    eq(
      person.address.district,
      pubBody.neighborhood,
      "Public neighborhood retained",
    );
    eq(person.communicationOptOut, true, "Public refusal retained");
    eq(
      (await read("visitorIntakes/" + pub.intakeId)).source,
      "public_form",
      "Public origin preserved",
    );
    await set("people/member-existing", {
      firstName: "Membro",
      lastName: "Existente QA",
      status: "active",
      memberStatus: "member",
      whatsappPhone: "11955555555",
    });
    const returning = {
      action: "capture",
      requestId: randomUUID(),
      existingPersonId: "member-existing",
      name: "Membro Existente QA",
      phone: "11955555555",
      source: "Retorno",
      note: "",
      consentContact: false,
    };
    const returned = await call(returning);
    eq(returned.personId, "member-existing", "Existing person reused");
    eq(
      (await read("people/member-existing")).memberStatus,
      "member",
      "Existing membership never downgraded",
    );
    eq(
      (await read("visitorJourneys/" + returned.journeyId)).status,
      "completed",
      "Member return does not open visitor conversion",
    );
    eq(
      (await call(returning)).intakeId,
      returned.intakeId,
      "Existing-person capture idempotent",
    );
    const again = await call({ ...returning, requestId: randomUUID() });
    eq(again.journeyId, returned.journeyId, "Return reuses journey");
    const unlinked = await capturePublicVisitor(
      { ...pubBody, name: "Retorno público", phone: "11955555555" },
      "qa-client-other",
    );
    await mutate(unlinked.intakeId, "integrate-existing", {
      personId: "member-existing",
    });
    eq(
      (await read("visitorIntakes/" + unlinked.intakeId)).personId,
      "member-existing",
      "Public return links existing member",
    );
    await deny(
      () =>
        mutate(intakeId, "approve-greeting", {
          approved: true,
          day: "2026-02-30",
        }),
      400,
      "Invalid greeting date rejected",
    );
    await mutate(intakeId, "approve-greeting", {
      approved: true,
      day: "2020-01-01",
      text: "Passado",
    });
    await deny(
      () => mutate(intakeId, "greet"),
      409,
      "Cannot mark another date as greeted today",
    );
    eq(
      (await call({ action: "history", intakeId })).items.some(
        (e: any) => e.action === "pastoral-care",
      ),
      true,
      "Audit trail records handoff",
    );
    await set("settings/features", {
      modules: { visitors: { enabled: false } },
    });
    await deny(
      () => call({ action: "overview" }),
      403,
      "Module pause blocks reception",
    );
    await deny(
      () => capturePublicVisitor({ ...pubBody, name: "Paused" }, "qa-paused"),
      403,
      "Module pause blocks public bypass",
    );
    await deny(
      () =>
        registerMember(
          {
            organizationId: org,
            requestId: randomUUID(),
            workflow: "reception",
            person: { firstName: "Bypass" },
            reception: { source: "QA" },
          },
          ids.secretary,
        ),
      403,
      "Direct registration cannot bypass reception pause",
    );
    await set("settings/features", { modules: {} });
    await set("settings/features", {
      modules: { journeys: { enabled: false } },
    });
    await deny(
      () => call({ ...body, requestId: randomUUID() }),
      403,
      "Journey pause prevents partial capture",
    );
    await set("settings/features", { modules: {} });
    for (let start = 0; start < 1020; start += 400) {
      const batch = db.batch();
      for (let i = start; i < Math.min(start + 400, 1020); i++)
        batch.set(
          db.doc(root + "/visitorIntakes/bulk_" + String(i).padStart(4, "0")),
          {
            id: "bulk_" + String(i).padStart(4, "0"),
            organizationId: org,
            name: "Visitante de teste " + i,
            greetingDate: today,
            greetingApproved: false,
            status: "captured",
            source: "QA",
            phone: "",
            createdAt: "2026-01-01T10:00:00.000Z",
          },
        );
      await batch.commit();
    }
    overview = await call({ action: "overview" });
    eq(
      overview.summary.total,
      1025,
      "Summary includes every entry beyond display limit",
    );
    eq(overview.summary.pending, 1020, "Pending count exact beyond pagination");
    eq(overview.items.length, 100, "First page bounded");
    eq(
      overview.summary.greetings,
      null,
      "Incomplete greeting count is not presented as exact",
    );
    eq(
      (await call({ action: "pulpit" })).partial,
      true,
      "Pulpit explicitly reports bounded date query",
    );
    eq(overview.partial, true, "Partial list explicit");
    const next = await call({ action: "overview", offset: 100 });
    eq(next.items.length, 100, "Second page available");
    eq(
      next.items.some((r: any) =>
        overview.items.some((v: any) => v.id === r.id),
      ),
      false,
      "Pages do not overlap",
    );
    const pastorHome = await home("pastoral");
    eq(
      pastorHome.metrics.find((m: any) => m.key === "reception-pending").value,
      1020,
      "Pastor dashboard matches exact pending queue",
    );
    eq(
      (await home("cell_leader", ids.leader)).metrics.some(
        (m: any) => m.key === "reception-pending",
      ),
      false,
      "Leader dashboard does not leak institution reception queue",
    );
    for (const id of [org, other]) {
      await db.doc("organizations/" + network + "/affiliates/" + id).set({
        id,
        parentOrganizationId: network,
        childOrganizationId: id,
        childName: id,
        status: "active",
      });
      await db.doc("networkAffiliations/" + id).set({
        affiliateId: id,
        parentOrganizationId: network,
        childOrganizationId: id,
        status: "active",
      });
    }
    let net = await home("network", ids.president, network);
    eq(
      net.churches.find((c: any) => c.id === org)?.receptionPending,
      1020,
      "President receives current aggregate per affiliated church",
    );
    eq(
      JSON.stringify(net).includes("INTERNAL_PRIVATE_NOTE"),
      false,
      "Network sees no private reception note",
    );
    eq(
      JSON.stringify(net).includes("Pessoa Pública QA"),
      false,
      "Network sees no visitor names",
    );
    await db.doc("networkAffiliations/" + org).update({ status: "inactive" });
    eq(
      (await home("network", ids.president, network)).churches.some(
        (c: any) => c.id === org,
      ),
      false,
      "Revoked affiliation immediately excluded",
    );
    await db.doc("networkAffiliations/" + org).update({ status: "active" });
    await db
      .doc("organizations/" + other + "/settings/features")
      .set({ modules: { visitors: { enabled: false } } });
    net = await home("network", ids.president, network);
    eq(
      net.churches.find((c: any) => c.id === other)?.receptionPending,
      null,
      "Unavailable reception shown as unknown not zero",
    );
    const login = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ids.secretary + "@example.test",
          password: "Fictitious-QA-2026!",
          returnSecureToken: true,
        }),
      },
    );
    const { idToken } = await login.json();
    assert.ok(idToken);
    const unauth = await POST(
      new NextRequest("http://localhost/api/reception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org, action: "overview" }),
      }),
    );
    eq(unauth.status, 401, "HTTP requires authentication");
    const response = await POST(
      new NextRequest("http://localhost/api/reception", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + idToken,
        },
        body: JSON.stringify({ organizationId: org, action: "overview" }),
      }),
    );
    eq(response.status, 200, "HTTP staff route works");
    eq(
      response.headers.get("cache-control")?.includes("no-store"),
      true,
      "PII responses never cached",
    );
    const direct =
      "http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/" +
      root +
      "/visitorIntakes/" +
      intakeId;
    eq(
      (await fetch(direct, { headers: { Authorization: "Bearer " + idToken } }))
        .status,
      200,
      "Staff still reads permitted intake data",
    );
    eq(
      (
        await fetch(direct, {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + idToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: { status: { stringValue: "archived" } },
          }),
        })
      ).status,
      403,
      "Direct SDK/REST mutation blocked even for staff",
    );
    const bad = await POST(
      new NextRequest("http://localhost/api/reception", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + idToken,
        },
        body: "not-json",
      }),
    );
    eq(bad.status, 400, "Malformed input rejected");
    await db.doc(root + "/users/" + ids.secretary).update({ isActive: false });
    await deny(
      () => call({ action: "overview" }, ids.secretary),
      403,
      "Revoked staff immediately blocked",
    );
    await db.doc(root + "/users/" + ids.secretary).update({ isActive: true });
    // Keep only a compact synthetic workspace for the optional visual pass.
    if (process.env.RECEPTION_QA_KEEP === "1") {
      for (let start = 0; start < 1020; start += 400) {
        const batch = db.batch();
        for (let i = start; i < Math.min(start + 400, 1020); i++)
          batch.delete(
            db.doc(root + "/visitorIntakes/bulk_" + String(i).padStart(4, "0")),
          );
        await batch.commit();
      }
      await mutate(intakeId, "approve-greeting", {
        approved: true,
        day: today,
        text: "Uma alegria receber você em nossa comunidade.",
      });
      await capturePublicVisitor(
        { ...pubBody, name: "Ana Visitante QA", phone: "11977777777" },
        "qa-visual",
      );
      writeFileSync(
        "/tmp/reception-ui-fixture.json",
        JSON.stringify({
          org,
          network,
          other,
          slug,
          ids,
          password: "Fictitious-QA-2026!",
          intakeId,
        }),
      );
    }
    completed = true;
    console.log(JSON.stringify({ result: "PASS", checks, org, network }));
  } finally {
    global.fetch = realFetch;
    if (process.env.RECEPTION_QA_KEEP !== "1" || !completed) {
      for (const id of [org, network, other]) {
        await db.recursiveDelete(db.doc("organizations/" + id));
        await db.doc("networkAffiliations/" + id).delete();
      }
      await db.doc("org_slugs/" + slug).delete();
      for (const uid of Object.values(ids))
        await auth.deleteUser(uid).catch(() => {});
    }
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

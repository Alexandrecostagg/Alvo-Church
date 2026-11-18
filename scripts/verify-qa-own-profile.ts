import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { NextRequest } from "next/server";
import { ownProfileOperation } from "../apps/web/app/api/_lib/own-profile";
import { givingOperation } from "../apps/web/app/api/_lib/giving-operations";
import { POST } from "../apps/web/app/api/members/profile/route";
async function main() {
  assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-alvo-qa");
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth(),
    org = "qa_profile_" + randomUUID().slice(0, 8),
    root = `organizations/${org}`,
    uid = org + "_member",
    admin = org + "_admin";
  const realFetch = global.fetch;
  global.fetch = (async (input: any, init: any) => {
    const url = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    assert.ok(
      ["localhost", "127.0.0.1"].includes(url.hostname),
      "External network forbidden",
    );
    return realFetch(input, init);
  }) as typeof fetch;
  let checks = 0;
  const check = (a: any, b: any, label: string) => {
    assert.deepEqual(a, b, label);
    checks++;
    console.log("OK " + label);
  };
  const deny = async (
    fn: () => Promise<any>,
    status: number,
    label: string,
  ) => {
    await assert.rejects(fn, (e: any) => e.status === status, label);
    checks++;
    console.log("OK " + label);
  };
  const seed = (p: string, d: any) =>
    db.doc(`${root}/${p}`).set({ organizationId: org, ...d });
  const op = (body: any, actor = uid) =>
    ownProfileOperation({ organizationId: org, ...body }, actor);
  const fields = {
    occupation: "Professora fictícia",
    educationLevel: "technical",
    householdIncomeRange: "five_to_10_minimum_wages",
    ministerialInterests: ["ensino"],
    servingProfile: "teaching",
    availability: ["seg", "sab"],
  };
  try {
    await db
      .doc(root)
      .set({ status: "active", name: "Igreja fictícia do Perfil" });
    await seed("settings/subscription", {
      plan: "enterprise",
      billingStatus: "active",
    });
    for (const userId of [uid, admin]) {
      await auth.createUser({
        uid: userId,
        email: userId + "@example.test",
        password: "Only-QA-2026!",
      });
      await auth.setCustomUserClaims(userId, { organizationId: org });
      await seed("users/" + userId, {
        isActive: true,
        roles: [userId === admin ? "church_admin" : "member"],
        displayName:
          userId === admin ? "Administrador fictício" : "Ana Fictícia",
        personId: "p",
        ...fields,
      });
    }
    await seed("people/p", {
      firstName: "Ana",
      lastName: "Fictícia",
      status: "active",
      memberStatus: "member",
      cpf: "PRIVATE",
      tribePrimaryCode: "levi",
      ministerialInterests: ["louvor"],
    });
    await seed("contributions/account", {
      userId: uid,
      amount: 10,
      type: "oferta",
      date: "2026-11-17",
      status: "pending",
    });
    await seed("contributions/manual", {
      personId: "p",
      userId: "",
      amount: 25,
      type: "dizimo",
      date: "2026-11-16",
      status: "confirmed",
    });
    await seed("contributions/other", {
      userId: "other",
      personId: "other",
      amount: 999,
      type: "oferta",
      date: "2026-11-17",
      status: "confirmed",
    });
    const unlinked = await op({ action: "read" });
    check(
      unlinked.linked,
      false,
      "Self-editable personId alone is not ownership",
    );
    check(unlinked.roles, ["member"], "Member never defaults to admin");
    check(
      unlinked.contributions.map((c: any) => c.id),
      ["account"],
      "Unlinked account sees only its own entries",
    );
    await seed(`memberAccountLinks/${uid}`, {
      userId: uid,
      personId: "p",
      verifiedBy: admin,
    });
    await seed("memberAccountClaims/p", { userId: uid, personId: "p" });
    const linked = await op({ action: "read" });
    check(linked.linked, true, "Verified binding recognized");
    check(
      linked.profile.ministerialInterests,
      ["louvor"],
      "Canonical person profile takes precedence",
    );
    check(
      linked.contributions.map((c: any) => c.id),
      ["account", "manual"],
      "Manual pastoral entry visible to linked member",
    );
    check(
      JSON.stringify(linked).includes("PRIVATE"),
      false,
      "CPF not exposed by own profile",
    );
    await seed("contributions/both", {
      personId: "p",
      userId: uid,
      amount: 4,
      type: "oferta",
      date: "2026-11-15",
      status: "rejected",
    });
    const both = await op({ action: "read" });
    check(
      both.contributions.length,
      3,
      "Overlapping contribution queries deduplicate",
    );
    const giving = await givingOperation(
      { organizationId: org, action: "snapshot", scope: "personal" },
      uid,
    );
    check(
      giving.contributions.map((c: any) => c.id),
      both.contributions.map((c: any) => c.id),
      "Mobile giving and web profile have same personal records",
    );
    const saved = await op({
      action: "save",
      expectedRevision: 0,
      expectedPersonId: "p",
      fields,
    });
    check(saved.revision, 1, "Version incremented");
    check(
      (await db.doc(root + "/people/p").get()).data()?.occupation,
      fields.occupation,
      "App save reaches Pessoas",
    );
    check(
      (await db.doc(root + "/users/" + uid).get()).data()?.ministerialInterests,
      ["ensino"],
      "Web save reaches app account",
    );
    check(
      (await db.doc(root + "/people/p").get()).data()?.tribePrimaryCode,
      "levi",
      "Profile cannot reclassify tribe",
    );
    await deny(
      () =>
        op({
          action: "save",
          expectedRevision: 0,
          expectedPersonId: "p",
          fields,
        }),
      409,
      "Stale save refused",
    );
    await deny(
      () =>
        op({
          action: "save",
          expectedRevision: 1,
          expectedPersonId: null,
          fields,
        }),
      409,
      "Changed binding refused",
    );
    await deny(
      () =>
        op({
          action: "save",
          expectedRevision: 1,
          expectedPersonId: "p",
          fields: { ...fields, roles: ["church_admin"] },
        }),
      400,
      "Mass assignment refused",
    );
    const concurrent = await Promise.allSettled(
      [1, 2].map((i) =>
        op({
          action: "save",
          expectedRevision: 1,
          expectedPersonId: "p",
          fields: { ...fields, occupation: "Fictícia " + i },
        }),
      ),
    );
    check(
      concurrent.filter((r) => r.status === "fulfilled").length,
      1,
      "Concurrent saves cannot overwrite each other",
    );
    check(
      concurrent.filter((r) => r.status === "rejected").length,
      1,
      "Concurrent stale version rejected",
    );
    const audit = (
      await db.collection(root + "/ownProfileAudit").get()
    ).docs.map((d) => d.data());
    check(audit.length, 2, "Audits written atomically");
    check(
      audit.some((a) => "householdIncomeRange" in a),
      false,
      "Audit excludes income answers",
    );
    const adminOwn = await op({ action: "read" }, admin);
    check(adminOwn.linked, false, "Admin receives no implicit ownership");
    check(
      adminOwn.contributions.length,
      0,
      "Admin own-profile cannot view church-wide donations",
    );
    await deny(
      () => op({ action: "read", organizationId: org + "_other" }),
      403,
      "Cross-tenant blocked",
    );
    await seed("memberAccountClaims/p", { userId: "other", personId: "p" });
    check(
      (await op({ action: "read" })).linked,
      false,
      "Revoked ownership hides personal records",
    );
    await seed("memberAccountClaims/p", { userId: uid, personId: "p" });
    await seed("settings/features", {
      modules: { giving: { enabled: false } },
    });
    const paused = await op({ action: "read" });
    check(
      paused.contributions,
      null,
      "Paused giving differs from empty history",
    );
    check(
      Boolean(paused.contributionsNotice),
      true,
      "Unavailable section has explanation",
    );
    check(paused.linked, true, "Other profile data survives paused module");
    await seed("settings/features", { modules: {} });
    const batch = db.batch();
    for (let i = 0; i < 202; i++)
      batch.set(db.doc(`${root}/contributions/more_${i}`), {
        organizationId: org,
        personId: "p",
        amount: 1,
        type: "oferta",
        status: "pending",
        date: "2026-01-01",
      });
    await batch.commit();
    const capped = await op({ action: "read" });
    check(capped.contributions.length, 200, "History capped explicitly");
    check(capped.contributionsTruncated, true, "Partial history flagged");
    const login = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: uid + "@example.test",
          password: "Only-QA-2026!",
          returnSecureToken: true,
        }),
      },
    );
    const { idToken } = await login.json();
    assert.ok(idToken);
    const req = (token: string) =>
      new NextRequest("http://localhost/api/members/profile", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: "Bearer " + token } : {}),
        },
        body: JSON.stringify({ action: "read", organizationId: org }),
      });
    check((await POST(req(""))).status, 401, "Authentication required");
    const res = await POST(req(idToken));
    check(res.status, 200, "Authenticated route works");
    check(
      res.headers.get("cache-control")?.includes("no-store"),
      true,
      "Profile never cached",
    );
    const direct = await fetch(
      `http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${root}/users/${uid}?updateMask.fieldPaths=occupation`,
      {
        method: "PATCH",
        headers: {
          authorization: "Bearer " + idToken,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fields: { occupation: { stringValue: "Bypass" } },
        }),
      },
    );
    check(direct.status, 403, "Direct SDK write cannot bypass synchronization");
    await db.doc(root + "/users/" + uid).update({ isActive: false });
    await deny(() => op({ action: "read" }), 403, "Inactive account blocked");
    await db.doc(root + "/users/" + uid).update({ isActive: true });
    await db.doc(root).update({ status: "inactive" });
    await deny(
      () => op({ action: "read" }),
      403,
      "Inactive institution blocked",
    );
    await db.doc(root).update({ status: "active" });
    console.log(JSON.stringify({ result: "PASS", checks, org }));
    if (process.env.PROFILE_QA_KEEP === "1") {
      const clean = db.batch();
      for (let i = 0; i < 202; i++)
        clean.delete(db.doc(`${root}/contributions/more_${i}`));
      await clean.commit();
      writeFileSync(
        "/tmp/profile-ui-fixture.json",
        JSON.stringify({
          org,
          users: [uid, admin],
          email: uid + "@example.test",
          password: "Only-QA-2026!",
        }),
      );
    }
  } finally {
    global.fetch = realFetch;
    if (process.env.PROFILE_QA_KEEP !== "1") {
      await db.recursiveDelete(db.doc(root));
      for (const id of [uid, admin]) await auth.deleteUser(id).catch(() => {});
    }
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

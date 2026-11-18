import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { givingOperation } from "../apps/web/app/api/_lib/giving-operations";
import {
  declareGiving,
  reconcileContribution,
  createPublicGiving,
  publicGivingConfig,
  voidLedger,
} from "../apps/web/app/api/_lib/finance-operations";
import { roleHomeOperation } from "../apps/web/app/api/_lib/role-home";
import { POST } from "../apps/web/app/api/giving/route";
import { POST as pixPOST } from "../apps/web/app/api/giving/pix/route";
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
    throw Error("QA local only");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth(),
    org = "qa_giving_" + randomUUID().slice(0, 8),
    root = "organizations/" + org,
    slug = org;
  const users = {
    pastor: org + "_p",
    member: org + "_m",
    leader: org + "_l",
    other: org + "_o",
  };
  const realFetch = global.fetch;
  let external = false;
  global.fetch = (async (input: any, init: any) => {
    const u = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    if (!["127.0.0.1", "localhost"].includes(u.hostname)) {
      external = true;
      throw Error("External blocked");
    }
    return realFetch(input, init);
  }) as typeof fetch;
  let checks = 0;
  const check = (a: any, b: any, label: string) => {
    assert.deepEqual(a, b, label);
    checks++;
    console.log("OK " + label);
  };
  const denied = async (
    fn: () => Promise<any>,
    status: number,
    label: string,
  ) => {
    await assert.rejects(fn, (e: any) => e.status === status, label);
    checks++;
    console.log("OK " + label);
  };
  const seed = (path: string, data: any) =>
    db.doc(`${root}/${path}`).set({ organizationId: org, ...data });
  const op = (body: any, uid = users.pastor) =>
    givingOperation({ organizationId: org, ...body }, uid);
  const declare = (body: any, uid = users.member) =>
    declareGiving(
      {
        organizationId: org,
        requestId: randomUUID(),
        amount: 12.35,
        type: "oferta",
        ...body,
      },
      uid,
    );
  const confirm = (id: string, reference: string) =>
    reconcileContribution(
      { organizationId: org, contributionId: id, action: "confirm", reference },
      users.pastor,
    );
  try {
    await db
      .doc(root)
      .set({
        organizationId: org,
        status: "active",
        slug,
        name: "Igreja fictícia Doações QA",
        timezone: "America/Belem",
      });
    await db.doc(`org_slugs/${slug}`).set({ organizationId: org });
    await seed("settings/subscription", { plan: "comunidade" });
    await seed("settings/branding", {
      pixKey: "qa@example.test",
      pixReceiverName: "Igreja Ficticia QA",
    });
    await seed("settings/features", {
      modules: { giving: { enabled: true }, finance: { enabled: true } },
    });
    for (const [role, uid] of Object.entries(users)) {
      await auth.createUser({
        uid,
        email: `${uid}@example.test`,
        password: "Fictitious-QA-2026!",
      });
      await auth.setCustomUserClaims(uid, { organizationId: org });
      await seed("users/" + uid, {
        isActive: true,
        roles: [
          role === "leader"
            ? "group_leader"
            : role === "other"
              ? "member"
              : role,
        ],
        displayName: "Pessoa fictícia " + role,
      });
    }
    const create = {
      action: "create",
      requestId: randomUUID(),
      title: "Campanha fictícia QA",
      description: "Somente teste",
      goalAmount: 4000,
    };
    const { id } = await op(create);
    check((await op(create)).id, id, "Create replay preserves campaign");
    await denied(
      () => op({ ...create, title: "Different" }),
      409,
      "Different replay rejected",
    );
    await denied(
      () => op({ ...create, requestId: randomUUID() }, users.member),
      403,
      "Member cannot create",
    );
    await denied(
      () => op({ ...create, requestId: randomUUID() }, users.leader),
      403,
      "Cell leader cannot manage giving",
    );
    await denied(
      () => op({ ...create, requestId: randomUUID(), goalAmount: -1 }),
      400,
      "Negative goal rejected",
    );
    check(
      (await op({ action: "snapshot" })).publicPath,
      `/p/${slug}/give`,
      "Verified public path",
    );
    check(
      (await op({ action: "snapshot" }, users.member)).manager,
      false,
      "Member snapshot private",
    );
    const declaration = { requestId: randomUUID(), campaignId: id };
    const d = await declare(declaration);
    check(
      d.contribution.campaignId,
      id,
      "Mobile declaration linked to campaign",
    );
    check(d.contribution.type, "campanha", "Campaign type canonical");
    check(
      (await declare(declaration)).contributionId,
      d.contributionId,
      "Declaration retry idempotent",
    );
    await denied(
      () => declare({ ...declaration, campaignId: "missing" }),
      409,
      "Cannot change campaign on retry",
    );
    let overview = await op({ action: "snapshot" });
    check(overview.pendingCount, 1, "Pending count includes app");
    check(overview.campaigns[0].raisedAmount, 0, "Pending money never raised");
    const mine = await op({ action: "snapshot" }, users.member);
    check(mine.contributions.length, 1, "Own history visible");
    check(mine.intents.length, 0, "No donor data for member");
    check(
      "fingerprint" in mine.contributions[0],
      false,
      "No private reconciliation internals",
    );
    check(
      (await op({ action: "snapshot" }, users.other)).contributions.length,
      0,
      "No other member history",
    );
    check(
      (await op({ action: "snapshot" }, users.leader)).contributions.length,
      0,
      "No cell donor history",
    );
    await confirm(d.contributionId, "QA-PIX-1");
    check(
      (await confirm(d.contributionId, "QA-PIX-1")).replayed,
      true,
      "Confirmation retry idempotent",
    );
    overview = await op({ action: "snapshot" });
    check(
      overview.campaigns[0].raisedAmount,
      12.35,
      "Only confirmed amount counted once",
    );
    check(
      (await op({ action: "snapshot" }, users.member)).contributions[0].status,
      "confirmed",
      "Member sees confirmed status",
    );
    const d2 = await declare({ campaignId: id });
    await denied(
      () => confirm(d2.contributionId, "qa-pix-1"),
      409,
      "Duplicate bank reference denied",
    );
    await reconcileContribution(
      {
        organizationId: org,
        action: "reject",
        contributionId: d2.contributionId,
        reference: "Não localizado no teste",
      },
      users.pastor,
    );
    check(
      (await op({ action: "snapshot" })).campaigns[0].raisedAmount,
      12.35,
      "Rejected does not increase raised",
    );
    const token = randomUUID() + randomUUID();
    const pub = await createPublicGiving(
      {
        orgSlug: slug,
        amount: 10,
        name: "Visitante fictício",
        whatsapp: "11900000000",
        consentContact: false,
        token,
        campaignId: id,
      },
      "qa",
    );
    await denied(()=>op({action:'contact',intentId:pub.intentId}),403,'Contact without permission denied');
    await seed('givingIntents/contact',{name:'Contato fictício',whatsapp:'11900000000',consentContact:true});
    const contact=await op({action:'contact',intentId:'contact'});
    check(contact.url.startsWith('https://wa.me/5511900000000?text='),true,'WhatsApp normalizes Brazil number and prepares message');
    await seed('whatsappContacts/'+createHash('sha256').update('5511900000000').digest('hex'),{optOut:true});
    await denied(()=>op({action:'contact',intentId:'contact'}),409,'Current opt-out blocks contact');
    await denied(()=>op({action:'contact',intentId:'contact'},users.member),403,'Member cannot contact other donors');
    const publicDecl = await declareGiving({
      organizationId: org,
      intentId: pub.intentId,
      token,
    });
    await confirm(publicDecl.contributionId, "QA-PIX-2");
    check(
      (await op({ action: "snapshot" })).campaigns[0].raisedAmount,
      22.35,
      "Public and app converge",
    );
    const c = (await op({ action: "snapshot" })).campaigns[0];
    await denied(
      () =>
        op({
          action: "status",
          campaignId: id,
          status: "closed",
          expectedUpdatedAt: "stale",
        }),
      409,
      "Stale changes rejected",
    );
    await op({
      action: "status",
      campaignId: id,
      status: "closed",
      expectedUpdatedAt: c.updatedAt,
      raisedAmount: 999999,
    });
    check(
      (await op({ action: "snapshot" })).campaigns[0].raisedAmount,
      22.35,
      "Closing cannot overwrite reconciled total",
    );
    check(
      (await op({ action: "snapshot" }, users.member)).campaigns.length,
      0,
      "Closed campaign not offered",
    );
    await denied(
      () => declare({ campaignId: id }),
      422,
      "Closed mobile campaign rejected",
    );
    await denied(
      () => publicGivingConfig({ orgSlug: slug, campaignId: id }),
      404,
      "Closed public campaign rejected",
    );
    await denied(
      () => op({ action: "delete", campaignId: id }),
      400,
      "History cannot be deleted",
    );
    await denied(
      () =>
        voidLedger(
          {
            organizationId: org,
            transactionId: "contribution_" + d.contributionId,
            reason: "Teste",
          },
          users.pastor,
        ),
      409,
      "Generic void cannot desynchronize campaign",
    );
    // Dashboard uses real pending declarations, never intents as income.
    await declare({ amount: 1 });
    const home = await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "pastoral" },
      users.pastor,
    );
    check(
      home.metrics.find((m: any) => m.key === "giving-pending")?.value,
      1,
      "Pastor sees pending attention",
    );
    check(
      home.actions.some((a: any) => a.key === "giving"),
      true,
      "Pastor has giving route",
    );
    const memberHome = await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "member" },
      users.member,
    );
    check(
      memberHome.metrics.some((m: any) => m.key === "giving-pending"),
      false,
      "Member dashboard no church financial count",
    );
    check(
      memberHome.actions.some((a: any) => a.key === "giving"),
      true,
      "Member dashboard own giving route",
    );
    await denied(
      () => op({ action: "snapshot", organizationId: org + "_other" }),
      403,
      "Cross tenant denied",
    );
    const unauth = await POST(
      new NextRequest("http://127.0.0.1/api/giving", {
        method: "POST",
        body: JSON.stringify({ organizationId: org, action: "snapshot" }),
      }),
    );
    check(unauth.status, 401, "API authentication required");
    const login = await realFetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: `${users.member}@example.test`,
          password: "Fictitious-QA-2026!",
          returnSecureToken: true,
        }),
      },
    );
    const { idToken } = await login.json();
    const response = await POST(
      new NextRequest("http://127.0.0.1/api/giving", {
        method: "POST",
        headers: { authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ organizationId: org, action: "snapshot" }),
      }),
    );
    check(response.status, 200, "Authenticated API snapshot");
    check(
      response.headers.get("cache-control")?.includes("no-store"),
      true,
      "Private response never cached",
    );
    const pix = await pixPOST(
      new NextRequest("http://127.0.0.1/api/giving/pix", {
        method: "POST",
        headers: { authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          organizationId: org,
          amount: 1,
          campaignId: id,
        }),
      }),
    );
    check(pix.status, 422, "PIX endpoint rejects closed campaign");
    const direct = await realFetch(
      `http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${root}/givingCampaigns/${id}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${idToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fields: { raisedAmount: { integerValue: "999" } },
        }),
      },
    );
    check(direct.status, 403, "Direct SDK cannot tamper with campaign");
    const pastorLogin=await realFetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:`${users.pastor}@example.test`,password:'Fictitious-QA-2026!',returnSecureToken:true})});
    const pastorToken=(await pastorLogin.json()).idToken;
    const directStatus=await realFetch(`http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${root}/givingCampaigns/${id}?updateMask.fieldPaths=status`,{method:'PATCH',headers:{authorization:`Bearer ${pastorToken}`,'content-type':'application/json'},body:JSON.stringify({fields:{status:{stringValue:'active'}}})});
    check(directStatus.status,403,'Staff SDK cannot bypass audited lifecycle');

    await seed("settings/features", {
      modules: { giving: { enabled: false } },
    });
    await denied(
      () => op({ action: "snapshot" }),
      403,
      "Paused module enforced",
    );
    await denied(() => declare({}), 403, "Paused module rejects declaration");
    await seed("settings/features", { modules: { giving: { enabled: true } } });
    await seed("settings/subscription", { plan: "free" });
    await denied(
      () => op({ action: "snapshot" }),
      403,
      "Plan entitlement enforced",
    );
    await denied(
      () => publicGivingConfig({ orgSlug: slug }),
      403,
      "Public entry respects plan",
    );
    check(external, false, "No external service or real payment");
    console.log(`PASS ${checks} giving checks`);
  } finally {
    global.fetch = realFetch;
    await db.recursiveDelete(db.doc(root));
    await db.doc(`org_slugs/${slug}`).delete();
    for (const uid of Object.values(users))
      await auth.deleteUser(uid).catch(() => {});
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

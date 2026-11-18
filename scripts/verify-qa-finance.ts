import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { NextRequest } from "next/server";
import { financeOverview } from "../apps/web/app/api/_lib/finance-overview";
import { monthlyFinance } from "../apps/web/app/api/_lib/finance-report";
import {
  manualLedger,
  voidLedger,
  declareGiving,
  reconcileContribution,
} from "../apps/web/app/api/_lib/finance-operations";
import { ownProfileOperation } from "../apps/web/app/api/_lib/own-profile";
import { givingOperation } from "../apps/web/app/api/_lib/giving-operations";
import { roleHomeOperation } from "../apps/web/app/api/_lib/role-home";
import { POST } from "../apps/web/app/api/finance/route";
async function main() {
  assert.equal(process.env.FIREBASE_PROJECT_ID, "demo-alvo-qa");
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth(),
    org = "qa_finance_" + randomUUID().slice(0, 8),
    root = "organizations/" + org;
  const ids = {
    pastor: org + "_p",
    member: org + "_m",
    group_leader: org + "_l",
  };
  const realFetch = global.fetch;
  global.fetch = (async (input: any, init: any) => {
    const u = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    assert.ok(
      ["localhost", "127.0.0.1"].includes(u.hostname),
      "External network forbidden",
    );
    return realFetch(input, init);
  }) as typeof fetch;
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
    await assert.rejects(fn, (e: any) => e.status === status, label);
    checks++;
    console.log("OK " + label);
  };
  const seed = (path: string, d: any) =>
    db.doc(root + "/" + path).set({ organizationId: org, ...d });
  const over = (month = "2026-11", extra: any = {}, uid = ids.pastor) =>
    financeOverview(
      { organizationId: org, month, action: "overview", ...extra },
      uid,
    );
  const manual = (
    id: string,
    amount: number,
    kind = "income",
    date = "2026-11-05",
  ) =>
    manualLedger(
      {
        organizationId: org,
        requestId: id,
        label: "Movimentação fictícia " + id,
        amount,
        kind,
        date,
      },
      ids.pastor,
    );
  const reconcile = (
    id: string,
    reference: string,
    action = "confirm",
    uid = ids.pastor,
  ) =>
    reconcileContribution(
      { organizationId: org, contributionId: id, reference, action },
      uid,
    );
  try {
    await db
      .doc(root)
      .set({
        organizationId: org,
        status: "active",
        name: "Igreja fictícia Finanças",
        slug: org,
        timezone: "America/Belem",
      });
    await db.doc("org_slugs/" + org).set({ organizationId: org });
    await seed("settings/subscription", { plan: "comunidade" });
    await seed("settings/features", {
      modules: { finance: { enabled: true }, giving: { enabled: true } },
    });
    await seed("settings/branding", { pixKey: "qa@example.test" });
    for (const [role, uid] of Object.entries(ids)) {
      await auth.createUser({
        uid,
        email: uid + "@example.test",
        password: "Fictitious-QA-2026!",
      });
      await auth.setCustomUserClaims(uid, { organizationId: org });
      await seed("users/" + uid, {
        isActive: true,
        roles: [role],
        displayName: "Pessoa fictícia " + role,
      });
    }
    await seed("people/person", {
      firstName: "Ana",
      lastName: "Fictícia",
      status: "active",
      pastoralStatus: "member",
    });
    await db.doc(root + "/users/" + ids.member).update({ personId: "person" });
    await seed("memberAccountLinks/" + ids.member, {
      userId: ids.member,
      personId: "person",
      verifiedBy: ids.pastor,
    });
    await seed("memberAccountClaims/person", {
      userId: ids.member,
      personId: "person",
    });
    await seed("givingCampaigns/campaign", {
      title: "Campanha fictícia",
      status: "active",
      goalAmount: 1000,
      raisedAmount: 0,
    });
    await manual("income", 100);
    await manual("expense", 30, "expense");
    await manual("missions", 20, "missions");
    await manual("prior", 7, "income", "2026-10-15");
    await manual("cent1", 0.1);
    await manual("cent2", 0.2);
    await manual("voided", 200);
    await voidLedger(
      {
        organizationId: org,
        transactionId: "voided",
        reason: "Teste de anulação",
      },
      ids.pastor,
    );
    await seed("contributions/unknown", {
      amount: 999,
      type: "oferta",
      date: "2026-11-03",
    });
    await seed("contributions/rejected", {
      amount: 999,
      type: "oferta",
      date: "2026-11-03",
      status: "rejected",
    });
    await seed("contributions/legacy", {
      amount: 5,
      type: "missao",
      date: "2026-11-03",
      status: "confirmed",
      contributorName: "Legado confirmado",
    });
    await seed("financialTransactions/foreign", {
      organizationId: "other",
      amount: 999,
      kind: "income",
      date: "2026-11-03",
      status: "posted",
    });
    const overview: any = await over();
    eq(
      overview.report.incomeCents,
      12530,
      "Income includes missions once and exact cents",
    );
    eq(overview.report.expenseCents, 3000, "Expense from selected month");
    eq(
      overview.report.balanceCents,
      9530,
      "Monthly balance excludes old month, voided and unconfirmed",
    );
    eq(
      overview.report.missionsCents,
      2500,
      "Legacy confirmed missions retain category",
    );
    eq(
      overview.report.unconfirmedLegacyCount,
      1,
      "Unknown contributions explicitly excluded",
    );
    eq(overview.report.voidedCount, 1, "Voided count preserved");
    eq(
      ((await over("2026-10")) as any).report.incomeCents,
      700,
      "Month selector changes data",
    );
    const report = await monthlyFinance(org, "2026-11", ids.pastor);
    eq(
      report.entries,
      overview.report.entries,
      "CSV and overview use identical entries",
    );
    eq(
      report.balanceCents,
      overview.report.balanceCents,
      "CSV and panel totals match",
    );
    const evo: any = await over("2026-11", { action: "evolution" });
    eq(
      evo.series.map((v: any) => v.month),
      ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"],
      "Evolution includes six consecutive months including zero months",
    );
    eq(evo.series[5].balanceCents, 9530, "Evolution matches monthly report");
    const declared = await declareGiving(
      {
        organizationId: org,
        requestId: "mobile",
        amount: 12.35,
        type: "campanha",
        campaignId: "campaign",
      },
      ids.member,
    );
    eq(
      (
        await db.doc(root + "/contributions/" + declared.contributionId).get()
      ).data()?.personId,
      "person",
      "Mobile declaration uses verified person claim",
    );
    await reconcile(declared.contributionId, "QA-BANK-1");
    await reconcile(declared.contributionId, "QA-BANK-1");
    eq(
      (
        await db
          .collection(root + "/financialTransactions")
          .where("contributionId", "==", declared.contributionId)
          .get()
      ).size,
      1,
      "Repeated confirmation creates one ledger entry",
    );
    eq(
      (await db.doc(root + "/givingCampaigns/campaign").get()).data()
        ?.raisedAmount,
      12.35,
      "Campaign total updated once",
    );
    const own = await ownProfileOperation(
      { organizationId: org, action: "read" },
      ids.member,
    );
    eq(
      own.contributions.find((c: any) => c.id === declared.contributionId)
        ?.status,
      "confirmed",
      "Profile sees financial confirmation",
    );
    const mobile = await givingOperation(
      { organizationId: org, action: "snapshot", scope: "personal" },
      ids.member,
    );
    eq(
      mobile.contributions.find((c: any) => c.id === declared.contributionId)
        ?.status,
      "confirmed",
      "Mobile giving sees same confirmation",
    );
    await seed("contributions/duplicate_ref", {
      amount: 12.35,
      status: "pending",
      date: "2026-11-04",
    });
    await deny(
      () => reconcile("duplicate_ref", "qa-bank-1"),
      409,
      "Bank reference cannot be reused",
    );
    await deny(
      () =>
        voidLedger(
          {
            organizationId: org,
            transactionId: "contribution_" + declared.contributionId,
            reason: "Teste",
          },
          ids.pastor,
        ),
      409,
      "Manual void cannot detach reconciled contribution",
    );
    await seed("contributions/collision", {
      amount: 5,
      status: "pending",
      date: "2026-11-04",
    });
    await seed("financialTransactions/contribution_collision", {
      amount: 8,
      kind: "income",
      date: "2026-10-02",
      status: "posted",
      label: "Preservar",
    });
    await deny(
      () => reconcile("collision", "QA-COLLISION"),
      409,
      "Confirmation cannot overwrite existing ledger ID",
    );
    eq(
      (
        await db
          .doc(root + "/financialTransactions/contribution_collision")
          .get()
      ).data()?.amount,
      8,
      "Existing ledger remains intact",
    );
    await reconcile("collision", "Motivo fictício", "reject");
    await reconcile("duplicate_ref", "Não localizado", "reject");
    await manual("income", 100);
    eq(
      (
        await db
          .collection(root + "/financeAudit")
          .where("transactionId", "==", "income")
          .get()
      ).size,
      1,
      "Manual retry is idempotent",
    );
    await deny(() => manual("income", 101), 409, "Changed replay rejected");
    await deny(
      () => manual("bad", 1, "income", "2026-02-30"),
      400,
      "Impossible dates rejected",
    );
    for (const uid of [ids.member, ids.group_leader]) {
      await deny(
        () => over("2026-11", {}, uid),
        403,
        "Member and cell leader cannot read finances",
      );
      await deny(
        () =>
          manualLedger(
            {
              organizationId: org,
              requestId: "forbidden",
              amount: 1,
              kind: "income",
              label: "Teste",
            },
            uid,
          ),
        403,
        "Member and cell leader cannot write ledger",
      );
      await deny(
        () => reconcile("unknown", "FORBIDDEN", "confirm", uid),
        403,
        "Member and cell leader cannot reconcile",
      );
    }
    await deny(
      () =>
        financeOverview(
          {
            organizationId: org + "_other",
            month: "2026-11",
            action: "overview",
          },
          ids.pastor,
        ),
      403,
      "Cross organization denied",
    );
    await db.doc(root + "/memberAccountClaims/person").delete();
    const unlinked = await declareGiving(
      { organizationId: org, requestId: "revoked", amount: 1, type: "oferta" },
      ids.member,
    );
    eq(
      (
        await db.doc(root + "/contributions/" + unlinked.contributionId).get()
      ).data()?.personId,
      "",
      "Revoked person claim not attached to new donation",
    );
    await db.doc(root + "/contributions/" + unlinked.contributionId).delete();
    await seed("memberAccountClaims/person", {
      userId: ids.member,
      personId: "person",
    });
    const batch = db.batch();
    for (let i = 0; i < 205; i++)
      batch.set(
        db.doc(root + "/contributions/pending_" + String(i).padStart(3, "0")),
        {
          organizationId: org,
          status: "pending",
          amount: 1,
          type: "oferta",
          date: "2025-01-01",
          contributorName: "Pessoa fictícia " + i,
        },
      );
    await batch.commit();
    let page: any = await over();
    const seen = new Set(page.pending.map((p: any) => p.id));
    eq(page.pendingCount, 205, "Pending count spans all months");
    eq(page.pending.length, 100, "Pending queue bounded page");
    while (page.nextPendingCursor) {
      page = await over("2026-11", { pendingAfter: page.nextPendingCursor });
      for (const p of page.pending) seen.add(p.id);
    }
    eq(seen.size, 205, "All old pending declarations reachable by pagination");
    await seed("settings/features", {
      modules: { finance: { enabled: true }, giving: { enabled: false } },
    });
    const paused: any = await over();
    eq(
      paused.pendingCount,
      205,
      "Finance reconciliation remains available with Giving paused",
    );
    eq(
      paused.publicPath,
      null,
      "Public donation shortcut hidden when Giving paused",
    );
    const home = await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "pastoral" },
      ids.pastor,
    );
    eq(
      home.metrics.find((m: any) => m.key === "giving-pending")?.href,
      "/finance",
      "Pastoral dashboard opens actual reconciliation queue",
    );
    eq(
      home.metrics.find((m: any) => m.key === "giving-pending")?.value,
      205,
      "Pastoral dashboard sees pending even with Giving paused",
    );
    await seed("settings/features", {
      modules: { finance: { enabled: true }, giving: { enabled: true } },
    });
    eq(
      ((await over()) as any).publicPath,
      "/p/" + org + "/give",
      "Public link requires active config and ownership",
    );
    await db.doc("org_slugs/" + org).update({ organizationId: "other" });
    eq(((await over()) as any).publicPath, null, "Foreign slug not exposed");
    await db.doc("org_slugs/" + org).update({ organizationId: org });
    const anon = await POST(
      new NextRequest("http://localhost/api/finance", {
        method: "POST",
        body: JSON.stringify({
          action: "overview",
          organizationId: org,
          month: "2026-11",
        }),
      }),
    );
    eq(anon.status, 401, "HTTP requires authentication");
    eq(
      anon.headers.get("cache-control")?.includes("no-store"),
      true,
      "Private response not cached",
    );
    await seed("financialTransactions/formula", {
      amount: 1,
      kind: "income",
      date: "2026-09-01",
      label: "=HYPERLINK(test)",
      status: "posted",
    });
    eq(
      (await monthlyFinance(org, "2026-09", ids.pastor)).csv.includes(
        '"\'=HYPERLINK(test)"',
      ),
      true,
      "CSV neutralizes formula labels",
    );
    for (let i = 0; i < 1001; i += 400) {
      const b = db.batch();
      for (let j = i; j < Math.min(i + 400, 1001); j++)
        b.set(db.doc(root + "/financialTransactions/cap_" + j), {
          organizationId: org,
          kind: "income",
          amount: 1,
          date: "2026-08-01",
          status: "posted",
          label: "Limite",
        });
      await b.commit();
    }
    await deny(
      () => monthlyFinance(org, "2026-08", ids.pastor),
      422,
      "Overflow prevents incomplete CSV",
    );
    await deny(
      () => over("2026-08"),
      422,
      "Overflow prevents incomplete panel totals",
    );
    const cap = await db
      .collection(root + "/financialTransactions")
      .where("date", "==", "2026-08-01")
      .get();
    for (let i = 0; i < cap.size; i += 400) {
      const b = db.batch();
      cap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
    await db.doc(root + "/users/" + ids.pastor).update({ isActive: false });
    await deny(() => over(), 403, "Inactive account denied");
    await db.doc(root + "/users/" + ids.pastor).update({ isActive: true });
    await seed("settings/features", {
      modules: { finance: { enabled: false }, giving: { enabled: true } },
    });
    await deny(() => over(), 403, "Paused finance denied");
    await seed("settings/features", {
      modules: { finance: { enabled: true }, giving: { enabled: true } },
    });
    completed = true;
    console.log(JSON.stringify({ result: "PASS", checks, org }));
    if (process.env.FINANCE_QA_KEEP === "1")
      writeFileSync(
        "/tmp/finance-ui-fixture.json",
        JSON.stringify({
          org,
          users: Object.values(ids),
          email: ids.pastor + "@example.test",
          password: "Fictitious-QA-2026!",
        }),
      );
  } finally {
    global.fetch = realFetch;
    if (process.env.FINANCE_QA_KEEP !== "1" || !completed) {
      await db.recursiveDelete(db.doc(root));
      await db.doc("org_slugs/" + org).delete();
      for (const uid of Object.values(ids))
        await auth.deleteUser(uid).catch(() => {});
    }
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

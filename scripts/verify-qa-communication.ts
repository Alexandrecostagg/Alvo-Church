import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import {
  prepareManualWhatsapp,
  completeManualWhatsapp,
  manualCommunicationData,
  prepareManualContact,
} from "../apps/web/app/api/_lib/communication-operations";
import { roleHomeOperation } from "../apps/web/app/api/_lib/role-home";
import { whatsappSettings } from "../apps/web/app/api/_lib/whatsapp-config";
import { POST } from "../apps/web/app/api/communication/send-whatsapp/route";
import { NextRequest } from "next/server";
const req = createRequire(import.meta.url),
  { initializeApp } = req("firebase-admin/app"),
  { getFirestore } = req("firebase-admin/firestore");
async function main() {
  if (
    process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
  )
    throw Error("QA local only");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    org = "qa_communication_" + randomUUID().slice(0, 8),
    root = "organizations/" + org;
  const originalFetch = global.fetch;
  let external = false,
    checks = 0;
  global.fetch = (async (input: any, init: any) => {
    const url = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
      external = true;
      throw Error("External blocked");
    }
    return originalFetch(input, init);
  }) as typeof fetch;
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
    db.doc(root + "/" + path).set({ organizationId: org, ...data });
  const data = (body: any, uid = "pastor") =>
    manualCommunicationData({ organizationId: org, ...body }, uid);
  const prep = (body: any, uid = "pastor") =>
    prepareManualWhatsapp({ organizationId: org, ...body }, uid);
  const done = (campaignId: string, confirmedRecipientIds: string[]) =>
    completeManualWhatsapp(
      { organizationId: org, campaignId, confirmedRecipientIds },
      "pastor",
    );
  try {
    await db
      .doc(root)
      .set({
        organizationId: org,
        status: "active",
        name: "Comunicação fictícia QA",
        timezone: "America/Belem",
      });
    await seed("settings/subscription", { plan: "pastoral" });
    for (const [id, role] of [
      ["pastor", "pastor"],
      ["leader", "group_leader"],
      ["member", "member"],
    ])
      await seed("users/" + id, { isActive: true, roles: [role] });
    for (const [id, phone] of [
      ["p1", "5591999990001"],
      ["p2", "5591999990002"],
      ["dup", "5591999990001"],
      ["skip", "5591999990003"],
    ])
      await seed("people/" + id, {
        status: "active",
        firstName: "Pessoa " + id,
        whatsappPhone: phone,
        communicationOptOut: id === "skip",
      });
    const input = {
      requestId: randomUUID(),
      message: "Olá, {{nome}}! Encontro fictício.",
      recipientIds: ["p1", "p2", "dup", "skip"],
    };
    await denied(() => prep(input, "member"), 403, "Member cannot prepare");
    await denied(
      () => data({ action: "people" }, "leader"),
      403,
      "Cell leader cannot read church-wide contact list",
    );
    await denied(() => prep(input, "outsider"), 403, "Foreign user denied");
    const campaign = await prep(input);
    check(
      campaign.recipients.map((r) => r.personId),
      ["p1", "p2"],
      "Phone deduplication and opt-out",
    );
    check(campaign.skipped.length, 2, "Skipped reasons returned");
    check(
      (await db.doc(root + "/communicationLog/" + input.requestId).get()).data()
        .sentCount,
      0,
      "Preparation never claims sent",
    );
    check((await prep(input)).replayed, true, "Retry keeps same campaign");
    await denied(
      () => prep({ ...input, message: "changed" }),
      409,
      "Stored text immutable",
    );
    await seed("people/skip", {
      status: "active",
      firstName: "Released",
      whatsappPhone: "5591999990003",
    });
    check(
      (await prep(input)).recipients.map((r) => r.personId),
      ["p1", "p2"],
      "Retry cannot add newly eligible recipient",
    );
    const link: any = await data({
      action: "campaign-contact",
      campaignId: input.requestId,
      personId: "p1",
      message: "TAMPERED",
    });
    check(
      link.message,
      "Olá, Pessoa p1! Encontro fictício.",
      "Personalization uses persisted text and current name",
    );
    check(
      new URL(link.url).searchParams.get("text"),
      link.message,
      "URL encoding preserves personalized text",
    );
    await denied(
      () =>
        data({
          action: "campaign-contact",
          campaignId: input.requestId,
          personId: "skip",
        }),
      403,
      "Contact restricted to prepared list",
    );
    await seed(
      "whatsappContacts/" +
        createHash("sha256").update("5591999990002").digest("hex"),
      { optOut: true },
    );
    await denied(
      () =>
        data({
          action: "campaign-contact",
          campaignId: input.requestId,
          personId: "p2",
        }),
      409,
      "Late opt-out blocks contact",
    );
    await db
      .doc(
        root +
          "/whatsappContacts/" +
          createHash("sha256").update("5591999990002").digest("hex"),
      )
      .delete();
    await db
      .doc(root + "/people/p2")
      .update({ whatsappPhone: "5591999990004" });
    await denied(
      () =>
        prepareManualContact(
          {
            organizationId: org,
            requestId: randomUUID(),
            personId: "p2",
            phone: "5591999990002",
            message: "QA",
          },
          "pastor",
        ),
      409,
      "Stale direct phone rejected",
    );
    check(
      new URL(
        (
          (await data({
            action: "campaign-contact",
            campaignId: input.requestId,
            personId: "p2",
          })) as any
        ).url,
      ).pathname,
      "/5591999990004",
      "Campaign uses current phone",
    );
    check(
      (await done(input.requestId, ["p1"])).status,
      "partially_confirmed",
      "Partial progress saved",
    );
    const resumed: any = await data({
      action: "resume",
      campaignId: input.requestId,
    });
    check(
      resumed.confirmedRecipientIds,
      ["p1"],
      "Resume restores confirmations",
    );
    check(resumed.message, input.message, "Resume restores original text");
    await denied(
      () =>
        data({
          action: "campaign-contact",
          campaignId: input.requestId,
          personId: "p1",
        }),
      409,
      "Already registered recipient not reopened",
    );
    await denied(
      () => done(input.requestId, ["skip"]),
      409,
      "Cannot confirm outsider",
    );
    check(
      (await done(input.requestId, ["p2"])).sentCount,
      2,
      "Partial completion accumulates previous confirmations",
    );
    check(
      (await done(input.requestId, ["p1"])).replayed,
      true,
      "Repeated confirmation is idempotent",
    );
    const stored = (
      await db.doc(root + "/communicationCampaigns/" + input.requestId).get()
    ).data();
    check(stored.status, "confirmed", "All confirmed completes list");
    check(stored.openedCount, 0, "Does not fabricate opening telemetry");
    const pending = await prep({
      ...input,
      requestId: randomUUID(),
      recipientIds: ["p1", "p2"],
    });
    await done(pending.campaignId, ["p1"]);
    await prep({ ...input, requestId: randomUUID(), recipientIds: ["p1"] });
    await seed("whatsappHandoffs/example", { status: "open" });
    const home: any = await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "pastoral" },
      "pastor",
    );
    check(
      home.metrics.find((m: any) => m.key === "communication-pending")?.value,
      2,
      "Pastor dashboard counts prepared and partial lists",
    );
    check(
      home.metrics.find((m: any) => m.key === "communication-handoffs")?.value,
      1,
      "Pastor sees human handoff count",
    );
    check(
      home.actions.some((a: any) => a.href === "/communication"),
      true,
      "Pastor dashboard opens Communication",
    );
    const member: any = await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "member" },
      "member",
    );
    check(
      member.metrics.some((m: any) => m.key.startsWith("communication")),
      false,
      "Member sees no private communication metrics",
    );
    const leader: any = await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "cell_leader" },
      "leader",
    );
    check(
      leader.actions.some((a: any) => a.href === "/communication"),
      false,
      "Cell leader sees no church-wide communication action",
    );
    const batch = db.batch();
    for (let i = 0; i < 205; i++)
      batch.set(db.doc(root + "/people/page_" + String(i).padStart(3, "0")), {
        organizationId: org,
        status: "active",
        firstName: "Fictícia " + i,
        whatsappPhone: "55919" + String(i).padStart(7, "0"),
      });
    await batch.commit();
    const first: any = await data({ action: "people" }),
      second: any = await data({ action: "people", cursor: first.cursor });
    check(first.people.length, 200, "First page bounded");
    check(first.cursor !== null, true, "Next page exposed");
    check(
      second.people.length,
      9,
      "Can reach contacts past old first-page limit",
    );
    check(
      new Set([...first.people, ...second.people].map((p) => p.id)).size,
      209,
      "Pagination has no duplicates",
    );
    check(second.cursor, null, "Final page terminates");
    await seed("settings/features", {
      modules: { communication: { enabled: false } },
    });
    await denied(
      () => data({ action: "people" }),
      403,
      "Platform pause enforced",
    );
    const paused: any = await roleHomeOperation(
      { organizationId: org, action: "overview", profile: "pastoral" },
      "pastor",
    );
    check(
      paused.actions.some((a: any) => a.href === "/communication"),
      false,
      "Paused module absent from dashboard",
    );
    await seed("settings/features", {
      modules: { communication: { enabled: true } },
    });
    await seed("settings/subscription", { plan: "free" });
    await denied(
      () => data({ action: "people" }),
      403,
      "Plan eligibility enforced",
    );
    await denied(
      () => whatsappSettings(org, "pastor"),
      403,
      "Meta management respects same entitlement",
    );
    const response = await POST(
      new NextRequest("http://localhost/api/communication/send-whatsapp", {
        method: "POST",
        body: JSON.stringify({ action: "people", organizationId: org }),
        headers: { "content-type": "application/json" },
      }),
    );
    check(response.status, 401, "HTTP route requires authentication");
    check(
      response.headers.get("cache-control"),
      "private, no-store",
      "Private data is not cached",
    );
    check(external, false, "No external request or real message");
    console.log(`Communication QA: ${checks} checks passed.`);
  } finally {
    global.fetch = originalFetch;
    await db.recursiveDelete(db.doc(root));
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

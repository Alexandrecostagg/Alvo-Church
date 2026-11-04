import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { POST as api } from "../apps/web/app/api/campaigns/route";
import {
  GET as publicGet,
  POST as publicPost,
} from "../apps/web/app/api/public/campaigns/route";
import {
  campaignOperation,
  registerCampaignGuest,
  publicGuest,
  publicCampaign,
  campaignWhatsappCommand,
  respondCampaignGuest,
  respondCampaignWhatsapp,
  checkInCampaign,
  campaignSchedule,
  prepareCampaignDeliveries,
  campaignDeliveryGuard,
} from "../apps/web/app/api/_lib/invitation-campaigns";
import { accountTransaction } from "../apps/web/app/api/_lib/member-account-store";
import {
  dispatchWhatsapp,
  applyWhatsappStatus,
} from "../apps/web/app/api/_lib/whatsapp-outbox";
import { POST as whatsappWebhook } from "../apps/web/app/api/whatsapp/webhook/route";
import { conversationReply } from "../apps/web/app/api/_lib/whatsapp-conversation";
import {
  campaignLocalDate,
  campaignDay,
  invitationCalendar,
} from "../packages/domain/src/invitation-calendar";
import { POST as campaignCopy } from "../apps/web/app/api/campaigns/copy/route";
import { defaultInvitationSteps } from "../packages/domain/src/invitation-campaign";
import {
  signInWithFirebaseMobileEmailPassword,
  signOutFromFirebaseMobile,
  getFirebaseFirestore,
  fetchVisitorIntakes,
} from "../packages/firebase/src/index";
import { doc, getDoc, setDoc, terminate } from "firebase/firestore";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
async function main() {
  if (
    process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
  )
    throw Error("Only demo-alvo-qa emulators are permitted.");
  const realFetch = global.fetch;
  let external = 0;
  global.fetch = (async (input: any, init: any) => {
    const u = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    if (!["127.0.0.1", "localhost"].includes(u.hostname)) {
      external++;
      throw Error("External network forbidden in campaign QA");
    }
    return realFetch(input, init);
  }) as typeof fetch;
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(),
    auth = getAuth(),
    suffix = randomUUID().slice(0, 8),
    org = `qa_campaign_${suffix}`,
    root = `organizations/${org}`,
    admin = `ca_${suffix}`,
    member = `cm_${suffix}`,
    outsider = `cx_${suffix}`,
    id = "campanha",
    base = `${root}/invitationCampaigns/${id}`,
    now = Date.now(),
    eventAt = now + 25 * 86400000,
    password = "Local-QA-2026!";
  let checks = 0;
  const eq = (a: any, b: any, label: string) => {
    assert.deepEqual(a, b, label);
    checks++;
  };
  const rejects = async (
    fn: () => Promise<any>,
    status: number,
    label: string,
  ) => {
    await assert.rejects(fn, (e: any) => e.status === status, label);
    checks++;
  };
  const op = (body: object, uid = admin, t = now) =>
    campaignOperation({ organizationId: org, ...body }, uid, t);
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
    memberToken = "";
  const request = async (body: object, token = adminToken) => {
    const r = await api(
      new NextRequest("http://127.0.0.1:3001/api/campaigns", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organizationId: org, ...body }),
      }),
    );
    return { status: r.status, data: await r.json() };
  };
  try {
    await db.doc(root).set({
      id: org,
      status: "active",
      name: "Igreja fictícia Esperança",
      slug: "qa-campaign",
      timezone: "America/Belem",
    });
    await db.doc(`${root}/events/evento`).set({
      id: "evento",
      organizationId: org,
      name: "Encontro fictício de acolhimento",
      startsAt: new Date(eventAt).toISOString(),
      location: "Rua fictícia, 0",
      isPaid: false,
      status: "published",
      capacity: 1000,
    });
    for (const [uid, roles, personId] of [
      [admin, ["church_admin"], "pa"],
      [member, ["member"], "pm"],
      [outsider, ["member"], null],
    ] as const) {
      await auth.createUser({ uid, email: `${uid}@example.test`, password });
      await db
        .doc(`${root}/users/${uid}`)
        .set({ organizationId: org, isActive: true, roles, personId });
      if (personId) {
        await db.doc(`${root}/people/${personId}`).set({
          id: personId,
          organizationId: org,
          status: "active",
          firstName: "João Fictício",
          personType: "adult",
        });
        await db.doc(`${root}/memberAccountLinks/${uid}`).set({
          userId: uid,
          organizationId: org,
          personId,
          verifiedBy: admin,
        });
        await db
          .doc(`${root}/memberAccountClaims/${personId}`)
          .set({ userId: uid, organizationId: org, personId });
      }
    }
    adminToken = await (
      await signInWithFirebaseMobileEmailPassword({
        config,
        email: `${admin}@example.test`,
        password,
      })
    ).user.getIdToken();
    memberToken = await (
      await signInWithFirebaseMobileEmailPassword({
        config,
        email: `${member}@example.test`,
        password,
      })
    ).user.getIdToken();
    eq(
      (await request({ action: "list" }, "invalid")).status,
      401,
      "unauthenticated rejected",
    );
    eq(
      (await request({ action: "list" }, memberToken)).status,
      403,
      "member cannot inspect all contact data",
    );
    await rejects(
      () => op({ action: "missions" }, outsider),
      409,
      "unlinked member rejected",
    );
    const draft = {
      action: "save",
      deliveryMode: "api",
      id,
      version: 0,
      eventId: "evento",
      name: "Cada membro, um convidado",
      target: 800,
      memberGoal: 1,
      hour: "10:00",
      maxMessages: 12000,
      steps: defaultInvitationSteps(),
    };
    eq(
      (await request({ ...draft, maxMessages: -1 })).status,
      400,
      "invalid budget",
    );
    eq(
      (await request({ ...draft, steps: [null] })).status,
      400,
      "invalid step",
    );
    eq(
      (
        await request({
          ...draft,
          steps: [{ ...draft.steps[0], body: "Oi {{convidado}}" }],
        })
      ).status,
      400,
      "first must name inviter and church",
    );
    const saved = await request(draft);
    eq(saved.status, 200, JSON.stringify(saved.data));
    eq(
      campaignSchedule(saved.data.campaign, now).length,
      15,
      "all future dates",
    );
    eq((await request(draft)).status, 409, "stale draft rejected");
    eq(
      (await request({ action: "state", campaignId: id, status: "active" }))
        .status,
      200,
      "activate registration without Meta",
    );
    eq(
      (await request({ ...draft, version: 2 })).status,
      409,
      "content frozen after activation",
    );
    eq(
      (
        await request({
          action: "delivery",
          campaignId: id,
          enabled: true,
          acknowledgeBudget: true,
        })
      ).status,
      409,
      "Meta pending blocks sends",
    );
    const link = (
        await request({ action: "my-link", campaignId: id }, memberToken)
      ).data.link,
      invite = link.split("/").at(-1);
    assert.match(invite, /^[a-f0-9]{48}$/);
    checks++;
    const pub = await publicGet(
      new NextRequest(
        `http://127.0.0.1:3001/api/public/campaigns?invite=${invite}`,
      ),
    );
    eq(pub.status, 200, "public member link");
    const landing = await pub.json();
    eq(landing.inviterName, "João", "first name only");
    eq(JSON.stringify(landing).includes("phone"), false, "no member phone");
    const registration = {
      action: "register",
      invite,
      name: "Ana Fictícia",
      phone: "5562999999001",
      acceptRegistration: true,
      consent: true,
      allowInviterView: false,
      requestId: randomUUID(),
      turnstileToken: "local-qa-turnstile:public_campaign",
    };
    const post = async (body: object) => {
      const r = await publicPost(
        new NextRequest("http://127.0.0.1:3001/api/public/campaigns", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "cf-connecting-ip": "qa-public",
          },
          body: JSON.stringify(body),
        }),
      );
      return { status: r.status, data: await r.json() };
    };
    eq(
      (await post({ ...registration, acceptRegistration: false })).status,
      400,
      "explicit registration consent",
    );
    const first = await post(registration);
    eq(first.status, 200, JSON.stringify(first));
    const manage = first.data.manageToken;
    const retry = await post(registration);
    eq(
      retry.data.manageToken,
      manage,
      "request replay preserves personal link",
    );
    eq(
      (
        await post({
          ...registration,
          name: "Outro",
          requestId: registration.requestId,
        })
      ).status,
      409,
      "attempt payload immutable",
    );
    const duplicate = await post({ ...registration, requestId: randomUUID() });
    eq(duplicate.data.alreadyRegistered, true, "phone deduplicated");
    eq(
      duplicate.data.manageToken,
      undefined,
      "duplicate request cannot steal capability",
    );
    const own = await publicGuest(manage),
      guestId = sha(id + ":" + registration.phone);
    eq(
      own.ticketCode === `INV-${manage}`,
      false,
      "ticket separate from response capability",
    );
    await rejects(
      () => publicGuest(own.ticketCode.slice(4)),
      404,
      "wristband cannot manage guest",
    );
    eq(own.verified, false, "checkbox does not verify phone");
    await rejects(
      () => campaignWhatsappCommand(org, "5562999999002", manage),
      403,
      "proof must come from same phone",
    );
    await rejects(
      () => campaignWhatsappCommand("foreign", "5562999999001", manage),
      403,
      "proof bound to church",
    );
    eq(
      (await op({ action: "missions" }, member)).campaigns[0].guests[0].status,
      "reserved",
      "member cannot infer private RSVP",
    );
    const memberData = (await request({ action: "missions" }, memberToken))
      .data;
    eq(
      JSON.stringify(memberData).includes(registration.phone),
      false,
      "native bearer endpoint never discloses phone",
    );
    const steps = defaultInvitationSteps().map((s, i) => ({
      ...s,
      templateName: `qa_inv_${i}`,
      confirmedTemplateName: `qa_conf_${i}`,
    }));
    process.env.WHATSAPP_CHANNELS_JSON = JSON.stringify([
      {
        organizationId: org,
        phoneNumberId: "0000011111",
        accessToken: "FAKE-LOCAL-NO-PROVIDER",
        publicPhone: "5500000000000",
        paidMessagesEnabled: true,
        templates: steps.flatMap((s) => [
          s.templateName,
          s.confirmedTemplateName,
        ]),
      },
    ]);
    process.env.PUBLIC_APP_ORIGIN = "http://127.0.0.1:3001";
    process.env.WHATSAPP_APP_SECRET = "FAKE-LOCAL-WEBHOOK-SECRET";
    async function webhook(text: string, id = randomUUID(), valid = true) {
      const payload = JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  metadata: { phone_number_id: "0000011111" },
                  contacts: [
                    {
                      wa_id: registration.phone,
                      profile: { name: "Ana Fictícia" },
                    },
                  ],
                  messages: [
                    {
                      id,
                      from: registration.phone,
                      type: "text",
                      text: { body: text },
                      timestamp: String(Math.floor(Date.now() / 1000)),
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
      return whatsappWebhook(
        new NextRequest("http://127.0.0.1:3001/api/whatsapp/webhook", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-hub-signature-256":
              "sha256=" +
              (valid
                ? createHmac("sha256", process.env.WHATSAPP_APP_SECRET!)
                    .update(payload)
                    .digest("hex")
                : "0".repeat(64)),
          },
          body: payload,
        }),
      );
    }
    await db
      .doc(`${root}/whatsappContacts/${sha(registration.phone)}`)
      .set({ phone: registration.phone, optOut: true, state: {} });
    eq(
      (await webhook("CAMPANHA " + manage)).status,
      200,
      "existing global opt-out receives recovery instructions",
    );
    eq(
      (await publicGuest(manage)).verified,
      false,
      "campaign opt-in cannot bypass global opt-out",
    );
    eq(
      (await webhook("VOLTAR")).status,
      200,
      "explicit recovery works even with general bot disabled",
    );
    eq(
      (
        await db
          .doc(`${root}/whatsappContacts/${sha(registration.phone)}`)
          .get()
      ).data()?.optOut,
      false,
      "global opt-out resumes only on explicit request",
    );
    const proofId = randomUUID();
    eq(
      (await webhook("CAMPANHA " + manage, proofId, false)).status,
      401,
      "signature required before proof",
    );
    eq(
      (await publicGuest(manage)).verified,
      false,
      "invalid signature cannot verify phone",
    );
    eq(
      (await webhook("CAMPANHA " + manage, proofId)).status,
      200,
      "signed webhook verifies even with general assistant disabled",
    );
    eq(
      (await webhook("CAMPANHA " + manage, proofId)).status,
      200,
      "webhook replay idempotent",
    );
    eq(
      (await op({ action: "detail", campaignId: id })).stats.verified,
      1,
      "proof counted once",
    );
    const contactPath = `${root}/whatsappContacts/${sha(registration.phone)}`;
    const proofContact = (await db.doc(contactPath).get()).data();
    eq(
      proofContact?.state.type,
      "invitation_campaign",
      "reply context durable",
    );
    eq(
      JSON.stringify(proofContact).includes(manage),
      false,
      "personal capability redacted from conversation history",
    );
    eq(
      (await db.collection(`${root}/whatsappOutbox`).get()).docs.every(
        (d) => d.data().status === "test_mode",
      ),
      true,
      "QA campaign replies never call provider",
    );

    eq(
      (await publicGuest(manage)).verified,
      true,
      "inbound exact phone proves ownership",
    );
    await respondCampaignGuest({ token: manage, operation: "confirmed" });
    eq((await publicGuest(manage)).status, "confirmed", "personal link RSVP");
    const preview = await op({ action: "preview", campaignId: id, guestId });
    eq(preview.messages.length, 15, "full personalized sequence");
    assert.match(
      preview.messages[0].text,
      /Ana.*Igreja fictícia Esperança.*João/,
    );
    checks++;
    eq(
      preview.messages[0].text.includes("{{"),
      false,
      "no unresolved placeholders",
    );
    const ctx: any = {
      orgId: org,
      slug: "qa-campaign",
      name: "Igreja fictícia",
      profile: {},
      state: { type: "invitation_campaign", campaignId: id, guestId },
      optOut: false,
    };
    process.env.PUBLIC_APP_ORIGIN = "http://127.0.0.1:3001";
    const msg: any = {
      from: registration.phone,
      text: "RECUSAR CONVITE",
      id: "fake-inbound",
      name: "Ana",
    };
    await conversationReply(ctx, msg);
    eq(
      (await publicGuest(manage)).status,
      "declined",
      "WhatsApp reply integrated",
    );
    await respondCampaignWhatsapp(
      org,
      registration.phone,
      id,
      guestId,
      "confirmed",
    );
    eq(
      (await webhook("Preciso falar com alguém da equipe")).status,
      200,
      "unstructured reply accepted without AI",
    );
    eq(
      (
        await db
          .doc(`${root}/whatsappContacts/${sha(registration.phone)}`)
          .get()
      ).data()?.handoff,
      true,
      "human request visible in communication inbox",
    );
    await respondCampaignGuest({ token: manage, operation: "handoff" });
    eq(
      (await publicGuest(manage)).handoff,
      true,
      "human request pauses reminders",
    );
    await op({
      action: "guest",
      campaignId: id,
      guestId,
      operation: "handoff",
      value: false,
    });
    eq(
      (
        await db
          .doc(`${root}/whatsappContacts/${sha(registration.phone)}`)
          .get()
      ).data()?.handoff,
      false,
      "staff completion releases matching global handoff",
    );
    eq(
      (
        await db
          .doc(`${root}/whatsappHandoffs/${sha(registration.phone)}`)
          .get()
      ).data()?.status,
      "completed",
      "handoff record resolved",
    );
    await op({ action: "templates", campaignId: id, templates: steps });
    await rejects(
      () => op({ action: "delivery", campaignId: id, enabled: true }),
      400,
      "budget acknowledgement required",
    );
    await op({
      action: "delivery",
      campaignId: id,
      enabled: true,
      acknowledgeBudget: true,
    });
    const current = (await op({ action: "detail", campaignId: id })).campaign,
      scheduled = campaignSchedule(current, now)[0].scheduledAt,
      due = Date.parse(scheduled) + 60000;
    eq(
      (await prepareCampaignDeliveries(org, due)).prepared,
      1,
      "one verified guest due",
    );
    eq(
      (await prepareCampaignDeliveries(org, due)).prepared,
      0,
      "scheduler repeat never queues duplicate message",
    );
    const out = (
      await db
        .collection(`${root}/whatsappOutbox`)
        .where("campaignId", "==", id)
        .get()
    ).docs[0];
    const row = out.data();
    await db.doc(`${root}/whatsappContacts/${sha(registration.phone)}`).set(
      {
        phone: registration.phone,
        optOut: false,
        lastInboundAt: new Date(now).toISOString(),
      },
      { merge: true },
    );
    const guard = await accountTransaction((tx) =>
      campaignDeliveryGuard(tx, root, row, due),
    );
    eq(
      guard.templateName,
      "qa_conf_0",
      "first delivered message introduces inviting member, uses confirmed variant",
    );
    eq(
      guard.parameters.includes("João"),
      true,
      "approved parameters identify inviting member",
    );
    eq(
      (await db.doc(`${base}/control/budget`).get()).data()?.used,
      1,
      "atomic message cap counts claim",
    );
    await db.doc(`${base}/control/budget`).set({ used: 12000 });
    await rejects(
      () =>
        accountTransaction((tx) => campaignDeliveryGuard(tx, root, row, due)),
      409,
      "cap enforced before provider",
    );
    await db.doc(`${base}/control/budget`).set({ used: 1 });
    await dispatchWhatsapp(org, out.id, due);
    eq(
      (await out.ref.get()).data()?.status,
      "test_mode",
      "isolated QA hard-blocks actual provider",
    );
    await out.ref.set({
      ...row,
      status: "accepted",
      providerId: "FAKE-RECEIPT",
    });
    await applyWhatsappStatus(org, "FAKE-RECEIPT", registration.phone, "read");
    await applyWhatsappStatus(org, "FAKE-RECEIPT", registration.phone, "read");
    let d = await op({ action: "detail", campaignId: id });
    eq(d.stats.read, 1, "webhook receipts counted once");
    eq(d.stats.delivered, 1, "read implies delivered");
    eq(
      !!(await db.doc(`${base}/guests/${guestId}`).get()).data()
        ?.firstDeliveredAt,
      true,
      "delivery advances welcome state",
    );
    await respondCampaignGuest({ token: manage, operation: "stop" });
    await rejects(
      () =>
        accountTransaction((tx) => campaignDeliveryGuard(tx, root, row, due)),
      409,
      "stop cancels pending sends at final guard",
    );
    await rejects(
      () => campaignWhatsappCommand(org, registration.phone, manage),
      409,
      "silent resubscription rejected",
    );
    const noConsent = await registerCampaignGuest(
      {
        ...registration,
        name: "Bruno Fictício",
        phone: "5562999999002",
        requestId: randomUUID(),
        consent: false,
        allowInviterView: true,
      },
      "qa-second",
      now,
    );
    eq(
      (await publicGuest(noConsent.manageToken)).consent,
      false,
      "guest can participate without WhatsApp",
    );
    eq(
      (
        await db
          .collection(`${root}/campaignDeliveries`)
          .where("guestId", "==", sha(id + ":5562999999002"))
          .get()
      ).size,
      0,
      "no jobs for nonconsenting guest",
    );
    await rejects(
      () =>
        checkInCampaign(
          { organizationId: org, code: own.ticketCode },
          member,
          eventAt,
        ),
      403,
      "member cannot check guests in",
    );
    await rejects(
      () =>
        checkInCampaign(
          { organizationId: org, code: own.ticketCode },
          admin,
          now,
        ),
      409,
      "check-in time window",
    );
    await rejects(
      () =>
        checkInCampaign(
          { organizationId: "foreign", code: own.ticketCode },
          admin,
          eventAt,
        ),
      403,
      "church isolation",
    );
    await checkInCampaign(
      { organizationId: org, code: own.ticketCode },
      admin,
      eventAt,
    );
    eq(
      (
        await checkInCampaign(
          { organizationId: org, code: own.ticketCode },
          admin,
          eventAt,
        )
      ).replayed,
      true,
      "idempotent check-in",
    );
    eq(
      (await db.collection(`${root}/visitorIntakes`).get()).size,
      1,
      "visitor reception integrated",
    );
    eq(
      (await db.collection(`${root}/people`).get()).size,
      2,
      "visitor not silently made member",
    );
    eq(
      (await db.collection(`${root}/events/evento/registrations`).get()).size,
      1,
      "actual event registration integrated",
    );
    await db.doc(`${root}/events/evento`).update({ capacity: 1 });
    const secondOwn = await publicGuest(noConsent.manageToken);
    await rejects(
      () =>
        checkInCampaign(
          { organizationId: org, code: secondOwn.ticketCode },
          admin,
          eventAt,
        ),
      409,
      "event capacity respected",
    );
    await db.doc(`${root}/events/evento`).update({ capacity: 1000 });
    await db
      .doc(`${root}/events/evento`)
      .update({ name: "Changed fictitious event" });
    await rejects(
      () => publicCampaign(invite),
      409,
      "changed event fails closed",
    );
    eq(
      (await op({ action: "detail", campaignId: id })).campaign.id,
      id,
      "admin can inspect changed campaign",
    );
    await db
      .doc(`${root}/events/evento`)
      .update({ name: "Encontro fictício de acolhimento" });
    const sdk = getFirebaseFirestore(config);
    await assert.rejects(
      () => getDoc(doc(sdk, `${base}/guests/${guestId}`)),
      /permission|permissions/i,
    );
    checks++;
    await assert.rejects(
      () =>
        setDoc(doc(sdk, `${root}/campaignDeliveries/fake`), {
          status: "planned",
        }),
      /permission|permissions/i,
    );
    checks++;
    await signInWithFirebaseMobileEmailPassword({
      config,
      email: `${admin}@example.test`,
      password,
    });
    await db.doc(`${root}/visitorIntakes/older_fictional`).set({
      organizationId: org,
      name: "Cadastro fictício antigo",
      status: "captured",
      createdAt: new Date(now - 86400000).toISOString(),
      consentMarketing: true,
    });
    const reception = await fetchVisitorIntakes(
      config,
      { organizationId: org },
      1,
    );
    eq(
      reception[0].name,
      "Ana Fictícia",
      "reception SDK loads most recent campaign check-in first",
    );
    eq(
      reception[0].consentMarketing,
      false,
      "campaign consent is not reused as general marketing consent",
    );
    // Manual workflow: real server transactions, fictitious contacts, no API jobs.
    const manualId = "manual_case",
      manualBase = `${root}/invitationCampaigns/${manualId}`;
    const today = campaignLocalDate(now, "America/Belem");
    const manualDates = invitationCalendar(
      campaignLocalDate(eventAt, "America/Belem"),
      today,
      3,
    );
    const manualDraft = {
      ...draft,
      id: manualId,
      deliveryMode: "manual",
      manualSenderPhone: "5562999990099",
      hour: "00:00",
      messageStartDate: today,
      inviteStartDate: today,
      intervalDays: 3,
      messagesReviewed: true,
      steps: defaultInvitationSteps(
        manualDates.length,
        manualDates.map((d) => d.daysBefore),
      ),
    };
    const manualSaved = await request(manualDraft);
    eq(manualSaved.status, 200, "manual draft saved without Meta templates");
    const { deliveryMode: _ignoredMode, ...defaultModeDraft } = manualDraft;
    eq(
      (await request({ ...defaultModeDraft, id: "manual_default" })).data
        .campaign.deliveryMode,
      "manual",
      "new campaigns default to manual on the server too",
    );
    eq(
      manualSaved.data.campaign.deliveryMode,
      "manual",
      "manual mode persisted",
    );
    await op({ action: "state", campaignId: manualId, status: "active" });
    await rejects(
      () =>
        op({
          action: "delivery",
          campaignId: manualId,
          enabled: true,
          acknowledgeBudget: true,
        }),
      409,
      "manual cannot activate paid API",
    );
    const manualInvite = (
      await op({ action: "my-link", campaignId: manualId }, member)
    ).link
      .split("/")
      .at(-1);
    const manualRegistration = await registerCampaignGuest(
      {
        invite: manualInvite,
        name: "Lia Fictícia",
        phone: "5562999990088",
        requestId: randomUUID(),
        acceptRegistration: true,
        consent: true,
        allowInviterView: true,
      },
      "manual-qa",
      now,
    );
    const manualGuest = (await op({ action: "detail", campaignId: manualId }))
      .guests[0];
    eq(
      (
        await db
          .collection(`${root}/campaignDeliveries`)
          .where("campaignId", "==", manualId)
          .get()
      ).size,
      0,
      "manual signup creates no API delivery jobs",
    );
    eq(
      (await publicGuest(manualRegistration.manageToken, now)).deliveryMode,
      "manual",
      "public page knows manual mode",
    );
    eq(
      (
        await publicGuest(manualRegistration.manageToken, now)
      ).whatsappUrl.includes("CAMPANHA"),
      false,
      "manual contact does not require a webhook command",
    );
    await rejects(
      () => op({ action: "manual-queue", campaignId: manualId }, member),
      403,
      "member cannot inspect manual phone queue",
    );
    const manualQueue = await op({
      action: "manual-queue",
      campaignId: manualId,
    });
    eq(
      manualQueue.rows.map((g: any) => g.id),
      [manualGuest.id],
      "authorized but not webhook-verified guest available for human contact",
    );
    const claimRequest = {
      action: "manual-claim",
      campaignId: manualId,
      guestId: manualGuest.id,
      stepIndex: 0,
      requestId: randomUUID(),
    };
    const claimed = await op(claimRequest);
    eq(
      new URL(claimed.whatsappUrl).searchParams.get("text"),
      claimed.text,
      "WhatsApp link contains reviewed personalized message",
    );
    eq(
      claimed.text.includes("Lia") && claimed.text.includes("João"),
      true,
      "manual message names guest and inviter",
    );
    eq(
      (await op(claimRequest)).claimToken,
      claimed.claimToken,
      "claim retry returns same reservation",
    );
    await rejects(
      () => op({ ...claimRequest, requestId: randomUUID() }),
      409,
      "second session cannot reserve same guest",
    );
    await rejects(
      () => op({ ...claimRequest, stepIndex: 1 }),
      409,
      "future stage cannot be prepared early",
    );
    const expiredClaim = await op(
      { ...claimRequest, requestId: randomUUID() },
      admin,
      now + 11 * 60000,
    );
    eq(
      expiredClaim.claimToken !== claimed.claimToken,
      true,
      "expired reservation can be recovered",
    );
    const completion = {
      action: "manual-complete",
      campaignId: manualId,
      guestId: manualGuest.id,
      stepIndex: 0,
      outcome: "sent",
      claimToken: expiredClaim.claimToken,
    };
    await rejects(
      () =>
        op({
          ...completion,
          claimToken: claimed.claimToken,
          acknowledgeManualSend: true,
        }),
      409,
      "stale owner cannot finish recovered reservation",
    );
    await rejects(
      () => op(completion),
      400,
      "opening a chat does not count as a sent message",
    );
    await op({ ...completion, acknowledgeManualSend: true });
    eq(
      (await op({ ...completion, acknowledgeManualSend: true })).replayed,
      true,
      "manual completion is idempotent",
    );
    eq(
      (await op({ action: "manual-queue", campaignId: manualId })).reportedSent,
      1,
      "manual progress counted once",
    );
    eq(
      (await op({ action: "manual-queue", campaignId: manualId })).rows.length,
      0,
      "reported contact leaves today's queue",
    );
    const afterManual = (
      await db.doc(`${manualBase}/guests/${manualGuest.id}`).get()
    ).data()!;
    eq(
      !!afterManual.manualFirstSentAt &&
        !afterManual.firstDeliveredAt &&
        !afterManual.verifiedAt,
      true,
      "manual report is not a delivery or phone-verification receipt",
    );
    await op({
      action: "manual-response",
      campaignId: manualId,
      guestId: manualGuest.id,
      response: "confirmed",
      acknowledgeResponse: true,
    });
    eq(
      (await op({ action: "detail", campaignId: manualId })).stats.confirmed,
      1,
      "human-recorded reply updates response and statistics",
    );
    const nextManual = await op(
      { action: "manual-queue", campaignId: manualId },
      admin,
      now + 3 * 86400000,
    );
    const nextClaim = await op(
      {
        ...claimRequest,
        stepIndex: nextManual.stepIndex,
        requestId: randomUUID(),
      },
      admin,
      now + 3 * 86400000,
    );
    eq(
      nextClaim.text !== claimed.text,
      true,
      "next scheduled day uses a different message",
    );
    await op(
      {
        action: "manual-release",
        campaignId: manualId,
        guestId: manualGuest.id,
        stepIndex: nextManual.stepIndex,
        claimToken: nextClaim.claimToken,
      },
      admin,
      now + 3 * 86400000,
    );
    await op({
      action: "manual-response",
      campaignId: manualId,
      guestId: manualGuest.id,
      response: "stop",
      acknowledgeResponse: true,
    });
    eq(
      (
        await op(
          { action: "manual-queue", campaignId: manualId },
          admin,
          now + 3 * 86400000,
        )
      ).rows.length,
      0,
      "human-recorded SAIR blocks later manual contact",
    );
    eq(
      (
        await db.doc(`${root}/whatsappContacts/${sha(manualGuest.phone)}`).get()
      ).data()?.optOut,
      true,
      "manual SAIR also blocks other campaigns of this church",
    );
    await rejects(
      () =>
        op(
          {
            ...claimRequest,
            stepIndex: nextManual.stepIndex,
            requestId: randomUUID(),
          },
          admin,
          now + 3 * 86400000,
        ),
      409,
      "opt-out rechecked when preparing contact",
    );
    // More than one batch, including an empty/filtered first page, stays navigable.
    for (let i = 0; i < 52; i++)
      await db
        .doc(`${manualBase}/guests/pagination_${String(i).padStart(3, "0")}`)
        .set({
          ...manualGuest,
          id: `pagination_${String(i).padStart(3, "0")}`,
          name: `Pessoa fictícia ${i}`,
          phone: `5562999${String(i).padStart(6, "0")}`,
          consent: true,
          optOut: false,
          handoff: false,
        });
    const batchOne = await op({ action: "manual-queue", campaignId: manualId });
    eq(
      !!batchOne.nextCursor,
      true,
      "manual queue exposes next batch above fifty guests",
    );
    const batchTwo = await op({
      action: "manual-queue",
      campaignId: manualId,
      cursor: batchOne.nextCursor,
    });
    eq(
      batchOne.rows.length + batchTwo.rows.length,
      52,
      "manual pagination does not lose authorized contacts",
    );
    const g0 = batchOne.rows[0];
    await db
      .doc(`${root}/whatsappContacts/${sha(g0.phone)}`)
      .set({ optOut: true });
    await rejects(
      () => op({ ...claimRequest, guestId: g0.id, requestId: randomUUID() }),
      409,
      "global opt-out respected for human preparation",
    );
    await op({ action: "state", campaignId: manualId, status: "paused" });
    eq(
      (await op({ action: "manual-queue", campaignId: manualId })).rows.length,
      0,
      "paused manual campaign has no work queue",
    );
    // Explicit calendar: open invitations first, then eight reminders every two days.
    const eventDate = campaignLocalDate(eventAt, "America/Belem"),
      messageStartDate = campaignDay(eventDate, -15),
      inviteStartDate = campaignLocalDate(now + 2 * 86400000, "America/Belem"),
      dates = invitationCalendar(eventDate, messageStartDate, 2),
      cadenceId = "cadence_case";
    const configured = {
      ...draft,
      id: cadenceId,
      version: 0,
      messageStartDate,
      inviteStartDate,
      intervalDays: 2,
      steps: defaultInvitationSteps(
        dates.length,
        dates.map((d) => d.daysBefore),
      ),
      messagesReviewed: false,
    };
    eq(
      (await request({ ...configured, intervalDays: 0 })).status,
      400,
      "invalid cadence rejected by server",
    );
    eq(
      (
        await request({
          ...configured,
          steps: configured.steps.map((s, i) =>
            i === 1 ? { ...s, body: configured.steps[0].body } : s,
          ),
        })
      ).status,
      400,
      "duplicate copy rejected at save",
    );
    eq(
      (
        await request({
          ...configured,
          steps: configured.steps.map((s, i) =>
            i === 1 ? { ...s, daysBefore: 12 } : s,
          ),
        })
      ).status,
      400,
      "client cannot spoof schedule offsets",
    );
    eq(
      (await request(configured)).status,
      200,
      "explicit calendar saved as draft",
    );
    eq(
      (
        await request({
          action: "state",
          campaignId: cadenceId,
          status: "active",
        })
      ).status,
      409,
      "publication requires editorial approval",
    );
    eq(
      (await request({ ...configured, version: 1, messagesReviewed: true }))
        .status,
      200,
      "human approval persisted with saved copy",
    );
    eq(
      (
        await request({
          action: "state",
          campaignId: cadenceId,
          status: "active",
        })
      ).status,
      200,
      "future opening can be scheduled",
    );
    eq(
      (await request({ action: "my-link", campaignId: cadenceId }, memberToken))
        .status,
      409,
      "member cannot invite before opening",
    );
    eq(
      (await op({ action: "missions" }, member)).campaigns.find(
        (c: any) => c.id === cadenceId,
      ).invitesOpen,
      false,
      "mobile and web see scheduled opening",
    );
    await op({
      action: "templates",
      campaignId: cadenceId,
      templates: configured.steps.map((s, i) => ({
        templateName: `qa_inv_${i}`,
        confirmedTemplateName: `qa_conf_${i}`,
      })),
    });
    await op({
      action: "delivery",
      campaignId: cadenceId,
      enabled: true,
      acknowledgeBudget: true,
    });
    const openAt = Date.parse(
      (await op({ action: "detail", campaignId: cadenceId })).campaign
        .inviteOpensAt,
    );
    const futureLink = await op(
        { action: "my-link", campaignId: cadenceId },
        member,
        openAt + 60000,
      ),
      futureInvite = futureLink.link.split("/").at(-1);
    await rejects(
      () => publicCampaign(futureInvite, now),
      409,
      "anonymous guest cannot register early",
    );
    const publicCadence = await publicCampaign(futureInvite, openAt + 60000);
    eq(
      publicCadence.days,
      8,
      "consent reports total messages, not misleading daily count",
    );
    eq(publicCadence.intervalDays, 2, "guest sees agreed two-day cadence");
    const futureGuest = await registerCampaignGuest(
      {
        ...registration,
        invite: futureInvite,
        name: "Convidado de calendário fictício",
        phone: "5562999999011",
        requestId: randomUUID(),
      },
      "qa-cadence",
      openAt + 60000,
    );
    const cadenceJobs = await db
      .collection(`${root}/campaignDeliveries`)
      .where("campaignId", "==", cadenceId)
      .get();
    eq(cadenceJobs.size, 8, "eight planned messages persisted");
    eq(
      cadenceJobs.docs
        .map((r) => r.data())
        .sort((a, b) => a.stepIndex - b.stepIndex)
        .map((r) => campaignLocalDate(r.scheduledAt, "America/Belem")),
      dates.map((d) => d.date),
      "stored jobs exactly match the reviewed calendar",
    );
    const consentRecord = (
      await db
        .collection(`${root}/invitationCampaigns/${cadenceId}/guests`)
        .get()
    ).docs[0].data();
    eq(
      consentRecord.consentText.includes("a cada 2 dias"),
      true,
      "consent records chosen frequency",
    );
    await op({ action: "state", campaignId: cadenceId, status: "paused" });
    const copyRequest = (access: string) =>
      campaignCopy(
        new NextRequest("http://127.0.0.1:3001/api/campaigns/copy", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({ organizationId: org, action: "status" }),
        }),
      );
    eq(
      (await copyRequest(memberToken)).status,
      403,
      "AI sequence restricted to church team",
    );
    eq(
      (await copyRequest(adminToken)).status,
      200,
      "AI availability can be checked without provider requests",
    );
    const scale = process.argv.includes("--scale") ? 800 : 60;
    console.log(
      `Core checks passed; registering ${scale} fictitious guests through real server transactions…`,
    );
    for (let start = 0; start < scale; start += 8) {
      await Promise.all(
        Array.from({ length: Math.min(8, scale - start) }, (_, j) => {
          const i = start + j;
          return registerCampaignGuest(
            {
              ...registration,
              name: `Convidado fictício ${i}`,
              phone: `5562988${String(i).padStart(6, "0")}`,
              requestId: randomUUID(),
              allowInviterView: true,
            },
            `qa-scale-${i}`,
            now,
          );
        }),
      );
      if (start % 160 === 0)
        console.log(`Scale progress: ${Math.min(start + 8, scale)}/${scale}`);
    }
    d = await op({ action: "detail", campaignId: id });
    eq(
      d.stats.registered,
      scale + 2,
      "sharded counters exact under concurrency",
    );
    eq(
      (
        await db
          .collection(`${root}/campaignDeliveries`)
          .where("campaignId", "==", id)
          .get()
      ).size,
      (scale + 1) * 15,
      "all fifteen daily steps persisted",
    );
    eq(d.guests.length, 50, "admin first page bounded");
    const secondPage = await op({
      action: "detail",
      campaignId: id,
      cursor: d.nextCursor,
    });
    eq(
      secondPage.guests.some((g: any) =>
        d.guests.some((f: any) => f.id === g.id),
      ),
      false,
      "cursor has no duplicate",
    );
    let total = d.guests.length + secondPage.guests.length,
      cursor = secondPage.nextCursor;
    while (cursor) {
      const page = await op({ action: "detail", campaignId: id, cursor });
      total += page.guests.length;
      cursor = page.nextCursor;
    }
    eq(total, scale + 2, "all guests reachable through pages");
    const late = await registerCampaignGuest(
      { ...registration, phone: "5562999999999", requestId: randomUUID() },
      "qa-late",
      eventAt - 2 * 86400000,
    );
    const lateId = sha(id + ":5562999999999");
    const lateJobs = await db
      .collection(`${root}/campaignDeliveries`)
      .where("guestId", "==", lateId)
      .get();
    assert.ok(lateJobs.size <= 2 && lateJobs.size >= 1);
    checks++;
    eq(
      lateJobs.docs.every(
        (x) => Date.parse(x.data().scheduledAt) >= eventAt - 2 * 86400000,
      ),
      true,
      "no backfill for late guests",
    );
    await op({ action: "state", campaignId: id, status: "paused" });
    await rejects(
      () => publicCampaign(invite),
      409,
      "pause closes public signup",
    );
    await rejects(
      () =>
        accountTransaction((tx) => campaignDeliveryGuard(tx, root, row, due)),
      409,
      "pause blocks queued delivery",
    );
    eq(external, 0, "ZERO external network/messages/payments/publications");
    console.log(
      JSON.stringify(
        {
          checks,
          scale,
          org,
          registered: scale + 3,
          plannedJobs: (scale + 1) * 15 + lateJobs.size,
          externalRequests: external,
        },
        null,
        2,
      ),
    );
    await terminate(sdk);
  } finally {
    await signOutFromFirebaseMobile().catch(() => {});
    delete process.env.WHATSAPP_CHANNELS_JSON;
    await db.recursiveDelete(db.doc(root));
    for (const c of [
      "campaignInvitationLinks",
      "campaignGuestLinks",
      "campaignTickets",
    ]) {
      const rows = await db
        .collection(c)
        .where("organizationId", "==", org)
        .get();
      for (const r of rows.docs) await r.ref.delete();
    }
    await Promise.all(
      [admin, member, outsider].map((uid) =>
        auth.deleteUser(uid).catch(() => {}),
      ),
    );
    global.fetch = realFetch;
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

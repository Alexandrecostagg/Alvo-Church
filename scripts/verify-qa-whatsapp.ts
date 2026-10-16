import assert from "node:assert/strict";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

async function run() {
  if (
    process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
  )
    throw new Error(
      "Este roteiro usa exclusivamente os emuladores demo-alvo-qa.",
    );
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore();
  const runId = crypto.randomUUID().slice(0, 8), orgSlug = `wa-qa-${runId}`;
  const orgId = `org_qa_whatsapp_${runId}`,
    root = `organizations/${orgId}`,
    phone = "5562999990001";
  await db.doc(root).set({id:orgId,slug:orgSlug,name:"Igreja QA WhatsApp",status:"active",timezone:"America/Belem"});
  await db.doc(`org_slugs/${orgSlug}`).set({organizationId:orgId});
  await db.doc(`${root}/users/qa_admin_principal`).set({organizationId:orgId,isActive:true,roles:["church_admin"]});
  await db.doc(`${root}/settings/subscription`).set({plan:"pastoral",billingStatus:"active"});
  await db.doc(`${root}/events/event_qa_principal`).set({id:"event_qa_principal",organizationId:orgId,name:"Evento QA WhatsApp",status:"published",startsAt:new Date(Date.now()+86400000).toISOString(),capacity:10,isPaid:false});
  // Enable the communication screen on the separately seeded browser-QA church.
  await db.doc("organizations/org_qa_principal/settings/features").set({modules:{communication:{enabled:true,source:"manual"},ai:{enabled:true,source:"manual"}}},{merge:true});
  process.env.PUBLIC_APP_ORIGIN = "https://qa.example.test";
  process.env.WHATSAPP_GRAPH_VERSION = "v25.0";
  process.env.WHATSAPP_CHANNELS_JSON = JSON.stringify([
    {
      organizationId: orgId,
      phoneNumberId: "900001",
      publicPhone: "5562999990000",
      accessToken: "SIMULATED_ONLY",
      templates: ["qa_reminder"],
    },
  ]);
  let sends = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any, init: any) => {
    const url = String(input);
    if (url.startsWith("https://graph.facebook.com/")) {
      sends++;
      assert.match(String(init?.body), /messaging_product/);
      return new Response(
        JSON.stringify({ messages: [{ id: `qa-provider-${sends}` }] }),
        { status: 200 },
      );
    }
    if (!url.startsWith("http://127.0.0.1:8080/"))
      throw new Error("External access refused in WhatsApp QA");
    return realFetch(input, init);
  }) as typeof fetch;
  const { receiveWhatsapp } =
    await import("../apps/web/app/api/_lib/whatsapp-webhook");
  const { submitParticipation, digest } =
    await import("../apps/web/app/api/_lib/participation");
  const { issueWhatsappLink } =
    await import("../apps/web/app/api/_lib/whatsapp-member");
  const { prepareManualContact } =
    await import("../apps/web/app/api/_lib/communication-operations");
  const message = (text: string, id = crypto.randomUUID()) => ({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "900001" },
              contacts: [{ wa_id: phone, profile: { name: "Maria QA" } }],
              messages: [
                {
                  id,
                  from: phone,
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
  await db
    .doc(`${root}/settings/pastoralAssistant`)
    .set({
      enabled: true,
      careEnabled: true,
      visitorsEnabled: true,
      eventsEnabled: true,
      groupsEnabled: true,
    });
  const menu = message("MENU");
  await receiveWhatsapp(menu);
  await receiveWhatsapp(menu);
  assert.equal(sends, 1, "same webhook must not send twice");
  await receiveWhatsapp(message("ORACAO Pedido privado de homologação"));
  const confirmation = message("CONFIRMAR");
  await receiveWhatsapp(confirmation);
  await receiveWhatsapp(confirmation);
  const prayers = await db
    .collection(`${root}/prayerRequests`)
    .where("phone", "==", phone)
    .get();
  assert.equal(prayers.size, 1);
  assert.equal(prayers.docs[0].data().isPublic, false);
  assert.equal(prayers.docs[0].data().source, "whatsapp");
  await receiveWhatsapp(message("VISITANTE Maria QA"));
  await receiveWhatsapp(message("CONFIRMAR"));
  const intakes = await db
    .collection(`${root}/visitorIntakes`)
    .where("source", "==", "whatsapp")
    .get();
  assert.ok(intakes.size >= 1);
  await receiveWhatsapp(message("INSCREVER event_qa_principal"));
  await receiveWhatsapp(message("CONFIRMAR"));
  const registrations = await db
    .collection(`${root}/events/event_qa_principal/registrations`)
    .get();
  assert.equal(registrations.size, 1);
  assert.equal(registrations.docs[0].data().paymentStatus, "not_required");
  await receiveWhatsapp(message("SAIR"));
  await assert.rejects(
    prepareManualContact(
      {
        organizationId: orgId,
        requestId: crypto.randomUUID(),
        phone,
        message: "Não deve abrir",
      },
      "qa_admin_principal",
    ),
  );
  await receiveWhatsapp(message("VOLTAR"));
  // A public form cannot select another church or exceed an event's capacity.
  await db
    .doc(`${root}/events/qa_capacity`)
    .set({
      id: "qa_capacity",
      organizationId: orgId,
      name: "Evento limitado",
      status: "published",
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      capacity: 1,
      isPaid: true,
    });
  const input = {
    orgSlug,
    requestId: crypto.randomUUID(),
    name: "Pessoa de teste",
    phone: "5562999990002",
    consent: true,
    eventId: "qa_capacity",
  };
  const paid = await submitParticipation(input, "event", "qa");
  assert.equal(paid.paymentStatus, "pending");
  await assert.rejects(
    submitParticipation(
      { ...input, phone: "5562999990003", requestId: crypto.randomUUID() },
      "event",
      "qa",
    ),
  );
  await assert.rejects(
    submitParticipation(
      { ...input, orgSlug: "igreja-inexistente" },
      "event",
      "qa",
    ),
  );
  await db.doc(`${root}/events/qa_concurrent`).set({id:"qa_concurrent",organizationId:orgId,name:"Última vaga",status:"published",startsAt:new Date(Date.now()+86400000).toISOString(),capacity:1,isPaid:false});
  const contenders=await Promise.allSettled(["5562999990008","5562999990009"].map(phone=>submitParticipation({...input,eventId:"qa_concurrent",phone,requestId:crypto.randomUUID()},"event",phone)));
  assert.equal(contenders.filter(r=>r.status === "fulfilled").length,1,"only one concurrent applicant may take the final seat");
  // Identity must be verified in both member-account directions before binding.
  await db
    .doc(`${root}/people/qa_person`)
    .set({
      id: "qa_person",
      organizationId: orgId,
      status: "active",
      firstName: "Maria",
      lastName: "QA",
    });
  await db
    .doc(`${root}/users/qa_admin_principal`)
    .update({ personId: "qa_person" });
  await db
    .doc(`${root}/memberAccountLinks/qa_admin_principal`)
    .set({
      organizationId: orgId,
      userId: "qa_admin_principal",
      personId: "qa_person",
      verifiedBy: "qa_admin_principal",
    });
  await db
    .doc(`${root}/memberAccountClaims/qa_person`)
    .set({
      organizationId: orgId,
      userId: "qa_admin_principal",
      personId: "qa_person",
    });
  const link = await issueWhatsappLink(orgSlug, "qa_admin_principal");
  await receiveWhatsapp(message(new URL(link.url).searchParams.get("text")!));
  assert.equal(
    (await db.doc(`${root}/whatsappContacts/${digest(phone)}`).get()).data()
      ?.personId,
    "qa_person",
  );
  await db
    .doc(`${root}/groups/qa_group`)
    .set({
      id: "qa_group",
      organizationId: orgId,
      name: "Célula QA",
      status: "active",
    });
  await db
    .doc(`${root}/groups/qa_group/members/qa_group_qa_person`)
    .set({ organizationId: orgId, groupId: "qa_group", personId: "qa_person" });
  await db
    .doc(`${root}/groups/qa_group/meetings/qa_meeting`)
    .set({
      organizationId: orgId,
      groupId: "qa_group",
      meetingStatus: "scheduled",
      scheduledStartAt: new Date().toISOString(),
    });
  await receiveWhatsapp(message("PRESENCA qa_group qa_meeting"));
  await receiveWhatsapp(message("CONFIRMAR"));
  const attendance = (
    await db
      .doc(
        `${root}/groups/qa_group/meetings/qa_meeting/attendance/qa_meeting_qa_person`,
      )
      .get()
  ).data();
  assert.equal(attendance?.attendanceStatus, "present");
  assert.equal(attendance?.selfReported, true);
  const memberUid=`wa_qa_member_${runId}`,memberEmail=`${memberUid}@example.test`;
  await getAuth().createUser({uid:memberUid,email:memberEmail,password:"Local-Only-QA-2026!"});
  await db.doc(`${root}/users/${memberUid}`).set({organizationId:orgId,isActive:true,roles:["member"]});
  const signIn=await realFetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=qa",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:memberEmail,password:"Local-Only-QA-2026!",returnSecureToken:true})});
  const token=(await signIn.json()).idToken;assert.ok(token);
  const base="http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/";
  for(const path of [`${root}/whatsappContacts/${digest(phone)}`,`${root}/settings/pastoralAssistant`,`${root}/participationAttempts/private`]){
    const response=await realFetch(base+path,{headers:{Authorization:`Bearer ${token}`}});assert.equal(response.status,403,`member may not read ${path}`);
  }
  globalThis.fetch = realFetch;
  console.log(
    JSON.stringify(
      {
        ok: true,
        environment: "demo-alvo-qa emulators only",
        provider: "simulated; no real messages",
        validated: [
          "webhook replay",
          "private care confirmation",
          "visitor intake",
          "event registration",
          "opt-out for manual contact",
          "capacity and payment pending",
        "concurrent registration for the final seat",
          "unknown tenant rejection",
          "one-time verified member binding",
          "own cell attendance",
        "Firestore denies member access to conversations and private assistant settings",
        ],
        simulatedSends: sends,
      },
      null,
      2,
    ),
  );
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

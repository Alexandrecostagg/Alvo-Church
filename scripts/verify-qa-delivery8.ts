import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw new Error("Somente QA local.");

initializeApp({ projectId: "demo-alvo-qa" });
const db = getFirestore();
const orgId = `qa_d8_${randomUUID()}`;
const org = db.doc(`organizations/${orgId}`);
const adminId = "qa_admin_principal";
const memberId = "qa_admin_secundaria";
let checks = 0;

function equal(actual: unknown, expected: unknown, label: string) {
  assert.deepEqual(actual, expected, label);
  checks++;
}

async function login(who: "principal" | "secundaria") {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `admin.${who}@example.test`, password: "Local-QA-2026!", returnSecureToken: true }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).idToken as string;
}

async function api(path: string, body: object, token?: string) {
  const response = await fetch(`http://127.0.0.1:3001/api/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ organizationId: orgId, ...body }),
  });
  return { status: response.status, data: await response.json(), cache: response.headers.get("cache-control") };
}

async function direct(path: string, token: string, fields: object) {
  return (await fetch(`http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/organizations/${orgId}/${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ fields }),
  })).status;
}

async function run() {
  const adminToken = await login("principal");
  const memberToken = await login("secundaria");
  await org.set({ id: orgId, organizationId: orgId, status: "active", memberCount: 2 });
  await org.collection("settings").doc("subscription").set({ organizationId: orgId, plan: "free", billingStatus: "active" });
  await org.collection("users").doc(adminId).set({ organizationId: orgId, isActive: true, roles: ["church_admin"] });
  await org.collection("users").doc(memberId).set({ organizationId: orgId, isActive: true, roles: ["member"] });

  const eligible = "person_eligible";
  await org.collection("people").doc(eligible).set({ id: eligible, organizationId: orgId, status: "active", firstName: "Ana", lastName: "QA", whatsappPhone: "(62) 99999-1234" });
  await org.collection("people").doc("person_optout").set({ organizationId: orgId, status: "active", firstName: "Sem", lastName: "Contato", whatsappPhone: "62988887777", communicationOptOut: true });
  await org.collection("people").doc("person_invalid").set({ organizationId: orgId, status: "active", firstName: "Telefone", lastName: "Inválido", whatsappPhone: "123" });
  await org.collection("people").doc("person_inactive").set({ organizationId: orgId, status: "inactive", firstName: "Inativa", lastName: "QA", whatsappPhone: "62977776666" });

  const campaign = { action: "prepare", requestId: randomUUID(), message: "Mensagem QA", recipientIds: [eligible, "person_optout", "person_invalid", "person_inactive"] };
  equal((await api("communication/send-whatsapp", campaign)).status, 401, "Comunicação exige login");
  equal((await api("communication/send-whatsapp", campaign, memberToken)).status, 403, "Membro não prepara campanha");
  const prepared = await api("communication/send-whatsapp", campaign, adminToken);
  equal(prepared.status, 200, JSON.stringify(prepared));
  equal(prepared.cache, "private, no-store", "Campanha não usa cache");
  equal(prepared.data.recipients.map((item: any) => item.personId), [eligible], "Servidor resolve único destinatário elegível");
  equal(prepared.data.skipped.length, 3, "Opt-out, inativo e telefone inválido ficam fora");
  equal((await org.collection("communicationLog").doc(campaign.requestId).get()).data()?.sentCount, 0, "Preparar não conta envio");
  equal((await api("communication/send-whatsapp", campaign, adminToken)).data.replayed, true, "Preparação idempotente");
  equal((await api("communication/send-whatsapp", { ...campaign, message: "Outra mensagem" }, adminToken)).status, 409, "Tentativa não muda campanha");
  equal((await api("communication/send-whatsapp", { action: "complete", campaignId: campaign.requestId, confirmedRecipientIds: ["person_optout"] }, adminToken)).status, 409, "Confirmação limitada aos elegíveis");
  const completion = { action: "complete", campaignId: campaign.requestId, confirmedRecipientIds: [eligible] };
  equal((await api("communication/send-whatsapp", completion, adminToken)).status, 200, "Liderança confirma envio manual");
  equal((await api("communication/send-whatsapp", completion, adminToken)).data.replayed, true, "Confirmação repetida não duplica auditoria");
  equal((await org.collection("communicationLog").doc(campaign.requestId).get()).data()?.status, "confirmed", "Histórico distingue confirmação");
  equal(await direct("communicationLog/bypass", adminToken, { channel: { stringValue: "whatsapp" } }), 403, "Histórico não aceita escrita direta");

  const courseId = "course_qa";
  await org.collection("courses").doc(courseId).set({ id: courseId, organizationId: orgId, title: "Curso QA", description: "", isActive: true, badgeUnlockedId: "badge_qa", createdAt: new Date().toISOString() });
  await org.collection("courses").doc(courseId).collection("lessons").doc("lesson_1").set({ id: "lesson_1", organizationId: orgId, courseId, moduleId: "module", title: "Aula 1", videoUrl: "https://example.test/1", durationMinutes: 1, sortOrder: 1 });
  await org.collection("courses").doc(courseId).collection("lessons").doc("lesson_2").set({ id: "lesson_2", organizationId: orgId, courseId, moduleId: "module", title: "Aula 2", videoUrl: "https://example.test/2", durationMinutes: 1, sortOrder: 2 });
  await org.collection("badges").doc("badge_qa").set({ id: "badge_qa", organizationId: orgId, code: "QA", name: "QA", category: "training" });
  equal((await api("learning/progress", { action: "read", courseId }, memberToken)).data.status, "unlinked", "EAD recusa identidade presumida");
  await org.collection("people").doc(eligible).update({ status: "active" });
  await org.collection("memberAccountLinks").doc(memberId).set({ organizationId: orgId, userId: memberId, personId: eligible, verifiedBy: adminId });
  await org.collection("memberAccountClaims").doc(eligible).set({ organizationId: orgId, userId: memberId, personId: eligible });
  await org.collection("users").doc(memberId).update({ personId: eligible });
  const loaded = await api("learning/progress", { action: "read", courseId }, memberToken);
  equal(loaded.data.progress.memberId, eligible, "Progresso usa pessoa verificada");
  equal(await direct(`people/${eligible}/courseProgress/${courseId}`, memberToken, { memberId: { stringValue: eligible } }), 403, "Progresso direto bloqueado");
  const lessonAttempt = randomUUID();
  equal((await api("learning/progress", { action: "toggle", courseId, lessonId: "lesson_1", requestId: lessonAttempt }, memberToken)).data.progress.completedLessons, ["lesson_1"], "Primeira aula concluída");
  equal((await api("learning/progress", { action: "toggle", courseId, lessonId: "lesson_1", requestId: lessonAttempt }, memberToken)).data.replayed, true, "Retry não desfaz aula");
  const completed = await api("learning/progress", { action: "toggle", courseId, lessonId: "lesson_2", requestId: randomUUID() }, memberToken);
  equal(completed.data.progress.isCompleted, true, "Servidor conclui somente todas as aulas");
  equal((await org.collection("people").doc(eligible).collection("badges").get()).size, 1, "Badge concedido pelo servidor");
  equal((await api("learning/progress", { action: "toggle", courseId, lessonId: "missing", requestId: randomUUID() }, memberToken)).status, 404, "Aula externa recusada");

  const programId = "platform_program_qa";
  await db.collection("platformPrograms").doc(programId).set({ id: programId, title: "Trilha QA", isPublished: true, badgeUnlockedId: "badge_qa" });
  await db.collection("platformPrograms").doc(programId).collection("lessons").doc("platform_lesson").set({ id: "platform_lesson", programId, title: "Aula da trilha", videoUrl: "https://example.test/platform", durationMinutes: 1, sortOrder: 1 });
  await org.collection("programEntitlements").doc(programId).set({ organizationId: orgId, programId, status: "active" });
  equal((await api("learning/progress", { action: "read", courseId: programId, catalog: "platform" }, memberToken)).status, 200, "Entitlement libera trilha comprada");
  equal((await api("learning/progress", { action: "toggle", courseId: programId, lessonId: "platform_lesson", catalog: "platform", requestId: randomUUID() }, memberToken)).data.progress.isCompleted, true, "Trilha global usa progresso protegido");
  await org.collection("programEntitlements").doc(programId).update({ status: "revoked" });
  equal((await api("learning/progress", { action: "read", courseId: programId, catalog: "platform" }, memberToken)).status, 404, "Reembolso revoga acesso ao progresso");

  const freeEventId = "event_free_qa";
  await org.collection("events").doc(freeEventId).set({ id: freeEventId, organizationId: orgId, name: "Evento gratuito QA", slug: "evento-gratuito-qa", status: "published", type: "service", locationType: "onsite", startsAt: new Date().toISOString(), capacity: 2, isPaid: false });
  const memberRegistration = await api("events/attendance", { action: "member", eventId: freeEventId, requestId: randomUUID() }, memberToken);
  equal(memberRegistration.status, 200, JSON.stringify(memberRegistration));
  equal(memberRegistration.data.registration.paymentStatus, "not_required", "App recebe inscrição gratuita validada");
  equal((await api("events/attendance", { action: "member", eventId: freeEventId, requestId: randomUUID() }, memberToken)).data.replayed, true, "Uma inscrição ativa por conta");

  const eventId = "event_paid_qa";
  await org.collection("events").doc(eventId).set({ id: eventId, organizationId: orgId, name: "Evento QA", slug: "evento-qa", status: "published", type: "conference", locationType: "onsite", startsAt: new Date().toISOString(), capacity: 1, isPaid: true });
  const forgedFields = {
    id: { stringValue: "forged" }, organizationId: { stringValue: orgId }, eventId: { stringValue: eventId }, responsiblePersonId: { stringValue: memberId },
    registrationCode: { stringValue: "ESD-FORGE" }, status: { stringValue: "confirmed" }, paymentStatus: { stringValue: "paid" }, registeredAt: { timestampValue: new Date().toISOString() },
  };
  equal(await direct(`events/${eventId}/registrations/forged`, memberToken, forgedFields), 403, "Membro não se declara pago");
  const guestBody = { action: "guest", eventId, requestId: randomUUID(), firstName: "Convidado", lastName: "QA", email: "guest@example.test" };
  equal((await api("events/attendance", guestBody, memberToken)).status, 403, "Membro não cria walk-in");
  const guest = await api("events/attendance", guestBody, adminToken);
  equal(guest.status, 200, JSON.stringify(guest));
  equal(guest.data.registration.paymentStatus, "pending", "Evento pago nasce pendente");
  equal((await api("events/attendance", guestBody, adminToken)).data.replayed, true, "Walk-in idempotente");
  equal((await api("events/attendance", { ...guestBody, requestId: randomUUID(), email: "second@example.test" }, adminToken)).status, 409, "Capacidade respeitada");
  const registrationId = guest.data.registration.id;
  equal((await api("events/attendance", { action: "checkin", eventId, registrationId }, adminToken)).status, 409, "Check-in exige pagamento");
  equal((await api("events/attendance", { action: "payment", eventId, registrationId }, adminToken)).status, 200, "Pagamento confirmado");
  const checkin = await api("events/attendance", { action: "checkin", eventId, registrationId }, adminToken);
  equal(checkin.status, 200, JSON.stringify(checkin));
  equal(Boolean(checkin.data.registration.checkedInAt), true, "Check-in carimbado");
  equal((await api("events/attendance", { action: "checkin", eventId, registrationId }, adminToken)).data.replayed, true, "Check-in idempotente");
  equal(await direct(`events/${eventId}/registrations/${registrationId}`, adminToken, { checkedInAt: { timestampValue: new Date().toISOString() } }), 403, "Operação direta de presença bloqueada");
  equal((await org.collection("eventAttendanceAudit").get()).size >= 3, true, "Eventos geram auditoria");
  equal((await org.collection("settings").doc("subscription").get()).data()?.plan, "free", "Plano gratuito preservado");
  equal((await org.collection("people").get()).size, 4, "Entrega não cria membros nem altera limite 50");
}

run().then(async () => {
  console.log(`Delivery 8 QA: ${checks} checks passed.`);
  await db.recursiveDelete(org);
  process.exit(0);
}).catch(async (error) => {
  console.error(error);
  await db.recursiveDelete(org).catch(() => {});
  process.exit(1);
});

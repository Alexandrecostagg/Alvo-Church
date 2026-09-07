import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { publicPortalSnapshot } from "../apps/web/app/api/_lib/public-portal";

if (process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw new Error("Somente QA local.");

initializeApp({ projectId: "demo-alvo-qa" });
const db = getFirestore();
const orgId = `qa_d9_${randomUUID()}`;
const org = db.doc(`organizations/${orgId}`);
const slug = `igreja-${randomUUID().slice(0, 8)}`;
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
  await org.set({ id: orgId, organizationId: orgId, status: "active", displayName: "Igreja QA Entrega 9", memberCount: 2 });
  await db.collection("org_slugs").doc(slug).set({ organizationId: orgId, displayName: "Igreja QA Entrega 9" });
  await org.collection("settings").doc("subscription").set({ organizationId: orgId, plan: "free", billingStatus: "active" });
  await org.collection("users").doc(adminId).set({ organizationId: orgId, isActive: true, roles: ["church_admin"] });
  await org.collection("users").doc(memberId).set({ organizationId: orgId, isActive: true, roles: ["member"] });

  const courseId = "course_delivery9";
  const courseDraft = { action: "save_course", requestId: randomUUID(), courseId, title: "Curso seguro", description: "QA", thumbnailUrl: "", instructorName: "", instructorTitle: "", isActive: false };
  equal((await api("learning/manage", courseDraft)).status, 401, "Curso exige login");
  equal((await api("learning/manage", courseDraft, memberToken)).status, 403, "Membro não administra curso");
  const createdCourse = await api("learning/manage", courseDraft, adminToken);
  equal(createdCourse.status, 200, JSON.stringify(createdCourse));
  equal(createdCourse.data.course.isActive, false, "Curso nasce como rascunho");
  equal(createdCourse.cache, "private, no-store", "Administração EAD não usa cache");
  equal((await api("learning/manage", courseDraft, adminToken)).data.replayed, true, "Criação de curso é idempotente");
  equal(await direct(`courses/${courseId}`, adminToken, { title: { stringValue: "Bypass" } }), 403, "Curso recusa escrita direta");
  equal((await api("learning/manage", { ...courseDraft, requestId: randomUUID(), isActive: true }, adminToken)).status, 409, "Curso vazio não é publicado");

  const moduleBody = { action: "save_module", requestId: randomUUID(), courseId, moduleId: "module_1", title: "Módulo 1", sortOrder: 0 };
  equal((await api("learning/manage", moduleBody, adminToken)).status, 200, "Módulo salvo pelo servidor");
  equal((await api("learning/manage", { action: "save_lesson", requestId: randomUUID(), courseId, moduleId: "module_1", lessonId: "lesson_bad", title: "Aula ruim", videoUrl: "https://youtube.com.evil.test/video", durationMinutes: 10, sortOrder: 0, materialUrl: "" }, adminToken)).status, 400, "Host de vídeo forjado é recusado");
  const lessonBody = { action: "save_lesson", requestId: randomUUID(), courseId, moduleId: "module_1", lessonId: "lesson_1", title: "Aula 1", videoUrl: "https://youtu.be/abc", durationMinutes: 10, sortOrder: 0, materialUrl: "https://example.test/material.pdf" };
  equal((await api("learning/manage", lessonBody, adminToken)).status, 200, "Aula válida salva pelo servidor");
  const published = await api("learning/manage", { ...courseDraft, requestId: randomUUID(), isActive: true }, adminToken);
  equal(published.data.course.isActive, true, "Curso com conteúdo pode ser publicado");
  equal((await api("learning/manage", { ...moduleBody, requestId: randomUUID(), moduleId: "module_2" }, adminToken)).status, 409, "Conteúdo publicado não muda silenciosamente");
  equal((await org.collection("courseManagementAudit").get()).size >= 4, true, "Alterações EAD geram auditoria");
  equal(await direct(`courses/${courseId}/lessons/bypass`, adminToken, { courseId: { stringValue: courseId } }), 403, "Aula recusa escrita direta");

  const eventId = "event_delivery9";
  const event = { action: "save", requestId: randomUUID(), eventId, name: "Conferência QA", description: "Evento público seguro", type: "conference", status: "published", locationType: "onsite", startsAt: new Date(Date.now() + 86400000).toISOString(), endsAt: new Date(Date.now() + 90000000).toISOString(), capacity: 20, isPaid: false, locationName: "Auditório", priceAmount: 0 };
  equal((await api("events/manage", event, memberToken)).status, 403, "Membro não administra evento");
  const savedEvent = await api("events/manage", event, adminToken);
  equal(savedEvent.status, 200, JSON.stringify(savedEvent));
  equal(savedEvent.data.event.status, "published", "Evento publicado pelo servidor");
  equal((await api("events/manage", event, adminToken)).data.replayed, true, "Evento é idempotente");
  equal(await direct(`events/${eventId}`, adminToken, { name: { stringValue: "Bypass" } }), 403, "Evento recusa escrita direta");
  equal((await api("events/manage", { ...event, requestId: randomUUID(), eventId: "event_bad_price", isPaid: true, priceAmount: 0 }, adminToken)).status, 400, "Evento pago exige valor válido");

  const portal = await publicPortalSnapshot(slug, Date.now());
  equal(portal.displayName, "Igreja QA Entrega 9", "Portal usa nome real da igreja");
  equal(portal.events.map((item) => item.id), [eventId], "Portal expõe somente evento publicado futuro");
  equal("organizationId" in portal.events[0], false, "Portal não projeta tenant interno");

  const emptyEvent = { ...event, requestId: randomUUID(), eventId: "event_empty", name: "Evento vazio" };
  equal((await api("events/manage", emptyEvent, adminToken)).status, 200, "Segundo evento criado");
  const removed = await api("events/manage", { action: "remove", requestId: randomUUID(), eventId: "event_empty" }, adminToken);
  equal(removed.data.removal, "deleted", "Evento sem inscrição é excluído");
  equal((await org.collection("events").doc("event_empty").get()).exists, false, "Exclusão vazia é efetiva");

  await org.collection("events").doc(eventId).collection("registrations").doc("registration_1").set({ id: "registration_1", organizationId: orgId, eventId, status: "confirmed", paymentStatus: "not_required", responsiblePersonId: memberId, registrationCode: "ESD-QA", registeredAt: new Date().toISOString() });
  equal((await api("events/manage", { ...event, requestId: randomUUID(), isPaid: true, priceAmount: 10 }, adminToken)).status, 409, "Cobrança não muda após inscrição");
  const cancelled = await api("events/manage", { action: "remove", requestId: randomUUID(), eventId }, adminToken);
  equal(cancelled.data.removal, "cancelled", "Evento com inscrição é cancelado");
  equal((await org.collection("events").doc(eventId).get()).data()?.status, "cancelled", "Cancelamento preserva o evento");
  equal((await org.collection("events").doc(eventId).collection("registrations").doc("registration_1").get()).exists, true, "Cancelamento preserva inscrição");
  equal((await api("events/manage", { ...event, requestId: randomUUID() }, adminToken)).status, 409, "Evento cancelado não é reaberto");
  equal((await org.collection("eventManagementAudit").get()).size >= 3, true, "Gestão de eventos gera auditoria");
  equal((await org.collection("settings").doc("subscription").get()).data()?.plan, "free", "Plano gratuito continua ativo");
  equal((await org.collection("people").get()).size, 0, "Entrega não cria membros nem altera o teto de 50");
}

run().then(async () => {
  console.log(`Delivery 9 QA: ${checks} checks passed.`);
  await db.recursiveDelete(org);
  await db.collection("org_slugs").doc(slug).delete();
  process.exit(0);
}).catch(async (error) => {
  console.error(error);
  await db.recursiveDelete(org).catch(() => {});
  await db.collection("org_slugs").doc(slug).delete().catch(() => {});
  process.exit(1);
});

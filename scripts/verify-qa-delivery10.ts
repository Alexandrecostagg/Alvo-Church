import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") {
  throw new Error("Somente QA local.");
}

initializeApp({ projectId: "demo-alvo-qa" });
const db = getFirestore();
const orgId = `qa_d10_${randomUUID()}`;
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

async function api(body: object, token?: string) {
  const response = await fetch("http://127.0.0.1:3001/api/marketplace/moderate", {
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
  await org.set({ id: orgId, organizationId: orgId, status: "active", displayName: "Igreja QA Entrega 10", memberCount: 2 });
  await org.collection("settings").doc("subscription").set({ organizationId: orgId, plan: "free", billingStatus: "active" });
  await org.collection("users").doc(adminId).set({ organizationId: orgId, isActive: true, roles: ["church_admin"] });
  await org.collection("users").doc(memberId).set({ organizationId: orgId, isActive: true, roles: ["member"] });
  const store = { id: "store_pending", organizationId: orgId, ownerId: memberId, name: "Loja QA", description: "Loja criada para homologação", category: "services", status: "pending", images: [], contact: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await org.collection("communityStores").doc(store.id).set(store);

  const requestId = randomUUID();
  equal((await api({ requestId, storeId: store.id, action: "approve" })).status, 401, "Moderação exige login");
  equal((await api({ requestId, storeId: store.id, action: "approve" }, memberToken)).status, 403, "Membro não modera loja");
  const approved = await api({ requestId, storeId: store.id, action: "approve" }, adminToken);
  equal(approved.status, 200, JSON.stringify(approved));
  equal(approved.data.store.status, "approved", "Aprovação muda o status");
  equal(approved.cache, "private, no-store", "Moderação não usa cache público");
  equal((await api({ requestId, storeId: store.id, action: "approve" }, adminToken)).data.replayed, true, "Aprovação é idempotente");
  equal((await api({ requestId, storeId: store.id, action: "suspend", reason: "Outro uso" }, adminToken)).status, 409, "Tentativa não muda de significado");
  equal(await direct(`communityStores/${store.id}`, adminToken, { status: { stringValue: "suspended" } }), 403, "Admin não burla moderação pelo cliente");
  equal(await direct("communityStoreModerationLogs/fake", adminToken, { organizationId: { stringValue: orgId }, moderatedBy: { stringValue: adminId } }), 403, "Log não pode ser forjado no cliente");
  equal((await api({ requestId: randomUUID(), storeId: store.id, action: "suspend", reason: "não" }, adminToken)).status, 400, "Suspensão exige motivo útil");

  const suspended = await api({ requestId: randomUUID(), storeId: store.id, action: "suspend", reason: "Conteúdo incompatível com a comunidade" }, adminToken);
  equal(suspended.status, 200, JSON.stringify(suspended));
  equal(suspended.data.store.status, "suspended", "Loja aprovada pode ser suspensa");
  equal(suspended.data.store.suspensionReason, "Conteúdo incompatível com a comunidade", "Suspensão preserva o motivo");
  equal((await api({ requestId: randomUUID(), storeId: store.id, action: "approve" }, adminToken)).status, 409, "Loja suspensa não volta sem fluxo próprio");

  const rejectedStore = { ...store, id: "store_rejected", name: "Outra loja" };
  await org.collection("communityStores").doc(rejectedStore.id).set(rejectedStore);
  const rejected = await api({ requestId: randomUUID(), storeId: rejectedStore.id, action: "reject", reason: "Cadastro sem dados suficientes" }, adminToken);
  equal(rejected.status, 200, JSON.stringify(rejected));
  equal(rejected.data.store.status, "rejected", "Loja pendente pode ser rejeitada");
  equal(rejected.data.store.rejectionReason, "Cadastro sem dados suficientes", "Rejeição preserva o motivo");
  equal((await org.collection("communityStoreModerationLogs").get()).size, 3, "Cada transição gera um log atômico");
  equal((await org.collection("settings").doc("subscription").get()).data()?.plan, "free", "Plano gratuito continua ativo");
  equal((await org.collection("people").get()).size, 0, "Entrega não cria membros nem altera o teto de 50");
}

run().then(async () => {
  console.log(`Delivery 10 QA: ${checks} checks passed.`);
  await db.recursiveDelete(org);
  process.exit(0);
}).catch(async (error) => {
  console.error(error);
  await db.recursiveDelete(org).catch(() => {});
  process.exit(1);
});

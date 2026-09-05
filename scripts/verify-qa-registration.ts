import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw new Error("Somente emuladores locais de QA.");
initializeApp({ projectId: "demo-alvo-qa" });
const db = getFirestore();
const runId = randomUUID();
const orgId = `org_qa_registration_${runId}`;
const org = db.doc(`organizations/${orgId}`);
const limitedOrgId = `org_qa_limit_${runId}`;
const limitedOrg = db.doc(`organizations/${limitedOrgId}`);
async function signIn(suffix: string) {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `admin.${suffix}@example.test`, password: "Local-QA-2026!", returnSecureToken: true }) });
  assert.equal(response.status, 200, "Execute qa:seed antes.");
  return (await response.json()).idToken as string;
}
async function post(body: object, token?: string) {
  const response = await fetch("http://127.0.0.1:3001/api/members", { method: "POST", headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
function payload(cpf?: string) {
  return { organizationId: orgId, requestId: randomUUID(), person: { firstName: "QA", lastName: "Transação", cpf, birthDate: "2000-02-29", partnerBenefitsEnabled: false }, family: { familyName: "Família QA transação" }, familyMember: { relationshipType: "self", isPrimaryContact: true }, consent: false };
}
async function deniedDirect(path: string, method: string, token: string, fields?: object) {
  const response = await fetch(`http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${path}`, { method, headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(fields ? { body: JSON.stringify({ fields }) } : {}) });
  assert.equal(response.status, 403, `Escrita/leitura direta deveria ser bloqueada: ${path}`);
}

async function run() {
  const adminToken = await signIn("principal");
  const memberToken = await signIn("secundaria");
  const seed = db.batch();
  for (const ref of [org, limitedOrg]) {
    seed.set(ref, { id: ref.id, status: "active", memberCount: 0 });
    seed.set(ref.collection("users").doc("qa_admin_principal"), { organizationId: ref.id, isActive: true, roles: ["church_admin"] });
    seed.set(ref.collection("settings").doc("subscription"), { plan: ref.id === orgId ? "pastoral" : "free", billingStatus: "active" });
  }
  seed.set(org.collection("users").doc("qa_admin_secundaria"), { organizationId: orgId, isActive: true, roles: ["member"] });
  seed.set(org.collection("kidsCheckIns").doc("own"), { organizationId: orgId, parentId: "qa_admin_secundaria", authorizedPickUpIds: ["qa_admin_secundaria"], status: "checked_in", childName: "Criança QA A" });
  seed.set(org.collection("kidsCheckIns").doc("other"), { organizationId: orgId, parentId: "other_guardian", authorizedPickUpIds: [], status: "checked_in", childName: "Criança QA B" });
  for (let i = 0; i < 49; i++) seed.set(limitedOrg.collection("people").doc(`existing_${i}`), { organizationId: limitedOrgId, firstName: "QA", memberStatus: "member" });
  await seed.commit();
  const kidsOwn = await fetch(`http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${org.path}/kidsCheckIns/own`, { headers: { Authorization: `Bearer ${memberToken}` } });
  assert.equal(kidsOwn.status, 200);
  await deniedDirect(`${org.path}/kidsCheckIns/other`, "GET", memberToken);
  await deniedDirect(`${org.path}/kidsCheckIns`, "GET", memberToken);
  await deniedDirect(`${org.path}/kidsCheckIns/own`, "PATCH", memberToken, { status: { stringValue: "checked_out" } });
  const kidsOperator = await fetch(`http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${org.path}/kidsCheckIns`, { headers: { Authorization: `Bearer ${adminToken}` } });
  assert.equal(kidsOperator.status, 200);
  const sample = payload("52998224725");
  assert.equal((await post(sample)).status, 401);
  assert.equal((await post(sample, memberToken)).status, 403);
  assert.equal((await post({ ...sample, organizationId: "org_qa_secundaria" }, adminToken)).status, 403);
  assert.equal((await post({ ...sample, person: { ...sample.person, partnerBenefitsEnabled: true } }, adminToken)).status, 400);
  const concurrent = await Promise.all([post(sample, adminToken), post({ ...sample, requestId: randomUUID() }, adminToken)]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409], JSON.stringify(concurrent));
  const winner = concurrent.find(r => r.status === 200)!.data;
  assert.equal((await org.collection("people").get()).size, 1);
  assert.equal((await org.collection("families").get()).size, 1);
  assert.equal((await org.collection("families").doc(winner.familyId).collection("members").get()).size, 1);
  assert.equal((await org.collection("memberCpfClaims").get()).size, 1);
  const successfulInput = { ...sample, requestId: winner.personId.slice("person_".length) };
  const replay = await post(successfulInput, adminToken);
  assert.equal(replay.status, 200);
  assert.equal(replay.data.personId, winner.personId);
  assert.equal(replay.data.replayed, true);
  assert.equal((await post({ ...successfulInput, person: { ...sample.person, firstName: "Changed" } }, adminToken)).status, 409);

  const withPass = payload();
  withPass.consent = true; withPass.person.partnerBenefitsEnabled = true;
  const passResult = await post(withPass, adminToken);
  assert.equal(passResult.status, 200, JSON.stringify(passResult));
  assert.match(passResult.data.memberCardCode, /^ESDRAS-[A-HJ-NP-Z2-9]{24}$/);
  const savedPass = (await org.collection("people").doc(passResult.data.personId).get()).data()!;
  assert.ok(savedPass.consentLgpdAt);
  assert.equal(savedPass.memberCardCode, passResult.data.memberCardCode);
  await deniedDirect(`${org.path}/people/direct`, "PATCH", adminToken, { organizationId: { stringValue: orgId }, cpf: { stringValue: "52998224725" } });
  const existingFields = (await fetch(`http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${org.path}/people/${winner.personId}`, { headers: { Authorization: `Bearer ${adminToken}` } }).then(r => r.json())).fields;
  await deniedDirect(`${org.path}/people/${winner.personId}`, "PATCH", adminToken, { ...existingFields, memberCardCode: { stringValue: "forged" } });
  await deniedDirect(`${org.path}/memberRegistrations/${successfulInput.requestId}`, "GET", adminToken);

  const failed = payload();
  await org.collection("families").doc(`family_${failed.requestId}`).set({ fixture: true });
  const failedResult = await post(failed, adminToken);
  assert.ok([409, 503].includes(failedResult.status), JSON.stringify(failedResult));
  assert.equal((await org.collection("people").doc(`person_${failed.requestId}`).get()).exists, false);
  assert.equal((await org.collection("memberRegistrations").doc(failed.requestId).get()).exists, false);
  assert.equal((await org.get()).data()!.memberCount, 2);

  const limited = await Promise.all([1, 2].map(() => post({ ...payload(), organizationId: limitedOrgId }, adminToken)));
  assert.deepEqual(limited.map(r => r.status).sort(), [200, 409], JSON.stringify(limited));
  assert.equal((await limitedOrg.collection("people").get()).size, 50);
  assert.equal((await limitedOrg.get()).data()!.memberCount, 50);
  console.log("QA transacional OK: Kids por responsável/operador, autorização, CPF concorrente, repetição idempotente, Passe/consentimento, escrita direta negada, rollback e limite 49→50.");
}
run().finally(async () => {
  // Only the unique organizations created by this run are removed.
  await db.recursiveDelete(org);
  await db.recursiveDelete(limitedOrg);
}).catch((error) => { console.error(error); process.exitCode = 1; });

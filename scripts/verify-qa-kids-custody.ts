import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
if (process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw new Error("Somente QA local.");
initializeApp({ projectId: "demo-alvo-qa" });
const db = getFirestore(), orgId = `org_qa_custody_${randomUUID()}`, org = db.doc(`organizations/${orgId}`);
const admin = "qa_admin_principal", member = "qa_admin_secundaria";
let checks = 0;
function equal(actual: unknown, expected: unknown, label: string) { assert.deepEqual(actual, expected, label); checks++; }
async function login(suffix: string) {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `admin.${suffix}@example.test`, password: "Local-QA-2026!", returnSecureToken: true }) });
  assert.equal(response.status, 200); return (await response.json()).idToken as string;
}
async function api(body: object, token?: string, path = "custody") {
  const response = await fetch(`http://127.0.0.1:3001/api/kids/${path}`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ organizationId: orgId, ...body }) });
  equal(response.headers.get("cache-control"), "private, no-store", "Resposta privada");
  return { status: response.status, data: await response.json() };
}
const input = () => ({ action: "check_in", requestId: randomUUID(), childName: "Criança QA", guardianName: "Responsável QA", guardianEmail: "admin.secundaria@example.test", authorizedNames: ["Avó QA"], identityConfirmed: true });
async function direct(id: string, token: string, method = "PATCH", fields: object = { status: { stringValue: "checked_out" } }) {
  return (await fetch(`http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${org.path}/kidsCheckIns/${id}?updateMask.fieldPaths=status`, { method, headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(method === "PATCH" ? { body: JSON.stringify({ fields }) } : {}) })).status;
}
async function run() {
  const a = await login("principal"), m = await login("secundaria");
  await org.set({ status: "active", memberCount: 50 });
  await org.collection("settings").doc("subscription").set({ plan: "free" });
  await org.collection("users").doc(admin).set({ organizationId: orgId, isActive: true, roles: ["church_admin"], email: "admin.principal@example.test" });
  await org.collection("users").doc(member).set({ organizationId: orgId, isActive: true, roles: ["member"], email: "admin.secundaria@example.test" });
  const sample = input();
  equal((await api(sample)).status, 401, "Sem autenticação");
  equal((await api(sample, m)).status, 403, "Responsável não registra operação da equipe");
  equal((await api({ ...sample, organizationId: "foreign" }, a)).status, 403, "Outra igreja");
  equal((await api({ ...sample, identityConfirmed: false }, a)).status, 400, "Conferência obrigatória");
  equal((await api({ ...sample, guardianEmail: "missing@example.test" }, a)).status, 409, "Conta ausente não vira operador");
  await org.collection("users").doc("duplicate").set({ organizationId: orgId, isActive: true, email: "admin.secundaria@example.test" });
  equal((await api(sample, a)).status, 409, "E-mail duplicado não associa pessoa arbitrária");
  await org.collection("users").doc("duplicate").delete();
  const results = await Promise.all([api(sample, a), api(sample, a)]);
  equal(results.map(r => r.status), [200, 200], JSON.stringify(results));
  const ci = results[0].data.checkIn;
  equal((await org.collection("kidsCheckIns").get()).size, 1, "Retry concorrente cria uma entrada");
  equal((await org.collection("kidsCustodyAudit").get()).size, 1, "Uma auditoria de entrada");
  equal(ci.parentId, member, "Responsável é a conta escolhida");
  equal(ci.checkedInByUserId, admin, "Operador separado do responsável");
  assert.notEqual(ci.id, ci.securityToken);
  equal((await api({ ...sample, childName: "Outra criança" }, a)).status, 409, "Não reaproveitar tentativa com outro cadastro");
  equal((await api({ checkInId: ci.id }, m, "qr")).status, 200, "Responsável recebe crachá");
  for (const token of [a, m]) {
    equal(await direct(ci.id, token), 403, "Retirada direta negada");
    equal(await direct("forged", token), 403, "Entrada direta negada");
    equal(await direct(ci.id, token, "DELETE"), 403, "Exclusão direta negada");
  }
  const checkout = { action: "check_out", requestId: randomUUID(), checkInId: ci.id, expectedGuardianVersion: 1, receiverId: "primary", proof: ci.pickupCode, identityConfirmed: true };
  equal((await api(checkout, m)).status, 403, "Responsável não confirma própria retirada como equipe");
  equal((await api({ ...checkout, receiverId: "stranger", note: "Autorizado por mensagem" }, a)).status, 403, "Observação não cria autorização");
  equal((await api({ ...checkout, proof: "incorrect-code" }, a)).status, 403, "Código errado");
  equal((await api({ ...checkout, identityConfirmed: false }, a)).status, 400, "Identidade deve ser conferida");
  const guardians = { action: "guardians", checkInId: ci.id, expectedGuardianVersion: 1, guardianName: "Visitante QA", guardianEmail: "", authorizedNames: ["Avó QA"], reason: "Responsável corrigido após conferência", identityConfirmed: true };
  equal((await api(guardians, m)).status, 403, "Responsável não autoaltera lista");
  const changed = await api(guardians, a);
  equal(changed.status, 200, "Correção auditada");
  equal(changed.data.checkIn.parentId, "", "Visitante não recebe UID do operador");
  equal((await api({ checkInId: ci.id }, m, "qr")).status, 403, "Revogação do acesso antigo");
  equal((await api(checkout, a)).status, 409, "Formulário de retirada desatualizado não libera");
  equal((await api(guardians, a)).status, 409, "Não sobrescrever alteração concorrente de responsáveis");
  const release = { ...checkout, expectedGuardianVersion: 2, receiverId: "authorized_1", proof: ci.securityToken };
  await org.collection("settings").doc("kids").set({ qrGeneratorRoles: ["ministry_leader"] });
  await org.collection("users").doc(member).update({ roles: ["ministry_leader"] });
  const race = await Promise.all([api(release, a), api({ ...release, requestId: randomUUID() }, m)]);
  equal(race.map(r => r.status).sort(), [200, 409], JSON.stringify(race));
  const stored = (await org.collection("kidsCheckIns").doc(ci.id).get()).data()!;
  equal(stored.status, "checked_out", "Uma retirada concluída");
  equal(stored.releasedTo, "Avó QA", "Identidade vem da lista confirmada");
  equal(stored.checkedOutByParentId, null, "Pessoa sem conta não vira operador");
  equal((await org.collection("kidsCustodyAudit").where("action", "==", "check_out").get()).size, 1, "Uma auditoria de retirada");
  const replay = { ...release, requestId: stored.checkoutRequestId };
  equal((await api(replay, stored.checkedOutByUserId === admin ? a : m)).data.replayed, true, "Retry do vencedor idempotente");
  equal((await api({ ...release, requestId: randomUUID() }, a)).status, 409, "Repetição nova bloqueada");
  equal((await api({ checkInId: ci.id }, a, "qr")).status, 409, "QR revogado após retirada");
  equal((await api(sample, a)).status, 409, "Retry de entrada encerrada não reabre criança");
  const competing = (await api(input(), a)).data.checkIn;
  const custodyRace = await Promise.all([
    api({ ...guardians, checkInId: competing.id, expectedGuardianVersion: 1 }, a),
    api({ ...checkout, checkInId: competing.id, requestId: randomUUID(), proof: competing.pickupCode }, a),
  ]);
  equal(custodyRace.map(r => r.status).sort(), [200, 409], "Correção de responsável e retirada não confirmam simultaneamente com a mesma versão");
  await org.collection("kidsCheckIns").doc("legacy").set({ organizationId: orgId, parentId: admin, authorizedPickUpIds: [], guardianName: "Legado", status: "checked_in", securityToken: "KID-legacy-security-token-123456", pickupCode: "KD-LEGACY" });
  equal((await api({ ...checkout, checkInId: "legacy", expectedGuardianVersion: 0, proof: "KD-LEGACY" }, a)).status, 409, "Legado requer confirmação");
  const fixed = await api({ ...guardians, checkInId: "legacy", expectedGuardianVersion: 0, guardianEmail: "admin.secundaria@example.test" }, a);
  equal(fixed.status, 200, "Regularização explícita de legado");
  equal(fixed.data.checkIn.parentId, member, "Legado deixa de vincular operador indevidamente");
  await org.collection("users").doc(member).update({ isActive: false });
  equal((await api({ ...checkout, checkInId: "legacy", proof: "KD-LEGACY" }, a)).status, 409, "Conta de responsável inativa não libera automaticamente");
  await org.update({ status: "inactive" });
  equal((await api({ ...input(), guardianEmail: "" }, a)).status, 403, "Igreja inativa");
  equal((await org.get()).data()!.memberCount, 50, "Kids não altera o limite nem o contador de membros");
  console.log(`QA custódia Kids OK: ${checks} verificações; vínculo, legado, concorrência, auditoria, idempotência e retirada autorizada.`);
}
run().finally(() => db.recursiveDelete(org)).catch(error => { console.error(error); process.exitCode = 1; });

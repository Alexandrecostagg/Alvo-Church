import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw new Error("Somente emuladores locais de QA.");
initializeApp({ projectId: "demo-alvo-qa" });
const db = getFirestore();
const orgId = `org_qa_pass_${randomUUID()}`;
const org = db.doc(`organizations/${orgId}`);
const admin = "qa_admin_principal", member = "qa_admin_secundaria";
const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const jsQR = webRequire("jsqr");
const { PNG } = createRequire(webRequire.resolve("qrcode"))("pngjs");
let checks = 0;
function equal(actual: unknown, expected: unknown, label: string) { assert.deepEqual(actual, expected, label); checks++; }
async function signIn(suffix: string) {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `admin.${suffix}@example.test`, password: "Local-QA-2026!", returnSecureToken: true }) });
  assert.equal(response.status, 200, "Execute qa:seed antes.");
  return (await response.json()).idToken as string;
}
async function api(route: string, token?: string, body?: object) {
  const response = await fetch(`http://127.0.0.1:3001/api/members/${route}`, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  equal(response.headers.get("cache-control"), "private, no-store", "Respostas privadas, inclusive erros");
  return { status: response.status, data: await response.json() };
}
const pass = (token?: string, extra = "") => api(`pass?organizationId=${orgId}${extra}`, token);
const link = (token: string, userId: string, personId: string | null, expectedPersonId: string | null = null) => api("account-link", token, { organizationId: orgId, userId, personId, expectedPersonId });
async function direct(path: string, token: string, method = "GET", field?: string, value?: object) {
  const response = await fetch(`http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${org.path}/${path}${field ? `?updateMask.fieldPaths=${field}` : ""}`, { method, headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(field ? { body: JSON.stringify({ fields: { [field]: value } }) } : {}) });
  return response.status;
}
async function run() {
  const adminToken = await signIn("principal"), memberToken = await signIn("secundaria");
  const base = { organizationId: orgId, firstName: "Pessoa", lastName: "QA", status: "active", partnerBenefitsEnabled: true, consentLgpdAt: "2026-09-05T12:00:00.000Z", memberCardCode: "ESDRAS-ABCDEFGHJKLMNPQRSTUVWXYZ23", cpf: "52998224725", householdIncomeRange: "private", address: { city: "Private" } };
  await org.set({ id: orgId, status: "active", name: "Igreja QA Passe" });
  await org.collection("users").doc(admin).set({ organizationId: orgId, isActive: true, roles: ["church_admin"] });
  await org.collection("users").doc(member).set({ organizationId: orgId, isActive: true, roles: ["member"], personId: "person_1" });
  for (const id of ["person_1", "person_2"]) await org.collection("people").doc(id).set({ ...base, id });
  await org.collection("people").doc("foreign").set({ ...base, organizationId: "another_org" });
  await org.collection("memberBenefitValidations").doc("other").set({ organizationId: orgId, personId: "person_2", memberCardCode: base.memberCardCode });
  equal((await pass()).status, 401, "Sem autenticação");
  equal((await pass(memberToken)).data.status, "unlinked", "personId legado não comprova identidade");
  equal((await link(memberToken, member, "person_1")).status, 403, "Membro não vincula");
  for (const role of ["pastor", "secretary"]) {
    await org.collection("users").doc(member).update({ roles: [role] });
    equal((await link(memberToken, member, "person_1")).status, 403, `${role} não gerencia vínculo`);
  }
  await org.collection("users").doc(member).update({ roles: ["member"] });
  equal((await api("account-link", adminToken, { organizationId: "org_qa_secundaria", userId: member, personId: "person_1", expectedPersonId: null })).status, 403, "Outra igreja negada");
  equal((await link(adminToken, "missing", "person_1")).status, 404, "Conta ausente");
  equal((await link(adminToken, member, "foreign")).status, 404, "Pessoa de outra igreja");
  for (const token of [adminToken, memberToken]) {
    equal(await direct(`users/${member}`, token, "PATCH", "personId", { stringValue: "person_2" }), 403, "personId protegido inclusive de escrita direta do admin");
    for (const collection of ["memberAccountLinks", "memberAccountClaims", "memberAccountAudit"]) equal(await direct(`${collection}/forged`, token, "PATCH", "userId", { stringValue: member }), 403, "Coleção exclusiva do servidor");
  }
  equal(await direct("people/person_1", memberToken), 403, "Legado não libera leitura");
  equal(await direct("people", memberToken), 403, "Membro não lista cadastros e códigos");
  equal(await direct("people", adminToken), 200, "Admin continua operando pessoas");
  equal((await link(adminToken, member, "person_1")).status, 200, "Admin confirma vínculo");
  equal((await api(`account-link?organizationId=${orgId}&userId=${member}`, adminToken)).data.personId, "person_1", "Consulta autoritativa");
  equal((await link(adminToken, member, "person_1", "person_1")).status, 200, "Repetição idempotente");
  equal((await org.collection("memberAccountAudit").get()).size, 1, "Uma auditoria por mudança");
  equal(await direct("people/person_1", memberToken), 200, "Leitura própria com vínculo");
  equal(await direct("people/person_2", memberToken), 403, "Cadastro alheio negado");
  equal(await direct("memberBenefitValidations/other", memberToken), 403, "Validação alheia negada");
  equal(await direct(`users/${member}`, memberToken, "PATCH", "occupation", { stringValue: "QA" }), 200, "Perfil pessoal continua editável");
  equal(await direct(`users/${member}`, memberToken, "PATCH", "roles", { arrayValue: { values: [{ stringValue: "church_admin" }] } }), 403, "Escalação de cargo negada");
  equal(await direct(`users/${member}`, adminToken, "DELETE"), 403, "Desvincular antes de excluir conta");
  const own = await pass(memberToken, `&personId=person_2&userId=${admin}`);
  equal(own.status, 200, "Passe próprio disponível"); equal(own.data.status, "active", "Passe ativo");
  equal(Object.keys(own.data.pass).sort(), ["code", "name", "organizationName", "qrDataUrl"], "Sem CPF, endereço, renda ou e-mail");
  equal(own.data.pass.code, base.memberCardCode, "Identidade da sessão prevalece sobre parâmetros");
  const png = PNG.sync.read(Buffer.from(own.data.pass.qrDataUrl.split(",")[1], "base64"));
  equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data, base.memberCardCode, "QR decodificado contém código correto");
  equal((await link(adminToken, admin, "person_1")).status, 409, "Uma pessoa por conta");
  equal((await link(adminToken, member, "person_2", null)).status, 409, "Formulário desatualizado não sobrescreve");
  for (const patch of [{ partnerBenefitsEnabled: false }, { consentLgpdAt: "" }, { status: "inactive" }, { memberCardCode: "bad" }]) {
    await org.collection("people").doc("person_1").update(patch);
    equal((await pass(memberToken)).data, { status: "unavailable" }, "Elegibilidade revogada não retorna código");
    await org.collection("people").doc("person_1").set({ ...base, id: "person_1" });
  }
  await org.collection("users").doc(member).update({ isActive: false });
  equal((await pass(memberToken)).status, 403, "Conta inativa");
  equal((await link(adminToken, member, "person_2", "person_1")).status, 409, "Não vincular conta inativa");
  equal((await link(adminToken, member, null, "person_1")).status, 200, "Pode remover vínculo inativo");
  await org.collection("users").doc(member).update({ isActive: true });
  equal((await pass(memberToken)).data.status, "unlinked", "Revogação efetiva na consulta seguinte");
  equal(await direct("people/person_1", memberToken), 403, "Revogação também nas regras");
  const race = await Promise.all([link(adminToken, member, "person_1"), link(adminToken, admin, "person_1")]);
  equal(race.map(r => r.status).sort(), [200, 409], `Disputa atômica: ${JSON.stringify(race)}`);
  equal((await org.collection("memberAccountLinks").get()).size, 1, "Somente um vínculo após disputa");
  const winner = race[0].status === 200 ? member : admin;
  equal((await link(adminToken, winner, "person_2", "person_1")).status, 200, "Troca de cadastro");
  equal((await org.collection("memberAccountClaims").doc("person_1").get()).exists, false, "Troca libera reserva antiga");
  await org.update({ status: "inactive" });
  equal((await pass(adminToken)).status, 403, "Igreja inativa");
  equal((await link(adminToken, winner, null, "person_2")).status, 403, "Admin não altera igreja inativa");
  console.log(`QA Passe OK: ${checks} verificações; vínculo, concorrência, QR decodificado, consentimento, revogação, isolamento e regras. Fixtures removidas ao terminar.`);
}
run().finally(() => db.recursiveDelete(org)).catch(error => { console.error(error); process.exitCode = 1; });

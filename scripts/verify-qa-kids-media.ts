import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
if (process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw new Error("Somente QA local.");
initializeApp({ projectId: "demo-alvo-qa" });
const db = getFirestore(), orgId = `org_qa_media_${randomUUID()}`, org = db.doc(`organizations/${orgId}`);
const admin = "qa_admin_principal", member = "qa_admin_secundaria", bucket = "demo-alvo-qa.firebasestorage.app";
const req = createRequire(new URL("../apps/web/package.json", import.meta.url));
const jsQR = req("jsqr"), { PNG } = createRequire(req.resolve("qrcode"))("pngjs");
let checks = 0;
const equal = (value: unknown, expected: unknown, label: string) => { assert.deepEqual(value, expected, label); checks++; };
async function login(suffix: string) {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `admin.${suffix}@example.test`, password: "Local-QA-2026!", returnSecureToken: true }) });
  assert.equal(response.status, 200); return (await response.json()).idToken as string;
}
async function api(route: string, token?: string, body?: object, method = "POST") {
  const response = await fetch(`http://127.0.0.1:3001/api/kids/${route}`, { method, headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  equal(response.headers.get("cache-control"), "private, no-store", "Sem cache público");
  return { status: response.status, data: await response.json() };
}
const read = (token: string, checkInId = "own", kind = "qr") => api("qr", token, { organizationId: orgId, checkInId, kind });
const doc = org.collection("kidsCheckIns").doc("own");
async function run() {
  const a = await login("principal"), m = await login("secundaria");
  await org.set({ status: "active" });
  await org.collection("users").doc(admin).set({ organizationId: orgId, isActive: true, roles: ["church_admin"] });
  await org.collection("users").doc(member).set({ organizationId: orgId, isActive: true, roles: ["member"] });
  await org.collection("kidsOperationSessions").doc("media-session").set({ organizationId: orgId, status: "open", operatorIds: [admin, member] });
  const record = { sessionId: "media-session", organizationId: orgId, parentId: member, authorizedPickUpIds: [], status: "checked_in", securityToken: `KID-${randomUUID().replaceAll("-", "")}` };
  await doc.set(record);
  await org.collection("kidsCheckIns").doc("other").set({ ...record, parentId: "stranger" });
  equal((await api("qr?data=legacy-secret", undefined, undefined, "GET")).status, 410, "URL antiga desativada");
  equal((await api("qr", undefined, { organizationId: orgId, checkInId: "own" })).status, 401, "Sem autenticação");
  equal((await read(m, "other")).status, 403, "Estranho não lê QR");
  equal((await read(m, "other", "photo")).status, 403, "Estranho não lê foto");
  equal((await api("qr", a, { organizationId: "other_org", checkInId: "own" })).status, 403, "Outra igreja");
  equal((await api("qr", a, { organizationId: orgId, checkInId: "../own" })).status, 400, "ID inválido");
  const qr = await read(m);
  equal(qr.status, 200, "Responsável recebe QR");
  const png = PNG.sync.read(Buffer.from(qr.data.dataUrl.split(",")[1], "base64"));
  equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data, record.securityToken, "QR correto decodificado");
  equal(Object.keys(qr.data).sort(), ["dataUrl", "expiresAt"], "Sem dados cadastrais na resposta");
  assert.ok(qr.data.expiresAt > Date.now() && qr.data.expiresAt <= Date.now() + 60000);
  await doc.update({ parentId: "someone", authorizedPickUpIds: [member] });
  equal((await read(m)).status, 200, "Pessoa autorizada");
  await doc.update({ authorizedPickUpIds: [] });
  equal((await read(m)).status, 403, "Autorização revogada");
  await org.collection("settings").doc("kids").set({ qrGeneratorRoles: ["ministry_leader"] });
  await org.collection("users").doc(member).update({ roles: ["ministry_leader"] });
  equal((await read(m)).status, 200, "Operador configurado");
  await org.collection("users").doc(member).update({ roles: ["member"] });
  await doc.update({ parentId: member });
  const body = { organizationId: orgId, checkInId: "own", dataUrl: qr.data.dataUrl, consent: true };
  equal((await api("photo", m, body)).status, 403, "Responsável não anexa sozinho");
  equal((await api("photo", a, { ...body, consent: false })).status, 400, "Consentimento obrigatório");
  equal((await api("photo", a, { ...body, dataUrl: "data:image/svg+xml;base64,PHN2Zy8+" })).status, 400, "SVG negado");
  equal((await api("photo", a, { ...body, dataUrl: "data:image/jpeg;base64,aGVsbG8=" })).status, 400, "MIME falso negado");
  equal((await api("photo", a, { ...body, dataUrl: "x".repeat(700001) })).status, 413, "Corpo limitado");
  // Legacy inline media is not served and can be removed by the operator.
  await doc.update({ photoUrl: "https://untrusted.invalid/photo", photoConsentAt: new Date().toISOString() });
  equal((await read(m, "own", "photo")).data.dataUrl, null, "Foto legada não gera URL externa");
  const uploaded = await api("photo", a, body);
  equal(uploaded.status, 200, JSON.stringify(uploaded));
  let stored = (await doc.get()).data()!;
  assert.match(stored.photoPath, new RegExp(`^kids-private/${orgId}/[a-f0-9]{64}/`));
  equal(stored.photoUrl, null, "Inline legado removido");
  equal((await read(m, "own", "photo")).data.dataUrl, qr.data.dataUrl, "Foto privada lida pelo responsável");
  const oldPath = stored.photoPath;
  for (const token of [undefined, a, m]) {
    const res = await fetch(`http://127.0.0.1:9199/v0/b/${bucket}/o/${encodeURIComponent(oldPath)}?alt=media`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    equal(res.status, 403, "Nem membro/admin lê objeto diretamente pelo Firebase");
  }
  const metadata = await fetch(`http://127.0.0.1:9199/storage/v1/b/${bucket}/o/${encodeURIComponent(oldPath)}`, { headers: { Authorization: "Bearer owner" } }).then(r => r.json());
  equal(metadata.cacheControl, "private, no-store", "Objeto não cacheável");
  assert.ok(!metadata.metadata?.firebaseStorageDownloadTokens, "Sem download token permanente");
  const direct = await fetch(`http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${doc.path}?updateMask.fieldPaths=photoPath`, { method: "PATCH", headers: { Authorization: `Bearer ${a}`, "content-type": "application/json" }, body: JSON.stringify({ fields: { photoPath: { stringValue: "forged" } } }) });
  equal(direct.status, 403, "Cliente não forja referência privada");
  equal((await api("photo", a, body)).status, 200, "Trocar foto");
  equal((await fetch(`http://127.0.0.1:9199/storage/v1/b/${bucket}/o/${encodeURIComponent(oldPath)}`, { headers: { Authorization: "Bearer owner" } })).status, 404, "Objeto antigo excluído");
  stored = (await doc.get()).data()!;
  await doc.update({ status: "checked_out" });
  equal((await read(m)).status, 409, "Retirada desativa QR");
  equal((await read(m, "own", "photo")).status, 409, "Retirada desativa foto");
  equal((await api("photo", a, body)).status, 409, "Não anexar após retirada");
  equal((await api("photo", a, { organizationId: orgId, checkInId: "own" }, "DELETE")).status, 200, "Remover mesmo após retirada");
  equal((await fetch(`http://127.0.0.1:9199/storage/v1/b/${bucket}/o/${encodeURIComponent(stored.photoPath)}`, { headers: { Authorization: "Bearer owner" } })).status, 404, "Foto excluída fisicamente");
  await doc.update({ status: "checked_in" });
  equal((await read(m, "own", "photo")).data.dataUrl, null, "Foto removida indisponível");
  await org.collection("users").doc(member).update({ isActive: false });
  equal((await read(m)).status, 403, "Conta inativa");
  await org.update({ status: "inactive" });
  equal((await read(a)).status, 403, "Igreja inativa");
  console.log(`QA Kids mídia OK: ${checks} verificações, QR decodificado, acesso por papel/vínculo, Storage privado, upload/remoção e revogação.`);
}
run().finally(async () => {
  try {
  const list = await fetch(`http://127.0.0.1:9199/storage/v1/b/${bucket}/o?prefix=${encodeURIComponent(`kids-private/${orgId}/`)}`, { headers: { Authorization: "Bearer owner" } }).then(r => r.json());
  for (const item of list.items ?? []) {
    assert.ok(item.name.startsWith(`kids-private/${orgId}/`));
    await fetch(`http://127.0.0.1:9199/storage/v1/b/${bucket}/o/${encodeURIComponent(item.name)}`, { method: "DELETE", headers: { Authorization: "Bearer owner" } });
  }
  } finally { await db.recursiveDelete(org); }
}).catch(error => { console.error(error); process.exitCode = 1; });

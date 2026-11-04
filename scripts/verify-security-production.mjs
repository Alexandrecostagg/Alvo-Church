// Bounded production probe: synthetic account/institution only, explicitly authorized.
// No customer queries, no payment and no real child data. Never print credentials.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv, promisify } from 'node:util';
import { randomUUID, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
assert.equal(process.env.ESDRAS_AUTHORIZE_TEMP_PRODUCTION_TEST, 'yes');
for (const name of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) assert.ok(!process.env[name]);
const sa = JSON.parse(await readFile('service-account.json', 'utf8'));
const env = parseEnv(await readFile('.env.local', 'utf8'));
assert.equal(sa.project_id, 'alvo-church');
assert.equal(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, sa.project_id);
const app = initializeApp({ credential: cert(sa) });
const auth = getAuth(app), db = getFirestore(app);
const id = `security_probe_${randomUUID()}`, uid = id, orgId = id;
const org = db.doc(`organizations/${orgId}`), actor = org.collection('users').doc(uid);
const session = org.collection('kidsOperationSessions').doc(id), checkIn = org.collection('kidsCheckIns').doc(id);
const reportPath = 'docs/security/2026-10-10/producao-r2-autorizada.json';
const report = { startedAt: new Date().toISOString(), project: sa.project_id, fixtureId: id, results: [], cleanup: {}, scope: 'One synthetic Auth account, one organization and its user/session/check-in documents, one 1px PNG. No customer data.' };
const email = `${id}@example.test`, password = randomBytes(32).toString('base64url');
const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=';
const createdDocs = [], keys = new Set();
let token, createdUser = false;
const base = 'https://alvo-church-web.alexandrecostagg.workers.dev';
async function save() { await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n'); }
async function request(url, init = {}) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  return { status: r.status, body: await r.json(), cache: r.headers.get('cache-control') };
}
function check(label, actual, expected) {
  report.results.push({ label, actual, expected, passed: actual === expected });
  console.log(`${actual === expected ? 'PASS' : 'FAIL'} ${label}: ${actual} (expected ${expected})`);
}
const headers = () => ({ Authorization: `Bearer ${token}` });
async function signIn() {
  const r = await request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  assert.equal(r.status, 200, 'Synthetic sign-in failed');
  token = r.body.idToken; assert.ok(token);
}
const payload = { organizationId: orgId, checkInId: id };
const media = (route, body = {}, anonymous = false, method = 'POST') => request(`${base}/api/kids/${route}`, { method, headers: { 'content-type': 'application/json', ...(anonymous ? {} : headers()) }, body: JSON.stringify({ ...payload, ...body }) });
const read = () => media('qr', { kind: 'photo' });
const entitlement = () => request(`${base}/api/learning/content?organizationId=${orgId}&programId=${id}`, { headers: headers() });
async function rememberKey() {
  const path = (await checkIn.get()).data()?.photoPath;
  if (path) {
    assert.ok(path.startsWith(`kids-private/${orgId}/`) && /^kids-private\/[A-Za-z0-9_-]+\/[a-f0-9]{64}\/[a-f0-9-]+$/.test(path));
    keys.add(path);
  }
}
const exec = promisify(execFile);
async function r2(command, key) {
  assert.ok(keys.has(key) && key.startsWith(`kids-private/${orgId}/`));
  return exec(process.execPath, ['apps/web/node_modules/wrangler/bin/wrangler.js', 'r2', 'object', command, `esdras-private-media/${key}`, '--remote', '--config', 'apps/web/wrangler.jsonc', ...(command === 'get' ? ['--pipe'] : [])], { timeout: 30000, maxBuffer: 256000 });
}
async function absent(key) {
  try { await r2('get', key); throw new Error('Object still exists'); }
  catch (error) {
    assert.ok(/(object does not exist|object not found|The specified key does not exist\.|NoSuchKey|404)/i.test(`${error.stdout ?? ''} ${error.stderr ?? ''}`), 'Could not confirm object absence');
  }
}
async function createDoc(ref, value) { await ref.create(value); createdDocs.push(ref); }
try {
  await save();
  await auth.createUser({ uid, email, password, displayName: 'Teste temporário de segurança' }); createdUser = true;
  await createDoc(org, { name: 'TESTE TEMPORÁRIO DE SEGURANÇA — REMOVER', status: 'active', ownerUid: uid, securityProbe: true });
  await createDoc(actor, { organizationId: orgId, isActive: true, roles: ['church_admin'], securityProbe: true });
  await signIn();
  const valid = await entitlement();
  check('Active session reaches entitlement authorization', valid.status, 403);
  check('Active session specifically denied missing synthetic entitlement', valid.body.error === 'Esta trilha não está liberada para sua instituição.', true);
  assert.equal(valid.status, 403, 'Active-session positive control failed');
  assert.equal(valid.body.error, 'Esta trilha não está liberada para sua instituição.');

  await createDoc(session, { organizationId: orgId, status: 'open', operatorIds: [uid], securityProbe: true });
  await createDoc(checkIn, { organizationId: orgId, sessionId: id, parentId: 'synthetic_other_guardian', authorizedPickUpIds: [], status: 'checked_in', securityProbe: true });
  check('Anonymous image request denied', (await media('qr', { kind: 'photo' }, true)).status, 401);
  check('Image requires consent', (await media('photo', { dataUrl, consent: false })).status, 400);
  check('SVG upload denied', (await media('photo', { dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+', consent: true })).status, 400);
  check('Spoofed PNG denied', (await media('photo', { dataUrl: 'data:image/png;base64,aGVsbG8=', consent: true })).status, 400);
  const uploaded = await media('photo', { dataUrl, consent: true });
  await rememberKey();
  check('Authorized image stored in private R2', uploaded.status, 200);
  assert.equal(uploaded.status, 200, 'R2 upload positive control failed');
  const stored = await read();
  check('Authorized image read', stored.status, 200);
  check('Stored image matches synthetic PNG', stored.body.dataUrl === dataUrl, true);
  check('Private response never cached publicly', stored.cache, 'private, no-store');
  await actor.update({ roles: ['member'] });
  check('Unrelated member cannot read image', (await read()).status, 403);
  check('Member cannot replace image', (await media('photo', { dataUrl, consent: true })).status, 403);
  await checkIn.update({ parentId: uid });
  check('Linked guardian can read image', (await read()).status, 200);
  await actor.update({ isActive: false });
  check('Inactive account denied', (await read()).status, 403);
  await actor.update({ isActive: true, roles: ['church_admin'] });
  await org.update({ status: 'suspended' });
  check('Suspended institution denied', (await read()).status, 403);
  await org.update({ status: 'active' });
  check('Restored institution regains access', (await read()).status, 200);
  check('Authorized image deletion', (await media('photo', {}, false, 'DELETE')).status, 200);
  check('Deleted image no longer returned', (await read()).body.dataUrl, null);
  for (const key of keys) { await absent(key); check('R2 object physically absent after API deletion', true, true); }

  await auth.updateUser(uid, { disabled: true });
  check('Existing token denied immediately after Auth disable', (await entitlement()).status, 401);
  await auth.updateUser(uid, { disabled: false }); await signIn();
  check('Reenabled user with new session reaches authorization', (await entitlement()).status, 403);
  await new Promise(resolve => setTimeout(resolve, 1500));
  await auth.revokeRefreshTokens(uid);
  check('Existing token denied after session revocation', (await entitlement()).status, 401);
} catch (error) {
  report.error = { name: error.name, code: error.code ?? 'PROBE_FAILED' };
  console.log('Probe stopped; executing bounded cleanup.', report.error);
} finally {
  async function clean(label, fn) {
    try { await fn(); report.cleanup[label] = 'confirmed absent'; }
    catch (error) { report.cleanup[label] = `FAILED: ${error.code ?? error.name}`; }
    await save();
  }
  // Capture a successful server upload even if the HTTP response was lost.
  if (createdDocs.includes(checkIn)) {
    try { await rememberKey(); } catch { report.cleanup.referenceDiscovery = 'FAILED'; }
  }
  for (const key of keys) await clean(`r2Object:${key}`, async () => { await r2('delete', key); await absent(key); });
  for (const ref of [...createdDocs].reverse()) await clean(ref.path, async () => { await ref.delete(); assert.equal((await ref.get()).exists, false); });
  if (createdUser) await clean('authAccount', async () => { await auth.deleteUser(uid); try { await auth.getUser(uid); throw new Error('Still exists'); } catch (error) { assert.equal(error.code, 'auth/user-not-found'); } });
  report.finishedAt = new Date().toISOString();
  report.passed = !report.error && report.results.length === 22 && report.results.every(r => r.passed) && Object.values(report.cleanup).every(v => v === 'confirmed absent');
  await save(); await deleteApp(app);
}
console.log(JSON.stringify({ passed: report.passed, checks: report.results.length, cleanup: report.cleanup }));
if (!report.passed) process.exitCode = 1;

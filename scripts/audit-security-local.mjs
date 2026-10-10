// Security probes run ONLY against disposable Firebase emulators. Never production.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

assert.equal(process.env.FIREBASE_PROJECT_ID, 'demo-alvo-qa');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
const app = initializeApp({ projectId: 'demo-alvo-qa' });
const db = getFirestore(app), auth = getAuth(app);
const suffix = randomUUID(), orgId = `security_${suffix}`, otherOrg = `foreign_${suffix}`;
const root = `organizations/${orgId}`, foreign = `organizations/${otherOrg}`;
const program = `platformPrograms/security_${suffix}`;
const identities = {}, results = [], storageObjects = [];
const firestoreBase = 'http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/';
const bucket = 'demo-alvo-qa.firebasestorage.app';
const storageBase = `http://127.0.0.1:9199/v0/b/${bucket}/o`;
const headers = token => token ? { Authorization: `Bearer ${token}` } : {};
function encode(value) {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  throw new Error('Only strings, booleans and arrays used by these probes.');
}
async function request(path, actor, patch) {
  const query = patch ? '?' + new URLSearchParams(Object.keys(patch).map(k => ['updateMask.fieldPaths', k])) : '';
  const response = await fetch(firestoreBase + path + query, {
    method: patch ? 'PATCH' : 'GET', headers: { ...headers(identities[actor]?.token), 'content-type': 'application/json' },
    ...(patch ? { body: JSON.stringify({ fields: Object.fromEntries(Object.entries(patch).map(([k,v]) => [k,encode(v)])) }) } : {}),
  });
  await response.arrayBuffer();
  return response.status;
}
function check(label, actual, expected, finding = null) {
  results.push({ label, status: actual, expected, pass: actual === expected, finding });
  console.log(`${actual === expected ? 'PASS' : 'FINDING'} ${label}: HTTP ${actual} (expected ${expected})`);
}
async function probe(label, path, actor, expected = 403, patch, finding) {
  check(label, await request(path, actor, patch), expected, finding);
}
async function storageUpload(name, token, type = 'text/html') {
  const body = type === 'image/png'
    ? Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=', 'base64')
    : '<p>synthetic security fixture</p>';
  const boundary = `security-${randomUUID()}`;
  const multipart = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name, contentType: type })}\r\n--${boundary}\r\nContent-Type: ${type}\r\n\r\n`),
    Buffer.from(body), Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const response = await fetch(storageBase + '?name=' + encodeURIComponent(name), {
    method: 'POST', headers: { ...headers(token), 'x-goog-upload-protocol': 'multipart', 'content-type': `multipart/related; boundary=${boundary}` }, body: multipart,
  });
  await response.arrayBuffer();
  if (response.ok) storageObjects.push(name);
  return response.status;
}
async function storageRead(name, actor) {
  const response = await fetch(storageBase + '/' + encodeURIComponent(name) + '?alt=media', { headers: headers(identities[actor]?.token) });
  await response.arrayBuffer(); return response.status;
}
try {
  for (const role of ['admin', 'member', 'outsider']) {
    const uid = `security_${role}_${suffix}`, email = `${uid}@example.test`, password = randomBytes(24).toString('base64url');
    await auth.createUser({ uid, email, password });
    identities[role] = { uid };
    const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    assert.equal(response.status, 200);
    identities[role].token = (await response.json()).idToken;
  }
  await db.doc(root).set({ ownerUid: identities.admin.uid, status: 'active' });
  await db.doc(foreign).set({ status: 'active' });
  for (const role of ['admin', 'member']) await db.doc(`${root}/users/${identities[role].uid}`).set({ organizationId: orgId, isActive: true, roles: [role === 'admin' ? 'church_admin' : 'member'] });
  for (const [path, data] of Object.entries({
    [`${root}/settings/subscription`]: { organizationId: orgId, plan: 'free', asaasCustomerId: 'synthetic_customer', asaasSubscriptionId: 'synthetic_subscription' },
    [`${root}/people/private`]: { organizationId: orgId, name: 'Pessoa fictícia', userId: identities.admin.uid },
    [`${root}/families/private`]: { organizationId: orgId, incomeRange: 'synthetic', notes: 'Private household fixture', address: { street: 'Fictional street' } },
    [`${root}/visitorIntakes/private`]: { organizationId: orgId, name: 'Visitante fictício', phone: '0000000000' },
    [`${root}/followUpTasks/private`]: { organizationId: orgId, notes: 'Synthetic pastoral follow-up' },
    [`${root}/financeReports/draft`]: { organizationId: orgId, status: 'draft', entries: [] },
    [`${root}/kidsCheckIns/private`]: { organizationId: orgId, parentId: identities.admin.uid, authorizedPickUpIds: [], status: 'checked_in' },
    [`${root}/courses/draft`]: { organizationId: orgId, isActive: false },
    [`${root}/courses/draft/lessons/private`]: { organizationId: orgId, videoUrl: 'https://example.test/private' },
    [`${foreign}/families/private`]: { organizationId: otherOrg, notes: 'Foreign fixture' },
    [program]: { isPublished: false, title: 'Unpublished synthetic program', price: 100 },
    [`${program}/lessons/private`]: { videoUrl: 'https://example.test/private' },
  })) await db.doc(path).set(data);

  await probe('Anonymous private person denied', `${root}/people/private`, null);
  await probe('Member private person denied', `${root}/people/private`, 'member');
  await probe('Admin private person allowed (positive control)', `${root}/people/private`, 'admin', 200);
  await probe('Cross-tenant family denied', `${foreign}/families/private`, 'member');
  await probe('Member self role escalation denied', `${root}/users/${identities.member.uid}`, 'member', 403, { roles: ['super_admin'] });
  await probe('Tenant admin cannot become platform admin', `platformAdmins/${identities.admin.uid}`, 'admin', 403, { active: true });
  await probe('Client plan upgrade denied', `${root}/settings/subscription`, 'admin', 403, { plan: 'network' });
  await probe('Client payment IDs must be immutable', `${root}/settings/subscription`, 'admin', 403, { asaasSubscriptionId: 'synthetic_foreign_subscription', asaasCustomerId: '' }, 'SEC-01');
  for (const path of ['families/private', 'visitorIntakes/private', 'followUpTasks/private', 'financeReports/draft']) {
    await probe(`Member cannot read internal ${path}`, `${root}/${path}`, 'member', 403, undefined, 'SEC-02');
  }
  await probe('Member cannot read another guardian Kids record', `${root}/kidsCheckIns/private`, 'member');
  await probe('Direct Kids checkout denied', `${root}/kidsCheckIns/private`, 'admin', 403, { status: 'checked_out' });
  await probe('Anonymous global program denied', program, null);
  await probe('Unrelated account cannot read unpublished program', program, 'outsider', 403, undefined, 'SEC-03');
  await probe('Unrelated account without entitlement cannot read lesson', `${program}/lessons/private`, 'outsider', 403, undefined, 'SEC-03');
  await probe('Member cannot read inactive course lesson', `${root}/courses/draft/lessons/private`, 'member', 403, undefined, 'SEC-03');
  await db.doc(`${root}/users/${identities.member.uid}`).update({ isActive: false });
  await probe('Inactive account data denied', `${root}/families/private`, 'member');
  await db.doc(`${root}/users/${identities.member.uid}`).update({ isActive: true });
  await db.doc(root).update({ status: 'inactive' });
  await probe('Inactive institution Firestore data denied', `${root}/families/private`, 'member');
  await db.doc(root).update({ status: 'active' });

  // Positive controls: operators, published reports/courses and private drafts.
  for (const path of ['families/private', 'visitorIntakes/private', 'followUpTasks/private', 'financeReports/draft']) {
    await probe(`Admin retains access to ${path}`, `${root}/${path}`, 'admin', 200);
  }
  await db.doc(`${root}/financeReports/public`).set({ organizationId: orgId, status: 'published' });
  await probe('Member reads published transparency report', `${root}/financeReports/public`, 'member', 200);
  await db.doc(`${root}/families/private/notes/private`).set({ status: 'published' });
  await probe('Published flag cannot bypass a private descendant', `${root}/families/private/notes/private`, 'member');
  await db.doc(`${root}/courses/live`).set({ organizationId: orgId, isActive: true });
  await db.doc(`${root}/courses/live/lessons/sample`).set({ title: 'Synthetic lesson' });
  await probe('Member reads active institutional lesson', `${root}/courses/live/lessons/sample`, 'member', 200);
  await probe('Admin reads institutional draft', `${root}/courses/draft/lessons/private`, 'admin', 200);
  await db.doc(program).update({ isPublished: true });
  await probe('Signed-in user sees published catalog metadata', program, 'outsider', 200);
  await probe('Published catalog does not expose paid lessons', `${program}/lessons/private`, 'outsider');
  await db.doc(program).update({ isPublished: false });
  await db.doc(`platformAdmins/${identities.admin.uid}`).set({ active: true });
  await probe('Platform editor can review private lessons', `${program}/lessons/private`, 'admin', 200);
  await db.doc(`platformAdmins/${identities.admin.uid}`).delete();
  await db.doc(foreign).update({ ownerUid: identities.admin.uid });
  const bootstrap = { organizationId: otherOrg, plan: 'free', planCode: 'gratuito', planTier: 'base', seatLimit: 4, campusLimit: 1, aiQuota: 0, whiteLabelEnabled: false, coBrandingEnabled: true, multiCampusEnabled: false, denominationalModeEnabled: false };
  await probe('Bootstrap cannot inject billing IDs', `${foreign}/settings/subscription`, 'admin', 403, { ...bootstrap, asaasSubscriptionId: 'foreign' });
  await probe('Bootstrap cannot inject a paid quota', `${foreign}/settings/subscription`, 'admin', 403, { ...bootstrap, aiQuota: 9999 });
  await probe('Free bootstrap still works', `${foreign}/settings/subscription`, 'admin', 200, bootstrap);
  if (process.env.SECURITY_AUDIT_API === '1') {
    const contentPath = `/api/learning/content?${new URLSearchParams({ organizationId: orgId, programId: program.split('/')[1] })}`;
    const api = async (path, actor) => {
      const response = await fetch('http://127.0.0.1:3001' + path, { headers: headers(identities[actor]?.token) });
      await response.arrayBuffer(); return response.status;
    };
    check('Content API denies missing entitlement', await api(contentPath, 'member'), 403);
    await db.doc(`${root}/programEntitlements/${program.split('/')[1]}`).set({ programId: program.split('/')[1], status: 'active' });
    check('Content API permits purchased lesson for active member', await api(contentPath, 'member'), 200);
    check('Content API denies unrelated user', await api(contentPath, 'outsider'), 403);
    await db.doc(`${root}/programEntitlements/${program.split('/')[1]}`).update({ status: 'revoked' });
    check('Content API denies revoked purchase', await api(contentPath, 'member'), 403);
    await auth.updateUser(identities.member.uid, { disabled: true });
    check('Disabled Auth account cannot reuse an issued token', await api(contentPath, 'member'), 401);
    await auth.updateUser(identities.member.uid, { disabled: false });
  }

  const logo = `${root}/branding/logoLight/security.txt`;
  assert.equal(await storageUpload(logo, 'owner'), 200, 'Storage fixture setup');
  check('Storage anonymous branding read denied', await storageRead(logo, null), 403);
  check('Storage active member branding read allowed', await storageRead(logo, 'member'), 200, 'SEC-04');
  check('Storage admin image upload allowed (positive control)', await storageUpload(`${root}/branding/logoLight/security.png`, identities.admin.token, 'image/png'), 200, 'SEC-04');
  check('Storage admin HTML upload denied', await storageUpload(`${root}/branding/logoLight/security.html`, identities.admin.token), 403, 'SEC-04');
  await db.doc(root).update({ status: 'inactive' });
  check('Storage inactive institution read denied', await storageRead(logo, 'member'), 403, 'SEC-04');
} finally {
  for (const name of storageObjects) await fetch(storageBase + '/' + encodeURIComponent(name), { method: 'DELETE', headers: headers('owner') });
  await db.recursiveDelete(db.doc(root));
  await db.recursiveDelete(db.doc(foreign));
  await db.recursiveDelete(db.doc(program));
  if (identities.admin) await db.doc(`platformAdmins/${identities.admin.uid}`).delete();
  for (const { uid } of Object.values(identities)) await auth.deleteUser(uid);
  await deleteApp(app);
}
const report = { date: new Date().toISOString(), environment: 'demo-alvo-qa local emulators; synthetic data only', total: results.length, passed: results.filter(r => r.pass).length, findings: results.filter(r => !r.pass).length, results };
const output = process.argv[2];
if (output) await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ total: report.total, passed: report.passed, findings: report.findings }));
// Deliberately nonzero when a security expectation fails; this is not a passing regression suite.
process.exitCode = report.findings ? 1 : 0;

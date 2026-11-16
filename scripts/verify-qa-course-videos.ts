import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as videosPost } from "../apps/web/app/api/learning/videos/route";
import { POST as accessPost } from "../apps/web/app/api/learning/videos/access/route";
import { POST as managePost } from "../apps/web/app/api/learning/manage/route";
import { PUT as partPut } from "../apps/web/app/api/learning/videos/part/route";
import { GET as playGet } from "../apps/web/app/api/learning/videos/play/[organizationId]/[videoId]/route";

async function webFetch(url: string, init?: RequestInit) {
  if (process.env.QA_HTTP === "true") return fetch(url, init);
  const req = new NextRequest(url, init);
  const path = req.nextUrl.pathname;
  if (path === "/api/learning/videos") return videosPost(req);
  if (path === "/api/learning/videos/access") return accessPost(req);
  if (path === "/api/learning/manage") return managePost(req);
  if (path === "/api/learning/videos/part") return partPut(req);
  const match = path.match(/^\/api\/learning\/videos\/play\/([^/]+)\/([^/]+)$/);
  if (match) return playGet(req, { params: Promise.resolve({ organizationId: match[1], videoId: match[2] }) });
  throw new Error("Unexpected local endpoint");
}
import { readFile } from "node:fs/promises";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { fetchCourseLessons, signInWithFirebaseMobileEmailPassword, signOutFromFirebaseMobile } from "../packages/firebase/src/index";

async function main() {
  if (process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080") throw new Error("Local demo only");
  initializeApp({ projectId: "demo-alvo-qa" });
  const db = getFirestore(), auth = getAuth();
  const suffix = crypto.randomUUID().slice(0, 8), org = `qa_video_${suffix}`, otherOrg = `qa_other_${suffix}`;
  const admin = `video_admin_${suffix}`, student = `video_student_${suffix}`, outsider = `video_other_${suffix}`;
  const base = "http://127.0.0.1:3001", root = `organizations/${org}`, courseId = "course", moduleId = "module";
  let checks = 0;
  function eq(a: unknown, b: unknown, message: string) { assert.deepEqual(a, b, message); checks++; }
  const tokens: Record<string, string> = {};
  const ids: string[] = [];
  const config = { apiKey: "demo-alvo-qa-key", authDomain: "demo-alvo-qa.firebaseapp.com", projectId: "demo-alvo-qa", storageBucket: "demo-alvo-qa.firebasestorage.app", messagingSenderId: "1234567890", appId: "1:1234567890:web:localqa", useEmulator: true };
  async function post(path: string, body: object, uid = admin) {
    const res = await webFetch(`${base}/api/learning/${path}`, { method: "POST", headers: { "content-type": "application/json", ...(tokens[uid] ? { Authorization: `Bearer ${tokens[uid]}` } : {}) }, body: JSON.stringify({ organizationId: org, courseId, ...body }) });
    return { status: res.status, data: await res.json(), cookie: res.headers.get("set-cookie")?.split(";")[0] };
  }
  async function start(size: number, extra: object = {}) {
    const videoId = crypto.randomUUID(); ids.push(videoId);
    return { videoId, ...await post("videos", { action: "start", videoId, name: "aula-ficticia.mp4", size, contentType: "video/mp4", ...extra }) };
  }
  async function part(videoId: string, n: number, bytes: Uint8Array, uid = admin) {
    return webFetch(`${base}/api/learning/videos/part?${new URLSearchParams({ organizationId: org, videoId, part: String(n) })}`, { method: "PUT", headers: { Authorization: `Bearer ${tokens[uid]}` }, body: bytes as BodyInit });
  }
  try {
    await db.doc(root).set({ id: org, status: "active", name: "Igreja fictícia vídeo QA" });
    await db.doc(`organizations/${otherOrg}`).set({ status: "active" });
    for (const [uid, roles, tenant] of [[admin, ["church_admin"], org], [student, ["member"], org], [outsider, ["church_admin"], otherOrg]] as const) {
      await auth.createUser({ uid, email: `${uid}@example.test`, password: "Local-QA-2026!" });
      await db.doc(`organizations/${tenant}/users/${uid}`).set({ organizationId: tenant, isActive: true, roles });
      const res = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `${uid}@example.test`, password: "Local-QA-2026!", returnSecureToken: true }) });
      tokens[uid] = (await res.json()).idToken;
    }
    await db.doc(`${root}/courses/${courseId}`).set({ id: courseId, organizationId: org, title: "Curso fictício", isActive: false });
    await db.doc(`${root}/courses/${courseId}/modules/${moduleId}`).set({ id: moduleId, courseId, organizationId: org, title: "Módulo QA", sortOrder: 0 });
    eq((await post("videos", { action: "inventory" }, "anonymous")).status, 401, "anonymous denied");
    eq((await post("videos", { action: "inventory" }, student)).status, 403, "student cannot manage");
    eq((await post("videos", { action: "inventory" }, outsider)).status, 403, "cross tenant denied");
    eq((await start(200_000_001)).status, 400, "file limit");
    const fixture = new Uint8Array(await readFile(process.env.QA_VIDEO_FILE || "/tmp/esdras-qa-aula.mp4"));
    // Append a valid 'free' box to exercise multipart without a large fixture in Git.
    const bytes = new Uint8Array(8 * 1024 * 1024 + 1024);
    bytes.set(fixture);
    new DataView(bytes.buffer).setUint32(fixture.length, bytes.length - fixture.length);
    bytes.set(new TextEncoder().encode("free"), fixture.length + 4);
    const initial = await start(bytes.length); eq(initial.status, 200, "reserve upload");
    const id = initial.videoId;
    for (const path of [`${root}/courseVideos/${id}`, `${root}/courseVideoUsage/storage`, "platformMediaUsage/courseVideos"]) {
      const res = await fetch(`http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${path}`, { headers: { Authorization: `Bearer ${tokens[admin]}` } });
      eq(res.status, 403, "private metadata denied by rules");
    }
    const repeat = await post("videos", { action: "start", videoId: id, name: "aula-ficticia.mp4", size: bytes.length, contentType: "video/mp4" });
    eq(repeat.status, 200, "init retry");
    eq((await post("videos", { action: "inventory" })).data.usedBytes, bytes.length, "retry counted once");
    eq((await post("videos", { action: "complete", videoId: id })).status, 409, "incomplete denied");
    eq((await part(id, 1, new Uint8Array(20))).status, 400, "wrong part length");
    eq((await part(id, 1, bytes.slice(0, 8 * 1024 * 1024), outsider)).status, 403, "cross tenant part denied");
    eq((await part(id, 1, bytes.slice(0, 8 * 1024 * 1024))).status, 200, "first part");
    eq((await part(id, 1, bytes.slice(0, 8 * 1024 * 1024))).status, 200, "part retry");
    const altered = bytes.slice(0, 8 * 1024 * 1024); altered[100] ^= 1;
    eq((await part(id, 1, altered)).status, 409, "cannot replace immutable part");
    eq((await part(id, 2, bytes.slice(8 * 1024 * 1024))).status, 200, "last part");
    eq((await post("videos", { action: "complete", videoId: id })).status, 200, "complete");
    eq((await post("videos", { action: "complete", videoId: id })).status, 200, "complete idempotent");
    eq((await post("videos/access", { videoId: id }, student)).status, 403, "draft hidden");
    const lesson = { action: "save_lesson", requestId: crypto.randomUUID(), lessonId: "lesson", moduleId, title: "Aula fictícia", videoUrl: "", videoAssetId: id, durationMinutes: 1, sortOrder: 0, materialUrl: "https://example.test/material.pdf" };
    eq((await post("manage", { ...lesson, videoAssetId: "missing" })).status, 409, "invalid asset rejected");
    const saved = await post("manage", lesson); eq(saved.status, 200, "save uploaded lesson"); eq(saved.data.lesson.videoAssetId, id, "asset persisted");
    eq((await post("videos", { action: "delete", videoId: id })).status, 409, "cannot delete attached video");
    await db.doc(`${root}/courses/${courseId}`).update({ isActive: true });
    await signInWithFirebaseMobileEmailPassword({ config, email: `${student}@example.test`, password: "Local-QA-2026!" });
    const loaded = await fetchCourseLessons(config, { organizationId: org }, courseId);
    eq(loaded[0].videoAssetId, id, "web and mobile repository preserves uploaded video after reload");
    eq(loaded[0].materialUrl, "https://example.test/material.pdf", "lesson material preserved after reload");
    await signOutFromFirebaseMobile(config);
    const access = await post("videos/access", { videoId: id }, student); eq(access.status, 200, "published student access");
    eq((await post("videos/access", { videoId: id }, outsider)).status, 403, "cross tenant playback denied");
    eq((await webFetch(base + access.data.url)).status, 401, "cookie required");
    const playback = await webFetch(base + access.data.url, { headers: { Cookie: access.cookie!, Range: "bytes=0-31" } });
    eq(playback.status, 206, "seeking status"); eq(playback.headers.get("content-range"), `bytes 0-31/${bytes.length}`, "range header");
    eq(new Uint8Array(await playback.arrayBuffer()), bytes.slice(0, 32), "correct playback bytes");
    const tail = await webFetch(base + access.data.url, { headers: { Cookie: access.cookie!, Range: "bytes=-8" } });
    eq(new Uint8Array(await tail.arrayBuffer()), bytes.slice(-8), "suffix seek");
    eq((await webFetch(base + access.data.url, { headers: { Cookie: access.cookie!, Range: "bytes=0-1,4-5" } })).status, 416, "multi range denied");
    const grants = db.doc(`${root}/courseVideos/${id}/access/${student}`);
    await grants.update({ sessionExpires: 0 });
    eq((await webFetch(base + access.data.url, { headers: { Cookie: access.cookie! } })).status, 401, "expired session denied");
    const expired = await post("videos/access", { videoId: id, handoff: true }, student);
    await grants.update({ handoffExpires: 0 });
    eq((await post("videos/access", { videoId: id, ticket: new URL(base + expired.data.watchPath).hash.slice(8) }, "anonymous")).status, 401, "expired mobile grant denied");
    const handoff = await post("videos/access", { videoId: id, handoff: true }, student); eq(handoff.status, 200, "mobile handoff");
    const ticket = new URL(base + handoff.data.watchPath).hash.slice(8);
    const redeemed = await post("videos/access", { videoId: id, ticket }, "anonymous"); eq(redeemed.status, 200, "browser redeems mobile grant");
    eq((await post("videos/access", { videoId: id, ticket }, "anonymous")).status, 401, "handoff one use");
    await db.doc(`${root}/users/${student}`).update({ isActive: false });
    eq((await webFetch(base + access.data.url, { headers: { Cookie: redeemed.cookie! } })).status, 403, "deactivation revokes playback");
    await db.doc(`${root}/courses/${courseId}`).update({ isActive: false });
    eq((await post("manage", { action: "delete_lesson", requestId: crypto.randomUUID(), lessonId: "lesson" })).status, 200, "delete lesson without moduleId");
    eq((await post("videos", { action: "delete", videoId: id })).status, 200, "delete unused video");
    eq((await post("videos", { action: "delete", videoId: id })).status, 200, "delete retry");
    eq((await post("videos", { action: "inventory" })).data.usedBytes, 0, "space released once");
    const cancelled = await start(fixture.length);
    eq((await part(cancelled.videoId, 1, fixture)).status, 200, "cancellable uploaded part");
    eq((await post("videos", { action: "delete", videoId: cancelled.videoId })).status, 200, "cancel pending upload");
    eq((await post("videos", { action: "complete", videoId: cancelled.videoId })).status, 404, "cancelled cannot complete");
    eq((await post("videos", { action: "inventory" })).data.usedBytes, 0, "cancellation releases space");
    const global = db.doc("platformMediaUsage/courseVideos");
    const before = (await global.get()).data()?.bytes ?? 0;
    await db.doc(`${root}/courseVideoUsage/storage`).set({ bytes: 900_000_000 });
    const raced = await Promise.all([start(100_000_000), start(100_000_000)]);
    eq(raced.map(r => r.status).sort(), [200, 409], "concurrent org quota respected");
    await post("videos", { action: "delete", videoId: raced.find(r => r.status === 200)!.videoId });
    await db.doc(`${root}/courseVideoUsage/storage`).set({ bytes: 0 });
    await global.set({ bytes: 5_000_000_000 });
    eq((await start(100)).status, 409, "global budget respected");
    await global.set({ bytes: before });
    console.log(JSON.stringify({ checks, environment: "demo-alvo-qa", realData: false, productionChanges: false, transport: process.env.QA_HTTP === "true" ? "HTTP" : "route handlers" }));
  } finally {
    await signOutFromFirebaseMobile(config).catch(() => {});
    for (const videoId of ids) await post("videos", { action: "delete", videoId }).catch(() => {});
    await db.recursiveDelete(db.doc(root)); await db.recursiveDelete(db.doc(`organizations/${otherOrg}`));
    await Promise.all([admin, student, outsider].map(uid => auth.deleteUser(uid).catch(() => {})));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });

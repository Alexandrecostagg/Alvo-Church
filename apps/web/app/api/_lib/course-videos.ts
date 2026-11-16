import { createHash, randomBytes } from "node:crypto";
import { AccountError, accountTransaction, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";
import { courseVideoBucket } from "./course-video-storage";
import { COURSE_VIDEO_MAX_BYTES, COURSE_VIDEO_PART_BYTES } from "../../../src/lib/course-video";

export const VIDEO_ORG_QUOTA = 1_000_000_000;
// Conservative launch budget leaves room for other files in the shared R2 account.
export const VIDEO_GLOBAL_QUOTA = 5_000_000_000;
const GLOBAL_USAGE = "platformMediaUsage/courseVideos";
const managers = ["super_admin", "church_admin", "pastor", "secretary"];
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const assetPath = (org: string, id: string) => `organizations/${org}/courseVideos/${id}`;
const usagePath = (org: string) => `organizations/${org}/courseVideoUsage/storage`;
export const playbackPath = (org: string, id: string) => `/api/learning/videos/play/${org}/${id}`;

export async function authorizeVideo(tx: AccountTransaction, org: string, uid: string, manage = false) {
  documentId(org, "Igreja"); documentId(uid, "Conta");
  const root = `organizations/${org}`;
  await assertModuleEnabled(tx, root, "journeys");
  const [tenant, user] = await tx.read(root, `${root}/users/${uid}`);
  const manager = user?.roles?.some((r: string) => managers.includes(r));
  if (tenant?.status !== "active" || user?.organizationId !== org || user?.isActive !== true || (manage && !manager))
    throw new AccountError(403, "Você não tem acesso a estes vídeos.");
  return { root, manager: Boolean(manager) };
}
async function asset(tx: AccountTransaction, org: string, id: string) {
  documentId(id, "Vídeo");
  const [video] = await tx.read(assetPath(org, id));
  if (!video || video.organizationId !== org || video.status === "deleted") throw new AccountError(404, "Vídeo não encontrado.");
  return video;
}
async function draftCourse(tx: AccountTransaction, org: string, courseId: string) {
  documentId(courseId, "Curso");
  const [course] = await tx.read(`organizations/${org}/courses/${courseId}`);
  if (!course || course.organizationId !== org) throw new AccountError(404, "Curso não encontrado.");
  if (course.isActive) throw new AccountError(409, "Retire o curso da Escola antes de alterar seus vídeos.");
}

export async function videoInventory(org: string, uid: string, courseId: string) {
  documentId(courseId, "Curso");
  return accountTransaction(async tx => {
    const { root } = await authorizeVideo(tx, org, uid, true);
    const [usage] = await tx.read(usagePath(org));
    const videos = await tx.query(root, "courseVideos", "courseId", courseId, "EQUAL", 401);
    return {
      usedBytes: usage?.bytes ?? 0, quotaBytes: VIDEO_ORG_QUOTA, maxFileBytes: COURSE_VIDEO_MAX_BYTES,
      videos: videos.filter(v => v.status !== "deleted").map(v => ({ id: v.id, name: v.name, size: v.size, status: v.status, lessonId: v.lessonId ?? null })),
    };
  });
}

export async function startVideo(raw: Record<string, any>, uid: string) {
  const org = documentId(raw.organizationId, "Igreja");
  const courseId = documentId(raw.courseId, "Curso");
  const id = documentId(raw.videoId, "Vídeo"); // Stable request identity for retries.
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name || name.length > 180 || !/\.mp4$/i.test(name) || raw.contentType !== "video/mp4" || !Number.isInteger(raw.size) || raw.size < 24 || raw.size > COURSE_VIDEO_MAX_BYTES)
    throw new AccountError(400, "Use um vídeo MP4 de até 200 MB, com vídeo H.264 e áudio AAC.");
  const bucket = await courseVideoBucket();
  const video = await accountTransaction(async tx => {
    await authorizeVideo(tx, org, uid, true);
    await draftCourse(tx, org, courseId);
    const [existing, usage, total] = await tx.read(assetPath(org, id), usagePath(org), GLOBAL_USAGE);
    if (existing) {
      if (existing.createdBy !== uid || existing.courseId !== courseId || existing.size !== raw.size || existing.name !== name || !["reserved", "uploading"].includes(existing.status)) throw new AccountError(409, "Envio já utilizado. Inicie um novo envio.");
      return existing;
    }
    const bytes = (usage?.bytes ?? 0) + raw.size;
    const totalBytes = (total?.bytes ?? 0) + raw.size;
    if (bytes > VIDEO_ORG_QUOTA) throw new AccountError(409, "Cota de 1 GB da instituição atingida. Remova vídeos sem uso ou utilize um link do YouTube.");
    if (totalBytes > VIDEO_GLOBAL_QUOTA) throw new AccountError(409, "O espaço de vídeos da plataforma está ocupado. Use um link ou procure o suporte.");
    const doc: Record<string, any> = { id, organizationId: org, courseId, name, size: raw.size, key: `course-videos/${org}/${id}`, status: "reserved", createdBy: uid, createdAt: new Date().toISOString(), parts: {} };
    tx.set(assetPath(org, id), doc);
    tx.set(usagePath(org), { bytes }); tx.set(GLOBAL_USAGE, { bytes: totalBytes });
    return doc;
  });
  if (!video.uploadId) {
    // Extra uploads from simultaneous retries are aborted; reservation is charged once.
    const upload = await bucket.createMultipartUpload(video.key, { httpMetadata: { contentType: "video/mp4", cacheControl: "private, no-store" } });
    const adopted = await accountTransaction(async tx => {
      const current = await asset(tx, org, id);
      if (current.status !== "reserved" || current.uploadId) return false;
      tx.patch(assetPath(org, id), { uploadId: upload.uploadId, status: "uploading" }); return true;
    }).catch(async error => { await bucket.resumeMultipartUpload(video.key, upload.uploadId).abort(); throw error; });
    if (!adopted) await bucket.resumeMultipartUpload(video.key, upload.uploadId).abort();
  }
  return { videoId: id, partBytes: COURSE_VIDEO_PART_BYTES };
}

export function validateMp4(bytes: Uint8Array) {
  // Validate the ISO BMFF signature; browser metadata validation checks playability.
  if (bytes.length < 24 || new TextDecoder().decode(bytes.slice(4, 8)) !== "ftyp") throw new AccountError(400, "O arquivo não é um MP4 válido.");
}
export async function uploadVideoPart(org: string, id: string, uid: string, n: number, bytes: Uint8Array) {
  const video = await accountTransaction(async tx => {
    await authorizeVideo(tx, org, uid, true);
    const current = await asset(tx, org, id);
    if (current.status !== "uploading" || !current.uploadId) throw new AccountError(409, "Este envio não está aberto.");
    return current;
  });
  const count = Math.ceil(video.size / COURSE_VIDEO_PART_BYTES);
  const expected = n === count ? video.size - (n - 1) * COURSE_VIDEO_PART_BYTES : COURSE_VIDEO_PART_BYTES;
  if (!Number.isInteger(n) || n < 1 || n > count || bytes.length !== expected) throw new AccountError(400, "Parte de vídeo inválida.");
  if (n === 1) validateMp4(bytes);
  const digest = createHash("sha256").update(bytes).digest("hex");
  // Immutable hashes make retries safe, even if the first response was lost.
  await accountTransaction(async tx => {
    const current = await asset(tx, org, id);
    if (current.status !== "uploading") throw new AccountError(409, "Envio encerrado.");
    const previous = current.parts?.[n];
    if (previous && previous.digest !== digest) throw new AccountError(409, "Este envio contém outro arquivo. Cancele e envie novamente.");
    if (!previous) tx.patch(assetPath(org, id), { parts: { ...current.parts, [n]: { digest } } });
  });
  const bucket = await courseVideoBucket();
  const uploaded = await bucket.resumeMultipartUpload(video.key, video.uploadId).uploadPart(n, bytes);
  await accountTransaction(async tx => {
    const current = await asset(tx, org, id);
    if (current.status !== "uploading") throw new AccountError(409, "Envio encerrado.");
    tx.patch(assetPath(org, id), { parts: { ...current.parts, [n]: { digest, ...uploaded } } });
  });
  return { partNumber: n };
}

export async function completeVideo(org: string, id: string, uid: string) {
  const video = await accountTransaction(async tx => {
    await authorizeVideo(tx, org, uid, true);
    const current = await asset(tx, org, id);
    await draftCourse(tx, org, current.courseId);
    if (current.status === "ready") return current;
    if (!["uploading", "finishing"].includes(current.status)) throw new AccountError(409, "Envio indisponível.");
    const count = Math.ceil(current.size / COURSE_VIDEO_PART_BYTES);
    for (let n = 1; n <= count; n++) if (!current.parts?.[n]?.etag) throw new AccountError(409, "Envio incompleto. Envie todas as partes antes de finalizar.");
    tx.patch(assetPath(org, id), { status: "finishing" });
    return current;
  });
  if (video.status === "ready") return { videoId: id };
  const bucket = await courseVideoBucket();
  const object = await bucket.head(video.key) ?? await bucket.resumeMultipartUpload(video.key, video.uploadId).complete(
    Object.values(video.parts as Record<string, { partNumber: number; etag: string }>).sort((a, b) => a.partNumber - b.partNumber).map(({ partNumber, etag }) => ({ partNumber, etag })),
  );
  if (object.size !== video.size) throw new AccountError(409, "Tamanho do vídeo diferente do informado. Procure o suporte.");
  await accountTransaction(async tx => {
    const current = await asset(tx, org, id);
    if (!["finishing", "ready"].includes(current.status)) throw new AccountError(409, "Envio alterado.");
    tx.patch(assetPath(org, id), { status: "ready", readyAt: new Date().toISOString() });
  });
  return { videoId: id };
}

export async function deleteVideo(org: string, id: string, uid: string) {
  const video = await accountTransaction(async tx => {
    await authorizeVideo(tx, org, uid, true);
    const [current] = await tx.read(assetPath(org, documentId(id, "Vídeo")));
    if (!current || current.status === "deleted") return null;
    await draftCourse(tx, org, current.courseId);
    if (current.lessonId) {
      const [lesson] = await tx.read(`organizations/${org}/courses/${current.courseId}/lessons/${current.lessonId}`);
      if (lesson?.videoAssetId === id) throw new AccountError(409, "Remova primeiro a aula que utiliza este vídeo.");
    }
    if (current.status === "finishing") throw new AccountError(409, "Finalize o envio antes de removê-lo.");
    tx.patch(assetPath(org, id), { status: "deleting" }); return current;
  });
  if (!video) return { deleted: true };
  const bucket = await courseVideoBucket();
  if (video.uploadId && !video.readyAt) await bucket.resumeMultipartUpload(video.key, video.uploadId).abort();
  await bucket.delete(video.key);
  await accountTransaction(async tx => {
    const [current, usage, total] = await tx.read(assetPath(org, id), usagePath(org), GLOBAL_USAGE);
    if (!current || current.status === "deleted") return;
    tx.patch(assetPath(org, id), { status: "deleted", deletedAt: new Date().toISOString(), parts: {} });
    tx.set(usagePath(org), { bytes: Math.max(0, (usage?.bytes ?? 0) - current.size) });
    tx.set(GLOBAL_USAGE, { bytes: Math.max(0, (total?.bytes ?? 0) - current.size) });
  });
  return { deleted: true };
}

export async function readableVideo(tx: AccountTransaction, org: string, id: string, uid: string) {
  const { manager, root } = await authorizeVideo(tx, org, uid);
  const video = await asset(tx, org, id);
  if (video.status !== "ready") throw new AccountError(404, "Vídeo indisponível.");
  const [course, lesson] = await tx.read(`${root}/courses/${video.courseId}`, `${root}/courses/${video.courseId}/lessons/${video.lessonId || "_unassigned"}`);
  if (!course || course.organizationId !== org || (!manager && (course.isActive !== true || lesson?.videoAssetId !== id))) throw new AccountError(403, "Esta aula não está disponível para sua conta.");
  return video;
}

export async function issueVideoAccess(org: string, id: string, uid: string, handoff = false) {
  const token = randomBytes(32).toString("hex");
  await accountTransaction(async tx => {
    await readableVideo(tx, org, id, uid);
    const path = `${assetPath(org, id)}/access/${uid}`;
    const [existing] = await tx.read(path);
    tx.set(path, { ...existing, [handoff ? "handoffHash" : "sessionHash"]: hash(token), [handoff ? "handoffExpires" : "sessionExpires"]: Date.now() + (handoff ? 60_000 : 4 * 60 * 60_000) });
  });
  return `${uid}.${token}`;
}
function credentialParts(credential: string) {
  const [uid, token, extra] = credential.split(".");
  if (extra || !uid || !/^[a-f0-9]{64}$/.test(token || "")) throw new AccountError(401, "Acesso ao vídeo expirou. Abra a aula novamente.");
  documentId(uid, "Conta"); return { uid, token };
}
export async function redeemVideoHandoff(org: string, id: string, credential: string) {
  const { uid, token } = credentialParts(credential);
  const session = randomBytes(32).toString("hex");
  await accountTransaction(async tx => {
    await readableVideo(tx, org, id, uid);
    const path = `${assetPath(org, id)}/access/${uid}`;
    const [grant] = await tx.read(path);
    if (grant?.handoffHash !== hash(token) || grant.handoffExpires < Date.now()) throw new AccountError(401, "Link expirado ou já utilizado. Abra a aula novamente pelo aplicativo.");
    tx.patch(path, { handoffHash: null, handoffExpires: 0, sessionHash: hash(session), sessionExpires: Date.now() + 4 * 60 * 60_000 });
  });
  return `${uid}.${session}`;
}
export async function readVideoSession(org: string, id: string, credential: string) {
  const { uid, token } = credentialParts(credential);
  return accountTransaction(async tx => {
    const video = await readableVideo(tx, org, id, uid);
    const [grant] = await tx.read(`${assetPath(org, id)}/access/${uid}`);
    if (grant?.sessionHash !== hash(token) || grant.sessionExpires < Date.now()) throw new AccountError(401, "Acesso ao vídeo expirou. Abra a aula novamente.");
    return video;
  });
}
export function videoRange(raw: string | null, size: number) {
  if (!raw) return { offset: 0, length: size, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(raw);
  if (!match || (!match[1] && !match[2])) throw new AccountError(416, "Intervalo inválido.");
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) throw new AccountError(416, "Intervalo inválido.");
  return { offset: start, length: end - start + 1, partial: true };
}

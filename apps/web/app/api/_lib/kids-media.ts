import { createHash } from "node:crypto";
import { AccountError, accountTransaction, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { isLocalQaFirebase } from "./firebase-server-env";
import { getGoogleAccessToken } from "./google-service-account";
export { AccountError };
export const privateHeaders = { "cache-control": "private, no-store", Vary: "Authorization", "x-content-type-options": "nosniff" };
const MAX_PHOTO_BYTES = 512000;

export function kidsAccess(actor: any, checkIn: any, settings: any, orgId: string, uid: string) {
  if (!actor || actor.organizationId !== orgId || actor.isActive !== true || !checkIn || checkIn.organizationId !== orgId) return { read: false, upload: false };
  const roles: string[] = Array.isArray(actor.roles) ? actor.roles : [];
  const operators = ["super_admin", "church_admin", "pastor", "secretary", ...(Array.isArray(settings?.qrGeneratorRoles) ? settings.qrGeneratorRoles : [])];
  const operator = roles.some(role => operators.includes(role));
  return { read: operator || checkIn.parentId === uid || (Array.isArray(checkIn.authorizedPickUpIds) && checkIn.authorizedPickUpIds.includes(uid)), upload: operator };
}
export async function authorizeKids(tx: AccountTransaction, orgId: string, id: string, uid: string, upload = false, active = true) {
  documentId(orgId, "Igreja"); documentId(id, "Check-in"); documentId(uid, "Conta");
  const root = `organizations/${orgId}`;
  const [org, actor, checkIn, settings] = await tx.read(root, `${root}/users/${uid}`, `${root}/kidsCheckIns/${id}`, `${root}/settings/kids`);
  const access = kidsAccess(actor, checkIn, settings, orgId, uid);
  if (org?.status !== "active" || !(upload ? access.upload : access.read)) throw new AccountError(403, "Você não tem acesso a esta mídia Kids.");
  if (active && checkIn?.status !== "checked_in") throw new AccountError(409, "Este check-in não está ativo.");
  return checkIn!;
}
export const readKids = (orgId: string, id: string, uid: string, upload = false) => accountTransaction(tx => authorizeKids(tx, orgId, id, uid, upload));

export async function boundedJson(req: Request, max = 2048): Promise<any> {
  const reader = req.body?.getReader();
  if (!reader) throw new AccountError(400, "Pedido vazio.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new AccountError(413, "Arquivo ou pedido muito grande."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw new AccountError(400, "Pedido inválido."); }
}
export function photoBytes(dataUrl: unknown) {
  if (typeof dataUrl !== "string") throw new AccountError(400, "Foto obrigatória.");
  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match || match[2].length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4) throw new AccountError(400, "Use uma foto JPEG ou PNG de até 500 KB.");
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0)); }
  catch { throw new AccountError(400, "Conteúdo da foto inválido."); }
  const jpeg = bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  const png = bytes.length >= 33 && [137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b);
  if (bytes.length > MAX_PHOTO_BYTES || !(match[1] === "image/jpeg" ? jpeg : png)) throw new AccountError(400, "Conteúdo da foto inválido.");
  return { bytes, contentType: match[1] };
}
function storageBase() {
  if (isLocalQaFirebase()) return "http://127.0.0.1:9199";
  return "https://storage.googleapis.com";
}
async function storageHeaders() {
  return { Authorization: `Bearer ${isLocalQaFirebase() ? "owner" : await getGoogleAccessToken("https://www.googleapis.com/auth/devstorage.read_write")}` };
}
function bucket() {
  const value = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!value || !/^[a-z0-9][a-z0-9.-]+$/.test(value) || (isLocalQaFirebase() && value !== "demo-alvo-qa.firebasestorage.app")) throw new Error("Storage não configurado.");
  return value;
}
export async function putPhoto(path: string, bytes: Uint8Array, contentType: string) {
  const boundary = `kids_${crypto.randomUUID()}`;
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: path, contentType, cacheControl: "private, no-store" })}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
    new Uint8Array(bytes), `\r\n--${boundary}--`,
  ]);
  const response = await fetch(`${storageBase()}/upload/storage/v1/b/${bucket()}/o?uploadType=multipart`, { method: "POST", headers: { ...await storageHeaders(), "Content-Type": `multipart/related; boundary=${boundary}` }, body, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Falha ao salvar foto privada.");
}
export async function deletePhoto(path: string) {
  const response = await fetch(`${storageBase()}/storage/v1/b/${bucket()}/o/${encodeURIComponent(path)}`, { method: "DELETE", headers: await storageHeaders(), signal: AbortSignal.timeout(10000) });
  if (!response.ok && response.status !== 404) throw new Error("Falha ao remover foto privada.");
}
export function photoObjectPrefix(orgId: string, id: string) {
  return `kids-private/${orgId}/${createHash("sha256").update(id).digest("hex")}/`;
}
export function validPhotoPath(path: unknown, orgId: string, id: string): path is string {
  return typeof path === "string" && path.startsWith(photoObjectPrefix(orgId, id)) && /^[a-zA-Z0-9_/-]+$/.test(path) && path.split("/").length === 4;
}
export async function getPhoto(path: string) {
  const response = await fetch(`${storageBase()}/storage/v1/b/${bucket()}/o/${encodeURIComponent(path)}?alt=media`, { headers: await storageHeaders(), cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Foto privada indisponível.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_PHOTO_BYTES) throw new Error("Foto inválida.");
  const contentType = response.headers.get("content-type")?.split(";")[0];
  const dataUrl = `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
  photoBytes(dataUrl);
  return dataUrl;
}

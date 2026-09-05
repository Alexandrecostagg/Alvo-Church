import { authorizeSession } from "./kids-sessions";
import { createHash } from "node:crypto";
import { AccountError, accountTransaction, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { authorizeKids, kidsAccess } from "./kids-media";
const hash = (data: unknown) => createHash("sha256").update(JSON.stringify(data)).digest("hex");
function text(value: unknown, name: string, max = 120, required = true) {
  if (!required && (value === undefined || value === "")) return "";
  if (typeof value !== "string" || (required && !value.trim()) || value.length > max) throw new AccountError(400, `${name} inválido.`);
  return value.trim();
}
function requestId(value: unknown) {
  const id = documentId(value, "Tentativa");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AccountError(400, "Tentativa inválida.");
  return id;
}
export function guardianInput(raw: any) {
  if (raw?.identityConfirmed !== true) throw new AccountError(400, "Confirme a identidade do responsável e as autorizações.");
  const guardianName = text(raw.guardianName, "Nome do responsável");
  const guardianEmail = text(raw.guardianEmail, "E-mail", 254, false).toLowerCase();
  if (guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) throw new AccountError(400, "E-mail inválido.");
  if (!Array.isArray(raw.authorizedNames) || raw.authorizedNames.length > 5) throw new AccountError(400, "Informe até cinco autorizados.");
  const authorizedNames = raw.authorizedNames.map((name: unknown) => text(name, "Nome autorizado"));
  const names = [guardianName, ...authorizedNames].map(name => name.toLocaleLowerCase("pt-BR"));
  if (new Set(names).size !== names.length) throw new AccountError(400, "Não repita nomes na lista de autorizados.");
  return { guardianName, guardianEmail, authorizedNames, guardianPhone: text(raw.guardianPhone, "Telefone", 30, false) };
}
async function guardianData(tx: AccountTransaction, orgId: string, input: ReturnType<typeof guardianInput>) {
  let parentId = "";
  if (input.guardianEmail) {
    const matches = await tx.usersByEmail(orgId, input.guardianEmail);
    if (matches.length !== 1 || matches[0].isActive !== true || matches[0].organizationId !== orgId) throw new AccountError(409, "Conta ativa não encontrada de forma única nesta igreja. Confira o e-mail ou registre como responsável sem conta.");
    parentId = documentId(matches[0].id, "Conta do responsável");
  }
  return { parentId, guardianAccountEmail: input.guardianEmail, authorizedPickUpIds: [], guardianName: input.guardianName, guardianPhone: input.guardianPhone,
    authorizedPickupNames: input.authorizedNames,
    pickupPeople: [{ id: "primary", name: input.guardianName, userId: parentId }, ...input.authorizedNames.map((name: string, i: number) => ({ id: `authorized_${i + 1}`, name, userId: "" }))] };
}
async function operator(tx: AccountTransaction, orgId: string, uid: string) {
  documentId(orgId, "Igreja"); documentId(uid, "Conta");
  const [org, actor, settings] = await tx.read(`organizations/${orgId}`, `organizations/${orgId}/users/${uid}`, `organizations/${orgId}/settings/kids`);
  if (org?.status !== "active" || !kidsAccess(actor, { organizationId: orgId }, settings, orgId, uid).upload) throw new AccountError(403, "Somente a equipe Kids pode registrar esta operação.");
}
export async function createKids(raw: any, uid: string) {
  const organizationId = documentId(raw.organizationId, "Igreja"), attempt = requestId(raw.requestId);
  const guardians = guardianInput(raw);
  const input = { ...guardians, sessionId: documentId(raw.sessionId, "Sessão"), childId: raw.childId ? documentId(raw.childId, "Criança cadastrada") : "", childName: text(raw.childName, "Nome da criança"), roomCode: text(raw.roomCode, "Sala", 120, false), allergies: text(raw.allergies, "Alergias", 500, false), securityRestrictions: text(raw.securityRestrictions, "Restrições", 500, false) };
  const fingerprint = hash({ input, uid }), id = `kc_${attempt}`;
  return accountTransaction(async tx => {
    await operator(tx, organizationId, uid);
    await authorizeSession(tx, organizationId, uid, input.sessionId);
    const path = `organizations/${organizationId}/kidsCheckIns/${id}`;
    const [existing] = await tx.read(path);
    if (existing) {
      if (existing.registrationFingerprint !== fingerprint) throw new AccountError(409, "Esta tentativa já registrou outra entrada. Atualize a lista antes de continuar.");
      if (existing.status !== "checked_in") throw new AccountError(409, "Esta entrada já foi encerrada. Atualize a lista.");
      return { checkIn: existing, replayed: true };
    }
    const session = (await authorizeSession(tx, organizationId, uid, input.sessionId, true))!;
    let childName = input.childName;
    if (input.childId) {
      const [child, claim] = await tx.read(`organizations/${organizationId}/people/${input.childId}`, `organizations/${organizationId}/kidsChildPresence/${input.childId}`);
      if (child?.organizationId !== organizationId || child.status !== "active" || !["child", "teen"].includes(child.personType)) throw new AccountError(409, "Criança cadastral não encontrada nesta igreja.");
      if (claim) throw new AccountError(409, "Esta criança já possui uma entrada ativa. Confira a outra sala.");
      childName = `${child.firstName} ${child.lastName ?? ""}`.trim();
      tx.set(`organizations/${organizationId}/kidsChildPresence/${input.childId}`, { checkInId: id, sessionId: session.id });
    }
    const guardian = await guardianData(tx, organizationId, input);
    const now = new Date().toISOString();
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const random = crypto.getRandomValues(new Uint8Array(10));
    const code = Array.from(random, n => alphabet[n % alphabet.length]).join("");
    const checkIn = { id, organizationId, childId: input.childId || `quick_${attempt}`, ...guardian, childName, registeredChild: Boolean(input.childId), sessionId: session.id, eventId: session.eventId, serviceTeamId: session.serviceTeamId, roomCode: session.roomName, allergies: input.allergies, securityRestrictions: input.securityRestrictions, securityToken: `KID-${crypto.randomUUID().replaceAll("-", "")}`, pickupCode: `KD-${code}`, checkedInAt: now, checkedInByUserId: uid, status: "checked_in", guardianVersion: 1, registrationFingerprint: fingerprint };
    tx.set(path, checkIn);
    tx.patch(`organizations/${organizationId}/kidsOperationSessions/${session.id}`, { occupancy: session.occupancy + 1 });
    tx.set(`organizations/${organizationId}/kidsCustodyAudit/${crypto.randomUUID()}`, { checkInId: id, action: "check_in", actorId: uid, parentId: guardian.parentId, pickupPeople: guardian.pickupPeople, identityConfirmed: true, at: now });
    return { checkIn, replayed: false };
  });
}
export async function assignGuardians(raw: any, uid: string) {
  const organizationId = documentId(raw.organizationId, "Igreja"), id = documentId(raw.checkInId, "Check-in");
  const input = guardianInput(raw), reason = text(raw.reason, "Motivo", 500);
  if (!Number.isInteger(raw.expectedGuardianVersion) || raw.expectedGuardianVersion < 0) throw new AccountError(400, "Versão do vínculo inválida.");
  return accountTransaction(async tx => {
    const current = await authorizeKids(tx, organizationId, id, uid, true);
    if ((current.guardianVersion ?? 0) !== raw.expectedGuardianVersion) throw new AccountError(409, "Os responsáveis mudaram. Atualize antes de confirmar.");
    const guardians = await guardianData(tx, organizationId, input);
    const guardianVersion = (current.guardianVersion ?? 0) + 1;
    tx.patch(`organizations/${organizationId}/kidsCheckIns/${id}`, { ...guardians, guardianVersion });
    tx.set(`organizations/${organizationId}/kidsCustodyAudit/${crypto.randomUUID()}`, { checkInId: id, action: "guardians_changed", actorId: uid, fromParentId: current.parentId ?? "", parentId: guardians.parentId, previousPeople: current.pickupPeople ?? [], pickupPeople: guardians.pickupPeople, identityConfirmed: true, guardianVersion, reason, at: new Date().toISOString() });
    return { checkIn: { ...current, ...guardians, guardianVersion } };
  });
}
export async function releaseKids(raw: any, uid: string) {
  const organizationId = documentId(raw.organizationId, "Igreja"), id = documentId(raw.checkInId, "Check-in"), attempt = requestId(raw.requestId);
  if (raw.identityConfirmed !== true) throw new AccountError(400, "Confira a identidade, a foto e as restrições antes de confirmar.");
  if (!Number.isInteger(raw.expectedGuardianVersion) || raw.expectedGuardianVersion < 1) throw new AccountError(409, "Confirme o responsável deste check-in antigo pelo painel antes de liberar.");
  const receiverId = documentId(raw.receiverId, "Pessoa que retira"), proof = text(raw.proof, "QR ou código", 128);
  const note = text(raw.note, "Observação", 500, false);
  const fingerprint = hash({ uid, receiverId, proof, note, version: raw.expectedGuardianVersion });
  return accountTransaction(async tx => {
    const current = await authorizeKids(tx, organizationId, id, uid, true, false);
    if (current.status !== "checked_in") {
      if (current.status === "checked_out" && current.checkoutRequestId === attempt && current.checkoutFingerprint === fingerprint) return { replayed: true, receiverName: current.releasedTo };
      throw new AccountError(409, "Esta criança já foi retirada ou o check-in foi encerrado.");
    }
    if (current.guardianVersion !== raw.expectedGuardianVersion) throw new AccountError(409, "Os responsáveis mudaram. Atualize a identificação.");
    if (proof !== current.securityToken && proof.toUpperCase() !== current.pickupCode) throw new AccountError(403, "QR ou código de retirada incorreto.");
    const receiver = Array.isArray(current.pickupPeople) ? current.pickupPeople.find((person: any) => person.id === receiverId) : null;
    if (!receiver) throw new AccountError(403, "Esta pessoa não está autorizada a retirar. Confirme os responsáveis antes de continuar.");
    if (receiver.userId) {
      const [account] = await tx.read(`organizations/${organizationId}/users/${documentId(receiver.userId, "Responsável")}`);
      if (account?.isActive !== true || account.organizationId !== organizationId) throw new AccountError(409, "Conta do responsável inativa. Confirme novamente a autorização pelo painel.");
    }
    const session = await authorizeSession(tx, organizationId, uid, current.sessionId);
    if (session) {
      if (!Number.isInteger(session.occupancy) || session.occupancy < 1) throw new AccountError(409, "Ocupação inconsistente. Procure a administração.");
      tx.patch(`organizations/${organizationId}/kidsOperationSessions/${session.id}`, { occupancy: session.occupancy - 1 });
    }
    if (current.registeredChild === true) {
      const claimPath = `organizations/${organizationId}/kidsChildPresence/${documentId(current.childId, "Criança")}`;
      const [claim] = await tx.read(claimPath);
      if (claim?.checkInId !== id) throw new AccountError(409, "Presença cadastral inconsistente. Procure a administração.");
      tx.remove(claimPath);
    }
    const at = new Date().toISOString();
    tx.patch(`organizations/${organizationId}/kidsCheckIns/${id}`, { status: "checked_out", photoRetentionPending: Boolean(current.photoPath || current.photoUrl), checkedOutAt: at, checkedOutByUserId: uid, checkedOutByParentId: receiver.userId || null, releasedTo: receiver.name, releaseNote: note, checkoutReceiverId: receiverId, checkoutRequestId: attempt, checkoutFingerprint: fingerprint });
    tx.set(`organizations/${organizationId}/kidsCustodyAudit/${crypto.randomUUID()}`, { checkInId: id, action: "check_out", actorId: uid, receiverId, receiverUserId: receiver.userId || null, receiverName: receiver.name, guardianVersion: current.guardianVersion, identityConfirmed: true, note, at });
    return { replayed: false, receiverName: receiver.name };
  });
}

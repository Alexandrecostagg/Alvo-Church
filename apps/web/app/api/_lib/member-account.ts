import { AccountError, accountTransaction, type AccountTransaction } from "./member-account-store";

export { AccountError };
const MANAGERS = ["church_admin", "super_admin"];
export function documentId(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value))
    throw new AccountError(400, `${label} inválido.`);
  return value;
}
export function linkInput(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AccountError(400, "Vínculo inválido.");
  const d = raw as Record<string, unknown>;
  return {
    organizationId: documentId(d.organizationId, "Igreja"), userId: documentId(d.userId, "Conta"),
    personId: d.personId === null ? null : documentId(d.personId, "Pessoa"),
    expectedPersonId: d.expectedPersonId === null ? null : documentId(d.expectedPersonId, "Vínculo anterior"),
  };
}
async function authorize(tx: AccountTransaction, orgId: string, uid: string, manage = false) {
  documentId(uid, "Conta");
  const root = `organizations/${orgId}`;
  const [org, actor] = await tx.read(root, `${root}/users/${uid}`);
  if (!org || org.status !== "active" || !actor || actor.organizationId !== orgId || actor.isActive !== true ||
      (manage && (!Array.isArray(actor.roles) || !actor.roles.some((r: string) => MANAGERS.includes(r)))))
    throw new AccountError(403, "Você não tem acesso a esta operação nesta igreja.");
  return { root, org, actor };
}
export async function readAccountLink(orgId: string, userId: string, uid: string) {
  documentId(orgId, "Igreja"); documentId(userId, "Conta");
  return accountTransaction(async tx => {
    const { root } = await authorize(tx, orgId, uid, true);
    const [target, link] = await tx.read(`${root}/users/${userId}`, `${root}/memberAccountLinks/${userId}`);
    if (!target || target.organizationId !== orgId) throw new AccountError(404, "Conta não encontrada nesta igreja.");
    const personId = typeof link?.personId === "string" ? link.personId : null;
    const [person] = personId ? await tx.read(`${root}/people/${documentId(personId, "Pessoa")}`) : [null];
    return { personId, personName: person ? `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() : null };
  });
}
export async function setAccountLink(raw: unknown, uid: string) {
  const { organizationId, userId, personId, expectedPersonId } = linkInput(raw);
  return accountTransaction(async tx => {
    const { root } = await authorize(tx, organizationId, uid, true);
    const [target, oldLink] = await tx.read(`${root}/users/${userId}`, `${root}/memberAccountLinks/${userId}`);
    if (!target || target.organizationId !== organizationId) throw new AccountError(404, "Conta não encontrada nesta igreja.");
    const oldPersonId = typeof oldLink?.personId === "string" ? documentId(oldLink.personId, "Pessoa") : null;
    if (oldPersonId !== expectedPersonId) throw new AccountError(409, "O vínculo foi alterado. Atualize antes de salvar.");
    const [person, claim] = personId ? await tx.read(`${root}/people/${personId}`, `${root}/memberAccountClaims/${personId}`) : [null, null];
    const [oldClaim] = oldPersonId && oldPersonId !== personId ? await tx.read(`${root}/memberAccountClaims/${oldPersonId}`) : [null];
    if (personId) {
      if (target.isActive !== true) throw new AccountError(409, "Ative a conta antes de vinculá-la.");
      if (!person || person.organizationId !== organizationId || person.status !== "active") throw new AccountError(404, "Pessoa ativa não encontrada nesta igreja.");
      if (claim && claim.userId !== userId) throw new AccountError(409, "Esta pessoa já está vinculada a outra conta.");
    }
    if (oldPersonId === personId && target.personId === personId && (!personId || claim?.userId === userId)) return { personId };
    const changedAt = new Date().toISOString();
    if (oldPersonId && oldPersonId !== personId && oldClaim?.userId === userId) tx.remove(`${root}/memberAccountClaims/${oldPersonId}`);
    if (personId) {
      tx.set(`${root}/memberAccountLinks/${userId}`, { organizationId, userId, personId, verifiedBy: uid, changedAt });
      tx.set(`${root}/memberAccountClaims/${personId}`, { organizationId, userId, personId });
    } else tx.remove(`${root}/memberAccountLinks/${userId}`);
    tx.patch(`${root}/users/${userId}`, { personId });
    tx.set(`${root}/memberAccountAudit/${crypto.randomUUID()}`, { organizationId, userId, fromPersonId: oldPersonId, toPersonId: personId, changedBy: uid, changedAt });
    return { personId };
  });
}
export function activePass(person: Record<string, any> | null, organizationId: string) {
  if (!person || person.organizationId !== organizationId || person.status !== "active" || person.partnerBenefitsEnabled !== true ||
      typeof person.consentLgpdAt !== "string" || !Number.isFinite(Date.parse(person.consentLgpdAt)) ||
      typeof person.memberCardCode !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(person.memberCardCode)) return null;
  const name = [person.firstName, person.lastName].filter(v => typeof v === "string" && v.trim()).join(" ").trim();
  return name ? { name, code: person.memberCardCode } : null;
}
export async function readOwnPass(orgId: string, uid: string) {
  documentId(orgId, "Igreja");
  return accountTransaction(async tx => {
    const { root, org, actor } = await authorize(tx, orgId, uid);
    const [link] = await tx.read(`${root}/memberAccountLinks/${uid}`);
    // Legacy/self-editable users.personId alone never establishes ownership.
    if (!link || link.organizationId !== orgId || link.userId !== uid || !link.verifiedBy || actor.personId !== link.personId)
      return { status: "unlinked" as const };
    const personId = documentId(link.personId, "Pessoa");
    const [person, claim] = await tx.read(`${root}/people/${personId}`, `${root}/memberAccountClaims/${personId}`);
    if (!claim || claim.organizationId !== orgId || claim.userId !== uid || claim.personId !== personId) return { status: "unlinked" as const };
    const pass = activePass(person, orgId);
    if (!pass) return { status: "unavailable" as const };
    return { status: "active" as const, pass: { ...pass, organizationName: String(org.displayName ?? org.name ?? "Minha igreja") } };
  });
}

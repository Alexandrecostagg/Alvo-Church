import { randomBytes } from "node:crypto";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { participationOrganization, digest } from "./participation";
import { channelForOrg } from "./whatsapp-config";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";

async function verifiedPerson(
  tx: AccountTransaction,
  root: string,
  orgId: string,
  userId: string,
) {
  const [user, link] = await tx.read(
    `${root}/users/${userId}`,
    `${root}/memberAccountLinks/${userId}`,
  );
  if (
    user?.organizationId !== orgId ||
    user.isActive !== true ||
    link?.organizationId !== orgId ||
    link.userId !== userId ||
    !link.verifiedBy ||
    user.personId !== link.personId
  )
    throw new AccountError(
      403,
      "Peça à secretaria para conferir o vínculo da sua conta com o cadastro.",
    );
  const personId = documentId(link.personId, "Pessoa");
  const [person, claim] = await tx.read(
    `${root}/people/${personId}`,
    `${root}/memberAccountClaims/${personId}`,
  );
  if (
    person?.organizationId !== orgId ||
    person.status !== "active" ||
    claim?.userId !== userId ||
    claim.personId !== personId ||
    claim.organizationId !== orgId
  )
    throw new AccountError(403, "Cadastro sem vínculo válido.");
  return { personId, person };
}
export async function issueWhatsappLink(slug: string, uid: string) {
  const code = randomBytes(16).toString("hex"),
    tokenHash = digest(code),
    now = Date.now();
  return accountTransaction(async (tx) => {
    const { root, orgId } = await participationOrganization(tx, slug);
    await assertModuleEnabled(tx, root, "communication");
    const { personId } = await verifiedPerson(tx, root, orgId, uid);
    const channel = channelForOrg(orgId);
    if (!channel)
      throw new AccountError(
        503,
        "O WhatsApp da igreja ainda não está conectado.",
      );
    const [previous] = await tx.read(`${root}/whatsappLinkAttempts/${uid}`);
    if (previous?.createdAt > now - 30000)
      throw new AccountError(
        429,
        "Aguarde 30 segundos para gerar outro vínculo.",
      );
    tx.set(`${root}/whatsappLinkTokens/${tokenHash}`, {
      organizationId: orgId,
      personId,
      userId: uid,
      expiresAt: now + 10 * 60000,
      consumed: false,
    });
    tx.set(`${root}/whatsappLinkAttempts/${uid}`, {
      tokenHash,
      createdAt: now,
    });
    return {
      url: `https://wa.me/${channel.publicPhone}?text=${encodeURIComponent(`VINCULAR ${code}`)}`,
      expiresAt: new Date(now + 10 * 60000).toISOString(),
    };
  });
}
export async function consumeWhatsappLink(
  orgId: string,
  phone: string,
  code: string,
) {
  if (!/^[a-f0-9]{32}$/.test(code))
    throw new AccountError(400, "Código de vínculo inválido.");
  return accountTransaction(async (tx) => {
    const root = `organizations/${orgId}`,
      path = `${root}/whatsappLinkTokens/${digest(code)}`,
      contactPath = `${root}/whatsappContacts/${digest(phone)}`;
    const [token, contact] = await tx.read(path, contactPath);
    if (
      !token ||
      token.organizationId !== orgId ||
      token.expiresAt < Date.now() ||
      token.consumed
    )
      throw new AccountError(
        409,
        "Código expirado ou já utilizado. Gere outro pelo portal da igreja.",
      );
    const [attempt, binding] = await tx.read(
      `${root}/whatsappLinkAttempts/${token.userId}`,
      `${root}/whatsappBindings/${token.personId}`,
    );
    if (
      attempt?.tokenHash !== digest(code) ||
      (binding && binding.phone !== phone) ||
      (contact?.personId && contact.personId !== token.personId)
    )
      throw new AccountError(
        409,
        "Já existe outro vínculo. Procure a secretaria para conferência.",
      );
    const { personId } = await verifiedPerson(tx, root, orgId, token.userId);
    if (personId !== token.personId)
      throw new AccountError(409, "O vínculo cadastral mudou.");
    tx.patch(path, { consumed: true, consumedAt: new Date().toISOString() });
    tx.patch(contactPath, { personId, userId: token.userId });
    tx.set(`${root}/whatsappBindings/${personId}`, {
      organizationId: orgId,
      phone,
      userId: token.userId,
      personId,
      linkedAt: new Date().toISOString(),
    });
    return { ok: true };
  });
}
async function boundMember(
  tx: AccountTransaction,
  root: string,
  orgId: string,
  phone: string,
) {
  const [contact] = await tx.read(`${root}/whatsappContacts/${digest(phone)}`);
  if (!contact?.userId || !contact?.personId)
    throw new AccountError(
      403,
      "Primeiro vincule sua conta pelo portal da igreja. Você não precisa instalar aplicativo.",
    );
  const { personId } = await verifiedPerson(
    tx,
    root,
    orgId,
    documentId(contact.userId, "Conta"),
  );
  const [binding] = await tx.read(`${root}/whatsappBindings/${personId}`);
  if (
    personId !== contact.personId ||
    binding?.phone !== phone ||
    binding.userId !== contact.userId
  )
    throw new AccountError(
      403,
      "Vínculo não confirmado. Procure a secretaria.",
    );
  return { personId };
}
export async function memberCellMeetings(orgId: string, phone: string) {
  return accountTransaction(async (tx) => {
    const root = `organizations/${orgId}`;
    await assertModuleEnabled(tx, root, "groups");
    const { personId } = await boundMember(tx, root, orgId, phone);
    const groups = await tx.query(
      root,
      "groups",
      "status",
      "active",
      "EQUAL",
      100,
    );
    const memberships = await tx.read(
      ...groups.map(
        (g) => `${root}/groups/${g.id}/members/${g.id}_${personId}`,
      ),
    );
    const result: Array<{
      groupId: string;
      groupName: string;
      meetingId: string;
      startsAt: string;
    }> = [];
    for (let i = 0; i < groups.length; i++)
      if (
        memberships[i]?.personId === personId &&
        memberships[i]?.organizationId === orgId
      ) {
        const meetings = await tx.query(
          `${root}/groups/${groups[i].id}`,
          "meetings",
          "meetingStatus",
          "scheduled",
          "EQUAL",
          30,
        );
        for (const meeting of meetings)
          if (
            Math.abs(Date.parse(meeting.scheduledStartAt) - Date.now()) <=
            3 * 60 * 60 * 1000
          )
            result.push({
              groupId: groups[i].id,
              groupName: groups[i].name,
              meetingId: meeting.id,
              startsAt: meeting.scheduledStartAt,
            });
        if (result.length >= 10) break;
      }
    return result.slice(0, 10);
  });
}
export async function confirmOwnCellAttendance(
  orgId: string,
  phone: string,
  groupId: string,
  meetingId: string,
) {
  documentId(groupId, "Célula");
  documentId(meetingId, "Encontro");
  return accountTransaction(async (tx) => {
    const root = `organizations/${orgId}`;
    await assertModuleEnabled(tx, root, "groups");
    const { personId } = await boundMember(tx, root, orgId, phone);
    const groupPath = `${root}/groups/${groupId}`,
      meetingPath = `${groupPath}/meetings/${meetingId}`,
      attendancePath = `${meetingPath}/attendance/${meetingId}_${personId}`;
    const [group, membership, meeting, existing] = await tx.read(
      groupPath,
      `${groupPath}/members/${groupId}_${personId}`,
      meetingPath,
      attendancePath,
    );
    if (
      group?.organizationId !== orgId ||
      group.status !== "active" ||
      membership?.personId !== personId ||
      membership.organizationId !== orgId ||
      meeting?.organizationId !== orgId ||
      meeting.groupId !== groupId ||
      meeting.meetingStatus !== "scheduled" ||
      !Number.isFinite(Date.parse(meeting.scheduledStartAt)) ||
      Math.abs(Date.parse(meeting.scheduledStartAt) - Date.now()) >
        3 * 60 * 60 * 1000
    )
      throw new AccountError(
        409,
        "Encontro indisponível para confirmação. Procure o líder.",
      );
    if (existing?.recordedByUserId || existing?.attendanceStatus === "present")
      return { ok: true, replayed: true };
    tx.set(attendancePath, {
      id: `${meetingId}_${personId}`,
      organizationId: orgId,
      groupId,
      groupMeetingId: meetingId,
      personId,
      attendanceStatus: "present",
      recordedAt: new Date().toISOString(),
      recordedBySource: "whatsapp",
      selfReported: true,
    });
    return { ok: true, replayed: false };
  });
}

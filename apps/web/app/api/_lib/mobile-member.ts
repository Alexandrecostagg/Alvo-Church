import { AccountError, accountTransaction, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";

async function identity(tx: AccountTransaction, orgId: string, uid: string) {
  const root = `organizations/${orgId}`;
  const [org, actor, link] = await tx.read(root, `${root}/users/${uid}`, `${root}/memberAccountLinks/${uid}`);
  if (!org || org.status !== "active" || actor?.organizationId !== orgId || actor.isActive !== true) {
    throw new AccountError(403, "Acesso à instituição indisponível.");
  }
  if (link?.organizationId !== orgId || link.userId !== uid || !link.verifiedBy || actor.personId !== link.personId) {
    return { root, personId: null };
  }
  const personId = documentId(link.personId, "Pessoa");
  const [person, claim] = await tx.read(`${root}/people/${personId}`, `${root}/memberAccountClaims/${personId}`);
  if (person?.organizationId !== orgId || person.status !== "active" || claim?.organizationId !== orgId || claim.userId !== uid || claim.personId !== personId) {
    return { root, personId: null };
  }
  return { root, personId };
}

/** Member identity always comes from the verified server binding, never the body. */
export async function mobileMemberOperation(body: Record<string, unknown>, uid: string) {
  const orgId = documentId(body.organizationId, "Instituição");
  documentId(uid, "Conta");
  const action = body.action;
  if (!["groups", "attendance", "assignments", "respond", "journey"].includes(String(action))) throw new AccountError(400, "Operação inválida.");
  return accountTransaction(async tx => {
    const { root, personId } = await identity(tx, orgId, uid);
    await assertModuleEnabled(tx, root, action === "groups" || action === "attendance" ? "groups" : action === "journey" ? "journeys" : "volunteers");
    if (!personId) {
      if (action === "respond" || action === "attendance") throw new AccountError(409, "Peça à secretaria para vincular sua conta ao cadastro de membro.");
      return { status: "unlinked", groups: [], assignments: [], profile: null };
    }
    if (action === "journey") {
      const [profile] = await tx.read(`${root}/journeyProfiles/${personId}`);
      return { status: "active", profile: profile?.organizationId === orgId && profile.personId === personId ? {
        currentStage: profile.currentStage, engagementScore: profile.engagementScore,
      } : null };
    }
    if (action === "assignments") {
      const assignments = await tx.query(root, "serviceAssignments", "personId", personId, "EQUAL", 200);
      return { status: "active", assignments: assignments.filter(a => a.organizationId === orgId).map(a => ({
        id: a.id, role: a.role, serviceDate: a.serviceDate, status: a.status, responseNote: a.responseNote ?? "",
      })).sort((a, b) => Date.parse(a.serviceDate) - Date.parse(b.serviceDate)) };
    }
    if (action === "respond") {
      const id = documentId(body.assignmentId, "Escala");
      if (body.status !== "confirmed" && body.status !== "declined") throw new AccountError(400, "Resposta inválida.");
      if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 500)) throw new AccountError(400, "Motivo inválido.");
      const path = `${root}/serviceAssignments/${id}`;
      const [assignment] = await tx.read(path);
      if (assignment?.organizationId !== orgId || assignment.personId !== personId) throw new AccountError(404, "Escala não encontrada.");
      if (assignment.status === body.status) return { ok: true, replayed: true };
      if (assignment.status !== "pending") throw new AccountError(409, "Esta escala já foi respondida. Atualize a lista ou procure a liderança.");
      const now = new Date().toISOString();
      tx.patch(path, { status: body.status, responseNote: typeof body.note === "string" ? body.note.trim() : "", confirmedAt: body.status === "confirmed" ? now : null, declinedAt: body.status === "declined" ? now : null, updatedAt: now });
      return { ok: true, replayed: false };
    }
    if (action === "groups") {
      const groups = await tx.query(root, "groups", "status", "active", "EQUAL", 500);
      const memberships = await tx.read(...groups.map(g => `${root}/groups/${g.id}/members/${g.id}_${personId}`));
      const mine = groups.filter((g, i) => g.organizationId === orgId && memberships[i]?.organizationId === orgId && memberships[i]?.personId === personId && memberships[i]?.groupId === g.id);
      const result = [];
      for (const group of mine) {
        const meetings = await tx.query(`${root}/groups/${group.id}`, "meetings", "meetingStatus", "scheduled", "EQUAL", 100);
        const current = meetings.filter(m => m.organizationId === orgId && m.groupId === group.id && Math.abs(Date.parse(m.scheduledStartAt) - Date.now()) <= 3 * 60 * 60 * 1000).sort((a, b) => Date.parse(a.scheduledStartAt) - Date.parse(b.scheduledStartAt))[0];
        const [attendance] = current ? await tx.read(`${root}/groups/${group.id}/meetings/${current.id}/attendance/${current.id}_${personId}`) : [null];
        result.push({ id: group.id, name: group.name, meetingDayOfWeek: group.meetingDayOfWeek ?? null, meetingTime: group.meetingTime ?? null,
          meeting: current ? { id: current.id, startsAt: current.scheduledStartAt, attendanceStatus: attendance?.attendanceStatus ?? null, recordedByLeader: Boolean(attendance?.recordedByUserId) } : null });
      }
      return { status: "active", groups: result };
    }
    const groupId = documentId(body.groupId, "Célula"), meetingId = documentId(body.meetingId, "Encontro");
    const groupPath = `${root}/groups/${groupId}`, meetingPath = `${groupPath}/meetings/${meetingId}`;
    const path = `${meetingPath}/attendance/${meetingId}_${personId}`;
    const [group, membership, meeting, existing] = await tx.read(groupPath, `${groupPath}/members/${groupId}_${personId}`, meetingPath, path);
    if (group?.organizationId !== orgId || group.status !== "active" || membership?.organizationId !== orgId || membership.personId !== personId || membership.groupId !== groupId || meeting?.organizationId !== orgId || meeting.groupId !== groupId || meeting.meetingStatus !== "scheduled" || !Number.isFinite(Date.parse(meeting.scheduledStartAt)) || Math.abs(Date.parse(meeting.scheduledStartAt) - Date.now()) > 3 * 60 * 60 * 1000) {
      throw new AccountError(409, "Encontro indisponível para confirmação. Procure o líder.");
    }
    if (existing?.attendanceStatus === "present") return { ok: true, replayed: true };
    if (existing?.recordedByUserId) throw new AccountError(409, "A liderança já registrou sua presença. Procure o líder para revisar.");
    tx.set(path, { id: `${meetingId}_${personId}`, organizationId: orgId, groupId, groupMeetingId: meetingId, personId, attendanceStatus: "present", recordedAt: new Date().toISOString(), recordedBySource: "mobile", selfReported: true });
    return { ok: true, replayed: false };
  });
}

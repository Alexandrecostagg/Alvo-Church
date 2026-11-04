import { AccountError, type AccountTransaction } from "./member-account-store";
export async function respondServing(
  tx: AccountTransaction,
  root: string,
  orgId: string,
  personId: string,
  id: string,
  status: unknown,
  note: unknown,
  source: string,
) {
  if (status !== "confirmed" && status !== "declined")
    throw new AccountError(400, "Resposta inválida.");
  if (note !== undefined && (typeof note !== "string" || note.length > 500))
    throw new AccountError(400, "Motivo deve ter até 500 caracteres.");
  const path = `${root}/serviceAssignments/${id}`,
    [assignment] = await tx.read(path);
  if (assignment?.organizationId !== orgId || assignment.personId !== personId)
    throw new AccountError(404, "Escala não encontrada.");
  if (assignment.status === status) return { ok: true, replayed: true };
  if (assignment.status !== "pending")
    throw new AccountError(
      409,
      "Esta escala já foi respondida ou cancelada. Atualize a lista ou procure a liderança.",
    );
  const now = new Date().toISOString();
  tx.patch(path, {
    status,
    responseNote: typeof note === "string" ? note.trim() : "",
    confirmedAt: status === "confirmed" ? now : null,
    declinedAt: status === "declined" ? now : null,
    responseSource: source,
    updatedAt: now,
  });
  tx.set(`${root}/servingAudit/${crypto.randomUUID()}`, {
    organizationId: orgId,
    assignmentId: id,
    personId,
    action: "response",
    status,
    source,
    at: now,
  });
  return { ok: true, replayed: false };
}

import { createHash } from "node:crypto";
import { AccountError, accountTransaction } from "./member-account-store";
import { financeActor } from "./finance-operations";
import { documentId } from "./member-account";
import { deletePhoto, validPhotoPath } from "./kids-media";
export function retentionDays(value: unknown) {
  if (typeof value !== "number" || ![7, 30, 90, 365].includes(value))
    throw new AccountError(400, "Escolha um prazo de 7, 30, 90 ou 365 dias.");
  return value;
}
const fingerprint = (row: any, days: number) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        row.id,
        row.photoPath || null,
        row.photoUrl || null,
        row.checkedOutAt,
        days,
      ]),
    )
    .digest("hex");
export function retentionEligible(row: any, days: number, now = Date.now()) {
  return (
    row?.status === "checked_out" &&
    row.photoRetentionPending === true &&
    typeof row.checkedOutAt === "string" &&
    Number.isFinite(Date.parse(row.checkedOutAt)) &&
    Date.parse(row.checkedOutAt) <= now - retentionDays(days) * 86400000
  );
}
export async function previewRetention(
  orgId: string,
  days: number,
  uid: string,
) {
  retentionDays(days);
  return accountTransaction(async (tx) => {
    const { root } = await financeActor(tx, orgId, uid);
    const rows = await tx.query(
      root,
      "kidsCheckIns",
      "checkedOutAt",
      new Date(Date.now() - days * 86400000).toISOString(),
      "LESS_THAN_OR_EQUAL",
      51,
      { field: "photoRetentionPending", value: true },
    );
    const candidates = rows
      .filter((r) => retentionEligible(r, days))
      .slice(0, 50)
      .map((r) => ({
        id: r.id,
        childName: r.childName,
        checkedOutAt: r.checkedOutAt,
        fingerprint: fingerprint(r, days),
        legacyExternal: Boolean(
          r.photoUrl && !String(r.photoUrl).startsWith("data:"),
        ),
      }));
    return { candidates, hasMore: rows.length > 50, days };
  });
}
export async function purgeRetention(
  raw: any,
  uid: string,
  removeObject = deletePhoto,
) {
  const orgId = documentId(raw.organizationId, "Igreja"),
    id = documentId(raw.checkInId, "Entrada"),
    days = retentionDays(raw.days);
  if (raw.confirm !== true || typeof raw.fingerprint !== "string")
    throw new AccountError(
      400,
      "Revise a prévia e confirme a remoção das fotos.",
    );
  const root = `organizations/${orgId}`,
    path = `${root}/kidsCheckIns/${id}`;
  const old = await accountTransaction(async (tx) => {
    await financeActor(tx, orgId, uid);
    const [row] = await tx.read(path);
    if (!row || row.organizationId !== orgId)
      throw new AccountError(404, "Entrada não encontrada.");
    if (row.photoPurgedFingerprint === raw.fingerprint) return null;
    if (
      !retentionEligible(row, days) ||
      fingerprint({ ...row, id }, days) !== raw.fingerprint
    )
      throw new AccountError(
        409,
        "A prévia mudou ou a foto ainda está no prazo. Atualize.",
      );
    if (row.photoPath && !validPhotoPath(row.photoPath, orgId, id))
      throw new AccountError(
        409,
        "Referência antiga exige migração assistida.",
      );
    return row;
  });
  if (!old) return { ok: true, replayed: true };
  // Keep the object reference until deletion succeeds, allowing safe retries.
  if (old.photoPath) await removeObject(old.photoPath);
  return accountTransaction(async (tx) => {
    await financeActor(tx, orgId, uid);
    const [row] = await tx.read(path);
    if (row?.photoPurgedFingerprint === raw.fingerprint)
      return { ok: true, replayed: true };
    if (
      !retentionEligible(row, days) ||
      fingerprint({ ...row, id }, days) !== raw.fingerprint
    )
      throw new AccountError(409, "A foto mudou; revise a prévia.");
    const at = new Date().toISOString(),
      externalLegacy = Boolean(
        old.photoUrl && !String(old.photoUrl).startsWith("data:"),
      );
    tx.patch(path, {
      photoPath: null,
      photoUrl: null,
      photoConsentAt: null,
      photoUploadedBy: null,
      photoRetentionPending: false,
      photoPurgedAt: at,
      photoPurgedFingerprint: raw.fingerprint,
      externalLegacyCleanupRequired: externalLegacy,
    });
    tx.set(`${root}/kidsCustodyAudit/purge_${id}`, {
      action: "photo_retention",
      checkInId: id,
      actorId: uid,
      days,
      createdAt: at,
      externalLegacyCleanupRequired: externalLegacy,
    });
    return { ok: true, externalLegacyCleanupRequired: externalLegacy };
  });
}

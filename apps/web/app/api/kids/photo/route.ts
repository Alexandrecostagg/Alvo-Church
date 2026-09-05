import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { accountTransaction } from "../../_lib/member-account-store";
import { AccountError, authorizeKids, boundedJson, deletePhoto, photoBytes, photoObjectPrefix, privateHeaders, putPhoto, readKids, validPhotoPath } from "../../_lib/kids-media";

export async function POST(req: NextRequest) {
  let orphan: string | undefined;
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const { organizationId, checkInId, dataUrl, consent } = await boundedJson(req, 700000);
    if (consent !== true) throw new AccountError(400, "Confirme a autorização do responsável para usar a foto.");
    await readKids(organizationId, checkInId, uid, true);
    const { bytes, contentType } = photoBytes(dataUrl);
    const path = `${photoObjectPrefix(organizationId, checkInId)}${crypto.randomUUID()}`;
    orphan = path;
    await putPhoto(path, bytes, contentType);
    const oldPath = await accountTransaction(async tx => {
      const current = await authorizeKids(tx, organizationId, checkInId, uid, true);
      tx.patch(`organizations/${organizationId}/kidsCheckIns/${checkInId}`, { photoPath: path, photoUrl: null, photoConsentAt: new Date().toISOString(), photoUploadedBy: uid });
      return current.photoPath;
    });
    orphan = undefined;
    if (validPhotoPath(oldPath, organizationId, checkInId)) await deletePhoto(oldPath).catch(() => {});
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    if (orphan) await deletePhoto(orphan).catch(() => {});
    return NextResponse.json({ error: error instanceof AccountError ? error.message : "Não foi possível salvar a foto. O check-in permanece registrado." }, { status: error instanceof AccountError ? error.status : 503, headers: privateHeaders });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const { organizationId, checkInId } = await boundedJson(req);
    const previous = await accountTransaction(tx => authorizeKids(tx, organizationId, checkInId, uid, true, false));
    // Keep the reference until deletion succeeds, so an outage can be retried.
    if (validPhotoPath(previous.photoPath, organizationId, checkInId)) await deletePhoto(previous.photoPath);
    await accountTransaction(async tx => {
      const current = await authorizeKids(tx, organizationId, checkInId, uid, true, false);
      if (current.photoPath !== previous.photoPath) throw new AccountError(409, "A foto foi trocada. Atualize antes de remover.");
      tx.patch(`organizations/${organizationId}/kidsCheckIns/${checkInId}`, { photoPath: null, photoUrl: null, photoConsentAt: null, photoUploadedBy: null });
    });
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AccountError ? error.message : "Não foi possível confirmar a remoção da foto." }, { status: error instanceof AccountError ? error.status : 503, headers: privateHeaders });
  }
}

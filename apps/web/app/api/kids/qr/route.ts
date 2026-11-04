import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, boundedJson, getPhoto, privateHeaders, readKids, validPhotoPath } from "../../_lib/kids-media";

// Retired URLs must never render/cache a bearer secret, including old clients.
export function GET() {
  return NextResponse.json({ error: "Atualize o aplicativo para consultar o crachá com segurança." }, { status: 410, headers: privateHeaders });
}
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const { organizationId, checkInId, kind = "qr" } = await boundedJson(req);
    if (!["qr", "photo"].includes(kind)) throw new AccountError(400, "Mídia inválida.");
    const record = await readKids(organizationId, checkInId, uid);
    let dataUrl: string | null = null;
    if (kind === "qr") {
      if (typeof record.securityToken !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(record.securityToken)) throw new AccountError(409, "Crachá inválido. Procure a equipe Kids.");
      dataUrl = await QRCode.toDataURL(record.securityToken, { width: 320, margin: 2, errorCorrectionLevel: "M" });
    } else if (validPhotoPath(record.photoPath, organizationId, checkInId) && typeof record.photoConsentAt === "string" && Number.isFinite(Date.parse(record.photoConsentAt))) {
      dataUrl = await getPhoto(record.photoPath);
    }
    // Recheck after reading Storage/rendering, so a concurrent checkout/revocation
    // cannot grant a fresh response based solely on an earlier authorization.
    const current = await readKids(organizationId, checkInId, uid);
    if (kind === "qr" && current.securityToken !== record.securityToken) throw new AccountError(409, "O crachá mudou. Atualize.");
    if (kind === "photo" && (current.photoPath !== record.photoPath || current.photoConsentAt !== record.photoConsentAt)) throw new AccountError(409, "A foto foi alterada. Atualize.");
    return NextResponse.json({ dataUrl, expiresAt: Date.now() + 60000 }, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AccountError ? error.message : "Não foi possível verificar a mídia Kids." }, { status: error instanceof AccountError ? error.status : 503, headers: privateHeaders });
  }
}

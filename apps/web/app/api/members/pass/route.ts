import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, readOwnPass } from "../../_lib/member-account";
const headers = { "cache-control": "private, no-store", Vary: "Authorization" };
export async function GET(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const result = await readOwnPass(req.nextUrl.searchParams.get("organizationId") ?? "", uid);
    if (result.status !== "active") return NextResponse.json(result, { headers });
    const qrDataUrl = await QRCode.toDataURL(result.pass.code, { width: 280, margin: 2, errorCorrectionLevel: "M" });
    return NextResponse.json({ ...result, pass: { ...result.pass, qrDataUrl }, refreshAfterSeconds: 60 }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AccountError ? error.message : "Não foi possível verificar o Passe. Tente novamente." }, { status: error instanceof AccountError ? error.status : 503, headers });
  }
}

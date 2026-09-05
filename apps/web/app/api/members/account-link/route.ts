import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, readAccountLink, setAccountLink } from "../../_lib/member-account";
const headers = { "cache-control": "private, no-store", Vary: "Authorization" };
async function respond(req: NextRequest, write: boolean) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    if (!write) return NextResponse.json(await readAccountLink(req.nextUrl.searchParams.get("organizationId") ?? "", req.nextUrl.searchParams.get("userId") ?? "", uid), { headers });
    const text = await req.text();
    if (new TextEncoder().encode(text).length > 2000) throw new AccountError(413, "Pedido muito grande.");
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { throw new AccountError(400, "Pedido inválido."); }
    return NextResponse.json(await setAccountLink(raw, uid), { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AccountError ? error.message : "Não foi possível acessar o vínculo. Tente novamente." }, { status: error instanceof AccountError ? error.status : 503, headers });
  }
}
export const GET = (req: NextRequest) => respond(req, false);
export const POST = (req: NextRequest) => respond(req, true);

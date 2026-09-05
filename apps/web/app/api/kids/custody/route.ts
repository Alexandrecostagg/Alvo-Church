import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../../_lib/kids-media";
import { assignGuardians, createKids, releaseKids } from "../../_lib/kids-custody";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 8000);
    const operation = body.action === "check_in" ? createKids : body.action === "guardians" ? assignGuardians : body.action === "check_out" ? releaseKids : null;
    if (!operation) throw new AccountError(400, "Operação inválida.");
    return NextResponse.json(await operation(body, uid), { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AccountError ? error.message : "Não foi possível confirmar a operação. Confira a conexão e tente novamente." }, { status: error instanceof AccountError ? error.status : 503, headers: privateHeaders });
  }
}

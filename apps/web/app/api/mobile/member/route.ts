import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../../_lib/kids-media";
import { mobileMemberOperation } from "../../_lib/mobile-member";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    return NextResponse.json(await mobileMemberOperation(await boundedJson(req, 4000), uid), { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AccountError ? error.message : "Não foi possível concluir. Confira a conexão e tente novamente." }, {
      status: error instanceof AccountError ? error.status : 503, headers: privateHeaders,
    });
  }
}

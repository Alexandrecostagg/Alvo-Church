import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../_lib/kids-media";
import { givingOperation } from "../_lib/giving-operations";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    return NextResponse.json(
      await givingOperation(await boundedJson(req, 10000), uid),
      { headers: privateHeaders },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AccountError
            ? e.message
            : "Não foi possível carregar ou salvar as doações. Tente novamente.",
      },
      {
        status: e instanceof AccountError ? e.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

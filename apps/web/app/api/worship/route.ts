import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../_lib/kids-media";
import { worshipOperation } from "../_lib/worship-operations";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 260000);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new AccountError(400, "Solicitação inválida.");
    return NextResponse.json(await worshipOperation(body, uid), {
      headers: privateHeaders,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AccountError
            ? e.message
            : "Não foi possível concluir. O formulário foi preservado. Atualize a biblioteca antes de tentar novamente.",
      },
      {
        status: e instanceof AccountError ? e.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

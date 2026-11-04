import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import {
  AccountError,
  boundedJson,
  privateHeaders,
} from "../../_lib/kids-media";
import { previewRetention, purgeRetention } from "../../_lib/kids-retention";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 4096);
    if (body.action !== "preview" && body.action !== "purge")
      throw new AccountError(400, "Operação inválida.");
    return NextResponse.json(
      body.action === "preview"
        ? await previewRetention(body.organizationId, body.days, uid)
        : await purgeRetention(body, uid),
      { headers: privateHeaders },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AccountError
            ? e.message
            : "Não foi possível concluir a retenção. Tente novamente.",
      },
      {
        status: e instanceof AccountError ? e.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

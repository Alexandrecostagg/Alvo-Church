import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../_lib/verify-auth";
import {
  AccountError,
  boundedJson,
  privateHeaders,
} from "../../../_lib/kids-media";
import { startBilling } from "../../../_lib/billing-operations";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const result = await startBilling(await boundedJson(req, 4096), uid);
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Não foi possível concluir. O pedido foi preservado; tente consultar novamente.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

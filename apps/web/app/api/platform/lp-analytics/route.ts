import { NextRequest, NextResponse } from "next/server";
import { privateHeaders } from "../../_lib/kids-media";
import { AccountError } from "../../_lib/member-account-store";
import { readLpAnalytics } from "../../_lib/lp-analytics";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";

export async function GET(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    return NextResponse.json(await readLpAnalytics(uid), {
      headers: privateHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Não foi possível carregar as métricas da página pública.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

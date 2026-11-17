import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { boundedJson, privateHeaders } from "../../_lib/kids-media";
import { AccountError } from "../../_lib/member-account-store";
import { communityMarketplaceOperation } from "../../_lib/community-marketplace";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    return NextResponse.json(
      await communityMarketplaceOperation(await boundedJson(req, 250000), uid),
      { headers: privateHeaders },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AccountError
            ? e.message
            : "Não foi possível concluir. Tente novamente.",
      },
      {
        status: e instanceof AccountError ? e.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

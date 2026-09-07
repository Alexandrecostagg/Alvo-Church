import { NextRequest, NextResponse } from "next/server";
import { boundedJson, privateHeaders } from "../../_lib/kids-media";
import { AccountError } from "../../_lib/member-account-store";
import { moderateMarketplaceStore } from "../../_lib/marketplace-moderation";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    return NextResponse.json(await moderateMarketplaceStore(await boundedJson(req, 3000), uid), { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AccountError ? error.message : "Não foi possível moderar a loja. Tente novamente." },
      { status: error instanceof AccountError ? error.status : 503, headers: privateHeaders },
    );
  }
}

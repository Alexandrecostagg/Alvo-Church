import { NextRequest, NextResponse } from "next/server";
import { manageEvent } from "../../_lib/event-management";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../../_lib/kids-media";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    return NextResponse.json(await manageEvent(await boundedJson(req, 12000), uid), { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AccountError ? error.message : "Não foi possível alterar o evento. Tente novamente." },
      { status: error instanceof AccountError ? error.status : 503, headers: privateHeaders },
    );
  }
}

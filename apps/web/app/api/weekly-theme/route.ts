import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { AccountError, privateHeaders } from "../_lib/kids-media";
import { groupOperation } from "../_lib/group-operations";
export async function GET(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const q = req.nextUrl.searchParams;
    const result = await groupOperation(
      {
        action: "weekly-read",
        organizationId: q.get("organizationId"),
        groupId: q.get("groupId") || undefined,
      },
      uid,
    );
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AccountError
            ? e.message
            : "Não foi possível carregar o tema semanal.",
      },
      {
        status: e instanceof AccountError ? e.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

import { dispatchGroupNotice } from "../_lib/group-operations";
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { boundedJson, privateHeaders, AccountError } from "../_lib/kids-media";
import { roleHomeOperation } from "../_lib/role-home";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 20000);
    const result = await roleHomeOperation(body, uid);
    if (result.noticeId)
      await dispatchGroupNotice(body.organizationId, result.noticeId).catch(
        () => {},
      );
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AccountError
            ? e.message
            : "Não foi possível carregar esta visão. Tente novamente.",
      },
      {
        status: e instanceof AccountError ? e.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

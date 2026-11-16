import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../_lib/kids-media";
import { groupOperation, dispatchGroupNotice } from "../_lib/group-operations";
import { dispatchJourneyPush } from "../_lib/journey-operations";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 20000),
      result = await groupOperation(body, uid);
    if (result.noticeId)
      await dispatchGroupNotice(body.organizationId, result.noticeId).catch(
        () => {},
      );
    await Promise.all(
      (result.journeyNoticeIds || []).map((id: string) =>
        dispatchJourneyPush(body.organizationId, id).catch(() => {}),
      ),
    );
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AccountError
            ? e.message
            : "Não foi possível confirmar a operação. Atualize antes de tentar novamente.",
      },
      {
        status: e instanceof AccountError ? e.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

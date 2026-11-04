import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../../_lib/kids-media";
import { completeManualWhatsapp, prepareManualWhatsapp, prepareManualContact } from "../../_lib/communication-operations";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 24000);
    let result;
    if (body.action === "contact") result = await prepareManualContact(body, uid);
    else if (body.action === "prepare") result = await prepareManualWhatsapp(body, uid);
    else if (body.action === "complete") result = await completeManualWhatsapp(body, uid);
    else throw new AccountError(400, "Operação inválida.");
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AccountError ? error.message : "Não foi possível registrar a campanha. Tente novamente." },
      { status: error instanceof AccountError ? error.status : 503, headers: privateHeaders },
    );
  }
}

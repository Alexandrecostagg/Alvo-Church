import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../../_lib/kids-media";
import { checkInEventRegistration, confirmEventPayment, registerEventGuest, registerEventMember } from "../../_lib/event-attendance";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 5000);
    let result;
    if (body.action === "guest") result = await registerEventGuest(body, uid);
    else if (body.action === "member") result = await registerEventMember(body, uid);
    else if (body.action === "checkin") result = await checkInEventRegistration(body, uid);
    else if (body.action === "payment") result = await confirmEventPayment(body, uid);
    else throw new AccountError(400, "Operação inválida.");
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AccountError ? error.message : "Não foi possível concluir a operação do evento. Tente novamente." },
      { status: error instanceof AccountError ? error.status : 503, headers: privateHeaders },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../_lib/kids-media";
import { RegistrationError } from "../_lib/member-registration";
import { receptionOperation } from "../_lib/reception-operations";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    return NextResponse.json(
      await receptionOperation(await boundedJson(req, 16000), uid),
      { headers: privateHeaders },
    );
  } catch (e) {
    const known = e instanceof AccountError || e instanceof RegistrationError;
    return NextResponse.json(
      {
        error: known
          ? e.message
          : "Não foi possível concluir a recepção. Tente novamente.",
      },
      { status: known ? e.status : 503, headers: privateHeaders },
    );
  }
}

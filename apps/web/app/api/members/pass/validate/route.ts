import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../_lib/verify-auth";
import { AccountError } from "../../../_lib/member-account";
import { boundedJson, privateHeaders } from "../../../_lib/kids-media";
import {
  readPartnerPassContext,
  validatePartnerPass,
} from "../../../_lib/partner-pass-validation";

export async function GET(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const result = await readPartnerPassContext(
      req.nextUrl.searchParams.get("organizationId") ?? "",
      uid,
    );
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Não foi possível abrir a área do parceiro.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const result = await validatePartnerPass(await boundedJson(req, 8000), uid);
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Não foi possível validar o Passe. Tente novamente.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

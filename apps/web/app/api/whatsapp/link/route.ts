import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import {
  AccountError,
  boundedJson,
  privateHeaders,
} from "../../_lib/kids-media";
import { issueWhatsappLink } from "../../_lib/whatsapp-member";
import { publicPortalSlug } from "../../_lib/public-portal";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid)
      throw new AccountError(
        401,
        "Entre na sua conta para confirmar sua identidade uma única vez.",
      );
    const body = await boundedJson(req, 2000);
    return NextResponse.json(
      await issueWhatsappLink(publicPortalSlug(body.orgSlug), uid),
      { headers: privateHeaders },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Não foi possível criar o vínculo.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

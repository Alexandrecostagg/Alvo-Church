import { NextRequest, NextResponse } from "next/server";
import { AccountError } from "../../_lib/member-account-store";
import { boundedJson, privateHeaders } from "../../_lib/kids-media";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import {
  acceptNetworkInvite,
  createNetworkInvite,
  deactivateNetworkAffiliate,
  inspectNetworkInvite,
  renewNetworkInvite,
} from "../../_lib/network-invitations";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 4096);
    const action = body?.action;
    const result = action === "create"
      ? await createNetworkInvite(body, uid)
      : action === "inspect"
        ? await inspectNetworkInvite(body, uid)
        : action === "accept"
          ? await acceptNetworkInvite(body, uid)
          : action === "renew"
            ? await renewNetworkInvite(body, uid)
            : action === "deactivate"
              ? await deactivateNetworkAffiliate(body, uid)
          : (() => { throw new AccountError(400, "Operação de convite inválida."); })();
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AccountError ? error.message : "Não foi possível processar o convite." },
      { status: error instanceof AccountError ? error.status : 503, headers: privateHeaders },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { buildPixPayload } from "@alvo/domain";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import {
  AccountError,
  boundedJson,
  privateHeaders,
} from "../../_lib/kids-media";
import { accountTransaction } from "../../_lib/member-account-store";
import { financeActor, money, textField } from "../../_lib/finance-operations";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 2048),
      amount = money(body.amount) / 100;
    const branding = await accountTransaction(async (tx) => {
      const { root } = await financeActor(tx, body.organizationId, uid, false);
      return (await tx.read(`${root}/settings/branding`))[0];
    });
    if (!branding?.pixKey)
      throw new AccountError(422, "A igreja ainda não configurou o PIX.");
    const pixKey = String(branding.pixKey),
      receiverName = String(
        branding.pixReceiverName || branding.publicShortName || "Igreja",
      );
    const payload = buildPixPayload({
      key: pixKey,
      receiverName,
      amount,
      description:
        textField(body.description, "Descrição", 72, true) || "Oferta/Dizimo",
    });
    return NextResponse.json(
      {
        ok: true,
        payload,
        pixKey,
        receiverName,
        qrDataUrl: await QRCode.toDataURL(payload, { width: 300, margin: 2 }),
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Não foi possível gerar o PIX.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

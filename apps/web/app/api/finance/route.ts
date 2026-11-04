import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../_lib/kids-media";
import {
  declareGiving,
  manualLedger,
  readReceipt,
  reconcileContribution,
  voidLedger,
} from "../_lib/finance-operations";
import { monthlyFinance } from "../_lib/finance-report";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 700000);
    let result;
    switch (body.action) {
      case "report":
        result = await monthlyFinance(body.organizationId, body.month, uid);
        break;
      case "declare":
        result = await declareGiving(body, uid);
        break;
      case "receipt":
        result = await readReceipt(
          body.organizationId,
          body.receiptId,
          uid,
          body.legacyGiving === true,
        );
        break;
      case "confirm":
      case "reject":
        result = await reconcileContribution(body, uid);
        break;
      case "manual":
        result = await manualLedger(body, uid);
        break;
      case "void":
        result = await voidLedger(body, uid);
        break;
      default:
        throw new AccountError(400, "Operação inválida.");
    }
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Não foi possível concluir a operação financeira. Tente novamente.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

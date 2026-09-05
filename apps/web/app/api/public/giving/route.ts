import { NextRequest, NextResponse } from "next/server";
import {
  AccountError,
  boundedJson,
  privateHeaders,
} from "../../_lib/kids-media";
import {
  createPublicGiving,
  declareGiving,
  publicGivingConfig,
} from "../../_lib/finance-operations";
export async function POST(req: NextRequest) {
  try {
    const body = await boundedJson(req, 700000);
    if (!["config", "intent", "declare"].includes(body.action))
      throw new AccountError(400, "Operação inválida.");
    const result =
      body.action === "config"
        ? await publicGivingConfig(body)
        : body.action === "intent"
          ? await createPublicGiving(
              body,
              req.headers.get("cf-connecting-ip") || "unknown",
            )
          : await declareGiving(body);
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Não foi possível registrar. Seus dados continuam no formulário; tente novamente.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: { ...privateHeaders, "Retry-After": "60" },
      },
    );
  }
}

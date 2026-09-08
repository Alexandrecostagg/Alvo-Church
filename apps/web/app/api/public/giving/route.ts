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
import { verifyTurnstile } from "../../_lib/turnstile";
export async function POST(req: NextRequest) {
  try {
    const body = await boundedJson(req, 700000);
    if (!["config", "intent", "declare"].includes(body.action))
      throw new AccountError(400, "Operação inválida.");
    const clientKey = req.headers.get("cf-connecting-ip")?.slice(0, 64) || "unknown";
    if (body.action === "intent")
      await verifyTurnstile({ token: body.turnstileToken, expectedAction: "public_giving", remoteIp: clientKey, idempotencyKey: body.turnstileRequestId });
    const result =
      body.action === "config"
        ? await publicGivingConfig(body)
        : body.action === "intent"
          ? await createPublicGiving(
              body,
              clientKey,
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

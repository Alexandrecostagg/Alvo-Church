import { NextRequest, NextResponse } from "next/server";
import { AccountError, boundedJson } from "../../_lib/kids-media";
import { verifyTurnstile } from "../../_lib/turnstile";
import { submitParticipation } from "../../_lib/participation";
export async function POST(req: NextRequest) {
  try {
    const body = await boundedJson(req, 8192);
    if (body.kind !== "care" && body.kind !== "event")
      throw new AccountError(400, "Solicitação inválida.");
    const key = req.headers.get("cf-connecting-ip")?.slice(0, 64) || "unknown";
    await verifyTurnstile({
      token: body.turnstileToken,
      expectedAction: body.kind === "care" ? "public_care" : "public_event",
      remoteIp: key,
      idempotencyKey: body.requestId,
    });
    return NextResponse.json(await submitParticipation(body, body.kind, key), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof AccountError ? error.status : 503;
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Não foi possível concluir. Seus dados foram preservados; tente novamente.",
      },
      {
        status,
        headers: {
          "cache-control": "no-store",
          ...(status === 429 ? { "retry-after": "60" } : {}),
        },
      },
    );
  }
}

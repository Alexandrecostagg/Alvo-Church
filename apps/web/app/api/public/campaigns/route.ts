import { NextRequest, NextResponse } from "next/server";
import {
  AccountError,
  boundedJson,
  privateHeaders,
} from "../../_lib/kids-media";
import { verifyTurnstile } from "../../_lib/turnstile";
import {
  publicCampaign,
  publicGuest,
  registerCampaignGuest,
  respondCampaignGuest,
} from "../../_lib/invitation-campaigns";
function fail(e: unknown) {
  return NextResponse.json(
    {
      error:
        e instanceof AccountError
          ? e.message
          : "Não foi possível concluir. Tente novamente.",
    },
    {
      status: e instanceof AccountError ? e.status : 503,
      headers: privateHeaders,
    },
  );
}
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    return NextResponse.json(
      q.has("guest")
        ? await publicGuest(q.get("guest"))
        : await publicCampaign(q.get("invite")),
      { headers: privateHeaders },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const body = await boundedJson(req, 8192);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new AccountError(400, "Solicitação inválida.");
    if (body.action === "register") {
      const key =
        req.headers.get("cf-connecting-ip")?.slice(0, 64) || "unknown";
      await verifyTurnstile({
        token: body.turnstileToken,
        expectedAction: "public_campaign",
        remoteIp: key,
        idempotencyKey: body.requestId,
      });
      return NextResponse.json(await registerCampaignGuest(body, key), {
        headers: privateHeaders,
      });
    }
    if (body.action === "respond")
      return NextResponse.json(await respondCampaignGuest(body), {
        headers: privateHeaders,
      });
    throw new AccountError(400, "Operação inválida.");
  } catch (e) {
    return fail(e);
  }
}

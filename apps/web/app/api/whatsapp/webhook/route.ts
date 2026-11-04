import { NextRequest, NextResponse } from "next/server";
import { boundedBody, UploadError } from "@alvo/utils";
import { AccountError } from "../../_lib/member-account-store";
import { safeStringCompare } from "../../_lib/safe-compare";
import {
  verifyWhatsappSignature,
  receiveWhatsapp,
} from "../../_lib/whatsapp-webhook";
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams,
    token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!token)
    return new NextResponse("WhatsApp não configurado", { status: 503 });
  if (
    p.get("hub.mode") !== "subscribe" ||
    !safeStringCompare(p.get("hub.verify_token") ?? "", token)
  )
    return new NextResponse("Verificação inválida", { status: 403 });
  const challenge = p.get("hub.challenge") ?? "";
  if (!/^\d{1,100}$/.test(challenge))
    return new NextResponse("Desafio inválido", { status: 400 });
  return new NextResponse(challenge, {
    headers: { "content-type": "text/plain", "cache-control": "no-store" },
  });
}
export async function POST(req: NextRequest) {
  try {
    const bytes = await boundedBody(req, 128 * 1024);
    verifyWhatsappSignature(bytes, req.headers.get("x-hub-signature-256"));
    let data: unknown;
    try {
      data = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new AccountError(400, "JSON inválido.");
    }
    await receiveWhatsapp(data);
    return NextResponse.json(
      { ok: true },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError || error instanceof UploadError
            ? error.message
            : "Atendimento temporariamente indisponível.",
      },
      {
        status:
          error instanceof AccountError || error instanceof UploadError
            ? error.status
            : 503,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}

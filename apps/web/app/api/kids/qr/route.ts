import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// Gera o PNG de um QR Code a partir de um texto curto (o securityToken do
// check-in kids). Renderização pura — o token em si é o segredo; o mobile
// que já possui o token pede a imagem para exibir. Usado como <Image src>.
export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data") ?? "";
  if (!data || data.length > 256) {
    return NextResponse.json(
      { error: "Parâmetro 'data' obrigatório (até 256 chars)." },
      { status: 400 },
    );
  }

  try {
    const png = await QRCode.toBuffer(data, {
      type: "png",
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao gerar QR." }, { status: 500 });
  }
}

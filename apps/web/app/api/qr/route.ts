import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// Gerador genérico de QR Code (PNG a partir de um texto curto). Usado como
// <Image src> pelo mobile — ex.: ingresso digital de evento (o payload é o
// código/token da inscrição). Mesmo padrão do /api/kids/qr.
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

import { NextRequest, NextResponse } from "next/server";

// Proxies Pollinations.ai image generation to avoid CORS issues with Canvas API.
// Pollinations is completely free, no API key required.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const prompt = searchParams.get("prompt") ?? "church worship abstract background";
  const w = searchParams.get("w") ?? "1080";
  const h = searchParams.get("h") ?? "1080";
  const seed = searchParams.get("seed") ?? String(Math.floor(Math.random() * 9999));

  const pollinationsUrl =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${w}&height=${h}&seed=${seed}&model=flux&nologo=true`;

  let imgRes: Response;
  try {
    imgRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(55_000) });
  } catch (e) {
    return NextResponse.json({ error: "Timeout ao gerar imagem" }, { status: 504 });
  }

  if (!imgRes.ok) {
    return NextResponse.json({ error: "Pollinations retornou erro" }, { status: 502 });
  }

  const contentType = imgRes.headers.get("Content-Type") ?? "image/jpeg";
  const buffer = await imgRes.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

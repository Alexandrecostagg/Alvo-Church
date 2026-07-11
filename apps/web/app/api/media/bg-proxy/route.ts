import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Hash determinístico simples (FNV-1a) para derivar um seed estável do prompt.
function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 1000000;
}

// Proxies Pollinations.ai image generation to avoid CORS issues with Canvas API.
// Pollinations is completely free, no API key required.
export async function GET(req: NextRequest) {
  const uid = await verifyFirebaseIdToken(req);
  if (!uid) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const prompt = searchParams.get("prompt") ?? "church worship abstract background";
  const w = clampInt(searchParams.get("w"), 1080, 256, 2048);
  const h = clampInt(searchParams.get("h"), 1080, 256, 2048);
  // Sem seed explícito, deriva um seed estável do prompt em vez de sortear:
  // a mesma URL passa a produzir sempre a mesma imagem, então o Cache-Control
  // abaixo vira cache de verdade (antes cada request era uma URL "nova" no
  // upstream e a geração — cara e lenta — se repetia). O app web sempre envia
  // seed explícito, então o comportamento de "gerar outra variação" não muda.
  const seed = clampInt(searchParams.get("seed"), hashSeed(prompt), 0, 999999);

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

  // Repassa o corpo em streaming — sem bufferizar a imagem inteira na
  // memória do Worker antes de começar a responder.
  return new NextResponse(imgRes.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

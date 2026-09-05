import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, privateHeaders } from "../../_lib/kids-media";
import { aiGate, completeAi } from "../../_lib/ai-quota";

function clampInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
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
// Provider availability does not bypass tenant limits.
export async function GET(req: NextRequest) {
  let auditId = "",
    orgId = "";
  try {
    const authorization = req.headers.get("authorization") ?? "";
    const idToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
    const uid = await verifyFirebaseIdToken(req);
    if (!uid || !idToken) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const organizationId = searchParams.get("organizationId")?.trim() ?? "";
    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId é obrigatório" },
        { status: 400 },
      );
    }
    const prompt = searchParams.get("prompt")?.trim() ?? "";
    if (!prompt || prompt.length > 600) {
      return NextResponse.json({ error: "Prompt inválido." }, { status: 422 });
    }
    const w = clampInt(searchParams.get("w"), 1080, 256, 1536);
    const h = clampInt(searchParams.get("h"), 1080, 256, 1536);
    // Sem seed explícito, deriva um seed estável do prompt em vez de sortear:
    // a mesma URL passa a produzir sempre a mesma imagem, então o Cache-Control
    // abaixo vira cache de verdade (antes cada request era uma URL "nova" no
    // upstream e a geração — cara e lenta — se repetia). O app web sempre envia
    // seed explícito, então o comportamento de "gerar outra variação" não muda.
    const seed = clampInt(
      searchParams.get("seed"),
      hashSeed(prompt),
      0,
      999999,
    );

    const ticket = await aiGate(organizationId, uid, "banner_image");
    auditId = ticket.auditId;
    orgId = organizationId;
    const pollinationsUrl =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=${w}&height=${h}&seed=${seed}&model=flux&nologo=true`;

    let imgRes: Response;
    try {
      imgRes = await fetch(pollinationsUrl, {
        signal: AbortSignal.timeout(55_000),
      });
    } catch (e) {
      throw new AccountError(
        504,
        "Tempo esgotado ao gerar imagem. A tentativa permanece na cota.",
      );
    }

    if (!imgRes.ok) {
      throw new AccountError(502, "Provedor de imagem indisponível.");
    }

    const contentType = imgRes.headers.get("Content-Type") ?? "image/jpeg";

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        contentType.split(";")[0],
      )
    )
      throw new AccountError(502, "O provedor não retornou uma imagem válida.");
    const reader = imgRes.body?.getReader();
    if (!reader) throw new AccountError(502, "Imagem vazia.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 5 * 1024 * 1024) {
        await reader.cancel();
        throw new AccountError(502, "Imagem excede o limite de tamanho.");
      }
      chunks.push(part.value);
    }
    if (!size) throw new AccountError(502, "Imagem vazia.");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    await completeAi(orgId, auditId, "completed");

    // Bounded body completes before the generation audit is marked complete.
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        // Resposta depende de autenticação e pode derivar de um pedido interno.
        // Não permitir cache compartilhado entre usuários/organizações.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (auditId) await completeAi(orgId, auditId, "failed").catch(() => {});
    return NextResponse.json(
      {
        error: e instanceof AccountError ? e.message : "Geração indisponível.",
      },
      {
        status: e instanceof AccountError ? e.status : 503,
        headers: { ...privateHeaders, "Retry-After": "60" },
      },
    );
  }
}

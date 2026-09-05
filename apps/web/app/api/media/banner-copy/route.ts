import { NextRequest, NextResponse } from "next/server";
import { callChatWithFallback } from "@alvo/ai";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import {
  AccountError,
  boundedJson,
  privateHeaders,
} from "../../_lib/kids-media";
import { aiGate, completeAi } from "../../_lib/ai-quota";
import { textField } from "../../_lib/finance-operations";

export interface BannerCopyInput {
  tipo: string; // Culto Domingo, Evento, Célula, etc.
  tema: string;
  pregador?: string;
  data?: string;
  estilo?: string; // "impactante" | "acolhedor" | "reverente"
}

export interface BannerCopy {
  titulo: string;
  subtitulo: string;
  versiculo: string;
  versiculoRef: string;
  hashtags: string;
  // Prompt EM INGLÊS para o gerador de imagem (Pollinations/FLUX): uma cena
  // vibrante e temática, sem texto. Deixa o fundo com "vida" em vez do genérico.
  imagemPrompt?: string;
}

export async function POST(req: NextRequest) {
  let ticket: { auditId: string } | undefined;
  let orgId = "";
  try {
    const authorization = req.headers.get("authorization") ?? "";
    const idToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
    const uid = await verifyFirebaseIdToken(req);
    if (!uid || !idToken) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = (await boundedJson(req, 4096)) as
      | (BannerCopyInput & { organizationId?: string })
      | null;
    if (!body) {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }
    const organizationId = body?.organizationId?.trim() ?? "";
    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId é obrigatório" },
        { status: 400 },
      );
    }
    textField(body.tipo, "Tipo", 100);
    textField(body.tema, "Tema", 500);
    textField(body.pregador, "Pregador", 120, true);
    textField(body.data, "Data", 100, true);
    textField(body.estilo, "Estilo", 100, true);
    await aiGate(organizationId, uid, "banner_copy", false);
    // Cascata de provedores: DeepSeek (principal) → Groq (fallback). Basta uma
    // das chaves estar configurada — a troca de provedor acontece no @alvo/ai.
    const keys = {
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      groqApiKey: process.env.GROQ_API_KEY,
    };
    if (!keys.deepseekApiKey && !keys.groqApiKey) {
      return NextResponse.json(
        {
          error:
            "Nenhuma API de IA configurada (DEEPSEEK_API_KEY/GROQ_API_KEY).",
        },
        { status: 500 },
      );
    }

    ticket = await aiGate(organizationId, uid, "banner_copy");
    orgId = organizationId;
    const input: BannerCopyInput = body;

    const prompt = `Você é um diretor de arte criando um banner de divulgação para redes sociais de uma igreja evangélica.

Tipo de evento: ${input.tipo}
Tema: ${input.tema}
${input.pregador ? `Pregador/Cantor: ${input.pregador}` : ""}
${input.data ? `Data/Hora: ${input.data}` : ""}
Estilo desejado: ${input.estilo ?? "impactante"}

Retorne APENAS um JSON válido (sem markdown, sem explicações) com este formato exato:
{
  "titulo": "título curto e impactante do banner (máx 5 palavras, direto e memorável, estilo cartaz)",
  "subtitulo": "frase complementar de apoio (máx 12 palavras)",
  "versiculo": "texto do versículo bíblico mais adequado ao tema",
  "versiculoRef": "Livro Capítulo:Versículo (ex: João 3:16)",
  "hashtags": "#tres #ou #quatro hashtags relevantes",
  "imagemPrompt": "descrição EM INGLÊS de uma imagem de FUNDO cinematográfica e VIBRANTE que represente o tema visualmente para um cartaz de igreja. Descreva a cena, elementos simbólicos, iluminação (ex: warm golden light, volumetric god rays, glowing embers) e paleta de cores ricas. Deve ser luminosa e cheia de vida, NUNCA escura/apagada. NÃO inclua texto, letras, palavras ou pessoas com rosto reconhecível. Exemplo: 'two human hands reaching toward each other over glowing golden fire, warm amber and orange tones, volumetric light rays from above, dramatic cinematic poster art, luminous, rich vivid colors, ultra detailed'"
}`;

    // DeepSeek (principal) → cascata Groq (fallback). response_format json
    // elimina fences de markdown e retries por JSON malformado; o JSON de copy
    // tem ~300 tokens, então o modelo rápido já basta.
    let raw: string;
    try {
      const result = await callChatWithFallback(
        keys,
        [{ role: "user", content: prompt }],
        {
          maxTokens: 500,
          temperature: 0.8,
          jsonMode: true,
        },
      );
      raw = result.content || "{}";
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      throw new AccountError(
        502,
        "Falha ao gerar o texto. A tentativa iniciada permanece na cota.",
      );
    }

    // strip accidental markdown fences
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let copy: BannerCopy;
    try {
      copy = JSON.parse(cleaned) as BannerCopy;
    } catch {
      throw new AccountError(502, "Resposta de IA inválida.");
    }

    await completeAi(orgId, ticket.auditId, "completed");
    return NextResponse.json({ ok: true, copy }, { headers: privateHeaders });
  } catch (e) {
    if (ticket)
      await completeAi(orgId, ticket.auditId, "failed").catch(() => {});
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

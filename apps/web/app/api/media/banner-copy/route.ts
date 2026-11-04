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

import {
  bannerCopyMessages,
  parseBannerCopy,
  type BannerCopyInput,
} from "../../../../src/features/media/banner-contract";

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
    const input: BannerCopyInput = {
      tipo: textField(body.tipo, "Tipo", 100),
      tema: textField(body.tema, "Tema", 500),
      pregador: textField(body.pregador, "Pregador", 120, true),
      data: textField(body.data, "Data", 100, true),
      estilo: textField(body.estilo, "Estilo", 100, true),
      direcao: textField(body.direcao, "Direção visual", 400, true),
      versiculo: textField(body.versiculo, "Versículo", 180, true),
      versiculoRef: textField(body.versiculoRef, "Referência", 60, true),
    };
    await aiGate(organizationId, uid, "banner_copy", false);
    // Cascata de provedores: Gemini (principal) → Groq (fallback). Basta uma
    // das chaves estar configurada — a troca de provedor acontece no @alvo/ai.
    const keys = {
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
      groqApiKey: process.env.GROQ_API_KEY,
    };
    if (!keys.geminiApiKey && !keys.groqApiKey) {
      return NextResponse.json(
        {
          error: "Serviço de Sabedoria Pastoral não configurado.",
        },
        { status: 500 },
      );
    }

    ticket = await aiGate(organizationId, uid, "banner_copy");
    orgId = organizationId;

    let raw: string;
    try {
      const result = await callChatWithFallback(
        keys,
        bannerCopyMessages(input),
        {
          maxTokens: 700,
          temperature: 0.4,
          jsonMode: true,
        },
      );
      raw = result.content || "{}";
    } catch (e) {
      throw new AccountError(
        502,
        "Falha ao gerar o texto. A tentativa iniciada permanece na cota.",
      );
    }

    let copy;
    try {
      copy = parseBannerCopy(raw, input);
    } catch {
      throw new AccountError(
        502,
        "A IA retornou um conteúdo incompleto ou longo demais. Seus textos foram preservados; você pode editá-los manualmente.",
      );
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

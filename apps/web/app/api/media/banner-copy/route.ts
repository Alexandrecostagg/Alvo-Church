import { NextRequest, NextResponse } from "next/server";
import { callGroqWithCascade } from "@alvo/ai";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";

export interface BannerCopyInput {
  tipo: string;      // Culto Domingo, Evento, Célula, etc.
  tema: string;
  pregador?: string;
  data?: string;
  estilo?: string;   // "impactante" | "acolhedor" | "reverente"
}

export interface BannerCopy {
  titulo: string;
  subtitulo: string;
  versiculo: string;
  versiculoRef: string;
  hashtags: string;
}

export async function POST(req: NextRequest) {
  const uid = await verifyFirebaseIdToken(req);
  if (!uid) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY não configurada" }, { status: 500 });
  }

  const input: BannerCopyInput = await req.json();

  const prompt = `Você está criando o texto de um banner de divulgação para redes sociais de uma igreja evangélica.

Tipo de evento: ${input.tipo}
Tema: ${input.tema}
${input.pregador ? `Pregador/Cantor: ${input.pregador}` : ""}
${input.data ? `Data/Hora: ${input.data}` : ""}
Estilo desejado: ${input.estilo ?? "impactante"}

Retorne APENAS um JSON válido (sem markdown, sem explicações) com este formato exato:
{
  "titulo": "título curto e impactante do banner (máx 6 palavras)",
  "subtitulo": "frase complementar de apoio (máx 12 palavras)",
  "versiculo": "texto do versículo bíblico mais adequado ao tema",
  "versiculoRef": "Livro Capítulo:Versículo (ex: João 3:16)",
  "hashtags": "#tres #ou #quatro hashtags relevantes"
}`;

  // Cascata começa no modelo rápido (20b) — mais que suficiente para um JSON
  // de 300 tokens — com fallback automático para os maiores, timeout por
  // tentativa e response_format json (elimina fences de markdown e retries
  // por JSON malformado).
  let raw: string;
  try {
    const result = await callGroqWithCascade(apiKey, [{ role: "user", content: prompt }], {
      maxTokens: 300,
      temperature: 0.8,
      jsonMode: true,
    });
    raw = result.content || "{}";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: `Groq: ${message}` }, { status: 502 });
  }

  // strip accidental markdown fences
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let copy: BannerCopy;
  try {
    copy = JSON.parse(cleaned) as BannerCopy;
  } catch {
    return NextResponse.json({ error: "Resposta da IA inválida", raw }, { status: 502 });
  }

  return NextResponse.json({ ok: true, copy });
}

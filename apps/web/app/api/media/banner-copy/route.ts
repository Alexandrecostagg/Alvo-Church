import { NextRequest, NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Groq: ${err}` }, { status: 502 });
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const raw = data.choices[0]?.message?.content ?? "{}";

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

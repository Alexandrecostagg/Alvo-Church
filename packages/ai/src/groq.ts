const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export type GroqModel =
  | "openai/gpt-oss-20b"
  | "llama-3.3-70b-versatile"
  | "openai/gpt-oss-120b";

// Cascata de 3 modelos: rápido → padrão → robusto
const CASCADE: GroqModel[] = [
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b"
];

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqResponse {
  content: string;
  model: GroqModel;
  usage: { promptTokens: number; completionTokens: number };
}

export async function callGroq(
  apiKey: string,
  messages: GroqMessage[],
  opts?: { model?: GroqModel; maxTokens?: number; temperature?: number }
): Promise<GroqResponse> {
  const model = opts?.model ?? CASCADE[1];
  const body = {
    model,
    messages,
    max_tokens: opts?.maxTokens ?? 1024,
    temperature: opts?.temperature ?? 0.7
  };

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    content: data.choices[0]?.message?.content ?? "",
    model: data.model as GroqModel,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens
    }
  };
}

// Cascata automática: tenta modelo rápido, se falhar sobe para o próximo
export async function callGroqWithCascade(
  apiKey: string,
  messages: GroqMessage[],
  opts?: { maxTokens?: number; temperature?: number }
): Promise<GroqResponse> {
  let lastError: Error | null = null;

  for (const model of CASCADE) {
    try {
      return await callGroq(apiKey, messages, { ...opts, model });
    } catch (e) {
      lastError = e as Error;
      console.warn(`[groq] modelo ${model} falhou, tentando próximo...`);
    }
  }

  throw lastError ?? new Error("Todos os modelos Groq falharam");
}

// Cliente DeepSeek (API compatível com OpenAI /chat/completions).
// Usado como provedor PRINCIPAL de IA; o Groq entra como fallback em cascata
// (ver fallback.ts).

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

// DeepSeek costuma ser mais lento que o Groq; timeout um pouco maior para o
// fallback só disparar quando realmente travar.
const REQUEST_TIMEOUT_MS = 30_000;

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiResponse {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
}

export async function callDeepSeek(
  apiKey: string,
  messages: AiMessage[],
  opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean },
): Promise<AiResponse> {
  const body = {
    model: DEEPSEEK_MODEL,
    messages,
    max_tokens: opts?.maxTokens ?? 1024,
    temperature: opts?.temperature ?? 0.7,
    stream: false,
    ...(opts?.jsonMode
      ? { response_format: { type: "json_object" as const } }
      : {}),
  };

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    content: data.choices[0]?.message?.content ?? "",
    model: data.model,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

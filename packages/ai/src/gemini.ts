// Gemini through its documented OpenAI-compatible endpoint; keys stay server-side.
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const REQUEST_TIMEOUT_MS = 15_000;

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiResponse {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
}

export async function callGemini(
  apiKey: string,
  messages: AiMessage[],
  opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean; model?: string }
): Promise<AiResponse> {
  const body = {
    model: opts?.model?.trim() || DEFAULT_GEMINI_MODEL,
    messages,
    // Reserve space for reasoning as well as the requested visible answer.
    max_tokens: Math.max(2048, (opts?.maxTokens ?? 1024) + 1024),
    reasoning_effort: "low",
    temperature: opts?.temperature ?? 0.7,
    stream: false,
    ...(opts?.jsonMode ? { response_format: { type: "json_object" as const } } : {})
  };

  const res = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!res.ok) {
    // Never include provider bodies (which may echo inputs or credentials) in logs.
    await res.body?.cancel();
    throw new Error(`Gemini HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    model: string;
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== "string" || !content.trim() || choice?.finish_reason !== "stop") {
    throw new Error("Gemini returned an incomplete or empty answer");
  }
  if (opts?.jsonMode) {
    try { JSON.parse(content); }
    catch { throw new Error("Gemini returned invalid JSON"); }
  }

  return {
    content,
    model: data.model || body.model,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0
    }
  };
}

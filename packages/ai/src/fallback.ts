// Cascata de provedores de IA: DeepSeek (principal) → Groq (fallback).
// Se a DeepSeek falhar por QUALQUER motivo (timeout, 5xx, auth, rede), cai
// para a cascata interna de modelos do Groq. Assim uma indisponibilidade do
// provedor principal não derruba a IA do produto.

import { callDeepSeek, type AiMessage, type AiResponse } from "./deepseek";
import { callGroqWithCascade } from "./groq";

export type { AiMessage, AiResponse } from "./deepseek";

export interface AiKeys {
  deepseekApiKey?: string;
  groqApiKey?: string;
}

export async function callChatWithFallback(
  keys: AiKeys,
  messages: AiMessage[],
  opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean },
): Promise<AiResponse> {
  if (keys.deepseekApiKey) {
    try {
      return await callDeepSeek(keys.deepseekApiKey, messages, opts);
    } catch (e) {
      console.warn(
        `[ai] DeepSeek falhou, caindo para Groq: ${(e as Error).message}`,
      );
    }
  }

  if (keys.groqApiKey) {
    return callGroqWithCascade(keys.groqApiKey, messages, opts);
  }

  throw new Error(
    "Nenhuma API de IA configurada (defina DEEPSEEK_API_KEY e/ou GROQ_API_KEY).",
  );
}

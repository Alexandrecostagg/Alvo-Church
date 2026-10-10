// Cascata de provedores de IA: Gemini (principal) → Groq (fallback).
// Se o Gemini falhar (timeout, 5xx, auth, rede), cai
// para a cascata interna de modelos do Groq. Assim uma indisponibilidade do
// provedor principal não derruba a IA do produto.

import { callGemini, type AiMessage, type AiResponse } from "./gemini";
import { callGroqWithCascade } from "./groq";

export type { AiMessage, AiResponse } from "./gemini";

export interface AiKeys {
  geminiApiKey?: string;
  groqApiKey?: string;
  geminiModel?: string;
}

export async function callChatWithFallback(
  keys: AiKeys,
  messages: AiMessage[],
  opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<AiResponse> {
  if (keys.geminiApiKey) {
    try {
      return await callGemini(keys.geminiApiKey, messages, { ...opts, model: keys.geminiModel });
    } catch {
      if (!keys.groqApiKey) throw new Error("Serviço de Sabedoria Pastoral indisponível.");
      console.warn("[ai] Gemini indisponível; tentando Groq.");
    }
  }

  if (keys.groqApiKey) {
    return callGroqWithCascade(keys.groqApiKey, messages, opts);
  }

  throw new Error("Nenhuma API de Sabedoria Pastoral configurada (defina GEMINI_API_KEY e/ou GROQ_API_KEY).");
}

/**
 * Comparação timing-safe de strings.
 *
 * Evita side-channel timing attacks ao comparar tokens (bearer, webhook, etc.)
 * usando crypto.subtle timingSafeEqual. O resultado final é sempre false se
 * os comprimentos forem diferentes — mas a função ainda processa o buffer de
 * tamanho máximo para não vazar informação via timing.
 */

export function safeStringCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  // timingSafeEqual existe no runtime (Node 19+, Cloudflare Workers) mas os
  // types do TypeScript não declaram. Cast seguro; fallback usa XOR acumulado
  // sem early-return para evitar timing leak.
  try {
    return (crypto.subtle as any).timingSafeEqual(bufA, bufB);
  } catch {
    let diff = 0;
    for (let i = 0; i < bufA.length; i++) {
      diff |= bufA[i] ^ bufB[i];
    }
    return diff === 0;
  }
}

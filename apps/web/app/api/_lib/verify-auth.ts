import type { NextRequest } from "next/server";
import { isLocalQaFirebase } from "./firebase-server-env";

/**
 * Valida o Firebase ID token enviado no header Authorization: Bearer <token>.
 *
 * Caminho rápido: valida a assinatura RS256 localmente via Web Crypto contra
 * as chaves públicas do Google (JWKS), sem round-trip de rede por request —
 * as chaves ficam cacheadas em memória do Worker e são renovadas conforme o
 * Cache-Control da resposta do Google.
 *
 * Fallback: se a validação local não confirmar o token por qualquer motivo
 * (JWKS indisponível, kid desconhecido, projectId ausente…), cai para o
 * endpoint accounts:lookup do Identity Toolkit — o comportamento original.
 * Assim, qualquer token que era aceito antes continua sendo aceito.
 *
 * Retorna o uid ou null se inválido/ausente.
 */

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

// Margem para diferenças de relógio entre emissor e Worker.
const CLOCK_SKEW_SECONDS = 30;

interface GoogleJwk {
  kid: string;
  kty: string;
  alg: string;
  n: string;
  e: string;
  use?: string;
}

let cachedJwks: { keys: Map<string, CryptoKey>; expiresAt: number } | null = null;

function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJwtSection<T>(section: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(section))) as T;
}

async function getGooglePublicKeys(): Promise<Map<string, CryptoKey>> {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) {
    return cachedJwks.keys;
  }

  const res = await fetch(JWKS_URL, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    throw new Error(`JWKS fetch falhou: ${res.status}`);
  }

  const { keys } = (await res.json()) as { keys: GoogleJwk[] };
  const imported = new Map<string, CryptoKey>();
  for (const jwk of keys) {
    if (jwk.kty !== "RSA" || jwk.alg !== "RS256") continue;
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    imported.set(jwk.kid, key);
  }

  // Respeita o max-age do Google (as chaves rotacionam); default 1h.
  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;

  cachedJwks = { keys: imported, expiresAt: Date.now() + maxAgeMs };
  return imported;
}

/**
 * Valida o token localmente. Retorna o uid quando o token é comprovadamente
 * válido, null quando é comprovadamente inválido (assinatura errada, expirado,
 * audience errada) e lança quando não foi possível decidir (ex.: JWKS fora do
 * ar) — nesse caso o chamador cai para a verificação remota.
 */
async function verifyIdTokenLocally(idToken: string, projectId: string): Promise<string | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;

  const header = decodeJwtSection<{ alg?: string; kid?: string }>(parts[0]);
  if (header.alg !== "RS256" || !header.kid) {
    // Token de emulador ou formato inesperado — deixa o fallback decidir.
    throw new Error("Header JWT sem RS256/kid");
  }

  const keys = await getGooglePublicKeys();
  const key = keys.get(header.kid);
  if (!key) {
    // kid desconhecido pode ser rotação de chave recém-acontecida.
    throw new Error(`kid desconhecido: ${header.kid}`);
  }

  const encoder = new TextEncoder();
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlDecode(parts[2]),
    encoder.encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid) return null;

  const payload = decodeJwtSection<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
  }>(parts[1]);

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now - CLOCK_SKEW_SECONDS) return null;
  if (payload.iat && payload.iat > now + CLOCK_SKEW_SECONDS) return null;
  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (!payload.sub) return null;

  return payload.sub;
}

/** Verificação remota original via Identity Toolkit (fallback). */
async function verifyIdTokenRemotely(idToken: string): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `${isLocalQaFirebase() ? "http://127.0.0.1:9099/identitytoolkit.googleapis.com" : "https://identitytoolkit.googleapis.com"}/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { users?: Array<{ localId?: string }> };
    return data.users?.[0]?.localId ?? null;
  } catch {
    return null;
  }
}

export async function verifyFirebaseIdToken(req: NextRequest): Promise<string | null> {
  const authorization = req.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!idToken) return null;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (projectId) {
    try {
      return await verifyIdTokenLocally(idToken, projectId);
    } catch {
      // Não foi possível decidir localmente — usa o caminho remoto original.
    }
  }

  return verifyIdTokenRemotely(idToken);
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware que injeta headers de segurança em todas as respostas.
 *
 * Aplica-se a todas as rotas do Next.js App Router. Headers como
 * X-Frame-Options e Content-Security-Policy são os mais relevantes para
 * prevenir clickjacking, XSS e other injection attacks.
 */

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

// CSP conservador: permite scripts inline do Next.js e do OpenNext (nonce não
// é viável sem um server-side nonce generator), imagens de qualquer origem
// (necessário para avatares/fotos de visitantes), e estilos inline.
// Em produção com CSP strict, considere gerar nonce por request.
const CSP_VALUE = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.google.com https://www.googleapis.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' https:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://viacep.com.br https://servicodados.ibge.gov.br",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  response.headers.set("Content-Security-Policy", CSP_VALUE);
  return response;
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  return withSecurityHeaders(response);
}

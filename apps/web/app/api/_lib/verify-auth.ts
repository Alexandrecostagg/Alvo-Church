import type { NextRequest } from "next/server";

/**
 * Valida o Firebase ID token enviado no header Authorization: Bearer <token>.
 * Usa o endpoint accounts:lookup do Identity Toolkit (funciona em Workers,
 * sem precisar do Admin SDK). Retorna o uid ou null se inválido/ausente.
 */
export async function verifyFirebaseIdToken(req: NextRequest): Promise<string | null> {
  const authorization = req.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!idToken) return null;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { users?: Array<{ localId?: string }> };
    return data.users?.[0]?.localId ?? null;
  } catch {
    return null;
  }
}

import { getGoogleAccessToken } from "./google-service-account";
import { isLocalQaFirebase } from "./firebase-server-env";

export type PlatformAuthProfile = {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: string;
  lastSignInAt: string;
};

function timestamp(value: unknown) {
  const n = typeof value === "string" ? Number(value) : NaN;
  const date = new Date(n);
  return Number.isFinite(date.getTime()) && n > 0 ? date.toISOString() : "";
}

// Called only after platform-admin authorization, for IDs read from the selected
// institution. Never return the Auth response (hashes/tokens/custom claims).
export async function readPlatformAuthProfiles(ids: string[]) {
  const profiles = new Map<string, PlatformAuthProfile>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return profiles;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || !/^[a-z0-9-]+$/.test(projectId))
    throw new Error("Projeto inválido.");
  const token = isLocalQaFirebase()
    ? "owner"
    : await getGoogleAccessToken(
        "https://www.googleapis.com/auth/identitytoolkit",
      );
  const host = isLocalQaFirebase()
    ? "http://127.0.0.1:9099/identitytoolkit.googleapis.com"
    : "https://identitytoolkit.googleapis.com";
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100);
    const response = await fetch(
      `${host}/v1/projects/${projectId}/accounts:lookup`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ localId: batch }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error("Consulta das contas indisponível.");
    const result = (await response.json()) as {
      users?: Array<Record<string, unknown>>;
    };
    for (const row of result.users ?? []) {
      const id = String(row.localId ?? "");
      if (!batch.includes(id)) continue;
      profiles.set(id, {
        id,
        displayName: String(row.displayName ?? ""),
        email: String(row.email ?? ""),
        phone: String(row.phoneNumber ?? ""),
        emailVerified: row.emailVerified === true,
        disabled: row.disabled === true,
        createdAt: timestamp(row.createdAt),
        lastSignInAt: timestamp(row.lastLoginAt),
      });
    }
  }
  return profiles;
}

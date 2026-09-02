import { getGoogleAccessToken } from "./google-service-account";

// Escrita privilegiada no Firestore via REST API + service account —
// ignora as Firestore Security Rules (que exigem um usuário autenticado
// membro do tenant). Só deve ser usada por automações server-to-server
// confiáveis, nunca a partir de input não validado.

const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

function projectId(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "alvo-church";
}

function firestoreBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { nullValue: null };

function toFirestoreFields(
  data: Record<string, string | number | boolean | null>,
): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null) fields[key] = { nullValue: null };
    else if (typeof value === "string") fields[key] = { stringValue: value };
    else if (typeof value === "number")
      fields[key] = { integerValue: String(value) };
    else if (typeof value === "boolean") fields[key] = { booleanValue: value };
  }
  return fields;
}

// PATCH parcial (merge) num documento, só nos campos passados em `data`.
export async function adminPatchDocument(
  path: string,
  data: Record<string, string | number | boolean | null>,
): Promise<void> {
  const token = await getGoogleAccessToken(FIRESTORE_SCOPE);
  const updateMask = Object.keys(data)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const res = await fetch(`${firestoreBaseUrl()}/${path}?${updateMask}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(
      `Firestore admin patch falhou (${path}): ${await res.text()}`,
    );
  }
}

export async function adminGetDocument(
  path: string,
): Promise<Record<string, unknown> | null> {
  const token = await getGoogleAccessToken(FIRESTORE_SCOPE);
  const res = await fetch(`${firestoreBaseUrl()}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(
      `Firestore admin get falhou (${path}): ${await res.text()}`,
    );
  const data = (await res.json()) as {
    fields?: Record<
      string,
      {
        stringValue?: string;
        integerValue?: string;
        doubleValue?: number;
        booleanValue?: boolean;
      }
    >;
  };
  if (!data.fields) return null;
  const plain: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data.fields)) {
    if ("stringValue" in value) plain[key] = value.stringValue;
    else if ("integerValue" in value) plain[key] = Number(value.integerValue);
    else if ("doubleValue" in value) plain[key] = Number(value.doubleValue);
    else if ("booleanValue" in value) plain[key] = value.booleanValue;
  }
  return plain;
}

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

function firestoreDatabaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)`;
}

function firestoreDocumentName(path: string): string {
  return `projects/${projectId()}/databases/(default)/documents/${path}`;
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { nullValue: null };

function toFirestoreFields(data: Record<string, string | number | boolean | null>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null) fields[key] = { nullValue: null };
    else if (typeof value === "string") fields[key] = { stringValue: value };
    else if (typeof value === "number") fields[key] = { integerValue: String(value) };
    else if (typeof value === "boolean") fields[key] = { booleanValue: value };
  }
  return fields;
}

// PATCH parcial (merge) num documento, só nos campos passados em `data`.
export async function adminPatchDocument(
  path: string,
  data: Record<string, string | number | boolean | null>
): Promise<void> {
  const token = await getGoogleAccessToken(FIRESTORE_SCOPE);
  const updateMask = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const res = await fetch(`${firestoreBaseUrl()}/${path}?${updateMask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) {
    throw new Error(`Firestore admin patch falhou (${path}): ${await res.text()}`);
  }
}

export async function adminGetDocument(path: string): Promise<Record<string, unknown> | null> {
  const token = await getGoogleAccessToken(FIRESTORE_SCOPE);
  const res = await fetch(`${firestoreBaseUrl()}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000)
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore admin get falhou (${path}): ${await res.text()}`);
  const data = (await res.json()) as { fields?: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean }> };
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

// Consome uma unidade da cota somente quando ela ainda está disponível. A
// transação do Firestore impede que duas requisições concorrentes leiam o mesmo
// contador e ultrapassem o limite. Esta função roda exclusivamente no servidor
// com service account; o cliente não recebe permissão de escrita em aiUsage.
export async function adminConsumeAiQuota(
  path: string,
  limit: number
): Promise<{ allowed: boolean; used: number }> {
  const document = firestoreDocumentName(path);
  const headers = (token: string) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

  for (let attempt = 0; attempt < 3; attempt++) {
    const token = await getGoogleAccessToken(FIRESTORE_SCOPE);
    const begin = await fetch(`${firestoreDatabaseUrl()}/documents:beginTransaction`, {
      method: "POST", headers: headers(token), body: JSON.stringify({}), signal: AbortSignal.timeout(8000)
    });
    if (!begin.ok) throw new Error(`Não foi possível iniciar a transação de cota (${await begin.text()})`);
    const { transaction } = await begin.json() as { transaction?: string };
    if (!transaction) throw new Error("Transação de cota inválida.");

    const read = await fetch(`${firestoreDatabaseUrl()}/documents:batchGet`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ documents: [document], transaction }),
      signal: AbortSignal.timeout(8000)
    });
    if (!read.ok) throw new Error(`Não foi possível consultar a cota (${await read.text()})`);
    const rows = (await read.text()).trim().split("\n").filter(Boolean).map((row) => JSON.parse(row) as {
      found?: { fields?: { count?: { integerValue?: string } } };
    });
    const used = Number(rows.find((row) => row.found)?.found?.fields?.count?.integerValue ?? 0);
    if (used >= limit) return { allowed: false, used };

    const commit = await fetch(`${firestoreDatabaseUrl()}/documents:commit`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        transaction,
        writes: [{
          transform: {
            document,
            fieldTransforms: [
              { fieldPath: "count", increment: { integerValue: "1" } },
              { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }
            ]
          }
        }]
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (commit.ok) return { allowed: true, used: used + 1 };
    // Conflito de transação é esperado sob concorrência: repete a leitura.
    if (commit.status === 409) continue;
    throw new Error(`Não foi possível registrar o consumo de IA (${await commit.text()})`);
  }
  throw new Error("A cota de IA está concorrida. Tente novamente.");
}

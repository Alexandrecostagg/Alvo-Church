import { getGoogleAccessToken } from "./google-service-account";
import { isLocalQaFirebase, serverFirestoreDocumentsUrl } from "./firebase-server-env";

type Data = Record<string, any>;
export class AccountError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function encode(value: any): Data {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return { integerValue: String(value) };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encode(v)])) } };
}
function decode(value: Data): any {
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([k, v]) => [k, decode(v as Data)]));
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decode);
  if (value.integerValue !== undefined) return Number(value.integerValue);
  return value.stringValue ?? value.booleanValue ?? null;
}
export interface AccountTransaction {
  query: (parent: string, collection: string, field?: string, value?: unknown, op?: "EQUAL" | "ARRAY_CONTAINS", limit?: number, and?: { field: string; value: unknown }) => Promise<Data[]>;
  usersByEmail: (orgId: string, email: string) => Promise<Data[]>;
  read: (...paths: string[]) => Promise<Array<Data | null>>;
  set: (path: string, data: Data) => void;
  patch: (path: string, data: Data) => void;
  remove: (path: string) => void;
}
class ContentionError extends Error {}

// Firestore REST keeps this compatible with the Cloudflare runtime. All reads
// precede the atomic commit; failed attempts release locks before backoff.
export async function accountTransaction<T>(work: (tx: AccountTransaction) => Promise<T>): Promise<T> {
  const base = serverFirestoreDocumentsUrl();
  const name = (path: string) => `${base.split("/v1/")[1]}/${path}`;
  const token = isLocalQaFirebase() ? "owner" : await getGoogleAccessToken("https://www.googleapis.com/auth/datastore");
  async function call(suffix: string, body: Data) {
    const response = await fetch(base + suffix, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(12000), cache: "no-store",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 409 || error.error?.status === "ABORTED") throw new ContentionError();
      throw new Error(`Firestore ${response.status}`);
    }
    return response.json();
  }
  let retryTransaction: string | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 100 * 2 ** (attempt - 1) * (0.5 + Math.random())));
    let transaction: string | undefined;
    let committed = false;
    try {
      transaction = (await call(":beginTransaction", { options: { readWrite: retryTransaction ? { retryTransaction } : {} } })).transaction;
      if (!transaction) throw new Error("Transação ausente.");
      const writes: Data[] = [];
      const result = await work({
        query: async (parent, collection, field, value, op = "EQUAL", limit = 200, and) => {
          const filters = field ? [{ fieldFilter: { field: { fieldPath: field }, op, value: encode(value) } }] : [];
          if (and) filters.push({ fieldFilter: { field: { fieldPath: and.field }, op: "EQUAL", value: encode(and.value) } });
          const rows: Data[] = await call(`/${parent}:runQuery`, { transaction, structuredQuery: { from: [{ collectionId: collection }], ...(filters.length ? { where: filters.length === 1 ? filters[0] : { compositeFilter: { op: "AND", filters } } } : {}), limit } });
          return rows.filter(row => row.document).map(row => ({ ...decode({ mapValue: { fields: row.document.fields } }), id: row.document.name.split("/").at(-1) }));
        },
        usersByEmail: async (orgId, email) => {
          const rows: Data[] = await call(`/organizations/${orgId}:runQuery`, { transaction, structuredQuery: { from: [{ collectionId: "users" }], where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: email } } }, limit: 2 } });
          return rows.filter(row => row.document).map(row => ({ ...decode({ mapValue: { fields: row.document.fields } }), id: row.document.name.split("/").at(-1) }));
        },
        read: async (...paths) => {
          if (!paths.length) return [];
          const rows: Data[] = await call(":batchGet", { documents: [...new Set(paths.map(name))], transaction });
          const found = new Map(rows.filter(row => row.found).map(row => [row.found.name, decode({ mapValue: { fields: row.found.fields } })]));
          return paths.map(path => found.get(name(path)) ?? null);
        },
        set: (path, data) => writes.push({ update: { name: name(path), fields: encode(data).mapValue.fields } }),
        patch: (path, data) => writes.push({ update: { name: name(path), fields: encode(data).mapValue.fields }, updateMask: { fieldPaths: Object.keys(data) }, currentDocument: { exists: true } }),
        remove: path => writes.push({ delete: name(path) }),
      });
      if (writes.length) { await call(":commit", { transaction, writes }); committed = true; }
      return result;
    } catch (error) {
      if (error instanceof ContentionError) {
        if (attempt < 4) { retryTransaction = transaction; continue; }
        throw new AccountError(409, "O vínculo mudou durante a operação. Atualize e tente novamente.");
      }
      throw error;
    } finally {
      if (transaction && !committed) await call(":rollback", { transaction }).catch(() => {});
    }
  }
  throw new AccountError(409, "Não foi possível concluir o vínculo.");
}

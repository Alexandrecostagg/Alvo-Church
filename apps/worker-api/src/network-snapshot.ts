// Snapshot diário de rede (NetworkSnapshot) calculado no servidor via cron.
//
// Usa runAggregationQuery do Firestore: somente números trafegam e nenhum
// cadastro individual é baixado pelo Worker.
//
// Grava em organizations/{orgId}/networkSnapshots/{yyyy-mm-dd}. O navegador
// apenas lê os agregados autorizados; nenhum cliente pode sobrescrever o cron.
//
// Requisitos de deploy:
//   wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON   (mesma SA usada no web)
//   vars.FIREBASE_PROJECT_ID no wrangler.jsonc

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
}

const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccountJson;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: FIRESTORE_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  const encoder = new TextEncoder();
  const signingInput =
    base64UrlEncode(encoder.encode(JSON.stringify(header))) +
    "." +
    base64UrlEncode(encoder.encode(JSON.stringify(claims)));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(signingInput));
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!res.ok) {
    throw new Error(`Token OAuth2 falhou: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Resposta OAuth2 sem access_token.");
  return data.access_token;
}

// ── Firestore REST helpers ──────────────────────────────────────────────────

type FirestoreFilter = Record<string, unknown>;

function eqFilter(field: string, value: string): FirestoreFilter {
  return {
    fieldFilter: {
      field: { fieldPath: field },
      op: "EQUAL",
      value: { stringValue: value }
    }
  };
}

function inFilter(field: string, values: string[]): FirestoreFilter {
  return {
    fieldFilter: {
      field: { fieldPath: field },
      op: "IN",
      value: { arrayValue: { values: values.map((v) => ({ stringValue: v })) } }
    }
  };
}

function gteFilter(field: string, value: string): FirestoreFilter {
  return {
    fieldFilter: {
      field: { fieldPath: field },
      op: "GREATER_THAN_OR_EQUAL",
      value: { stringValue: value }
    }
  };
}

function ltFilter(field: string, value: string): FirestoreFilter {
  return {
    fieldFilter: {
      field: { fieldPath: field },
      op: "LESS_THAN",
      value: { stringValue: value }
    }
  };
}

function andFilter(...filters: FirestoreFilter[]): FirestoreFilter {
  return { compositeFilter: { op: "AND", filters } };
}

type Aggregation =
  | { kind: "count"; alias: "c" }
  | { kind: "sum"; alias: "s"; field: string };

export function buildAggregationBody(params: {
  collectionId: string;
  where?: FirestoreFilter;
  allDescendants?: boolean;
  aggregation: Aggregation;
}) {
  const structuredQuery: Record<string, unknown> = {
    from: [{
      collectionId: params.collectionId,
      ...(params.allDescendants ? { allDescendants: true } : {})
    }]
  };
  if (params.where) structuredQuery.where = params.where;
  const aggregation = params.aggregation.kind === "count"
    ? { count: {}, alias: params.aggregation.alias }
    : { sum: { field: { fieldPath: params.aggregation.field } }, alias: params.aggregation.alias };
  return { structuredAggregationQuery: { structuredQuery, aggregations: [aggregation] } };
}

async function aggregateDocuments(params: {
  projectId: string;
  token: string;
  parentPath: string;
  collectionId: string;
  where?: FirestoreFilter;
  allDescendants?: boolean;
  aggregation: Aggregation;
}): Promise<number> {
  const url = `https://firestore.googleapis.com/v1/projects/${params.projectId}/databases/(default)/documents/${params.parentPath}:runAggregationQuery`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${params.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildAggregationBody(params)),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) {
    throw new Error(`runAggregationQuery falhou (${params.collectionId}): ${res.status} ${await res.text()}`);
  }
  const alias = params.aggregation.alias;
  const rows = (await res.json()) as Array<{
    result?: { aggregateFields?: Record<string, { integerValue?: string; doubleValue?: number }> };
  }>;
  const value = rows[0]?.result?.aggregateFields?.[alias];
  return Number(value?.integerValue ?? value?.doubleValue ?? 0);
}

async function countDocuments(params: {
  projectId: string;
  token: string;
  parentPath: string; // ex: "organizations/org_x"
  collectionId: string;
  where?: FirestoreFilter;
  allDescendants?: boolean;
}): Promise<number> {
  return aggregateDocuments({ ...params, aggregation: { kind: "count", alias: "c" } });
}

async function sumDocuments(params: {
  projectId: string;
  token: string;
  parentPath: string;
  collectionId: string;
  field: string;
  where?: FirestoreFilter;
  allDescendants?: boolean;
}): Promise<number> {
  return aggregateDocuments({
    ...params,
    aggregation: { kind: "sum", alias: "s", field: params.field }
  });
}

export function networkMonthWindow(now: Date) {
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    month: current.toISOString().slice(0, 7),
    currentStart: current.toISOString(),
    previousStart: previous.toISOString(),
    nextStart: next.toISOString()
  };
}

export async function collectOrganizationSnapshotMetrics(params: {
  projectId: string;
  token: string;
  organizationId: string;
  now: Date;
}) {
  const parentPath = `organizations/${params.organizationId}`;
  const base = { projectId: params.projectId, token: params.token, parentPath };
  const window = networkMonthWindow(params.now);
  const financeFilter = (start: string, end: string) => andFilter(
    eqFilter("kind", "income"),
    gteFilter("date", start),
    ltFilter("date", end)
  );
  const voidedFinanceFilter = (start: string, end: string) => andFilter(
    eqFilter("kind", "income"),
    eqFilter("status", "voided"),
    gteFilter("date", start),
    ltFilter("date", end)
  );
  const eventFilter = andFilter(
    inFilter("status", ["published", "closed"]),
    gteFilter("startsAt", window.currentStart),
    ltFilter("startsAt", window.nextStart)
  );
  const meetingFilter = andFilter(
    eqFilter("organizationId", params.organizationId),
    eqFilter("meetingStatus", "completed"),
    gteFilter("completedAt", window.currentStart),
    ltFilter("completedAt", window.nextStart)
  );
  const attendanceFilter = andFilter(
    eqFilter("organizationId", params.organizationId),
    inFilter("attendanceStatus", ["present", "first_time_guest"]),
    gteFilter("recordedAt", window.currentStart),
    ltFilter("recordedAt", window.nextStart)
  );
  const eventAttendanceFilter = andFilter(
    eqFilter("organizationId", params.organizationId),
    gteFilter("checkedInAt", window.currentStart),
    ltFilter("checkedInAt", window.nextStart)
  );

  const [
    totalPeople,
    visitors,
    activeMembers,
    newMembersThisMonth,
    totalGroups,
    activeGroups,
    allGivingThisMonth,
    voidedGivingThisMonth,
    allGivingLastMonth,
    voidedGivingLastMonth,
    eventsThisMonth,
    completedMeetings,
    groupAttendances,
    totalEventAttendance
  ] = await Promise.all([
    countDocuments({ ...base, collectionId: "people" }),
    countDocuments({ ...base, collectionId: "people", where: eqFilter("memberStatus", "visitor") }),
    countDocuments({ ...base, collectionId: "people", where: inFilter("memberStatus", ["member", "leader", "volunteer"]) }),
    countDocuments({ ...base, collectionId: "people", where: gteFilter("createdAt", window.currentStart) }),
    countDocuments({ ...base, collectionId: "groups" }),
    countDocuments({ ...base, collectionId: "groups", where: eqFilter("status", "active") }),
    sumDocuments({ ...base, collectionId: "financialTransactions", field: "amount", where: financeFilter(window.currentStart, window.nextStart) }),
    sumDocuments({ ...base, collectionId: "financialTransactions", field: "amount", where: voidedFinanceFilter(window.currentStart, window.nextStart) }),
    sumDocuments({ ...base, collectionId: "financialTransactions", field: "amount", where: financeFilter(window.previousStart, window.currentStart) }),
    sumDocuments({ ...base, collectionId: "financialTransactions", field: "amount", where: voidedFinanceFilter(window.previousStart, window.currentStart) }),
    countDocuments({ ...base, collectionId: "events", where: eventFilter }),
    countDocuments({ ...base, collectionId: "meetings", where: meetingFilter, allDescendants: true }),
    countDocuments({ ...base, collectionId: "attendance", where: attendanceFilter, allDescendants: true }),
    countDocuments({ ...base, collectionId: "registrations", where: eventAttendanceFilter, allDescendants: true })
  ]);
  const totalMembers = Math.max(0, totalPeople - visitors);
  return {
    month: window.month,
    totalMembers,
    newMembersThisMonth,
    activeMembers,
    visitors,
    totalGroups,
    activeGroups,
    avgGroupAttendance: completedMeetings ? Math.round(groupAttendances / completedMeetings) : 0,
    eventsThisMonth,
    totalEventAttendance,
    givingThisMonth: Math.max(0, allGivingThisMonth - voidedGivingThisMonth),
    givingLastMonth: Math.max(0, allGivingLastMonth - voidedGivingLastMonth),
    serviceAttendanceRate: totalMembers ? Math.round((activeMembers / totalMembers) * 100) : 0
  };
}

async function listOrganizationIds(projectId: string, token: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/organizations`
    );
    url.searchParams.set("pageSize", "300");
    // Só precisamos dos IDs — não baixa os campos dos documentos.
    url.searchParams.set("mask.fieldPaths", "__name__");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      throw new Error(`Listagem de organizações falhou: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      documents?: Array<{ name: string }>;
      nextPageToken?: string;
    };
    for (const docItem of data.documents ?? []) {
      const id = docItem.name.split("/").pop();
      if (id) ids.push(id);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return ids;
}

async function patchSnapshot(params: {
  projectId: string;
  token: string;
  organizationId: string;
  date: string;
  fields: Record<string, string | number>;
}): Promise<void> {
  const path = `organizations/${params.organizationId}/networkSnapshots/${params.date}`;
  const fieldEntries = Object.entries(params.fields);
  const updateMask = fieldEntries
    .map(([k]) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");

  const firestoreFields = encodeSnapshotFields(params.fields);

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${params.projectId}/databases/(default)/documents/${path}?${updateMask}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${params.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: firestoreFields }),
      signal: AbortSignal.timeout(10000)
    }
  );

  if (!res.ok) {
    throw new Error(`PATCH do snapshot falhou (${params.organizationId}): ${res.status} ${await res.text()}`);
  }
}

export function encodeSnapshotFields(fields: Record<string, string | number>) {
  const encoded: Record<string, { stringValue: string } | { integerValue: string } | { doubleValue: number }> = {};
  for (const [key, value] of Object.entries(fields)) {
    encoded[key] = typeof value === "number"
      ? Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
      : { stringValue: value };
  }
  return encoded;
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  work: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await work(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}

// ── Job principal ───────────────────────────────────────────────────────────

export async function writeDailyNetworkSnapshots(env: {
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  FIREBASE_PROJECT_ID?: string;
}): Promise<{ ok: number; failed: number }> {
  const serviceAccountJson = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.warn("[network-snapshot] GOOGLE_SERVICE_ACCOUNT_JSON não configurado — cron ignorado.");
    return { ok: 0, failed: 0 };
  }
  const projectId = env.FIREBASE_PROJECT_ID ?? "alvo-church";

  const token = await getGoogleAccessToken(serviceAccountJson);
  const orgIds = await listOrganizationIds(projectId, token);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const createdAt = now.toISOString();

  const results = await mapWithConcurrency(orgIds, 4, async (organizationId) => {
    try {
      const metrics = await collectOrganizationSnapshotMetrics({
        projectId,
        token,
        organizationId,
        now
      });

      await patchSnapshot({
        projectId,
        token,
        organizationId,
        date: today,
        fields: {
          id: today,
          organizationId,
          date: today,
          ...metrics,
          createdAt
        }
      });
      return true;
    } catch (e) {
      console.error(`[network-snapshot] org ${organizationId} falhou:`, e);
      return false;
    }
  });

  const ok = results.filter(Boolean).length;
  const failed = results.length - ok;

  console.log(`[network-snapshot] concluído: ${ok} ok, ${failed} falhas, data=${today}`);
  return { ok, failed };
}

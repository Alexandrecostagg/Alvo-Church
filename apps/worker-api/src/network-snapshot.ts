// Snapshot diário de rede (NetworkSnapshot) calculado no servidor via cron.
//
// Substitui (e supera) o cálculo que era feito no navegador pelo
// useNetworkSnapshotWriter do apps/web: lá o cliente baixava até 2000 pessoas
// + grupos para contar no JS; aqui usamos runAggregationQuery do Firestore —
// só os NÚMEROS trafegam, nenhum documento é baixado.
//
// Grava exatamente o mesmo shape/path que o cliente
// (organizations/{orgId}/networkSnapshots/{yyyy-mm-dd}), então o dashboard de
// rede continua lendo do mesmo lugar. O writer do cliente continua existindo
// como fallback best-effort (1x/dia por navegador) e é idempotente com este —
// os dois escrevem o doc do dia com merge.
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
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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

async function getGoogleAccessToken(
  serviceAccountJson: string,
): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccountJson;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: FIRESTORE_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
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
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(signingInput),
  );
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(10000),
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
      value: { stringValue: value },
    },
  };
}

function inFilter(field: string, values: string[]): FirestoreFilter {
  return {
    fieldFilter: {
      field: { fieldPath: field },
      op: "IN",
      value: {
        arrayValue: { values: values.map((v) => ({ stringValue: v })) },
      },
    },
  };
}

function gteFilter(field: string, value: string): FirestoreFilter {
  return {
    fieldFilter: {
      field: { fieldPath: field },
      op: "GREATER_THAN_OR_EQUAL",
      value: { stringValue: value },
    },
  };
}

async function countDocuments(params: {
  projectId: string;
  token: string;
  parentPath: string; // ex: "organizations/org_x"
  collectionId: string;
  where?: FirestoreFilter;
}): Promise<number> {
  const url = `https://firestore.googleapis.com/v1/projects/${params.projectId}/databases/(default)/documents/${params.parentPath}:runAggregationQuery`;
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: params.collectionId }],
  };
  if (params.where) structuredQuery.where = params.where;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery,
        aggregations: [{ count: {}, alias: "c" }],
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(
      `runAggregationQuery falhou (${params.collectionId}): ${res.status} ${await res.text()}`,
    );
  }

  const rows = (await res.json()) as Array<{
    result?: { aggregateFields?: { c?: { integerValue?: string } } };
  }>;
  return Number(rows[0]?.result?.aggregateFields?.c?.integerValue ?? 0);
}

async function listOrganizationIds(
  projectId: string,
  token: string,
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/organizations`,
    );
    url.searchParams.set("pageSize", "300");
    // Só precisamos dos IDs — não baixa os campos dos documentos.
    url.searchParams.set("mask.fieldPaths", "__name__");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(
        `Listagem de organizações falhou: ${res.status} ${await res.text()}`,
      );
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

  const firestoreFields: Record<
    string,
    { stringValue: string } | { integerValue: string }
  > = {};
  for (const [key, value] of fieldEntries) {
    firestoreFields[key] =
      typeof value === "number"
        ? { integerValue: String(value) }
        : { stringValue: value };
  }

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${params.projectId}/databases/(default)/documents/${path}?${updateMask}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: firestoreFields }),
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!res.ok) {
    throw new Error(
      `PATCH do snapshot falhou (${params.organizationId}): ${res.status} ${await res.text()}`,
    );
  }
}

// ── Job principal ───────────────────────────────────────────────────────────

export async function writeDailyNetworkSnapshots(env: {
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  FIREBASE_PROJECT_ID?: string;
}): Promise<{ ok: number; failed: number }> {
  const serviceAccountJson = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.warn(
      "[network-snapshot] GOOGLE_SERVICE_ACCOUNT_JSON não configurado — cron ignorado.",
    );
    return { ok: 0, failed: 0 };
  }
  const projectId = env.FIREBASE_PROJECT_ID ?? "alvo-church";

  const token = await getGoogleAccessToken(serviceAccountJson);
  const orgIds = await listOrganizationIds(projectId, token);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const monthStart = `${month}-01T00:00:00.000Z`;
  const createdAt = now.toISOString();

  let ok = 0;
  let failed = 0;

  for (const organizationId of orgIds) {
    try {
      const parentPath = `organizations/${organizationId}`;
      const base = { projectId, token, parentPath };

      // Só agregações — nenhum documento de pessoa/grupo é transferido.
      const [
        totalPeople,
        visitors,
        activeMembers,
        newThisMonth,
        totalGroups,
        activeGroups,
      ] = await Promise.all([
        countDocuments({ ...base, collectionId: "people" }),
        countDocuments({
          ...base,
          collectionId: "people",
          where: eqFilter("memberStatus", "visitor"),
        }),
        countDocuments({
          ...base,
          collectionId: "people",
          where: inFilter("memberStatus", ["member", "leader", "volunteer"]),
        }),
        countDocuments({
          ...base,
          collectionId: "people",
          where: gteFilter("createdAt", monthStart),
        }),
        countDocuments({ ...base, collectionId: "groups" }),
        countDocuments({
          ...base,
          collectionId: "groups",
          where: eqFilter("status", "active"),
        }),
      ]);

      // Mesma semântica do writer do cliente: totalMembers = todos - visitantes.
      const totalMembers = totalPeople - visitors;

      await patchSnapshot({
        projectId,
        token,
        organizationId,
        date: today,
        fields: {
          id: today,
          organizationId,
          date: today,
          month,
          totalMembers,
          newMembersThisMonth: newThisMonth,
          activeMembers,
          visitors,
          totalGroups,
          activeGroups,
          avgGroupAttendance: 0,
          eventsThisMonth: 0,
          totalEventAttendance: 0,
          givingThisMonth: 0,
          givingLastMonth: 0,
          serviceAttendanceRate:
            totalMembers > 0
              ? Math.round((activeMembers / totalMembers) * 100)
              : 0,
          createdAt,
        },
      });

      ok++;
    } catch (e) {
      failed++;
      console.error(`[network-snapshot] org ${organizationId} falhou:`, e);
    }
  }

  return { ok, failed };
}

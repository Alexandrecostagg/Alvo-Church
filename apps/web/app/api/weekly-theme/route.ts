export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";

// Tema semanal para o app mobile (Área do Líder). O SDK client do Firebase
// não roda no runtime do Cloudflare Worker, então a consulta usa a REST API
// do Firestore com o ID token do próprio chamador — as Security Rules
// garantem que só membros ativos da organização conseguem ler.

function projectId() {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "alvo-church";
}

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

interface FirestoreFieldValue {
  stringValue?: string;
  arrayValue?: { values?: FirestoreFieldValue[] };
}

function plainValue(v: FirestoreFieldValue | undefined): unknown {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("arrayValue" in v) return (v.arrayValue?.values ?? []).map(plainValue);
  return undefined;
}

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const uid = await verifyFirebaseIdToken(req);
  if (!uid || !idToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");
  const groupId = searchParams.get("groupId") ?? "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId é obrigatório" }, { status: 400 });
  }

  const weekStartDate = getMondayOfWeek(new Date());

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents/organizations/${organizationId}:runQuery`,
    {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "weeklyThemes" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "weekStartDate" },
              op: "EQUAL",
              value: { stringValue: weekStartDate }
            }
          }
        }
      })
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Não foi possível consultar o tema semanal." }, { status: 502 });
  }

  const rows = (await res.json()) as Array<{ document?: { name: string; fields?: Record<string, FirestoreFieldValue> } }>;
  const themes = rows
    .filter((r) => r.document)
    .map((r) => {
      const f = r.document!.fields ?? {};
      return {
        id: r.document!.name.split("/").pop(),
        title: plainValue(f.title) as string | undefined,
        bibleVerse: plainValue(f.bibleVerse) as string | undefined,
        description: plainValue(f.description) as string | undefined,
        scope: plainValue(f.scope) as string | undefined,
        groupIds: (plainValue(f.groupIds) as string[] | undefined) ?? []
      };
    });

  const specific = groupId ? themes.find((t) => t.scope === "specific" && t.groupIds.includes(groupId)) : undefined;
  const theme = specific ?? themes.find((t) => t.scope === "all") ?? null;

  // O tema muda uma vez por semana — o cliente pode reusar a resposta por
  // 1h sem nova consulta ao Firestore. `private`: a resposta é autenticada,
  // então só o cache do próprio cliente (não CDN compartilhado).
  return NextResponse.json(
    { theme },
    { headers: { "Cache-Control": "private, max-age=3600" } }
  );
}

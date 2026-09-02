export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";

const ASAAS_BASE_URL = process.env.ASAAS_API_BASE_URL ?? "https://sandbox.asaas.com/api/v3";

function projectId() {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "alvo-church";
}

async function isTenantMemberOfOrg(idToken: string, organizationId: string, uid: string): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents/organizations/${organizationId}/users/${uid}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return false;
  const data = (await res.json()) as { fields?: { isActive?: { booleanValue?: boolean } } };
  return data.fields?.isActive?.booleanValue ?? false;
}

async function fetchSubscriptionId(idToken: string, organizationId: string): Promise<string | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents/organizations/${organizationId}/settings/subscription`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { fields?: { asaasSubscriptionId?: { stringValue?: string } } };
  return data.fields?.asaasSubscriptionId?.stringValue ?? null;
}

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const uid = await verifyFirebaseIdToken(req);
  if (!uid || !idToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const organizationId = req.nextUrl.searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId é obrigatório." }, { status: 400 });
  }

  // Checagem de membership e leitura do subscriptionId são independentes —
  // em paralelo (nenhuma tem efeito colateral).
  const [allowed, subscriptionId] = await Promise.all([
    isTenantMemberOfOrg(idToken, organizationId, uid),
    fetchSubscriptionId(idToken, organizationId)
  ]);

  if (!allowed) {
    return NextResponse.json({ error: "Você não tem acesso a esta organização." }, { status: 403 });
  }

  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true, invoices: [] });
  }

  if (!subscriptionId) {
    return NextResponse.json({ ok: true, invoices: [] });
  }

  try {
    const res = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}/payments?limit=12`, {
      headers: { "User-Agent": "PlataformaEsdras/1.0", access_token: apiKey },
      signal: AbortSignal.timeout(10000)
    });
    const data = (await res.json()) as {
      data?: Array<{
        id: string;
        value: number;
        status: string;
        dueDate: string;
        paymentDate?: string;
        invoiceUrl?: string;
      }>;
    };
    if (!res.ok) {
      return NextResponse.json({ error: "Não foi possível consultar as faturas no Asaas." }, { status: 502 });
    }
    const invoices = (data.data ?? [])
      .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1))
      .map((p) => ({
        id: p.id,
        value: p.value,
        status: p.status,
        dueDate: p.dueDate,
        paymentDate: p.paymentDate ?? null,
        invoiceUrl: p.invoiceUrl ?? null
      }));
    return NextResponse.json({ ok: true, invoices });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: `Erro ao falar com o Asaas: ${message}` }, { status: 502 });
  }
}

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../../_lib/verify-auth";
import { isTenantAdminOfOrg } from "../../../_lib/tenant-admin";
import { adminGetDocument } from "../../../_lib/firestore-admin";

// Checkout AVULSO (one-off) de uma trilha da Loja de Capacitação. Diferente do
// checkout de assinatura (/api/billing/checkout), aqui criamos uma cobrança
// única via Asaas `/payments` (não `/subscriptions`). O acesso é concedido de
// forma perpétua pelo webhook (grava programEntitlements) quando o pagamento
// confirma.

const ASAAS_BASE_URL = process.env.ASAAS_API_BASE_URL ?? "https://sandbox.asaas.com/api/v3";

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const uid = await verifyFirebaseIdToken(req);
  if (!uid || !idToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gateway de pagamento ainda não configurado (ASAAS_API_KEY ausente)." }, { status: 500 });
  }

  let body: { organizationId?: string; programId?: string; orgName?: string; email?: string; cpfCnpj?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { organizationId, programId, orgName, email, cpfCnpj } = body;
  if (!organizationId || !programId || !orgName || !email) {
    return NextResponse.json({ error: "organizationId, programId, orgName e email são obrigatórios." }, { status: 400 });
  }

  const allowed = await isTenantAdminOfOrg(idToken, organizationId, uid);
  if (!allowed) {
    return NextResponse.json({ error: "Você não tem permissão de admin nesta organização." }, { status: 403 });
  }

  // Preço e disponibilidade vêm do servidor (nunca confiar no cliente).
  const program = await adminGetDocument(`platformPrograms/${programId}`);
  if (!program) {
    return NextResponse.json({ error: "Trilha não encontrada." }, { status: 404 });
  }
  if (!program.isPublished) {
    return NextResponse.json({ error: "Esta trilha não está disponível para compra." }, { status: 400 });
  }
  const price = Number(program.priceBRL ?? 0);
  if (!price || price <= 0) {
    return NextResponse.json({ error: "Trilha sem preço válido." }, { status: 400 });
  }
  const title = String(program.title ?? "Trilha de capacitação");

  const asaasHeaders = {
    "Content-Type": "application/json",
    "User-Agent": "PlataformaEsdras/1.0",
    access_token: apiKey
  };

  try {
    // 1. Cria (ou reaproveita) o cliente Asaas para esta organização.
    const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: "POST",
      headers: asaasHeaders,
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        name: orgName,
        email,
        cpfCnpj: cpfCnpj || undefined,
        externalReference: organizationId
      })
    });
    const customerData = (await customerRes.json()) as { id?: string; errors?: Array<{ description: string }> };
    if (!customerRes.ok || !customerData.id) {
      return NextResponse.json({ error: `Asaas: ${customerData.errors?.[0]?.description ?? "erro ao criar cliente"}` }, { status: 502 });
    }

    // 2. Cria a cobrança única — billingType UNDEFINED deixa o pagador
    // escolher PIX, boleto ou cartão. externalReference no formato
    // `program:{orgId}:{programId}` é o que o webhook usa para liberar o
    // entitlement (ver app/api/billing/webhook/route.ts).
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: "POST",
      headers: asaasHeaders,
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        customer: customerData.id,
        billingType: "UNDEFINED",
        value: price,
        dueDate: dueDate.toISOString().slice(0, 10),
        description: `Plataforma Esdras — Capacitação: ${title}`,
        externalReference: `program:${organizationId}:${programId}`
      })
    });
    const paymentData = (await paymentRes.json()) as { id?: string; invoiceUrl?: string; errors?: Array<{ description: string }> };
    if (!paymentRes.ok || !paymentData.id || !paymentData.invoiceUrl) {
      return NextResponse.json({ error: `Asaas: ${paymentData.errors?.[0]?.description ?? "erro ao criar cobrança"}` }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      checkoutUrl: paymentData.invoiceUrl,
      asaasPaymentId: paymentData.id
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: `Erro ao falar com o Asaas: ${message}` }, { status: 502 });
  }
}

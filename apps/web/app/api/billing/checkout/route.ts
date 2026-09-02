import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { isTenantAdminOfOrg } from "../../_lib/tenant-admin";

const ASAAS_BASE_URL =
  process.env.ASAAS_API_BASE_URL ?? "https://sandbox.asaas.com/api/v3";

const PLAN_PRICE: Record<string, number> = {
  comunidade: 79,
  pastoral: 159,
};

const PLAN_LABEL: Record<string, string> = {
  comunidade: "Comunidade",
  pastoral: "Pastoral",
};

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  const uid = await verifyFirebaseIdToken(req);
  if (!uid || !idToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Gateway de pagamento ainda não configurado (ASAAS_API_KEY ausente).",
      },
      { status: 500 },
    );
  }

  let body: {
    organizationId?: string;
    planId?: string;
    orgName?: string;
    email?: string;
    cpfCnpj?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { organizationId, planId, orgName, email, cpfCnpj } = body;
  if (!organizationId || !planId || !orgName || !email) {
    return NextResponse.json(
      { error: "organizationId, planId, orgName e email são obrigatórios." },
      { status: 400 },
    );
  }

  const price = PLAN_PRICE[planId];
  if (!price) {
    return NextResponse.json(
      { error: `Plano "${planId}" não tem checkout self-service.` },
      { status: 400 },
    );
  }

  const allowed = await isTenantAdminOfOrg(idToken, organizationId, uid);
  if (!allowed) {
    return NextResponse.json(
      { error: "Você não tem permissão de admin nesta organização." },
      { status: 403 },
    );
  }

  const asaasHeaders = {
    "Content-Type": "application/json",
    "User-Agent": "PlataformaEsdras/1.0",
    access_token: apiKey,
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
        externalReference: organizationId,
      }),
    });
    const customerData = (await customerRes.json()) as {
      id?: string;
      errors?: Array<{ description: string }>;
    };
    if (!customerRes.ok || !customerData.id) {
      return NextResponse.json(
        {
          error: `Asaas: ${customerData.errors?.[0]?.description ?? "erro ao criar cliente"}`,
        },
        { status: 502 },
      );
    }

    // 2. Cria a assinatura recorrente — billingType UNDEFINED deixa o
    // pagador escolher PIX, boleto ou cartão na hora de pagar.
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 3);

    const subscriptionRes = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: "POST",
      headers: asaasHeaders,
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        customer: customerData.id,
        billingType: "UNDEFINED",
        value: price,
        nextDueDate: nextDueDate.toISOString().slice(0, 10),
        cycle: "MONTHLY",
        description: `Plataforma Esdras — plano ${PLAN_LABEL[planId]}`,
        externalReference: organizationId,
      }),
    });
    const subscriptionData = (await subscriptionRes.json()) as {
      id?: string;
      errors?: Array<{ description: string }>;
    };
    if (!subscriptionRes.ok || !subscriptionData.id) {
      return NextResponse.json(
        {
          error: `Asaas: ${subscriptionData.errors?.[0]?.description ?? "erro ao criar assinatura"}`,
        },
        { status: 502 },
      );
    }

    // 3. Busca a primeira cobrança gerada pela assinatura, pra pegar o
    // link de pagamento hospedado (invoiceUrl).
    const paymentsRes = await fetch(
      `${ASAAS_BASE_URL}/subscriptions/${subscriptionData.id}/payments`,
      {
        headers: asaasHeaders,
        signal: AbortSignal.timeout(10000),
      },
    );
    const paymentsData = (await paymentsRes.json()) as {
      data?: Array<{ invoiceUrl?: string }>;
    };
    const checkoutUrl = paymentsData.data?.[0]?.invoiceUrl;

    if (!checkoutUrl) {
      return NextResponse.json(
        {
          error:
            "Assinatura criada, mas não foi possível obter o link de pagamento.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      checkoutUrl,
      asaasCustomerId: customerData.id,
      asaasSubscriptionId: subscriptionData.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro ao falar com o Asaas: ${message}` },
      { status: 502 },
    );
  }
}

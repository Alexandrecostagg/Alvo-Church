import { NextRequest, NextResponse } from "next/server";
import { adminPatchDocument } from "../../_lib/firestore-admin";

// Webhook do Asaas: nenhum usuário logado aqui, então a escrita usa a
// service account (ver _lib/firestore-admin.ts), não o SDK client.
// Autenticidade validada pelo token configurado manualmente no dashboard
// do Asaas (Configurações > Webhooks > Token de acesso).

const VALUE_TO_PLAN: Record<number, string> = {
  79: "comunidade",
  159: "pastoral"
};

const CONFIRMED_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
// Fatura vencida entra em carência (billingStatus overdue) — não derruba o
// plano na hora, só quando o prazo estoura (calculado em resolveBillingStatus,
// packages/firebase/src/plans.ts) ou quando a assinatura é de fato cancelada.
const OVERDUE_EVENTS = new Set(["PAYMENT_OVERDUE"]);
const CANCELLED_EVENTS = new Set(["SUBSCRIPTION_DELETED", "PAYMENT_DELETED", "PAYMENT_REFUNDED"]);

interface AsaasWebhookPayload {
  event: string;
  payment?: {
    value?: number;
    subscription?: string;
    externalReference?: string;
    status?: string;
  };
}

export async function POST(req: NextRequest) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const receivedToken = req.headers.get("asaas-access-token");
  if (!expectedToken || receivedToken !== expectedToken) {
    return NextResponse.json({ error: "Token de webhook inválido" }, { status: 401 });
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const organizationId = payload.payment?.externalReference;
  if (!organizationId) {
    // Evento sem referência à nossa organização (ex: teste manual do
    // Asaas) — confirma recebimento sem fazer nada.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const docPath = `organizations/${organizationId}/settings/subscription`;

  try {
    if (CONFIRMED_EVENTS.has(payload.event)) {
      const plan = payload.payment?.value ? VALUE_TO_PLAN[payload.payment.value] : undefined;
      await adminPatchDocument(docPath, {
        ...(plan ? { plan } : {}),
        billingStatus: "active",
        overdueSince: null,
        asaasStatus: payload.payment?.status ?? payload.event,
        ...(payload.payment?.subscription ? { asaasSubscriptionId: payload.payment.subscription } : {})
      });
    } else if (OVERDUE_EVENTS.has(payload.event)) {
      await adminPatchDocument(docPath, {
        billingStatus: "overdue",
        overdueSince: new Date().toISOString(),
        asaasStatus: payload.payment?.status ?? payload.event
      });
    } else if (CANCELLED_EVENTS.has(payload.event)) {
      await adminPatchDocument(docPath, {
        plan: "free",
        billingStatus: "active",
        overdueSince: null,
        asaasStatus: payload.payment?.status ?? payload.event
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("[billing/webhook] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

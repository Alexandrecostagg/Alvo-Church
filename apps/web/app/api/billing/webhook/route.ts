import { NextRequest, NextResponse } from "next/server";
import { adminPatchDocument } from "../../_lib/firestore-admin";
import { safeStringCompare } from "../../_lib/safe-compare";

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
    id?: string;
    value?: number;
    subscription?: string;
    externalReference?: string;
    status?: string;
  };
}

export async function POST(req: NextRequest) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const receivedToken = req.headers.get("asaas-access-token");
  if (!expectedToken || !receivedToken || !safeStringCompare(expectedToken, receivedToken)) {
    return NextResponse.json({ error: "Token de webhook inválido" }, { status: 401 });
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const externalReference = payload.payment?.externalReference ?? "";

  // Loja de Capacitação: compra avulsa de trilha. externalReference no
  // formato `program:{orgId}:{programId}` (assinaturas usam o orgId puro,
  // sem ":", então nunca colidem). Grava/revoga o entitlement da org.
  if (externalReference.startsWith("program:")) {
    const [, entOrgId, programId] = externalReference.split(":");
    if (!entOrgId || !programId) {
      return NextResponse.json({ ok: true, ignored: true });
    }
    const entPath = `organizations/${entOrgId}/programEntitlements/${programId}`;
    try {
      if (CONFIRMED_EVENTS.has(payload.event)) {
        // PATCH é idempotente: re-entrega do mesmo PAYMENT_CONFIRMED só
        // reafirma status active.
        await adminPatchDocument(entPath, {
          programId,
          status: "active",
          purchasedAt: new Date().toISOString(),
          asaasPaymentId: payload.payment?.id ?? "",
          asaasStatus: payload.payment?.status ?? payload.event
        });
      } else if (CANCELLED_EVENTS.has(payload.event)) {
        // Estorno/cancelamento: revoga (flip de status — não dá pra deletar
        // via service account patch, e manter o doc preserva o histórico).
        await adminPatchDocument(entPath, {
          status: "revoked",
          asaasStatus: payload.payment?.status ?? payload.event
        });
      }
      return NextResponse.json({ ok: true, program: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("[billing/webhook] program error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const organizationId = externalReference;
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

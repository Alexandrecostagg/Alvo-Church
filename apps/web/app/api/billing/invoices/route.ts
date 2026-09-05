import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, privateHeaders } from "../../_lib/kids-media";
import { accountTransaction } from "../../_lib/member-account-store";
import { financeActor } from "../../_lib/finance-operations";
import { asaas, checkoutUrl } from "../../_lib/billing-operations";
import { documentId } from "../../_lib/member-account";
export async function GET(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const orgId = documentId(
      req.nextUrl.searchParams.get("organizationId"),
      "Igreja",
    );
    const subscription = await accountTransaction(async (tx) => {
      const { root } = await financeActor(tx, orgId, uid);
      return (await tx.read(`${root}/settings/subscription`))[0];
    });
    if (!subscription?.asaasSubscriptionId)
      return NextResponse.json(
        { ok: true, invoices: [] },
        { headers: privateHeaders },
      );
    const data = await asaas(
      `/subscriptions/${documentId(subscription.asaasSubscriptionId, "Assinatura")}/payments?limit=12`,
    );
    const invoices = (data.data || [])
      .filter(
        (p: any) =>
          p.subscription === subscription.asaasSubscriptionId &&
          (!subscription.asaasCustomerId ||
            p.customer === subscription.asaasCustomerId),
      )
      .map((p: any) => ({
        id: p.id,
        value: p.value,
        status: p.status,
        dueDate: p.dueDate,
        paymentDate: p.paymentDate || null,
        invoiceUrl: p.invoiceUrl ? checkoutUrl(p.invoiceUrl) : null,
      }));
    return NextResponse.json(
      { ok: true, invoices },
      { headers: privateHeaders },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Faturas indisponíveis.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

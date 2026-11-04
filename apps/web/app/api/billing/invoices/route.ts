import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { AccountError, privateHeaders } from "../../_lib/kids-media";
import { accountTransaction } from "../../_lib/member-account-store";
import { financeActor } from "../../_lib/finance-operations";
import { asaas, checkoutUrl } from "../../_lib/billing-operations";
import { documentId } from "../../_lib/member-account";
import { verifiedBillingBinding } from "../../_lib/billing-binding";
export async function GET(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const orgId = documentId(
      req.nextUrl.searchParams.get("organizationId"),
      "Igreja",
    );
    const binding = await accountTransaction(async (tx) => {
      const { root } = await financeActor(tx, orgId, uid);
      const [subscription, order] = await tx.read(`${root}/settings/subscription`, `${root}/billingOrders/subscription`);
      return verifiedBillingBinding(orgId, subscription, order);
    });
    if (!binding)
      return NextResponse.json(
        { ok: true, invoices: [] },
        { headers: privateHeaders },
      );
    const data = await asaas(
      `/subscriptions/${binding.subscriptionId}/payments?limit=12`,
    );
    const invoices = (data.data || [])
      .filter(
        (p: any) =>
          p.subscription === binding.subscriptionId && p.customer === binding.customerId,
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

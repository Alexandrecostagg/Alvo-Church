import { AccountError } from "./member-account-store";
import { documentId } from "./member-account";

// A subscription document was historically client-writable. Never use it as
// the authority for a gateway lookup without the server-only billing intent.
export function verifiedBillingBinding(orgId: string, subscription: any, order: any) {
  if (!subscription?.asaasSubscriptionId) return null;
  if (!order || order.organizationId !== orgId || order.orderId !== "subscription"
    || order.externalReference !== `order:${orgId}:subscription`
    || !order.customerId || !order.resourceId
    || subscription.asaasCustomerId !== order.customerId
    || subscription.asaasSubscriptionId !== order.resourceId) {
    throw new AccountError(409, "O vínculo da assinatura precisa ser conferido pelo suporte antes de consultar faturas.");
  }
  return { customerId: documentId(order.customerId, "Cliente"), subscriptionId: documentId(order.resourceId, "Assinatura") };
}

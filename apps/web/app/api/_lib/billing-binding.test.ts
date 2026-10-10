import { describe, expect, it } from "vitest";
import { verifiedBillingBinding } from "./billing-binding";
const order = { organizationId: "org", orderId: "subscription", externalReference: "order:org:subscription", customerId: "cus_1", resourceId: "sub_1" };
const subscription = { asaasCustomerId: "cus_1", asaasSubscriptionId: "sub_1" };
describe("billing authority", () => {
  it("accepts only matching server intent", () => expect(verifiedBillingBinding("org", subscription, order)).toEqual({ customerId: "cus_1", subscriptionId: "sub_1" }));
  it.each([null, { ...order, organizationId: "foreign" }, { ...order, customerId: "foreign" }, { ...order, resourceId: "foreign" }, { ...order, externalReference: "foreign" }])("rejects a missing or mismatched intent", invalid => expect(() => verifiedBillingBinding("org", subscription, invalid)).toThrow());
  it("preserves invoice history after cancellation", () => expect(verifiedBillingBinding("org", subscription, { ...order, cancelled: true })).toEqual({ customerId: "cus_1", subscriptionId: "sub_1" }));
  it("rejects the old empty customer bypass", () => expect(() => verifiedBillingBinding("org", { ...subscription, asaasCustomerId: "" }, order)).toThrow());
  it("does not query a gateway for an unlinked free plan", () => expect(verifiedBillingBinding("org", { plan: "free" }, null)).toBeNull());
});

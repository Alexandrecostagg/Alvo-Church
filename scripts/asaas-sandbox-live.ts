import assert from "node:assert/strict";
import { assertSandbox, sandboxOrg } from "./asaas-sandbox-server";
import { asaas, startBilling } from "../apps/web/app/api/_lib/billing-operations";
import { accountTransaction } from "../apps/web/app/api/_lib/member-account-store";

const root = `organizations/${sandboxOrg}`;
const reference = `order:${sandboxOrg}:subscription`;
const orderPath = `${root}/billingOrders/subscription`;
const events = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED", "PAYMENT_REFUNDED", "SUBSCRIPTION_DELETED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE", "PAYMENT_AWAITING_CHARGEBACK_REVERSAL"];

async function api(path: string, method = "GET", body?: object) {
  assertSandbox();
  assert(path.startsWith("/") && !path.startsWith("//"));
  const res = await fetch("https://api-sandbox.asaas.com/v3" + path, {
    method, headers: { access_token: process.env.ASAAS_API_KEY!, "content-type": "application/json", "User-Agent": "PlataformaEsdras/1.0" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000), redirect: "error",
  });
  if (!res.ok) throw new Error(`Asaas Sandbox: HTTP ${res.status} em ${method} ${path.split("?")[0]}. Consulte o painel antes de repetir uma criação.`);
  return res.json();
}

async function webhook() {
  const list = await api("/webhooks?offset=0&limit=100");
  const matches = list.data.filter((item: any) => item.name === "Plataforma Esdras - Billing");
  assert.equal(matches.length, 1, "Webhook Esdras deve ser único.");
  return matches[0];
}
async function linkedOrder() {
  const [order] = await accountTransaction(tx => tx.read(orderPath));
  assert(order?.organizationId === sandboxOrg && order.externalReference === reference && order.resourceId && order.customerId);
  return order;
}
async function paymentFor(order: any) {
  const list = await api(`/subscriptions/${encodeURIComponent(order.resourceId)}/payments?limit=100`);
  const matches = list.data.filter((p: any) => p.externalReference === reference && p.customer === order.customerId && p.subscription === order.resourceId && p.value === 79);
  assert.equal(matches.length, 1, "Apenas uma cobrança QA é esperada; não escolher cobrança ambígua.");
  return matches[0];
}
async function inspect() {
  const [org, order, subscription] = await accountTransaction(tx => tx.read(root, orderPath, `${root}/settings/subscription`));
  const rows = await accountTransaction(tx => tx.query(root, "billingEvents"));
  console.log(JSON.stringify({ environment: "sandbox", organization: sandboxOrg, memberCount: org?.memberCount, plan: subscription?.plan, orderPhase: order?.phase, cancelled: order?.cancelled, providerStatus: order?.providerStatus, events: rows.map(e => ({ id: e.id, event: e.event, ignored: e.ignored, providerStatus: e.providerStatus })) }));
}
async function main() {
  assertSandbox();
  const mode = process.argv[2];
  if (mode === "connect") {
    const base = new URL(process.argv[3]);
    assert(base.protocol === "https:" && /^[a-z0-9-]+\.trycloudflare\.com$/.test(base.hostname) && !base.username && !base.password && !base.port && base.pathname === "/" && !base.search && !base.hash, "Use apenas a origem do túnel temporário de QA.");
    const url = new URL("/api/billing/webhook", base).href;
    assert.equal((await fetch(new URL("/members", base), { redirect: "error", signal: AbortSignal.timeout(15000) })).status, 404);
    assert.equal((await fetch(url, { method: "POST", body: "{}", redirect: "error", signal: AbortSignal.timeout(15000) })).status, 401);
    const probe = await fetch(url, { method: "POST", headers: { "asaas-access-token": process.env.ASAAS_WEBHOOK_TOKEN!, "content-type": "application/json" }, body: "{}", redirect: "error", signal: AbortSignal.timeout(15000) });
    assert.equal(probe.status, 200);
    assert.equal((await probe.json()).reason, "outside_sandbox_fixture");
    const existing = await webhook();
    const saved = await api(`/webhooks/${encodeURIComponent(existing.id)}`, "PUT", { url, authToken: process.env.ASAAS_WEBHOOK_TOKEN, enabled: true, interrupted: false, sendType: "SEQUENTIALLY", events });
    assert.equal(saved.url, url); assert.equal(saved.interrupted, false);
    console.log(JSON.stringify({ webhook: saved.name, url: saved.url, active: saved.enabled, interrupted: saved.interrupted, events: saved.events.length }));
  } else if (mode === "pause") {
    const existing = await webhook();
    const saved = await api(`/webhooks/${encodeURIComponent(existing.id)}`, "PUT", { interrupted: true });
    assert.equal(saved.interrupted, true);
    console.log("Fila do Esdras Sandbox pausada. O túnel pode ser encerrado.");
  } else if (mode === "checkout") {
    const uid = "qa_asaas_operator";
    await accountTransaction(async tx => {
      const [org] = await tx.read(root);
      if (org) { assert.equal(org.qaPurpose, "asaas-sandbox"); return; }
      tx.set(root, { id: sandboxOrg, name: "Esdras QA Sandbox", status: "active", memberCount: 0, qaPurpose: "asaas-sandbox" });
      tx.set(`${root}/users/${uid}`, { organizationId: sandboxOrg, isActive: true, roles: ["church_admin"], email: "qa@example.test" });
      tx.set(`${root}/settings/subscription`, { plan: "free", billingStatus: "active" });
    });
    // CPF example from the official Asaas API reference, only in Sandbox.
    // No contact data is transmitted; billing notifications are disabled.
    const result = await startBilling({ organizationId: sandboxOrg, planId: "comunidade", cpfCnpj: "24971563792" }, uid, async (path, body) => {
      if (path === "/customers" && body) {
        const { email: _email, ...customer } = body;
        return asaas(path, { ...customer, notificationDisabled: true });
      }
      return asaas(path, body);
    });
    const order = await linkedOrder();
    const payment = await paymentFor(order);
    assert.equal((await api(`/customers/${encodeURIComponent(order.customerId)}`)).notificationDisabled, true);
    console.log(JSON.stringify({ checkoutCreated: result.ok, customerId: order.customerId, subscriptionId: order.resourceId, paymentId: payment.id, status: payment.status, notificationsDisabled: true }));
    await inspect();
  } else if (mode === "confirm") {
    const order = await linkedOrder();
    assert(!order.cancelled);
    const payment = await paymentFor(order);
    assert(["PENDING", "OVERDUE"].includes(payment.status), "Não repetir confirmação de pagamento.");
    const confirmed = await api(`/sandbox/payment/${encodeURIComponent(payment.id)}/confirm`, "POST", {});
    console.log(JSON.stringify({ paymentId: payment.id, confirmedStatus: confirmed.status }));
  } else if (mode === "cancel") {
    const order = await linkedOrder();
    const subscription = await api(`/subscriptions/${encodeURIComponent(order.resourceId)}`);
    assert.equal(subscription.externalReference, reference);
    assert.equal(subscription.customer, order.customerId);
    assert.equal(subscription.value, 79);
    const result = await api(`/subscriptions/${encodeURIComponent(order.resourceId)}`, "DELETE");
    assert.equal(result.deleted, true);
    console.log("Assinatura fictícia cancelada no Asaas Sandbox. Aguardando webhook.");
  } else if (mode === "inspect") await inspect();
  else throw new Error("Operação desconhecida.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Falha na homologação Sandbox."); process.exitCode = 1; });

import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { createSandboxReceiver, assertSandbox, sandboxOrg } from "./asaas-sandbox-server";
import { accountTransaction } from "../apps/web/app/api/_lib/member-account-store";

async function main() {
  assertSandbox();
  let checks = 0;
  const check = (actual: unknown, expected: unknown) => { assert.deepEqual(actual, expected); checks++; };
  for (const [key, value] of Object.entries({
    NODE_ENV: "production", FIREBASE_PROJECT_ID: "alvo-church",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "alvo-church", FIRESTORE_EMULATOR_HOST: "remote:8080",
    ASAAS_API_BASE_URL: "https://api.asaas.com/v3", GOOGLE_SERVICE_ACCOUNT_JSON: "forbidden",
  })) {
    const before = process.env[key];
    process.env[key] = value;
    assert.throws(assertSandbox); checks++;
    if (before === undefined) delete process.env[key]; else process.env[key] = before;
  }
  const root = `organizations/${sandboxOrg}`;
  const paths = [root, `${root}/settings/subscription`, `${root}/billingOrders/subscription`];
  let seeded = false;
  const eventIds: string[] = [];
  const originalFetch = globalThis.fetch;
  const server = createSandboxReceiver();
  let liveStatus = "RECEIVED";
  let providerCalls = 0;
  const reference = `order:${sandboxOrg}:subscription`;
  const payment = { id: "pay_qa_sandbox", customer: "cus_qa_sandbox", subscription: "sub_qa_sandbox", externalReference: reference, value: 79, dueDate: "2026-09-13" };
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname === "api-sandbox.asaas.com") {
      check(url.pathname, "/v3/payments/pay_qa_sandbox");
      providerCalls++;
      return Response.json({ ...payment, status: liveStatus });
    }
    // The verification can reach ONLY the local receiver and Firestore emulator.
    assert.equal(url.hostname, "127.0.0.1");
    return originalFetch(input, init);
  };
  try {
    await accountTransaction(async tx => {
      const prior = await tx.read(...paths);
      if (prior.some(Boolean)) throw new Error("A instituição Sandbox já contém dados. Preserve o teste existente antes de executar a verificação local.");
      tx.set(root, { id: sandboxOrg, status: "active", memberCount: 0, name: "Esdras QA Sandbox" });
      tx.set(paths[1], { plan: "free", billingStatus: "active" });
      tx.set(paths[2], { organizationId: sandboxOrg, plan: "comunidade", programId: "", amountCents: 7900, customerId: payment.customer, resourceId: payment.subscription });
    });
    seeded = true;
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    async function send(body: unknown, token = process.env.ASAAS_WEBHOOK_TOKEN, path = "/api/billing/webhook") {
      const res = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json", ...(token ? { "asaas-access-token": token } : {}) }, body: typeof body === "string" ? body : JSON.stringify(body) });
      return { status: res.status, body: await res.json() };
    }
    const event = (name: string, offset = 0) => {
      const id = `evt_${randomUUID()}&19713993`;
      eventIds.push(id);
      return { id, event: name, dateCreated: new Date(Date.now() + offset).toISOString(), payment };
    };
    check((await send({}, "")).status, 401);
    check((await send({}, "invalid")).status, 401);
    check((await fetch(base + "/api/billing/webhook")).status, 404);
    check((await send({}, undefined, "/members")).status, 404);
    check((await send("{" )).status, 400);
    check((await send("x".repeat(64001))).status, 413);
    check((await send({ event: "PAYMENT_RECEIVED", payment: { ...payment, externalReference: "order:real_org:subscription" } })).body.reason, "outside_sandbox_fixture");
    check(providerCalls, 0);
    const received = event("PAYMENT_RECEIVED");
    check((await send(received)).status, 200);
    check((await accountTransaction(tx => tx.read(paths[1])))[0]?.plan, "comunidade");
    check((await send(received)).body.replayed, true);
    check(providerCalls, 1);
    check((await send({ ...received, event: "PAYMENT_REFUNDED" })).status, 409);
    liveStatus = "REFUNDED";
    check((await send(event("PAYMENT_REFUNDED", 1000))).status, 200);
    check((await accountTransaction(tx => tx.read(paths[1])))[0]?.plan, "free");
    liveStatus = "RECEIVED";
    check((await send(event("PAYMENT_RECEIVED", -1000))).body.ignored, true);
    check((await accountTransaction(tx => tx.read(paths[1])))[0]?.plan, "free");
    const deleted = event("SUBSCRIPTION_DELETED", 2000);
    check((await send({ ...deleted, subscription: { id: payment.subscription, customer: payment.customer, externalReference: reference } })).status, 200);
    check((await accountTransaction(tx => tx.read(paths[2])))[0]?.cancelled, true);
    check((await send(event("PAYMENT_RECEIVED", 3000))).body.ignored, true);
    check((await accountTransaction(tx => tx.read(paths[1])))[0]?.plan, "free");
    check((await accountTransaction(tx => tx.read(root)))[0]?.memberCount, 0);
    console.log(`Sandbox local: ${checks} verificações passaram. Gateway simulado; conciliação e Firestore demo reais. Asaas externo ainda NÃO homologado.`);
  } finally {
    server.close();
    if (seeded) await accountTransaction(async tx => {
      for (const path of [...paths, ...eventIds.map(id => `${root}/billingEvents/${id}`)]) tx.remove(path);
    });
    globalThis.fetch = originalFetch;
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

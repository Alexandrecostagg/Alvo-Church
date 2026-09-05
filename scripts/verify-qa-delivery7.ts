import { aiGate, completeAi } from "../apps/web/app/api/_lib/ai-quota";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  startBilling,
  billingEvent,
  type Gateway,
} from "../apps/web/app/api/_lib/billing-operations";
import {
  deletePhoto,
  putPhoto,
  photoObjectPrefix,
} from "../apps/web/app/api/_lib/kids-media";
import { purgeRetention } from "../apps/web/app/api/_lib/kids-retention";
if (
  process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
)
  throw new Error("Somente QA local.");
initializeApp({ projectId: "demo-alvo-qa" });
const db = getFirestore(),
  orgId = `qa_d7_${randomUUID()}`,
  org = db.doc(`organizations/${orgId}`),
  slug = `qa-d7-${randomUUID()}`;
const admin = "qa_admin_principal",
  member = "qa_admin_secundaria",
  objects = new Set<string>(),
  programId = `qa_d7_${randomUUID()}`;
let checks = 0;
const equal = (a: unknown, b: unknown, label: string) => {
  assert.deepEqual(a, b, label);
  checks++;
};
async function denied(
  work: () => Promise<unknown>,
  status: number,
  label: string,
) {
  await assert.rejects(work, (e: any) => e.status === status, label);
  checks++;
}
async function login(who: string) {
  const r = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-alvo-qa-key",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `admin.${who}@example.test`,
        password: "Local-QA-2026!",
        returnSecureToken: true,
      }),
    },
  );
  assert.equal(r.status, 200);
  return (await r.json()).idToken as string;
}
async function api(path: string, body: object, token?: string) {
  const r = await fetch(`http://127.0.0.1:3001/api/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ organizationId: orgId, ...body }),
  });
  return {
    status: r.status,
    data: await r.json(),
    cache: r.headers.get("cache-control"),
  };
}
async function direct(
  path: string,
  token?: string,
  method = "GET",
  fields?: object,
) {
  return (
    await fetch(
      `http://127.0.0.1:8080/v1/projects/demo-alvo-qa/databases/(default)/documents/${org.path}/${path}`,
      {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "content-type": "application/json",
        },
        ...(fields ? { body: JSON.stringify({ fields }) } : {}),
      },
    )
  ).status;
}
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=";
const data = (id: string, body: object = {}) => ({
  action: "declare",
  requestId: id,
  amount: 19.9,
  type: "oferta",
  ...body,
});
async function run() {
  const a = await login("principal"),
    m = await login("secundaria");
  await org.set({
    status: "active",
    organizationId: orgId,
    name: "Igreja fictícia QA",
    memberCount: 0,
  });
  await org
    .collection("users")
    .doc(admin)
    .set({
      organizationId: orgId,
      isActive: true,
      roles: ["church_admin"],
      email: "admin.principal@example.test",
    });
  await org
    .collection("users")
    .doc(member)
    .set({
      organizationId: orgId,
      isActive: true,
      roles: ["member"],
      displayName: "Membro fictício QA",
    });
  await org
    .collection("settings")
    .doc("branding")
    .set({ pixKey: "qa@example.test", pixReceiverName: "Igreja ficticia QA" });
  await org
    .collection("settings")
    .doc("subscription")
    .set({ plan: "free", billingStatus: "active" });
  await db.doc(`org_slugs/${slug}`).set({ organizationId: orgId });
  await org.collection("givingCampaigns").doc("campaign").set({
    organizationId: orgId,
    title: "Campanha fictícia QA",
    status: "active",
    raisedAmount: 0,
    goalAmount: 100,
  });
  equal((await api("finance", data("unauth"))).status, 401, "Auth obrigatória");
  equal(
    (await api("finance", data("foreign", { organizationId: "unknown" }), m))
      .status,
    403,
    "Outra igreja negada",
  );
  equal(
    (await api("finance", data("person-forge", { personId: "another" }), m))
      .status,
    403,
    "Membro não vincula pessoa alheia",
  );
  for (const amount of [0, -1, 0.001, 1000001, "79"])
    equal(
      (await api("finance", data(randomUUID(), { amount }), m)).status,
      400,
      "Valor inválido",
    );
  const body = data(randomUUID(), { dataUrl: png });
  const created = await api("finance", body, m);
  equal(created.status, 200, JSON.stringify(created));
  equal(created.cache, "private, no-store", "Sem cache");
  const id = created.data.contributionId,
    contribution = org.collection("contributions").doc(id);
  equal(
    (await contribution.get()).data()?.amount,
    19.9,
    "Centavos persistem como double",
  );
  equal(
    (await contribution.get()).data()?.status,
    "pending",
    "Sem confirmação automática",
  );
  const receipt = (
    await org.collection("contributionReceipts").doc(id).get()
  ).data()!;
  objects.add(receipt.path);
  equal(receipt.imageBase64, undefined, "Nenhuma imagem inline nova");
  for (const token of [undefined, a, m])
    equal(
      (
        await fetch(
          `http://127.0.0.1:9199/v0/b/demo-alvo-qa.firebasestorage.app/o/${encodeURIComponent(receipt.path)}?alt=media`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        )
      ).status,
      403,
      "Storage privado",
    );
  const meta = await fetch(
    `http://127.0.0.1:9199/storage/v1/b/demo-alvo-qa.firebasestorage.app/o/${encodeURIComponent(receipt.path)}`,
    { headers: { Authorization: "Bearer owner" } },
  ).then((r) => r.json());
  equal(
    meta.metadata?.firebaseStorageDownloadTokens,
    undefined,
    "Sem URL permanente",
  );
  equal(
    (await api("finance", { action: "receipt", receiptId: id }, m)).status,
    403,
    "Só equipe financeira vê comprovante",
  );
  equal(
    (await api("finance", { action: "receipt", receiptId: id }, a)).data
      .dataUrl,
    png,
    "Equipe lê comprovante privado",
  );
  equal(
    (await api("finance", body, m)).data.replayed,
    true,
    "Reenvio idempotente",
  );
  equal(
    (await api("finance", { ...body, amount: 20 }, m)).status,
    409,
    "Não altera valor pelo reenvio",
  );
  equal(
    (
      await api(
        "finance",
        { action: "confirm", contributionId: id, reference: "PIX-QA-1" },
        m,
      )
    ).status,
    403,
    "Membro não confirma",
  );
  const confirmations = await Promise.all(
    [1, 2].map(() =>
      api(
        "finance",
        { action: "confirm", contributionId: id, reference: "PIX-QA-1" },
        a,
      ),
    ),
  );
  equal(
    confirmations.map((r) => r.status),
    [200, 200],
    "Confirmação concorrente idempotente",
  );
  equal(
    (await org.collection("financialTransactions").get()).size,
    1,
    "Um único crédito",
  );
  equal(
    (
      await org
        .collection("financialTransactions")
        .doc(`contribution_${id}`)
        .get()
    ).data()?.amountCents,
    1990,
    "Ledger em centavos",
  );
  equal(
    (await org.collection("financeAudit").doc(`reconcile_${id}`).get()).data()
      ?.actorId,
    admin,
    "Auditoria do conferente",
  );
  const second = (await api("finance", data(randomUUID()), m)).data
    .contributionId;
  equal(
    (
      await api(
        "finance",
        { action: "confirm", contributionId: second, reference: "pix-qa-1" },
        a,
      )
    ).status,
    409,
    "Referência bancária única",
  );
  equal(
    (
      await api(
        "finance",
        {
          action: "reject",
          contributionId: second,
          reference: "Crédito não localizado",
        },
        a,
      )
    ).status,
    200,
    "Rejeita declaração",
  );
  equal(
    (
      await api(
        "finance",
        { action: "confirm", contributionId: second, reference: "PIX-QA-2" },
        a,
      )
    ).status,
    409,
    "Decisão não sobrescrita",
  );
  equal(
    (await org.collection("financialTransactions").get()).size,
    1,
    "Rejeição não cria receita",
  );
  const manual = {
    action: "manual",
    requestId: randomUUID(),
    kind: "expense",
    label: "Despesa fictícia QA",
    amount: 12.35,
  };
  equal((await api("finance", manual, m)).status, 403, "Manual exige admin");
  equal((await api("finance", manual, a)).status, 200, "Lançamento manual");
  equal(
    (await api("finance", manual, a)).data.replayed,
    true,
    "Manual idempotente",
  );
  equal(
    (await api("finance", { ...manual, amount: 13 }, a)).status,
    409,
    "Manual imutável",
  );
  equal(
    (
      await api(
        "finance",
        {
          action: "void",
          transactionId: manual.requestId,
          reason: "Erro de digitação QA",
        },
        a,
      )
    ).status,
    200,
    "Anulação auditada",
  );
  equal(
    (
      await org.collection("financialTransactions").doc(manual.requestId).get()
    ).data()?.status,
    "voided",
    "Histórico mantido",
  );
  equal(
    (
      await api(
        "finance",
        { action: "void", transactionId: `contribution_${id}`, reason: "não" },
        a,
      )
    ).status,
    409,
    "Não anula conciliação por atalho",
  );
  for (const collection of [
    "contributions",
    "contributionReceipts",
    "givingIntents",
    "givingReceipts",
    "financialTransactions",
    "financeAudit",
    "financeReferences",
    "givingLimits",
    "billingOrders",
    "billingEvents",
  ])
    equal(
      await direct(`${collection}/forged`, a, "PATCH", {
        organizationId: { stringValue: orgId },
      }),
      403,
      `Escrita direta negada ${collection}`,
    );
  equal(
    await direct(`contributions/${id}`, m),
    200,
    "Membro lê sua declaração",
  );
  equal(
    await direct(`contributionReceipts/${id}`, a),
    403,
    "Nem admin lê objeto pelo SDK",
  );
  const publicBody = {
    action: "intent",
    orgSlug: slug,
    token: randomUUID(),
    name: "Doador fictício QA",
    whatsapp: "91999999999",
    amount: 39.95,
    consentContact: false,
    campaignId: "campaign",
  };
  const publicConfig = await api("public/giving", {
    action: "config",
    orgSlug: slug,
    campaignId: "campaign",
  });
  equal(publicConfig.status, 200, "Configuração pública pelo servidor");
  equal(
    Object.keys(publicConfig.data).sort(),
    ["campaign", "churchWhatsapp", "organizationId", "pixKey", "receiverName"],
    "Projeção pública restrita",
  );
  equal(
    (
      await api("public/giving", {
        action: "config",
        orgSlug: "missing-qa-church",
      })
    ).status,
    404,
    "Slug ausente sem fallback para ID",
  );
  const intent = await api("public/giving", publicBody);
  equal(intent.status, 200, JSON.stringify(intent));
  equal(
    (await api("public/giving", publicBody)).data.intentId,
    intent.data.intentId,
    "Intenção idempotente",
  );
  equal(
    (await api("public/giving", { ...publicBody, amount: 40 })).status,
    409,
    "Intenção não alterada",
  );
  const intentRef = org.collection("givingIntents").doc(intent.data.intentId);
  equal(
    (await intentRef.get()).data()?.consentContact,
    false,
    "Opt-out preservado",
  );
  equal(
    await direct(`givingIntents/${intent.data.intentId}`, m),
    403,
    "Contato do doador privado",
  );
  equal(
    (
      await api("public/giving", {
        action: "declare",
        intentId: intent.data.intentId,
        token: randomUUID(),
      })
    ).status,
    403,
    "Token de outra intenção negado",
  );
  const declared = await api("public/giving", {
    action: "declare",
    intentId: intent.data.intentId,
    token: publicBody.token,
    dataUrl: png,
  });
  equal(declared.status, 200, "Declaração pública");
  const publicId = declared.data.contributionId;
  objects.add(
    (await org.collection("contributionReceipts").doc(publicId).get()).data()!
      .path,
  );
  equal(
    (await intentRef.get()).data()?.status,
    "declared",
    "Declarar não significa pagar",
  );
  equal(
    (await org.collection("givingCampaigns").doc("campaign").get()).data()
      ?.raisedAmount,
    0,
    "Intenção não aumenta meta",
  );
  equal(
    (
      await api(
        "finance",
        {
          action: "confirm",
          contributionId: publicId,
          reference: "PIX-PUBLIC-QA",
        },
        a,
      )
    ).status,
    200,
    "Concilia doação pública",
  );
  equal(
    (await org.collection("givingCampaigns").doc("campaign").get()).data()
      ?.raisedAmount,
    39.95,
    "Meta só após conciliação",
  );
  equal(
    (await intentRef.get()).data()?.status,
    "confirmed",
    "Intenção vinculada à conciliação",
  );
  await intentRef.update({ expiresAt: Date.now() - 1 });
  equal(
    (
      await api("public/giving", {
        action: "declare",
        intentId: intent.data.intentId,
        token: publicBody.token,
        dataUrl: png,
      })
    ).status,
    403,
    "Capability expira",
  );
  await org
    .collection("givingLimits")
    .doc("day")
    .set({ window: Math.floor(Date.now() / 86400000), count: 200 });
  equal(
    (await api("public/giving", { ...publicBody, token: randomUUID() })).status,
    429,
    "Cota pública persistente",
  );
  equal(
    (await api("giving/pix", { amount: 10, organizationId: "other" }, m))
      .status,
    403,
    "PIX confere tenant real",
  );
  equal(
    (await api("giving/pix", { amount: 10 }, m)).status,
    200,
    "PIX autorizado",
  );
  equal((await org.get()).data()?.memberCount, 0, "Doações não contam membros");
  const report = await api(
    "finance",
    { action: "report", month: new Date().toISOString().slice(0, 7) },
    a,
  );
  equal(report.status, 200, JSON.stringify(report));
  equal(
    report.data.incomeCents,
    5985,
    "CSV sem contar contribuição duas vezes",
  );
  equal(report.data.expenseCents, 0, "CSV exclui lançamento anulado");
  equal(report.data.entries.length, 2, "Somente dois créditos conferidos");
  equal(report.data.csv.startsWith("\uFEFF"), true, "CSV UTF-8 com BOM");
  equal(
    (await api("finance", { action: "report", month: "2026-13" }, a)).status,
    400,
    "Mês inválido",
  );
  equal(
    (await api("finance", { action: "report", month: "2026-09" }, m)).status,
    403,
    "Relatório restrito",
  );
  await org
    .collection("contributions")
    .doc("legacy")
    .set({
      organizationId: orgId,
      userId: member,
      type: "oferta",
      amount: 2.05,
      date: new Date().toISOString().slice(0, 10),
      contributorName: "=1+1",
    });
  const legacyReport = await api(
    "finance",
    { action: "report", month: new Date().toISOString().slice(0, 7) },
    a,
  );
  equal(
    legacyReport.data.incomeCents,
    6190,
    "Contribuição manual legada incluída uma vez",
  );
  equal(
    legacyReport.data.csv.includes("'=1+1"),
    true,
    "CSV neutraliza fórmula",
  );
  for (let offset = 0; offset < 1001; offset += 400) {
    const batch = db.batch();
    for (let i = offset; i < Math.min(offset + 400, 1001); i++)
      batch.set(org.collection("financialTransactions").doc(`overflow_${i}`), {
        organizationId: orgId,
        date: "2030-01-05",
        kind: "income",
        amount: 1,
        status: "posted",
      });
    await batch.commit();
  }
  equal(
    (await api("finance", { action: "report", month: "2030-01" }, a)).status,
    422,
    "Relatório recusa 1.001 registros sem truncar",
  );
  equal(
    (await api("billing/webhook", {})).status,
    401,
    "Webhook exige token próprio",
  );
  // Provider adapter has no network. Real HTTP/Firestore exercise above remains separate.
  const resources = new Map<string, any>();
  let posts = 0,
    loseSubscription = true;
  const gateway: Gateway = async (path, body) => {
    if (body) {
      posts++;
      const id =
        path === "/customers"
          ? `cus_${posts}`
          : path === "/subscriptions"
            ? `sub_${posts}`
            : `pay_${posts}`;
      const row = {
        ...body,
        id,
        status: "PENDING",
        invoiceUrl: "https://sandbox.asaas.com/i/qa",
        dueDate: "2026-09-10",
      };
      resources.set(`${path}/${id}`, row);
      if (path === "/subscriptions") {
        resources.set(`/payments/pay_invoice_${id}`, {
          id: `pay_invoice_${id}`,
          customer: body.customer,
          subscription: id,
          externalReference: body.externalReference,
          value: body.value,
          status: "PENDING",
          dueDate: "2026-09-10",
          invoiceUrl: "https://sandbox.asaas.com/i/qa",
        });
        if (loseSubscription) {
          loseSubscription = false;
          throw new Error("Lost response after create");
        }
      }
      return row;
    }
    if (path.includes("?externalReference=")) {
      const [endpoint, q] = path.split("?");
      const ref = new URLSearchParams(q).get("externalReference");
      return {
        data: [...resources.entries()]
          .filter(
            ([k, v]) =>
              k.startsWith(endpoint + "/") && v.externalReference === ref,
          )
          .map(([, v]) => v),
      };
    }
    if (path.includes("/payments?")) {
      const subscription = path.split("/")[2];
      return {
        data: [...resources.values()].filter(
          (v) => v.subscription === subscription,
        ),
      };
    }
    if (!resources.has(path)) throw new Error(`Unexpected gateway ${path}`);
    return resources.get(path);
  };
  const checkout = {
    organizationId: orgId,
    planId: "comunidade",
    cpfCnpj: "12345678909",
    orgName: "forged",
    email: "forged@example.test",
  };
  await denied(
    () => startBilling(checkout, member, gateway),
    403,
    "Checkout admin only",
  );
  await assert.rejects(
    () => startBilling(checkout, admin, gateway),
    /Lost response/,
  );
  checks++;
  equal(posts, 2, "Uma criação de cliente e assinatura antes da perda");
  const resumed = await startBilling(checkout, admin, gateway);
  equal(resumed.ok, true, "Checkout retomado");
  equal(posts, 2, "Retentativa não repete POST");
  equal(
    (await startBilling(checkout, admin, gateway)).checkoutUrl,
    resumed.checkoutUrl,
    "Novo clique usa cobrança existente",
  );
  equal(posts, 2, "Sem duplicação de assinatura");
  const orderRef = org.collection("billingOrders").doc("subscription"),
    order = (await orderRef.get()).data()!;
  equal(
    order.email,
    "admin.principal@example.test",
    "E-mail vem da conta autorizada",
  );
  equal(order.customerName, "Igreja fictícia QA", "Nome vem da igreja");
  equal(
    (await org.collection("settings").doc("subscription").get()).data()?.plan,
    "free",
    "Checkout não concede plano",
  );
  await denied(
    () => startBilling({ ...checkout, planId: "pastoral" }, admin, gateway),
    409,
    "Não cria outra assinatura para mudar plano",
  );
  const paymentId = `pay_invoice_${order.resourceId}`,
    payment = resources.get(`/payments/${paymentId}`);
  payment.status = "RECEIVED";
  const event = {
    id: "evt_first",
    event: "PAYMENT_RECEIVED",
    dateCreated: "2026-09-05 12:00:00",
    payment: { ...payment },
  };
  equal(
    (await billingEvent(event, gateway)).ok,
    true,
    "Webhook confere cobrança",
  );
  equal(
    (await org.collection("settings").doc("subscription").get()).data()?.plan,
    "comunidade",
    "Plano do pedido, não mapa arbitrário de preço",
  );
  equal(
    (await billingEvent(event, gateway)).replayed,
    true,
    "Evento idempotente",
  );
  await denied(
    () => billingEvent({ ...event, event: "PAYMENT_OVERDUE" }, gateway),
    409,
    "ID de evento não reutilizado",
  );
  equal(
    (
      await billingEvent(
        { ...event, id: "evt_old", dateCreated: "2026-09-01 12:00:00" },
        gateway,
      )
    ).ignored,
    true,
    "Evento antigo ignorado",
  );
  const wrong = { ...payment, customer: "cus_wrong" };
  resources.set(`/payments/${paymentId}`, wrong);
  await denied(
    () => billingEvent({ ...event, id: "evt_wrong" }, gateway),
    409,
    "Cliente divergente negado",
  );
  resources.set(`/payments/${paymentId}`, { ...payment, value: 159 });
  await denied(
    () => billingEvent({ ...event, id: "evt_value" }, gateway),
    409,
    "Valor divergente não promove plano",
  );
  resources.set(`/payments/${paymentId}`, payment);
  payment.status = "OVERDUE";
  await billingEvent(
    { ...event, id: "evt_overdue", dateCreated: "2026-09-11 12:00:00" },
    gateway,
  );
  const overdueSince = (
    await org.collection("settings").doc("subscription").get()
  ).data()?.overdueSince;
  await billingEvent(
    { ...event, id: "evt_overdue_again", dateCreated: "2026-09-12 12:00:00" },
    gateway,
  );
  equal(
    (await org.collection("settings").doc("subscription").get()).data()
      ?.overdueSince,
    overdueSince,
    "Reenvio não reinicia carência",
  );
  await billingEvent(
    {
      id: "evt_deleted",
      event: "SUBSCRIPTION_DELETED",
      dateCreated: "2026-09-13 12:00:00",
      subscription: {
        id: order.resourceId,
        customer: order.customerId,
        externalReference: order.externalReference,
      },
    },
    gateway,
  );
  equal(
    (await org.collection("settings").doc("subscription").get()).data()?.plan,
    "free",
    "Evento subscription usa seu próprio recurso",
  );
  payment.status = "RECEIVED";
  equal(
    (
      await billingEvent(
        {
          ...event,
          id: "evt_late_payment",
          dateCreated: "2026-09-14 12:00:00",
        },
        gateway,
      )
    ).ignored,
    true,
    "Pagamento atrasado não reativa assinatura cancelada",
  );
  await denied(
    () =>
      billingEvent(
        { ...event, id: "evt_legacy", payment: { externalReference: orgId } },
        gateway,
      ),
    409,
    "Legado conhecido não é descartado sem migração",
  );
  await db
    .doc(`platformPrograms/${programId}`)
    .set({ isPublished: true, priceBRL: 45.9, title: "Curso QA" });
  const course = await startBilling(
    { organizationId: orgId, programId, cpfCnpj: "12345678909" },
    admin,
    gateway,
  );
  equal(Boolean(course.asaasPaymentId), true, "Checkout de curso");
  const coursePay = resources.get(`/payments/${course.asaasPaymentId}`);
  coursePay.status = "RECEIVED";
  await billingEvent(
    {
      id: "evt_course",
      event: "PAYMENT_RECEIVED",
      dateCreated: "2026-09-05 12:00:00",
      payment: coursePay,
    },
    gateway,
  );
  equal(
    (await org.collection("programEntitlements").doc(programId).get()).data()
      ?.status,
    "active",
    "Curso liberado por pedido vinculado",
  );
  coursePay.status = "REFUNDED";
  await billingEvent(
    {
      id: "evt_course_refund",
      event: "PAYMENT_REFUNDED",
      dateCreated: "2026-09-06 12:00:00",
      payment: coursePay,
    },
    gateway,
  );
  equal(
    (await org.collection("programEntitlements").doc(programId).get()).data()
      ?.status,
    "revoked",
    "Estorno revoga curso",
  );
  // All AI quota checks use emulator transactions; no AI provider is called.
  await org
    .collection("settings")
    .doc("subscription")
    .set({ plan: "free", billingStatus: "active" });
  equal(
    (await api("ai", { task: "cell_script", input: {} }, m)).status,
    429,
    "IA gratuita não ultrapassa cota zero",
  );
  equal(
    (await api("media/banner-copy", { tipo: "Culto", tema: "QA" }, a)).status,
    429,
    "Banner respeita a mesma cota zero",
  );
  equal(
    (
      await fetch(
        `http://127.0.0.1:3001/api/media/bg-proxy?organizationId=${orgId}&prompt=qa`,
        { headers: { Authorization: `Bearer ${a}` } },
      )
    ).status,
    429,
    "Imagem respeita cota antes do provedor",
  );
  equal(
    (await api("ai", { task: "unknown", input: {} }, m)).status,
    400,
    "Tarefa inválida não consome cota",
  );
  await denied(
    () => aiGate(orgId, member, "banner_image"),
    403,
    "Geração de arte exige liderança",
  );
  await denied(
    () => aiGate("other_org", admin, "cell_script"),
    403,
    "Cota não usa outro tenant",
  );
  await org
    .collection("settings")
    .doc("subscription")
    .set({ plan: "comunidade", billingStatus: "active" });
  const aiMonth = new Date().toISOString().slice(0, 7),
    usage = org.collection("aiUsage").doc(aiMonth);
  await usage.set({ count: 49 });
  const raced = await Promise.allSettled(
    ["cell_script", "banner_copy", "banner_image"].map((task) =>
      aiGate(orgId, admin, task),
    ),
  );
  equal(
    raced.filter((r) => r.status === "fulfilled").length,
    1,
    "Três origens disputam uma única unidade de IA",
  );
  equal(
    (await usage.get()).data()?.count,
    50,
    "Cota mensal exata sob concorrência",
  );
  await usage.set({ count: 0 });
  await db.recursiveDelete(org.collection("aiRateLimits"));
  const ticket = await aiGate(orgId, admin, "banner_copy");
  await completeAi(orgId, ticket.auditId, "failed");
  equal(
    (await usage.get()).data()?.count,
    1,
    "Tentativa externa falha mantém consumo",
  );
  const audit = (
    await org.collection("aiAudit").doc(ticket.auditId).get()
  ).data()!;
  equal(audit.status, "failed", "Resultado registrado na auditoria");
  equal(
    Object.keys(audit).sort(),
    ["actorId", "createdAt", "finishedAt", "month", "status", "task"],
    "Auditoria não guarda prompt nem resposta",
  );
  await aiGate(orgId, admin, "cell_script");
  await aiGate(orgId, admin, "banner_image");
  await denied(
    () => aiGate(orgId, admin, "cell_dynamic"),
    429,
    "Limite curto compartilhado de três tentativas",
  );
  await denied(
    () => aiGate(orgId, admin, "pastoral_suggestion"),
    403,
    "Plano Comunidade não libera análise pastoral completa",
  );
  await org
    .collection("settings")
    .doc("subscription")
    .set({ plan: "pastoral", billingStatus: "active" });
  await denied(
    () => aiGate(orgId, member, "pastoral_suggestion"),
    403,
    "Membro não usa análise pastoral",
  );
  await org.collection("settings").doc("subscription").set({
    plan: "pastoral",
    billingStatus: "overdue",
    overdueSince: "2020-01-01T00:00:00Z",
  });
  await denied(
    () => aiGate(orgId, admin, "cell_script"),
    403,
    "Carência vencida bloqueia IA",
  );
  await org
    .collection("settings")
    .doc("subscription")
    .set({ plan: "unknown", billingStatus: "active" });
  await denied(
    () => aiGate(orgId, admin, "cell_script"),
    429,
    "Plano desconhecido não ganha cota",
  );
  equal(
    await direct(`aiUsage/${aiMonth}`, a, "PATCH", {
      count: { integerValue: "0" },
    }),
    403,
    "Cliente não reseta consumo",
  );
  equal(
    await direct(`aiAudit/${ticket.auditId}`, m),
    403,
    "Auditoria de uso privada da liderança",
  );
  equal(
    await direct("aiRateLimits/org", a, "PATCH", {
      count: { integerValue: "0" },
    }),
    403,
    "Cliente não reseta frequência",
  );
  // Kids retention deletes only reviewed expired withdrawn media.
  const kidsPath = `${photoObjectPrefix(orgId, "old-child")}${randomUUID()}`;
  objects.add(kidsPath);
  await putPhoto(
    kidsPath,
    Buffer.from(png.split(",")[1], "base64"),
    "image/png",
  );
  const oldChild = {
    organizationId: orgId,
    childName: "Criança fictícia QA",
    status: "checked_out",
    checkedOutAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    photoPath: kidsPath,
    photoRetentionPending: true,
  };
  await org.collection("kidsCheckIns").doc("old-child").set(oldChild);
  await org
    .collection("kidsCheckIns")
    .doc("recent-child")
    .set({
      ...oldChild,
      checkedOutAt: new Date().toISOString(),
      photoPath: null,
    });
  await org
    .collection("kidsCheckIns")
    .doc("active-child")
    .set({ ...oldChild, status: "checked_in", photoPath: null });
  equal(
    (await api("kids/retention", { action: "preview", days: 30 }, m)).status,
    403,
    "Retenção exige admin",
  );
  const preview = await api(
    "kids/retention",
    { action: "preview", days: 30 },
    a,
  );
  equal(preview.status, 200, JSON.stringify(preview));
  equal(preview.data.candidates.length, 1, "Só retirada antiga elegível");
  const purge = {
    organizationId: orgId,
    action: "purge",
    days: 30,
    checkInId: "old-child",
    fingerprint: preview.data.candidates[0].fingerprint,
    confirm: true,
  };
  equal(
    (await api("kids/retention", { ...purge, confirm: false }, a)).status,
    400,
    "Prévia exige confirmação",
  );
  equal(
    (await api("kids/retention", { ...purge, fingerprint: "changed" }, a))
      .status,
    409,
    "Snapshot antigo negado",
  );
  await assert.rejects(
    () =>
      purgeRetention(purge, admin, async () => {
        throw new Error("Storage offline");
      }),
    /Storage offline/,
  );
  checks++;
  equal(
    (await org.collection("kidsCheckIns").doc("old-child").get()).data()
      ?.photoPath,
    kidsPath,
    "Falha mantém referência para retry",
  );
  equal(
    (await api("kids/retention", purge, a)).status,
    200,
    "Remoção física concluída",
  );
  equal(
    (
      await fetch(
        `http://127.0.0.1:9199/storage/v1/b/demo-alvo-qa.firebasestorage.app/o/${encodeURIComponent(kidsPath)}`,
        { headers: { Authorization: "Bearer owner" } },
      )
    ).status,
    404,
    "Objeto removido",
  );
  equal(
    (await api("kids/retention", purge, a)).data.replayed,
    true,
    "Retenção idempotente",
  );
  equal(
    (await org.collection("kidsCheckIns").doc("old-child").get()).data()
      ?.status,
    "checked_out",
    "Histórico Kids preservado",
  );
  equal(
    (
      await org.collection("kidsCustodyAudit").doc("purge_old-child").get()
    ).data()?.actorId,
    admin,
    "Retenção auditada",
  );
  console.log(
    `Entrega 7 QA OK: ${checks} verificações; finanças/Storage/concorrência, billing com provedor simulado e retenção Kids.`,
  );
}
async function main() {
  try {
    await run();
  } finally {
    for (const path of objects) await deletePhoto(path).catch(() => {});
    await db.recursiveDelete(org);
    await db.doc(`org_slugs/${slug}`).delete();
    await db.doc(`platformPrograms/${programId}`).delete();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

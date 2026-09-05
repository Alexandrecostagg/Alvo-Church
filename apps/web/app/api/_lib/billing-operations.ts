import { createHash } from "node:crypto";
import { AccountError, accountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { financeActor, money, textField } from "./finance-operations";

export type Gateway = (
  path: string,
  body?: Record<string, unknown>,
) => Promise<any>;
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export const asaas: Gateway = async (path, body) => {
  const key = process.env.ASAAS_API_KEY;
  if (!key)
    throw new AccountError(503, "Gateway de pagamento ainda não configurado.");
  const base =
    process.env.ASAAS_API_BASE_URL || "https://sandbox.asaas.com/api/v3";
  if (
    ![
      "https://sandbox.asaas.com/api/v3",
      "https://api.asaas.com/v3",
      "https://api-sandbox.asaas.com/v3",
    ].includes(base)
  )
    throw new AccountError(503, "Endereço do gateway inválido.");
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "content-type": "application/json",
      "User-Agent": "PlataformaEsdras/1.0",
      access_token: key,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new AccountError(
      502,
      "O gateway não concluiu a consulta. O pedido foi preservado para conferência.",
    );
  return response.json();
};
export function checkoutUrl(value: unknown) {
  if (typeof value !== "string")
    throw new AccountError(
      502,
      "Link de pagamento ainda indisponível. Tente consultar novamente.",
    );
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !["asaas.com", "www.asaas.com", "sandbox.asaas.com"].includes(url.hostname)
  )
    throw new AccountError(502, "Link de pagamento inválido.");
  return url.href;
}
export async function startBilling(
  raw: any,
  uid: string,
  gateway: Gateway = asaas,
) {
  if (gateway === asaas && !process.env.ASAAS_API_KEY)
    throw new AccountError(503, "Gateway de pagamento ainda não configurado.");
  const orgId = documentId(raw.organizationId, "Igreja"),
    programId = raw.programId ? documentId(raw.programId, "Trilha") : "";
  const plan = programId ? "" : raw.planId;
  if (!programId && !["comunidade", "pastoral"].includes(plan))
    throw new AccountError(400, "Plano indisponível para contratação.");
  const orderId = programId ? `course_${programId}` : "subscription",
    root = `organizations/${orgId}`,
    orderPath = `${root}/billingOrders/${orderId}`;
  const externalReference = `order:${orgId}:${orderId}`;
  const order = await accountTransaction(async (tx) => {
    const { org, actor } = await financeActor(tx, orgId, uid);
    const [old, subscription, program, entitlement] = await tx.read(
      orderPath,
      `${root}/settings/subscription`,
      ...(programId
        ? [
            `platformPrograms/${programId}`,
            `${root}/programEntitlements/${programId}`,
          ]
        : []),
    );
    if (old) {
      if (old.plan !== plan || old.programId !== programId)
        throw new AccountError(
          409,
          "Existe uma contratação em andamento. A mudança de plano exige revisão da assinatura atual.",
        );
      if (old.cancelled)
        throw new AccountError(
          409,
          "Contratação encerrada. Procure o suporte para uma nova assinatura.",
        );
      return old;
    }
    if (!programId && subscription?.asaasSubscriptionId)
      throw new AccountError(
        409,
        "Esta igreja já possui assinatura. Consulte as faturas ou procure o suporte.",
      );
    if (programId && entitlement?.status === "active")
      throw new AccountError(409, "A igreja já tem acesso a esta trilha.");
    if (programId && !program?.isPublished)
      throw new AccountError(404, "Trilha indisponível.");
    const amountCents = money(
      programId ? program?.priceBRL : plan === "pastoral" ? 159 : 79,
    );
    const email = textField(actor.email, "E-mail", 180),
      cpfCnpj = textField(raw.cpfCnpj, "CPF/CNPJ", 18).replace(/\D/g, "");
    if (
      !/^\d{11}$|^\d{14}$/.test(cpfCnpj) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
      throw new AccountError(
        400,
        "Confira o CPF/CNPJ e o e-mail da sua conta.",
      );
    const data = {
      organizationId: orgId,
      orderId,
      plan,
      programId,
      amountCents,
      externalReference,
      phase: "planned",
      customerName: String(org.name || org.legalName || "Igreja").slice(0, 120),
      email,
      cpfCnpj,
      createdBy: uid,
      createdAt: new Date().toISOString(),
    };
    tx.set(orderPath, data);
    return data;
  });
  // Persist the intent to POST before contacting the provider. On uncertainty,
  // later attempts only search by reference; they never repeat the POST.
  async function step(
    field: "customerId" | "resourceId",
    endpoint: string,
    body: Record<string, unknown>,
  ) {
    const reservation = await accountTransaction(async (tx) => {
      await financeActor(tx, orgId, uid);
      const [state] = await tx.read(orderPath);
      if (state?.[field]) return { id: state[field], fresh: false };
      const flag = `${field}Requested`;
      if (state?.[flag]) return { id: null, fresh: false };
      tx.patch(orderPath, { [flag]: true, phase: `${field}_requested` });
      return { id: null, fresh: true };
    });
    if (reservation.id) return reservation.id as string;
    let resource: any;
    if (reservation.fresh) resource = await gateway(endpoint, body);
    else {
      const found = await gateway(
        `${endpoint}?externalReference=${encodeURIComponent(externalReference)}&limit=2`,
      );
      if (
        !Array.isArray(found.data) ||
        found.data.length !== 1 ||
        found.data[0].externalReference !== externalReference
      )
        throw new AccountError(
          409,
          "O gateway ainda não confirmou o pedido anterior. Aguarde ou procure o suporte; nenhuma nova cobrança foi criada.",
        );
      resource = found.data[0];
    }
    const id = documentId(resource.id, "Identificador do gateway");
    if (
      resource.externalReference &&
      resource.externalReference !== externalReference
    )
      throw new AccountError(502, "Referência do gateway divergente.");
    if (
      field === "resourceId" &&
      (money(resource.value) !== order.amountCents ||
        resource.customer !== body.customer)
    )
      throw new AccountError(502, "Valor ou cliente do gateway divergente.");
    await accountTransaction(async (tx) => {
      await financeActor(tx, orgId, uid);
      const [state] = await tx.read(orderPath);
      if (state?.[field] && state[field] !== id)
        throw new AccountError(409, "Pedido divergente; consulte o suporte.");
      tx.patch(orderPath, { [field]: id, phase: `${field}_saved` });
    });
    return id;
  }
  const customerId = await step("customerId", "/customers", {
    name: order.customerName,
    email: order.email,
    cpfCnpj: order.cpfCnpj,
    externalReference,
  });
  const dueDate = new Date(Date.now() + 3 * 86400000)
    .toISOString()
    .slice(0, 10);
  const endpoint = programId ? "/payments" : "/subscriptions";
  const resourceId = await step("resourceId", endpoint, {
    customer: customerId,
    value: order.amountCents / 100,
    billingType: "UNDEFINED",
    externalReference,
    description: programId
      ? "Plataforma Esdras — Capacitação"
      : `Plataforma Esdras — ${plan}`,
    ...(programId ? { dueDate } : { nextDueDate: dueDate, cycle: "MONTHLY" }),
  });
  const payments = programId
    ? [await gateway(`/payments/${resourceId}`)]
    : (await gateway(`/subscriptions/${resourceId}/payments?limit=12`)).data;
  const payment = payments?.find(
    (p: any) =>
      p.customer === customerId &&
      money(p.value) === order.amountCents &&
      (programId ? p.id === resourceId : p.subscription === resourceId) &&
      ["PENDING", "OVERDUE"].includes(p.status),
  );
  if (!payment)
    throw new AccountError(
      409,
      "Não há cobrança pendente disponível. Consulte as faturas.",
    );
  const url = checkoutUrl(payment.invoiceUrl);
  await accountTransaction(async (tx) => {
    await financeActor(tx, orgId, uid);
    const [current, subscription] = await tx.read(
      orderPath,
      `${root}/settings/subscription`,
    );
    if (current?.cancelled)
      throw new AccountError(409, "Contratação encerrada.");
    tx.patch(orderPath, {
      phase: "ready",
      checkoutUrl: url,
      updatedAt: new Date().toISOString(),
    });
    if (!programId) {
      const link = {
        asaasCustomerId: customerId,
        asaasSubscriptionId: resourceId,
      };
      if (subscription) tx.patch(`${root}/settings/subscription`, link);
      else
        tx.set(`${root}/settings/subscription`, {
          ...link,
          plan: "free",
          billingStatus: "active",
        });
    }
  });
  return {
    ok: true,
    checkoutUrl: url,
    ...(programId
      ? { asaasPaymentId: resourceId }
      : { asaasCustomerId: customerId, asaasSubscriptionId: resourceId }),
  };
}
export async function billingEvent(payload: any, gateway: Gateway = asaas) {
  const eventId = documentId(payload.id, "Evento"),
    event = textField(payload.event, "Evento", 100);
  const resource = event.startsWith("SUBSCRIPTION_")
    ? payload.subscription
    : payload.payment;
  const reference = resource?.externalReference;
  if (typeof reference !== "string" || !reference.startsWith("order:")) {
    const legacyOrg =
      typeof reference === "string"
        ? reference.startsWith("program:")
          ? reference.split(":")[1]
          : reference
        : "";
    if (legacyOrg && /^[A-Za-z0-9_-]{1,128}$/.test(legacyOrg)) {
      const exists = await accountTransaction(
        async (tx) => (await tx.read(`organizations/${legacyOrg}`))[0],
      );
      if (exists)
        throw new AccountError(
          409,
          "Cobrança legada exige migração do vínculo antes de processar este evento.",
        );
    }
    return { ok: true, ignored: true, reason: "unbound_reference" };
  }
  const parts = reference.split(":");
  if (parts.length !== 3) throw new AccountError(400, "Referência inválida.");
  const orgId = documentId(parts[1], "Igreja"),
    orderId = documentId(parts[2], "Pedido"),
    root = `organizations/${orgId}`;
  const id = documentId(resource.id, "Cobrança"),
    orderPath = `${root}/billingOrders/${orderId}`,
    eventPath = `${root}/billingEvents/${eventId}`;
  const stamp = Date.parse(
    String(payload.dateCreated || "").replace(" ", "T") +
      (/Z$|[+-]\d\d:\d\d$/.test(payload.dateCreated || "") ? "" : "-03:00"),
  );
  if (!Number.isFinite(stamp))
    throw new AccountError(400, "Data do evento inválida.");
  const fingerprint = hash(JSON.stringify({ event, reference, id, stamp }));
  const previous = await accountTransaction(
    async (tx) => (await tx.read(eventPath))[0],
  );
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new AccountError(409, "Evento reutilizado com outro conteúdo.");
    return { ok: true, replayed: true };
  }
  if (!event.startsWith("PAYMENT_") && event !== "SUBSCRIPTION_DELETED")
    return { ok: true, ignored: true };
  const live =
    event === "SUBSCRIPTION_DELETED"
      ? resource
      : await gateway(`/payments/${id}`);
  return accountTransaction(async (tx) => {
    const [org, order, oldEvent, subscription] = await tx.read(
      root,
      orderPath,
      eventPath,
      `${root}/settings/subscription`,
    );
    if (oldEvent) {
      if (oldEvent.fingerprint !== fingerprint)
        throw new AccountError(409, "Evento divergente.");
      return { ok: true, replayed: true };
    }
    if (!org || order?.organizationId !== orgId)
      throw new AccountError(
        409,
        "Pedido ainda não vinculado. Tente novamente.",
      );
    const deleting = event === "SUBSCRIPTION_DELETED";
    if (
      live.customer !== order.customerId ||
      (deleting
        ? id !== order.resourceId || Boolean(order.programId)
        : live.id !== id ||
          live.externalReference !== reference ||
          (order.programId
            ? id !== order.resourceId
            : live.subscription !== order.resourceId))
    )
      throw new AccountError(
        409,
        "Evento não corresponde ao pedido desta igreja.",
      );
    if (!deleting && money(live.value) !== order.amountCents)
      throw new AccountError(
        409,
        "Valor da cobrança divergente; exige conferência.",
      );
    const dueDate = deleting ? "" : textField(live.dueDate, "Vencimento", 10);
    if (!deleting && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
      throw new AccountError(400, "Vencimento inválido.");
    const stale =
      stamp < (order.lastEventAt || 0) ||
      (!deleting && dueDate < (order.lastDueDate || "")) ||
      (!deleting && order.cancelled === true);
    const now = new Date().toISOString();
    tx.set(eventPath, {
      fingerprint,
      event,
      resourceId: id,
      receivedAt: now,
      ignored: stale,
      providerStatus: live.status || event,
    });
    if (stale) return { ok: true, ignored: true };
    const paid = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(
        live.status,
      ),
      revoked =
        deleting ||
        [
          "REFUNDED",
          "REFUND_REQUESTED",
          "CHARGEBACK_REQUESTED",
          "CHARGEBACK_DISPUTE",
          "AWAITING_CHARGEBACK_REVERSAL",
        ].includes(live.status) ||
        live.deleted === true;
    const overdue = live.status === "OVERDUE";
    if (!paid && !revoked && !overdue) return { ok: true, ignored: true };
    if (order.programId) {
      tx.set(`${root}/programEntitlements/${order.programId}`, {
        programId: order.programId,
        status: paid ? "active" : "revoked",
        purchasedAt: order.purchasedAt || now,
        asaasPaymentId: id,
        asaasStatus: live.status || event,
      });
    } else {
      const data = {
        plan: paid
          ? order.plan
          : revoked
            ? "free"
            : subscription?.plan || "free",
        billingStatus: overdue ? "overdue" : "active",
        overdueSince: overdue
          ? subscription?.overdueSince || `${dueDate}T12:00:00.000Z`
          : null,
        asaasSubscriptionId: order.resourceId,
        asaasCustomerId: order.customerId,
        asaasStatus: live.status || event,
      };
      if (subscription) tx.patch(`${root}/settings/subscription`, data);
      else tx.set(`${root}/settings/subscription`, data);
    }
    tx.patch(orderPath, {
      lastEventAt: stamp,
      ...(dueDate ? { lastDueDate: dueDate } : {}),
      cancelled: deleting || order.cancelled === true,
      providerStatus: live.status || event,
      ...(paid ? { purchasedAt: order.purchasedAt || now } : {}),
    });
    return { ok: true };
  });
}

import { createHash } from "node:crypto";
import { buildPixPayload } from "@alvo/domain";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { documentId } from "./member-account";
import { deletePhoto, getPhoto, photoBytes, putPhoto } from "./kids-media";

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function money(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0.01 ||
    value > 1000000 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 1e-7
  )
    throw new AccountError(
      400,
      "Informe um valor entre R$ 0,01 e R$ 1.000.000,00, com até duas casas decimais.",
    );
  return Math.round(value * 100);
}
export function textField(
  value: unknown,
  label: string,
  max = 120,
  optional = false,
): string {
  if (optional && (value === undefined || value === "")) return "";
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new AccountError(400, `${label} inválido.`);
  return value.trim();
}
export async function financeActor(
  tx: AccountTransaction,
  orgId: string,
  uid: string,
  admin = true,
) {
  documentId(orgId, "Igreja");
  documentId(uid, "Conta");
  const root = `organizations/${orgId}`;
  const [org, actor] = await tx.read(root, `${root}/users/${uid}`);
  if (
    org?.status !== "active" ||
    actor?.organizationId !== orgId ||
    actor?.isActive !== true ||
    (admin &&
      !actor.roles?.some((r: string) =>
        ["super_admin", "church_admin", "pastor", "secretary"].includes(r),
      ))
  )
    throw new AccountError(
      403,
      "Você não tem acesso a esta operação nesta igreja.",
    );
  return { root, org, actor };
}
async function quota(
  tx: AccountTransaction,
  root: string,
  key: string,
  now = Date.now(),
) {
  const paths = [
    `${root}/givingLimits/source_${hash(key).slice(0, 2)}`,
    `${root}/givingLimits/day`,
  ];
  const states = await tx.read(...paths);
  for (let i = 0; i < 2; i++) {
    const window = Math.floor(now / (i ? 86400000 : 3600000)),
      max = i ? 200 : 20;
    const count = states[i]?.window === window ? states[i]?.count : 0;
    if (!Number.isInteger(count) || count < 0 || count >= max)
      throw new AccountError(
        429,
        "Muitos registros. Aguarde antes de tentar novamente.",
      );
    tx.set(paths[i], { window, count: count + 1 });
  }
}
function tokenHash(token: unknown) {
  if (typeof token !== "string" || !/^[a-f0-9-]{36,80}$/i.test(token))
    throw new AccountError(
      400,
      "Reabra o formulário para iniciar uma contribuição.",
    );
  return hash(token);
}
async function publicContext(tx: AccountTransaction, orgSlug: string) {
  documentId(orgSlug, "Link da igreja");
  const [slug] = await tx.read(`org_slugs/${orgSlug}`);
  if (!slug) throw new AccountError(404, "Igreja não encontrada.");
  const orgId = documentId(slug.organizationId, "Igreja");
  const root = `organizations/${orgId}`;
  const [org, branding] = await tx.read(root, `${root}/settings/branding`);
  if (org?.status !== "active")
    throw new AccountError(404, "Igreja indisponível.");
  if (!branding?.pixKey)
    throw new AccountError(422, "A igreja ainda não configurou o PIX.");
  return { orgId, root, branding };
}
export async function createPublicGiving(raw: any, clientKey: string) {
  const amountCents = money(raw.amount),
    name = textField(raw.name, "Nome"),
    whatsapp = textField(raw.whatsapp, "WhatsApp", 25).replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(whatsapp) || typeof raw.consentContact !== "boolean")
    throw new AccountError(400, "Confira o telefone e a opção de contato.");
  const secretHash = tokenHash(raw.token),
    intentId = `giving_${secretHash.slice(0, 32)}`;
  const campaignId = raw.campaignId
    ? documentId(raw.campaignId, "Campanha")
    : "";
  const fingerprint = hash(
    JSON.stringify({
      amountCents,
      name,
      whatsapp,
      campaignId,
      consentContact: raw.consentContact,
    }),
  );
  return accountTransaction(async (tx) => {
    const { orgId, root, branding } = await publicContext(tx, raw.orgSlug);
    const path = `${root}/givingIntents/${intentId}`;
    const [old, campaign] = await tx.read(
      path,
      `${root}/givingCampaigns/${campaignId || "none"}`,
    );
    if (old && old.fingerprint !== fingerprint)
      throw new AccountError(
        409,
        "Este pedido já foi registrado com outros dados. Inicie uma nova contribuição.",
      );
    if (
      !old &&
      campaignId &&
      (campaign?.organizationId !== orgId || campaign.status !== "active")
    )
      throw new AccountError(422, "Campanha indisponível.");
    if (!old) {
      await quota(tx, root, clientKey);
      tx.set(path, {
        organizationId: orgId,
        name,
        whatsapp,
        amount: amountCents / 100,
        amountCents,
        consentContact: raw.consentContact,
        source: "public_give",
        status: "captured",
        orgSlug: raw.orgSlug,
        campaignId,
        fingerprint,
        secretHash,
        expiresAt: Date.now() + 48 * 3600000,
        createdAt: new Date().toISOString(),
      });
    }
    const pixKey = String(branding.pixKey),
      receiverName = String(
        branding.pixReceiverName || branding.publicShortName || "Igreja",
      );
    return {
      ok: true,
      organizationId: orgId,
      intentId,
      pixKey,
      receiverName,
      payload: buildPixPayload({
        key: pixKey,
        receiverName,
        amount: amountCents / 100,
        description: "Oferta/Dizimo",
      }),
    };
  });
}
async function publicReceiptAuth(tx: AccountTransaction, raw: any) {
  const orgId = documentId(raw.organizationId, "Igreja"),
    id = documentId(raw.intentId, "Intenção");
  const root = `organizations/${orgId}`;
  const [org, intent] = await tx.read(root, `${root}/givingIntents/${id}`);
  if (
    org?.status !== "active" ||
    intent?.organizationId !== orgId ||
    intent.secretHash !== tokenHash(raw.token) ||
    intent.expiresAt < Date.now()
  )
    throw new AccountError(
      403,
      "Pedido inválido ou expirado. Procure a secretaria.",
    );
  return { root, orgId, id, intent };
}
// The object is uploaded before the transaction; a failed transaction removes
// only its own random object. Replays cannot replace an already filed receipt.
export async function declareGiving(raw: any, uid?: string) {
  const publicFlow = !uid;
  const orgId = documentId(raw.organizationId, "Igreja");
  const id = publicFlow
    ? documentId(raw.intentId, "Intenção")
    : documentId(raw.requestId, "Pedido");
  const contributionId = publicFlow
    ? `public_${id}`
    : `member_${hash(`${uid}:${id}`).slice(0, 32)}`;
  const image = raw.dataUrl ? photoBytes(raw.dataUrl) : null;
  const fingerprint = hash(
    JSON.stringify(
      publicFlow
        ? { dataUrl: raw.dataUrl || "" }
        : {
            amount: money(raw.amount),
            type: raw.type,
            personId: raw.personId || "",
            dataUrl: raw.dataUrl || "",
          },
    ),
  );
  const authenticate = async (tx: AccountTransaction) =>
    publicFlow
      ? publicReceiptAuth(tx, raw)
      : financeActor(tx, orgId, uid!, Boolean(raw.personId));
  const prior = await accountTransaction(async (tx) => {
    const { root } = await authenticate(tx);
    const [old] = await tx.read(`${root}/contributions/${contributionId}`);
    if (old && old.fingerprint !== fingerprint)
      throw new AccountError(
        409,
        "Este pedido já foi registrado com outros dados.",
      );
    return old;
  });
  if (prior)
    return publicFlow
      ? { ok: true, contributionId, replayed: true }
      : { ok: true, contributionId, replayed: true, contribution: prior };
  const path = image
    ? `finance-private/${orgId}/${contributionId}/${crypto.randomUUID()}`
    : null;
  let linked = false;
  try {
    if (image && path) await putPhoto(path, image.bytes, image.contentType);
    const result = await accountTransaction(async (tx) => {
      const auth = await authenticate(tx),
        root = auth.root;
      const [old] = await tx.read(`${root}/contributions/${contributionId}`);
      if (old) {
        if (old.fingerprint !== fingerprint)
          throw new AccountError(
            409,
            "Este pedido já foi registrado com outros dados.",
          );
        return { ok: true, contributionId, replayed: true, contribution: old };
      }
      const intent = publicFlow ? (auth as any).intent : null;
      const actor = (auth as any).actor;
      let personId = raw.personId ? documentId(raw.personId, "Pessoa") : "";
      if (!publicFlow && !personId) {
        const [link] = await tx.read(`${root}/memberAccountLinks/${uid}`);
        if (
          link?.userId === uid &&
          link?.organizationId === orgId &&
          link.verifiedBy &&
          actor.personId === link.personId
        )
          personId = documentId(link.personId, "Pessoa");
      }
      const [person] = personId
        ? await tx.read(`${root}/people/${personId}`)
        : [null];
      if (
        personId &&
        (person?.organizationId !== orgId || person.status !== "active")
      )
        throw new AccountError(422, "Pessoa indisponível nesta igreja.");
      const type = publicFlow
        ? intent.campaignId
          ? "campanha"
          : "oferta"
        : raw.type;
      if (!["dizimo", "oferta", "missao", "campanha", "outro"].includes(type))
        throw new AccountError(400, "Tipo de contribuição inválido.");
      if (!publicFlow) await quota(tx, root, uid!);
      const now = new Date().toISOString();
      const contribution = {
        organizationId: orgId,
        userId: raw.personId ? "" : uid || "",
        personId,
        contributorName: person
          ? `${person.firstName} ${person.lastName || ""}`.trim()
          : intent?.name || actor?.displayName || actor?.name || "Membro",
        amount: publicFlow ? intent.amount : money(raw.amount) / 100,
        type,
        date: now.slice(0, 10),
        registeredAt: now,
        registeredBy: uid || "public",
        status: "pending",
        method: raw.personId ? "manual" : "pix",
        receiptId: path ? contributionId : null,
        fingerprint,
        ...(publicFlow
          ? { intentId: id, campaignId: intent.campaignId || "" }
          : {}),
      };
      tx.set(`${root}/contributions/${contributionId}`, contribution);
      if (path)
        tx.set(`${root}/contributionReceipts/${contributionId}`, {
          organizationId: orgId,
          contributionId,
          path,
          createdByUserId: uid || "public",
          createdAt: now,
        });
      if (publicFlow) {
        tx.patch(`${root}/givingIntents/${id}`, {
          status: "declared",
          contributionId,
        });
        tx.set(`${root}/givingReceipts/${id}`, {
          organizationId: orgId,
          intentId: id,
          receiptId: path ? contributionId : null,
          createdAt: now,
        });
      }
      tx.set(`${root}/financeAudit/declare_${contributionId}`, {
        action: "declared",
        contributionId,
        actorId: uid || "public",
        createdAt: now,
      });
      return { ok: true, contributionId, replayed: false, contribution };
    });
    linked = !result.replayed;
    return publicFlow
      ? { ok: true, contributionId, replayed: result.replayed }
      : result;
  } finally {
    if (path && !linked) await deletePhoto(path).catch(() => {});
  }
}
export async function readReceipt(
  orgId: string,
  id: string,
  uid: string,
  legacyGiving = false,
) {
  documentId(id, "Comprovante");
  const receipt = await accountTransaction(async (tx) => {
    const { root } = await financeActor(tx, orgId, uid);
    const [r] = await tx.read(
      `${root}/${legacyGiving ? "givingReceipts" : "contributionReceipts"}/${id}`,
    );
    if (!r || r.organizationId !== orgId)
      throw new AccountError(404, "Comprovante indisponível.");
    return r;
  });
  if (receipt.path) {
    if (
      !new RegExp(`^finance-private/${orgId}/${id}/[a-f0-9-]+$`).test(
        receipt.path,
      )
    )
      throw new AccountError(409, "Referência de comprovante inválida.");
    return { dataUrl: await getPhoto(receipt.path) };
  }
  // Legacy private documents are read only by the backend; no public URLs.
  const dataUrl = `data:${receipt.contentType || "image/jpeg"};base64,${receipt.imageBase64}`;
  photoBytes(dataUrl);
  return { dataUrl };
}
export async function reconcileContribution(raw: any, uid: string) {
  const orgId = documentId(raw.organizationId, "Igreja"),
    id = documentId(raw.contributionId, "Contribuição");
  const reference = textField(raw.reference, "Referência do extrato", 160),
    action = raw.action;
  if (!["confirm", "reject"].includes(action))
    throw new AccountError(400, "Decisão inválida.");
  return accountTransaction(async (tx) => {
    const { root } = await financeActor(tx, orgId, uid);
    const [c, claim] = await tx.read(
      `${root}/contributions/${id}`,
      `${root}/financeReferences/${hash(reference.toLowerCase())}`,
    );
    if (!c || c.organizationId !== orgId)
      throw new AccountError(404, "Contribuição não encontrada.");
    if (
      c.status === (action === "confirm" ? "confirmed" : "rejected") &&
      c.reconciliationReference === reference
    )
      return { ok: true, replayed: true };
    if (c.status !== "pending")
      throw new AccountError(409, "Esta contribuição já foi analisada.");
    if (action === "confirm" && claim && claim.contributionId !== id)
      throw new AccountError(
        409,
        "Esta referência bancária já foi usada em outra contribuição.",
      );
    money(c.amount);
    const now = new Date().toISOString(),
      ledgerId = `contribution_${id}`;
    const [intent] = c.intentId
      ? await tx.read(
          `${root}/givingIntents/${documentId(c.intentId, "Intenção")}`,
        )
      : [null];
    const [campaign] = c.campaignId
      ? await tx.read(
          `${root}/givingCampaigns/${documentId(c.campaignId, "Campanha")}`,
        )
      : [null];
    if (action === "confirm") {
      tx.set(`${root}/financeReferences/${hash(reference.toLowerCase())}`, {
        contributionId: id,
      });
      tx.set(`${root}/financialTransactions/${ledgerId}`, {
        organizationId: orgId,
        kind: c.type === "missao" ? "missions" : "income",
        label: `${c.contributorName || "Contribuição"} — ${c.type}`,
        amount: c.amount,
        amountCents: money(c.amount),
        date: now,
        createdAt: now,
        createdByUserId: uid,
        contributionId: id,
        status: "posted",
        reference,
      });
      if (campaign?.organizationId === orgId)
        tx.patch(`${root}/givingCampaigns/${c.campaignId}`, {
          raisedAmount: (Number(campaign.raisedAmount) || 0) + c.amount,
          updatedAt: now,
        });
    }
    tx.patch(`${root}/contributions/${id}`, {
      status: action === "confirm" ? "confirmed" : "rejected",
      confirmedBy: uid,
      confirmedAt: now,
      reconciliationReference: reference,
      ledgerId: action === "confirm" ? ledgerId : null,
    });
    if (intent?.organizationId === orgId)
      tx.patch(`${root}/givingIntents/${c.intentId}`, {
        status: action === "confirm" ? "confirmed" : "rejected",
      });
    tx.set(`${root}/financeAudit/reconcile_${id}`, {
      action,
      contributionId: id,
      reference,
      actorId: uid,
      createdAt: now,
    });
    return { ok: true, replayed: false };
  });
}
export async function manualLedger(raw: any, uid: string) {
  const orgId = documentId(raw.organizationId, "Igreja"),
    id = documentId(raw.requestId, "Pedido");
  return accountTransaction(async (tx) => {
    const { root } = await financeActor(tx, orgId, uid);
    const path = `${root}/financialTransactions/${id}`;
    const [old] = await tx.read(path);
    const amountCents = money(raw.amount),
      label = textField(raw.label, "Descrição"),
      note = textField(raw.note, "Observação", 1000, true);
    if (!["income", "expense", "missions"].includes(raw.kind))
      throw new AccountError(400, "Categoria inválida.");
    const fingerprint = hash(
      JSON.stringify({ amountCents, label, note, kind: raw.kind }),
    );
    if (old) {
      if (old.fingerprint !== fingerprint)
        throw new AccountError(409, "Pedido reutilizado com dados diferentes.");
      return { ok: true, replayed: true };
    }
    const now = new Date().toISOString();
    tx.set(path, {
      organizationId: orgId,
      kind: raw.kind,
      label,
      note,
      amount: amountCents / 100,
      amountCents,
      date: now,
      createdAt: now,
      createdByUserId: uid,
      fingerprint,
      status: "posted",
    });
    tx.set(`${root}/financeAudit/manual_${id}`, {
      action: "manual",
      transactionId: id,
      actorId: uid,
      createdAt: now,
    });
    return { ok: true };
  });
}
export async function voidLedger(raw: any, uid: string) {
  const orgId = documentId(raw.organizationId, "Igreja"),
    id = documentId(raw.transactionId, "Lançamento"),
    reason = textField(raw.reason, "Motivo", 500);
  return accountTransaction(async (tx) => {
    const { root } = await financeActor(tx, orgId, uid);
    const path = `${root}/financialTransactions/${id}`,
      [old] = await tx.read(path);
    if (!old || old.organizationId !== orgId)
      throw new AccountError(404, "Lançamento não encontrado.");
    if (old.contributionId)
      throw new AccountError(
        409,
        "Contribuição conciliada exige revisão pela secretaria; não pode ser anulada como lançamento manual.",
      );
    if (old.status === "voided") return { ok: true, replayed: true };
    const now = new Date().toISOString();
    tx.patch(path, {
      status: "voided",
      voidReason: reason,
      voidedBy: uid,
      voidedAt: now,
    });
    tx.set(`${root}/financeAudit/void_${id}`, {
      action: "void",
      transactionId: id,
      reason,
      actorId: uid,
      createdAt: now,
    });
    return { ok: true };
  });
}

export async function publicGivingConfig(raw: any) {
  return accountTransaction(async (tx) => {
    const { orgId, root, branding } = await publicContext(tx, raw.orgSlug);
    let campaign = null;
    if (raw.campaignId) {
      const id = documentId(raw.campaignId, "Campanha"),
        [record] = await tx.read(`${root}/givingCampaigns/${id}`);
      if (record?.organizationId !== orgId || record.status !== "active")
        throw new AccountError(404, "Campanha indisponível.");
      campaign = {
        title: record.title,
        description: record.description || "",
        goalAmount: Number(record.goalAmount) || 0,
        raisedAmount: Number(record.raisedAmount) || 0,
      };
    }
    return {
      organizationId: orgId,
      pixKey: String(branding.pixKey),
      receiverName: String(
        branding.pixReceiverName || branding.publicShortName || "Igreja",
      ),
      churchWhatsapp: String(branding.givingWhatsappNumber || ""),
      campaign,
    };
  });
}

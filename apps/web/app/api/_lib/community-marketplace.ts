import { createHash } from "node:crypto";
import {
  COMMUNITY_CATEGORIES,
  safeCommunityUrl,
  communityPromotionActive,
  communityWhatsapp,
  communityMaps,
} from "@alvo/utils";
import { whatsappPhone, rasterImageType } from "@alvo/utils";
import {
  AccountError,
  accountTransaction,
  type AccountTransaction,
} from "./member-account-store";
import { documentId } from "./member-account";
import { marketplaceEnabled } from "./marketplace-access";
const staffRoles = ["super_admin", "church_admin", "pastor", "secretary"];
const text = (v: unknown, label: string, max: number, required = false) => {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string" || v.trim().length > max || (required && !v.trim()))
    throw new AccountError(400, `Confira ${label} (até ${max} caracteres).`);
  return v.trim();
};
export async function marketplaceActor(
  tx: AccountTransaction,
  orgId: string,
  uid: string,
) {
  const root = `organizations/${orgId}`;
  const [org, actor] = await tx.read(
    root,
    `${root}/users/${documentId(uid, "Conta")}`,
  );
  if (
    org?.status !== "active" ||
    actor?.organizationId !== orgId ||
    actor?.isActive !== true
  )
    throw new AccountError(403, "Acesso restrito à instituição ativa.");
  await marketplaceEnabled(tx, root);
  return {
    root,
    org,
    staff:
      Array.isArray(actor.roles) &&
      actor.roles.some((r: string) => staffRoles.includes(r)),
  };
}
function todayIn(zone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
function banner(raw: unknown) {
  const v = text(raw, "imagem", 220000);
  if (!v) return "";
  if (safeCommunityUrl(v)) return v;
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(v);
  if (!match) throw new AccountError(400, "Use uma imagem JPEG, PNG ou WebP.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 160000)
    throw new AccountError(400, "Reduza a imagem para até 160 KB.");
  try {
    rasterImageType(bytes, match[1]);
  } catch {
    throw new AccountError(400, "Imagem inválida.");
  }
  return v;
}
function storeFields(raw: any) {
  const category = text(raw.category, "categoria", 30);
  if (!Object.hasOwn(COMMUNITY_CATEGORIES, category))
    throw new AccountError(400, "Categoria inválida.");
  const w = text(raw.whatsapp, "WhatsApp", 40),
    phone = w ? whatsappPhone(w) : "";
  if (w && !phone) throw new AccountError(400, "Confira o WhatsApp com DDD.");
  const website = text(raw.website, "site", 500);
  if (website && !safeCommunityUrl(website))
    throw new AccountError(
      400,
      "O site precisa começar com https:// ou http://.",
    );
  const facebook = text(raw.facebook, "Facebook", 500);
  if (facebook && !safeCommunityUrl(facebook))
    throw new AccountError(
      400,
      "O Facebook precisa ser um endereço http:// ou https://.",
    );
  const email = text(raw.email, "e-mail", 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AccountError(400, "E-mail inválido.");
  const instagram = text(raw.instagram, "Instagram", 120).replace(/^@/, "");
  if (instagram && !/^[A-Za-z0-9._]+$/.test(instagram))
    throw new AccountError(400, "Informe apenas o usuário do Instagram.");
  const address = Object.fromEntries(
    ["street", "number", "district", "city", "state", "postalCode"].map((k) => [
      k,
      text(raw[k], k, 160),
    ]),
  );
  return {
    name: text(raw.name, "nome", 120, true),
    description: text(raw.description, "descrição", 3000, true),
    offerings: text(raw.offerings, "produtos e serviços", 2000),
    category,
    bannerImageUrl: banner(raw.bannerImageUrl),
    contact: {
      email,
      phone: text(raw.phone, "telefone", 40),
      address: { ...address, countryCode: "BR" },
    },
    socialLinks: {
      whatsapp: phone,
      website: safeCommunityUrl(website),
      facebook: safeCommunityUrl(facebook),
      instagram,
    },
  };
}
function projectStore(s: any, privileged: boolean) {
  const {
    ownerId,
    moderatedBy,
    rejectionReason,
    suspensionReason,
    ...visible
  } = s;
  return privileged ? s : visible;
}
export async function communityMarketplaceOperation(
  raw: Record<string, any>,
  uid: string,
) {
  const orgId = documentId(raw.organizationId, "Igreja");
  return accountTransaction(async (tx) => {
    const { root, org, staff } = await marketplaceActor(tx, orgId, uid),
      today = todayIn(org.timezone || "America/Belem");
    const own = (s: any) => s?.ownerId === uid;
    if (raw.action === "list") {
      const scope = raw.scope || "catalog";
      if (!["catalog", "mine", "moderation"].includes(scope))
        throw new AccountError(400, "Lista inválida.");
      if (scope === "moderation" && !staff)
        throw new AccountError(403, "Somente a equipe pode moderar.");
      const field =
        scope === "mine"
          ? "ownerId"
          : scope === "catalog"
            ? "status"
            : raw.status
              ? "status"
              : undefined;
      const value =
        scope === "mine" ? uid : scope === "catalog" ? "approved" : raw.status;
      if (
        raw.status &&
        !["pending", "approved", "rejected", "suspended"].includes(raw.status)
      )
        throw new AccountError(400, "Situação inválida.");
      const rows = await tx.query(
        root,
        "communityStores",
        field,
        value,
        "EQUAL",
        101,
        undefined,
        { field: "__name__", direction: "ASCENDING" },
        raw.cursor ? documentId(raw.cursor, "Página") : undefined,
      );
      const total = await tx.count(root, "communityStores", field, value);
      return {
        stores: rows
          .slice(0, 100)
          .filter((s) => s.organizationId === orgId)
          .map((s) => projectStore(s, staff || own(s))),
        cursor: rows.length > 100 ? rows[99].id : null,
        total,
        staff,
      };
    }
    if (raw.action === "feed") {
      const rows = await tx.query(
        root,
        "marketplacePromotions",
        "status",
        "active",
        "EQUAL",
        101,
        undefined,
        { field: "__name__", direction: "ASCENDING" },
        raw.cursor ? documentId(raw.cursor, "Página") : undefined,
      );
      const page = rows.slice(0, 100),
        storeIds = [
          ...new Set(
            page
              .map((p) => p.storeId)
              .filter(
                (id) =>
                  typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id),
              ),
          ),
        ];
      const stores = await tx.read(
        ...storeIds.map((id) => `${root}/communityStores/${id}`),
      );
      const found = new Map(storeIds.map((id, i) => [id, stores[i]]));
      return {
        promotions: page.flatMap((p) => {
          const s = found.get(p.storeId);
          return p.organizationId === orgId &&
            s?.organizationId === orgId &&
            s.status === "approved" &&
            communityPromotionActive(p, today)
            ? [
                {
                  id: p.id,
                  organizationId: orgId,
                  storeId: p.storeId,
                  storeName: s.name,
                  title: p.title,
                  description: p.description,
                  status: "active",
                  validUntil: p.validUntil || "",
                  createdAt: p.createdAt,
                  createdBy: "",
                  whatsappUrl: communityWhatsapp(s, p.title),
                  mapsUrl: communityMaps(s),
                },
              ]
            : [];
        }),
        cursor: rows.length > 100 ? rows[99].id : null,
      };
    }
    const storeId = documentId(raw.storeId || raw.requestId, "Loja"),
      path = `${root}/communityStores/${storeId}`;
    const [store] = await tx.read(path);
    if (raw.action === "save") {
      const fields = storeFields(raw.fields || {});
      if (store && (store.organizationId !== orgId || !own(store)))
        throw new AccountError(
          403,
          "Somente o proprietário pode editar esta loja.",
        );
      const requestId = documentId(raw.requestId, "Tentativa"),
        attemptPath = `${root}/communityStoreWrites/${uid}_${requestId}`;
      const fingerprint = createHash("sha256")
        .update(
          JSON.stringify({ storeId, fields, revision: raw.revision ?? 0 }),
        )
        .digest("hex");
      const [attempt] = await tx.read(attemptPath);
      if (attempt) {
        if (attempt.fingerprint !== fingerprint)
          throw new AccountError(409, "Tentativa já utilizada.");
        return { storeId, replayed: true };
      }
      if (store && (store.revision || 0) !== raw.revision)
        throw new AccountError(
          409,
          "A loja mudou. Recarregue antes de editar.",
        );
      const now = new Date().toISOString();
      const updated: Record<string, any> = {
        ...store,
        ...fields,
        socialLinks: { ...store?.socialLinks, ...fields.socialLinks },
        id: storeId,
        organizationId: orgId,
        ownerId: uid,
        images: store?.images || [],
        status: "pending",
        createdAt: store?.createdAt || now,
        updatedAt: now,
        revision: (store?.revision || 0) + 1,
      };
      delete updated.approvedAt;
      delete updated.moderatedBy;
      delete updated.rejectionReason;
      delete updated.suspensionReason;
      tx.set(path, updated);
      tx.set(attemptPath, {
        organizationId: orgId,
        fingerprint,
        createdAt: now,
      });
      tx.set(`${root}/communityStoreModerationLogs/${crypto.randomUUID()}`, {
        organizationId: orgId,
        storeId,
        action: store ? "resubmitted" : "created",
        moderatedBy: uid,
        previousStatus: store?.status || "",
        newStatus: "pending",
        timestamp: now,
      });
      return { storeId, replayed: false };
    }
    if (
      !store ||
      store.organizationId !== orgId ||
      (!staff && !own(store) && store.status !== "approved")
    )
      throw new AccountError(404, "Loja indisponível.");
    if (raw.action === "detail") {
      const promos = await tx.query(
        root,
        "marketplacePromotions",
        "storeId",
        storeId,
        "EQUAL",
        201,
      );
      const legacy =
        store.status === "approved"
          ? await tx.query(path, "offers", "status", "active", "EQUAL", 51)
          : [];
      return {
        store: projectStore({ ...store, id: storeId }, staff || own(store)),
        canEdit: own(store),
        staff,
        promotions:
          store.status === "approved"
            ? promos
                .slice(0, 200)
                .filter(
                  (p) =>
                    p.organizationId === orgId &&
                    communityPromotionActive(p, today),
                )
            : [],
        legacyOffers: legacy
          .slice(0, 50)
          .filter(
            (p) =>
              p.organizationId === orgId &&
              communityPromotionActive(p, today) &&
              (!p.validFrom || Date.parse(p.validFrom) <= Date.now()),
          ),
        truncated: promos.length > 200 || legacy.length > 50,
      };
    }
    if (!staff)
      throw new AccountError(
        403,
        "Publicação de promoções é reservada à moderação.",
      );
    if (raw.action === "publish") {
      if (store.status !== "approved")
        throw new AccountError(409, "A loja precisa estar publicada.");
      const id = documentId(raw.requestId, "Tentativa"),
        title = text(raw.title, "título", 160, true),
        description = text(raw.description, "descrição", 2000);
      const validUntil = text(raw.validUntil, "validade", 10);
      if (
        validUntil &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) ||
          !Number.isFinite(Date.parse(validUntil)) ||
          new Date(validUntil).toISOString().slice(0, 10) !== validUntil ||
          validUntil < today)
      )
        throw new AccountError(400, "Escolha uma validade a partir de hoje.");
      const p = `${root}/marketplacePromotions/${id}`,
        [previous] = await tx.read(p);
      const fingerprint = createHash("sha256")
        .update(
          JSON.stringify({ storeId, title, description, validUntil, uid }),
        )
        .digest("hex");
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new AccountError(409, "Tentativa já utilizada.");
        return { id, replayed: true };
      }
      tx.set(p, {
        id,
        organizationId: orgId,
        storeId,
        storeName: store.name,
        title,
        description,
        validUntil,
        status: "active",
        createdBy: uid,
        createdAt: new Date().toISOString(),
        fingerprint,
      });
      return { id, replayed: false };
    }
    if (raw.action === "expire") {
      const id = documentId(raw.promotionId, "Promoção"),
        p = `${root}/marketplacePromotions/${id}`,
        [promo] = await tx.read(p);
      if (promo?.organizationId !== orgId || promo.storeId !== storeId)
        throw new AccountError(404, "Promoção não encontrada.");
      tx.patch(p, {
        status: "expired",
        updatedAt: new Date().toISOString(),
        updatedBy: uid,
      });
      return { ok: true };
    }
    throw new AccountError(400, "Operação inválida.");
  });
}

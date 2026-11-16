import { whatsappPhone, whatsappHref } from "@alvo/utils";
import { assertWhatsappContactAllowed } from "./communication-operations";
import { isChurchStaff, type GivingOverview } from "@alvo/domain";
import { createHash } from "node:crypto";
import { AccountError, accountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { financeActor, money, textField } from "./finance-operations";
type Data = Record<string, any>;
export async function givingOperation(body: Data, uid: string): Promise<any> {
  const orgId = documentId(body.organizationId, "Igreja");
  return accountTransaction(async (tx) => {
    const { root, actor, org } = await financeActor(
      tx,
      orgId,
      uid,
      false,
      "giving",
    );
    const manager =
      isChurchStaff(actor.roles || []) && body.scope !== "personal";
    const [branding, features] = await tx.read(
      `${root}/settings/branding`,
      `${root}/settings/features`,
    );
    if (body.action === "snapshot") {
      const [campaigns, contributions, intents] = await Promise.all([
        tx.query(
          root,
          "givingCampaigns",
          manager ? undefined : "status",
          manager ? undefined : "active",
          "EQUAL",
          501,
        ),
        tx.query(
          root,
          "contributions",
          manager ? undefined : "userId",
          manager ? undefined : uid,
          "EQUAL",
          201,
          undefined,
          { field: "date", direction: "DESCENDING" },
        ),
        manager
          ? tx.query(
              root,
              "givingIntents",
              undefined,
              undefined,
              "EQUAL",
              201,
              undefined,
              { field: "createdAt", direction: "DESCENDING" },
            )
          : Promise.resolve([]),
      ]);
      if (campaigns.length > 500)
        throw new AccountError(
          422,
          "Há mais de 500 campanhas. Consulte o suporte para organizar o histórico.",
        );
      const slug = org.slug;
      const [slugRecord] =
        typeof slug === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(slug)
          ? await tx.read(`org_slugs/${slug}`)
          : [null];
      return {
        manager,
        canReconcile: manager && features?.modules?.finance?.enabled !== false,
        canCommunicate:
          manager && features?.modules?.communication?.enabled !== false,
        publicPath:
          slugRecord?.organizationId === orgId ? `/p/${slug}/give` : null,
        pixConfigured: !!branding?.pixKey,
        campaigns: campaigns
          .filter((c) => c.organizationId === orgId)
          .map((c) => ({
            id: c.id,
            title: c.title || "Campanha",
            description: c.description || "",
            category: c.category || "",
            goalAmount: Number(c.goalAmount) || 0,
            raisedAmount: Number(c.raisedAmount) || 0,
            status: c.status,
            updatedAt: c.updatedAt || "",
          })),
        contributions: contributions
          .slice(0, 200)
          .filter(
            (c) => c.organizationId === orgId && (manager || c.userId === uid),
          )
          .map((c) => ({
            id: c.id,
            contributorName: manager
              ? c.contributorName || "Contribuição"
              : "Minha contribuição",
            amount: c.amount,
            type: c.type,
            date: c.date,
            status: c.status || "legacy",
            campaignId: c.campaignId || "",
          })),
        intents: intents
          .slice(0, 200)
          .filter((i) => i.organizationId === orgId)
          .map((i) => ({
            id: i.id,
            name: i.name,
            canContact: i.consentContact === true,
            amount: i.amount,
            status: i.status,
            createdAt: i.createdAt,
            campaignId: i.campaignId || "",
          })),
        pendingCount: manager
          ? await tx.count(root, "contributions", "status", "pending")
          : 0,
        truncated: contributions.length > 200 || intents.length > 200,
      } satisfies GivingOverview;
    }
    if (!manager)
      throw new AccountError(
        403,
        "Somente a equipe administrativa gerencia campanhas.",
      );
    if (body.action === "contact") {
      const id = documentId(body.intentId, "Intenção");
      const [intent] = await tx.read(`${root}/givingIntents/${id}`);
      if (intent?.organizationId !== orgId || intent.consentContact !== true)
        throw new AccountError(403, "Este contato não autorizou mensagens.");
      const phone = whatsappPhone(intent.whatsapp);
      if (!phone) throw new AccountError(422, "Confira o telefone do contato.");
      await assertWhatsappContactAllowed(tx, root, phone);
      const message = `Olá, ${intent.name}! Aqui é da ${org.displayName || org.name || "igreja"}. Podemos ajudar com a contribuição que você registrou?`;
      return { url: whatsappHref({ whatsappPhone: phone }, message) };
    }
    const now = new Date().toISOString();
    if (body.action === "create") {
      const requestId = documentId(body.requestId, "Pedido");
      const id =
        "campaign_" +
        createHash("sha256")
          .update(`${uid}:${requestId}`)
          .digest("hex")
          .slice(0, 32);
      const campaign = {
        organizationId: orgId,
        title: textField(body.title, "Título", 140),
        description: textField(body.description, "Descrição", 2000, true),
        category: textField(body.category, "Categoria", 80, true),
        goalAmount: money(body.goalAmount) / 100,
      };
      const fingerprint = createHash("sha256")
        .update(JSON.stringify(campaign))
        .digest("hex");
      const [old] = await tx.read(`${root}/givingCampaigns/${id}`);
      if (old) {
        if (old.fingerprint !== fingerprint)
          throw new AccountError(
            409,
            "O pedido já foi usado com outros dados.",
          );
        return { ok: true, id, replayed: true };
      }
      tx.set(`${root}/givingCampaigns/${id}`, {
        ...campaign,
        fingerprint,
        raisedAmount: 0,
        status: "active",
        createdByUserId: uid,
        createdAt: now,
        updatedAt: now,
      });
      tx.set(`${root}/financeAudit/create_${id}`, {
        organizationId: orgId,
        actorId: uid,
        action: "campaign-created",
        campaignId: id,
        createdAt: now,
      });
      return { ok: true, id };
    }
    if (body.action === "status") {
      const id = documentId(body.campaignId, "Campanha");
      if (!["active", "closed"].includes(body.status))
        throw new AccountError(400, "Situação inválida.");
      const [old] = await tx.read(`${root}/givingCampaigns/${id}`);
      if (old?.organizationId !== orgId)
        throw new AccountError(404, "Campanha não encontrada.");
      if (old.status === body.status) return { ok: true, replayed: true };
      if (body.expectedUpdatedAt !== (old.updatedAt || ""))
        throw new AccountError(
          409,
          "A campanha mudou. Atualize a tela antes de continuar.",
        );
      tx.patch(`${root}/givingCampaigns/${id}`, {
        status: body.status,
        updatedAt: now,
      });
      tx.set(`${root}/financeAudit/${crypto.randomUUID()}`, {
        organizationId: orgId,
        actorId: uid,
        action: "campaign-status",
        campaignId: id,
        from: old.status,
        to: body.status,
        createdAt: now,
      });
      return { ok: true };
    }
    throw new AccountError(400, "Operação inválida.");
  });
}

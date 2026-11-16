import { planHasModule, type PlanId } from "@alvo/firebase";
import { AccountError, type AccountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { assertModuleEnabled } from "./module-access";
export async function givingEnabled(tx: AccountTransaction, root: string) {
  await assertModuleEnabled(tx, root, "giving");
  const [sub] = await tx.read(`${root}/settings/subscription`);
  const plan =
    sub?.plan ||
    (
      {
        growth: "comunidade",
        advanced: "pastoral",
        enterprise: "enterprise",
      } as Record<string, string>
    )[sub?.planTier] ||
    "free";
  if (
    !["free", "comunidade", "pastoral", "rede", "enterprise"].includes(plan) ||
    !planHasModule(plan as PlanId, "giving")
  )
    throw new AccountError(
      403,
      "Doações não está incluído no plano da instituição.",
    );
}
export async function activeGivingCampaign(
  tx: AccountTransaction,
  root: string,
  organizationId: string,
  campaignId: unknown,
) {
  if (!campaignId) return "";
  const id = documentId(campaignId, "Campanha");
  const [campaign] = await tx.read(`${root}/givingCampaigns/${id}`);
  if (
    campaign?.organizationId !== organizationId ||
    campaign.status !== "active"
  )
    throw new AccountError(
      422,
      "Esta campanha foi encerrada ou está indisponível. Escolha outra campanha.",
    );
  return id;
}

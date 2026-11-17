import { planHasModule, type PlanId } from "@alvo/firebase";
import { AccountError, type AccountTransaction } from "./member-account-store";
import { assertModuleEnabled } from "./module-access";
export async function marketplaceEnabled(tx: AccountTransaction, root: string) {
  await assertModuleEnabled(tx, root, "marketplace");
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
    !planHasModule(plan as PlanId, "marketplace")
  )
    throw new AccountError(
      403,
      "Marketplace não está incluído no plano da instituição.",
    );
}

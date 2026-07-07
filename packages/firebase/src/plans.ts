export type PlanId = "free" | "comunidade" | "pastoral" | "rede" | "enterprise";

export interface PlanLimits {
  maxMembers: number;
  aiQueriesPerMonth: number;
  maxBranchOrgs: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:        { maxMembers: 50,       aiQueriesPerMonth: 0,    maxBranchOrgs: 0 },
  comunidade:  { maxMembers: 300,      aiQueriesPerMonth: 50,   maxBranchOrgs: 0 },
  pastoral:    { maxMembers: Infinity, aiQueriesPerMonth: 500,  maxBranchOrgs: 0 },
  rede:        { maxMembers: Infinity, aiQueriesPerMonth: 500,  maxBranchOrgs: 50 },
  enterprise:  { maxMembers: Infinity, aiQueriesPerMonth: 9999, maxBranchOrgs: 999 },
};

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  // Free existe pra provar valor, não pra sustentar a operação diária —
  // Eventos e Comunicação (uso recorrente/retenção) ficam no Comunidade+.
  free:       ["members", "app"],
  comunidade: ["members", "events", "communication", "app", "tribes", "finance", "groups", "ai_preview"],
  pastoral:   ["members", "events", "communication", "app", "tribes", "finance", "groups",
               "pastoral-ai", "serving", "kids", "learning", "worship", "reports", "journeys"],
  rede:       ["all"],
  enterprise: ["all"],
};

export type PlanFeatureKey =
  | "members" | "events" | "communication" | "app"
  | "tribes" | "finance" | "groups" | "ai_preview"
  | "pastoral-ai" | "serving" | "kids" | "learning"
  | "worship" | "reports" | "journeys" | "network" | "all";

export function planHasFeature(plan: PlanId, feature: PlanFeatureKey): boolean {
  const features = PLAN_FEATURES[plan];
  return features.includes("all") || features.includes(feature);
}

export function currentAiMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// A ficha de assinatura (OrganizationSubscriptionSettings) usa uma taxonomia
// de provisionamento ("planTier": base/growth/advanced/enterprise), enquanto
// o gate de features em produção (PlanGuard/usePlan) usa PlanId. Nenhum
// fluxo de criação de organização grava o campo `plan` que fetchOrgPlan lê —
// esta função existe para derivar PlanId a partir do planTier já gravado,
// como rede de segurança para organizações sem o campo `plan` explícito.
export function planTierToPlanId(
  planTier: "base" | "growth" | "advanced" | "enterprise" | undefined
): PlanId {
  switch (planTier) {
    case "growth": return "comunidade";
    case "advanced": return "pastoral";
    case "enterprise": return "rede";
    default: return "free";
  }
}

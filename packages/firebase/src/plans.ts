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
  // Doações (PIX de terceiros) anda junto com Finanças — quem já cobra
  // dízimo digital é operacionalmente maduro o bastante pra isso.
  comunidade: ["members", "events", "communication", "app", "tribes", "finance", "groups", "ai_preview", "giving"],
  // Marketplace é "recompensa" do topo — baixo custo de incluir, não é
  // motivo suficiente pra alguém migrar sozinho.
  pastoral:   ["members", "events", "communication", "app", "tribes", "finance", "groups",
               "pastoral-ai", "serving", "kids", "learning", "worship", "reports", "journeys",
               "giving", "marketplace"],
  rede:       ["all"],
  enterprise: ["all"],
};

export type PlanFeatureKey =
  | "members" | "events" | "communication" | "app"
  | "tribes" | "finance" | "groups" | "ai_preview"
  | "pastoral-ai" | "serving" | "kids" | "learning"
  | "worship" | "reports" | "journeys" | "network"
  | "giving" | "marketplace" | "all";

export function planHasFeature(plan: PlanId, feature: PlanFeatureKey): boolean {
  const features = PLAN_FEATURES[plan];
  return features.includes("all") || features.includes(feature);
}

// A disponibilidade dos módulos operacionais é determinada pelo plano
// contratado. O documento `settings/features` pode guardar metadados de
// implantação, mas nunca deve conceder um módulo que o plano não inclua.
const MODULE_PLAN_FEATURE: Record<string, PlanFeatureKey | null> = {
  core: null,
  visitors: "members",
  groups: "groups",
  events: "events",
  children: "kids",
  youth: "all",
  volunteers: "serving",
  tribes: "tribes",
  journeys: "journeys",
  communication: "communication",
  marketplace: "marketplace",
  giving: "giving",
  publicForms: "members",
  finance: "finance",
  ai: "pastoral-ai",
};

export function planHasModule(plan: PlanId, module: string): boolean {
  const feature = MODULE_PLAN_FEATURE[module];
  return feature === null || (feature !== undefined && planHasFeature(plan, feature));
}

// Dias de carência entre a fatura vencer (billingStatus "overdue") e o
// acesso ser efetivamente suspenso ("suspended") — dá tempo do pagamento
// via PIX/boleto compensar antes de travar o sistema do cliente.
export const BILLING_GRACE_PERIOD_DAYS = 5;

export type BillingStatus = "active" | "overdue" | "suspended";

// billingStatus é gravado como "overdue" pelo webhook assim que o Asaas
// avisa fatura vencida; a transição pra "suspended" é calculada aqui em
// vez de precisar de um cron — evita o caso do webhook de suspensão nunca
// chegar (ou o cliente pagar exatamente no limite do prazo).
export function resolveBillingStatus(
  rawStatus: BillingStatus | undefined,
  overdueSince: string | undefined
): BillingStatus {
  if (rawStatus !== "overdue" || !overdueSince) return rawStatus ?? "active";
  const overdueDate = new Date(overdueSince).getTime();
  if (Number.isNaN(overdueDate)) return "overdue";
  const daysSince = (Date.now() - overdueDate) / (1000 * 60 * 60 * 24);
  return daysSince >= BILLING_GRACE_PERIOD_DAYS ? "suspended" : "overdue";
}

export function currentAiMonth(): string {
  return new Date().toISOString().slice(0, 7); // same UTC window as the backend
}

// A ficha de assinatura (OrganizationSubscriptionSettings) usa uma taxonomia
// de provisionamento ("planTier": base/growth/advanced/enterprise), enquanto
// o gate de features em produção (PlanGuard/usePlan) usa PlanId. Os fluxos de
// criação de organização (provisionSelfServeOrganization, organization-new-view)
// já gravam o campo `plan` explicitamente via setOrgPlan — esta função continua
// existindo como rede de segurança para organizações antigas ou criadas por
// algum caminho que ainda não tenha sido migrado para gravar `plan` direto.
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

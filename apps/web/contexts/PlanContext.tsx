"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PlanId, PlanFeatureKey, AiQuotaStatus, OrgBillingInfo } from "@alvo/firebase";
import {
  fetchOrgBillingInfo,
  getAiQuotaStatus,
  planHasFeature,
  resolveBillingStatus,
} from "@alvo/firebase";
import { useAppAuth } from "../app/providers";

type BillingStatus = "active" | "overdue" | "suspended";

interface PlanContextValue {
  plan: PlanId;
  ready: boolean;
  hasFeature: (key: PlanFeatureKey) => boolean;
  aiQuota: AiQuotaStatus | null;
  refreshAiQuota: () => Promise<void>;
  useAiQuery: () => Promise<boolean>;
  billingStatus: BillingStatus;
  overdueSince: string | null;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { firebaseConfig, organizationId, tenantReady, tenantRuntime, roles } = useAppAuth();
  const [fallbackBilling, setFallbackBilling] = useState<{
    organizationId: string;
    info: OrgBillingInfo;
  } | null>(null);
  const [aiQuota, setAiQuota] = useState<AiQuotaStatus | null>(null);
  const isSuperAdmin = roles.includes("super_admin");

  // O bootstrap do tenant já trouxe a assinatura. Usá-la aqui evita outra
  // leitura do Firestore antes de liberar todas as telas protegidas.
  const subscription = tenantRuntime?.organization.id === organizationId
    ? tenantRuntime.settings?.subscription
    : null;
  // O parser de dados legados preenche planTier com um padrão; nesses casos
  // consultamos o documento original para não ampliar o acesso por engano.
  const snapshotBilling: OrgBillingInfo | null = subscription?.plan
    ? {
        plan: subscription.plan,
        billingStatus: resolveBillingStatus(subscription.billingStatus, subscription.overdueSince),
        overdueSince: subscription.overdueSince,
      }
    : null;
  const billing = snapshotBilling ?? (
    fallbackBilling?.organizationId === organizationId ? fallbackBilling.info : null
  );
  const ready = tenantReady && billing !== null;
  const plan: PlanId = isSuperAdmin ? "enterprise" : (ready ? billing.plan : "free");
  const billingStatus: BillingStatus = isSuperAdmin ? "active" : (ready ? billing.billingStatus : "active");
  const overdueSince = ready ? (billing.overdueSince ?? null) : null;

  // Compatibilidade com organizações antigas sem snapshot completo.
  useEffect(() => {
    if (!tenantReady || !organizationId || subscription?.plan) return;
    let cancelled = false;
    fetchOrgBillingInfo(firebaseConfig, { organizationId })
      .then((info) => {
        if (!cancelled) setFallbackBilling({ organizationId, info });
      })
      .catch(() => {
        if (!cancelled) {
          setFallbackBilling({ organizationId, info: { plan: "free", billingStatus: "active" } });
        }
      });
    return () => { cancelled = true; };
  }, [tenantReady, organizationId, subscription, firebaseConfig]);

  async function refreshAiQuota() {
    if (!tenantReady || !organizationId) return;
    try {
      const quota = await getAiQuotaStatus(firebaseConfig, { organizationId });
      setAiQuota(isSuperAdmin ? { ...quota, plan: "enterprise", limit: 9999, allowed: true } : quota);
    } catch {
      setAiQuota(null);
    }
  }

  async function useAiQuery(): Promise<boolean> {
    if (isSuperAdmin) return true;
    if (!aiQuota) {
      await refreshAiQuota();
    }
    await refreshAiQuota();
    const current = aiQuota;
    if (!current || !current.allowed) return false;
    return true;
  }

  useEffect(() => {
    if (tenantReady) {
      void refreshAiQuota();
    } else {
      setAiQuota(null);
    }
  }, [tenantReady, organizationId]);

  return (
    <PlanContext.Provider value={{
      plan,
      ready,
      hasFeature: (key) => isSuperAdmin || planHasFeature(plan, key),
      aiQuota,
      refreshAiQuota,
      useAiQuery,
      billingStatus,
      overdueSince,
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan deve ser usado dentro de PlanProvider");
  return ctx;
}

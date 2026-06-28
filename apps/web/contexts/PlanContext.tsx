"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PlanId, PlanFeatureKey, AiQuotaStatus } from "@alvo/firebase";
import { fetchOrgPlan, getAiQuotaStatus, incrementAiUsage, planHasFeature } from "@alvo/firebase";
import { useAppAuth } from "../app/providers";

interface PlanContextValue {
  plan: PlanId;
  ready: boolean;
  hasFeature: (key: PlanFeatureKey) => boolean;
  aiQuota: AiQuotaStatus | null;
  refreshAiQuota: () => Promise<void>;
  useAiQuery: () => Promise<boolean>;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { firebaseConfig, organizationId, tenantReady, roles } = useAppAuth();
  const [plan, setPlan] = useState<PlanId>("free");
  const [ready, setReady] = useState(false);
  const [aiQuota, setAiQuota] = useState<AiQuotaStatus | null>(null);

  const isSuperAdmin = roles.includes("super_admin");

  const context = { organizationId };

  async function loadPlan() {
    if (!tenantReady || !organizationId) return;
    try {
      const p = await fetchOrgPlan(firebaseConfig, context);
      setPlan(isSuperAdmin ? "enterprise" : p);
    } catch {
      setPlan("free");
    } finally {
      setReady(true);
    }
  }

  async function refreshAiQuota() {
    if (!tenantReady || !organizationId) return;
    try {
      const quota = await getAiQuotaStatus(firebaseConfig, context);
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
    const current = aiQuota;
    if (!current || !current.allowed) return false;
    await incrementAiUsage(firebaseConfig, context);
    await refreshAiQuota();
    return true;
  }

  useEffect(() => {
    if (tenantReady) {
      loadPlan();
      refreshAiQuota();
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

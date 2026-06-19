"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { OrganizationFeaturesSettings } from "@alvo/types";
import { isModuleEnabled, type ModuleKey, type ModulesConfig } from "@alvo/domain";
import { useAppAuth } from "../app/providers";

interface OrgFeaturesContextValue {
  features: OrganizationFeaturesSettings | null;
  ready: boolean;
  isEnabled: (key: ModuleKey) => boolean;
  isBeta: (key: ModuleKey) => boolean;
}

const OrgFeaturesContext = createContext<OrgFeaturesContextValue | null>(null);

export function OrgFeaturesProvider({ children }: { children: ReactNode }) {
  const { tenantRuntime, tenantReady } = useAppAuth();
  const features = tenantRuntime?.settings?.features ?? null;

  const value = useMemo<OrgFeaturesContextValue>(() => {
    const modules: ModulesConfig | null = features?.modules ?? null;

    return {
      features,
      ready: tenantReady,
      isEnabled: (key: ModuleKey) => {
        if (!tenantReady || !modules) return false;
        return isModuleEnabled(modules, key);
      },
      isBeta: (key: ModuleKey) => {
        if (!modules) return false;
        return modules[key]?.beta === true;
      },
    };
  }, [features, tenantReady]);

  return (
    <OrgFeaturesContext.Provider value={value}>
      {children}
    </OrgFeaturesContext.Provider>
  );
}

export function useOrgFeatures(): OrgFeaturesContextValue {
  const ctx = useContext(OrgFeaturesContext);
  if (!ctx) {
    throw new Error("useOrgFeatures deve ser usado dentro de OrgFeaturesProvider");
  }
  return ctx;
}

export function useModuleEnabled(key: ModuleKey): boolean {
  return useOrgFeatures().isEnabled(key);
}

"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { OrganizationFeaturesSettings } from "@alvo/types";
import {
  isModuleEnabled,
  type ModuleKey,
  type ModulesConfig,
} from "@alvo/domain";
import { useAppAuth } from "../app/providers";
import type { AppRole } from "@alvo/types";

export type GroupsModelType = "cell" | "gc" | "leadership" | "generic";
export type OrgTier = "solo" | "campus" | "network" | "denomination";

const GROUPS_MODEL_LABELS: Record<GroupsModelType, string> = {
  cell: "Células",
  gc: "G.C.",
  leadership: "Lideranças",
  generic: "Grupos",
};

interface OrgFeaturesContextValue {
  features: OrganizationFeaturesSettings | null;
  ready: boolean;
  isEnabled: (key: ModuleKey) => boolean;
  isBeta: (key: ModuleKey) => boolean;
  // Grupos config
  groupsLabel: string;
  groupsModelType: GroupsModelType;
  // Org tier
  orgTier: OrgTier;
}

const OrgFeaturesContext = createContext<OrgFeaturesContextValue | null>(null);

export function OrgFeaturesProvider({ children }: { children: ReactNode }) {
  const { tenantRuntime, tenantReady, roles } = useAppAuth();
  const isSuperAdmin = roles.includes("super_admin" as AppRole);
  const features = tenantRuntime?.settings?.features ?? null;
  const branding = tenantRuntime?.settings?.branding ?? null;
  const org = tenantRuntime?.organization ?? null;

  const value = useMemo<OrgFeaturesContextValue>(() => {
    const modules: ModulesConfig | null = features?.modules ?? null;

    const modelType: GroupsModelType =
      (branding?.groupsModelType as GroupsModelType | undefined) ?? "cell";

    const groupsLabel =
      branding?.groupsModuleLabel?.trim() || GROUPS_MODEL_LABELS[modelType];

    const orgTier: OrgTier =
      (org?.organizationTier as OrgTier | undefined) ??
      (org?.organizationType === "network"
        ? "network"
        : org?.organizationType === "denomination"
          ? "denomination"
          : "solo");

    return {
      features,
      ready: tenantReady,
      isEnabled: (key: ModuleKey) => {
        if (!tenantReady) return true;
        if (isSuperAdmin) return true; // super_admin vê tudo
        if (!modules) return true;
        return isModuleEnabled(modules, key);
      },
      isBeta: (key: ModuleKey) => {
        if (!modules) return false;
        return modules[key]?.beta === true;
      },
      groupsLabel,
      groupsModelType: modelType,
      orgTier,
    };
  }, [features, branding, org, tenantReady, isSuperAdmin]);

  return (
    <OrgFeaturesContext.Provider value={value}>
      {children}
    </OrgFeaturesContext.Provider>
  );
}

export function useOrgFeatures(): OrgFeaturesContextValue {
  const ctx = useContext(OrgFeaturesContext);
  if (!ctx) {
    throw new Error(
      "useOrgFeatures deve ser usado dentro de OrgFeaturesProvider",
    );
  }
  return ctx;
}

export function useModuleEnabled(key: ModuleKey): boolean {
  return useOrgFeatures().isEnabled(key);
}

export function useGroupsLabel(): string {
  return useOrgFeatures().groupsLabel;
}

export function useOrgTier(): OrgTier {
  return useOrgFeatures().orgTier;
}

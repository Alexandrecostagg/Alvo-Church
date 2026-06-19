import type { OrganizationFeaturesSettings } from "@alvo/types";

export type ModuleKey = keyof OrganizationFeaturesSettings["modules"];
export type ModulesConfig = OrganizationFeaturesSettings["modules"];

export function isModuleEnabled(modules: ModulesConfig, key: ModuleKey): boolean {
  return modules[key]?.enabled ?? false;
}

export function getEnabledModuleCount(modules: ModulesConfig): number {
  return Object.values(modules).filter((m) => m?.enabled).length;
}

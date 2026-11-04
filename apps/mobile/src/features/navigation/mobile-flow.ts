import type { AppRole, OrganizationFeaturesSettings } from "@alvo/types";
export type MobileModules = OrganizationFeaturesSettings["modules"];
export function mobileCapabilities(modules: MobileModules | undefined, roles: AppRole[] = []) {
  const enabled = (key: keyof MobileModules) => modules?.[key]?.enabled !== false;
  return {
    events: enabled("events"), groups: enabled("groups"), children: enabled("children"),
    volunteers: enabled("volunteers"), journeys: enabled("journeys"), giving: enabled("giving"),
    marketplace: enabled("marketplace"),
    leader: enabled("groups") && enabled("ai") && roles.some(r => ["super_admin", "church_admin", "pastor", "secretary", "group_leader"].includes(r)),
  };
}
export type MobileCapabilities = ReturnType<typeof mobileCapabilities>;
/** Brazilian decimal input; reject ambiguous/invalid/zero/negative values. */
export function parseContributionAmount(value: string): number | null {
  const raw = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw) && !/^\d+\.\d{1,2}$/.test(raw)) return null;
  const normalized = raw.includes(",") || /^\d{1,3}(?:\.\d{3})+$/.test(raw) ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 && amount <= 1000000 ? Math.round(amount * 100) / 100 : null;
}

/** Match the actual encoded image instead of mislabeling PNG receipts as JPEG. */
export function imageDataUrl(base64: string): string | null {
  if (base64.startsWith("/9j/")) return `data:image/jpeg;base64,${base64}`;
  if (base64.startsWith("iVBORw0KGgo")) return `data:image/png;base64,${base64}`;
  return null;
}

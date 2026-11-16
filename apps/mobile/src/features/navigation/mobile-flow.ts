import type { AppRole, OrganizationFeaturesSettings } from "@alvo/types";
export type MobileModules = OrganizationFeaturesSettings["modules"];
export function mobileCapabilities(modules: MobileModules | undefined, roles: AppRole[] = []) {
  const enabled = (key: keyof MobileModules) => modules?.[key]?.enabled !== false;
  return {
    events: enabled("events"), groups: enabled("groups"), children: enabled("children"),
    volunteers: enabled("volunteers"), journeys: enabled("journeys"), giving: enabled("giving"),
    marketplace: enabled("marketplace"), tribes: enabled("tribes"),
    leader: enabled("groups") && enabled("ai") && roles.some(r => ["super_admin", "church_admin", "pastor", "secretary", "group_leader"].includes(r)),
  };
}
export type MobileCapabilities = ReturnType<typeof mobileCapabilities>;
/** Brazilian decimal input; reject ambiguous/invalid/zero/negative values. */
export { parseGivingAmount as parseContributionAmount } from "@alvo/domain";

/** Match the actual encoded image instead of mislabeling PNG receipts as JPEG. */
export function imageDataUrl(base64: string): string | null {
  if (base64.startsWith("/9j/")) return `data:image/jpeg;base64,${base64}`;
  if (base64.startsWith("iVBORw0KGgo")) return `data:image/png;base64,${base64}`;
  return null;
}

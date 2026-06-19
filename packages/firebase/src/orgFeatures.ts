import type { OrganizationFeaturesSettings } from "@alvo/types";
import type { FirebaseWebRuntimeConfig } from "./client";
import { fetchOrganizationFeaturesSettings } from "./repositories";

export async function fetchOrgFeatures(
  config: FirebaseWebRuntimeConfig,
  organizationId: string
): Promise<OrganizationFeaturesSettings | null> {
  return fetchOrganizationFeaturesSettings(config, { organizationId });
}

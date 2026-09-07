import { collection, getDocs } from "firebase/firestore";
import { getFirebaseFirestore, type FirebaseWebRuntimeConfig } from "./client";

export interface OrganizationDirectoryEntry {
  organizationId: string;
  slug: string;
  displayName: string;
}

const SAFE_DOCUMENT_ID = /^[A-Za-z0-9_-]{1,128}$/;
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{1,118}$/;

export function parseOrganizationDirectoryEntry(
  slug: string,
  data: Record<string, unknown>,
): OrganizationDirectoryEntry | null {
  const organizationId = typeof data.organizationId === "string" ? data.organizationId : "";
  const displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
  if (!SAFE_DOCUMENT_ID.test(organizationId) || !SAFE_SLUG.test(slug) || !displayName || displayName.length > 160) {
    return null;
  }
  return { organizationId, slug, displayName };
}

export function normalizeOrganizationDirectory(
  entries: Array<OrganizationDirectoryEntry | null>,
): OrganizationDirectoryEntry[] {
  const byOrganization = new Map<string, OrganizationDirectoryEntry>();
  for (const entry of entries) {
    if (entry && !byOrganization.has(entry.organizationId)) byOrganization.set(entry.organizationId, entry);
  }
  return [...byOrganization.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"));
}

export async function fetchOrganizationDirectory(
  config: FirebaseWebRuntimeConfig,
): Promise<OrganizationDirectoryEntry[]> {
  const firestore = getFirebaseFirestore(config);
  const snapshot = await getDocs(collection(firestore, "org_slugs"));
  return normalizeOrganizationDirectory(
    snapshot.docs.map((document) => parseOrganizationDirectoryEntry(document.id, document.data())),
  );
}

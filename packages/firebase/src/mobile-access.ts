import { doc, getDocFromServer } from "firebase/firestore";
import { getFirebaseFirestore, type FirebaseWebRuntimeConfig } from "./client";
import { getTenantUserDocumentPath } from "./paths";

/** Never authorize a mobile session using Firestore's offline cache. */
export async function fetchMobileTenantAccess(config: FirebaseWebRuntimeConfig, organizationId: string, userId: string): Promise<boolean> {
  const db = getFirebaseFirestore(config);
  const member = await getDocFromServer(doc(db, getTenantUserDocumentPath({ organizationId }, userId)));
  if (!member.exists() || member.data().isActive !== true || member.data().organizationId !== organizationId) return false;
  const organization = await getDocFromServer(doc(db, "organizations", organizationId));
  // Matches the legacy status fallback in Firestore rules.
  return organization.exists() && (organization.data().status === undefined || organization.data().status === "active");
}

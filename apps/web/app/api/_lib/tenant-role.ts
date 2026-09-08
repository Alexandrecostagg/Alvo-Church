// Confere, usando o próprio ID token de quem chamou (respeitando as
// Firestore Security Rules normais — sem precisar de service account),
// se o usuário tem algum dos cargos informados dentro da organização.
export async function hasAnyRoleInOrg(
  idToken: string,
  organizationId: string,
  uid: string,
  roles: string[]
): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(organizationId) || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return false;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "alvo-church";
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/organizations/${organizationId}`;
  const headers = { Authorization: `Bearer ${idToken}` };
  const [userResponse, organizationResponse] = await Promise.all([
    fetch(`${base}/users/${uid}`, { headers, signal: AbortSignal.timeout(8000) }),
    fetch(base, { headers, signal: AbortSignal.timeout(8000) }),
  ]);
  if (!userResponse.ok || !organizationResponse.ok) return false;
  const data = (await userResponse.json()) as {
    fields?: { roles?: { arrayValue?: { values?: Array<{ stringValue?: string }> } }; isActive?: { booleanValue?: boolean } };
  };
  const organization = (await organizationResponse.json()) as { fields?: { status?: { stringValue?: string } } };
  const userRoles = data.fields?.roles?.arrayValue?.values?.map((v) => v.stringValue) ?? [];
  const isActive = data.fields?.isActive?.booleanValue ?? false;
  const status = organization.fields?.status?.stringValue ?? "active";
  return status === "active" && isActive && userRoles.some((r) => roles.includes(r ?? ""));
}

export const TENANT_ADMIN_ROLES = ["super_admin", "church_admin", "pastor", "secretary"];

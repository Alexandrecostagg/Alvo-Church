// Confere, usando o próprio ID token de quem chamou (respeitando as
// Firestore Security Rules normais — sem precisar de service account),
// se o usuário tem algum dos cargos informados dentro da organização.
export async function hasAnyRoleInOrg(
  idToken: string,
  organizationId: string,
  uid: string,
  roles: string[],
): Promise<boolean> {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "alvo-church";
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/organizations/${organizationId}/users/${uid}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as {
    fields?: {
      roles?: { arrayValue?: { values?: Array<{ stringValue?: string }> } };
      isActive?: { booleanValue?: boolean };
    };
  };
  const userRoles =
    data.fields?.roles?.arrayValue?.values?.map((v) => v.stringValue) ?? [];
  const isActive = data.fields?.isActive?.booleanValue ?? false;
  return isActive && userRoles.some((r) => roles.includes(r ?? ""));
}

export const TENANT_ADMIN_ROLES = [
  "super_admin",
  "church_admin",
  "pastor",
  "secretary",
];

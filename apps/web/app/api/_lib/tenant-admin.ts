// Confere, usando o próprio ID token do usuário (avaliado pelas Firestore
// Security Rules normais), que ele é admin da organização — evita que alguém
// dispare cobrança pra uma organização alheia.

function projectId(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "alvo-church";
}

const ADMIN_ROLES = ["super_admin", "church_admin", "pastor", "secretary"];

export async function isTenantAdminOfOrg(
  idToken: string,
  organizationId: string,
  uid: string,
): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents/organizations/${organizationId}/users/${uid}`;
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
  const roles =
    data.fields?.roles?.arrayValue?.values?.map((v) => v.stringValue) ?? [];
  const isActive = data.fields?.isActive?.booleanValue ?? false;
  return isActive && roles.some((r) => ADMIN_ROLES.includes(r ?? ""));
}

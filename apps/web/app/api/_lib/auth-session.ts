export function activeAuthSession(account: { localId?: string; disabled?: boolean; validSince?: string } | undefined, uid: string, authTime: unknown): boolean {
  const validSince = Number(account?.validSince ?? 0);
  return account?.localId === uid && account.disabled !== true
    && typeof authTime === "number" && Number.isFinite(authTime)
    && Number.isFinite(validSince) && authTime >= validSince;
}

/** Keep provider messages and account identifiers out of operational logs. */
export function safeAuthLookupFailure(payload: unknown): { reason: string } {
  const allowed = new Set([
    "PROJECT_NOT_FOUND", "CONFIGURATION_NOT_FOUND", "INVALID_PROJECT_ID",
    "INVALID_LOCAL_ID", "MISSING_LOCAL_ID", "INSUFFICIENT_PERMISSION",
    "PERMISSION_DENIED", "INVALID_ARGUMENT", "UNAUTHENTICATED",
    "OPERATION_NOT_ALLOWED", "CREDENTIAL_MISMATCH", "USER_NOT_FOUND",
    "ACCESS_TOKEN_SCOPE_INSUFFICIENT", "SERVICE_DISABLED", "BILLING_DISABLED",
  ]);
  const error = (payload as { error?: { message?: unknown; status?: unknown } } | null)?.error;
  for (const candidate of [error?.message, error?.status]) {
    if (typeof candidate === "string" && allowed.has(candidate)) return { reason: candidate };
  }
  return { reason: "PROVIDER_REQUEST_REJECTED" };
}

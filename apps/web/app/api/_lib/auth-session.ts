export function activeAuthSession(account: { localId?: string; disabled?: boolean; validSince?: string } | undefined, uid: string, authTime: unknown): boolean {
  const validSince = Number(account?.validSince ?? 0);
  return account?.localId === uid && account.disabled !== true
    && typeof authTime === "number" && Number.isFinite(authTime)
    && Number.isFinite(validSince) && authTime >= validSince;
}

// Storage can be denied by browser privacy settings or exhausted quotas.
// Remembering the selected institution must never prevent the app from opening.
export function readBrowserStorage(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function writeBrowserStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* The current tab can continue without persistent preferences. */ }
}

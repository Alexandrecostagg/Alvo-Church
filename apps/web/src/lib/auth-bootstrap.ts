import type { FirebaseAuthUser, FirebaseWebRuntimeConfig } from "@alvo/firebase";

type AuthSdk = Pick<typeof import("@alvo/firebase"), "subscribeToFirebaseAuthState">;

export function startAuthSession(options: {
  config: FirebaseWebRuntimeConfig;
  loadSdk: () => Promise<AuthSdk>;
  onUser: (user: FirebaseAuthUser | null) => void;
  onUnavailable: () => void;
}) {
  let active = true;
  let unsubscribe: (() => void) | undefined;
  const timeout = setTimeout(() => {
    if (active) options.onUnavailable();
  }, 15_000);

  void (async () => {
    try {
      const sdk = await options.loadSdk();
      if (!active) return;
      unsubscribe = sdk.subscribeToFirebaseAuthState(options.config, (user) => {
        if (!active) return;
        clearTimeout(timeout);
        options.onUser(user);
      });
    } catch {
      clearTimeout(timeout);
      if (active) options.onUnavailable();
    }
  })();

  return () => {
    active = false;
    clearTimeout(timeout);
    unsubscribe?.();
  };
}

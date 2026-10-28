"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { FirebaseAuthUser, FirebaseWebRuntimeConfig } from "@alvo/firebase";
import type { AppRole, TenantRuntimeSnapshot } from "@alvo/types";
import { readBrowserStorage, writeBrowserStorage } from "../src/lib/browser-storage";
import { startAuthSession } from "../src/lib/auth-bootstrap";

interface AuthContextValue {
  firebaseReady: boolean;
  authError: string | null;
  retryAuth: () => void;
  configured: boolean;
  user: FirebaseAuthUser | null;
  roles: AppRole[];
  tenantRuntime: TenantRuntimeSnapshot | null;
  tenantReady: boolean;
  organizationId: string;
  firebaseConfig: FirebaseWebRuntimeConfig;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  switchOrganization: (orgId: string) => void;
  refreshRoles: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const DEFAULT_ORGANIZATION_ID = "org_alvo_demo";
const LS_ORG_KEY = "alvo_active_org";

const AuthContext = createContext<AuthContextValue | null>(null);

function createFirebaseWebRuntimeConfigFromEnv(
  env: Record<string, string | undefined>
): FirebaseWebRuntimeConfig {
  return {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
    useEmulator: env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
  };
}

function isFirebaseWebRuntimeConfigured(config: FirebaseWebRuntimeConfig) {
  const fields = ["apiKey", "authDomain", "projectId", "storageBucket"] as const;
  return fields.every((field) => !!config[field]);
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authAttempt, setAuthAttempt] = useState(0);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [tenantRuntime, setTenantRuntime] = useState<TenantRuntimeSnapshot | null>(null);
  const [tenantReady, setTenantReady] = useState(false);
  // Só é true depois que o custom claim `organizationId` do usuário foi
  // resolvido — evita que o bootstrap de tenant rode com o organizationId
  // placeholder (localStorage/default) e depois DE NOVO com o real,
  // dobrando todas as leituras do primeiro carregamento.
  const [orgResolved, setOrgResolved] = useState(false);
  const [organizationId, setOrganizationId] = useState(() => {
    if (typeof window !== "undefined") {
      return readBrowserStorage(LS_ORG_KEY) ?? DEFAULT_ORGANIZATION_ID;
    }
    return DEFAULT_ORGANIZATION_ID;
  });

  const firebaseConfig = useMemo(
    () =>
      createFirebaseWebRuntimeConfigFromEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        NEXT_PUBLIC_USE_FIREBASE_EMULATOR: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR
      }),
    []
  );

  const configured = isFirebaseWebRuntimeConfigured(firebaseConfig);

  useEffect(() => {
    if (!configured) {
      setFirebaseReady(false);
      return;
    }

    setAuthError(null);
    return startAuthSession({
      config: firebaseConfig,
      loadSdk: () => import("@alvo/firebase"),
      onUser: (nextUser) => {
        setUser(nextUser);
        setFirebaseReady(true);
        setAuthError(null);
      },
      onUnavailable: () => setAuthError("Não foi possível carregar o acesso. Confira sua conexão e tente novamente."),
    });
  }, [configured, firebaseConfig, authAttempt]);

  const retryAuth = useCallback(() => {
    setAuthError(null);
    setFirebaseReady(false);
    setAuthAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    if (!firebaseReady || !user) {
      setOrganizationId(DEFAULT_ORGANIZATION_ID);
      setOrgResolved(false);
      return;
    }
    let cancelled = false;
    user.getIdTokenResult().then((result) => {
      if (cancelled) return;
      const claimOrgId = result.claims["organizationId"];
      if (typeof claimOrgId === "string" && claimOrgId) {
        setOrganizationId(claimOrgId);
      }
      setOrgResolved(true);
    }).catch(() => {
      // keep default — mas libera o bootstrap com o org atual
      if (!cancelled) setOrgResolved(true);
    });
    return () => { cancelled = true; };
  }, [firebaseReady, user]);

  useEffect(() => {
    if (!configured || !firebaseReady) {
      setTenantRuntime(null);
      setTenantReady(false);
      return;
    }

    if (!user) {
      setRoles([]);
      setTenantRuntime(null);
      setTenantReady(true);
      return;
    }

    // Aguarda o claim resolver antes de carregar o tenant — senão o
    // bootstrap inteiro (org + user + snapshot) roda com o organizationId
    // placeholder e é refeito quando o claim chega.
    if (!orgResolved) {
      return;
    }

    let cancelled = false;
    const currentUser = user;

    async function loadTenantRuntime() {
      try {
        const sdk = await import("@alvo/firebase");
        if (cancelled) return;

        // Self-heal: se o organizationId em uso (vindo de localStorage de
        // uma sessão antiga) não corresponde a nenhuma organização real,
        // não insiste tentando provisionar acesso nela — volta pro default
        // em vez de deixar o usuário preso numa conta fantasma.
        const orgExists = await sdk.fetchOrganizationById(firebaseConfig, organizationId);
        if (!orgExists) {
          if (organizationId !== DEFAULT_ORGANIZATION_ID) {
            writeBrowserStorage(LS_ORG_KEY, null);
            if (!cancelled) setOrganizationId(DEFAULT_ORGANIZATION_ID);
            return;
          }
          if (!cancelled) setTenantRuntime(null);
          return;
        }

        // Fetch existing roles before overwriting
        const existingUser = await sdk.fetchTenantUser(firebaseConfig, {
          organizationId,
          userId: currentUser.uid,
        });

        if (cancelled) return;

        // Only set default role on first access (no existing user doc)
        const userRoles: AppRole[] =
          existingUser?.isActive === false
            ? []
            : (existingUser?.roles ?? ["church_admin"]);

        if (!existingUser) {
          await sdk.ensureTenantUserAccess(firebaseConfig, {
            organizationId,
            userId: currentUser.uid,
            email: currentUser.email ?? "",
            roles: userRoles,
          });
        }

        if (!cancelled) setRoles(userRoles);

        const snapshot = await sdk.fetchTenantRuntimeSnapshot(firebaseConfig, { organizationId });

        if (!cancelled) setTenantRuntime(snapshot);
      } catch {
        if (!cancelled) setTenantRuntime(null);
      } finally {
        if (!cancelled) setTenantReady(true);
      }
    }

    void loadTenantRuntime();
    return () => { cancelled = true; };
  }, [configured, firebaseConfig, firebaseReady, organizationId, orgResolved, user]);

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);
  const hasAnyRole = useCallback((required: AppRole[]) => required.some((r) => roles.includes(r)), [roles]);

  const switchOrganization = useCallback((orgId: string) => {
    writeBrowserStorage(LS_ORG_KEY, orgId);
    setOrganizationId(orgId);
    setTenantReady(false);
    setTenantRuntime(null);
    setRoles([]);
  }, []);

  const refreshRoles = useCallback(async () => {
    if (!user) return;
    const sdk = await import("@alvo/firebase");
    const existing = await sdk.fetchTenantUser(firebaseConfig, {
      organizationId,
      userId: user.uid,
    });
    if (existing) setRoles(existing.roles);
  }, [firebaseConfig, organizationId, user]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!configured) throw new Error("Firebase nao configurado.");
    const sdk = await import("@alvo/firebase");
    await sdk.signInWithFirebaseEmailPassword({ config: firebaseConfig, email, password });
  }, [configured, firebaseConfig]);

  const signOut = useCallback(async () => {
    if (!configured) return;
    const sdk = await import("@alvo/firebase");
    await sdk.signOutFromFirebase(firebaseConfig);
  }, [configured, firebaseConfig]);

  // Memoizado: sem isso, cada render de AppProviders criava um objeto novo
  // e re-renderizava todo consumidor de useAppAuth (praticamente o app
  // inteiro), mesmo quando nada relevante mudou.
  const contextValue = useMemo<AuthContextValue>(
    () => ({
      firebaseReady,
      authError,
      retryAuth,
      configured,
      user,
      roles,
      tenantRuntime,
      tenantReady,
      organizationId,
      firebaseConfig,
      hasRole,
      hasAnyRole,
      switchOrganization,
      refreshRoles,
      signIn,
      signOut
    }),
    [
      firebaseReady,
      authError,
      retryAuth,
      configured,
      user,
      roles,
      tenantRuntime,
      tenantReady,
      organizationId,
      firebaseConfig,
      hasRole,
      hasAnyRole,
      switchOrganization,
      refreshRoles,
      signIn,
      signOut
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAppAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAppAuth deve ser usado dentro de um AppProviders");
  return context;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  ensureTenantUserAccess,
  fetchTenantRuntimeSnapshot,
  isFirebaseWebRuntimeConfigured,
  signInWithFirebaseEmailPassword,
  signOutFromFirebase,
  subscribeToFirebaseAuthState,
  type FirebaseAuthUser,
  type FirebaseWebRuntimeConfig
} from "@alvo/firebase";
import type { TenantRuntimeSnapshot } from "@alvo/types";

interface AuthContextValue {
  firebaseReady: boolean;
  configured: boolean;
  user: FirebaseAuthUser | null;
  tenantRuntime: TenantRuntimeSnapshot | null;
  tenantReady: boolean;
  organizationId: string;
  firebaseConfig: FirebaseWebRuntimeConfig;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const DEFAULT_ORGANIZATION_ID = "org_alvo_demo";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [tenantRuntime, setTenantRuntime] = useState<TenantRuntimeSnapshot | null>(null);
  const [tenantReady, setTenantReady] = useState(false);
  const [organizationId, setOrganizationId] = useState(DEFAULT_ORGANIZATION_ID);

  const firebaseConfig = useMemo(
    () =>
      createFirebaseWebRuntimeConfigFromEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      }),
    []
  );

  const configured = isFirebaseWebRuntimeConfigured(firebaseConfig);

  useEffect(() => {
    if (!configured) {
      setFirebaseReady(false);
      return;
    }

    const unsubscribe = subscribeToFirebaseAuthState(firebaseConfig, (nextUser) => {
      setUser(nextUser);
      setFirebaseReady(true);
    });

    return () => unsubscribe();
  }, [configured, firebaseConfig]);

  useEffect(() => {
    if (!configured || !firebaseReady || !user) {
      setTenantRuntime(null);
      setTenantReady(false);
      return;
    }

    let cancelled = false;
    const currentUser = user;

    async function loadTenantRuntime() {
      try {
        await ensureTenantUserAccess(firebaseConfig, {
          organizationId,
          userId: currentUser.uid,
          email: currentUser.email ?? "",
          roles: ["church_admin"]
        });

        const snapshot = await fetchTenantRuntimeSnapshot(firebaseConfig, {
          organizationId
        });

        if (!cancelled) {
          setTenantRuntime(snapshot);
        }
      } catch {
        if (!cancelled) {
          setTenantRuntime(null);
        }
      } finally {
        if (!cancelled) {
          setTenantReady(true);
        }
      }
    }

    void loadTenantRuntime();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  return (
    <AuthContext.Provider
      value={{
        firebaseReady,
        configured,
        user,
        tenantRuntime,
        tenantReady,
        organizationId,
        firebaseConfig,
        signIn: async (email, password) => {
          if (!configured) {
            throw new Error("Firebase nao configurado.");
          }

          await signInWithFirebaseEmailPassword({
            config: firebaseConfig,
            email,
            password
          });
        },
        signOut: async () => {
          if (!configured) {
            return;
          }

          await signOutFromFirebase(firebaseConfig);
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAppAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAppAuth deve ser usado dentro de um AppProviders");
  }
  return context;
}

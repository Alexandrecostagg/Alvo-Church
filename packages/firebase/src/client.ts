declare var process: any;

type FirebaseClientHandles = {
  auth?: any;
  firestore?: any;
};

export function getClientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.FIREBASE_PROJECT_ID ?? "alvo-church",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? ""
  };
}

export async function initClient(): Promise<FirebaseClientHandles> {
  if (typeof window === "undefined") return {};

  const config = getClientConfig();
  const { initializeApp, getApps } = await import("firebase/app");
  if (getApps().length === 0) {
    initializeApp(config);
  }

  const { getAuth, connectAuthEmulator } = await import("firebase/auth");
  const { getFirestore, connectFirestoreEmulator } = await import("firebase/firestore");

  const auth = getAuth();
  const firestore = getFirestore();

  const useEmulator = typeof window !== "undefined" && (location.hostname === "localhost" || process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true");
  if (useEmulator) {
    try {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true } as any);
      connectFirestoreEmulator(firestore, "localhost", 8080);
    } catch (e) {
      // ignore if emulators are not available
      // eslint-disable-next-line no-console
      console.warn("Failed to connect to firebase emulators:", e);
    }
  }

  return { auth, firestore };
}
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  inMemoryPersistence,
  type Auth,
  type User
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import type { BrandAssetKind, TenantBrandAssetUploadResponse } from "@alvo/types";

export interface FirebaseWebRuntimeConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId?: string;
  appId?: string;
  useEmulator?: boolean;
}

export type FirebaseAuthUser = User;
export type FirebaseRuntimeConfig = FirebaseWebRuntimeConfig;

const REQUIRED_FIREBASE_WEB_CONFIG_FIELDS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId"
] as const;

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseMobileAuth: Auth | null = null;
let firebaseFirestore: Firestore | null = null;

export function isFirebaseWebRuntimeConfigured(config: FirebaseWebRuntimeConfig) {
  return getMissingFirebaseWebRuntimeConfigFields(config).length === 0;
}

export function getMissingFirebaseWebRuntimeConfigFields(
  config: FirebaseWebRuntimeConfig
) {
  return REQUIRED_FIREBASE_WEB_CONFIG_FIELDS.filter((field) => !config[field]);
}

export function createFirebaseWebRuntimeConfigFromEnv(
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

export function createFirebaseRuntimeConfigFromEnv(
  env: Record<string, string | undefined>,
  prefix: "NEXT_PUBLIC" | "EXPO_PUBLIC"
): FirebaseRuntimeConfig {
  return {
    apiKey: env[`${prefix}_FIREBASE_API_KEY`] ?? "",
    authDomain: env[`${prefix}_FIREBASE_AUTH_DOMAIN`] ?? "",
    projectId: env[`${prefix}_FIREBASE_PROJECT_ID`] ?? "",
    storageBucket: env[`${prefix}_FIREBASE_STORAGE_BUCKET`] ?? "",
    messagingSenderId: env[`${prefix}_FIREBASE_MESSAGING_SENDER_ID`],
    appId: env[`${prefix}_FIREBASE_APP_ID`],
    useEmulator: env[`${prefix}_USE_FIREBASE_EMULATOR`] === "true"
  };
}

export function getFirebaseWebApp(config: FirebaseWebRuntimeConfig) {
  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
  }

  return firebaseApp;
}

export function getFirebaseWebAuth(config: FirebaseWebRuntimeConfig) {
  if (!firebaseAuth) {
    const app = getFirebaseWebApp(config);
    firebaseAuth =
      getApps().length > 0
        ? getAuth(app)
        : initializeAuth(app, {
            persistence: typeof window !== "undefined" ? browserLocalPersistence : inMemoryPersistence
          });
          
    if (config.useEmulator) {
      connectAuthEmulator(firebaseAuth, "http://localhost:9099");
    }
  }

  return firebaseAuth;
}

export function getFirebaseFirestore(config: FirebaseWebRuntimeConfig) {
  if (!firebaseFirestore) {
    const app = getFirebaseWebApp(config);
    firebaseFirestore = getFirestore(app);
    
    if (config.useEmulator) {
      connectFirestoreEmulator(firebaseFirestore, "localhost", 8080);
    }
  }

  return firebaseFirestore;
}

export function subscribeToFirebaseAuthState(
  config: FirebaseWebRuntimeConfig,
  callback: (user: FirebaseAuthUser | null) => void
) {
  const auth = getFirebaseWebAuth(config);
  return onAuthStateChanged(auth, callback);
}

export async function signInWithFirebaseEmailPassword(params: {
  config: FirebaseWebRuntimeConfig;
  email: string;
  password: string;
}) {
  const auth = getFirebaseWebAuth(params.config);
  return signInWithEmailAndPassword(auth, params.email, params.password);
}

export async function signOutFromFirebase(config: FirebaseWebRuntimeConfig) {
  const auth = getFirebaseWebAuth(config);
  await signOut(auth);
}

export async function registerWithFirebaseEmailPassword(params: {
  config: FirebaseWebRuntimeConfig;
  email: string;
  password: string;
  displayName: string;
}) {
  const auth = getFirebaseWebAuth(params.config);
  const credential = await createUserWithEmailAndPassword(auth, params.email, params.password);
  await updateProfile(credential.user, { displayName: params.displayName });
  return credential;
}

export function getFirebaseMobileAuth(config: FirebaseRuntimeConfig) {
  if (!firebaseMobileAuth) {
    const app = getFirebaseWebApp(config);
    firebaseMobileAuth = getAuth(app);
  }

  return firebaseMobileAuth;
}

export function subscribeToFirebaseMobileAuthState(
  config: FirebaseRuntimeConfig,
  callback: (user: FirebaseAuthUser | null) => void
) {
  const auth = getFirebaseMobileAuth(config);
  return onAuthStateChanged(auth, callback);
}

export async function signInWithFirebaseMobileEmailPassword(params: {
  config: FirebaseRuntimeConfig;
  email: string;
  password: string;
}) {
  const auth = getFirebaseMobileAuth(params.config);
  return signInWithEmailAndPassword(auth, params.email, params.password);
}

export async function signOutFromFirebaseMobile(config: FirebaseRuntimeConfig) {
  const auth = getFirebaseMobileAuth(config);
  await signOut(auth);
}

export async function sendPasswordResetEmailMobile(config: FirebaseRuntimeConfig, email: string) {
  const auth = getFirebaseMobileAuth(config);
  await sendPasswordResetEmail(auth, email);
}

export async function registerWithFirebaseMobileEmailPassword(params: {
  config: FirebaseRuntimeConfig;
  email: string;
  password: string;
  displayName: string;
}) {
  const auth = getFirebaseMobileAuth(params.config);
  const credential = await createUserWithEmailAndPassword(auth, params.email, params.password);
  await updateProfile(credential.user, { displayName: params.displayName });
  return credential;
}

export function createTenantUploadApiBaseUrlFromEnv(
  env: Record<string, string | undefined>,
  prefix: "NEXT_PUBLIC" | "EXPO_PUBLIC"
) {
  return env[`${prefix}_UPLOAD_API_BASE_URL`] ?? "";
}

export async function uploadOrganizationBrandAsset(params: {
  uploadApiBaseUrl: string;
  organizationId: string;
  assetKind: BrandAssetKind;
  file: File;
  authToken?: string;
}): Promise<TenantBrandAssetUploadResponse> {
  if (!params.uploadApiBaseUrl) {
    throw new Error("Cloudflare upload API nao configurada.");
  }

  const formData = new FormData();
  formData.append("organizationId", params.organizationId);
  formData.append("assetKind", params.assetKind);
  formData.append("file", params.file);

  const response = await fetch(`${params.uploadApiBaseUrl.replace(/\/$/, "")}/tenant-assets/upload`, {
    method: "POST",
    headers: params.authToken
      ? {
          Authorization: `Bearer ${params.authToken}`
        }
      : undefined,
    body: formData
  });

  const payload = (await response.json()) as Partial<TenantBrandAssetUploadResponse> & {
    error?: string;
  };

  if (!response.ok || !payload.success || !payload.publicUrl || !payload.objectKey) {
    throw new Error(payload.error ?? "Nao foi possivel enviar o asset para a Cloudflare.");
  }

  return payload as TenantBrandAssetUploadResponse;
}

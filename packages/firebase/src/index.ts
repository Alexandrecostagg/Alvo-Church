export async function initializeFirebase() {
  return {
    message: 'firebase initialized (stub)'
  };
}

export { initClient, getClientConfig } from './client';
export * from "./client";
export * from "./repositories";
export * from "./orgFeatures";
export * from "./paths";
export {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";

export interface FirebaseAppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface FirebaseEnvironment {
  projectId: string;
  authDomain: string;
  storageBucket: string;
}

export function createFirebaseConfig(projectId: string): FirebaseAppConfig {
  return {
    apiKey: "",
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: `${projectId}.firebasestorage.app`
  };
}

export function createFirebaseEnvironment(projectId = "alvo-church"): FirebaseEnvironment {
  return {
    projectId,
    authDomain: `${projectId}.firebaseapp.com`,
    storageBucket: `${projectId}.firebasestorage.app`
  };
}

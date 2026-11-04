import { inMemoryPersistence } from "firebase/auth";
export interface MobileAuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
// Node/web fallback. Metro resolves native-persistence.native.ts on devices.
export function mobileAuthPersistence(_storage: MobileAuthStorage) { return inMemoryPersistence; }

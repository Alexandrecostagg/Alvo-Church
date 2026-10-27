import { describe, expect, it, vi } from "vitest";
const memory = vi.hoisted(() => new Map<string, string>());
vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => memory.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { if (!/^[\w.-]+$/.test(key)) throw new Error("Invalid key"); memory.set(key, value); },
  deleteItemAsync: async (key: string) => { memory.delete(key); },
}));
vi.mock("expo-crypto", () => ({ CryptoDigestAlgorithm: { SHA256: "sha256" }, digestStringAsync: async (_algorithm: string, key: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)))).map(b => b.toString(16).padStart(2, "0")).join("") }));
import { secureAuthStorage } from "./secure-auth-storage";
describe("secure auth storage adapter", () => {
  it("round-trips Firebase keys and deletes only the matching session", async () => {
    await secureAuthStorage.setItem("firebase:authUser:demo:[DEFAULT]", "fictional-session");
    await secureAuthStorage.setItem("firebase_authUser:demo:[DEFAULT]", "other-fictional-session");
    expect(await secureAuthStorage.getItem("firebase:authUser:demo:[DEFAULT]")).toBe("fictional-session");
    await secureAuthStorage.removeItem("firebase:authUser:demo:[DEFAULT]");
    expect(await secureAuthStorage.getItem("firebase:authUser:demo:[DEFAULT]")).toBeNull();
    expect(await secureAuthStorage.getItem("firebase_authUser:demo:[DEFAULT]")).toBe("other-fictional-session");
  });
});

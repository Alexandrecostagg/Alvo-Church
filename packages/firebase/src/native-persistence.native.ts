import * as FirebaseAuth from "firebase/auth";
import type { Persistence } from "firebase/auth";
import type { MobileAuthStorage } from "./native-persistence";
// Firebase exposes this factory only through its React Native entry point.
export function mobileAuthPersistence(storage: MobileAuthStorage): Persistence {
  const factory = (FirebaseAuth as unknown as { getReactNativePersistence: (storage: MobileAuthStorage) => Persistence }).getReactNativePersistence;
  if (typeof factory !== "function") throw new Error("Persistência nativa de autenticação indisponível.");
  return factory(storage);
}

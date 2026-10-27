import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
// Firebase keys contain ':'; SecureStore accepts only alphanumeric, '.', '_' and '-'.
const keyFor = async (key: string) => `esdras.auth.${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key)}`;
export const secureAuthStorage = {
  getItem: async (key: string) => SecureStore.getItemAsync(await keyFor(key)),
  setItem: async (key: string, value: string) => SecureStore.setItemAsync(await keyFor(key), value),
  removeItem: async (key: string) => SecureStore.deleteItemAsync(await keyFor(key)),
};

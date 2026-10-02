import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, ".env.local"), "utf8");
const keys = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
  "EXPO_PUBLIC_WEB_API_URL",
];
const entries = new Map(
  source.split(/\r?\n/)
    .filter((line) => /^EXPO_PUBLIC_[A-Z0-9_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
);
const missing = keys.filter((key) => !entries.get(key));
if (missing.length) throw new Error(`Variáveis públicas mobile ausentes: ${missing.join(", ")}`);

const destination = join(root, "apps/mobile/.env.local");
writeFileSync(destination, keys.map((key) => `${key}=${entries.get(key)}`).join("\n") + "\n", { mode: 0o600 });
console.log("Variáveis públicas do app preparadas para o Xcode em apps/mobile/.env.local.");

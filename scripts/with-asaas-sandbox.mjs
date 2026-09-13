import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2];
if (!["serve", "verify", "status"].includes(mode)) throw new Error("Use serve, verify ou status.");
const selfTest = mode === "verify";
let config = {};
if (!selfTest) {
  try { config = parseEnv(readFileSync(new URL("../.env.asaas-sandbox.local", import.meta.url), "utf8")); }
  catch { throw new Error("Preencha .env.asaas-sandbox.local a partir de scripts/asaas-sandbox.env.example."); }
}
const key = selfTest ? "sandbox-local-fixture" : config.ASAAS_SANDBOX_API_KEY;
const token = selfTest ? randomBytes(32).toString("hex") : config.ASAAS_SANDBOX_WEBHOOK_TOKEN;
if (!key || /\s/.test(key) || key.startsWith("$aact_prod")) throw new Error("Informe uma chave exclusiva do Sandbox no arquivo local.");
if (!token || !/^\S{32,255}$/.test(token)) throw new Error("Informe o token do webhook Sandbox (32 a 255 caracteres sem espaços).");

// Never load the workspace .env or inherit production billing/Google credentials.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  !/ASAAS|FIREBASE|FIRESTORE|GOOGLE|GCLOUD|GCP|WORKER_API|NODE_OPTIONS/.test(name)));
Object.assign(env, {
  NODE_ENV: "development",
  FIREBASE_PROJECT_ID: "demo-alvo-qa", GCLOUD_PROJECT: "demo-alvo-qa",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-alvo-qa",
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR: "true",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  ASAAS_API_BASE_URL: "https://api-sandbox.asaas.com/v3",
  ASAAS_API_KEY: key, ASAAS_WEBHOOK_TOKEN: token,
});
const script = selfTest ? "scripts/verify-asaas-sandbox.ts" : "scripts/asaas-sandbox.ts";
const child = spawn(process.execPath, ["--import", "tsx", script, mode], { cwd: root, env, stdio: "inherit" });
child.on("error", () => { console.error("Não foi possível iniciar a homologação."); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));

import { spawn } from "node:child_process";

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("Informe o comando de homologação local.");

// A demo project cannot fall back to production Firebase resources.
const child = spawn(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    FIREBASE_PROJECT_ID: "demo-alvo-qa",
    GCLOUD_PROJECT: "demo-alvo-qa",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    NEXT_PUBLIC_USE_FIREBASE_EMULATOR: "true",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-alvo-qa",
    NEXT_PUBLIC_FIREBASE_API_KEY: "demo-alvo-qa-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-alvo-qa.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-alvo-qa.firebasestorage.app",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:1234567890:web:localqa",
  },
});
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

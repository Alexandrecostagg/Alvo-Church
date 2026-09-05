import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn("corepack", ["pnpm", ...args], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${args.join(" ")} exited ${code}`)),
    );
  });
// Requires emulators:exec with demo-alvo-qa. Never falls back to production.
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST
)
  throw new Error("Execute dentro dos emuladores de QA.");
await run(["qa:seed"]);
const log = createWriteStream(join(tmpdir(), "alvo-ci-web.log"));
const web = spawn("corepack", ["pnpm", "qa:web"], {
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
});
web.stdout.pipe(log);
web.stderr.pipe(log);
try {
  const deadline = Date.now() + 120000;
  let ready = false;
  while (Date.now() < deadline) {
    if (web.exitCode !== null)
      throw new Error("Painel de QA encerrou antes de iniciar.");
    try {
      const r = await fetch("http://127.0.0.1:3001/api/members", {
        method: "POST",
        signal: AbortSignal.timeout(3000),
      });
      if (r.status === 401) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready)
    throw new Error("Painel de QA não iniciou; consulte /tmp/alvo-ci-web.log.");
  for (const task of [
    "qa:registration",
    "qa:member-pass",
    "qa:kids-custody",
    "qa:kids-media",
    "qa:delivery6",
  ])
    await run([task]);
} finally {
  if (web.pid) {
    try {
      process.kill(-web.pid, "SIGTERM");
    } catch {}
  }
  log.end();
}

// Exercise the built Worker, not Next's development server. No authenticated
// business requests, provider calls or remote bindings are used by this check.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const port = await freePort();
const inspectorPort = await freePort();
const persistence = await mkdtemp(join(tmpdir(), "esdras-worker-smoke-"));
const child = spawn("corepack", [
  "pnpm", "--filter", "@alvo/web", "exec", "wrangler", "dev",
  "--local", "--ip", "127.0.0.1", "--port", String(port),
  "--inspector-port", String(inspectorPort), "--persist-to", persistence,
  "--log-level", "error",
], {
  detached: true,
  stdio: ["ignore", "ignore", "ignore"],
  env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
});
let startError;
child.once("error", error => { startError = error; });
const base = `http://127.0.0.1:${port}`;
const request = (path, options) => fetch(base + path, {
  ...options, signal: AbortSignal.timeout(5000),
});
try {
  const deadline = Date.now() + 120_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (startError) throw startError;
    if (child.exitCode !== null) throw new Error("Worker local encerrou antes de iniciar.");
    try {
      const response = await request("/api/qr?data=synthetic-runtime-probe");
      await response.body?.cancel();
      if (response.status === 200) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert(ready, "Worker compilado não respondeu 200; verifique a compatibilidade Next/OpenNext.");
  const qr = await request("/api/qr?data=synthetic-runtime-probe");
  assert.equal(qr.status, 200);
  assert.deepEqual([...new Uint8Array(await qr.arrayBuffer()).slice(0,8)], [137,80,78,71,13,10,26,10]);
  const login = await request("/login");
  assert.equal(login.status, 200);
  assert.equal(login.headers.get("x-frame-options"), "DENY");
  await login.body?.cancel();
  const checkout = await request("/api/billing/checkout", { method: "POST" });
  assert.equal(checkout.status, 401);
  await checkout.body?.cancel();
  console.log("Built Worker runtime: PNG generation, login and anonymous checkout denial passed.");
} finally {
  if (child.pid) {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
    await Promise.race([
      new Promise(resolve => child.once("exit", resolve)),
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);
    try { process.kill(-child.pid, "SIGKILL"); } catch {}
  }
  await rm(persistence, {recursive:true, force:true});
}

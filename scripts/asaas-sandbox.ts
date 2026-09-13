import { createSandboxReceiver, assertSandbox, sandboxOrg } from "./asaas-sandbox-server";
import { accountTransaction } from "../apps/web/app/api/_lib/member-account-store";

async function main() {
  assertSandbox();
  // Fail before listening when the isolated database is unavailable.
  const [org, subscription] = await accountTransaction(tx => tx.read(
    `organizations/${sandboxOrg}`, `organizations/${sandboxOrg}/settings/subscription`));
  if (process.argv[2] === "status") {
    console.log(JSON.stringify({ environment: "sandbox", organizationPrepared: Boolean(org), plan: subscription?.plan || null }));
    return;
  }
  const server = createSandboxReceiver();
  server.listen(3012, "127.0.0.1", () => console.log("Receptor Sandbox: 127.0.0.1:3012/api/billing/webhook. Banco demo local; apenas organização de QA."));
  server.on("error", () => { console.error("Não foi possível abrir a porta 3012."); process.exitCode = 1; });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.close());
}
main().catch(() => { console.error("Sandbox não iniciado. Confira credenciais locais e emuladores."); process.exitCode = 1; });

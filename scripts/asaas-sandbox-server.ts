import { createServer } from "node:http";
import { isLocalQaFirebase } from "../apps/web/app/api/_lib/firebase-server-env";
import { safeStringCompare } from "../apps/web/app/api/_lib/safe-compare";
import { POST } from "../apps/web/app/api/billing/webhook/route";

export const sandboxOrg = process.env.ASAAS_QA_ORG_ID || "qa_asaas_sandbox";
export function assertSandbox() {
  if (!/^qa_asaas_[a-z0-9_-]{1,80}$/.test(sandboxOrg) || !isLocalQaFirebase() || process.env.FIREBASE_PROJECT_ID !== "demo-alvo-qa" ||
      process.env.ASAAS_API_BASE_URL !== "https://api-sandbox.asaas.com/v3" ||
      !process.env.ASAAS_API_KEY || !/^\S{32,255}$/.test(process.env.ASAAS_WEBHOOK_TOKEN || "") ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Homologação exige Sandbox Asaas e Firebase demo local, sem credenciais de produção.");
  }
}

// Expose only this receiver, never the Next dev server or the emulator APIs.
export function createSandboxReceiver() {
  assertSandbox();
  return createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 8192 }, async (req, res) => {
    res.setHeader("cache-control", "private, no-store");
    const reply = (status: number, data: object) => {
      res.writeHead(status, { "content-type": "application/json", "connection": "close" });
      res.end(JSON.stringify(data));
    };
    try {
      assertSandbox();
      if (req.method !== "POST" || req.url !== "/api/billing/webhook") return reply(404, { error: "Não encontrado." });
      const token = req.headers["asaas-access-token"];
      if (typeof token !== "string" || !safeStringCompare(process.env.ASAAS_WEBHOOK_TOKEN!, token)) return reply(401, { error: "Token inválido." });
      const chunks: Buffer[] = [];
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 64000) return reply(413, { error: "Evento muito grande." });
        chunks.push(Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks).toString("utf8");
      let payload;
      try { payload = JSON.parse(body); } catch { return reply(400, { error: "JSON inválido." }); }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return reply(400, { error: "Evento inválido." });
      const resource = String(payload.event || "").startsWith("SUBSCRIPTION_") ? payload.subscription : payload.payment;
      if (resource?.externalReference !== `order:${sandboxOrg}:subscription`) {
        return reply(200, { ok: true, ignored: true, reason: "outside_sandbox_fixture" });
      }
      // Use the application's actual authentication, validation and reconciliation.
      const request = new Request("http://127.0.0.1/api/billing/webhook", {
        method: "POST", headers: { "content-type": "application/json", "asaas-access-token": token }, body,
      });
      const result = await POST(request as Parameters<typeof POST>[0]);
      const resultText = await result.text();
      res.writeHead(result.status, Object.fromEntries(result.headers));
      res.end(resultText);
      console.log(`Sandbox webhook: HTTP ${result.status}`);
      if (!result.ok) console.log(JSON.stringify({ error: JSON.parse(resultText).error, eventIdLength: String(payload.id || "").length, dateCreatedPresent: Boolean(payload.dateCreated) }));
    } catch {
      if (!res.headersSent) reply(503, { error: "Receptor indisponível; tente novamente." });
      else res.end();
    }
  });
}

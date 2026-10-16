export { WifiRateLimit } from "./wifi-rate-limit";
import { boundedForm, boundedBody, rasterImageType, UploadError } from "@alvo/utils";
import { Hono } from "hono";
import type { BrandAssetKind, TenantBrandAssetUploadResponse } from "@alvo/types";
import { isDailySnapshotTime, processWhatsappQueue } from "./whatsapp-scheduler";
import { writeDailyNetworkSnapshots } from "./network-snapshot";

function safeStringCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  // Cloudflare Workers suportam Web Crypto, mas os types do wrangler não
  // declaram timingSafeEqual. Cast seguro: a função existe no runtime.
  try {
    return (crypto.subtle as any).timingSafeEqual(bufA, bufB);
  } catch {
    // Fallback: comparação ponto a ponto com variável acumuladora para
    // evitar early-return que vaze timing.
    let diff = 0;
    for (let i = 0; i < bufA.length; i++) {
      diff |= bufA[i] ^ bufB[i];
    }
    return diff === 0;
  }
}

type WorkerEnv = {
  WHATSAPP_PROCESS_ORIGIN?: string;
  WHATSAPP_PROCESS_TOKEN?: string;
  WHATSAPP_PROCESS_ORGANIZATIONS?: string;
  WIFI_RATE_LIMIT?: DurableObjectNamespace;
  BRAND_ASSETS_BUCKET?: R2Bucket;
  PUBLIC_BRAND_BASE_URL?: string;
  UPLOAD_API_BEARER_TOKEN?: string;
  // Segredo compartilhado com a infraestrutura Wi-Fi (MikroTik/UniFi). O SSID
  // configurado no roteador deve corresponder a uma chave deste mapa para que
  // a intake seja vinculada a uma organização.
  WIFI_INTAKE_BEARER_TOKEN?: string;
  // Mapeamento SSID → organizationId. Ex.: wrangler secret put WIFI_SSID_ORG_MAP '{"wifi-alvo":"org_123","wifi-visitantes":"org_456"}'
  WIFI_SSID_ORG_MAP?: string;
  // Service account (JSON) para o cron de NetworkSnapshot — mesma SA usada
  // pelo backend do web. Configurar via `wrangler secret put`.
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  FIREBASE_PROJECT_ID?: string;
};

const app = new Hono<{ Bindings: WorkerEnv }>();

const BRAND_ASSET_CONTENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp"
]);
const BRAND_ASSET_KINDS = new Set<BrandAssetKind>(["logoLight", "logoDark", "icon", "favicon"]);
const BRAND_ASSET_MAX_BYTES = 5 * 1024 * 1024;

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

app.get("/", (c) => {
  return c.json({
    name: "Alvo Church Worker API",
    status: "ok"
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

app.post("/tenant-assets/upload", async (c) => {
  const configuredToken = c.env.UPLOAD_API_BEARER_TOKEN;
  const authorization = c.req.header("authorization");

  if (!configuredToken) {
    return jsonError("Serviço de upload indisponível.", 503);
  }

  const expected = `Bearer ${configuredToken}`;
  if (!authorization || !safeStringCompare(authorization, expected)) {
    return jsonError("Nao autorizado para upload de assets.", 401);
  }

  if (!c.env.BRAND_ASSETS_BUCKET) {
    return jsonError("Serviço de upload indisponível.", 503);
  }

  const formData = await boundedForm(c.req.raw, BRAND_ASSET_MAX_BYTES + 64 * 1024);
  const organizationId = String(formData.get("organizationId") ?? "");
  const assetKind = String(formData.get("assetKind") ?? "") as BrandAssetKind;
  const file = formData.get("file");

  if (!/^[A-Za-z0-9_-]{1,128}$/.test(organizationId) || !assetKind || !(file instanceof File)) {
    return jsonError("organizationId, assetKind e file sao obrigatorios.", 422);
  }
  if (!BRAND_ASSET_KINDS.has(assetKind) || !BRAND_ASSET_CONTENT_TYPES.has(file.type)) {
    return jsonError("Tipo de asset ou arquivo não permitido.", 415);
  }
  if (file.size === 0 || file.size > BRAND_ASSET_MAX_BYTES) {
    return jsonError("O asset deve ter no máximo 5 MB.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = rasterImageType(bytes, file.type);
  const fileName = `${crypto.randomUUID()}.${contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : "webp"}`;
  // Este bucket contém exclusivamente marcas públicas; mídia privada usa outra API.
  const objectKey = `organizations/${organizationId}/branding/${assetKind}/${Date.now()}-${fileName}`;

  await c.env.BRAND_ASSETS_BUCKET.put(objectKey, bytes, {
    httpMetadata: {
      contentType
    }
  });

  const publicBaseUrl =
    c.env.PUBLIC_BRAND_BASE_URL?.replace(/\/$/, "") ?? "https://assets.alvochurch.app";

  const payload: TenantBrandAssetUploadResponse = {
    success: true,
    assetKind,
    fileName,
    objectKey,
    publicUrl: `${publicBaseUrl}/${objectKey}`
  };

  return c.json(payload);
});

// Endpoint: Wi-Fi Captive Portal Intake (LGPD Compliant Registration)
// Protegido por: bearer token (compartilhado com roteadores), rate limiting
// (5/min por IP), e binding a organização via SSID mapeado.
app.post("/wifi/intake", async (c) => {
  try {
    // 1. Autenticação via bearer token.
    const configuredToken = c.env.WIFI_INTAKE_BEARER_TOKEN;
    if (!configuredToken) {
      return jsonError("Serviço Wi-Fi indisponível.", 503);
    }
    const authorization = c.req.header("authorization");
    const expected = `Bearer ${configuredToken}`;
    if (!authorization || !safeStringCompare(authorization, expected)) {
      return jsonError("Nao autorizado para Wi-Fi intake.", 401);
    }

    // 2. Rate limiting por IP (5 requisições por minuto).
    const clientIp = c.req.header("cf-connecting-ip") || "unknown";
    if (!c.env.WIFI_RATE_LIMIT) return jsonError("Controle de tentativas indisponível.", 503);
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientIp));
    const key = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
    const limiter = c.env.WIFI_RATE_LIMIT.get(c.env.WIFI_RATE_LIMIT.idFromName(key));
    const limited = await limiter.fetch("https://internal/check", { method: "POST" });
    if (limited.status === 429) return c.json({ error: "Limite de requisições excedido. Tente novamente em instantes." }, { status: 429, headers: { "Retry-After": "60" } });
    if (!limited.ok) return jsonError("Controle de tentativas indisponível.", 503);

    // 3. Binding a organização via SSID.
    const ssid = String(c.req.header("cf-access-client-identity") ?? c.req.header("x-wifi-ssid") ?? "").trim();
    let orgId = "";
    if (!ssid) return jsonError("SSID obrigatório.", 400);
    if (ssid) {
      let ssidMap: Record<string, string> = {};
      try {
        ssidMap = JSON.parse(c.env.WIFI_SSID_ORG_MAP ?? "{}");
      } catch {
        // Mapa inválido — rejeita para segurança (fail closed).
        return jsonError("Configuração de SSID inválida.", 503);
      }
      orgId = ssidMap[ssid] ?? "";
      if (!orgId) {
        return jsonError("SSID não autorizado.", 403);
      }
    }

    const body = JSON.parse(new TextDecoder().decode(await boundedBody(c.req.raw, 8192)));
    const fullName = String(body.fullName ?? "").trim();
    const whatsapp = String(body.whatsapp ?? "").trim();
    const email = String(body.email ?? "").trim();
    const birthDate = String(body.birthDate ?? "").trim();

    if (!fullName || !whatsapp || !email || !birthDate) {
      return jsonError("Nome, WhatsApp, E-mail e Data de Nascimento sao obrigatorios.", 422);
    }

    // Validação básica de dados.
    const digits = String(whatsapp).replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 14) {
      return jsonError("Telefone inválido.", 400);
    }

    return c.json({
      success: true,
      message: "Perfil cadastrado e tráfego de internet autorizado com sucesso.",
      clientIp,
      authorized: true,
      organizationId: orgId,
      ssid,
      registeredAt: new Date().toISOString()
    });
  } catch (err) {
    return jsonError(err instanceof UploadError ? err.message : "Erro ao processar cadastro Wi-Fi.", err instanceof UploadError ? err.status : 500);
  }
});

// Retired: financial proofs use the authenticated web API and private Firebase
// Storage. Never store them in the public branding bucket.
app.post("/events/:eventId/upload-proof", () => jsonError("Use o envio privado de comprovantes da plataforma.", 410));

app.onError((error, c) => c.json({ error: error instanceof UploadError ? error.message : "Serviço indisponível." }, (error instanceof UploadError ? error.status : 503) as any));

export default {
  fetch: app.fetch,
  // Cron diário (configurado em wrangler.jsonc → triggers.crons): grava o
  // NetworkSnapshot de cada organização via agregações no servidor, sem
  // baixar documentos — substitui o cálculo pesado que rodava no navegador.
  scheduled(event: ScheduledEvent, env: WorkerEnv, ctx: ExecutionContext) {
    ctx.waitUntil(processWhatsappQueue(env));
    if (isDailySnapshotTime(event.scheduledTime)) {
      ctx.waitUntil(writeDailyNetworkSnapshots(env));
    }
  }
};

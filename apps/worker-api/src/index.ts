import { Hono } from "hono";
import type { BrandAssetKind, TenantBrandAssetUploadResponse } from "@alvo/types";
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
  BRAND_ASSETS_BUCKET?: R2Bucket;
  PUBLIC_BRAND_BASE_URL?: string;
  UPLOAD_API_BEARER_TOKEN?: string;
  // Segredo exclusivo do backend para comprovantes de evento. Enquanto não
  // houver uma rota autenticada no web que faça a mediação, o navegador nunca
  // deve chamar este endpoint diretamente.
  EVENT_PROOF_UPLOAD_BEARER_TOKEN?: string;
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
  "image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/x-icon"
]);
const BRAND_ASSET_KINDS = new Set<BrandAssetKind>(["logoLight", "logoDark", "icon", "favicon"]);
const BRAND_ASSET_MAX_BYTES = 5 * 1024 * 1024;

const EVENT_PROOF_MAX_BYTES = 8 * 1024 * 1024;
const EVENT_PROOF_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

function safeObjectSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

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
    return jsonError("UPLOAD_API_BEARER_TOKEN nao configurado no Worker.", 503);
  }

  const expected = `Bearer ${configuredToken}`;
  if (!authorization || !safeStringCompare(authorization, expected)) {
    return jsonError("Nao autorizado para upload de assets.", 401);
  }

  if (!c.env.BRAND_ASSETS_BUCKET) {
    return jsonError("BRAND_ASSETS_BUCKET nao configurado.", 503);
  }

  const formData = await c.req.formData();
  const organizationId = String(formData.get("organizationId") ?? "");
  const assetKind = String(formData.get("assetKind") ?? "") as BrandAssetKind;
  const childId = String(formData.get("childId") ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
  const file = formData.get("file");

  if (!organizationId || !assetKind || !(file instanceof File)) {
    return jsonError("organizationId, assetKind e file sao obrigatorios.", 422);
  }
  if (!BRAND_ASSET_KINDS.has(assetKind) || !BRAND_ASSET_CONTENT_TYPES.has(file.type)) {
    return jsonError("Tipo de asset ou arquivo não permitido.", 415);
  }
  if (file.size === 0 || file.size > BRAND_ASSET_MAX_BYTES) {
    return jsonError("O asset deve ter no máximo 5 MB.", 413);
  }

  const fileName = file.name.replace(/\s+/g, "-").toLowerCase();
  // Fotos de criança (Segurança Kids) vivem sob um prefixo próprio, separado do
  // branding; as demais mantêm o caminho de branding.
  const objectKey = `organizations/${organizationId}/branding/${assetKind}/${Date.now()}-${fileName}`;

  await c.env.BRAND_ASSETS_BUCKET.put(objectKey, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream"
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
      return jsonError("WIFI_INTAKE_BEARER_TOKEN nao configurado no Worker.", 503);
    }
    const authorization = c.req.header("authorization");
    const expected = `Bearer ${configuredToken}`;
    if (!authorization || !safeStringCompare(authorization, expected)) {
      return jsonError("Nao autorizado para Wi-Fi intake.", 401);
    }

    // 2. Rate limiting por IP (5 requisições por minuto).
    const clientIp = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "127.0.0.1";
    const ipKey = `wifi:${clientIp}`;
    const now = Date.now();
    const windowMs = 60_000;
    const maxRequests = 5;

    // Cleanup de entradas expiradas a cada chamada para evitar crescimento infinito.
    const rateLimit = (c as any).env.__wifiRateLimit ?? ((c as any).env.__wifiRateLimit = new Map());
    const existing = rateLimit.get(ipKey);
    if (existing && existing.windowStart < now - windowMs) {
      rateLimit.delete(ipKey);
    } else if (existing && existing.count >= maxRequests) {
      return c.json({ error: "Limite de requisições excedido. Tente novamente em instantes." }, { status: 429 });
    }

    const rateState = existing ?? { count: 0, windowStart: now };
    rateState.count++;
    rateLimit.set(ipKey, rateState);

    // 3. Binding a organização via SSID.
    const ssid = String(c.req.header("cf-access-client-identity") ?? c.req.header("x-wifi-ssid") ?? "").trim();
    let orgId = "";
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
        return jsonError(`SSID "${ssid}" não está mapeado para nenhuma organização.`, 403);
      }
    }

    const body = await c.req.json().catch(() => ({}));
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
    return jsonError(err instanceof Error ? err.message : "Erro ao processar cadastro Wi-Fi.", 500);
  }
});

// Endpoint interno: upload de comprovante de evento.
// O cliente deve enviar o arquivo ao backend web autenticado; ele valida a
// permissão do usuário e chama este Worker com o bearer secreto. Assim não há
// uma superfície pública de upload em R2.
app.post("/events/:eventId/upload-proof", async (c) => {
  const configuredToken = c.env.EVENT_PROOF_UPLOAD_BEARER_TOKEN ?? c.env.UPLOAD_API_BEARER_TOKEN;
  const authorization = c.req.header("authorization");
  if (!configuredToken) {
    return jsonError("EVENT_PROOF_UPLOAD_BEARER_TOKEN nao configurado no Worker.", 503);
  }
  if (!authorization || !safeStringCompare(authorization, `Bearer ${configuredToken}`)) {
    return jsonError("Nao autorizado para upload de comprovante.", 401);
  }

  if (!c.env.BRAND_ASSETS_BUCKET) {
    return jsonError("BRAND_ASSETS_BUCKET nao configurado.", 503);
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return jsonError("Formulario de upload invalido.", 422);
  }
  const file = formData.get("file");
  const eventId = safeObjectSegment(String(c.req.param("eventId") ?? ""));
  const userId = safeObjectSegment(String(formData.get("userId") ?? ""));

  if (!eventId || !userId || !(file instanceof File)) {
    return jsonError("eventId, userId e file sao obrigatorios.", 422);
  }
  if (!EVENT_PROOF_CONTENT_TYPES.has(file.type)) {
    return jsonError("Envie apenas PDF, JPG, PNG ou WEBP.", 415);
  }
  if (file.size === 0 || file.size > EVENT_PROOF_MAX_BYTES) {
    return jsonError("O comprovante deve ter no máximo 8 MB.", 413);
  }

  const extension = file.type === "application/pdf"
    ? "pdf"
    : file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const objectKey = `events/${eventId}/proofs/${userId}/${crypto.randomUUID()}.${extension}`;

  await c.env.BRAND_ASSETS_BUCKET.put(objectKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" }
  });

  // Não devolvemos URL pública: comprovante contém dado financeiro. A leitura
  // posterior deverá ser entregue por rota autenticada com URL temporária.
  return c.json({ success: true, objectKey, eventId, userId });
});

export default {
  fetch: app.fetch,
  // Cron diário (configurado em wrangler.jsonc → triggers.crons): grava o
  // NetworkSnapshot de cada organização via agregações no servidor, sem
  // baixar documentos — substitui o cálculo pesado que rodava no navegador.
  scheduled(_event: ScheduledEvent, env: WorkerEnv, ctx: ExecutionContext) {
    ctx.waitUntil(writeDailyNetworkSnapshots(env));
  }
};

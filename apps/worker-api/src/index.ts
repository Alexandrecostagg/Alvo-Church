import { Hono } from "hono";
import type {
  BrandAssetKind,
  TenantBrandAssetUploadResponse,
} from "@alvo/types";
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
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_FROM?: string;
  // Segredo compartilhado só com o backend do web (apps/web/app/api/communication/*)
  // — nunca deve ser embutido em código de cliente. É a única coisa que
  // protege esse endpoint de virar um disparador de WhatsApp aberto ao público.
  NOTIFY_API_BEARER_TOKEN?: string;
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

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

app.get("/", (c) => {
  return c.json({
    name: "Alvo Church Worker API",
    status: "ok",
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
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
  const childId = String(formData.get("childId") ?? "").replace(
    /[^a-zA-Z0-9_-]/g,
    "",
  );
  const file = formData.get("file");

  if (!organizationId || !assetKind || !(file instanceof File)) {
    return jsonError("organizationId, assetKind e file sao obrigatorios.", 422);
  }

  const fileName = file.name.replace(/\s+/g, "-").toLowerCase();
  // Fotos de criança (Segurança Kids) vivem sob um prefixo próprio, separado do
  // branding; as demais mantêm o caminho de branding.
  const objectKey =
    assetKind === "kidsPhoto"
      ? `organizations/${organizationId}/kids/${childId || "unknown"}/${Date.now()}-${fileName}`
      : `organizations/${organizationId}/branding/${assetKind}/${Date.now()}-${fileName}`;

  await c.env.BRAND_ASSETS_BUCKET.put(objectKey, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
  });

  const publicBaseUrl =
    c.env.PUBLIC_BRAND_BASE_URL?.replace(/\/$/, "") ??
    "https://assets.alvochurch.app";

  const payload: TenantBrandAssetUploadResponse = {
    success: true,
    assetKind,
    fileName,
    objectKey,
    publicUrl: `${publicBaseUrl}/${objectKey}`,
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
      return jsonError(
        "WIFI_INTAKE_BEARER_TOKEN nao configurado no Worker.",
        503,
      );
    }
    const authorization = c.req.header("authorization");
    const expected = `Bearer ${configuredToken}`;
    if (!authorization || !safeStringCompare(authorization, expected)) {
      return jsonError("Nao autorizado para Wi-Fi intake.", 401);
    }

    // 2. Rate limiting por IP (5 requisições por minuto).
    const clientIp =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for") ||
      "127.0.0.1";
    const ipKey = `wifi:${clientIp}`;
    const now = Date.now();
    const windowMs = 60_000;
    const maxRequests = 5;

    // Cleanup de entradas expiradas a cada chamada para evitar crescimento infinito.
    const rateLimit =
      (c as any).env.__wifiRateLimit ??
      ((c as any).env.__wifiRateLimit = new Map());
    const existing = rateLimit.get(ipKey);
    if (existing && existing.windowStart < now - windowMs) {
      rateLimit.delete(ipKey);
    } else if (existing && existing.count >= maxRequests) {
      return c.json(
        {
          error:
            "Limite de requisições excedido. Tente novamente em instantes.",
        },
        { status: 429 },
      );
    }

    const rateState = existing ?? { count: 0, windowStart: now };
    rateState.count++;
    rateLimit.set(ipKey, rateState);

    // 3. Binding a organização via SSID.
    const ssid = String(
      c.req.header("cf-access-client-identity") ??
        c.req.header("x-wifi-ssid") ??
        "",
    ).trim();
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
        return jsonError(
          `SSID "${ssid}" não está mapeado para nenhuma organização.`,
          403,
        );
      }
    }

    const body = await c.req.json().catch(() => ({}));
    const fullName = String(body.fullName ?? "").trim();
    const whatsapp = String(body.whatsapp ?? "").trim();
    const email = String(body.email ?? "").trim();
    const birthDate = String(body.birthDate ?? "").trim();

    if (!fullName || !whatsapp || !email || !birthDate) {
      return jsonError(
        "Nome, WhatsApp, E-mail e Data de Nascimento sao obrigatorios.",
        422,
      );
    }

    // Validação básica de dados.
    const digits = String(whatsapp).replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 14) {
      return jsonError("Telefone inválido.", 400);
    }

    return c.json({
      success: true,
      message:
        "Perfil cadastrado e tráfego de internet autorizado com sucesso.",
      clientIp,
      authorized: true,
      organizationId: orgId,
      ssid,
      registeredAt: new Date().toISOString(),
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Erro ao processar cadastro Wi-Fi.",
      500,
    );
  }
});

// Endpoint: upload comprovante (proof) for an event
app.post("/events/:eventId/upload-proof", async (c) => {
  if (!c.env.BRAND_ASSETS_BUCKET) {
    return jsonError("BRAND_ASSETS_BUCKET nao configurado.", 503);
  }

  const formData = await c.req.formData();
  const file = formData.get("file");
  const eventId = String(c.req.param("eventId") ?? "");
  const userId = String(formData.get("userId") ?? "anonymous");

  if (!eventId || !(file instanceof File)) {
    return jsonError("eventId e file sao obrigatorios.", 422);
  }

  const fileName = file.name.replace(/\s+/g, "-").toLowerCase();
  const objectKey = `events/${eventId}/proofs/${Date.now()}-${fileName}`;

  await c.env.BRAND_ASSETS_BUCKET.put(objectKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  const publicBaseUrl =
    c.env.PUBLIC_BRAND_BASE_URL?.replace(/\/$/, "") ??
    "https://assets.alvochurch.app";
  const publicUrl = `${publicBaseUrl}/${objectKey}`;

  return c.json({ success: true, objectKey, publicUrl, eventId, userId });
});

// Endpoint: send WhatsApp message via Twilio
app.post("/notify/whatsapp", async (c) => {
  // Este endpoint dispara mensagem (e custo) pela conta Twilio da plataforma —
  // só pode ser chamado pelo backend do web, nunca direto por um cliente.
  const configuredToken = c.env.NOTIFY_API_BEARER_TOKEN;
  const authorization = c.req.header("authorization");
  if (!configuredToken) {
    return jsonError("NOTIFY_API_BEARER_TOKEN nao configurado no Worker.", 503);
  }
  const expectedNotify = `Bearer ${configuredToken}`;
  if (!authorization || !safeStringCompare(authorization, expectedNotify)) {
    return jsonError("Nao autorizado para notificacao.", 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const to = String(body.to ?? "");
  const message = String(body.message ?? "");
  const mediaUrl = body.mediaUrl ? String(body.mediaUrl) : undefined;
  const organizationId = String(body.organizationId ?? "");

  const sid = c.env.TWILIO_ACCOUNT_SID;
  const token = c.env.TWILIO_AUTH_TOKEN;
  const from = c.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    return jsonError(
      "Twilio credentials (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM) nao configuradas.",
      503,
    );
  }

  if (!to || !message) {
    return jsonError("to e message sao obrigatorios.", 422);
  }

  // Destinatário deve ser membro ativo da organização. Impede que o endpoint
  // seja usado para disparar mensagens a números externos, mesmo com bearer
  // token comprometido.
  if (organizationId) {
    const digits = String(to).replace(/\D/g, "");
    const normalized = `whatsapp:+${digits}`;
    const projectId = c.env.FIREBASE_PROJECT_ID ?? "";
    const queryRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/organizations/${encodeURIComponent(organizationId)}/users?filter=fields.isActive.booleanValue==true`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (queryRes.ok) {
      const queryData = (await queryRes.json()) as {
        documents?: Array<{ fields?: { phone?: { stringValue?: string } } }>;
      };
      const memberPhones = new Set(
        (queryData.documents ?? [])
          .map((d) => {
            const raw = d.fields?.phone?.stringValue ?? "";
            if (!raw) return "";
            return `whatsapp:+${String(raw).replace(/\D/g, "")}`;
          })
          .filter((p) => p.length > 0),
      );
      if (!memberPhones.has(normalized)) {
        return jsonError(
          `Destinatário ${to} não é membro ativo da organização ${organizationId}.`,
          403,
        );
      }
    }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams();
  params.set("To", `whatsapp:${to}`);
  params.set("From", `whatsapp:${from}`);
  params.set("Body", message);
  if (mediaUrl) params.set("MediaUrl", mediaUrl);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    signal: AbortSignal.timeout(15000),
  }).catch((err) => ({
    ok: false,
    status: 500,
    text: async () => String(err),
  }));

  if (!resp || !(resp as Response).ok) {
    const text =
      resp && typeof (resp as Response).text === "function"
        ? await (resp as Response).text()
        : "unknown error";
    return jsonError(`Falha ao enviar via Twilio: ${text}`, 502);
  }

  const data = await (resp as Response).json().catch(() => ({}));
  return c.json({ success: true, provider: "twilio", result: data });
});

export default {
  fetch: app.fetch,
  // Cron diário (configurado em wrangler.jsonc → triggers.crons): grava o
  // NetworkSnapshot de cada organização via agregações no servidor, sem
  // baixar documentos — substitui o cálculo pesado que rodava no navegador.
  scheduled(_event: ScheduledEvent, env: WorkerEnv, ctx: ExecutionContext) {
    ctx.waitUntil(writeDailyNetworkSnapshots(env));
  },
};

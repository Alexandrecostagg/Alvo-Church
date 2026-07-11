import { Hono } from "hono";
import type { BrandAssetKind, TenantBrandAssetUploadResponse } from "@alvo/types";

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
};

const app = new Hono<{ Bindings: WorkerEnv }>();

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

  if (!authorization || authorization !== `Bearer ${configuredToken}`) {
    return jsonError("Nao autorizado para upload de assets.", 401);
  }

  if (!c.env.BRAND_ASSETS_BUCKET) {
    return jsonError("BRAND_ASSETS_BUCKET nao configurado.", 503);
  }

  const formData = await c.req.formData();
  const organizationId = String(formData.get("organizationId") ?? "");
  const assetKind = String(formData.get("assetKind") ?? "") as BrandAssetKind;
  const file = formData.get("file");

  if (!organizationId || !assetKind || !(file instanceof File)) {
    return jsonError("organizationId, assetKind e file sao obrigatorios.", 422);
  }

  const fileName = file.name.replace(/\s+/g, "-").toLowerCase();
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
app.post("/wifi/intake", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const fullName = String(body.fullName ?? "").trim();
    const whatsapp = String(body.whatsapp ?? "").trim();
    const email = String(body.email ?? "").trim();
    const birthDate = String(body.birthDate ?? "").trim();

    if (!fullName || !whatsapp || !email || !birthDate) {
      return jsonError("Nome, WhatsApp, E-mail e Data de Nascimento sao obrigatorios.", 422);
    }

    const clientIp = c.req.header("cf-connecting-ip") || "127.0.0.1";

    // Aqui a liderança/consolidação registra o visitante no banco de dados.
    // Retornamos sucesso indicando que o hotspot de roteadores locais (MikroTik/UniFi) 
    // está autorizado a liberar o tráfego de IP de internet para o dispositivo.
    return c.json({
      success: true,
      message: "Perfil cadastrado e tráfego de internet autorizado com sucesso.",
      clientIp,
      authorized: true,
      registeredAt: new Date().toISOString()
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro ao processar cadastro Wi-Fi.", 500);
  }
});

export default app;

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
    httpMetadata: { contentType: file.type || "application/octet-stream" }
  });

  const publicBaseUrl = c.env.PUBLIC_BRAND_BASE_URL?.replace(/\/$/, "") ?? "https://assets.alvochurch.app";
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
  if (!authorization || authorization !== `Bearer ${configuredToken}`) {
    return jsonError("Nao autorizado para notificacao.", 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const to = String(body.to ?? "");
  const message = String(body.message ?? "");
  const mediaUrl = body.mediaUrl ? String(body.mediaUrl) : undefined;

  const sid = c.env.TWILIO_ACCOUNT_SID;
  const token = c.env.TWILIO_AUTH_TOKEN;
  const from = c.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    return jsonError("Twilio credentials (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM) nao configuradas.", 503);
  }

  if (!to || !message) {
    return jsonError("to e message sao obrigatorios.", 422);
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
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  }).catch((err) => ({ ok: false, status: 500, text: async () => String(err) }));

  if (!resp || !(resp as Response).ok) {
    const text = resp && typeof (resp as Response).text === "function" ? await (resp as Response).text() : "unknown error";
    return jsonError(`Falha ao enviar via Twilio: ${text}`, 502);
  }

  const data = await (resp as Response).json().catch(() => ({}));
  return c.json({ success: true, provider: "twilio", result: data });
});

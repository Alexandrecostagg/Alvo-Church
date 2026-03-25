import { Hono } from "hono";
import type { BrandAssetKind, TenantBrandAssetUploadResponse } from "@alvo/types";

type WorkerEnv = {
  BRAND_ASSETS_BUCKET?: R2Bucket;
  PUBLIC_BRAND_BASE_URL?: string;
  UPLOAD_API_BEARER_TOKEN?: string;
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

export default app;

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { hasAnyRoleInOrg, TENANT_ADMIN_ROLES } from "../../_lib/tenant-role";

const ALLOWED_ASSET_KINDS = new Set(["logoLight", "logoDark", "icon", "favicon"]);
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/x-icon"]);
const MAX_ASSET_BYTES = 5 * 1024 * 1024;

// Mediação autenticada para o Worker R2. O segredo de upload permanece no
// servidor: Firebase ID token nunca é aceito como credencial pelo Worker.
export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const uid = await verifyFirebaseIdToken(req);
  if (!uid || !idToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Formulário de upload inválido." }, { status: 422 });
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const assetKind = String(formData.get("assetKind") ?? "");
  const file = formData.get("file");
  if (!organizationId || !ALLOWED_ASSET_KINDS.has(assetKind) || !(file instanceof File)) {
    return NextResponse.json({ error: "Organização, tipo de asset e arquivo válido são obrigatórios." }, { status: 422 });
  }
  if (!ALLOWED_CONTENT_TYPES.has(file.type) || file.size === 0 || file.size > MAX_ASSET_BYTES) {
    return NextResponse.json({ error: "Envie uma imagem válida de até 5 MB." }, { status: 415 });
  }
  if (!await hasAnyRoleInOrg(idToken, organizationId, uid, TENANT_ADMIN_ROLES)) {
    return NextResponse.json({ error: "Você não tem permissão para alterar a marca desta organização." }, { status: 403 });
  }

  const workerBase = process.env.WORKER_API_BASE_URL ?? "";
  const bearerToken = process.env.UPLOAD_API_BEARER_TOKEN;
  if (!workerBase || !bearerToken) return NextResponse.json({ error: "Serviço de upload indisponível." }, { status: 503 });

  const upstreamForm = new FormData();
  upstreamForm.set("organizationId", organizationId);
  upstreamForm.set("assetKind", assetKind);
  upstreamForm.set("file", file);
  const upstream = await fetch(`${workerBase.replace(/\/$/, "")}/tenant-assets/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${bearerToken}` },
    body: upstreamForm,
    signal: AbortSignal.timeout(20_000)
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return NextResponse.json({ error: (payload as { error?: string }).error ?? "Não foi possível enviar o arquivo." }, { status: upstream.status });
  return NextResponse.json(payload);
}

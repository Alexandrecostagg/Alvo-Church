import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { buildPixPayload } from "@alvo/domain";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";

// Gera um PIX BR Code (EMV, estático) real a partir da chave PIX que a
// própria igreja configurou em Configurações → Doações (organizations/{orgId}
// /settings/branding), e devolve também um QR Code em PNG (data URL) pronto
// pra exibir — tanto no painel web quanto no app mobile (que não tem lib de
// geração de QR nativa instalada).
//
// Não processa pagamento nenhum: é só a chave PIX + valor virando um BR Code
// padrão do Banco Central, igual ao que qualquer app de banco lê. O dinheiro
// vai direto pra chave PIX da igreja — nunca passa pela Esdras.

function projectId() {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "alvo-church";
}

function firestoreDocUrl(path: string) {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents/${path}`;
}

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const uid = await verifyFirebaseIdToken(req);
  if (!uid || !idToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { organizationId?: string; amount?: number; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { organizationId, amount, description } = body;
  if (!organizationId || !amount || amount <= 0) {
    return NextResponse.json({ error: "organizationId e amount (> 0) são obrigatórios" }, { status: 400 });
  }

  // Lê o branding com o próprio token de quem chamou — as Firestore rules
  // já exigem isTenantMember(orgId) pra leitura de settings/*, então isso
  // também funciona como checagem de que o usuário pertence a essa
  // organização (senão a leitura falha e caímos no catch abaixo).
  const brandingRes = await fetch(
    firestoreDocUrl(`organizations/${organizationId}/settings/branding`),
    { headers: { Authorization: `Bearer ${idToken}` }, signal: AbortSignal.timeout(8000) }
  );
  if (!brandingRes.ok) {
    return NextResponse.json({ error: "Não foi possível ler as configurações da organização." }, { status: 403 });
  }
  const brandingData = (await brandingRes.json()) as {
    fields?: {
      pixKey?: { stringValue?: string };
      pixReceiverName?: { stringValue?: string };
      publicShortName?: { stringValue?: string };
    };
  };
  const pixKey = brandingData.fields?.pixKey?.stringValue ?? "";
  const receiverName =
    brandingData.fields?.pixReceiverName?.stringValue ??
    brandingData.fields?.publicShortName?.stringValue ??
    "Igreja";

  if (!pixKey) {
    return NextResponse.json(
      { error: "Esta organização ainda não configurou a chave PIX (Configurações → Doações)." },
      { status: 422 }
    );
  }

  const payload = buildPixPayload({
    key: pixKey,
    receiverName,
    amount,
    description: description?.slice(0, 72) ?? "Oferta/Dizimo"
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(payload, {
      width: 300,
      margin: 2,
      color: { dark: "#1c2433", light: "#ffffff" }
    });
    return NextResponse.json({ ok: true, payload, qrDataUrl, pixKey, receiverName });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: `Erro ao gerar QR Code: ${message}` }, { status: 500 });
  }
}

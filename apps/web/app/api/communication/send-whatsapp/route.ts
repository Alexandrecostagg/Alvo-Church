export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import { hasAnyRoleInOrg, TENANT_ADMIN_ROLES } from "../../_lib/tenant-role";

// Repassa o disparo de WhatsApp pro worker-api (que fala com o Twilio),
// mas só depois de confirmar que quem chamou é login válido E tem cargo de
// liderança na organização — o worker-api em si só confia num segredo
// compartilhado (NOTIFY_API_BEARER_TOKEN), guardado só aqui no servidor.
const WORKER_API_BASE_URL =
  process.env.WORKER_API_BASE_URL ?? process.env.NEXT_PUBLIC_UPLOAD_API_BASE_URL ?? "";

const MAX_RECIPIENTS_PER_REQUEST = 200;

interface Recipient {
  phone: string;
  name?: string;
}

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const uid = await verifyFirebaseIdToken(req);
  if (!uid || !idToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!WORKER_API_BASE_URL) {
    return NextResponse.json({ error: "WORKER_API_BASE_URL não configurada no servidor." }, { status: 500 });
  }
  const bearerToken = process.env.NOTIFY_API_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json({ error: "NOTIFY_API_BEARER_TOKEN não configurado no servidor." }, { status: 500 });
  }

  let body: { organizationId?: string; message?: string; recipients?: Recipient[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { organizationId, message, recipients } = body;
  if (!organizationId || !message?.trim() || !recipients?.length) {
    return NextResponse.json({ error: "organizationId, message e recipients são obrigatórios." }, { status: 400 });
  }
  if (recipients.length > MAX_RECIPIENTS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Máximo de ${MAX_RECIPIENTS_PER_REQUEST} destinatários por envio — divida em lotes menores.` },
      { status: 400 }
    );
  }

  const allowed = await hasAnyRoleInOrg(idToken, organizationId, uid, TENANT_ADMIN_ROLES);
  if (!allowed) {
    return NextResponse.json({ error: "Você não tem permissão para enviar comunicados desta organização." }, { status: 403 });
  }

  const results = await Promise.all(
    recipients.map(async (recipient) => {
      const digits = recipient.phone.replace(/\D/g, "");
      if (!digits) return { phone: recipient.phone, ok: false, error: "Telefone inválido" };
      const to = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
      try {
        const res = await fetch(`${WORKER_API_BASE_URL.replace(/\/$/, "")}/notify/whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearerToken}` },
          body: JSON.stringify({ to, message }),
          // Um destinatário pendurado não pode segurar o lote inteiro — o
          // Promise.all só resolve quando o mais lento termina.
          signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          return { phone: recipient.phone, ok: false, error: (errBody as { error?: string }).error ?? `HTTP ${res.status}` };
        }
        return { phone: recipient.phone, ok: true };
      } catch (e) {
        return { phone: recipient.phone, ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" };
      }
    })
  );

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({ ok: true, sent, failedCount: failed.length, failed });
}

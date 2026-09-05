import { NextRequest, NextResponse } from "next/server";
import { RateLimiter } from "../../_lib/rate-limiter";
import { adminPatchDocument } from "../../_lib/firestore-admin";

// Formulário público de visitantes: recebe somente pela API. A gravação usa a
// credencial do servidor, não uma regra pública do Firestore — assim uma
// requisição direta ao banco não consegue contornar o limite e a validação.
// A conversão para people continua sendo feita pela recepção autenticada.

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

// Rate limiter: 5 requisições por minuto por IP para prevenir abuso do form.
const VISIT_RATE_LIMITER = new RateLimiter({ max: 5, windowMs: 60_000 });

function firestoreUrl(path: string) {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting por IP para evitar abuso do formulário público.
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "127.0.0.1";
    if (!VISIT_RATE_LIMITER.tryGet(`visit:${clientIp}`)) {
      return NextResponse.json(
        { error: "Muitas requisições. Aguarde um momento e tente novamente." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await req.json() as {
      orgSlug: string;
      name: string;
      phone: string;
      email?: string;
      birthDate?: string;
      neighborhood?: string;
      firstVisit: boolean;
      howHeard?: string;
      consent: boolean;
      // Honeypot: campo invisível para pessoas reais; bots costumam preenchê-lo.
      companyWebsite?: string;
    };

    const { orgSlug, name, phone, firstVisit, howHeard, consent, email, birthDate, neighborhood, companyWebsite } = body;

    if (companyWebsite?.trim()) {
      // Resposta neutra para não ensinar o bot a contornar a proteção.
      return NextResponse.json({ ok: true });
    }

    if (!orgSlug || !name || !phone) {
      return NextResponse.json({ error: "orgSlug, name e phone são obrigatórios." }, { status: 400 });
    }
    if (!/^[a-z0-9][a-z0-9-]{1,118}$/i.test(orgSlug)) {
      return NextResponse.json({ error: "Organização inválida." }, { status: 400 });
    }

    if (typeof name !== "string" || name.trim().length < 2 || name.length > 120) {
      return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
    }

    const digits = String(phone).replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 14) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }

    // Resolve orgSlug → organizationId (org_slugs tem leitura pública por doc)
    const slugRes = await fetch(firestoreUrl(`org_slugs/${encodeURIComponent(orgSlug)}`), {
      signal: AbortSignal.timeout(8000)
    });
    if (!slugRes.ok) {
      return NextResponse.json({ error: "Organização não encontrada." }, { status: 404 });
    }
    const slugDoc = (await slugRes.json()) as {
      fields?: { organizationId?: { stringValue?: string } };
    };
    const organizationId = slugDoc.fields?.organizationId?.stringValue;
    if (!organizationId) {
      return NextResponse.json({ error: "Organização não encontrada." }, { status: 404 });
    }

    const intakeId = crypto.randomUUID();
    await adminPatchDocument(`organizations/${organizationId}/visitorIntakes/${intakeId}`, {
      organizationId,
      name: name.trim(),
      phone: digits,
      email: email?.trim().slice(0, 160) || null,
      birthDate: birthDate?.slice(0, 10) || null,
      neighborhood: neighborhood?.trim().slice(0, 120) || null,
      firstVisit: Boolean(firstVisit),
      howHeard: howHeard?.slice(0, 200) || null,
      consentMarketing: Boolean(consent),
      source: "public_form",
      status: "captured",
      orgSlug,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true, intakeId });
  } catch (err) {
    console.error("[public/visit] error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

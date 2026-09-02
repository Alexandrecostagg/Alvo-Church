import { NextRequest, NextResponse } from "next/server";
import { RateLimiter } from "../../_lib/rate-limiter";

// Formulário público de visitantes: cria SOMENTE um visitorIntake com os
// dados do formulário, via API REST do Firestore (o SDK client não roda bem
// no runtime do Cloudflare Worker). A conversão para um registro em `people`
// (com dedup por telefone) é feita pela equipe de recepção, autenticada.
// As regras do Firestore validam campos, tipos e tamanhos deste create.

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

// Rate limiter: 5 requisições por minuto por IP para prevenir abuso do form.
const VISIT_RATE_LIMITER = new RateLimiter({ max: 5, windowMs: 60_000 });

function firestoreUrl(path: string) {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
}

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string };

function str(value: string): FirestoreValue {
  return { stringValue: value };
}
function optStr(value: string | undefined | null, max: number): FirestoreValue {
  return value ? { stringValue: value.slice(0, max) } : { nullValue: null };
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting por IP para evitar abuso do formulário público.
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "127.0.0.1";
    if (!VISIT_RATE_LIMITER.tryGet(`visit:${clientIp}`)) {
      return NextResponse.json(
        { error: "Muitas requisições. Aguarde um momento e tente novamente." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const body = (await req.json()) as {
      orgSlug: string;
      name: string;
      phone: string;
      email?: string;
      birthDate?: string;
      neighborhood?: string;
      firstVisit: boolean;
      howHeard?: string;
      consent: boolean;
    };

    const {
      orgSlug,
      name,
      phone,
      firstVisit,
      howHeard,
      consent,
      email,
      birthDate,
      neighborhood,
    } = body;

    if (!orgSlug || !name || !phone) {
      return NextResponse.json(
        { error: "orgSlug, name e phone são obrigatórios." },
        { status: 400 },
      );
    }

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.length > 120
    ) {
      return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
    }

    const digits = String(phone).replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 14) {
      return NextResponse.json(
        { error: "Telefone inválido." },
        { status: 400 },
      );
    }

    // Resolve orgSlug → organizationId (org_slugs tem leitura pública por doc)
    const slugRes = await fetch(
      firestoreUrl(`org_slugs/${encodeURIComponent(orgSlug)}`),
      {
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!slugRes.ok) {
      return NextResponse.json(
        { error: "Organização não encontrada." },
        { status: 404 },
      );
    }
    const slugDoc = (await slugRes.json()) as {
      fields?: { organizationId?: { stringValue?: string } };
    };
    const organizationId = slugDoc.fields?.organizationId?.stringValue;
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organização não encontrada." },
        { status: 404 },
      );
    }

    const createRes = await fetch(
      firestoreUrl(
        `organizations/${encodeURIComponent(organizationId)}/visitorIntakes`,
      ),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          fields: {
            organizationId: str(organizationId),
            name: str(name.trim()),
            phone: str(digits),
            email: optStr(email?.trim(), 160),
            birthDate: optStr(birthDate, 10),
            neighborhood: optStr(neighborhood?.trim(), 120),
            firstVisit: { booleanValue: Boolean(firstVisit) },
            howHeard: optStr(howHeard, 200),
            consentMarketing: { booleanValue: Boolean(consent) },
            source: str("public_form"),
            status: str("captured"),
            orgSlug: str(orgSlug),
            createdAt: { timestampValue: new Date().toISOString() },
          } satisfies Record<string, FirestoreValue>,
        }),
      },
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error(
        "[public/visit] firestore create failed:",
        createRes.status,
        errText,
      );
      return NextResponse.json(
        { error: "Não foi possível registrar a visita." },
        { status: 502 },
      );
    }

    const created = (await createRes.json()) as { name?: string };
    const intakeId = created.name?.split("/").pop() ?? "";

    return NextResponse.json({ ok: true, intakeId });
  } catch (err) {
    console.error("[public/visit] error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

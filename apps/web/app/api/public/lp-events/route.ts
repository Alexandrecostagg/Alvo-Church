import { NextRequest, NextResponse } from "next/server";
import { boundedJson } from "../../_lib/kids-media";
import { AccountError } from "../../_lib/member-account-store";
import { recordLpEvent } from "../../_lib/lp-analytics";

const ALLOWED_ORIGINS = new Set([
  "https://plataformaesdras.com.br",
  "https://www.plataformaesdras.com.br",
  "https://plataformaesdras-lp.alexandrecostagg.workers.dev",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
]);

function headers(origin: string) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    vary: "Origin",
  };
}

function allowed(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.has(origin))
    throw new AccountError(403, "Origem inválida.");
  return origin;
}

export async function OPTIONS(req: NextRequest) {
  try {
    return new NextResponse(null, {
      status: 204,
      headers: headers(allowed(req)),
    });
  } catch {
    return new NextResponse(null, {
      status: 403,
      headers: { "cache-control": "no-store" },
    });
  }
}

export async function POST(req: NextRequest) {
  let origin = "";
  try {
    origin = allowed(req);
    const result = await recordLpEvent(await boundedJson(req, 2_048));
    return NextResponse.json(result, { headers: headers(origin) });
  } catch (error) {
    const status = error instanceof AccountError ? error.status : 503;
    return NextResponse.json(
      {
        error:
          status === 503
            ? "Métrica temporariamente indisponível."
            : "Evento recusado.",
      },
      {
        status,
        headers: origin ? headers(origin) : { "cache-control": "no-store" },
      },
    );
  }
}

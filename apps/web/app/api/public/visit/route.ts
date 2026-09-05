import { NextRequest, NextResponse } from "next/server";
import { AccountError, boundedJson } from "../../_lib/kids-media";
import { capturePublicVisitor } from "../../_lib/visitor-intake";
export async function POST(req: NextRequest) {
  try {
    // Cloudflare supplies this at the edge. Without it, share a conservative bucket;
    // untrusted x-forwarded-for cannot select arbitrary rate-limit identities.
    const clientKey = req.headers.get("cf-connecting-ip")?.slice(0, 64) || "unknown";
    return NextResponse.json(await capturePublicVisitor(await boundedJson(req, 4096), clientKey), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const status = error instanceof AccountError ? error.status : 503;
    return NextResponse.json({ error: error instanceof AccountError ? error.message : "Não foi possível salvar. Tente novamente." }, { status, headers: { "cache-control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) } });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { safeStringCompare } from "../../_lib/safe-compare";
import {
  AccountError,
  boundedJson,
  privateHeaders,
} from "../../_lib/kids-media";
import { billingEvent } from "../../_lib/billing-operations";
export async function POST(req: NextRequest) {
  try {
    const expected = process.env.ASAAS_WEBHOOK_TOKEN,
      received = req.headers.get("asaas-access-token");
    if (!expected || !received || !safeStringCompare(expected, received)) {
      // Only format metadata: never log credentials, headers or payment payloads.
      console.warn("asaas_webhook_auth_rejected", {
        expectedConfigured: Boolean(expected),
        expectedLength: Math.min(expected?.length || 0, 256),
        receivedLength: Math.min(received?.length || 0, 256),
        containsAssignment: received?.includes("ASAAS_WEBHOOK_TOKEN=") || false,
        containsWhitespace: /\s/.test(received || ""),
        containsQuotes: /["']/.test(received || ""),
        isPlaceholder: /^\*+$/.test(received || ""),
        isHex: /^[a-f0-9]+$/i.test(received || ""),
      });
      throw new AccountError(401, "Token de webhook inválido.");
    }
    return NextResponse.json(
      await billingEvent(await boundedJson(req, 64000)),
      { headers: privateHeaders },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Evento não processado; tente novamente.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

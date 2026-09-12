import { NextRequest, NextResponse } from "next/server";
import { asaas } from "../../_lib/billing-operations";
import { financeActor } from "../../_lib/finance-operations";
import { privateHeaders } from "../../_lib/kids-media";
import { documentId } from "../../_lib/member-account";
import {
  AccountError,
  accountTransaction,
} from "../../_lib/member-account-store";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";

export async function GET(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const organizationId = documentId(
      req.nextUrl.searchParams.get("organizationId"),
      "Igreja",
    );
    const local = await accountTransaction(async (tx) => {
      const { root } = await financeActor(tx, organizationId, uid);
      const [subscription, events] = await Promise.all([
        tx.read(`${root}/settings/subscription`).then((rows) => rows[0]),
        tx.query(root, "billingEvents", undefined, undefined, "EQUAL", 50),
      ]);
      const latest = events.sort((a, b) =>
        String(b.receivedAt ?? "").localeCompare(String(a.receivedAt ?? "")),
      )[0];
      return {
        linked: Boolean(subscription?.asaasSubscriptionId),
        lastSyncAt:
          typeof latest?.receivedAt === "string" ? latest.receivedAt : null,
        lastProviderStatus:
          typeof latest?.providerStatus === "string"
            ? latest.providerStatus
            : null,
      };
    });
    const base =
      process.env.ASAAS_API_BASE_URL || "https://api-sandbox.asaas.com/v3";
    const environment = base.includes("api-sandbox") ? "sandbox" : "production";
    const tokenConfigured = Boolean(process.env.ASAAS_API_KEY);
    const receiverSecretConfigured = Boolean(
      process.env.ASAAS_WEBHOOK_TOKEN &&
      process.env.ASAAS_WEBHOOK_TOKEN.length >= 32 &&
      process.env.ASAAS_WEBHOOK_TOKEN.length <= 255,
    );
    let connection: "connected" | "unavailable" | "not_configured" =
      tokenConfigured ? "unavailable" : "not_configured";
    let webhook = {
      found: false,
      enabled: false,
      interrupted: false,
      eventCount: 0,
    };
    if (tokenConfigured) {
      try {
        const response = await asaas("/webhooks?offset=0&limit=100");
        connection = "connected";
        const candidates = Array.isArray(response?.data) ? response.data : [];
        const configured = candidates.find((item: any) => {
          try {
            return (
              new URL(String(item?.url)).pathname === "/api/billing/webhook"
            );
          } catch {
            return false;
          }
        });
        webhook = configured
          ? {
              found: true,
              enabled: configured.enabled === true,
              interrupted: configured.interrupted === true,
              eventCount: Array.isArray(configured.events)
                ? configured.events.length
                : 0,
            }
          : webhook;
      } catch {
        connection = "unavailable";
      }
    }
    return NextResponse.json(
      {
        ok: true,
        provider: "Asaas",
        environment,
        connection,
        receiverSecretConfigured,
        webhook,
        checkedAt: new Date().toISOString(),
        ...local,
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Diagnóstico financeiro indisponível.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

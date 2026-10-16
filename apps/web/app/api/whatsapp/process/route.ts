import { NextRequest, NextResponse } from "next/server";
import { safeStringCompare } from "../../_lib/safe-compare";
import { whatsappChannels } from "../../_lib/whatsapp-config";
import { dispatchWhatsapp } from "../../_lib/whatsapp-outbox";
import { accountTransaction } from "../../_lib/member-account-store";
/** Intended for a platform-owned scheduler. Never accepts arbitrary recipient, tenant or provider URL. */
export async function POST(req: NextRequest) {
  const secret = process.env.WHATSAPP_PROCESS_TOKEN;
  if (
    !secret ||
    !safeStringCompare(
      req.headers.get("authorization") ?? "",
      `Bearer ${secret}`,
    )
  )
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const orgId = req.nextUrl.searchParams.get("organizationId");
  const channels = whatsappChannels().filter(
    (c) => !orgId || c.organizationId === orgId,
  );
  if (channels.length > 20)
    return NextResponse.json(
      {
        error:
          "Informe organizationId para dividir o processamento entre as igrejas.",
      },
      { status: 400 },
    );
  let processed = 0;
  try {
    for (const channel of channels) {
      const ids = await accountTransaction(async (tx) =>
        (
          await tx.query(
            `organizations/${channel.organizationId}`,
            "whatsappOutbox",
            "status",
            "pending",
            "EQUAL",
            10,
            {field:"scheduledAt",value:new Date().toISOString(),op:"LESS_THAN_OR_EQUAL"},
            {field:"scheduledAt",direction:"ASCENDING"},
          )
        ).map((m) => m.id),
      );
      for (const id of ids) {
        await dispatchWhatsapp(channel.organizationId, id);
        processed++;
      }
    }
    return NextResponse.json({ processed });
  } catch {
    return NextResponse.json(
      {
        error:
          "Processamento incompleto; mensagens incertas não serão reenviadas.",
      },
      { status: 503 },
    );
  }
}

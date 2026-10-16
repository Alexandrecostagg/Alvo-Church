import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../../_lib/verify-auth";
import {
  AccountError,
  boundedJson,
  privateHeaders,
} from "../../_lib/kids-media";
import { whatsappSettings, whatsappActor } from "../../_lib/whatsapp-config";
import {
  enqueueStaffWhatsapp,
  dispatchWhatsapp,
} from "../../_lib/whatsapp-outbox";
import { accountTransaction } from "../../_lib/member-account-store";
import { documentId } from "../../_lib/member-account";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 16000);
    let result;
    const orgId = documentId(body.organizationId, "Igreja");
    if (body.action === "settings")
      result = await whatsappSettings(orgId, uid, body.settings);
    else if (body.action === "history") {
      const contactId = documentId(body.contactId, "Contato");
      result = await accountTransaction(async (tx) => {
        const { root } = await whatsappActor(tx, orgId, uid);
        const [contact] = await tx.read(
          `${root}/whatsappContacts/${contactId}`,
        );
        if (!contact) throw new AccountError(404, "Contato não encontrado.");
        return { thread: Array.isArray(contact.thread) ? contact.thread : [] };
      });
    } else if (body.action === "send")
      result = await enqueueStaffWhatsapp(body, uid);
    else if (body.action === "process") {
      const ids = await accountTransaction(async (tx) => {
        const { root } = await whatsappActor(tx, orgId, uid);
        return (
          await tx.query(
            root,
            "whatsappOutbox",
            "status",
            "pending",
            "EQUAL",
            20,
            {field:"scheduledAt",value:new Date().toISOString(),op:"LESS_THAN_OR_EQUAL"},
            {field:"scheduledAt",direction:"ASCENDING"},
          )
        ).map((m) => m.id);
      });
      const statuses = [];
      for (const id of ids) statuses.push(await dispatchWhatsapp(orgId, id));
      result = { processed: statuses };
    } else if (body.action === "handoff") {
      const contactId = documentId(body.contactId, "Contato");
      if (typeof body.handoff !== "boolean")
        throw new AccountError(400, "Confira o atendimento.");
      await accountTransaction(async (tx) => {
        const { root } = await whatsappActor(tx, orgId, uid);
        const path = `${root}/whatsappContacts/${contactId}`;
        const [contact] = await tx.read(path);
        if (!contact) throw new AccountError(404, "Contato não encontrado.");
        if (contact.leaseUntil > Date.now())
          throw new AccountError(
            409,
            "Aguarde o processamento da mensagem atual.",
          );
        tx.patch(path, { handoff: body.handoff, state: {}, leaseUntil: 0 });
        tx.set(`${root}/whatsappHandoffs/${contactId}`, {
          organizationId: orgId,
          phone: contact.phone,
          name: contact.name,
          status: body.handoff ? "open" : "completed",
          updatedAt: new Date().toISOString(),
          updatedBy: uid,
        });
      });
      result = { ok: true };
    } else throw new AccountError(400, "Operação inválida.");
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccountError
            ? error.message
            : "Não foi possível concluir.",
      },
      {
        status: error instanceof AccountError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../_lib/kids-media";
import { documentId } from "../_lib/member-account";
import {
  prepareServingWhatsapp,
  servingOperation,
  dispatchServingPush,
  sendServingWhatsapp,
} from "../_lib/serving-operations";
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 16000);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new AccountError(400, "Solicitação inválida.");
    if (body.action === "manual-whatsapp")
      return NextResponse.json(
        await prepareServingWhatsapp(
          documentId(body.organizationId, "Instituição"),
          documentId(body.assignmentId, "Escala"),
          uid,
          documentId(body.requestId, "Tentativa"),
        ),
        { headers: privateHeaders },
      );
    if (body.action === "whatsapp")
      return NextResponse.json(
        await sendServingWhatsapp(
          documentId(body.organizationId, "Instituição"),
          documentId(body.assignmentId, "Escala"),
          uid,
          documentId(body.requestId, "Tentativa"),
        ),
        { headers: privateHeaders },
      );
    const result = await servingOperation(body, uid);
    if (
      body.action === "create" &&
      "assignments" in result &&
      Array.isArray(result.assignments)
    )
      await Promise.all(
        result.assignments.map((a: { id: string }) =>
          dispatchServingPush(body.organizationId, a.id).catch(() => {}),
        ),
      );
    if (
      "notifyAssignmentIds" in result &&
      Array.isArray(result.notifyAssignmentIds)
    )
      await Promise.all(
        result.notifyAssignmentIds.map((id: string) =>
          dispatchServingPush(body.organizationId, id).catch(() => {}),
        ),
      );
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AccountError
            ? e.message
            : "Não foi possível concluir. Atualize a lista antes de tentar novamente.",
      },
      {
        status: e instanceof AccountError ? e.status : 503,
        headers: privateHeaders,
      },
    );
  }
}

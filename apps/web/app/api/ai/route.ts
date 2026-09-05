import { NextRequest, NextResponse } from "next/server";
import {
  generateCellScript,
  generateCellDynamic,
  generateCellMeetingSummary,
  generateAbsenceMessage,
  generateCareReply,
  generatePastoralSuggestion,
  classifyTribe,
  type CellScriptInput,
  type CellDynamicInput,
  type CellMeetingSummaryInput,
  type AbsenceMessageInput,
  type CareReplyInput,
  type PastoralSuggestionInput,
  type TribeClassifyInput,
} from "@alvo/ai";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../_lib/kids-media";
import { aiTask, aiGate, completeAi } from "../_lib/ai-quota";

export async function POST(req: NextRequest) {
  let auditId = "",
    orgId = "";
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 24000);
    const task = aiTask(body.task),
      input = body.input,
      organizationId = body.organizationId;
    if (task.startsWith("banner_"))
      throw new AccountError(400, "Use o gerador de banners para esta tarefa.");
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new AccountError(400, "Dados de IA inválidos.");
    await aiGate(organizationId, uid, task, false);
    const keys = {
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      groqApiKey: process.env.GROQ_API_KEY,
    };
    if (!keys.deepseekApiKey && !keys.groqApiKey)
      throw new AccountError(503, "Serviço de IA não configurado.");
    const ticket = await aiGate(organizationId, uid, task);
    auditId = ticket.auditId;
    orgId = organizationId;
    let result;

    switch (task) {
      case "cell_script":
        result = await generateCellScript(keys, input as CellScriptInput);
        break;
      case "cell_dynamic":
        result = await generateCellDynamic(keys, input as CellDynamicInput);
        break;
      case "cell_meeting_summary":
        result = await generateCellMeetingSummary(
          keys,
          input as CellMeetingSummaryInput,
        );
        break;
      case "absence_message":
        result = await generateAbsenceMessage(
          keys,
          input as AbsenceMessageInput,
        );
        break;
      case "care_reply":
        result = await generateCareReply(keys, input as CareReplyInput);
        break;
      case "pastoral_suggestion":
        result = await generatePastoralSuggestion(
          keys,
          input as PastoralSuggestionInput,
        );
        break;
      case "tribe_classify":
        result = await classifyTribe(keys, input as TribeClassifyInput);
        break;
      default:
        return NextResponse.json(
          { error: `Tarefa desconhecida: ${task}` },
          { status: 400 },
        );
    }

    await completeAi(orgId, auditId, "completed");
    return NextResponse.json(
      { ok: true, content: result.content, model: result.model },
      { headers: privateHeaders },
    );
  } catch (e) {
    if (auditId) await completeAi(orgId, auditId, "failed").catch(() => {});
    return NextResponse.json(
      {
        error:
          e instanceof AccountError
            ? e.message
            : "Não foi possível concluir a geração. Uma tentativa iniciada pode consumir a cota.",
      },
      {
        status: e instanceof AccountError ? e.status : 502,
        headers: { ...privateHeaders, "Retry-After": "60" },
      },
    );
  }
}

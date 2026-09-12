import { NextRequest, NextResponse } from "next/server";
import {
  generateCellScript,
  generateCellDynamic,
  generateCellMeetingSummary,
  generateAbsenceMessage,
  generateCareReply,
  generateCommunicationDraft,
  generatePastoralSuggestion,
  classifyTribe,
  type CellScriptInput,
  type CellDynamicInput,
  type CellMeetingSummaryInput,
  type AbsenceMessageInput,
  type CareReplyInput,
  type CommunicationDraftInput,
  type PastoralSuggestionInput,
  type TribeClassifyInput,
} from "@alvo/ai";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";
import { AccountError, boundedJson, privateHeaders } from "../_lib/kids-media";
import { aiTask, aiGate, completeAi } from "../_lib/ai-quota";

function communicationDraftInput(
  raw: Record<string, unknown>,
): CommunicationDraftInput {
  const text = (
    value: unknown,
    label: string,
    max: number,
    optional = false,
  ) => {
    if (optional && (value === undefined || value === "")) return "";
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.trim().length > max
    ) {
      throw new AccountError(400, `${label} inválido.`);
    }
    return value.trim();
  };
  const allowedTones = [
    "acolhedor",
    "objetivo",
    "celebrativo",
    "pastoral",
  ] as const;
  if (
    raw.tone !== undefined &&
    !allowedTones.includes(raw.tone as (typeof allowedTones)[number])
  ) {
    throw new AccountError(400, "Tom inválido.");
  }
  return {
    objective: text(raw.objective, "Objetivo", 500),
    audience: text(raw.audience, "Público", 200),
    details: text(raw.details, "Detalhes", 1000, true),
    tone: raw.tone as CommunicationDraftInput["tone"],
  };
}

export async function POST(req: NextRequest) {
  let auditId = "",
    orgId = "";
  try {
    const uid = await verifyFirebaseIdToken(req);
    if (!uid) throw new AccountError(401, "Entre na sua conta.");
    const body = await boundedJson(req, 24000);
    const task = aiTask(body.task),
      rawInput = body.input,
      organizationId = body.organizationId;
    if (task.startsWith("banner_"))
      throw new AccountError(400, "Use o gerador de banners para esta tarefa.");
    if (!rawInput || typeof rawInput !== "object" || Array.isArray(rawInput))
      throw new AccountError(400, "Dados de IA inválidos.");
    const input =
      task === "communication_draft"
        ? communicationDraftInput(rawInput as Record<string, unknown>)
        : rawInput;
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
      case "communication_draft":
        result = await generateCommunicationDraft(
          keys,
          input as CommunicationDraftInput,
        );
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

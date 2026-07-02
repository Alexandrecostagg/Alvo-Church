import { NextRequest, NextResponse } from "next/server";
import {
  generateCellScript,
  generateCellDynamic,
  generateCellMeetingSummary,
  generateAbsenceMessage,
  generatePastoralSuggestion,
  type CellScriptInput,
  type CellDynamicInput,
  type CellMeetingSummaryInput,
  type AbsenceMessageInput,
  type PastoralSuggestionInput
} from "@alvo/ai";
import { verifyFirebaseIdToken } from "../_lib/verify-auth";

type AiTask =
  | "cell_script"
  | "cell_dynamic"
  | "cell_meeting_summary"
  | "absence_message"
  | "pastoral_suggestion";

export async function POST(req: NextRequest) {
  const uid = await verifyFirebaseIdToken(req);
  if (!uid) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Groq API key não configurada" }, { status: 500 });
  }

  let body: { task: AiTask; input: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { task, input } = body;

  try {
    let result;

    switch (task) {
      case "cell_script":
        result = await generateCellScript(apiKey, input as CellScriptInput);
        break;
      case "cell_dynamic":
        result = await generateCellDynamic(apiKey, input as CellDynamicInput);
        break;
      case "cell_meeting_summary":
        result = await generateCellMeetingSummary(apiKey, input as CellMeetingSummaryInput);
        break;
      case "absence_message":
        result = await generateAbsenceMessage(apiKey, input as AbsenceMessageInput);
        break;
      case "pastoral_suggestion":
        result = await generatePastoralSuggestion(apiKey, input as PastoralSuggestionInput);
        break;
      default:
        return NextResponse.json({ error: `Tarefa desconhecida: ${task}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, content: result.content, model: result.model });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

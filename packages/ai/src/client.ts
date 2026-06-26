// Cliente para chamar a API de IA a partir do mobile ou web client-side

export type AiTask =
  | "cell_script"
  | "cell_dynamic"
  | "cell_meeting_summary"
  | "absence_message"
  | "pastoral_suggestion";

export interface AiApiResponse {
  ok: boolean;
  content: string;
  model?: string;
  error?: string;
}

export async function callAiTask(
  baseUrl: string,
  task: AiTask,
  input: unknown
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, input })
  });

  const data = (await res.json()) as AiApiResponse;

  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "Erro na API de IA");
  }

  return data.content;
}

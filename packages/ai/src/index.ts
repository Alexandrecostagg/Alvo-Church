export type AiTaskName =
  | "summarize_member_profile"
  | "suggest_visitor_followup"
  | "explain_tribe_result";

export interface AiTaskDefinition {
  name: AiTaskName;
  provider: "groq" | "gemini";
  model: string;
}

export const aiTasks: AiTaskDefinition[] = [
  {
    name: "summarize_member_profile",
    provider: "groq",
    model: "llama"
  }
];


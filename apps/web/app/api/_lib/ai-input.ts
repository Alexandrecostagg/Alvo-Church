import { AccountError } from "./member-account-store";

// Validate before reserving quota or contacting a provider. Only expected fields
// reach the prompt; arrays, numbers and lengths cannot be supplied as objects.
export function validatedAiInput(task: string, raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const invalid = (key: string): never => { throw new AccountError(400, `Campo ${key} inválido.`); };
  const text = (key: string, max = 200, optional = false) => {
    const value = raw[key];
    if (optional && (value === undefined || value === "")) return;
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) invalid(key);
    out[key] = (value as string).trim();
  };
  const number = (key: string, min: number, max: number, optional = false) => {
    const value = raw[key];
    if (optional && value === undefined) return;
    if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) invalid(key);
    out[key] = value;
  };
  const list = (key: string) => {
    const value = raw[key];
    if (value === undefined) return;
    if (!Array.isArray(value) || value.length > 100 || value.some(v => typeof v !== "string" || !v.trim() || v.length > 500)) invalid(key);
    out[key] = (value as string[]).map(v => v.trim());
  };
  const choice = (key: string, choices: string[]) => {
    if (raw[key] === undefined) return;
    if (typeof raw[key] !== "string" || !choices.includes(raw[key] as string)) invalid(key);
    out[key] = raw[key];
  };
  switch (task) {
    case "cell_script":
      text("theme", 500); text("bibleVerse", 500, true); text("groupProfile", 1000, true); number("duration", 1, 480, true); break;
    case "cell_dynamic":
      text("theme", 500); text("groupProfile", 1000, true); choice("dynamicType", ["quebra-gelo", "reflexão", "comunhão", "louvor", "missão"]); break;
    case "cell_meeting_summary":
      text("groupName"); text("date", 50); text("theme", 500); number("presentCount", 0, 10000);
      list("absentMembers"); list("visitors"); list("prayerRequests"); text("leaderNotes", 4000, true); break;
    case "absence_message":
      text("memberName"); text("groupName"); number("weeksAbsent", 0, 5200); text("lastSeenContext", 2000, true); break;
    case "care_reply":
      text("personName"); text("request", 4000); text("category", 200, true); break;
    case "communication_draft":
      text("objective", 500); text("audience"); text("details", 1000, true); choice("tone", ["acolhedor", "objetivo", "celebrativo", "pastoral"]); break;
    case "pastoral_suggestion":
      text("memberName"); number("engagementScore", 0, 100); text("lastAttendance", 100, true); list("prayerRequests"); text("notes", 4000, true); break;
    case "tribe_classify":
      text("memberName"); list("ministerialInterests"); text("servingProfile", 1000, true); list("availability"); text("memberStatus", 100, true); text("notes", 4000, true); break;
    default: invalid("task");
  }
  return out;
}

import { describe, it, expect } from "vitest";
import { validatedAiInput } from "./ai-input";
describe("provider input boundary", () => {
  it("strips unknown fields and trims expected strings", () => {
    expect(validatedAiInput("cell_script", { theme: " Amor ", system: "override" })).toEqual({ theme: "Amor" });
  });
  it.each([
    ["cell_script", { theme: "x", duration: -1 }],
    ["cell_dynamic", { theme: "x", dynamicType: "invalid" }],
    ["cell_meeting_summary", { groupName: "x", date: "today", theme: "x", presentCount: 2, visitors: {} }],
    ["absence_message", { memberName: "x", groupName: "x", weeksAbsent: "3" }],
    ["care_reply", { personName: "x", request: "x".repeat(4001) }],
    ["communication_draft", { objective: "x", audience: "x", tone: "invalid" }],
    ["pastoral_suggestion", { memberName: "x", engagementScore: 101 }],
    ["tribe_classify", { memberName: "x", availability: [null] }],
  ])("rejects malformed %s before quota or provider use", (task, input) => {
    expect(() => validatedAiInput(task, input)).toThrow();
  });
});

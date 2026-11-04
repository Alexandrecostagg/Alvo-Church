import { describe, it, expect } from "vitest";
import {
  calculateTribeQuestionnaireResult,
  tribeQuestionnaireV1,
} from "./index";
import type { TribeAnswer } from "@alvo/types";

describe("calculateTribeQuestionnaireResult", () => {
  it("should calculate correct primary tribe when strongly aligned", () => {
    // Simulated answers mapping mostly to LEVI
    // q1: a -> LEVI: 3
    // q4: a -> LEVI: 3
    const answers: TribeAnswer[] = [
      { questionCode: "q1", optionCode: "a" },
      { questionCode: "q4", optionCode: "a" },
    ];

    const result = calculateTribeQuestionnaireResult(answers);

    expect(result.primaryTribeCode).toBe("LEVI");
    expect(result.confidenceLevel).toBe("high"); // 6 points difference to 0
    expect(result.scores.length).toBeGreaterThan(0);
    expect(result.scores.find((s) => s.tribeCode === "LEVI")?.scoreRaw).toBe(6);
  });

  it("should calculate correct secondary tribe with medium confidence", () => {
    // q2: c -> GAD: 2, BENJAMIN: 1
    // q3: e -> BENJAMIN: 2, GAD: 1
    const answers: TribeAnswer[] = [
      { questionCode: "q2", optionCode: "c" }, // GAD: 2, BENJAMIN: 1
      { questionCode: "q3", optionCode: "e" }, // GAD: 1, BENJAMIN: 2
      // Currently tied 3 and 3
      // We will add one more to break the tie and make confidence level "medium" (difference between 1 and 2)
      // q4: d -> JOSEPH: 2, BENJAMIN: 1
    ];

    // Let's create a clear primary and secondary.
    // q1: b -> JUDAH: 3
    // q2: d -> MANASSEH: 3
    // q3: d -> MANASSEH: 3
    // MANASSEH: 6, JUDAH: 3
    // diff = 3 -> high confidence

    // To get medium, diff must be 1 or 2
    // q1: b -> JUDAH: 3
    // q4: b -> JUDAH: 3 (JUDAH = 6)
    // q5: d -> JOSEPH: 3
    // q3: c -> JOSEPH: 2, ISSACHAR: 1 (JOSEPH = 5)

    const medConfidenceAnswers: TribeAnswer[] = [
      { questionCode: "q1", optionCode: "b" }, // JUDAH: 3
      { questionCode: "q4", optionCode: "b" }, // JUDAH: 3 -> Total JUDAH: 6
      { questionCode: "q5", optionCode: "d" }, // JOSEPH: 3
      { questionCode: "q3", optionCode: "c" }, // JOSEPH: 2 -> Total JOSEPH: 5
    ];

    const result = calculateTribeQuestionnaireResult(medConfidenceAnswers);
    expect(result.primaryTribeCode).toBe("JUDAH");
    expect(result.secondaryTribeCode).toBe("JOSEPH");
    expect(result.confidenceLevel).toBe("medium");

    const primaryScore = result.scores.find((s) => s.tribeCode === "JUDAH");
    const secondaryScore = result.scores.find((s) => s.tribeCode === "JOSEPH");
    expect(primaryScore?.scoreRaw).toBe(6);
    expect(secondaryScore?.scoreRaw).toBe(5);
  });

  it("should handle empty answers array", () => {
    const result = calculateTribeQuestionnaireResult([]);

    expect(result.primaryTribeCode).toBe("REUBEN");
    expect(result.secondaryTribeCode).toBeUndefined();
    expect(result.scores).toEqual([]);
    expect(result.confidenceLevel).toBe("low");
  });

  it("should ignore invalid question codes or option codes", () => {
    const answers: TribeAnswer[] = [
      { questionCode: "invalid", optionCode: "a" },
      { questionCode: "q1", optionCode: "invalid" },
      { questionCode: "q1", optionCode: "a" }, // LEVI: 3
    ];

    const result = calculateTribeQuestionnaireResult(answers);

    expect(result.primaryTribeCode).toBe("LEVI");
    expect(result.confidenceLevel).toBe("high");
    expect(result.scores.find((s) => s.tribeCode === "LEVI")?.scoreRaw).toBe(3);
  });
});

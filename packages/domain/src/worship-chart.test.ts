import { describe, it, expect } from "vitest";
import {
  isWorshipChord,
  parseWorshipChart,
  worshipLyrics,
  importWorshipText,
  shiftWorshipChord,
  validWorshipKey,
  worshipShapeKey,
} from "./worship-chart";
describe("worship chart contract", () => {
  it("separates syllables and section names without treating Coro as a chord", () => {
    const chart = parseWorshipChart(
      "[Coro]\nPrin[C]cípio e [G/B]paz",
      "C",
      "D",
    );
    expect(chart[0]).toEqual({ kind: "section", text: "Coro" });
    expect(
      chart[1].kind === "music" ? chart[1].words.slice(0, 1) : [],
    ).toMatchObject([
      {
        parts: [
          { chord: "", text: "Prin" },
          { chord: "D", text: "cípio" },
        ],
      },
    ]);
    expect(worshipLyrics("[Coro]\nPrin[C]cípio e [G/B]paz")).toBe(
      "Coro\nPrincípio e paz",
    );
  });
  it("supports minor keys, inversions, flat target and numeric slash extensions", () => {
    expect(validWorshipKey("Bbm")).toBe(true);
    expect(validWorshipKey("Hm")).toBe(false);
    expect(shiftWorshipChord("C6/9", 2)).toBe("D6/9");
    expect(shiftWorshipChord("C#m7/G#", 1, true)).toBe("Dm7/A");
    expect(shiftWorshipChord("Coro", 1)).toBe("Coro");
    expect(isWorshipChord("Coração")).toBe(false);
    expect(parseWorshipChart("[E] [A] [B7]", "E", "F")[0]).toMatchObject({
      words: [
        { parts: [{ chord: "F" }] },
        { parts: [{ chord: "Bb" }] },
        { parts: [{ chord: "C7" }] },
      ],
    });
  });
  it("capo changes shapes without changing sounding key", () => {
    expect(worshipShapeKey("D", 2)).toBe("C");
    expect(worshipShapeKey("C", 2)).toBe("Bb");
    expect(worshipShapeKey("Em", 1)).toBe("Ebm");
    expect(parseWorshipChart("[D/F#]dia", "D", "D", 2)[0]).toMatchObject({
      words: [{ parts: [{ chord: "C/E", text: "dia" }] }],
    });
  });
  it("preserves unknown inline notes and recognizes directives", () => {
    expect(
      worshipLyrics(
        "{title: QA}\n{start_of_chorus: Refrão}\n[C]Paz [repete]\n{end_of_chorus}",
      ),
    ).toBe("\nRefrão\nPaz [repete]\n");
  });
  it("imports classic aligned lines and reads ChordPro metadata", () => {
    const r = importWorshipText(
      "{title: QA}\n{key: Gm}\nC     G/B\nPaz e voz\n\nAm F",
    );
    expect(r.title).toBe("QA");
    expect(r.key).toBe("Gm");
    expect(r.text).toContain("[C]Paz e [G/B]voz");
    expect(r.text).toContain("[Am] [F]");
  });
  it("roundtrips large chords with untouched source and blank lines", () => {
    const s = "[Intro]\n[Cmaj7(#11)/E] [N.C.]\n\n[C]Voz";
    const r = parseWorshipChart(s, "C", "C");
    expect(s).toContain("[Cmaj7(#11)/E]");
    expect(r[2]).toEqual({ kind: "blank" });
    expect(isWorshipChord("Cmaj7(#11)/E")).toBe(true);
  });
});

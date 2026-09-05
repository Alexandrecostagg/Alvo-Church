import { describe, it, expect } from "vitest";
import { transposeChord, transposeChordsText } from "./index";

describe("transposeChord", () => {
  it("returns empty string if input is empty", () => {
    expect(transposeChord("", 2)).toBe("");
  });

  it("transposes a simple major chord", () => {
    expect(transposeChord("C", 2)).toBe("D");
    expect(transposeChord("G", -2)).toBe("F");
  });

  it("transposes chords with suffixes (minor, 7, etc)", () => {
    expect(transposeChord("Cm", 2)).toBe("Dm");
    expect(transposeChord("F#m7", 1)).toBe("Gm7"); // F# -> G, m7 stays
    expect(transposeChord("Bbmaj7", 2)).toBe("Cmaj7");
  });

  it("handles flat/sharp preference based on original base note", () => {
    // If the base note has a flat, it prefers flats for the transposed note
    expect(transposeChord("Db", 2)).toBe("Eb");
    expect(transposeChord("F#", 2)).toBe("G#");
  });

  it("transposes complex slash chords", () => {
    expect(transposeChord("C/E", 2)).toBe("D/F#"); // C -> D, E -> F#
    expect(transposeChord("G/B", -2)).toBe("F/A");
    expect(transposeChord("Dbm7/F", 2)).toBe("Ebm7/G");
  });
});

describe("transposeChordsText", () => {
  it("transposes chords inside brackets", () => {
    const text = "Hello [C] world [G/B]";
    expect(transposeChordsText(text, "C", "D")).toBe("Hello [D] world [A/C#]");
  });

  it("handles missing original or target key", () => {
    const text = "Hello [C]";
    expect(transposeChordsText(text, "H", "D")).toBe(text);
  });

  it("handles 0 semitones diff", () => {
    const text = "Hello [C]";
    expect(transposeChordsText(text, "C", "C")).toBe(text);
  });
});

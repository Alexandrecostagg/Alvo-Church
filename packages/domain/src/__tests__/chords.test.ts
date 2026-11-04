import { describe, it, expect } from "vitest";
import { transposeChordsText } from "../index";

describe("transposeChordsText", () => {
  it("should return empty string when lyrics are empty", () => {
    expect(transposeChordsText("", "C", "D")).toBe("");
  });

  it("should return original text if there are no chords", () => {
    const lyrics = "Hello world, no chords here!";
    expect(transposeChordsText(lyrics, "C", "D")).toBe(lyrics);
  });

  it("should return original text if original and selected keys are the same", () => {
    const lyrics = "Hello [C] world [G]";
    expect(transposeChordsText(lyrics, "C", "C")).toBe(lyrics);
  });

  it("should return original text if original key is invalid", () => {
    const lyrics = "Hello [C] world";
    expect(transposeChordsText(lyrics, "H", "D")).toBe(lyrics);
  });

  it("should return original text if selected key is invalid", () => {
    const lyrics = "Hello [C] world";
    expect(transposeChordsText(lyrics, "C", "H")).toBe(lyrics);
  });

  it("should transpose a simple chord", () => {
    const lyrics = "A [C] song in [F] and [G]";
    expect(transposeChordsText(lyrics, "C", "D")).toBe(
      "A [D] song in [G] and [A]",
    );
  });

  it("should transpose minor chords and suffixes", () => {
    const lyrics = "[Am] Amazing [Dm7] Grace [Em7]";
    expect(transposeChordsText(lyrics, "C", "D")).toBe(
      "[Bm] Amazing [Em7] Grace [F#m7]",
    );
  });

  it("should transpose flat keys correctly", () => {
    const lyrics = "[F] Something [Bb] else [C7]";
    expect(transposeChordsText(lyrics, "F", "G")).toBe(
      "[G] Something [C] else [D7]",
    );
  });

  it("should handle sharp to flat transitions gracefully", () => {
    const lyrics = "[E] [A] [B7]";
    expect(transposeChordsText(lyrics, "E", "F")).toBe("[F] [A#] [C7]");
  });

  it("should transpose chords with slashes (bass notes)", () => {
    const lyrics = "[C/E] [F/A] [G/B]";
    expect(transposeChordsText(lyrics, "C", "D")).toBe("[D/F#] [G/B] [A/C#]");
  });

  it("should handle complex chords", () => {
    const lyrics = "[C#m7/G#] [F#m11]";
    expect(transposeChordsText(lyrics, "E", "G")).toBe("[Em7/B] [Am11]");
  });

  it("should ignore invalid chords inside brackets", () => {
    const lyrics = "[Invalid] [C]";
    expect(transposeChordsText(lyrics, "C", "D")).toBe("[Invalid] [D]");
  });

  it("should leave unmatched brackets unchanged", () => {
    const lyrics = "[C] This is [just a note] not a chord [F]";
    expect(transposeChordsText(lyrics, "C", "D")).toBe(
      "[D] This is [just a note] not a chord [G]",
    );
  });
});

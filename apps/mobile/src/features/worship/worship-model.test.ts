import { describe, it, expect } from "vitest";
import { mobileWorshipSong, mobileWorshipProgram } from "./worship-model";
describe("mobile worship projection", () => {
  it("keeps original key, loads team key and provides clean lyrics", () => {
    const song = mobileWorshipSong({
      id: "a",
      organizationId: "qa",
      title: "QA",
      artist: "QA",
      createdAt: "",
      originalKey: "C",
      preferredKey: "D",
      chordsLyrics: "[Verso]\n[C]Paz [G/B]aqui",
    });
    expect(song.key).toBe("D");
    expect(song.originalKey).toBe("C");
    expect(song.lyrics).toBe("Verso\nPaz aqui");
    expect(song.chords).toContain("[G/B]");
  });
  it("opens event songs in event key and saved order without mutating library", () => {
    const song = mobileWorshipSong({
      id: "a",
      organizationId: "qa",
      title: "QA",
      artist: "QA",
      createdAt: "",
      originalKey: "C",
      preferredKey: "D",
    });
    const rows = mobileWorshipProgram(
      [song],
      [
        { songId: "a", selectedKey: "G", sortOrder: 2 },
        { songId: "missing", selectedKey: "C", sortOrder: 0 },
        { songId: "a", selectedKey: "F", sortOrder: 1 },
      ],
    );
    expect(rows.map((x) => x.song.key)).toEqual(["F", "G"]);
    expect(rows.map((x) => x.order)).toEqual([1, 2]);
    expect(song.key).toBe("D");
  });
});

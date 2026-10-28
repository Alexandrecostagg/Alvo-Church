/** A deliberately bounded ChordPro subset shared by web and native readers. */
export const WORSHIP_KEYS = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
] as const;
const sharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const flat = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const normalize = (s: string) => s.replace(/♯/g, "#").replace(/♭/g, "b");
export function worshipKeyIndex(key: string) {
  const base = normalize(key).replace(/m$/, "");
  return sharp.includes(base) ? sharp.indexOf(base) : flat.indexOf(base);
}
export function validWorshipKey(key: unknown): key is string {
  return (
    typeof key === "string" &&
    /^[A-G][#b]?m?$/.test(key) &&
    worshipKeyIndex(key) >= 0
  );
}
const chordPattern =
  /^[A-G][#b]?(?:(?:maj|min|dim|aug|sus|add|omit|no|m|M)|[0-9+#b()°øΔ−-]|\/(?=\d))*(?:\/[A-G][#b]?)?$/;
export function isWorshipChord(value: string) {
  return (
    value === "N.C." || value === "NC" || chordPattern.test(normalize(value))
  );
}
export function shiftWorshipChord(
  chord: string,
  steps: number,
  preferFlats = false,
) {
  if (!isWorshipChord(chord) || chord === "N.C." || chord === "NC")
    return chord;
  return normalize(chord).replace(
    /(^|\/)([A-G][#b]?)/g,
    (_, prefix: string, note: string) => {
      const idx = worshipKeyIndex(note);
      return (
        prefix + (preferFlats ? flat : sharp)[(((idx + steps) % 12) + 12) % 12]
      );
    },
  );
}
export function worshipShapeKey(key: string, capo: number) {
  if (
    !validWorshipKey(key) ||
    !capo ||
    !Number.isInteger(capo) ||
    capo < 0 ||
    capo > 11
  )
    return key;
  const common = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "F#",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
  ];
  return (
    common[(worshipKeyIndex(key) - capo + 12) % 12] +
    (key.endsWith("m") ? "m" : "")
  );
}
export type ChartPart = { chord: string; text: string };
export type ChartWord = { parts: ChartPart[]; spaceAfter: string };
export type ChartLine =
  | { kind: "music"; words: ChartWord[] }
  | { kind: "section" | "note"; text: string }
  | { kind: "blank" };
export function parseWorshipChart(
  source: string,
  originalKey: string,
  selectedKey: string,
  capo = 0,
): ChartLine[] {
  const shift =
    validWorshipKey(originalKey) && validWorshipKey(selectedKey)
      ? worshipKeyIndex(selectedKey) - worshipKeyIndex(originalKey) - capo
      : 0;
  const shape = worshipShapeKey(selectedKey, capo),
    flats =
      shape.includes("b") || ["F", "Dm", "Gm", "Cm", "Fm"].includes(shape);
  return source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      if (!line.trim()) return { kind: "blank" };
      const directive = line.match(/^\s*\{([^:}]+)(?::\s*([^}]*))?\}\s*$/);
      if (directive) {
        const key = directive[1].toLowerCase();
        if (
          [
            "title",
            "t",
            "artist",
            "a",
            "subtitle",
            "st",
            "key",
            "k",
            "tempo",
            "capo",
            "end_of_chorus",
            "eoc",
            "end_of_verse",
            "eov",
            "end_of_bridge",
            "eob",
          ].includes(key)
        )
          return { kind: "blank" };
        if (
          [
            "start_of_chorus",
            "soc",
            "start_of_verse",
            "sov",
            "start_of_bridge",
            "sob",
          ].includes(key)
        )
          return {
            kind: "section",
            text:
              directive[2] ||
              (
                {
                  soc: "Refrão",
                  start_of_chorus: "Refrão",
                  sov: "Verso",
                  start_of_verse: "Verso",
                  sob: "Ponte",
                  start_of_bridge: "Ponte",
                } as Record<string, string>
              )[key],
          };
        return {
          kind: "note",
          text:
            directive[2] &&
            ["comment", "c", "comment_italic", "ci"].includes(key)
              ? directive[2]
              : line,
        };
      }
      const heading = line.trim().match(/^\[([^\]]+)\]$/);
      if (heading && !isWorshipChord(heading[1]))
        return { kind: "section", text: heading[1] };
      const words: ChartWord[] = [];
      let parts: ChartPart[] = [],
        chord = "",
        text = "";
      const pushPart = () => {
        if (chord || text) {
          parts.push({ chord, text });
          chord = "";
          text = "";
        }
      };
      const pushWord = (spaceAfter: string) => {
        pushPart();
        if (parts.length) {
          words.push({ parts, spaceAfter });
          parts = [];
        } else if (words.length)
          words[words.length - 1].spaceAfter += spaceAfter;
        else if (spaceAfter)
          words.push({
            parts: [{ chord: "", text: spaceAfter }],
            spaceAfter: "",
          });
      };
      const tokens = line.split(/(\[[^\]\n]+\])/g);
      for (const token of tokens) {
        if (
          token.startsWith("[") &&
          token.endsWith("]") &&
          isWorshipChord(token.slice(1, -1))
        ) {
          pushPart();
          chord = shiftWorshipChord(token.slice(1, -1), shift, flats);
          continue;
        }
        for (const fragment of token.split(/(\s+)/g)) {
          if (!fragment) continue;
          if (/^\s+$/.test(fragment)) pushWord(fragment);
          else text += fragment;
        }
      }
      pushWord("");
      return { kind: "music", words };
    });
}
export function worshipLyrics(source: string) {
  return parseWorshipChart(source, "C", "C")
    .map((l) =>
      l.kind === "music"
        ? l.words
            .map((w) => w.parts.map((p) => p.text).join("") + w.spaceAfter)
            .join("")
            .trimEnd()
        : l.kind === "blank"
          ? ""
          : l.text,
    )
    .join("\n");
}
/** Import classic chord-above-lyric pairs; untouched lines stay byte-for-byte. */
export function importWorshipText(source: string) {
  const lines = source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .split("\n");
  const output: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i],
      tokens = [...line.matchAll(/\S+/g)],
      next = lines[i + 1];
    if (
      tokens.length &&
      tokens.every((t) => isWorshipChord(t[0])) &&
      next?.trim() &&
      !/[\[\]{}]/.test(next) &&
      !next.trim().split(/\s+/).every(isWorshipChord)
    ) {
      let result = "",
        offset = 0;
      for (const t of tokens) {
        const at = t.index ?? 0;
        result += next.slice(offset, at) + `[${t[0]}]`;
        offset = at;
      }
      result += next.slice(offset);
      output.push(result);
      i++;
    } else if (tokens.length && tokens.every((t) => isWorshipChord(t[0])))
      output.push(line.replace(/\S+/g, (c) => `[${c}]`));
    else output.push(line);
  }
  const text = output.join("\n");
  const metadata = (key: string) =>
    text
      .match(new RegExp(`^\\{(?:${key}):\\s*([^}]+)\\}\\s*$`, "mi"))?.[1]
      ?.trim();
  return {
    text,
    title: metadata("title|t"),
    artist: metadata("artist|a|subtitle|st"),
    key: metadata("key|k"),
    tempo: metadata("tempo"),
  };
}

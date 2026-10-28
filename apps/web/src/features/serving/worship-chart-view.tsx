"use client";
import React from "react";
import { parseWorshipChart } from "@alvo/domain";
export function WorshipChart({
  source,
  originalKey,
  selectedKey,
  capo = 0,
  lyricsOnly = false,
  fontSize = 18,
}: {
  source: string;
  originalKey: string;
  selectedKey: string;
  capo?: number;
  lyricsOnly?: boolean;
  fontSize?: number;
}) {
  return (
    <div
      className={`worship-score${lyricsOnly ? " is-lyrics" : ""}`}
      style={{ fontSize }}
      aria-label={
        lyricsOnly ? "Letra da música" : "Cifra com acordes acima da letra"
      }
    >
      {parseWorshipChart(source, originalKey, selectedKey, capo).map(
        (line, i) =>
          line.kind === "blank" ? (
            <div className="worship-score-blank" key={i} aria-hidden="true" />
          ) : line.kind !== "music" ? (
            <p key={i} className={`worship-score-${line.kind}`}>
              {line.text}
            </p>
          ) : (
            <div key={i} className="worship-score-line">
              {line.words.map((word, j) => (
                <span className="worship-score-word" key={j}>
                  <span className="worship-score-syllables">
                    {word.parts.map((p, k) => (
                      <span className="worship-score-part" key={k}>
                        {!lyricsOnly && (
                          <strong
                            aria-label={
                              p.chord ? `Acorde ${p.chord}` : undefined
                            }
                          >
                            {p.chord || "\u00a0"}
                          </strong>
                        )}
                        <span>{p.text || (!lyricsOnly ? "\u00a0" : "")}</span>
                      </span>
                    ))}
                  </span>
                  <span className="worship-score-space">{word.spaceAfter}</span>
                </span>
              ))}
            </div>
          ),
      )}
    </div>
  );
}

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { WorshipChart } from "./worship-chart-view";
describe("worship score rendering", () => {
  it("renders chord anchors separately above intact syllables", () => {
    const html = renderToStaticMarkup(
      React.createElement(WorshipChart, {
        source: "Prin[C]cípio e [G/B]paz",
        originalKey: "C",
        selectedKey: "D",
      }),
    );
    expect(html).toContain("Acorde D");
    expect(html).toContain("Acorde A/C#");
    expect(html).not.toContain("[C]");
    expect(html).toContain(">Prin</span>");
    expect(html).toContain(">cípio</span>");
  });
  it("lyrics mode removes chord notation and preserves sections", () => {
    const html = renderToStaticMarkup(
      React.createElement(WorshipChart, {
        source: "[Verso]\n[C]Paz",
        originalKey: "C",
        selectedKey: "C",
        lyricsOnly: true,
      }),
    );
    expect(html).toContain("Verso");
    expect(html).toContain("Paz");
    expect(html).not.toContain("Acorde");
    expect(html).not.toContain("[C]");
  });
  it("escapes imported text instead of executing HTML", () => {
    const html = renderToStaticMarkup(
      React.createElement(WorshipChart, {
        source: "[C]<script>alert(1)</script>",
        originalKey: "C",
        selectedKey: "C",
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

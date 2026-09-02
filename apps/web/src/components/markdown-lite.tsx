"use client";

import React from "react";

// Renderer de markdown enxuto (sem dependência externa e sem dangerouslySetInnerHTML).
// Cobre o que o material dos cursos usa: títulos (##, ###), negrito (**), itálico (*),
// listas (- / 1.), citações (>) e parágrafos. Constrói elementos React a partir do
// texto — nada de HTML injetado, então é seguro.

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // **negrito** e *itálico*
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${i}`}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i-${i}`}>{match[3]}</em>);
    }
    lastIndex = regex.lastIndex;
    i++;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function MarkdownLite({
  text,
  style,
}: {
  text: string;
  style?: React.CSSProperties;
}) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`p-${key++}`} style={{ margin: "0 0 12px", lineHeight: 1.65 }}>
          {renderInline(para.join(" "), `p${key}`)}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, idx) => (
        <li
          key={`li-${key}-${idx}`}
          style={{ marginBottom: 4, lineHeight: 1.6 }}
        >
          {renderInline(it, `li${key}${idx}`)}
        </li>
      ));
      blocks.push(
        list.ordered ? (
          <ol
            key={`ol-${key++}`}
            style={{ margin: "0 0 12px", paddingLeft: 22 }}
          >
            {items}
          </ol>
        ) : (
          <ul
            key={`ul-${key++}`}
            style={{ margin: "0 0 12px", paddingLeft: 22 }}
          >
            {items}
          </ul>
        ),
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }

    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    const bullet = line.match(/^[-*]\s+(.*)/);
    const ordered = line.match(/^\d+\.\s+(.*)/);
    const quote = line.match(/^>\s?(.*)/);

    if (h1 || h2 || h3) {
      flushPara();
      flushList();
      const content = (h1?.[1] ?? h2?.[1] ?? h3?.[1]) as string;
      const size = h1 ? 20 : h2 ? 17 : 15;
      blocks.push(
        <p
          key={`h-${key++}`}
          style={{
            fontSize: size,
            fontWeight: 800,
            margin: "16px 0 8px",
            color: "var(--alvo-ink, #0f172a)",
          }}
        >
          {renderInline(content, `h${key}`)}
        </p>,
      );
    } else if (bullet) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
    } else if (ordered) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
    } else if (quote) {
      flushPara();
      flushList();
      blocks.push(
        <blockquote
          key={`q-${key++}`}
          style={{
            margin: "0 0 12px",
            padding: "8px 14px",
            borderLeft: "3px solid #534AB7",
            background: "rgba(83,74,183,0.06)",
            borderRadius: 6,
            fontStyle: "italic",
            lineHeight: 1.6,
          }}
        >
          {renderInline(quote[1], `q${key}`)}
        </blockquote>,
      );
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();

  return (
    <div style={{ fontSize: 14, color: "var(--alvo-ink, #1e293b)", ...style }}>
      {blocks}
    </div>
  );
}

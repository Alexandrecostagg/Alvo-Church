"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { friendlyError } from "../../lib/friendly-error";
import {
  Download,
  Share2,
  Sparkles,
  ImagePlus,
  Loader2,
  RefreshCw,
  History,
  Trash2,
  X,
} from "lucide-react";
import type { BannerCopy } from "../../../app/api/media/banner-copy/route";
import type { BannerHistoryEntry } from "@alvo/types";
import {
  isFirebaseWebRuntimeConfigured,
  saveBannerHistoryEntry,
  fetchBannerHistory,
  deleteBannerHistoryEntry,
} from "@alvo/firebase";
import { useAppAuth } from "../../../app/providers";

// Busca a imagem de fundo com o token de auth e devolve um object URL
// (necessário porque <img>/Image não envia headers Authorization). O object URL
// é do MESMO domínio, então desenhá-lo no canvas não "tainta" (toDataURL segue
// funcionando para baixar/salvar).
async function fetchBgAsObjectUrl(
  url: string,
  idToken: string,
): Promise<string> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error("Erro ao gerar imagem de fundo");
  return URL.createObjectURL(await res.blob());
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateId = "classico" | "minimalista" | "foto" | "versiculo";

interface FormState {
  tipo: string;
  tema: string;
  pregador: string;
  data: string;
  estilo: string;
  formato: "feed" | "story";
  template: TemplateId;
}

interface BrandKit {
  churchName: string;
  primary: string;
}

const CANVAS_SIZES = {
  feed: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
};

const TIPOS = [
  "Culto Domingo",
  "Culto de Oração",
  "Evento Especial",
  "Célula",
  "Conferência",
  "Show de Louvor",
  "Encontro de Jovens",
];

const ESTILOS = [
  { value: "impactante", label: "Impactante" },
  { value: "acolhedor", label: "Acolhedor" },
  { value: "reverente", label: "Reverente" },
  { value: "celebracao", label: "Celebração" },
];

const TEMPLATES: { id: TemplateId; label: string; hint: string }[] = [
  { id: "classico", label: "Clássico", hint: "Título grande + faixa" },
  { id: "minimalista", label: "Minimalista", hint: "Centralizado, limpo" },
  { id: "foto", label: "Foto em destaque", hint: "Pregador/cantor" },
  { id: "versiculo", label: "Versículo", hint: "Palavra em foco" },
];

const SANS = `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
const SERIF = `Georgia, "Times New Roman", serif`;

// ─── Canvas helpers ─────────────────────────────────────────────────────────

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hexToRgba(hex: string, alpha: number): string {
  let h = (hex || "").replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return `rgba(124,58,237,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Ajusta o tracking (letter-spacing) do contexto. A propriedade é recente e
// pode não estar na typings do DOM — daí o cast; navegadores antigos ignoram.
function setTracking(ctx: CanvasRenderingContext2D, px: number) {
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
  } catch {
    /* noop */
  }
}

function shadowOn(ctx: CanvasRenderingContext2D, blur = 16, oy = 2) {
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = oy;
}
function shadowOff(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Desenha uma imagem cobrindo o retângulo (object-fit: cover), centralizada.
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const s = Math.max(dw / img.width, dh / img.height);
  const w = img.width * s,
    h = img.height * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
  ctx.restore();
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bg: HTMLImageElement | null,
) {
  if (bg) {
    drawCover(ctx, bg, 0, 0, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#1a1040");
    g.addColorStop(1, "#0d0820");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const wd of words) {
    const test = line ? `${line} ${wd}` : wd;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = wd;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Desenha um bloco de linhas a partir do baseline `y`. Retorna o baseline da
// última linha.
function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  align: CanvasTextAlign = "left",
): number {
  ctx.textAlign = align;
  for (let i = 0; i < lines.length; i++)
    ctx.fillText(lines[i], x, y + i * lineHeight);
  return y + Math.max(0, lines.length - 1) * lineHeight;
}

// Reduz o corpo da fonte até o título caber em no máximo `maxLines`.
function fitTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  start: number,
  min: number,
  weight: number,
): { size: number; lines: string[] } {
  for (let size = start; size > min; size -= 2) {
    ctx.font = `${weight} ${size}px ${SANS}`;
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = `${weight} ${min}px ${SANS}`;
  return { size: min, lines: wrapLines(ctx, text, maxWidth) };
}

// Logo/nome da igreja no topo. Sem logo confiável (CORS pode "taintar" o
// canvas), usamos sempre o NOME em texto — 100% seguro para exportar.
function drawBrandName(
  ctx: CanvasRenderingContext2D,
  x: number,
  baselineY: number,
  isStory: boolean,
  churchName: string,
  align: CanvasTextAlign,
) {
  // Discreto de propósito: a igreja assina o banner, não é a manchete. O
  // protagonismo é do evento/pregador.
  const fs = isStory ? 24 : 19;
  ctx.font = `600 ${fs}px ${SANS}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  setTracking(ctx, isStory ? 5 : 4);
  shadowOn(ctx, 8, 1);
  ctx.fillText(churchName.toUpperCase(), x, baselineY);
  shadowOff(ctx);
  setTracking(ctx, 0);
}

function drawCirclePhoto(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  cx: number,
  cy: number,
  r: number,
  ring: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const s = Math.max((2 * r) / photo.width, (2 * r) / photo.height);
  const w = photo.width * s,
    h = photo.height * s;
  ctx.drawImage(photo, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.strokeStyle = ring;
  ctx.lineWidth = 5;
  ctx.stroke();
}

// ─── Templates ──────────────────────────────────────────────────────────────

interface DrawArgs {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  isStory: boolean;
  copy: BannerCopy;
  form: FormState;
  photo: HTMLImageElement | null;
  bg: HTMLImageElement | null;
  brand: BrandKit;
}

function drawTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  isStory: boolean,
  color: string,
) {
  const fs = isStory ? 30 : 24;
  const h = isStory ? 54 : 44;
  const pad = isStory ? 22 : 18;
  ctx.font = `800 ${fs}px ${SANS}`;
  ctx.textAlign = "left";
  const w = ctx.measureText(text).width + pad * 2;
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  setTracking(ctx, 1);
  ctx.fillText(text, x + pad, y + h / 2 + 1);
  setTracking(ctx, 0);
  ctx.textBaseline = "alphabetic";
  return h;
}

// Faixa inferior com pregador/data (esquerda) e hashtags (direita).
function drawBottomStrip(a: DrawArgs, stripH: number) {
  const { ctx, w, h, isStory, copy, form, brand } = a;
  const mx = 64;
  ctx.fillStyle = hexToRgba(brand.primary, 0.92);
  ctx.fillRect(0, h - stripH, w, stripH);
  ctx.textBaseline = "middle";
  const bSize = isStory ? 38 : 30;
  if (form.pregador) {
    ctx.font = `700 ${bSize}px ${SANS}`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(
      form.pregador,
      mx,
      h - stripH / 2 - (form.data ? bSize * 0.5 : 0),
    );
  }
  if (form.data) {
    ctx.font = `400 ${bSize - 9}px ${SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "left";
    ctx.fillText(
      form.data,
      mx,
      h - stripH / 2 + (form.pregador ? bSize * 0.55 : 0),
    );
  }
  if (copy.hashtags) {
    ctx.font = `600 ${isStory ? 26 : 20}px ${SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textAlign = "right";
    ctx.fillText(copy.hashtags, w - mx, h - stripH / 2);
  }
  ctx.textBaseline = "alphabetic";
}

function templateClassico(a: DrawArgs) {
  const { ctx, w, h, isStory, copy, form, photo, bg, brand } = a;
  drawBackground(ctx, w, h, bg);

  // Overlay leve no topo (deixa a imagem viva) e forte só embaixo, onde o
  // texto precisa de contraste.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(8,6,22,0.28)");
  g.addColorStop(0.35, "rgba(8,6,22,0.12)");
  g.addColorStop(0.62, "rgba(8,6,22,0.62)");
  g.addColorStop(1, "rgba(8,6,22,0.97)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const mx = 64;
  const maxW = w - mx * 2;
  drawBrandName(ctx, mx, isStory ? 88 : 66, isStory, brand.churchName, "left");

  if (photo) {
    const r = isStory ? 200 : 155;
    drawCirclePhoto(
      ctx,
      photo,
      w - r - 56,
      isStory ? h * 0.25 : h * 0.29,
      r,
      hexToRgba(brand.primary, 0.95),
    );
  }

  const stripH = isStory ? 120 : 96;

  // Mede tudo primeiro para ancorar o bloco logo acima da faixa. Título grande
  // e dominante (estilo cartaz).
  const { size: titleSize, lines: titleLines } = fitTitle(
    ctx,
    (copy.titulo || form.tema).toUpperCase(),
    maxW,
    isStory ? 4 : 3,
    isStory ? 128 : 100,
    isStory ? 62 : 50,
    800,
  );
  const titleLH = titleSize * 1.03;

  const subSize = isStory ? 42 : 32;
  ctx.font = `400 ${subSize}px ${SANS}`;
  const subLines = wrapLines(ctx, copy.subtitulo, maxW);
  const subLH = subSize * 1.32;

  const verseSize = isStory ? 34 : 26;
  ctx.font = `italic ${verseSize}px ${SERIF}`;
  const verseLines = copy.versiculo
    ? wrapLines(ctx, `“${copy.versiculo}”`, maxW)
    : [];
  const verseLH = verseSize * 1.4;

  const tagH = isStory ? 54 : 44;
  const gap1 = isStory ? 30 : 22,
    gap2 = isStory ? 26 : 18,
    gap3 = isStory ? 20 : 14;
  const titleH = titleLines.length * titleLH;
  const subH = subLines.length * subLH;
  const verseBlockH = verseLines.length
    ? verseLines.length * verseLH + gap3 + (verseSize + 10)
    : 0;
  const totalH = tagH + gap1 + titleH + gap2 + subH + verseBlockH;

  let y = h - stripH - (isStory ? 60 : 44) - totalH;
  const minY = isStory ? 150 : 118;
  if (y < minY) y = minY;

  drawTag(ctx, form.tipo.toUpperCase(), mx, y, isStory, brand.primary);
  y += tagH + gap1;

  ctx.fillStyle = "#fff";
  ctx.font = `800 ${titleSize}px ${SANS}`;
  setTracking(ctx, isStory ? 1 : 0.5);
  shadowOn(ctx, 18, 3);
  drawLines(ctx, titleLines, mx, y + titleSize * 0.82, titleLH, "left");
  shadowOff(ctx);
  setTracking(ctx, 0);
  y += titleH + gap2;

  ctx.font = `400 ${subSize}px ${SANS}`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  drawLines(ctx, subLines, mx, y + subSize * 0.8, subLH, "left");
  y += subH;

  if (verseLines.length) {
    y += gap3;
    ctx.font = `italic ${verseSize}px ${SERIF}`;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    drawLines(ctx, verseLines, mx, y + verseSize * 0.8, verseLH, "left");
    y += verseLines.length * verseLH + (verseSize + 10);
    ctx.font = `700 ${verseSize}px ${SERIF}`;
    ctx.fillStyle = hexToRgba(brand.primary, 1);
    ctx.textAlign = "left";
    ctx.fillText(`— ${copy.versiculoRef}`, mx, y - 4);
  }

  drawBottomStrip(a, stripH);
}

function templateMinimalista(a: DrawArgs) {
  const { ctx, w, h, isStory, copy, form, bg, brand } = a;
  drawBackground(ctx, w, h, bg);

  const cx = w / 2;
  const maxW = w * 0.82;

  // Overlay leve nas bordas + reforço radial só no centro (onde fica o texto):
  // legível sem apagar a imagem.
  ctx.fillStyle = "rgba(9,7,20,0.4)";
  ctx.fillRect(0, 0, w, h);
  const vign = ctx.createRadialGradient(
    cx,
    h * 0.5,
    h * 0.1,
    cx,
    h * 0.5,
    h * 0.72,
  );
  vign.addColorStop(0, "rgba(9,7,20,0.34)");
  vign.addColorStop(1, "rgba(9,7,20,0)");
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, w, h);

  // Marca no topo + régua fina.
  drawBrandName(
    ctx,
    cx,
    isStory ? 150 : 110,
    isStory,
    brand.churchName,
    "center",
  );
  ctx.fillStyle = hexToRgba(brand.primary, 0.95);
  ctx.fillRect(cx - 34, (isStory ? 150 : 110) + 22, 68, 4);

  // Kicker (tipo do evento).
  ctx.font = `700 ${isStory ? 30 : 24}px ${SANS}`;
  ctx.fillStyle = hexToRgba(brand.primary, 1);
  ctx.textAlign = "center";
  setTracking(ctx, isStory ? 6 : 4);
  ctx.fillText(form.tipo.toUpperCase(), cx, h * 0.38);
  setTracking(ctx, 0);

  // Título centralizado (herói).
  const { size: titleSize, lines: titleLines } = fitTitle(
    ctx,
    copy.titulo || form.tema,
    maxW,
    isStory ? 4 : 3,
    isStory ? 100 : 78,
    isStory ? 56 : 44,
    800,
  );
  const titleLH = titleSize * 1.08;
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${titleSize}px ${SANS}`;
  shadowOn(ctx, 16, 2);
  const titleTop = h * 0.44;
  drawLines(
    ctx,
    titleLines,
    cx,
    titleTop + titleSize * 0.82,
    titleLH,
    "center",
  );
  shadowOff(ctx);
  let y = titleTop + titleLines.length * titleLH + (isStory ? 20 : 14);

  // Subtítulo.
  const subSize = isStory ? 38 : 30;
  ctx.font = `400 ${subSize}px ${SANS}`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const subLines = wrapLines(ctx, copy.subtitulo, maxW);
  drawLines(ctx, subLines, cx, y + subSize * 0.8, subSize * 1.3, "center");
  y += subLines.length * subSize * 1.3 + (isStory ? 40 : 28);

  // Versículo (opcional).
  if (copy.versiculo) {
    const vs = isStory ? 30 : 24;
    ctx.font = `italic ${vs}px ${SERIF}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const vLines = wrapLines(ctx, `“${copy.versiculo}”`, maxW);
    drawLines(ctx, vLines, cx, y + vs * 0.8, vs * 1.38, "center");
    y += vLines.length * vs * 1.38 + 8;
    ctx.font = `700 ${vs}px ${SERIF}`;
    ctx.fillStyle = hexToRgba(brand.primary, 1);
    ctx.fillText(copy.versiculoRef, cx, y + vs * 0.8);
  }

  // Rodapé: pregador em destaque + data secundária.
  ctx.textAlign = "center";
  if (form.pregador) {
    ctx.font = `800 ${isStory ? 40 : 32}px ${SANS}`;
    ctx.fillStyle = "#fff";
    shadowOn(ctx, 12, 2);
    ctx.fillText(form.pregador, cx, h - (isStory ? 150 : 112));
    shadowOff(ctx);
  }
  if (form.data) {
    ctx.font = `500 ${isStory ? 28 : 23}px ${SANS}`;
    ctx.fillStyle = hexToRgba(brand.primary, 1);
    setTracking(ctx, 1);
    ctx.fillText(form.data.toUpperCase(), cx, h - (isStory ? 104 : 76));
    setTracking(ctx, 0);
  }
}

function templateFoto(a: DrawArgs) {
  const { ctx, w, h, isStory, copy, form, photo, bg, brand } = a;
  drawBackground(ctx, w, h, bg);
  // Leve escurecimento — a foto/arte continua viva.
  ctx.fillStyle = "rgba(9,7,20,0.28)";
  ctx.fillRect(0, 0, w, h);

  const heroH = Math.round(h * (isStory ? 0.6 : 0.62));

  if (photo) {
    drawCover(ctx, photo, 0, 0, w, heroH);
  } else if (bg) {
    drawCover(ctx, bg, 0, 0, w, heroH);
  }
  // Fade da foto para o escuro embaixo.
  const fade = ctx.createLinearGradient(
    0,
    heroH - (isStory ? 260 : 200),
    0,
    heroH + 4,
  );
  fade.addColorStop(0, "rgba(8,6,22,0)");
  fade.addColorStop(1, "rgba(8,6,22,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, heroH - (isStory ? 260 : 200), w, isStory ? 264 : 204);
  ctx.fillStyle = "#0b0818";
  ctx.fillRect(0, heroH, w, h - heroH);

  const mx = 64;
  const maxW = w - mx * 2;

  // Marca sobre a foto (topo).
  drawBrandName(ctx, mx, isStory ? 92 : 68, isStory, brand.churchName, "left");

  let y = heroH + (isStory ? 40 : 30);
  const tagH = drawTag(
    ctx,
    form.tipo.toUpperCase(),
    mx,
    y,
    isStory,
    brand.primary,
  );
  y += tagH + (isStory ? 30 : 22);

  const { size: titleSize, lines: titleLines } = fitTitle(
    ctx,
    (copy.titulo || form.tema).toUpperCase(),
    maxW,
    3,
    isStory ? 92 : 74,
    isStory ? 54 : 44,
    800,
  );
  const titleLH = titleSize * 1.05;
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${titleSize}px ${SANS}`;
  setTracking(ctx, 0.5);
  drawLines(ctx, titleLines, mx, y + titleSize * 0.82, titleLH, "left");
  setTracking(ctx, 0);
  y += titleLines.length * titleLH + (isStory ? 24 : 16);

  // Nome em destaque (pregador/cantor) + data.
  if (form.pregador) {
    ctx.font = `700 ${isStory ? 44 : 36}px ${SANS}`;
    ctx.fillStyle = hexToRgba(brand.primary, 1);
    ctx.textAlign = "left";
    ctx.fillText(form.pregador, mx, y + (isStory ? 44 : 36) * 0.82);
    y += (isStory ? 44 : 36) * 1.25;
  }
  if (form.data) {
    ctx.font = `400 ${isStory ? 34 : 27}px ${SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.textAlign = "left";
    ctx.fillText(form.data, mx, y + (isStory ? 34 : 27) * 0.82);
    y += (isStory ? 34 : 27) * 1.3;
  }
  if (copy.hashtags) {
    ctx.font = `600 ${isStory ? 26 : 21}px ${SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "left";
    ctx.fillText(copy.hashtags, mx, h - (isStory ? 54 : 40));
  }
}

function templateVersiculo(a: DrawArgs) {
  const { ctx, w, h, isStory, copy, form, bg, brand } = a;
  drawBackground(ctx, w, h, bg);
  // Overlay moderado + reforço radial no centro: o versículo lê bem sem apagar
  // a imagem (que fica visível nas bordas).
  ctx.fillStyle = "rgba(7,5,18,0.46)";
  ctx.fillRect(0, 0, w, h);
  const cx0 = w / 2;
  const vg = ctx.createRadialGradient(
    cx0,
    h * 0.46,
    h * 0.12,
    cx0,
    h * 0.46,
    h * 0.7,
  );
  vg.addColorStop(0, "rgba(7,5,18,0.34)");
  vg.addColorStop(1, "rgba(7,5,18,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const maxW = w * 0.84;

  drawBrandName(
    ctx,
    cx,
    isStory ? 150 : 112,
    isStory,
    brand.churchName,
    "center",
  );

  // Kicker: tema/tipo.
  ctx.font = `700 ${isStory ? 28 : 22}px ${SANS}`;
  ctx.fillStyle = hexToRgba(brand.primary, 1);
  ctx.textAlign = "center";
  setTracking(ctx, isStory ? 5 : 4);
  ctx.fillText((copy.titulo || form.tipo).toUpperCase(), cx, h * 0.3);
  setTracking(ctx, 0);

  // Versículo como herói (serif grande).
  const verseText = `“${copy.versiculo || copy.subtitulo || form.tema}”`;
  let vSize = isStory ? 78 : 60;
  let vLines: string[] = [];
  for (; vSize > (isStory ? 44 : 34); vSize -= 2) {
    ctx.font = `italic 600 ${vSize}px ${SERIF}`;
    vLines = wrapLines(ctx, verseText, maxW);
    if (vLines.length <= (isStory ? 6 : 5)) break;
  }
  const vLH = vSize * 1.22;
  const blockTop = h * 0.4;
  ctx.fillStyle = "#fff";
  ctx.font = `italic 600 ${vSize}px ${SERIF}`;
  shadowOn(ctx, 14, 2);
  drawLines(ctx, vLines, cx, blockTop + vSize * 0.82, vLH, "center");
  shadowOff(ctx);
  let y = blockTop + vLines.length * vLH + (isStory ? 34 : 24);

  // Referência com réguas laterais.
  ctx.font = `700 ${isStory ? 36 : 28}px ${SANS}`;
  ctx.fillStyle = hexToRgba(brand.primary, 1);
  ctx.textAlign = "center";
  const refText = copy.versiculoRef || "";
  ctx.fillText(refText, cx, y);
  const refW = ctx.measureText(refText).width;
  ctx.fillStyle = hexToRgba(brand.primary, 0.8);
  const ruleY = y - (isStory ? 12 : 9);
  ctx.fillRect(
    cx - refW / 2 - (isStory ? 70 : 54),
    ruleY,
    isStory ? 48 : 38,
    3,
  );
  ctx.fillRect(
    cx + refW / 2 + (isStory ? 22 : 16),
    ruleY,
    isStory ? 48 : 38,
    3,
  );

  // Rodapé: pregador em destaque + data secundária.
  ctx.textAlign = "center";
  if (form.pregador) {
    ctx.font = `800 ${isStory ? 38 : 30}px ${SANS}`;
    ctx.fillStyle = "#fff";
    shadowOn(ctx, 12, 2);
    ctx.fillText(form.pregador, cx, h - (isStory ? 150 : 110));
    shadowOff(ctx);
  }
  if (form.data) {
    ctx.font = `500 ${isStory ? 26 : 21}px ${SANS}`;
    ctx.fillStyle = hexToRgba(brand.primary, 1);
    setTracking(ctx, 1);
    ctx.fillText(form.data.toUpperCase(), cx, h - (isStory ? 106 : 76));
    setTracking(ctx, 0);
  }
}

const TEMPLATE_FNS: Record<TemplateId, (a: DrawArgs) => void> = {
  classico: templateClassico,
  minimalista: templateMinimalista,
  foto: templateFoto,
  versiculo: templateVersiculo,
};

// ─── Thumbnail / foto helpers (para o histórico) ────────────────────────────

function canvasToThumbnail(
  canvas: HTMLCanvasElement,
  maxDim = 440,
  quality = 0.62,
): string {
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
  const tw = Math.round(canvas.width * scale);
  const th = Math.round(canvas.height * scale);
  const off = document.createElement("canvas");
  off.width = tw;
  off.height = th;
  const octx = off.getContext("2d");
  if (!octx) return canvas.toDataURL("image/jpeg", quality);
  octx.drawImage(canvas, 0, 0, tw, th);
  return off.toDataURL("image/jpeg", quality);
}

async function downscalePhoto(
  dataUrl: string,
  maxDim = 512,
  quality = 0.72,
): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const tw = Math.round(img.width * scale);
  const th = Math.round(img.height * scale);
  const off = document.createElement("canvas");
  off.width = tw;
  off.height = th;
  const octx = off.getContext("2d");
  if (!octx) return dataUrl;
  octx.drawImage(img, 0, 0, tw, th);
  return off.toDataURL("image/jpeg", quality);
}

// Humor visual por estilo — usado só no fallback quando a IA não devolve um
// imagemPrompt temático. Sempre luminoso/vibrante (nunca "dark moody").
const STYLE_MOOD: Record<string, string> = {
  impactante: "bold dramatic cinematic lighting, high contrast, epic, powerful",
  acolhedor: "warm soft golden hour light, welcoming glow, gentle, cozy",
  reverente:
    "serene sacred atmosphere, soft volumetric god rays, peaceful, ethereal",
  celebracao: "vibrant festive energy, colorful bokeh lights, joyful, dynamic",
};

function fallbackBgPrompt(form: FormState): string {
  const mood = STYLE_MOOD[form.estilo] ?? STYLE_MOOD.impactante;
  return `professional cinematic poster background for a church event about "${form.tema}", ${mood}, rich vivid colors, volumetric light, luminous, highly detailed, no text, no letters, no words`;
}

function buildBgUrl(
  prompt: string,
  formato: FormState["formato"],
  seed: number,
): string {
  const h = formato === "story" ? 1920 : 1080;
  return `/api/media/bg-proxy?prompt=${encodeURIComponent(prompt)}&w=1080&h=${h}&seed=${seed}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BannerGenerator({
  churchName: churchNameProp,
}: {
  churchName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user, tenantRuntime, organizationId, firebaseConfig } = useAppAuth();

  // Branding real do tenant: nome + cor primária. Cai para defaults quando a
  // org (demo/nova) ainda não tem branding.
  const brand: BrandKit = useMemo(() => {
    const org = tenantRuntime?.organization;
    const b = tenantRuntime?.settings?.branding;
    return {
      churchName:
        org?.displayName ||
        org?.publicName ||
        org?.name ||
        churchNameProp ||
        "Minha Igreja",
      primary: b?.primaryColor || "#7c3aed",
    };
  }, [tenantRuntime, churchNameProp]);

  const [form, setForm] = useState<FormState>({
    tipo: "Culto Domingo",
    tema: "",
    pregador: "",
    data: "",
    estilo: "impactante",
    formato: "feed",
    template: "classico",
  });

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [copy, setCopy] = useState<BannerCopy | null>(null);
  const [status, setStatus] = useState<
    "idle" | "generating-copy" | "generating-bg" | "drawing" | "done" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 9999));

  const [history, setHistory] = useState<BannerHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState("");
  // true quando o fundo de IA falhou e caímos no gradiente (Pollinations fora).
  const [bgWarning, setBgWarning] = useState(false);

  // Imagens pré-carregadas usadas no desenho (evitam await no render).
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const bgObjectUrlRef = useRef<string | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const currentEntryIdRef = useRef<string | null>(null);
  // Prompt de imagem realmente usado na última geração (temático da IA ou
  // fallback) — reaproveitado no "novo fundo" e persistido no histórico.
  const bgPromptRef = useRef<string>("");

  const configured = isFirebaseWebRuntimeConfigured(firebaseConfig);

  // Carrega a foto do pregador no ref sempre que muda (para o desenho síncrono).
  useEffect(() => {
    let cancelled = false;
    if (!photoDataUrl) {
      photoImgRef.current = null;
      return;
    }
    loadImage(photoDataUrl)
      .then((img) => {
        if (!cancelled) photoImgRef.current = img;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photoDataUrl]);

  // Carrega o histórico ao montar.
  useEffect(() => {
    if (!configured || !organizationId) return;
    let cancelled = false;
    fetchBannerHistory(firebaseConfig, { organizationId })
      .then((list) => {
        if (!cancelled) setHistory(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [configured, organizationId, firebaseConfig]);

  // Libera o object URL do fundo ao desmontar.
  useEffect(
    () => () => {
      if (bgObjectUrlRef.current) URL.revokeObjectURL(bgObjectUrlRef.current);
    },
    [],
  );

  // Desenho síncrono a partir dos refs + args (evita closures obsoletas).
  const renderCanvas = useCallback(
    (formArg: FormState, copyArg: BannerCopy) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { w, h } = CANVAS_SIZES[formArg.formato];
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.textBaseline = "alphabetic";
      const args: DrawArgs = {
        ctx,
        w,
        h,
        isStory: formArg.formato === "story",
        copy: copyArg,
        form: formArg,
        photo: photoImgRef.current,
        bg: bgImgRef.current,
        brand,
      };
      (TEMPLATE_FNS[formArg.template] ?? templateClassico)(args);
    },
    [brand],
  );

  // Persiste no histórico (novo ou atualizando a entrada corrente).
  const persistHistory = useCallback(
    async (
      formArg: FormState,
      copyArg: BannerCopy,
      seedVal: number,
      isNew: boolean,
      bgPrompt: string,
    ) => {
      if (!configured || !organizationId) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      let thumb: string;
      try {
        thumb = canvasToThumbnail(canvas);
      } catch {
        return;
      }
      let photo: string | undefined;
      if (photoDataUrl) {
        try {
          photo = await downscalePhoto(photoDataUrl);
        } catch {
          photo = undefined;
        }
      }

      const id =
        isNew || !currentEntryIdRef.current
          ? (crypto.randomUUID?.() ??
            `bn_${Date.now()}_${Math.floor(Math.random() * 1e6)}`)
          : currentEntryIdRef.current;
      currentEntryIdRef.current = id;

      const entry: BannerHistoryEntry = {
        id,
        organizationId,
        createdAt: new Date().toISOString(),
        createdByUserId: user?.uid,
        template: formArg.template,
        formato: formArg.formato,
        tipo: formArg.tipo,
        tema: formArg.tema,
        pregador: formArg.pregador || undefined,
        data: formArg.data || undefined,
        estilo: formArg.estilo,
        seed: seedVal,
        bgPrompt,
        copy: {
          titulo: copyArg.titulo,
          subtitulo: copyArg.subtitulo,
          versiculo: copyArg.versiculo,
          versiculoRef: copyArg.versiculoRef,
          hashtags: copyArg.hashtags,
        },
        thumbnailDataUrl: thumb,
        photoDataUrl: photo,
      };

      try {
        await saveBannerHistoryEntry(firebaseConfig, { organizationId }, entry);
        setHistory((prev) =>
          [entry, ...prev.filter((e) => e.id !== id)].slice(0, 24),
        );
      } catch (e) {
        setHistoryError(
          friendlyError(e, "Não foi possível salvar no histórico"),
        );
      }
    },
    [configured, organizationId, firebaseConfig, photoDataUrl, user],
  );

  // Carrega o fundo (determinístico pelo seed + prompt) e desenha. NUNCA
  // derruba a composição: o Pollinations é instável (5xx/timeout esporádico),
  // então tentamos 2x e, se falhar, desenhamos com o gradiente de fallback.
  // Retorna true se o fundo de IA carregou; false se caiu no gradiente.
  const composeWithBg = useCallback(
    async (
      formArg: FormState,
      copyArg: BannerCopy,
      seedVal: number,
      bgPrompt: string,
    ): Promise<boolean> => {
      if (!user) throw new Error("Faça login para gerar banners");
      const idToken = await user.getIdToken();
      const url = buildBgUrl(bgPrompt, formArg.formato, seedVal);
      let img: HTMLImageElement | null = null;
      for (let attempt = 0; attempt < 2 && !img; attempt++) {
        try {
          const obj = await fetchBgAsObjectUrl(url, idToken);
          if (bgObjectUrlRef.current)
            URL.revokeObjectURL(bgObjectUrlRef.current);
          bgObjectUrlRef.current = obj;
          img = await loadImage(obj);
        } catch {
          img = null; // tenta de novo; na 2ª falha cai pro gradiente
        }
      }
      bgImgRef.current = img;
      renderCanvas(formArg, copyArg);
      return img !== null;
    },
    [user, renderCanvas],
  );

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const generate = useCallback(async () => {
    if (!form.tema.trim()) return;
    if (!user) {
      setStatus("error");
      setErrorMsg("Faça login para gerar banners");
      return;
    }
    const idToken = await user.getIdToken();
    const useSeed = Math.floor(Math.random() * 9999);
    setSeed(useSeed);
    currentEntryIdRef.current = null; // nova geração => nova entrada no histórico
    setStatus("generating-copy");
    setErrorMsg("");

    // 1 — copy (DeepSeek → Groq)
    let bannerCopy: BannerCopy;
    try {
      const res = await fetch("/api/media/banner-copy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          tipo: form.tipo,
          tema: form.tema,
          pregador: form.pregador,
          data: form.data,
          estilo: form.estilo,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Erro ao gerar copy");
      bannerCopy = data.copy;
      setCopy(bannerCopy);
    } catch (e) {
      setStatus("error");
      setErrorMsg(friendlyError(e, "Erro ao gerar texto"));
      return;
    }

    // 2 + 3 — fundo (Pollinations) + composição. O fetch do fundo é o passo
    // lento (~20s), então o status "generating-bg" cobre toda a composição; o
    // desenho no canvas em si é síncrono e instantâneo.
    setStatus("generating-bg");
    // Prompt de imagem temático da IA (com "vida") ou fallback vibrante.
    const bgPrompt = bannerCopy.imagemPrompt?.trim() || fallbackBgPrompt(form);
    bgPromptRef.current = bgPrompt;
    try {
      const bgOk = await composeWithBg(form, bannerCopy, useSeed, bgPrompt);
      setBgWarning(!bgOk);
      setStatus("done");
      persistHistory(form, bannerCopy, useSeed, true, bgPrompt);
    } catch (e) {
      setStatus("error");
      setErrorMsg(friendlyError(e, "Erro ao compor banner"));
    }
  }, [form, user, composeWithBg, persistHistory]);

  const regenerateBg = useCallback(async () => {
    if (!copy || !user) return;
    const newSeed = Math.floor(Math.random() * 9999);
    setSeed(newSeed);
    setStatus("generating-bg");
    const bgPrompt = bgPromptRef.current || fallbackBgPrompt(form);
    try {
      const bgOk = await composeWithBg(form, copy, newSeed, bgPrompt);
      setBgWarning(!bgOk);
      setStatus("done");
      persistHistory(form, copy, newSeed, false, bgPrompt);
    } catch (e) {
      setStatus("error");
      setErrorMsg(friendlyError(e, "Erro ao gerar novo fundo"));
    }
  }, [copy, user, form, composeWithBg, persistHistory]);

  // Troca de template (ao vivo, sem regerar copy/fundo).
  const setTemplate = useCallback(
    (template: TemplateId) => {
      setForm((s) => ({ ...s, template }));
      if (status === "done" && copy && bgImgRef.current) {
        const next = { ...form, template };
        renderCanvas(next, copy);
        persistHistory(
          next,
          copy,
          seed,
          false,
          bgPromptRef.current || fallbackBgPrompt(next),
        );
      }
    },
    [status, copy, form, seed, renderCanvas, persistHistory],
  );

  const openFromHistory = useCallback(
    async (entry: BannerHistoryEntry) => {
      const nextForm: FormState = {
        tipo: entry.tipo,
        tema: entry.tema,
        pregador: entry.pregador ?? "",
        data: entry.data ?? "",
        estilo: entry.estilo,
        formato: entry.formato,
        template: (entry.template as TemplateId) ?? "classico",
      };
      const nextCopy: BannerCopy = entry.copy;
      setForm(nextForm);
      setCopy(nextCopy);
      setSeed(entry.seed);
      setPhotoDataUrl(entry.photoDataUrl ?? null);
      photoImgRef.current = entry.photoDataUrl
        ? await loadImage(entry.photoDataUrl).catch(() => null)
        : null;
      currentEntryIdRef.current = entry.id;
      bgPromptRef.current = entry.bgPrompt || fallbackBgPrompt(nextForm);
      setErrorMsg("");
      setStatus("generating-bg");
      try {
        const bgOk = await composeWithBg(
          nextForm,
          nextCopy,
          entry.seed,
          bgPromptRef.current,
        );
        setBgWarning(!bgOk);
        setStatus("done");
      } catch (e) {
        setStatus("error");
        setErrorMsg(friendlyError(e, "Erro ao reabrir banner"));
      }
    },
    [composeWithBg],
  );

  const removeFromHistory = useCallback(
    async (id: string) => {
      if (!configured || !organizationId) return;
      const prev = history;
      setHistory((h) => h.filter((e) => e.id !== id));
      try {
        await deleteBannerHistoryEntry(firebaseConfig, { organizationId }, id);
      } catch (e) {
        setHistory(prev); // reverte se falhar (ex.: sem permissão de admin)
        setHistoryError(
          friendlyError(e, "Só administradores podem excluir do histórico"),
        );
      }
    },
    [configured, organizationId, firebaseConfig, history],
  );

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `banner-${form.tipo.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const shareWhatsApp = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "banner.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: copy?.titulo ?? "Banner",
        });
      } else {
        const text = encodeURIComponent(
          `${copy?.titulo ?? ""}\n${copy?.subtitulo ?? ""}\n${copy?.hashtags ?? ""}`,
        );
        window.open(`https://wa.me/?text=${text}`, "_blank");
      }
    }, "image/png");
  };

  const isLoading = ["generating-copy", "generating-bg", "drawing"].includes(
    status,
  );

  const previewSize =
    form.formato === "story"
      ? { width: 270, height: 480 }
      : { width: 400, height: 400 };

  return (
    <div className="banner-gen-root">
      {/* ── Form ── */}
      <div className="banner-gen-form">
        <h2 className="banner-gen-title">Gerador de Banner</h2>
        <p className="banner-gen-desc">
          Crie banners de <strong>{brand.churchName}</strong> para redes sociais
          em segundos — texto e arte gerados por IA.
        </p>

        <div className="banner-field">
          <label>Formato</label>
          <div className="banner-toggle-group">
            {(["feed", "story"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`banner-toggle ${form.formato === f ? "active" : ""}`}
                onClick={() => setForm((s) => ({ ...s, formato: f }))}
              >
                {f === "feed" ? "Feed (1080×1080)" : "Story (1080×1920)"}
              </button>
            ))}
          </div>
        </div>

        <div className="banner-field">
          <label>Modelo / Layout</label>
          <div className="banner-template-grid">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`banner-template ${form.template === t.id ? "active" : ""}`}
                onClick={() => setTemplate(t.id)}
              >
                <span className="banner-template-label">{t.label}</span>
                <span className="banner-template-hint">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="banner-field">
          <label>Tipo de evento</label>
          <select
            value={form.tipo}
            onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value }))}
          >
            {TIPOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="banner-field">
          <label>
            Tema / Mensagem <span className="required">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: A fé que move montanhas"
            value={form.tema}
            onChange={(e) => setForm((s) => ({ ...s, tema: e.target.value }))}
          />
        </div>

        <div className="banner-field">
          <label>Pregador / Cantor</label>
          <input
            type="text"
            placeholder="Nome completo"
            value={form.pregador}
            onChange={(e) =>
              setForm((s) => ({ ...s, pregador: e.target.value }))
            }
          />
        </div>

        <div className="banner-field">
          <label>Data e horário</label>
          <input
            type="text"
            placeholder="Ex: Domingo, 06 jul · 19h"
            value={form.data}
            onChange={(e) => setForm((s) => ({ ...s, data: e.target.value }))}
          />
        </div>

        <div className="banner-field">
          <label>Estilo visual</label>
          <div className="banner-chip-group">
            {ESTILOS.map((e) => (
              <button
                key={e.value}
                type="button"
                className={`banner-chip ${form.estilo === e.value ? "active" : ""}`}
                onClick={() => setForm((s) => ({ ...s, estilo: e.value }))}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="banner-field">
          <label>Foto do pregador/cantor</label>
          {photoDataUrl ? (
            <div className="banner-photo-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoDataUrl} alt="Foto" />
              <button
                className="banner-photo-remove"
                onClick={() => setPhotoDataUrl(null)}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="banner-photo-upload">
              <ImagePlus size={18} />
              <span>Clique para adicionar foto</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                hidden
              />
            </label>
          )}
        </div>

        <button
          className="banner-btn-generate"
          onClick={() => generate()}
          disabled={isLoading || !form.tema.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="spin" />{" "}
              {status === "generating-copy"
                ? "Gerando texto..."
                : status === "generating-bg"
                  ? "Gerando imagem..."
                  : "Compondo banner..."}
            </>
          ) : (
            <>
              <Sparkles size={16} /> Gerar Banner
            </>
          )}
        </button>

        {status === "error" && <p className="banner-error">{errorMsg}</p>}

        {copy && (
          <div className="banner-copy-preview">
            <p className="copy-title">{copy.titulo}</p>
            <p className="copy-sub">{copy.subtitulo}</p>
            <p className="copy-verse">
              &ldquo;{copy.versiculo}&rdquo; — {copy.versiculoRef}
            </p>
            <p className="copy-tags">{copy.hashtags}</p>
          </div>
        )}
      </div>

      {/* ── Preview & actions ── */}
      <div className="banner-gen-preview">
        <div
          className="banner-canvas-wrapper"
          style={{ width: previewSize.width, height: previewSize.height }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: previewSize.width, height: previewSize.height }}
          />
          {status === "idle" && (
            <div className="banner-canvas-placeholder">
              <Sparkles size={36} strokeWidth={1.5} />
              <p>Preencha o formulário e clique em Gerar Banner</p>
            </div>
          )}
          {isLoading && (
            <div className="banner-canvas-placeholder">
              <Loader2 size={36} className="spin" strokeWidth={1.5} />
              <p>
                {status === "generating-copy"
                  ? "Gerando texto com IA..."
                  : status === "generating-bg"
                    ? "Gerando arte (pode levar 20s)..."
                    : "Compondo..."}
              </p>
            </div>
          )}
        </div>

        {status === "done" && (
          <>
            {bgWarning && (
              <p className="banner-bg-warning">
                O gerador de arte (Pollinations) não respondeu — usei um fundo
                gradiente. Clique em <strong>Novo fundo</strong> para tentar de
                novo.
              </p>
            )}
            <div className="banner-actions">
              <button
                className="banner-action-btn secondary"
                onClick={regenerateBg}
                title="Gerar novo fundo"
              >
                <RefreshCw size={16} /> Novo fundo
              </button>
              <button className="banner-action-btn primary" onClick={download}>
                <Download size={16} /> Baixar PNG
              </button>
              <button
                className="banner-action-btn whatsapp"
                onClick={shareWhatsApp}
              >
                <Share2 size={16} /> WhatsApp
              </button>
            </div>
          </>
        )}

        <p className="banner-credit">
          Arte gerada por <strong>Pollinations.ai</strong> (FLUX) · texto por{" "}
          <strong>IA (DeepSeek)</strong> · sem custo
        </p>
      </div>

      {/* ── Histórico ── */}
      {history.length > 0 && (
        <section className="banner-history">
          <div className="banner-history-head">
            <History size={18} />
            <h3>Histórico</h3>
            <span className="banner-history-count">{history.length}</span>
          </div>
          {historyError && <p className="banner-error">{historyError}</p>}
          <div className="banner-history-grid">
            {history.map((entry) => (
              <div key={entry.id} className="banner-history-card">
                <button
                  type="button"
                  className="banner-history-thumb"
                  onClick={() => openFromHistory(entry)}
                  title="Reabrir este banner"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.thumbnailDataUrl}
                    alt={entry.copy.titulo || entry.tema}
                  />
                  <span className="banner-history-badge">
                    {entry.formato === "story" ? "Story" : "Feed"}
                  </span>
                </button>
                <div className="banner-history-meta">
                  <p className="banner-history-title">
                    {entry.copy.titulo || entry.tema}
                  </p>
                  <p className="banner-history-sub">{entry.tipo}</p>
                </div>
                <div className="banner-history-actions">
                  <button
                    type="button"
                    onClick={() => openFromHistory(entry)}
                    title="Reabrir"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromHistory(entry.id)}
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

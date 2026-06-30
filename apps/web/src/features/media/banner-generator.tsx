"use client";

import { useRef, useState, useCallback } from "react";
import {
  Download,
  Share2,
  Sparkles,
  ImagePlus,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import type { BannerCopy } from "../../../app/api/media/banner-copy/route";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  tipo: string;
  tema: string;
  pregador: string;
  data: string;
  estilo: string;
  formato: "feed" | "story";
}

const CANVAS_SIZES = {
  feed:  { w: 1080, h: 1080 },
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
  { value: "acolhedor",  label: "Acolhedor"  },
  { value: "reverente",  label: "Reverente"  },
  { value: "celebracao", label: "Celebração" },
];

// ─── Canvas drawing ────────────────────────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy + lineHeight;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawBanner(
  canvas: HTMLCanvasElement,
  bgUrl: string,
  copy: BannerCopy,
  form: FormState,
  photoDataUrl: string | null,
  churchName: string
): Promise<void> {
  const { w, h } = CANVAS_SIZES[form.formato];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // 1 — background image
  try {
    const bg = await loadImage(bgUrl);
    ctx.drawImage(bg, 0, 0, w, h);
  } catch {
    ctx.fillStyle = "#1a1040";
    ctx.fillRect(0, 0, w, h);
  }

  // 2 — dark gradient overlay (bottom 70%)
  const grad = ctx.createLinearGradient(0, h * 0.25, 0, h);
  grad.addColorStop(0, "rgba(10,8,30,0)");
  grad.addColorStop(0.4, "rgba(10,8,30,0.7)");
  grad.addColorStop(1, "rgba(10,8,30,0.95)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 3 — optional circular preacher photo (top right area)
  if (photoDataUrl) {
    try {
      const photo = await loadImage(photoDataUrl);
      const r = form.formato === "story" ? 220 : 170;
      const cx = w - r - 60;
      const cy = form.formato === "story" ? h * 0.28 : h * 0.3;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(photo, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      // ring
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 3;
      ctx.stroke();
    } catch { /* skip if photo fails */ }
  }

  // 4 — church name bar at top
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, 0, w, form.formato === "story" ? 90 : 70);
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${form.formato === "story" ? 36 : 28}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(churchName.toUpperCase(), w / 2, form.formato === "story" ? 45 : 35);

  // 5 — tipo tag
  const tagY = form.formato === "story" ? h * 0.45 : h * 0.42;
  ctx.font = `700 ${form.formato === "story" ? 32 : 24}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const tagPad = 18;
  const tagText = form.tipo.toUpperCase();
  const tagW = ctx.measureText(tagText).width + tagPad * 2;
  const tagH = form.formato === "story" ? 48 : 38;
  ctx.fillStyle = "#7c3aed";
  roundRect(ctx, 60, tagY, tagW, tagH, 6);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(tagText, 60 + tagPad, tagY + tagH - 10);

  // 6 — título (big)
  const titleSize = form.formato === "story" ? 96 : 72;
  ctx.font = `800 ${titleSize}px system-ui, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const titleY = tagY + tagH + (form.formato === "story" ? 60 : 48);
  wrapText(ctx, copy.titulo.toUpperCase(), 60, titleY, w - 120, titleSize * 1.15);

  // 7 — subtítulo
  const subSize = form.formato === "story" ? 44 : 34;
  ctx.font = `400 ${subSize}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const subY = titleY + titleSize * Math.ceil(copy.titulo.length / 18) * 1.15 + 16;
  const afterSub = wrapText(ctx, copy.subtitulo, 60, subY, w - 140, subSize * 1.4);

  // 8 — versículo
  if (copy.versiculo) {
    const verseSize = form.formato === "story" ? 34 : 26;
    ctx.font = `italic ${verseSize}px Georgia, serif`;
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    const verseText = `"${copy.versiculo}"`;
    const afterVerse = wrapText(ctx, verseText, 60, afterSub + 20, w - 140, verseSize * 1.45);
    ctx.font = `600 ${verseSize}px Georgia, serif`;
    ctx.fillStyle = "#a78bfa";
    ctx.fillText(`— ${copy.versiculoRef}`, 60, afterVerse + 4);
  }

  // 9 — bottom strip: pregador + data
  const stripH = form.formato === "story" ? 110 : 90;
  ctx.fillStyle = "rgba(124,58,237,0.85)";
  ctx.fillRect(0, h - stripH, w, stripH);

  const bottomSize = form.formato === "story" ? 38 : 30;
  ctx.font = `700 ${bottomSize}px system-ui, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  if (form.pregador) {
    ctx.fillText(form.pregador, 60, h - stripH / 2 - (form.data ? 14 : 0));
  }
  if (form.data) {
    ctx.font = `400 ${bottomSize - 8}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(form.data, 60, h - stripH / 2 + (form.pregador ? 20 : 0));
  }

  // 10 — hashtags (bottom right)
  ctx.font = `400 ${form.formato === "story" ? 28 : 22}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "right";
  ctx.fillText(copy.hashtags, w - 60, h - stripH / 2);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BannerGenerator({ churchName = "Minha Igreja" }: { churchName?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [form, setForm] = useState<FormState>({
    tipo: "Culto Domingo",
    tema: "",
    pregador: "",
    data: "",
    estilo: "impactante",
    formato: "feed",
  });

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [copy, setCopy] = useState<BannerCopy | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "generating-copy" | "generating-bg" | "drawing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 9999));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const generate = useCallback(async (newSeed?: number) => {
    if (!form.tema.trim()) return;
    const useSeed = newSeed ?? seed;
    setStatus("generating-copy");
    setErrorMsg("");

    // Step 1 — Groq copy
    let bannerCopy: BannerCopy;
    try {
      const res = await fetch("/api/media/banner-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setErrorMsg(e instanceof Error ? e.message : "Erro ao gerar texto");
      return;
    }

    // Step 2 — Pollinations background
    setStatus("generating-bg");
    const bgPrompt = `evangelical church worship service, ${form.tema}, ${form.estilo}, dramatic lighting, abstract artistic background, dark moody atmosphere, professional photography, no text, cinematic`;
    const bgProxyUrl = `/api/media/bg-proxy?prompt=${encodeURIComponent(bgPrompt)}&w=1080&h=${form.formato === "story" ? 1920 : 1080}&seed=${useSeed}`;
    setBgUrl(bgProxyUrl);

    // Step 3 — draw canvas
    setStatus("drawing");
    const canvas = canvasRef.current;
    if (!canvas) { setStatus("error"); setErrorMsg("Canvas não encontrado"); return; }

    try {
      await drawBanner(canvas, bgProxyUrl, bannerCopy, form, photoDataUrl, churchName);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Erro ao compor banner");
    }
  }, [form, photoDataUrl, seed, churchName]);

  const regenerateBg = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 9999);
    setSeed(newSeed);
    if (copy) {
      setStatus("generating-bg");
      const canvas = canvasRef.current;
      if (!canvas) return;
      const bgPrompt = `evangelical church worship service, ${form.tema}, ${form.estilo}, dramatic lighting, abstract artistic background, dark moody atmosphere, professional photography, no text, cinematic`;
      const bgProxyUrl = `/api/media/bg-proxy?prompt=${encodeURIComponent(bgPrompt)}&w=1080&h=${form.formato === "story" ? 1920 : 1080}&seed=${newSeed}`;
      setBgUrl(bgProxyUrl);
      setStatus("drawing");
      drawBanner(canvas, bgProxyUrl, copy, form, photoDataUrl, churchName)
        .then(() => setStatus("done"))
        .catch((e) => { setStatus("error"); setErrorMsg(e.message); });
    }
  }, [copy, form, photoDataUrl, churchName]);

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
      if (navigator.share && navigator.canShare({ files: [new File([blob], "banner.png", { type: "image/png" })] })) {
        await navigator.share({
          files: [new File([blob], "banner.png", { type: "image/png" })],
          title: copy?.titulo ?? "Banner",
        });
      } else {
        // fallback: open wa.me with text only
        const text = encodeURIComponent(`${copy?.titulo ?? ""}\n${copy?.subtitulo ?? ""}\n${copy?.hashtags ?? ""}`);
        window.open(`https://wa.me/?text=${text}`, "_blank");
      }
    }, "image/png");
  };

  const isLoading = ["generating-copy", "generating-bg", "drawing"].includes(status);

  const previewSize = form.formato === "story"
    ? { width: 270, height: 480 }
    : { width: 400, height: 400 };

  return (
    <div className="banner-gen-root">
      {/* ── Form ── */}
      <div className="banner-gen-form">
        <h2 className="banner-gen-title">Gerador de Banner</h2>
        <p className="banner-gen-desc">Crie banners para redes sociais em segundos — texto e arte gerados por IA.</p>

        <div className="banner-field">
          <label>Formato</label>
          <div className="banner-toggle-group">
            {(["feed", "story"] as const).map((f) => (
              <button
                key={f}
                className={`banner-toggle ${form.formato === f ? "active" : ""}`}
                onClick={() => setForm((s) => ({ ...s, formato: f }))}
              >
                {f === "feed" ? "Feed (1080×1080)" : "Story (1080×1920)"}
              </button>
            ))}
          </div>
        </div>

        <div className="banner-field">
          <label>Tipo de evento</label>
          <select value={form.tipo} onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value }))}>
            {TIPOS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="banner-field">
          <label>Tema / Mensagem <span className="required">*</span></label>
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
            onChange={(e) => setForm((s) => ({ ...s, pregador: e.target.value }))}
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
              <button className="banner-photo-remove" onClick={() => setPhotoDataUrl(null)}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="banner-photo-upload">
              <ImagePlus size={18} />
              <span>Clique para adicionar foto</span>
              <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
            </label>
          )}
        </div>

        <button
          className="banner-btn-generate"
          onClick={() => generate()}
          disabled={isLoading || !form.tema.trim()}
        >
          {isLoading ? (
            <><Loader2 size={16} className="spin" /> {
              status === "generating-copy" ? "Gerando texto..." :
              status === "generating-bg"   ? "Gerando imagem..." :
              "Compondo banner..."
            }</>
          ) : (
            <><Sparkles size={16} /> Gerar Banner</>
          )}
        </button>

        {status === "error" && (
          <p className="banner-error">{errorMsg}</p>
        )}

        {copy && (
          <div className="banner-copy-preview">
            <p className="copy-title">{copy.titulo}</p>
            <p className="copy-sub">{copy.subtitulo}</p>
            <p className="copy-verse">"{copy.versiculo}" — {copy.versiculoRef}</p>
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
              <p>{
                status === "generating-copy" ? "Gerando texto com IA..." :
                status === "generating-bg"   ? "Gerando arte (pode levar 20s)..." :
                "Compondo..."
              }</p>
            </div>
          )}
        </div>

        {status === "done" && (
          <div className="banner-actions">
            <button className="banner-action-btn secondary" onClick={regenerateBg} title="Gerar novo fundo">
              <RefreshCw size={16} /> Novo fundo
            </button>
            <button className="banner-action-btn primary" onClick={download}>
              <Download size={16} /> Baixar PNG
            </button>
            <button className="banner-action-btn whatsapp" onClick={shareWhatsApp}>
              <Share2 size={16} /> WhatsApp
            </button>
          </div>
        )}

        <p className="banner-credit">
          Arte gerada por <strong>Pollinations.ai</strong> (FLUX) · texto por <strong>Groq</strong> · sem custo
        </p>
      </div>
    </div>
  );
}

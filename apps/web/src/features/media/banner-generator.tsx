"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { friendlyError } from "../../lib/friendly-error";
import {
  Download,
  Share2,
  Sparkles,
  Loader2,
  History,
  Trash2,
} from "lucide-react";
import {
  bannerImagePrompt,
  imageRequestSize,
  type BannerCopy,
} from "./banner-contract";
import type { BannerHistoryEntry } from "@alvo/types";
import {
  isFirebaseWebRuntimeConfigured,
  saveBannerHistoryEntry,
  fetchBannerHistory,
  deleteBannerHistoryEntry,
} from "@alvo/firebase";
import { useAppAuth } from "../../../app/providers";

class BannerServiceError extends Error {}
function bannerError(error: unknown, fallback: string) {
  if (error instanceof BannerServiceError) return error.message;
  if (
    error instanceof Error &&
    ["TimeoutError", "AbortError"].includes(error.name)
  )
    return "A espera terminou. Seu banner foi preservado. Você pode continuar manualmente ou tentar novamente depois.";
  return friendlyError(error, fallback);
}

async function fetchBackground(
  url: string,
  idToken: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new BannerServiceError(
      data.error ||
        "Não foi possível gerar o fundo. Seu banner foi preservado.",
    );
  }
  const blob = await res.blob();
  // data: already belongs to img-src. blob: is intentionally absent from the CSP.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(blob);
  });
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
  { id: "classico", label: "Clássico", hint: "Título em destaque" },
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
    const timer = setTimeout(() => {
      img.src = "";
      reject(new Error("Tempo esgotado ao abrir imagem."));
    }, 15000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Arquivo de imagem inválido."));
    };
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
  const words = (text || "")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => {
      if (ctx.measureText(word).width <= maxWidth) return [word];
      const chunks: string[] = [];
      let chunk = "";
      for (const char of word) {
        if (chunk && ctx.measureText(chunk + char).width > maxWidth) {
          chunks.push(chunk);
          chunk = "";
        }
        chunk += char;
      }
      if (chunk) chunks.push(chunk);
      return chunks;
    });
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

function drawPoster(a: DrawArgs) {
  const { ctx, w, h, isStory, form, copy, brand, photo, bg } = a;
  drawBackground(ctx, w, h, bg);
  if (form.template === "foto" && photo)
    drawCover(ctx, photo, 0, 0, w, h * 0.48);
  const overlay = ctx.createLinearGradient(0, 0, 0, h);
  overlay.addColorStop(0, "rgba(8,10,18,.35)");
  overlay.addColorStop(0.3, "rgba(8,10,18,.16)");
  overlay.addColorStop(0.62, "rgba(8,10,18,.80)");
  overlay.addColorStop(1, "rgba(8,10,18,.96)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, w, h);
  const mx = 70,
    maxW = w - mx * 2;
  const centered =
    form.template === "minimalista" || form.template === "versiculo";
  const x = centered ? w / 2 : mx,
    align = centered ? "center" : "left";
  ctx.fillStyle = "#fff";
  ctx.textAlign = align;
  ctx.font = `700 ${isStory ? 32 : 25}px ${SANS}`;
  ctx.fillText(brand.churchName, x, isStory ? 110 : 75, maxW);
  if (photo && form.template !== "foto")
    drawCirclePhoto(
      ctx,
      photo,
      w - 220,
      isStory ? 365 : 270,
      135,
      brand.primary,
    );

  const isVerse = form.template === "versiculo" && !!copy.versiculo;
  const title = isVerse
    ? `“${copy.versiculo}”`
    : copy.titulo || form.tema || "Seu tema aqui";
  const support = isVerse ? copy.versiculoRef : copy.subtitulo;
  const verse =
    !isVerse && copy.versiculo ? `${copy.versiculo} ${copy.versiculoRef}` : "";
  const top = h * (form.template === "foto" ? 0.48 : 0.39),
    bottom = h - (isStory ? 210 : 155);
  let size = isStory ? 118 : 96;
  let titleLines: string[] = [],
    subLines: string[] = [],
    verseLines: string[] = [],
    total = 0;
  for (; size >= 24; size -= 2) {
    ctx.font = `800 ${size}px ${isVerse ? SERIF : SANS}`;
    titleLines = wrapLines(ctx, title, maxW);
    ctx.font = `500 ${size * 0.36}px ${SANS}`;
    subLines = wrapLines(ctx, support, maxW);
    ctx.font = `italic ${size * 0.29}px ${SERIF}`;
    verseLines = wrapLines(ctx, verse, maxW);
    total =
      titleLines.length * size * 1.1 +
      subLines.length * size * 0.48 +
      verseLines.length * size * 0.4 +
      90;
    if (total <= bottom - top) break;
  }
  let y = Math.max(top, bottom - total);
  ctx.font = `700 ${isStory ? 30 : 24}px ${SANS}`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = align;
  ctx.fillText(form.tipo.toUpperCase(), x, y, maxW);
  y += 50;
  ctx.font = `800 ${size}px ${isVerse ? SERIF : SANS}`;
  drawLines(ctx, titleLines, x, y + size * 0.8, size * 1.1, align);
  y += titleLines.length * size * 1.1 + 20;
  ctx.font = `500 ${size * 0.36}px ${SANS}`;
  ctx.fillStyle = "rgba(255,255,255,.92)";
  drawLines(ctx, subLines, x, y + size * 0.3, size * 0.48, align);
  y += subLines.length * size * 0.48 + 16;
  ctx.font = `italic ${size * 0.29}px ${SERIF}`;
  drawLines(ctx, verseLines, x, y + size * 0.24, size * 0.4, align);

  ctx.fillStyle = brand.primary;
  ctx.fillRect(centered ? w / 2 - 32 : mx, h - (isStory ? 170 : 125), 64, 5);
  ctx.fillStyle = "#fff";
  ctx.textAlign = align;
  ctx.font = `700 ${isStory ? 38 : 30}px ${SANS}`;
  ctx.fillText(form.pregador, x, h - (isStory ? 105 : 78), maxW);
  ctx.font = `500 ${isStory ? 30 : 24}px ${SANS}`;
  ctx.fillText(form.data, x, h - (isStory ? 55 : 36), maxW);
}

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
  octx.fillStyle = "#fff";
  octx.fillRect(0, 0, tw, th);
  octx.drawImage(img, 0, 0, tw, th);
  return off.toDataURL("image/jpeg", quality);
}

function buildBgUrl(
  prompt: string,
  formato: FormState["formato"],
  seed: number,
  organizationId: string,
): string {
  const { w, h } = imageRequestSize(formato);
  return `/api/media/bg-proxy?${new URLSearchParams({ prompt, w: String(w), h: String(h), seed: String(seed), organizationId })}`;
}

const EMPTY_FORM: FormState = {
  tipo: "Culto de Domingo",
  tema: "",
  pregador: "",
  data: "",
  estilo: "acolhedor",
  formato: "feed",
  template: "classico",
};
const EMPTY_COPY: BannerCopy = {
  titulo: "",
  subtitulo: "",
  versiculo: "",
  versiculoRef: "",
  hashtags: "",
};

export function BannerGenerator({
  churchName: churchNameProp,
}: {
  churchName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user, tenantRuntime, organizationId, firebaseConfig } = useAppAuth();
  const brand = useMemo(
    () => ({
      churchName:
        tenantRuntime?.organization?.displayName ||
        tenantRuntime?.organization?.name ||
        churchNameProp ||
        "Minha Igreja",
      primary: tenantRuntime?.settings?.branding?.primaryColor || "#7c3aed",
    }),
    [tenantRuntime, churchNameProp],
  );
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [copy, setCopy] = useState<BannerCopy>(EMPTY_COPY);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState("");
  const [scene, setScene] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "copy" | "image" | "saving" | "upload"
  >("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<BannerHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [savedPreview, setSavedPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const jobRef = useRef<AbortController | null>(null);
  const scopeRef = useRef(organizationId);
  const [assetVersion, setAssetVersion] = useState(0);
  const [loadedPhoto, setLoadedPhoto] = useState<string | null>(null);
  const [loadedBg, setLoadedBg] = useState<string | null>(null);
  const busy = status !== "idle";
  const configured = isFirebaseWebRuntimeConfigured(firebaseConfig);
  const effectiveCopy = useMemo(
    () => ({ ...copy, titulo: copy.titulo || form.tema || "Seu tema aqui" }),
    [copy, form.tema],
  );

  useEffect(() => {
    scopeRef.current = organizationId;
    jobRef.current?.abort();
    jobRef.current = null;
    setForm(EMPTY_FORM);
    setCopy(EMPTY_COPY);
    setStep(1);
    setDirection("");
    setScene("");
    setPhotoDataUrl(null);
    setBgDataUrl(null);
    setSavedPreview(null);
    setHistory([]);
    setError("");
    setNotice("");
    setHistoryError("");
    setStatus("idle");
    let cancelled = false;
    if (configured && organizationId)
      fetchBannerHistory(firebaseConfig, { organizationId })
        .then((rows) => {
          if (!cancelled) setHistory(rows);
        })
        .catch((e) => {
          if (!cancelled)
            setHistoryError(bannerError(e, "Histórico indisponível."));
        });
    return () => {
      cancelled = true;
      jobRef.current?.abort();
    };
  }, [organizationId, configured, firebaseConfig]);

  useEffect(() => {
    let active = true;
    photoRef.current = null;
    if (!photoDataUrl) {
      setLoadedPhoto(null);
      setAssetVersion((v) => v + 1);
      return;
    }
    loadImage(photoDataUrl)
      .then((img) => {
        if (active) {
          photoRef.current = img;
          setLoadedPhoto(photoDataUrl);
          setAssetVersion((v) => v + 1);
        }
      })
      .catch(() => {
        if (active) {
          setPhotoDataUrl(null);
          setError("Foto inválida. Envie outro arquivo.");
        }
      });
    return () => {
      active = false;
    };
  }, [photoDataUrl]);
  useEffect(() => {
    let active = true;
    bgRef.current = null;
    if (!bgDataUrl) {
      setLoadedBg(null);
      setAssetVersion((v) => v + 1);
      return;
    }
    loadImage(bgDataUrl)
      .then((img) => {
        if (active) {
          bgRef.current = img;
          setLoadedBg(bgDataUrl);
          setAssetVersion((v) => v + 1);
        }
      })
      .catch(() => {
        if (active) {
          setBgDataUrl(null);
          setError("Fundo inválido. Escolha outra imagem.");
        }
      });
    return () => {
      active = false;
    };
  }, [bgDataUrl]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = CANVAS_SIZES[form.formato];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.textBaseline = "alphabetic";
    setTracking(ctx, 0);
    drawPoster({
      ctx,
      w,
      h,
      isStory: form.formato === "story",
      copy: effectiveCopy,
      form,
      brand,
      photo: photoRef.current,
      bg: bgRef.current,
    });
  }, [form, effectiveCopy, brand, assetVersion]);

  const ready =
    !busy &&
    !!form.tema.trim() &&
    !savedPreview &&
    photoDataUrl === loadedPhoto &&
    bgDataUrl === loadedBg &&
    (form.template !== "foto" || !!photoDataUrl) &&
    (form.template !== "versiculo" || !!copy.versiculo.trim());
  const changeForm = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setSavedPreview(null);
    setNotice("");
    setError("");
    setForm((old) => ({ ...old, [key]: value }));
    if (key === "tema") {
      setCopy((old) => ({ ...old, titulo: "" }));
      setScene("");
    }
  };
  const changeCopy = (key: keyof BannerCopy, value: string) => {
    setSavedPreview(null);
    setNotice("");
    setError("");
    setCopy((old) => ({ ...old, [key]: value }));
  };
  const beginJob = () => {
    if (jobRef.current) return null;
    const controller = new AbortController();
    jobRef.current = controller;
    setError("");
    setNotice("");
    return controller;
  };
  const currentJob = (controller: AbortController, org: string) =>
    !controller.signal.aborted && scopeRef.current === org;
  const finishJob = (controller: AbortController) => {
    if (jobRef.current === controller) {
      jobRef.current = null;
      setStatus("idle");
    }
  };

  const suggestCopy = async () => {
    if (!form.tema.trim() || !user) return;
    const controller = beginJob();
    if (!controller) return;
    const org = organizationId;
    setStatus("copy");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/media/banner-copy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(60000),
        ]),
        body: JSON.stringify({
          organizationId: org,
          ...form,
          direcao: direction,
          versiculo: copy.versiculo,
          versiculoRef: copy.versiculoRef,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new BannerServiceError(result.error || "Sugestão indisponível.");
      if (!currentJob(controller, org)) return;
      setCopy(result.copy);
      setScene(result.copy.imagemPrompt || "");
      setSavedPreview(null);
      setNotice(
        "Sugestão pronta. Revise o texto antes de continuar. Nenhuma imagem foi solicitada.",
      );
    } catch (e) {
      if (currentJob(controller, org))
        setError(
          bannerError(
            e,
            "Não foi possível sugerir texto. Você pode continuar manualmente.",
          ),
        );
    } finally {
      finishJob(controller);
    }
  };
  const generateImage = async () => {
    if (!user || !form.tema.trim()) return;
    const controller = beginJob();
    if (!controller) return;
    const org = organizationId;
    setStatus("image");
    try {
      const token = await user.getIdToken();
      const prompt = bannerImagePrompt(
        direction ||
          scene ||
          `Quiet welcoming church interior, natural window light, simple background for ${form.tipo}: ${form.tema}`,
        form.estilo,
      );
      const data = await fetchBackground(
        buildBgUrl(
          prompt,
          form.formato,
          Math.floor(Math.random() * 999999),
          org,
        ),
        token,
        AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]),
      );
      await loadImage(data);
      if (!currentJob(controller, org)) return;
      setBgDataUrl(data);
      setSavedPreview(null);
      setNotice(
        "Fundo gerado. Confira se a cena combina com o evento antes de baixar.",
      );
    } catch (e) {
      if (currentJob(controller, org))
        setError(
          bannerError(
            e,
            "Falha ao gerar imagem. O fundo anterior foi preservado.",
          ),
        );
    } finally {
      finishJob(controller);
    }
  };
  const uploadImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
    target: "photo" | "background",
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Use JPG, PNG ou WebP de até 5 MB.");
      return;
    }
    const controller = beginJob();
    if (!controller) return;
    const org = organizationId;
    setStatus("upload");
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Arquivo inválido."));
        reader.readAsDataURL(file);
      });
      const reduced = await downscalePhoto(
        data,
        target === "photo" ? 720 : 1536,
        0.85,
      );
      if (!currentJob(controller, org)) return;
      if (target === "photo") setPhotoDataUrl(reduced);
      else setBgDataUrl(reduced);
      setSavedPreview(null);
      setNotice("Imagem adicionada. A prévia foi atualizada sem consumir IA.");
    } catch (e) {
      if (currentJob(controller, org))
        setError(bannerError(e, "Não foi possível abrir o arquivo."));
    } finally {
      finishJob(controller);
    }
  };
  const save = async () => {
    if (!canvasRef.current || !configured || !user || !ready) return;
    const controller = beginJob();
    if (!controller) return;
    const org = organizationId;
    setStatus("saving");
    setHistoryError("");
    try {
      const entry: BannerHistoryEntry = {
        id: crypto.randomUUID(),
        organizationId: org,
        createdAt: new Date().toISOString(),
        createdByUserId: user.uid,
        ...form,
        seed: 0,
        bgPrompt: direction || scene,
        copy: { ...effectiveCopy },
        thumbnailDataUrl: canvasToThumbnail(canvasRef.current),
        ...(photoDataUrl
          ? { photoDataUrl: await downscalePhoto(photoDataUrl, 512) }
          : {}),
        ...(bgDataUrl
          ? { backgroundDataUrl: await downscalePhoto(bgDataUrl, 960, 0.75) }
          : {}),
      };
      if (new Blob([JSON.stringify(entry)]).size > 900000)
        throw new BannerServiceError(
          "As imagens são grandes demais para o histórico. Use arquivos mais simples ou baixe o PNG.",
        );
      await saveBannerHistoryEntry(
        firebaseConfig,
        { organizationId: org },
        entry,
      );
      if (!currentJob(controller, org)) return;
      setHistory((old) => [entry, ...old].slice(0, 24));
      setNotice("Banner salvo no histórico. Reabrir não consome IA.");
    } catch (e) {
      if (currentJob(controller, org))
        setError(bannerError(e, "Não foi possível salvar no histórico."));
    } finally {
      finishJob(controller);
    }
  };
  const openHistory = (entry: BannerHistoryEntry) => {
    if (busy) return;
    setForm({
      tipo: entry.tipo,
      tema: entry.tema,
      pregador: entry.pregador || "",
      data: entry.data || "",
      estilo: entry.estilo,
      formato: entry.formato,
      template: TEMPLATES.some((t) => t.id === entry.template)
        ? (entry.template as TemplateId)
        : "classico",
    });
    setCopy(entry.copy);
    setPhotoDataUrl(entry.photoDataUrl || null);
    setBgDataUrl(entry.backgroundDataUrl || null);
    setDirection(entry.bgPrompt.slice(0, 400));
    setScene("");
    setStep(3);
    setError("");
    setSavedPreview(entry.backgroundDataUrl ? null : entry.thumbnailDataUrl);
    setNotice(
      entry.backgroundDataUrl
        ? "Banner reaberto sem nova geração. Você pode editar e baixar."
        : "Registro antigo: a imagem original não foi armazenada. Veja a miniatura salva; para editar em alta resolução, use um fundo ou gere outro explicitamente.",
    );
  };
  const removeHistory = async (id: string) => {
    if (busy) return;
    const controller = beginJob();
    if (!controller) return;
    const org = organizationId;
    setStatus("saving");
    try {
      await deleteBannerHistoryEntry(
        firebaseConfig,
        { organizationId: org },
        id,
      );
      if (currentJob(controller, org))
        setHistory((old) => old.filter((e) => e.id !== id));
    } catch (e) {
      if (currentJob(controller, org))
        setHistoryError(
          bannerError(e, "Não foi possível excluir do histórico."),
        );
    } finally {
      finishJob(controller);
    }
  };
  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const link = document.createElement("a");
    link.download = `banner-${form.formato}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setNotice(
      "PNG preparado. Envie o arquivo baixado pelo WhatsApp ou pela rede social de sua escolha.",
    );
  };
  const share = async () => {
    if (!canvasRef.current || !ready) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current!.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Não foi possível preparar o arquivo.");
      const file = new File([blob], "banner.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share)
        await navigator.share({ files: [file], title: effectiveCopy.titulo });
      else {
        download();
        setNotice(
          "Arquivo baixado. Anexe esse PNG à conversa no WhatsApp. Seu navegador não permite compartilhar a imagem diretamente.",
        );
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setError(bannerError(e, "Não foi possível compartilhar."));
    }
  };

  return (
    <div className="banner-gen-root">
      <header className="banner-editor-header">
        <div>
          <h1 className="banner-gen-title">Criar banner</h1>
          <a className="banner-jump-preview" href="#banner-preview">
            Ver prévia ↓
          </a>
          <p>
            Do convite à arte final de {brand.churchName}. Revise tudo antes de
            compartilhar.
          </p>
        </div>
        <nav className="banner-steps" aria-label="Etapas do banner">
          {["Conteúdo", "Composição", "Revisão e download"].map((label, i) => (
            <button
              type="button"
              key={label}
              aria-current={step === i + 1 ? "step" : undefined}
              disabled={busy || (i > 0 && !form.tema.trim())}
              onClick={() => setStep(i + 1)}
            >
              <span>{i + 1}</span>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <section className="banner-gen-form" aria-label="Editor do banner">
        <fieldset disabled={busy} className="banner-editor-fields">
          {step === 1 && (
            <>
              <h2>1. O que vamos divulgar?</h2>
              <p className="banner-helper">
                Comece com os dados do evento. Sua prévia aparece enquanto você
                escreve.
              </p>
              <div className="banner-field">
                <label htmlFor="banner-type">Tipo de evento</label>
                <select
                  id="banner-type"
                  value={form.tipo}
                  onChange={(e) => changeForm("tipo", e.target.value)}
                >
                  {[
                    "Culto de Domingo",
                    ...TIPOS.filter((t) => t !== "Culto Domingo"),
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="banner-field">
                <label htmlFor="banner-theme">Tema / mensagem *</label>
                <input
                  id="banner-theme"
                  maxLength={70}
                  required
                  placeholder="Ex.: Encontro de oração pela família"
                  value={form.tema}
                  onChange={(e) => changeForm("tema", e.target.value)}
                />
              </div>
              <div className="banner-field">
                <label htmlFor="banner-speaker">
                  Pregador / cantor (opcional)
                </label>
                <input
                  id="banner-speaker"
                  maxLength={120}
                  value={form.pregador}
                  onChange={(e) => changeForm("pregador", e.target.value)}
                />
              </div>
              <div className="banner-field">
                <label htmlFor="banner-date">Data e horário (opcional)</label>
                <input
                  id="banner-date"
                  maxLength={100}
                  placeholder="Ex.: Domingo, 08 nov · 19h"
                  value={form.data}
                  onChange={(e) => changeForm("data", e.target.value)}
                />
              </div>
              <button
                type="button"
                className="banner-btn-generate"
                disabled={!form.tema.trim()}
                onClick={() => setStep(2)}
              >
                Continuar para composição →
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <h2>2. Ajuste o texto e o formato</h2>
              <p className="banner-helper">
                Você pode escrever tudo manualmente. A sugestão da IA é opcional
                e não gera imagem.
              </p>
              <div
                className="banner-toggle-group"
                role="group"
                aria-label="Formato"
              >
                {(["feed", "story"] as const).map((f) => (
                  <button
                    type="button"
                    key={f}
                    aria-pressed={form.formato === f}
                    className={`banner-toggle ${form.formato === f ? "active" : ""}`}
                    onClick={() => changeForm("formato", f)}
                  >
                    {f === "feed" ? "Feed · 1080×1080" : "Story · 1080×1920"}
                  </button>
                ))}
              </div>
              <div
                className="banner-template-grid"
                role="group"
                aria-label="Modelo"
              >
                {TEMPLATES.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    aria-pressed={form.template === t.id}
                    className={`banner-template ${form.template === t.id ? "active" : ""}`}
                    onClick={() => changeForm("template", t.id)}
                  >
                    <span className="banner-template-label">{t.label}</span>
                    <span className="banner-template-hint">{t.hint}</span>
                  </button>
                ))}
              </div>
              <div className="banner-field">
                <label htmlFor="banner-title">Título da arte</label>
                <input
                  id="banner-title"
                  maxLength={70}
                  value={effectiveCopy.titulo}
                  onChange={(e) => changeCopy("titulo", e.target.value)}
                />
              </div>
              <div className="banner-field">
                <label htmlFor="banner-subtitle">
                  Frase de apoio (opcional)
                </label>
                <textarea
                  id="banner-subtitle"
                  maxLength={130}
                  rows={2}
                  value={copy.subtitulo}
                  onChange={(e) => changeCopy("subtitulo", e.target.value)}
                />
              </div>
              <details>
                <summary>Versículo e legenda (opcionais)</summary>
                <div className="banner-field">
                  <label htmlFor="banner-verse">
                    Versículo — insira e confira o texto
                  </label>
                  <textarea
                    id="banner-verse"
                    maxLength={180}
                    rows={3}
                    value={copy.versiculo}
                    onChange={(e) => changeCopy("versiculo", e.target.value)}
                  />
                  <label htmlFor="banner-reference">Referência bíblica</label>
                  <input
                    id="banner-reference"
                    maxLength={60}
                    value={copy.versiculoRef}
                    onChange={(e) => changeCopy("versiculoRef", e.target.value)}
                  />
                  <label htmlFor="banner-tags">Hashtags para a legenda</label>
                  <input
                    id="banner-tags"
                    maxLength={100}
                    value={copy.hashtags}
                    onChange={(e) => changeCopy("hashtags", e.target.value)}
                  />
                </div>
              </details>
              {form.template === "versiculo" && !copy.versiculo.trim() && (
                <p className="banner-helper">
                  No modelo Versículo, abra a seção acima e insira o texto
                  bíblico para liberar o download.
                </p>
              )}
              <button
                type="button"
                className="banner-action-btn secondary"
                onClick={suggestCopy}
              >
                <Sparkles size={16} /> Sugerir texto com IA · 1 uso
              </button>
              <div className="banner-field">
                <label htmlFor="banner-photo">Foto do pregador / cantor</label>
                <input
                  id="banner-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => uploadImage(e, "photo")}
                />
                <small>
                  Opcional · JPG, PNG ou WebP até 5 MB. Use uma foto autorizada.
                </small>
                {photoDataUrl && (
                  <button
                    type="button"
                    className="banner-action-btn secondary"
                    onClick={() => {
                      setPhotoDataUrl(null);
                      setSavedPreview(null);
                    }}
                  >
                    Remover foto
                  </button>
                )}
                {form.template === "foto" && !photoDataUrl && (
                  <p className="banner-helper">
                    Adicione uma foto para usar o modelo Foto em destaque.
                  </p>
                )}
              </div>
              <div className="banner-step-actions">
                <button
                  type="button"
                  className="banner-action-btn secondary"
                  onClick={() => setStep(1)}
                >
                  ← Conteúdo
                </button>
                <button
                  type="button"
                  className="banner-btn-generate"
                  disabled={form.template === "foto" && !photoDataUrl}
                  onClick={() => setStep(3)}
                >
                  Revisar e escolher fundo →
                </button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2>3. Escolha o fundo e finalize</h2>
              <p className="banner-helper">
                O fundo simples já está pronto. Gere uma cena com IA ou envie
                sua própria imagem. Texto e formato continuam editáveis na etapa
                2.
              </p>
              <div
                className="banner-chip-group"
                role="group"
                aria-label="Estilo visual"
              >
                {ESTILOS.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    aria-pressed={form.estilo === item.value}
                    className={`banner-chip ${form.estilo === item.value ? "active" : ""}`}
                    onClick={() => changeForm("estilo", item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="banner-field">
                <label htmlFor="banner-direction">
                  O que deve aparecer no fundo?
                </label>
                <textarea
                  id="banner-direction"
                  maxLength={400}
                  rows={3}
                  placeholder="Ex.: Um lago tranquilo ao amanhecer, sem pessoas. Espaço livre no centro."
                  value={direction}
                  onChange={(e) => {
                    setDirection(e.target.value);
                    setNotice("");
                  }}
                />
                <small>
                  Descreva uma cena concreta. Essa direção será usada na próxima
                  geração; os dados do evento ficam sobrepostos pelo editor.
                </small>
              </div>
              <details className="banner-prompt-details">
                <summary>Conferir direção enviada à IA</summary>
                <p>
                  {bannerImagePrompt(
                    direction ||
                      scene ||
                      `Quiet welcoming church interior, natural window light, simple background for ${form.tipo}: ${form.tema}`,
                    form.estilo,
                  )}
                </p>
              </details>
              <button
                type="button"
                className="banner-btn-generate"
                onClick={generateImage}
              >
                <Sparkles size={16} />
                {bgDataUrl
                  ? "Gerar outro fundo · 1 uso"
                  : "Gerar fundo com IA · 1 uso"}
              </button>
              <div className="banner-field">
                <label htmlFor="banner-background">
                  Ou envie uma imagem de fundo
                </label>
                <input
                  id="banner-background"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => uploadImage(e, "background")}
                />
                <small>JPG, PNG ou WebP até 5 MB · sem uso de IA.</small>
              </div>
              {(bgDataUrl || savedPreview) && (
                <button
                  type="button"
                  className="banner-action-btn secondary"
                  onClick={() => {
                    setBgDataUrl(null);
                    setSavedPreview(null);
                  }}
                >
                  Usar fundo simples
                </button>
              )}
              <p className="banner-quota-note">
                Cada sugestão de texto ou tentativa de imagem iniciada no
                provedor usa 1 unidade da cota de Sabedoria Pastoral, inclusive
                em caso de falha. Editar, baixar e reabrir o histórico não
                consome IA.
              </p>
              <div className="banner-review-check">
                <strong>Confira antes de baixar</strong>
                <p>
                  Tema, data, nome, referência bíblica e relação da imagem com o
                  evento. A IA pode errar.
                </p>
              </div>
              <button
                type="button"
                className="banner-action-btn secondary"
                onClick={() => setStep(2)}
              >
                ← Ajustar composição
              </button>
            </>
          )}
        </fieldset>
        <div aria-live="polite" role="status" className="banner-feedback">
          {busy && (
            <p>
              <Loader2 size={16} className="spin" />{" "}
              {status === "image"
                ? "Gerando fundo… isso pode levar até 60 segundos."
                : status === "copy"
                  ? "Preparando sugestão de texto…"
                  : status === "upload"
                    ? "Preparando imagem…"
                    : "Salvando…"}
            </p>
          )}
          {notice && <p>{notice}</p>}
        </div>
        {(status === "copy" || status === "image") && (
          <button
            type="button"
            className="banner-action-btn secondary"
            onClick={() => {
              jobRef.current?.abort();
              jobRef.current = null;
              setStatus("idle");
              setNotice(
                "Espera cancelada. Uma tentativa já iniciada no provedor pode continuar e permanecer na cota.",
              );
            }}
          >
            Cancelar espera
          </button>
        )}
        {error && (
          <p role="alert" className="banner-error">
            {error}
          </p>
        )}
      </section>
      <section
        className="banner-gen-preview"
        aria-label="Prévia do banner"
        id="banner-preview"
      >
        <div className="banner-preview-heading">
          <strong>Prévia ao vivo</strong>
          <span>
            {form.formato === "feed" ? "1080 × 1080" : "1080 × 1920"} px
          </span>
        </div>
        <div
          className="banner-canvas-wrapper"
          style={{
            aspectRatio: form.formato === "feed" ? "1" : "9 / 16",
            maxWidth: form.formato === "feed" ? 460 : 300,
          }}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Prévia: ${effectiveCopy.titulo}. ${effectiveCopy.subtitulo}. ${effectiveCopy.versiculo} ${effectiveCopy.versiculoRef}. ${form.data}. ${form.pregador}.`}
          />
          {savedPreview && (
            <img
              className="banner-saved-preview"
              src={savedPreview}
              alt="Miniatura do banner antigo salvo"
            />
          )}
        </div>
        <p className="banner-helper">
          {savedPreview
            ? "Miniatura antiga. Escolha um fundo para editar e exportar uma nova versão."
            : "A prévia muda com suas edições. Nenhuma publicação é automática."}
        </p>
        <div className="banner-actions">
          <button
            type="button"
            className="banner-action-btn primary"
            disabled={!ready}
            onClick={download}
          >
            <Download size={16} />
            Baixar PNG
          </button>
          <button
            type="button"
            className="banner-action-btn secondary"
            disabled={!ready}
            onClick={save}
          >
            <History size={16} />
            Salvar no histórico
          </button>
          <button
            type="button"
            className="banner-action-btn whatsapp"
            disabled={!ready}
            onClick={share}
          >
            <Share2 size={16} />
            Compartilhar imagem
          </button>
        </div>
        {copy.hashtags && (
          <p className="banner-caption">
            <strong>Hashtags para a legenda</strong>
            <br />
            {copy.hashtags}
          </p>
        )}
        <p className="banner-credit">
          Texto e dados compostos pelo editor · imagem por IA somente quando
          solicitada.
        </p>
      </section>
      <section className="banner-history" aria-label="Histórico de banners">
        <div className="banner-history-head">
          <History size={18} />
          <h2>Histórico</h2>
          <span>{history.length}</span>
        </div>
        <p className="banner-helper">
          Reabra e edite sem chamar a IA. As imagens do histórico são
          compactadas; guarde o PNG baixado para manter a qualidade original.
        </p>
        {historyError && (
          <p role="alert" className="banner-error">
            {historyError}
          </p>
        )}
        {!history.length && (
          <p className="banner-helper">
            Seus banners aparecerão aqui ao clicar em Salvar no histórico.
          </p>
        )}
        <div className="banner-history-grid">
          {history.map((entry) => (
            <article key={entry.id} className="banner-history-card">
              <button
                type="button"
                disabled={busy}
                className="banner-history-thumb"
                onClick={() => openHistory(entry)}
                aria-label={`Reabrir ${entry.copy.titulo || entry.tema}`}
              >
                <img src={entry.thumbnailDataUrl} alt="" />
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
                  disabled={busy}
                  onClick={() => removeHistory(entry.id)}
                  aria-label={`Excluir ${entry.copy.titulo || entry.tema}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

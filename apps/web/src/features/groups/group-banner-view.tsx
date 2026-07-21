"use client";

import Link from "next/link";
import { ArrowLeft, Download, Sparkles, Image as ImageIcon, Upload, X, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchGroups, isFirebaseWebRuntimeConfigured } from "@alvo/firebase";
import { useAppAuth } from "../../../app/providers";

interface GroupBannerViewProps {
  groupId: string;
}

const COLOR_THEMES = [
  { name: "Esdras Classic (Laranja)", primary: "#d27836", secondary: "#1c2433", text: "#ffffff", accent: "#f7f3ea" },
  { name: "Sleek Emerald (Verde)", primary: "#10b981", secondary: "#064e3b", text: "#ffffff", accent: "#ecfdf5" },
  { name: "Deep Ruby (Vermelho)", primary: "#dc2626", secondary: "#450a0a", text: "#ffffff", accent: "#fef2f2" },
  { name: "Royal Purple (Roxo)", primary: "#8b5cf6", secondary: "#2e1065", text: "#ffffff", accent: "#faf5ff" },
  { name: "Midnight Teal (Turquesa)", primary: "#0d9488", secondary: "#115e59", text: "#ffffff", accent: "#f0fdfa" },
  { name: "Gospel Azul", primary: "#2563eb", secondary: "#1e3a8a", text: "#ffffff", accent: "#eff6ff" },
  { name: "Junino (Festa)", primary: "#f59e0b", secondary: "#7c2d12", text: "#ffffff", accent: "#fffbeb" },
  { name: "Natal", primary: "#dc2626", secondary: "#064e3b", text: "#ffffff", accent: "#fef2f2" }
];

const WEEKDAY_LABELS = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"
];

// Desenha uma imagem preenchendo (cover) um círculo de raio r centrado em (cx, cy).
function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, r: number) {
  const size = r * 2;
  const scale = Math.max(size / img.width, size / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
}

export function GroupBannerView({ groupId }: GroupBannerViewProps) {
  const { organizationId, firebaseConfig, user, configured, firebaseReady } = useAppAuth();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [themeIndex, setThemeIndex] = useState(0);
  const [format, setFormat] = useState<"feed" | "story">("feed");
  const [title, setTitle] = useState("Minha Célula");
  const [subtitle, setSubtitle] = useState("Viver em Família e Comunhão");
  const [customText, setCustomText] = useState("Você é nosso convidado especial!");
  const [customAddress, setCustomAddress] = useState("Endereço da Célula");
  const [meetingDay, setMeetingDay] = useState("Quarta-feira");
  const [meetingTime, setMeetingTime] = useState("19:30");
  const [highlight, setHighlight] = useState("");
  const [mainImage, setMainImage] = useState<HTMLImageElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const theme = COLOR_THEMES[themeIndex];

  // Carrega a célula REAL do Firestore e pré-preenche os campos (uma vez).
  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) return;
    let cancelled = false;
    async function load() {
      try {
        const groups = await fetchGroups(firebaseConfig, { organizationId }, 100);
        const group = groups.find((g) => g.id === groupId);
        if (cancelled || !group) return;
        setTitle(group.name);
        if (typeof group.meetingDayOfWeek === "number" && WEEKDAY_LABELS[group.meetingDayOfWeek]) {
          setMeetingDay(WEEKDAY_LABELS[group.meetingDayOfWeek]);
        }
        if (group.meetingTime) setMeetingTime(group.meetingTime);
        const addr = [group.city, group.state].filter(Boolean).join(" - ");
        if (addr) setCustomAddress(addr);
      } catch (e) {
        console.error("Falha ao carregar a célula para o banner:", e);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [configured, firebaseReady, user, firebaseConfig, organizationId, groupId]);

  function onImageFile(file: File, setter: (img: HTMLImageElement | null) => void) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => setter(img);
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  const drawBanner = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = format === "feed" ? 1350 : 1920;
    canvas.width = width;
    canvas.height = height;

    // 1. Fundo gradiente premium
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, theme.secondary);
    bgGradient.addColorStop(0.7, "#0f172a");
    bgGradient.addColorStop(1, theme.secondary);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Brilho radial
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = theme.primary;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 3. Moldura fina
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // 4. Logo da célula (se enviada) — círculo pequeno no topo; senão, texto marca.
    ctx.textAlign = "center";
    if (logoImage) {
      const ly = 120;
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, ly, 52, 0, Math.PI * 2);
      ctx.clip();
      drawImageCover(ctx, logoImage, width / 2, ly, 52);
      ctx.restore();
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(width / 2, ly, 52, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = theme.primary;
      ctx.font = "bold 28px Outfit, sans-serif";
      ctx.fillText("ALVO CHURCH • COMUNIDADE", width / 2, 80);
      ctx.beginPath();
      ctx.moveTo(width / 2 - 80, 110);
      ctx.lineTo(width / 2 + 80, 110);
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 5. Faixa de DESTAQUE (convidado / ocasião), se preenchida
    if (highlight.trim()) {
      const badgeY = height * 0.19;
      const label = highlight.trim().toUpperCase();
      ctx.font = "bold 30px Outfit, sans-serif";
      const textW = ctx.measureText(label).width;
      const padX = 32;
      const badgeW = textW + padX * 2;
      const badgeH = 60;
      const badgeX = width / 2 - badgeW / 2;
      ctx.fillStyle = theme.primary;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY - badgeH / 2, badgeW, badgeH, 30);
      ctx.fill();
      ctx.fillStyle = theme.secondary;
      ctx.textBaseline = "middle";
      ctx.fillText(label, width / 2, badgeY + 2);
      ctx.textBaseline = "alphabetic";
    }

    // 6. Título (nome da célula)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px Outfit, sans-serif";
    ctx.fillText(title.toUpperCase(), width / 2, height * 0.28);

    // 7. Subtítulo
    ctx.fillStyle = theme.primary;
    ctx.font = "italic 36px Outfit, sans-serif";
    ctx.fillText(subtitle, width / 2, height * 0.33);

    // 8. Círculo central — imagem principal (convidado/tema) ou ícone padrão
    const centerY = height * 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, centerY, 160, 0, Math.PI * 2);
    ctx.clip();
    if (mainImage) {
      drawImageCover(ctx, mainImage, width / 2, centerY, 160);
    } else {
      const circleGrad = ctx.createRadialGradient(width / 2, centerY, 20, width / 2, centerY, 160);
      circleGrad.addColorStop(0, theme.primary);
      circleGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = circleGrad;
      ctx.fillRect(width / 2 - 160, centerY - 160, 320, 320);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 120px sans-serif";
      ctx.fillText("👥", width / 2, centerY);
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();

    // Borda do círculo central
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(width / 2, centerY, 160, 0, Math.PI * 2);
    ctx.stroke();

    // 9. Caixa de informações (dia, hora, endereço)
    const boxWidth = width - 180;
    const boxHeight = 240;
    const boxX = 90;
    const boxY = height * 0.65;
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 42px Outfit, sans-serif";
    ctx.fillText(`${meetingDay.toUpperCase()} às ${meetingTime}h`, width / 2, boxY + 70);

    ctx.beginPath();
    ctx.moveTo(boxX + 80, boxY + 110);
    ctx.lineTo(boxX + boxWidth - 80, boxY + 110);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = theme.accent;
    ctx.font = "30px Outfit, sans-serif";
    ctx.fillText(customAddress, width / 2, boxY + 160);
    ctx.font = "bold 24px Outfit, sans-serif";
    ctx.fillStyle = theme.primary;
    ctx.fillText("LOCAL E ACOLHIMENTO INTEGRADO", width / 2, boxY + 200);

    // 10. Chamada de ação
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 38px Outfit, sans-serif";
    ctx.fillText(customText, width / 2, height - 120);

    // 11. Rodapé
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "20px Outfit, sans-serif";
    ctx.fillText("GERADO AUTOMATICAMENTE VIA ALVO CANVAS", width / 2, height - 70);
  };

  useEffect(() => {
    drawBanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeIndex, format, title, subtitle, customText, customAddress, meetingDay, meetingTime, highlight, mainImage, logoImage]);

  const handleDownload = () => {
    setIsGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) {
      setIsGenerating(false);
      return;
    }
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `banner-${slugify(title)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="form-page groups-page animate-entrance">
      <section className="groups-hero" style={{ paddingBottom: "1.5rem" }}>
        <div>
          <Link className="back-link" href="/groups">
            <ArrowLeft size={14} style={{ marginRight: 6 }} />
            Voltar para Células
          </Link>
          <p className="eyebrow" style={{ color: theme.primary }}>Esdras Canvas Engine</p>
          <h1 style={{ whiteSpace: "nowrap", fontSize: "clamp(1.9rem, 4vw, 2.8rem)" }}>Gerador de Banners</h1>
          <p>
            Crie panfletos dinâmicos profissionais para WhatsApp e Instagram em 1 clique.
          </p>
        </div>
      </section>

      <section className="groups-workbench" style={{ gridTemplateColumns: "1fr 1fr", gap: "2.5rem" }}>
        {/* Painel de controles */}
        <aside className="quick-group-form" style={{ padding: "2rem", width: "100%" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} style={{ color: theme.primary }} />
            Personalizar Banner
          </h3>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem" }}>
            <button
              onClick={() => setFormat("feed")}
              className={`primary-button ${format === "feed" ? "" : "ghost-button"}`}
              style={{ flex: 1, padding: "0.75rem" }}
              type="button"
            >
              Feed 4:5 (Instagram)
            </button>
            <button
              onClick={() => setFormat("story")}
              className={`primary-button ${format === "story" ? "" : "ghost-button"}`}
              style={{ flex: 1, padding: "0.75rem" }}
              type="button"
            >
              Story 9:16 (WhatsApp)
            </button>
          </div>

          <label>
            Título do Banner
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: CÉLULA CENTRO NORTE"
            />
          </label>

          <label>
            Slogan / Subtítulo
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ex: Viver em Família e Comunhão"
            />
          </label>

          <label>
            Destaque (convidado ou ocasião) — opcional
            <input
              type="text"
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              placeholder="Ex: Pr. João convidado · Especial Junino"
            />
          </label>

          {/* Uploads de imagem */}
          <div className="quick-group-grid" style={{ gap: "1rem", marginBottom: "1rem" }}>
            <ImageSlot
              label="Imagem principal"
              hint="Foto do convidado ou tema"
              image={mainImage}
              onPick={(f) => onImageFile(f, setMainImage)}
              onClear={() => setMainImage(null)}
              accent={theme.primary}
            />
            <ImageSlot
              label="Logo da célula"
              hint="Aparece no topo (opcional)"
              image={logoImage}
              onPick={(f) => onImageFile(f, setLogoImage)}
              onClear={() => setLogoImage(null)}
              accent={theme.primary}
            />
          </div>

          <label>
            Endereço Completo
            <input
              type="text"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              placeholder="Ex: Travessa Padre Eutíquio, 1220 - Batista Campos"
            />
          </label>

          <div className="quick-group-grid" style={{ gap: "1rem" }}>
            <label>
              Dia da Reunião
              <select value={meetingDay} onChange={(e) => setMeetingDay(e.target.value)}>
                <option value="Segunda-feira">Segunda-feira</option>
                <option value="Terça-feira">Terça-feira</option>
                <option value="Quarta-feira">Quarta-feira</option>
                <option value="Quinta-feira">Quinta-feira</option>
                <option value="Sexta-feira">Sexta-feira</option>
                <option value="Sábado">Sábado</option>
                <option value="Domingo">Domingo</option>
              </select>
            </label>
            <label>
              Horário
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
              />
            </label>
          </div>

          <label>
            Chamada de Ação (Abaixo)
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Ex: Você é nosso convidado especial!"
            />
          </label>

          <div style={{ marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: "0.5rem" }}>
              <Star size={13} style={{ color: theme.primary }} /> Tema de Cores
            </span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {COLOR_THEMES.map((themeOption, idx) => (
                <button
                  key={themeOption.name}
                  onClick={() => setThemeIndex(idx)}
                  className="ghost-button"
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.8rem",
                    border: themeIndex === idx ? `2px solid ${themeOption.primary}` : "1px solid rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                  type="button"
                >
                  <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: themeOption.primary }} />
                  {themeOption.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="primary-button full"
            style={{ padding: "1rem", backgroundColor: theme.primary, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
            type="button"
            disabled={isGenerating}
          >
            <Download size={18} />
            {isGenerating ? "Renderizando..." : "Baixar Banner em Alta Definição (PNG)"}
          </button>
        </aside>

        {/* Preview */}
        <article style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <p className="eyebrow" style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: 6 }}>
            <ImageIcon size={14} style={{ color: theme.primary }} />
            Pré-visualização em Tempo Real (HTML5 Canvas)
          </p>

          <div
            className="antigravity-float"
            style={{
              width: "100%",
              maxWidth: format === "feed" ? "320px" : "270px",
              aspectRatio: format === "feed" ? "4/5" : "9/16",
              borderRadius: 16,
              overflow: "hidden",
              border: "4px solid rgba(255,255,255,0.1)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                backgroundColor: theme.secondary
              }}
            />
          </div>
          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
            Resolução de saída: 1080x{format === "feed" ? 1350 : 1920}px (Qualidade Superior)
          </span>
        </article>
      </section>
    </main>
  );
}

function ImageSlot({
  label, hint, image, onPick, onClear, accent
}: {
  label: string;
  hint: string;
  image: HTMLImageElement | null;
  onPick: (file: File) => void;
  onClear: () => void;
  accent: string;
}) {
  return (
    <div>
      <span style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</span>
      {image ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.src} alt={label} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: `2px solid ${accent}` }} />
          <button type="button" className="ghost-button" onClick={onClear} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem" }}>
            <X size={13} /> Remover
          </button>
        </div>
      ) : (
        <label
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
            padding: "12px", borderRadius: 10, border: "1.5px dashed rgba(255,255,255,0.25)", cursor: "pointer",
            fontSize: "0.75rem", textAlign: "center", color: "rgba(255,255,255,0.7)"
          }}
        >
          <Upload size={16} style={{ color: accent }} />
          {hint}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }}
          />
        </label>
      )}
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "celula";
}

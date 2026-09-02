"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Heart, QrCode, Copy, Check, ChevronLeft, Loader2, CheckCircle, Paperclip } from "lucide-react";
import {
  getFirebaseFirestore,
  getOrganizationBrandingDocumentPath,
  doc,
  getDoc,
  isFirebaseWebRuntimeConfigured,
  saveGivingIntent,
  saveGivingReceipt,
} from "@alvo/firebase";
import { generatePixPayload } from "@alvo/domain";

const SUGGESTED_AMOUNTS = [20, 50, 100, 200];

function buildFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  };
}

export default function PublicGivePage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [campaignId, setCampaignId] = useState("");
  const [campaign, setCampaign] = useState<{ title: string; description?: string; goalAmount: number; raisedAmount: number } | null>(null);
  const [amount, setAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorWhatsapp, setDonorWhatsapp] = useState("");
  const [consent, setConsent] = useState(true);
  const [step, setStep] = useState<"form" | "pix">("form");
  const [pixPayload, setPixPayload] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixName, setPixName] = useState("Igreja");
  const [orgId, setOrgId] = useState("");
  const [churchWhatsapp, setChurchWhatsapp] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [copied, setCopied] = useState(false);
  const [intentId, setIntentId] = useState("");
  const [receiptBase64, setReceiptBase64] = useState("");
  const [declaredPaid, setDeclaredPaid] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load org PIX config from Firestore
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = buildFirebaseConfig();
        if (!isFirebaseWebRuntimeConfigured(config)) {
          setLoadingConfig(false);
          return;
        }
        const db = getFirebaseFirestore(config);

        // Resolve orgSlug → organizationId
        const slugSnap = await getDoc(doc(db, "org_slugs", orgSlug));
        const organizationId = slugSnap.exists()
          ? String(slugSnap.data()["organizationId"])
          : orgSlug;
        setOrgId(organizationId);

        // Se veio ?campanha=, carrega a campanha pra mostrar a causa + meta.
        const cid = new URLSearchParams(window.location.search).get("campanha") ?? "";
        setCampaignId(cid);
        if (cid) {
          try {
            const campSnap = await getDoc(doc(db, `organizations/${organizationId}/givingCampaigns/${cid}`));
            if (campSnap.exists()) {
              const c = campSnap.data() as { title?: string; description?: string; goalAmount?: number; raisedAmount?: number };
              setCampaign({ title: c.title ?? "Campanha", description: c.description, goalAmount: c.goalAmount ?? 0, raisedAmount: c.raisedAmount ?? 0 });
            }
          } catch (e) { console.error("Falha ao carregar campanha:", e); }
        }

        const brandingSnap = await getDoc(
          doc(db, getOrganizationBrandingDocumentPath({ organizationId }))
        );
        if (brandingSnap.exists()) {
          const data = brandingSnap.data() as { pixKey?: string; pixReceiverName?: string; publicShortName?: string; givingWhatsappNumber?: string };
          if (data.pixKey) setPixKey(data.pixKey);
          if (data.pixReceiverName) setPixName(data.pixReceiverName);
          else if (data.publicShortName) setPixName(data.publicShortName);
          if (data.givingWhatsappNumber) setChurchWhatsapp(data.givingWhatsappNumber);
        }
      } catch (e) {
        console.error("Failed to load org config:", e);
      } finally {
        setLoadingConfig(false);
      }
    }
    void loadConfig();
  }, [orgSlug]);

  // Render QR Code on canvas when payload is ready
  useEffect(() => {
    if (!pixPayload || !canvasRef.current) return;
    import("qrcode").then(QRCode => {
      QRCode.toCanvas(canvasRef.current!, pixPayload, {
        width: 240,
        margin: 2,
        color: { dark: "#1c2433", light: "#ffffff" },
      });
    });
  }, [pixPayload]);

  async function generatePix() {
    if (!amount || Number(amount) <= 0 || !donorName.trim() || !donorWhatsapp.trim()) return;
    const key = pixKey || "demo@pix.esdras";
    const payload = generatePixPayload({
      key,
      receiverName: pixName,
      amount: Number(amount),
      description: "Oferta/Dizimo",
    });
    setPixPayload(payload);
    setStep("pix");

    // Registra o lead/intenção (best-effort — não bloqueia o PIX se falhar).
    // O dinheiro NÃO passa pela plataforma: o PIX é da própria igreja.
    if (orgId) {
      try {
        const id = await saveGivingIntent(buildFirebaseConfig(), {
          organizationId: orgId,
          name: donorName.trim(),
          whatsapp: donorWhatsapp.replace(/\D/g, ""),
          amount: Number(amount),
          source: "public_give",
          status: "captured",
          orgSlug,
          campaignId: campaignId || undefined,
          consentContact: consent,
          createdAt: new Date().toISOString(),
        });
        setIntentId(id);
      } catch (e) {
        console.error("Falha ao registrar intenção de doação:", e);
      }
    }
  }

  // Comprovante: comprime a imagem (canvas) pra base64 leve (< ~1MB).
  async function onReceiptFile(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = dataUrl; });
    const maxW = 1000;
    const scale = Math.min(1, maxW / img.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const jpeg = canvas.toDataURL("image/jpeg", 0.6);
    setReceiptBase64(jpeg.split(",")[1] ?? "");
  }

  async function declarePaid() {
    if (!orgId || !intentId) { setDeclaredPaid(true); return; }
    setDeclaring(true);
    try {
      await saveGivingReceipt(buildFirebaseConfig(), {
        organizationId: orgId,
        intentId,
        imageBase64: receiptBase64 || undefined,
      });
      setDeclaredPaid(true);
    } catch (e) {
      console.error("Falha ao registrar comprovante:", e);
      setDeclaredPaid(true);
    } finally {
      setDeclaring(false);
    }
  }

  const waHref = churchWhatsapp
    ? `https://wa.me/${churchWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Acabei de contribuir com R$ ${Number(amount).toFixed(2).replace(".", ",")} via PIX${donorName ? ` — ${donorName}` : ""}.`
      )}`
    : "";

  async function copyKey() {
    await navigator.clipboard.writeText(pixKey || "demo@pix.esdras");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const numericAmount = Number(amount);
  const canProceed = numericAmount > 0 && donorName.trim().length >= 2 && donorWhatsapp.replace(/\D/g, "").length >= 8;

  if (step === "pix") {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <button onClick={() => setStep("form")} style={backBtnStyle}>
            <ChevronLeft size={16} /> Voltar
          </button>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <CheckCircle size={28} style={{ color: "#16a34a", margin: "0 auto 8px", display: "block" }} />
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1c2433" }}>
              R$ {numericAmount.toFixed(2).replace(".", ",")}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              Escaneie o QR Code PIX para concluir
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <canvas
              ref={canvasRef}
              style={{ borderRadius: 12, border: "1px solid rgba(29,41,64,0.1)" }}
            />
            <div style={{ width: "100%", display: "grid", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", textAlign: "center" }}>
                Ou copie a chave PIX manualmente:
              </p>
              <div style={keyRowStyle}>
                <code style={{ flex: 1, fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pixKey || "demo@pix.esdras"}
                </code>
                <button onClick={copyKey} style={copyBtnStyle}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", textAlign: "center", lineHeight: 1.5 }}>
              Beneficiário: <strong>{pixName}</strong>
            </p>

            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 12, background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
              >
                Falar no WhatsApp com a igreja
              </a>
            )}
            {declaredPaid ? (
              <div style={{ width: "100%", textAlign: "center", padding: "12px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <CheckCircle size={20} style={{ color: "#16a34a", display: "block", margin: "0 auto 4px" }} />
                <p style={{ margin: 0, fontSize: 13, color: "#16a34a", fontWeight: 600 }}>Pagamento confirmado! Obrigado. 🙏</p>
              </div>
            ) : (
              <div style={{ width: "100%", display: "grid", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, border: "1.5px dashed rgba(29,41,64,0.2)", fontSize: 13, color: "#374151", cursor: "pointer" }}>
                  <Paperclip size={15} /> {receiptBase64 ? "Comprovante anexado ✓" : "Anexar comprovante (opcional)"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onReceiptFile(f); }} />
                </label>
                <button
                  type="button"
                  onClick={declarePaid}
                  disabled={declaring}
                  style={{ width: "100%", padding: "13px", borderRadius: 12, background: "#16a34a", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: declaring ? "default" : "pointer", opacity: declaring ? 0.6 : 1 }}
                >
                  {declaring ? "Registrando..." : `Já paguei — R$ ${numericAmount.toFixed(2).replace(".", ",")}`}
                </button>
                <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>Sua contribuição já foi registrada. Confirme o pagamento pra igreja acompanhar.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <Heart size={28} strokeWidth={1.6} style={{ color: "var(--esdras-primary-dark)", display: "block", margin: "0 auto" }} />
          {campaign ? (
            <>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ea580c" }}>Campanha de oferta</span>
              <h1 style={titleStyle}>{campaign.title}</h1>
              {campaign.description && <p style={subtitleStyle}>{campaign.description}</p>}
            </>
          ) : (
            <>
              <h1 style={titleStyle}>Contribuir</h1>
              <p style={subtitleStyle}>Sua oferta faz diferença</p>
            </>
          )}
        </div>

        {campaign && campaign.goalAmount > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "#16a34a", fontWeight: 700 }}>R$ {campaign.raisedAmount.toLocaleString("pt-BR")}</span>
              <span style={{ color: "#64748b" }}>de R$ {campaign.goalAmount.toLocaleString("pt-BR")}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, Math.round((campaign.raisedAmount / campaign.goalAmount) * 100))}%`, height: "100%", background: "#16a34a", borderRadius: 999 }} />
            </div>
          </div>
        )}

        {loadingConfig ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <Loader2 size={24} style={{ color: "#94a3b8" }} />
          </div>
        ) : (
          <div style={formStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Seu nome</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Nome completo"
                value={donorName}
                onChange={e => setDonorName(e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Seu WhatsApp</label>
              <input
                style={inputStyle}
                type="tel"
                inputMode="tel"
                placeholder="(00) 00000-0000"
                value={donorWhatsapp}
                onChange={e => setDonorWhatsapp(e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Valor da oferta</label>
              <div style={suggestedStyle}>
                {SUGGESTED_AMOUNTS.map(v => (
                  <button
                    key={v}
                    type="button"
                    style={amount === String(v) ? { ...chipStyle, ...chipActiveStyle } : chipStyle}
                    onClick={() => setAmount(String(v))}
                  >
                    R$ {v}
                  </button>
                ))}
              </div>
              <input
                style={inputStyle}
                type="number"
                min="1"
                step="0.01"
                placeholder="Outro valor (R$)"
                value={SUGGESTED_AMOUNTS.includes(Number(amount)) ? "" : amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <div style={pixInfoStyle}>
              <QrCode size={16} style={{ color: "#16a34a", flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: 13, color: "#1c2433", display: "block" }}>
                  Pagamento via PIX
                </strong>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {pixKey
                    ? `Chave configurada pelo administrador`
                    : "Configure a chave PIX em Configurações para ativar"}
                </span>
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#64748b", cursor: "pointer" }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
              <span>Autorizo a igreja a entrar em contato comigo pelo WhatsApp (LGPD).</span>
            </label>

            <button
              type="button"
              onClick={generatePix}
              disabled={!canProceed}
              style={{
                ...submitStyle,
                opacity: canProceed ? 1 : 0.5,
                cursor: canProceed ? "pointer" : "not-allowed",
              }}
            >
              Gerar QR Code PIX
            </button>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}

const pageStyle = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "#fdfaf6" } as const;
const cardStyle = { maxWidth: 420, width: "100%", padding: "28px 24px", borderRadius: 20, background: "#fff", border: "1px solid rgba(29,41,64,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" } as const;
const headerStyle = { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8, marginBottom: 24, textAlign: "center" as const };
const titleStyle = { margin: 0, fontSize: 20, fontWeight: 700, color: "#1c2433" } as const;
const subtitleStyle = { margin: 0, fontSize: 13, color: "#64748b" } as const;
const formStyle = { display: "grid", gap: 20 } as const;
const fieldStyle = { display: "grid", gap: 8 } as const;
const labelStyle = { fontSize: 13, fontWeight: 600, color: "#374151" } as const;
const suggestedStyle = { display: "flex", gap: 8, flexWrap: "wrap" as const } as const;
const chipStyle = { padding: "8px 16px", borderRadius: 999, border: "1.5px solid rgba(29,41,64,0.18)", background: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" } as const;
const chipActiveStyle = { background: "var(--esdras-primary-dark)", borderColor: "var(--esdras-primary-dark)", color: "#fff" } as const;
const inputStyle = { padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(29,41,64,0.18)", fontSize: 15, width: "100%", boxSizing: "border-box" as const, outline: "none", background: "#fff" } as const;
const pixInfoStyle = { display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" } as const;
const submitStyle = { padding: "14px", borderRadius: 12, background: "var(--esdras-primary-dark)", color: "#fff", border: "none", fontSize: 15, fontWeight: 600, width: "100%" } as const;
const backBtnStyle = { display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#64748b", padding: "0 0 16px", fontWeight: 500 } as const;
const keyRowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid rgba(29,41,64,0.08)", overflow: "hidden" } as const;
const copyBtnStyle = { display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(29,41,64,0.15)", background: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", flexShrink: 0 } as const;

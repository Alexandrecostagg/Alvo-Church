"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Heart, QrCode, Copy, Check, ChevronLeft, Loader2, CheckCircle } from "lucide-react";
import {
  getFirebaseFirestore,
  getOrganizationBrandingDocumentPath,
  doc,
  getDoc,
  isFirebaseWebRuntimeConfigured,
} from "@alvo/firebase";
import { buildPixPayload } from "@alvo/domain";

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

  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "pix">("form");
  const [pixPayload, setPixPayload] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixName, setPixName] = useState("Igreja");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [copied, setCopied] = useState(false);
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

        const brandingSnap = await getDoc(
          doc(db, getOrganizationBrandingDocumentPath({ organizationId }))
        );
        if (brandingSnap.exists()) {
          const data = brandingSnap.data() as { pixKey?: string; pixReceiverName?: string; publicShortName?: string };
          if (data.pixKey) setPixKey(data.pixKey);
          if (data.pixReceiverName) setPixName(data.pixReceiverName);
          else if (data.publicShortName) setPixName(data.publicShortName);
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

  function generatePix() {
    if (!amount || Number(amount) <= 0) return;
    const key = pixKey || "demo@pix.alvo";
    const payload = buildPixPayload({
      key,
      receiverName: pixName,
      amount: Number(amount),
      description: "Oferta/Dizimo",
    });
    setPixPayload(payload);
    setStep("pix");
  }

  async function copyKey() {
    await navigator.clipboard.writeText(pixKey || "demo@pix.alvo");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const numericAmount = Number(amount);
  const canProceed = numericAmount > 0;

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
                  {pixKey || "demo@pix.alvo"}
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
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <Heart size={28} strokeWidth={1.6} style={{ color: "var(--getro-primary-dark)", display: "block", margin: "0 auto" }} />
          <h1 style={titleStyle}>Contribuir</h1>
          <p style={subtitleStyle}>Sua oferta faz diferença</p>
        </div>

        {loadingConfig ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <Loader2 size={24} style={{ color: "#94a3b8" }} />
          </div>
        ) : (
          <div style={formStyle}>
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
const chipActiveStyle = { background: "var(--getro-primary-dark)", borderColor: "var(--getro-primary-dark)", color: "#fff" } as const;
const inputStyle = { padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(29,41,64,0.18)", fontSize: 15, width: "100%", boxSizing: "border-box" as const, outline: "none", background: "#fff" } as const;
const pixInfoStyle = { display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" } as const;
const submitStyle = { padding: "14px", borderRadius: 12, background: "var(--getro-primary-dark)", color: "#fff", border: "none", fontSize: 15, fontWeight: 600, width: "100%" } as const;
const backBtnStyle = { display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#64748b", padding: "0 0 16px", fontWeight: 500 } as const;
const keyRowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid rgba(29,41,64,0.08)", overflow: "hidden" } as const;
const copyBtnStyle = { display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(29,41,64,0.15)", background: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", flexShrink: 0 } as const;

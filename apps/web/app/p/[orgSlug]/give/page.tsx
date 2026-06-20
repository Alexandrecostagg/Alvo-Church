"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Heart, QrCode, CreditCard } from "lucide-react";

const SUGGESTED_AMOUNTS = [20, 50, 100, 200];

export default function PublicGivePage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <Heart size={32} strokeWidth={1.6} style={{ color: "var(--getro-primary-dark)" }} />
          <h1 style={titleStyle}>Contribuir</h1>
          <p style={subtitleStyle}>Sua oferta faz diferença</p>
        </div>

        <div style={formStyle}>
          {/* Amount */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Valor</label>
            <div style={suggestedStyle}>
              {SUGGESTED_AMOUNTS.map((v) => (
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Payment method */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Forma de pagamento</label>
            <div style={methodRowStyle}>
              <button
                type="button"
                style={method === "pix" ? { ...methodBtnStyle, ...methodBtnActiveStyle } : methodBtnStyle}
                onClick={() => setMethod("pix")}
              >
                <QrCode size={18} />
                PIX
              </button>
              <button
                type="button"
                style={method === "card" ? { ...methodBtnStyle, ...methodBtnActiveStyle } : methodBtnStyle}
                onClick={() => setMethod("card")}
              >
                <CreditCard size={18} />
                Cartão
              </button>
            </div>
          </div>

          {/* Identification (optional, for receipt) */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Identificação <span style={optStyle}>(opcional — para recibo)</span></label>
            <input style={inputStyle} type="text" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
            <input style={inputStyle} type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div style={noticeStyle}>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
              {method === "pix"
                ? "Após confirmar, você verá o QR Code PIX para completar a doação."
                : "Integração com cartão em breve. Por enquanto, use PIX."}
            </p>
          </div>

          <button
            type="button"
            style={submitStyle}
            disabled={!amount || Number(amount) <= 0}
          >
            {method === "pix" ? "Gerar QR Code PIX" : "Continuar com cartão"}
          </button>
        </div>
      </div>
    </main>
  );
}

const pageStyle = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "#fdfaf6" } as const;
const cardStyle = { maxWidth: 420, width: "100%", padding: "32px 24px", borderRadius: 20, background: "#fff", border: "1px solid rgba(29,41,64,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" } as const;
const headerStyle = { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8, marginBottom: 28, textAlign: "center" as const } as const;
const titleStyle = { margin: 0, fontSize: 22, fontWeight: 700, color: "#1c2433" } as const;
const subtitleStyle = { margin: 0, fontSize: 14, color: "#64748b" } as const;
const formStyle = { display: "grid", gap: 20 } as const;
const fieldStyle = { display: "grid", gap: 8 } as const;
const labelStyle = { fontSize: 13, fontWeight: 600, color: "#374151" } as const;
const optStyle = { fontWeight: 400, color: "#9ca3af", fontSize: 12 } as const;
const suggestedStyle = { display: "flex", gap: 8, flexWrap: "wrap" as const } as const;
const chipStyle = { padding: "8px 16px", borderRadius: 999, border: "1.5px solid rgba(29,41,64,0.18)", background: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" } as const;
const chipActiveStyle = { background: "var(--getro-primary-dark)", borderColor: "var(--getro-primary-dark)", color: "#fff" } as const;
const inputStyle = { padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(29,41,64,0.18)", fontSize: 15, width: "100%", boxSizing: "border-box" as const, outline: "none", background: "#fff" } as const;
const methodRowStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } as const;
const methodBtnStyle = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 12, border: "1.5px solid rgba(29,41,64,0.18)", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" } as const;
const methodBtnActiveStyle = { borderColor: "var(--getro-primary-dark)", background: "var(--getro-primary-softer)", color: "var(--getro-primary-dark)" } as const;
const noticeStyle = { padding: "12px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid rgba(29,41,64,0.08)" } as const;
const submitStyle = { padding: "14px", borderRadius: 12, background: "var(--getro-primary-dark)", color: "#fff", border: "none", fontSize: 16, fontWeight: 600, cursor: "pointer" } as const;

"use client";
export const runtime = "edge";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error";

interface VisitorForm {
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  neighborhood: string;
  firstVisit: string;
  howHeard: string;
  consent: boolean;
}

const HOW_HEARD_OPTIONS = [
  "Indicação de um amigo",
  "Redes sociais",
  "Passando pela rua",
  "Internet / Google",
  "Evento",
  "Outro",
];

export default function VisitorFormPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [form, setForm] = useState<VisitorForm>({
    name: "",
    phone: "",
    email: "",
    birthDate: "",
    neighborhood: "",
    firstVisit: "yes",
    howHeard: "",
    consent: false,
  });
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(field: keyof VisitorForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setErrorMsg("Nome e telefone são obrigatórios.");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      setErrorMsg("Telefone inválido.");
      return;
    }

    setState("submitting");
    setErrorMsg("");

    const res = await fetch("/api/public/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgSlug,
        name: form.name.trim(),
        phone: form.phone,
        email: form.email.trim() || undefined,
        birthDate: form.birthDate || undefined,
        neighborhood: form.neighborhood.trim() || undefined,
        firstVisit: form.firstVisit === "yes",
        howHeard: form.howHeard || undefined,
        consent: form.consent,
      }),
    });

    if (res.ok) {
      setState("success");
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setState("error");
      setErrorMsg(data.error ?? "Erro ao enviar. Tente novamente.");
    }
  }

  if (state === "success") {
    return (
      <main style={pageStyle}>
        <div style={successCardStyle}>
          <CheckCircle size={48} strokeWidth={1.6} style={{ color: "#16a34a" }} />
          <h1 style={successTitleStyle}>Bem-vindo!</h1>
          <p style={successDescStyle}>
            Suas informações foram recebidas. É uma alegria ter você aqui hoje!
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={formCardStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Formulário de visitante</h1>
          <p style={subtitleStyle}>Preencha em menos de 1 minuto ✦</p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nome completo *</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="Seu nome"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Telefone (WhatsApp) *</label>
            <input
              style={inputStyle}
              type="tel"
              inputMode="numeric"
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={(e) => set("phone", formatPhone(e.target.value))}
              autoComplete="tel"
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Email <span style={optionalStyle}>(opcional)</span>
            </label>
            <input
              style={inputStyle}
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
            />
          </div>

          <div style={fieldRowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Nascimento <span style={optionalStyle}>(opcional)</span>
              </label>
              <input
                style={inputStyle}
                type="date"
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Bairro / Cidade <span style={optionalStyle}>(opcional)</span>
              </label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Ex: Vila Madalena, SP"
                value={form.neighborhood}
                onChange={(e) => set("neighborhood", e.target.value)}
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>É a primeira vez aqui?</label>
            <div style={radioGroupStyle}>
              {[
                { value: "yes", label: "Sim, primeira vez" },
                { value: "no", label: "Já vim antes" },
              ].map((opt) => (
                <label key={opt.value} style={radioLabelStyle}>
                  <input
                    type="radio"
                    name="firstVisit"
                    value={opt.value}
                    checked={form.firstVisit === opt.value}
                    onChange={(e) => set("firstVisit", e.target.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Como nos conheceu? <span style={optionalStyle}>(opcional)</span>
            </label>
            <select
              style={inputStyle}
              value={form.howHeard}
              onChange={(e) => set("howHeard", e.target.value)}
            >
              <option value="">Selecione...</option>
              {HOW_HEARD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <label style={consentLabelStyle}>
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => set("consent", e.target.checked)}
            />
            <span>
              Aceito receber mensagens da organização sobre eventos e cuidado pastoral
            </span>
          </label>

          {errorMsg && <p style={errorStyle}>{errorMsg}</p>}

          <button
            type="submit"
            style={submitButtonStyle}
            disabled={state === "submitting"}
          >
            {state === "submitting" ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Enviando...
              </>
            ) : (
              "Enviar"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

const pageStyle = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "#fdfaf6" } as const;
const formCardStyle = { maxWidth: 520, width: "100%", padding: "32px 24px", borderRadius: 20, background: "#fff", border: "1px solid rgba(29,41,64,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" } as const;
const successCardStyle = { maxWidth: 360, width: "100%", padding: "48px 24px", borderRadius: 20, background: "#fff", border: "1px solid rgba(29,41,64,0.1)", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 16, textAlign: "center" as const } as const;
const headerStyle = { marginBottom: 24 } as const;
const titleStyle = { margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#1c2433" } as const;
const subtitleStyle = { margin: 0, fontSize: 14, color: "#64748b" } as const;
const formStyle = { display: "grid", gap: 16 } as const;
const fieldStyle = { display: "grid", gap: 6 } as const;
const fieldRowStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as const;
const labelStyle = { fontSize: 13, fontWeight: 600, color: "#374151" } as const;
const optionalStyle = { fontWeight: 400, color: "#9ca3af" } as const;
const inputStyle = { padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(29,41,64,0.18)", fontSize: 15, outline: "none", background: "#fff", width: "100%", boxSizing: "border-box" as const } as const;
const radioGroupStyle = { display: "flex", gap: 16, flexWrap: "wrap" as const } as const;
const radioLabelStyle = { display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" } as const;
const consentLabelStyle = { display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#64748b", cursor: "pointer", lineHeight: 1.5 } as const;
const errorStyle = { color: "#dc2626", fontSize: 13, margin: 0 } as const;
const submitButtonStyle = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 12, background: "var(--esdras-primary-dark)", color: "#fff", border: "none", fontSize: 16, fontWeight: 600, cursor: "pointer", marginTop: 4 } as const;
const successTitleStyle = { margin: 0, fontSize: 24, fontWeight: 700, color: "#1c2433" } as const;
const successDescStyle = { margin: 0, fontSize: 15, color: "#64748b", lineHeight: 1.6 } as const;

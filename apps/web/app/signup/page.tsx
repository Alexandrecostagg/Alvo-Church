"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "../brand-logo";
import { useAppAuth } from "../providers";

const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO"
];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
}

function isValidCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

function isValidTaxId(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

// Regras mínimas: 8+ caracteres, letra e número, sem tudo igual e sem
// sequência óbvia (12345678, abcdefgh) — não é força bruta-proof, mas
// barra as senhas mais comuns/fracas sem irritar demais o usuário.
function passwordIssue(password: string): string | null {
  if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "A senha precisa ter letras e números.";
  if (/^(.)\1+$/.test(password)) return "A senha não pode ser um caractere repetido.";
  const lower = password.toLowerCase();
  const sequences = ["01234567", "12345678", "23456789", "abcdefgh", "bcdefghi", "qwertyui", "senha123", "12345678"];
  if (sequences.some((seq) => lower.includes(seq))) return "Essa senha é fácil demais de adivinhar. Escolha outra.";
  return null;
}

export default function SignupPage() {
  const { configured, firebaseConfig, switchOrganization } = useAppAuth();
  const router = useRouter();

  const [churchName, setChurchName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [taxId, setTaxId] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      setError("Firebase não configurado.");
      return;
    }
    if (!churchName.trim() || !adminName.trim() || !email.trim() || !city.trim() || !state) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!isValidTaxId(taxId)) {
      setError("Digite um CPF ou CNPJ válido (do responsável, se a igreja ainda não tiver CNPJ).");
      return;
    }
    const pwIssue = passwordIssue(password);
    if (pwIssue) {
      setError(pwIssue);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const sdk = await import("@alvo/firebase");
      const credential = await sdk.registerWithFirebaseEmailPassword({
        config: firebaseConfig,
        email: email.trim(),
        password,
        displayName: adminName.trim()
      });

      const baseSlug = slugify(churchName) || "igreja";
      const organizationId = `org_${baseSlug}_${credential.user.uid.slice(0, 6)}`;

      await sdk.provisionSelfServeOrganization(firebaseConfig, {
        organizationId,
        churchName: churchName.trim(),
        ownerUid: credential.user.uid,
        ownerEmail: email.trim(),
        taxId: taxId.replace(/\D/g, ""),
        addressCity: city.trim(),
        addressState: state
      });

      sdk.claimOrganizationSlug(firebaseConfig, {
        slug: baseSlug,
        organizationId,
        displayName: churchName.trim()
      }).catch(() => {
        // Best-effort: se o slug já estiver em uso por outra igreja, o
        // formulário público simplesmente não fica disponível ainda —
        // não deve travar o cadastro.
      });

      switchOrganization(organizationId);
      router.replace("/");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? translateFirebaseError(nextError.message)
          : "Não foi possível criar sua conta. Tente novamente."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <BrandLogo size={56} iconOnly />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Criar sua conta</h1>
          <p style={{ color: "#6b7280", marginTop: 6, fontSize: 14 }}>
            Grátis até 50 membros. Sem cartão de crédito.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 12,
            padding: 20,
            borderRadius: 20,
            background: "#fffdf8",
            border: "1px solid rgba(31, 41, 55, 0.12)"
          }}
        >
          <label style={labelStyle}>
            Nome da igreja
            <input
              type="text"
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              style={inputStyle}
              placeholder="Ex: Assembleia de Deus Central"
              autoComplete="organization"
              required
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>
              Cidade
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={inputStyle}
                placeholder="Ex: Marabá"
                autoComplete="address-level2"
                required
              />
            </label>
            <label style={labelStyle}>
              Estado
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">UF</option>
                {BRAZIL_STATES.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>
          </div>

          <label style={labelStyle}>
            CNPJ da igreja (se tiver) ou CPF do responsável
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              style={inputStyle}
              placeholder="000.000.000-00"
              required
            />
          </label>

          <label style={labelStyle}>
            Seu nome
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              style={inputStyle}
              autoComplete="name"
              required
            />
          </label>
          <label style={labelStyle}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              autoComplete="email"
              required
            />
          </label>
          <label style={labelStyle}>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Mínimo 8 caracteres, com letras e números.</span>
          </label>

          <button type="submit" style={buttonStyle} disabled={isSubmitting || !configured}>
            {isSubmitting ? "Criando conta..." : "Criar conta gratuita"}
          </button>

          {error && <p style={errorStyle}>{error}</p>}
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 16 }}>
          Já tem conta? <Link href="/login" style={{ color: "#f97316", fontWeight: 600 }}>Entrar</Link>
        </p>
      </div>
    </div>
  );
}

function translateFirebaseError(message: string): string {
  if (message.includes("email-already-in-use")) return "Este email já está cadastrado. Tente entrar.";
  if (message.includes("weak-password")) return "Senha muito fraca. Use letras e números, mínimo 8 caracteres.";
  if (message.includes("invalid-email")) return "Email inválido.";
  return "Não foi possível criar sua conta. Tente novamente.";
}

const labelStyle = {
  display: "grid",
  gap: 8,
  fontSize: 14,
  color: "#1f2937"
} as const;

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(31, 41, 55, 0.16)",
  background: "#fffdf8",
  color: "#1f2937"
} as const;

const buttonStyle = {
  border: 0,
  borderRadius: 14,
  padding: "12px 16px",
  background: "#f97316",
  color: "#fffaf1",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 4
} as const;

const errorStyle = {
  margin: "4px 0 0",
  color: "#b42318",
  fontSize: 13,
  lineHeight: 1.5
} as const;

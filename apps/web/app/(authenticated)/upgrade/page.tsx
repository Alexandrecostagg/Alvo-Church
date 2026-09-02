"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, ArrowLeft } from "lucide-react";

const MODULE_LABELS: Record<string, string> = {
  visitors: "Recepção & Visitantes",
  groups: "Células e Grupos",
  events: "Eventos",
  children: "Kids & Segurança",
  youth: "Jovens",
  volunteers: "Escalas & Voluntários",
  tribes: "Tribos",
  journeys: "Jornadas & EAD",
  communication: "Comunicação Multicanal",
  marketplace: "Marketplace Comunitário",
  giving: "Doações & Giving",
  publicForms: "Formulários Públicos",
  finance: "Finanças",
  ai: "Cuidado Pastoral",
};

function UpgradeContent() {
  const searchParams = useSearchParams();
  const moduleKey = searchParams.get("module") ?? "";
  const moduleLabel = MODULE_LABELS[moduleKey] ?? "este módulo";

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={iconWrapStyle}>
          <Lock size={32} strokeWidth={1.8} style={{ color: "var(--alvo-accent-dark, var(--esdras-primary-dark))" }} />
        </div>

        <h1 style={titleStyle}>Módulo não incluído no seu plano</h1>

        <p style={descStyle}>
          O recurso <strong>{moduleLabel}</strong> não está ativo na assinatura atual da sua
          organização. Fale com o administrador para habilitar este módulo.
        </p>

        <div style={actionsStyle}>
          <Link href="/" style={backLinkStyle}>
            <ArrowLeft size={16} />
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  );
}

const pageStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: "24px",
} as const;

const cardStyle = {
  maxWidth: 420,
  width: "100%",
  padding: "40px 32px",
  borderRadius: 24,
  background: "#fffdf8",
  border: "1px solid var(--alvo-line, rgba(29,41,64,0.12))",
  display: "grid",
  gap: 16,
  textAlign: "center" as const,
} as const;

const iconWrapStyle = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 8,
} as const;

const titleStyle = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: "var(--alvo-ink, #1c2433)",
} as const;

const descStyle = {
  margin: 0,
  lineHeight: 1.6,
  color: "var(--alvo-ink-soft, #475467)",
  fontSize: 15,
} as const;

const actionsStyle = {
  display: "flex",
  justifyContent: "center",
  marginTop: 8,
} as const;

const backLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 20px",
  borderRadius: 999,
  background: "var(--alvo-accent-dark, var(--esdras-primary-dark))",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  textDecoration: "none",
} as const;
export const runtime = 'edge';

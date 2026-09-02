"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, Lock } from "lucide-react";
import { usePlan } from "../../contexts/PlanContext";

// Rotas que continuam acessíveis mesmo com o sistema suspenso — o usuário
// precisa conseguir ver o resumo (dashboard) e regularizar o pagamento.
const ALLOWED_WHEN_SUSPENDED = new Set(["/", "/settings/plano"]);

export function BillingGate({ children }: { children: ReactNode }) {
  const { ready, billingStatus, overdueSince } = usePlan();
  const pathname = usePathname();

  if (!ready || billingStatus === "active") {
    return <>{children}</>;
  }

  if (
    billingStatus === "suspended" &&
    !ALLOWED_WHEN_SUSPENDED.has(pathname ?? "")
  ) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "4rem 1.5rem",
          textAlign: "center",
          minHeight: "60vh",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--color-background-danger, #FCEBEB)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Lock
            size={24}
            style={{ color: "var(--color-text-danger, #A32D2D)" }}
          />
        </div>
        <div>
          <p
            style={{
              margin: 0,
              fontWeight: 500,
              fontSize: 17,
              color: "var(--color-text-primary, #111)",
            }}
          >
            Acesso suspenso por falta de pagamento
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 14,
              color: "var(--color-text-secondary, #6b7280)",
              maxWidth: 420,
            }}
          >
            Sua organização está com a fatura em atraso há mais de 5 dias.
            Regularize o pagamento para voltar a usar todas as funções da
            Plataforma Esdras.
          </p>
        </div>
        <a
          href="/settings/plano"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "#7c3aed",
            color: "#fff",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Ver fatura e regularizar
        </a>
      </div>
    );
  }

  return (
    <>
      {billingStatus === "overdue" && (
        <OverdueBanner overdueSince={overdueSince} />
      )}
      {billingStatus === "suspended" && (
        <OverdueBanner overdueSince={overdueSince} suspended />
      )}
      {children}
    </>
  );
}

function OverdueBanner({
  overdueSince,
  suspended,
}: {
  overdueSince: string | null;
  suspended?: boolean;
}) {
  const since = overdueSince ? new Date(overdueSince) : null;
  const dateLabel =
    since && !Number.isNaN(since.getTime())
      ? since.toLocaleDateString("pt-BR")
      : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        padding: "0.65rem 1.25rem",
        background: "var(--color-background-danger, #FCEBEB)",
        color: "var(--color-text-danger, #A32D2D)",
        fontSize: 13,
      }}
    >
      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        {suspended
          ? "Sistema suspenso por falta de pagamento. Regularize sua fatura para restaurar o acesso."
          : `Fatura em atraso${dateLabel ? ` desde ${dateLabel}` : ""}. Regularize para evitar a suspensão do sistema.`}
      </span>
      <a
        href="/settings/plano"
        style={{
          color: "inherit",
          fontWeight: 500,
          textDecoration: "underline",
          flexShrink: 0,
        }}
      >
        Regularizar agora
      </a>
    </div>
  );
}

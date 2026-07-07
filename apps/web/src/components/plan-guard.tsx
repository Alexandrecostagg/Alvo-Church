"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePlan } from "../../contexts/PlanContext";
import type { PlanFeatureKey, PlanId } from "@alvo/firebase";

const PLAN_LABELS: Record<PlanId, string> = {
  free:       "Gratuito",
  comunidade: "Comunidade",
  pastoral:   "Pastoral",
  rede:       "Rede",
  enterprise: "Enterprise",
};

const UPGRADE_TO: Record<PlanFeatureKey, PlanId> = {
  members:       "free",
  events:        "comunidade",
  communication: "comunidade",
  app:           "free",
  tribes:        "comunidade",
  finance:       "comunidade",
  groups:        "comunidade",
  ai_preview:    "comunidade",
  "pastoral-ai": "pastoral",
  serving:       "pastoral",
  kids:          "pastoral",
  learning:      "pastoral",
  worship:       "pastoral",
  reports:       "pastoral",
  journeys:      "pastoral",
  network:       "rede",
  all:           "rede",
};

interface PlanGuardProps {
  feature: PlanFeatureKey;
  children: ReactNode;
  /** Se true, não mostra o bloqueio — apenas não renderiza */
  silent?: boolean;
}

export function PlanGuard({ feature, children, silent = false }: PlanGuardProps) {
  const { hasFeature, ready } = usePlan();

  if (!ready) return null;
  if (hasFeature(feature)) return <>{children}</>;

  if (silent) return null;

  const requiredPlan = UPGRADE_TO[feature] ?? "pastoral";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: "3rem 1.5rem",
      textAlign: "center",
      color: "var(--color-text-secondary, #6b7280)",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "var(--color-background-secondary, #f3f4f6)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Lock size={20} />
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 500, fontSize: 15, color: "var(--color-text-primary, #111)" }}>
          Disponível no plano {PLAN_LABELS[requiredPlan]}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13 }}>
          Faça upgrade para desbloquear este módulo.
        </p>
      </div>
      <a
        href="/settings/plano"
        style={{
          display: "inline-block",
          padding: "8px 20px",
          background: "#7c3aed",
          color: "#fff",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Ver planos
      </a>
    </div>
  );
}

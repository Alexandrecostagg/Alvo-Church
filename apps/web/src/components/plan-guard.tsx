"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePlan } from "../../contexts/PlanContext";
import { useOrgFeatures } from "../../contexts/OrgFeaturesContext";
import type { PlanFeatureKey, PlanId } from "@alvo/firebase";
import type { ModuleKey } from "@alvo/domain";

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
  giving:        "comunidade",
  marketplace:   "pastoral",
  all:           "rede",
};

const FEATURE_MODULE: Partial<Record<PlanFeatureKey, ModuleKey>> = {
  events: "events",
  communication: "communication",
  tribes: "tribes",
  finance: "finance",
  groups: "groups",
  ai_preview: "ai",
  "pastoral-ai": "ai",
  serving: "volunteers",
  kids: "children",
  learning: "journeys",
  journeys: "journeys",
  giving: "giving",
  marketplace: "marketplace",
};

interface PlanGuardProps {
  feature: PlanFeatureKey;
  children: ReactNode;
  /** Se true, não mostra o bloqueio — apenas não renderiza */
  silent?: boolean;
}

export function PlanGuard({ feature, children, silent = false }: PlanGuardProps) {
  const { hasFeature, ready } = usePlan();
  const { isEnabled } = useOrgFeatures();
  const moduleKey = FEATURE_MODULE[feature];
  const allowedByPlan = hasFeature(feature);
  const allowedByPlatform = !moduleKey || isEnabled(moduleKey);

  if (!ready) return null;
  if (allowedByPlan && allowedByPlatform) return <>{children}</>;

  if (silent) return null;

  const requiredPlan = UPGRADE_TO[feature] ?? "pastoral";
  const manuallyDisabled = allowedByPlan && !allowedByPlatform;

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
          {manuallyDisabled
            ? "Função temporariamente indisponível"
            : `Disponível no plano ${PLAN_LABELS[requiredPlan]}`}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13 }}>
          {manuallyDisabled
            ? "A administração da Plataforma Esdras pausou este módulo para a sua instituição."
            : "Faça upgrade para desbloquear este módulo."}
        </p>
      </div>
      {!manuallyDisabled && (
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
      )}
    </div>
  );
}

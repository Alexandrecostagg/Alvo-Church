"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Building2, ShieldOff } from "lucide-react";
import { homeRouteAllowed } from "@alvo/domain";
import { useOrgFeatures } from "../../contexts/OrgFeaturesContext";
import { usePlan } from "../../contexts/PlanContext";
import Link from "next/link";
import { useAppAuth } from "../providers";

const ADMIN_EXCEPTION = new Set(["/platform-admin"]);

export function OrganizationAccessGate({ children }: { children: ReactNode }) {
  const { tenantReady, tenantRuntime, roles } = useAppAuth();
  const pathname = usePathname();
  const { orgTier, ready } = useOrgFeatures();
  const { plan } = usePlan();
  if (ADMIN_EXCEPTION.has(pathname ?? "")) return <>{children}</>;
  if (!tenantReady) return <p role="status" style={{ padding: 24 }}>Preparando seu acesso…</p>;

  const status = tenantRuntime?.organization.status ?? "active";
  if (status !== "active") {
    return (
      <AccessMessage
        icon={<Building2 size={26} />}
        title={
          status === "suspended"
            ? "Instituição suspensa"
            : "Instituição inativa"
        }
        description="O acesso operacional foi interrompido pela administração da Plataforma Esdras. Fale com o responsável da sua instituição ou com o suporte Esdras."
      />
    );
  }

  if (roles.length === 0) {
    return (
      <AccessMessage
        icon={<ShieldOff size={26} />}
        title="Acesso bloqueado"
        description="Sua conta não possui acesso ativo a esta instituição. Procure a administração da igreja ou o suporte Esdras."
      />
    );
  }

  if (!ready) return <p role="status" style={{ padding: 24 }}>Preparando seu acesso…</p>;
  const networkPlan = ["rede", "enterprise"].includes(tenantRuntime?.settings?.subscription?.plan || plan);
  if (!homeRouteAllowed(roles, pathname || "/app", orgTier, networkPlan)) return <><AccessMessage icon={<ShieldOff size={26} />} title="Área de outra responsabilidade" description="Seu acesso nesta instituição não inclui esta área. Volte ao seu painel para consultar suas tarefas e vínculos." /><p style={{ textAlign: "center" }}><Link href="/app">Abrir meu painel</Link></p></>;
  return <>{children}</>;
}

function AccessMessage({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        minHeight: "60vh",
        padding: "4rem 1.5rem",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 470 }}>
        <div
          style={{
            width: 58,
            height: 58,
            margin: "0 auto 16px",
            borderRadius: 18,
            display: "grid",
            placeItems: "center",
            background: "#FCEBEB",
            color: "#A32D2D",
          }}
        >
          {icon}
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>{title}</h1>
        <p
          style={{
            margin: 0,
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

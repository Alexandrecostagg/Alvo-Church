"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ShieldOff } from "lucide-react";
import { useAppAuth } from "../../app/providers";
import type { AppRole } from "@alvo/types";

interface RoleGuardProps {
  required: AppRole[];
  children: ReactNode;
}

/**
 * Bloqueia acesso a rotas que exigem roles específicos.
 * Enquanto carrega mostra spinner; após carregar, exibe aviso de acesso negado.
 */
export function RoleGuard({ required, children }: RoleGuardProps) {
  const { tenantReady, user, hasAnyRole } = useAppAuth();
  const router = useRouter();

  const allowed = hasAnyRole(required);

  useEffect(() => {
    if (tenantReady && !user) {
      router.replace("/login");
    }
  }, [tenantReady, user, router]);

  if (!tenantReady) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  if (!allowed) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          gap: 16,
          color: "var(--color-text-secondary)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#FCEBEB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldOff size={28} color="#A32D2D" />
        </div>
        <p
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          Acesso restrito
        </p>
        <p
          style={{
            fontSize: 14,
            margin: 0,
            textAlign: "center",
            maxWidth: 320,
          }}
        >
          Você não tem permissão para acessar esta página.
          <br />
          Solicite acesso ao administrador da organização.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

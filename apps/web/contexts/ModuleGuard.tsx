"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ModuleKey } from "@alvo/domain";
import { useOrgFeatures } from "./OrgFeaturesContext";

interface ModuleGuardProps {
  moduleKey: ModuleKey;
  children: ReactNode;
}

export function ModuleGuard({ moduleKey, children }: ModuleGuardProps) {
  const router = useRouter();
  const { ready, isEnabled } = useOrgFeatures();

  useEffect(() => {
    if (ready && !isEnabled(moduleKey)) {
      router.replace(`/upgrade?module=${moduleKey}`);
    }
  }, [ready, isEnabled, moduleKey, router]);

  // Enquanto carrega ou módulo bloqueado, não renderiza nada
  if (!ready || !isEnabled(moduleKey)) return null;

  return <>{children}</>;
}

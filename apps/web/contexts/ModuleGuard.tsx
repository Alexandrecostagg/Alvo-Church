"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ModuleKey } from "@alvo/domain";
import { useOrgFeatures } from "./OrgFeaturesContext";
import { ModuleLoading } from "../src/components/module-loading";

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

  if (!ready) return <ModuleLoading />;
  if (!isEnabled(moduleKey)) return null;

  return <>{children}</>;
}

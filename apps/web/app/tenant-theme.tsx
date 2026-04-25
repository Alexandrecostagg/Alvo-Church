"use client";

import type { CSSProperties, ReactNode } from "react";
import { createBrandTheme } from "@alvo/ui";
import { useAppAuth } from "./providers";

export function TenantTheme({ children }: { children: ReactNode }) {
  const { tenantRuntime } = useAppAuth();
  const brandTheme = createBrandTheme(tenantRuntime?.settings?.branding);

  const style = {
    ["--alvo-bg" as string]: brandTheme.colors.background,
    ["--alvo-surface" as string]: brandTheme.colors.surface,
    ["--alvo-accent" as string]: brandTheme.colors.accent,
    ["--alvo-accent-soft" as string]: brandTheme.colors.accentSoft,
    ["--alvo-accent-dark" as string]: brandTheme.colors.accentDark,
    ["--alvo-ink" as string]: brandTheme.colors.ink,
    ["--alvo-ink-soft" as string]: brandTheme.colors.inkSoft,
    ["--alvo-line" as string]: brandTheme.colors.line,
    minHeight: "100vh"
  } as CSSProperties;

  return (
    <div style={style} data-brand-mode={brandTheme.brand.mode}>
      {children}
    </div>
  );
}

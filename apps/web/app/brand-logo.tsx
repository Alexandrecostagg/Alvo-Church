"use client";

import { createBrandTheme } from "@alvo/ui";
import { useAppAuth } from "./providers";

export function BrandLogo({
  size = 56,
  compact = false
}: {
  size?: number;
  compact?: boolean;
}) {
  const { tenantRuntime } = useAppAuth();
  const brandTheme = createBrandTheme(tenantRuntime?.settings?.branding);
  const markUrl = brandTheme.brand.logoUrl ?? brandTheme.brand.markUrl ?? "/brand/alvo-mark.svg";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 10 : 14
      }}
    >
      <img
        src={markUrl}
        alt={brandTheme.brand.appName}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.24),
          boxShadow: "0 14px 30px rgba(29, 41, 64, 0.12)"
        }}
      />
      <div style={{ display: "grid", gap: 2 }}>
        <span
          style={{
            fontSize: compact ? 11 : 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--alvo-accent-dark)"
          }}
        >
          {brandTheme.brand.appName}
        </span>
        <strong
          style={{
            fontSize: compact ? 18 : 24,
            lineHeight: 1,
            color: "var(--alvo-ink)"
          }}
        >
          {brandTheme.brand.shortName}
        </strong>
        {brandTheme.brand.showPoweredByAlvo ? (
          <span
            style={{
              fontSize: compact ? 10 : 11,
              color: "var(--alvo-ink-soft, rgba(29, 41, 64, 0.72))"
            }}
          >
            {brandTheme.brand.poweredByLabel ?? "Powered by Alvo"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

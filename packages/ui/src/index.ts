import type { OrganizationBrandingSettings } from "@alvo/types";

export const alvoTheme = {
  colors: {
    background: "#f6eee0",
    surface: "#fbf5ea",
    surfaceStrong: "#f2e5cf",
    accent: "#c96a32",
    accentSoft: "#de8a4b",
    accentGold: "#f3c77b",
    accentDark: "#8f4324",
    ink: "#1d2940",
    inkSoft: "#526072",
    line: "rgba(29, 41, 64, 0.12)",
    successSurface: "#eef7ef",
    successInk: "#166534"
  },
  radius: {
    sm: 16,
    md: 24,
    lg: 32,
    pill: 999
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32
  },
  brand: {
    appName: "Alvo Church",
    shortName: "Alvo",
    tagline: "Direcao para a jornada da igreja"
  }
};

export interface BrandThemeTokens {
  colors: typeof alvoTheme.colors;
  brand: {
    appName: string;
    shortName: string;
    tagline: string;
    markUrl?: string;
    logoUrl?: string;
    poweredByLabel?: string;
    showPoweredByAlvo: boolean;
    mode: OrganizationBrandingSettings["brandMode"];
  };
}

export function createBrandTheme(
  branding?: OrganizationBrandingSettings | null
): BrandThemeTokens {
  return {
    colors: {
      ...alvoTheme.colors,
      background: branding?.surfaceColor ?? alvoTheme.colors.background,
      surface: branding?.surfaceColor ?? alvoTheme.colors.surface,
      accent: branding?.primaryColor ?? alvoTheme.colors.accent,
      accentSoft: branding?.accentColor ?? alvoTheme.colors.accentSoft,
      accentDark: branding?.secondaryColor ?? alvoTheme.colors.accentDark,
      ink: branding?.textColor ?? alvoTheme.colors.ink,
      inkSoft: branding?.textColor ? `${branding.textColor}cc` : alvoTheme.colors.inkSoft
    },
    brand: {
      appName: branding?.publicProductName ?? alvoTheme.brand.appName,
      shortName: branding?.publicShortName ?? alvoTheme.brand.shortName,
      tagline: alvoTheme.brand.tagline,
      markUrl: branding?.iconUrl,
      logoUrl: branding?.logoLightUrl,
      poweredByLabel: branding?.poweredByLabel,
      showPoweredByAlvo: branding?.showPoweredByAlvo ?? false,
      mode: branding?.brandMode ?? "alvo_managed"
    }
  };
}

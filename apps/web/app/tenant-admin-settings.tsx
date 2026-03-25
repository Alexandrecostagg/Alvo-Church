"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrandTheme } from "@alvo/ui";
import {
  createTenantUploadApiBaseUrlFromEnv,
  createFirebaseWebRuntimeConfigFromEnv,
  isFirebaseWebRuntimeConfigured,
  saveOrganizationBrandingSettings,
  saveOrganizationFeaturesSettings,
  saveOrganizationSubscriptionSettings,
  uploadOrganizationBrandAsset
} from "@alvo/firebase";
import type {
  OrganizationBrandMode,
  OrganizationFeatureModule,
  OrganizationFeaturesSettings,
  OrganizationSettingsSnapshot,
  OrganizationSubscriptionSettings,
  SubscriptionPlanTier
} from "@alvo/types";
import { useAppAuth } from "./providers";

const PLAN_OPTIONS: SubscriptionPlanTier[] = ["base", "growth", "advanced", "enterprise"];
const BRAND_MODE_OPTIONS: OrganizationBrandMode[] = [
  "alvo_managed",
  "co_branded",
  "white_label"
];
const MODULE_ORDER = [
  "core",
  "visitors",
  "groups",
  "events",
  "children",
  "youth",
  "volunteers",
  "tribes",
  "journeys",
  "communication",
  "finance",
  "ai"
] as const;

function cloneModule(module: OrganizationFeatureModule): OrganizationFeatureModule {
  return {
    enabled: module.enabled,
    source: module.source,
    beta: module.beta,
    limits: module.limits ? { ...module.limits } : undefined
  };
}

function cloneSettings(settings: OrganizationSettingsSnapshot): OrganizationSettingsSnapshot {
  return {
    branding: { ...settings.branding },
    subscription: { ...settings.subscription },
    features: {
      organizationId: settings.features.organizationId,
      modules: Object.fromEntries(
        MODULE_ORDER.map((module) => [module, cloneModule(settings.features.modules[module])])
      ) as OrganizationFeaturesSettings["modules"]
    }
  };
}

export function TenantAdminSettings() {
  const { configured, tenantReady, tenantRuntime, user } = useAppAuth();
  const [draft, setDraft] = useState<OrganizationSettingsSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firebaseConfig = useMemo(
    () =>
      createFirebaseWebRuntimeConfigFromEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      }),
    []
  );
  const uploadApiBaseUrl = useMemo(
    () =>
      createTenantUploadApiBaseUrlFromEnv(
        {
          NEXT_PUBLIC_UPLOAD_API_BASE_URL: process.env.NEXT_PUBLIC_UPLOAD_API_BASE_URL
        },
        "NEXT_PUBLIC"
      ),
    []
  );

  useEffect(() => {
    if (tenantRuntime?.settings) {
      setDraft(cloneSettings(tenantRuntime.settings));
    }
  }, [tenantRuntime]);

  if (!configured || !user) {
    return null;
  }

  if (!tenantReady || !tenantRuntime?.settings || !draft) {
    return (
      <section style={sectionStyle}>
        <strong style={{ fontSize: 24 }}>Configuracoes da organizacao</strong>
        <p style={captionStyle}>Carregando marca, assinatura e modulos do tenant...</p>
      </section>
    );
  }

  const brandTheme = createBrandTheme(draft.branding);

  async function handleSave() {
    if (!isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setError("Firebase nao configurado para salvar as configuracoes do tenant.");
      return;
    }

    if (!draft) {
      setError("O tenant ainda nao carregou configuracoes suficientes para salvar.");
      return;
    }

    const nextDraft = draft;

    try {
      setSaving(true);
      setError(null);
      setStatus(null);

      await Promise.all([
        saveOrganizationBrandingSettings(firebaseConfig, nextDraft.branding),
        saveOrganizationSubscriptionSettings(firebaseConfig, nextDraft.subscription),
        saveOrganizationFeaturesSettings(firebaseConfig, nextDraft.features)
      ]);

      setStatus("Configuracoes salvas no Firestore com sucesso.");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Nao foi possivel salvar as configuracoes da organizacao."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAssetUpload(
    assetKind: "logoLight" | "logoDark" | "icon" | "favicon",
    file: File | null
  ) {
    if (!file || !draft) {
      return;
    }

    if (!isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setError("Firebase nao configurado para upload de assets.");
      return;
    }

    if (!uploadApiBaseUrl) {
      setError("Cloudflare upload API nao configurada.");
      return;
    }

    if (!user) {
      setError("Sessao do usuario nao encontrada para assinar o upload.");
      return;
    }

    try {
      setUploadingAsset(assetKind);
      setError(null);
      setStatus(null);
      const currentUser = user;

      const uploaded = await uploadOrganizationBrandAsset({
        uploadApiBaseUrl,
        organizationId: draft.branding.organizationId,
        assetKind,
        file,
        authToken: await currentUser.getIdToken()
      });

      const nextBranding =
        assetKind === "logoLight"
          ? { ...draft.branding, logoLightUrl: uploaded.publicUrl }
          : assetKind === "logoDark"
            ? { ...draft.branding, logoDarkUrl: uploaded.publicUrl }
            : assetKind === "icon"
              ? { ...draft.branding, iconUrl: uploaded.publicUrl }
              : { ...draft.branding, faviconUrl: uploaded.publicUrl };

      setDraft({
        ...draft,
        branding: nextBranding
      });
      setStatus(`Asset ${assetKind} enviado com sucesso.`);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Nao foi possivel enviar o asset da marca."
      );
    } finally {
      setUploadingAsset(null);
    }
  }

  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <div>
          <strong style={{ display: "block", fontSize: 24 }}>Configuracoes da organizacao</strong>
          <p style={captionStyle}>
            Edite marca, plano e modulos do tenant autenticado. Isso prepara o produto para
            co-branding e white-label real.
          </p>
        </div>
        <div style={previewBadgeStyle}>
          {tenantRuntime.organization.displayName ?? tenantRuntime.organization.name}
        </div>
      </div>

      <div style={previewStyle}>
        <div
          style={{
            ...previewCardStyle,
            background: brandTheme.colors.surface,
            borderColor: `${brandTheme.colors.accent}33`
          }}
        >
          <span style={{ color: brandTheme.colors.accentDark, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Preview
          </span>
          <strong style={{ fontSize: 28, color: brandTheme.colors.ink }}>
            {draft.branding.publicProductName}
          </strong>
          <span style={{ color: brandTheme.colors.inkSoft }}>
            {draft.branding.publicShortName} · {draft.branding.brandMode}
          </span>
          {draft.branding.showPoweredByAlvo ? (
            <span style={{ color: brandTheme.colors.inkSoft }}>
              {draft.branding.poweredByLabel ?? "Powered by Alvo"}
            </span>
          ) : null}
        </div>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <strong style={cardTitleStyle}>Marca</strong>
          <div style={fieldGridStyle}>
            <LabeledInput
              label="Nome publico"
              value={draft.branding.publicProductName}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, publicProductName: value }
                })
              }
            />
            <LabeledInput
              label="Nome curto"
              value={draft.branding.publicShortName}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, publicShortName: value }
                })
              }
            />
            <LabeledSelect
              label="Modo de marca"
              value={draft.branding.brandMode}
              options={BRAND_MODE_OPTIONS}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: {
                    ...draft.branding,
                    brandMode: value as OrganizationBrandMode
                  }
                })
              }
            />
            <LabeledInput
              label="Powered by"
              value={draft.branding.poweredByLabel ?? ""}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, poweredByLabel: value }
                })
              }
            />
            <LabeledInput
              label="Logo clara URL"
              value={draft.branding.logoLightUrl ?? ""}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, logoLightUrl: value }
                })
              }
            />
            <LabeledInput
              label="Logo escura URL"
              value={draft.branding.logoDarkUrl ?? ""}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, logoDarkUrl: value }
                })
              }
            />
            <LabeledInput
              label="Icon URL"
              value={draft.branding.iconUrl ?? ""}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, iconUrl: value }
                })
              }
            />
            <LabeledInput
              label="Favicon URL"
              value={draft.branding.faviconUrl ?? ""}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, faviconUrl: value }
                })
              }
            />
            <LabeledColor
              label="Primaria"
              value={draft.branding.primaryColor}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, primaryColor: value }
                })
              }
            />
            <LabeledColor
              label="Secundaria"
              value={draft.branding.secondaryColor ?? "#1c2433"}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, secondaryColor: value }
                })
              }
            />
            <LabeledColor
              label="Accent"
              value={draft.branding.accentColor ?? "#e8dcc7"}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, accentColor: value }
                })
              }
            />
            <LabeledColor
              label="Surface"
              value={draft.branding.surfaceColor ?? "#f7f3ea"}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, surfaceColor: value }
                })
              }
            />
            <LabeledColor
              label="Texto"
              value={draft.branding.textColor ?? "#1c2433"}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, textColor: value }
                })
              }
            />
          </div>
          <div style={assetGridStyle}>
            {!uploadApiBaseUrl ? (
              <div style={assetHintStyle}>
                Configure <code>NEXT_PUBLIC_UPLOAD_API_BASE_URL</code> para ativar upload via
                Cloudflare Worker. Enquanto isso, as URLs podem ser preenchidas manualmente.
              </div>
            ) : null}
            <AssetUploadField
              disabled={!uploadApiBaseUrl}
              busy={uploadingAsset === "logoLight"}
              label="Upload logo clara"
              onSelect={(file) => void handleAssetUpload("logoLight", file)}
            />
            <AssetUploadField
              disabled={!uploadApiBaseUrl}
              busy={uploadingAsset === "logoDark"}
              label="Upload logo escura"
              onSelect={(file) => void handleAssetUpload("logoDark", file)}
            />
            <AssetUploadField
              disabled={!uploadApiBaseUrl}
              busy={uploadingAsset === "icon"}
              label="Upload icone"
              onSelect={(file) => void handleAssetUpload("icon", file)}
            />
            <AssetUploadField
              disabled={!uploadApiBaseUrl}
              busy={uploadingAsset === "favicon"}
              label="Upload favicon"
              onSelect={(file) => void handleAssetUpload("favicon", file)}
            />
          </div>
          <label style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={draft.branding.showPoweredByAlvo}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  branding: {
                    ...draft.branding,
                    showPoweredByAlvo: event.target.checked
                  }
                })
              }
            />
            Exibir “Powered by Alvo”
          </label>
        </article>

        <article style={cardStyle}>
          <strong style={cardTitleStyle}>Plano comercial</strong>
          <div style={fieldGridStyle}>
            <LabeledInput
              label="Codigo do plano"
              value={draft.subscription.planCode}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  subscription: { ...draft.subscription, planCode: value }
                })
              }
            />
            <LabeledSelect
              label="Tier"
              value={draft.subscription.planTier}
              options={PLAN_OPTIONS}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  subscription: {
                    ...draft.subscription,
                    planTier: value as SubscriptionPlanTier
                  }
                })
              }
            />
            <LabeledNumber
              label="Limite de assentos"
              value={draft.subscription.seatLimit ?? 0}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  subscription: { ...draft.subscription, seatLimit: value }
                })
              }
            />
            <LabeledNumber
              label="Limite de campuses"
              value={draft.subscription.campusLimit ?? 0}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  subscription: { ...draft.subscription, campusLimit: value }
                })
              }
            />
            <LabeledNumber
              label="Cota de IA"
              value={draft.subscription.aiQuota ?? 0}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  subscription: { ...draft.subscription, aiQuota: value }
                })
              }
            />
          </div>
          <div style={checkboxGridStyle}>
            <CheckboxToggle
              label="Co-branding"
              checked={draft.subscription.coBrandingEnabled}
              onChange={(checked) =>
                setDraft({
                  ...draft,
                  subscription: { ...draft.subscription, coBrandingEnabled: checked }
                })
              }
            />
            <CheckboxToggle
              label="White-label"
              checked={draft.subscription.whiteLabelEnabled}
              onChange={(checked) =>
                setDraft({
                  ...draft,
                  subscription: { ...draft.subscription, whiteLabelEnabled: checked }
                })
              }
            />
            <CheckboxToggle
              label="Multi-campus"
              checked={draft.subscription.multiCampusEnabled}
              onChange={(checked) =>
                setDraft({
                  ...draft,
                  subscription: { ...draft.subscription, multiCampusEnabled: checked }
                })
              }
            />
            <CheckboxToggle
              label="Modo denominacional"
              checked={draft.subscription.denominationalModeEnabled}
              onChange={(checked) =>
                setDraft({
                  ...draft,
                  subscription: {
                    ...draft.subscription,
                    denominationalModeEnabled: checked
                  }
                })
              }
            />
          </div>
        </article>
      </div>

      <article style={{ ...cardStyle, marginTop: 16 }}>
        <strong style={cardTitleStyle}>Modulos habilitados</strong>
        <div style={moduleGridStyle}>
          {MODULE_ORDER.map((module) => (
            <label key={module} style={moduleCardStyle}>
              <div>
                <strong style={{ textTransform: "capitalize" }}>{module}</strong>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475467" }}>
                  Origem: {draft.features.modules[module].source}
                </p>
              </div>
              <input
                type="checkbox"
                checked={draft.features.modules[module].enabled}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    features: {
                      ...draft.features,
                      modules: {
                        ...draft.features.modules,
                        [module]: {
                          ...draft.features.modules[module],
                          enabled: event.target.checked
                        }
                      }
                    }
                  })
                }
              />
            </label>
          ))}
        </div>
      </article>

      <div style={footerStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          {status ? <span style={{ color: "#166534" }}>{status}</span> : null}
          {error ? <span style={{ color: "#b42318" }}>{error}</span> : null}
        </div>
        <button onClick={() => void handleSave()} style={saveButtonStyle} disabled={saving}>
          {saving ? "Salvando..." : "Salvar configuracoes"}
        </button>
      </div>
    </section>
  );
}

function LabeledInput({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input style={inputStyle} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function LabeledNumber({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input
        style={inputStyle}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function LabeledSelect({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <select style={inputStyle} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function LabeledColor({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <input style={{ ...inputStyle, flex: 1 }} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function CheckboxToggle({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={checkboxRowStyle}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function AssetUploadField({
  busy,
  disabled,
  label,
  onSelect
}: {
  busy: boolean;
  disabled: boolean;
  label: string;
  onSelect: (file: File | null) => void;
}) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
        onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
        disabled={busy || disabled}
      />
      <span style={{ fontSize: 12, color: "#667085" }}>
        {disabled
          ? "Ative a API de upload do Worker"
          : busy
            ? "Enviando..."
            : "PNG, SVG, JPG, WEBP ou ICO"}
      </span>
    </label>
  );
}

const sectionStyle = {
  marginTop: 28,
  padding: 24,
  borderRadius: 24,
  background: "#fffdf8",
  border: "1px solid var(--alvo-line)"
} as const;

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "center"
} as const;

const captionStyle = {
  margin: "8px 0 0",
  lineHeight: 1.6
} as const;

const previewStyle = {
  marginTop: 20
} as const;

const previewCardStyle = {
  display: "grid",
  gap: 8,
  padding: 20,
  borderRadius: 20,
  border: "1px solid var(--alvo-line)"
} as const;

const previewBadgeStyle = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "#eef7ef",
  color: "#166534",
  fontWeight: 700
} as const;

const gridStyle = {
  marginTop: 20,
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))"
} as const;

const cardStyle = {
  padding: 20,
  borderRadius: 20,
  border: "1px solid var(--alvo-line)",
  background: "#fff"
} as const;

const cardTitleStyle = {
  display: "block",
  marginBottom: 16,
  fontSize: 18
} as const;

const fieldGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
} as const;

const fieldStyle = {
  display: "grid",
  gap: 6,
  fontSize: 14
} as const;

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(29, 41, 64, 0.16)",
  fontSize: 14,
  background: "#fffdf8"
} as const;

const checkboxGridStyle = {
  display: "grid",
  gap: 10,
  marginTop: 16
} as const;

const assetGridStyle = {
  display: "grid",
  gap: 14,
  marginTop: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
} as const;

const assetHintStyle = {
  padding: 12,
  borderRadius: 12,
  background: "#eef5ff",
  color: "#1d4ed8",
  fontSize: 13,
  lineHeight: 1.6,
  gridColumn: "1 / -1"
} as const;

const checkboxRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 14
} as const;

const moduleGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
} as const;

const moduleCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "start",
  padding: 14,
  borderRadius: 16,
  background: "#f7f0e3"
} as const;

const footerStyle = {
  marginTop: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap"
} as const;

const saveButtonStyle = {
  padding: "12px 18px",
  borderRadius: 999,
  border: "none",
  background: "var(--alvo-accent-dark)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
} as const;

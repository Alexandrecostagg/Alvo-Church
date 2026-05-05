"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  ensureTenantUserAccess,
  isFirebaseWebRuntimeConfigured,
  saveOrganizationBrandingSettings,
  saveOrganizationFeaturesSettings,
  saveOrganizationProfile,
  saveOrganizationSubscriptionSettings
} from "@alvo/firebase";
import type {
  Organization,
  OrganizationBrandingSettings,
  OrganizationFeaturesSettings,
  OrganizationSubscriptionSettings
} from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

export function OrganizationNewView() {
  const { configured, user, firebaseConfig } = useAppAuth();
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const displayName = getFormValue(form, "displayName");
    const publicName = getFormValue(form, "publicName") || displayName;
    const slug = slugify(getFormValue(form, "slug") || publicName);
    const organizationId = `org_${slug}`;

    if (!displayName || !slug) {
      setStatus("Informe o nome da instituicao e um slug valido.");
      return;
    }

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Formulario pronto. Entre no Firebase para cadastrar a instituicao.");
      return;
    }

    const now = new Date().toISOString();
    const organization: Organization = {
      id: organizationId,
      name: displayName,
      displayName,
      publicName,
      legalName: getFormValue(form, "legalName") || undefined,
      slug,
      status: "active",
      timezone: getFormValue(form, "timezone") || "America/Belem",
      locale: "pt-BR",
      countryCode: "BR",
      organizationType: getFormValue(form, "organizationType") as Organization["organizationType"]
    };
    const branding: OrganizationBrandingSettings = {
      organizationId,
      brandMode: getFormValue(form, "brandMode") as OrganizationBrandingSettings["brandMode"],
      publicProductName: getFormValue(form, "productName") || "Getro Church",
      publicShortName: getFormValue(form, "shortName") || "Getro",
      primaryColor: getFormValue(form, "primaryColor") || "#d27836",
      secondaryColor: "#1c2433",
      accentColor: "#e8dcc7",
      surfaceColor: "#f7f3ea",
      textColor: "#1c2433",
      showPoweredByAlvo: Boolean(form.get("showPoweredByAlvo")),
      poweredByLabel: "by Getro"
    };
    const subscription: OrganizationSubscriptionSettings = {
      organizationId,
      planCode: `getro-${getFormValue(form, "planTier") || "growth"}`,
      planTier: getFormValue(form, "planTier") as OrganizationSubscriptionSettings["planTier"],
      billingCycle: getFormValue(form, "billingCycle") as OrganizationSubscriptionSettings["billingCycle"],
      memberRange: getFormValue(form, "memberRange") as OrganizationSubscriptionSettings["memberRange"],
      seatLimit: Number(getFormValue(form, "seatLimit") || 8),
      campusLimit: Number(getFormValue(form, "campusLimit") || 1),
      aiQuota: Number(getFormValue(form, "aiQuota") || 100),
      whiteLabelEnabled: getFormValue(form, "brandMode") === "white_label",
      coBrandingEnabled: getFormValue(form, "brandMode") === "co_branded",
      multiCampusEnabled: Number(getFormValue(form, "campusLimit") || 1) > 1,
      denominationalModeEnabled: getFormValue(form, "organizationType") === "denomination",
      startedAt: now
    };
    const features: OrganizationFeaturesSettings = {
      organizationId,
      modules: {
        core: { enabled: true, source: "plan" },
        visitors: { enabled: Boolean(form.get("visitors")), source: "plan" },
        groups: { enabled: Boolean(form.get("groups")), source: "plan" },
        events: { enabled: Boolean(form.get("events")), source: "plan" },
        children: { enabled: Boolean(form.get("children")), source: "manual" },
        youth: { enabled: Boolean(form.get("youth")), source: "addon" },
        volunteers: { enabled: Boolean(form.get("volunteers")), source: "addon" },
        tribes: { enabled: Boolean(form.get("tribes")), source: "plan" },
        journeys: { enabled: Boolean(form.get("journeys")), source: "plan" },
        communication: { enabled: Boolean(form.get("communication")), source: "addon" },
        finance: { enabled: Boolean(form.get("finance")), source: "addon" },
        ai: {
          enabled: Boolean(form.get("ai")),
          source: "trial",
          limits: { monthlySuggestions: subscription.aiQuota ?? 100 }
        }
      }
    };

    try {
      await saveOrganizationProfile(firebaseConfig, organization);
      await saveOrganizationBrandingSettings(firebaseConfig, branding);
      await saveOrganizationSubscriptionSettings(firebaseConfig, subscription);
      await saveOrganizationFeaturesSettings(firebaseConfig, features);
      await ensureTenantUserAccess(firebaseConfig, {
        organizationId,
        userId: user.uid,
        email: user.email ?? "",
        roles: ["church_admin"]
      });

      setStatus(`${displayName} criada em organizations/${organizationId}.`);
      formElement.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel criar a instituicao.");
    }
  }

  return (
    <main className="form-page saas-form-page">
      <section className="form-hero premium-onboarding">
        <div className="hero-content">
          <Link className="back-link" href="/">
            Voltar ao painel
          </Link>
          <p className="eyebrow">SaaS Hub · Onboarding</p>
          <h1>Nova Unidade Alvo</h1>
          <p>
            Expanda o ecossistema criando uma nova organização. Configure a identidade estratégica, 
            escolha o modelo pastoral (Tribos) e ative os módulos operacionais.
          </p>
        </div>
        <aside className="hero-stats-mini">
           <div className="mini-card-saas">
              <strong>99.9%</strong>
              <span>Uptime Garantido</span>
           </div>
           <div className="mini-card-saas">
              <strong>Multi-tenant</strong>
              <span>Isolamento Total</span>
           </div>
        </aside>
      </section>

      <form className="onboarding-form" onSubmit={handleSubmit}>
        <div className="onboarding-sections">
          <fieldset className="premium-fieldset">
            <legend>Identidade & Estratégia</legend>
            <div className="form-row">
              <label>
                Nome da Igreja/Unidade
                <input name="displayName" placeholder="Igreja Alvo Sul" required />
              </label>
              <label>
                Slug da URL (subdomínio)
                <input name="slug" placeholder="alvo-sul" required />
              </label>
            </div>
            <label>
              Modelo de Identidade Pastoral
              <select name="identityModel" defaultValue="tribes_12">
                <option value="tribes_12">Modelo das 12 Tribos (Integrado)</option>
                <option value="custom">Ministérios Tradicionais</option>
                <option value="cells_only">Células (G12/MDS)</option>
              </select>
              <p className="field-hint">Isso afeta como os membros são classificados e escalados.</p>
            </label>
          </fieldset>

          <fieldset className="premium-fieldset">
            <legend>Módulos Ativos (SaaS Suite)</legend>
            <div className="modules-grid-selection">
               {[
                 { id: "finance", label: "Finanças", desc: "Gestão e Transparência" },
                 { id: "children", label: "Kids Security", desc: "Segurança Infantil" },
                 { id: "tribes", label: "Tribos", desc: "Identidade e Dons" },
                 { id: "ai", label: "IA Pastoral", desc: "Insights e Sinais" },
                 { id: "events", label: "Eventos", desc: "Check-in e Inscrições" },
                 { id: "groups", label: "Células", desc: "Gestão de Pequenos Grupos" }
               ].map(mod => (
                 <label className="checkbox-tile" key={mod.id}>
                    <input type="checkbox" name={mod.id} defaultChecked />
                    <div className="tile-content">
                       <strong>{mod.label}</strong>
                       <span>{mod.desc}</span>
                    </div>
                 </label>
               ))}
            </div>
          </fieldset>

          <fieldset className="premium-fieldset">
            <legend>Branding & White-label</legend>
            <div className="form-row">
              <label>
                Nome do Produto
                <input name="productName" defaultValue="Alvo Church" />
              </label>
              <label>
                Cor Primária
                <input name="primaryColor" type="color" defaultValue="#d27836" />
              </label>
            </div>
            <label>
              Modo de Marca
              <select name="brandMode" defaultValue="co_branded">
                <option value="alvo_managed">Marca Alvo Standard</option>
                <option value="co_branded">Co-branded (Recomendado)</option>
                <option value="white_label">White-label Premium</option>
              </select>
            </label>
          </fieldset>
        </div>

        <div className="form-actions-saas">
           <button type="submit" className="primary-button giant antigravity-float">
             Provisionar Nova Unidade
           </button>
           {status && <p className="status-message-saas">{status}</p>}
        </div>

        <style jsx>{`
          .onboarding-form { max-width: 900px; margin: 0 auto; }
          .premium-onboarding { display: flex; justify-content: space-between; align-items: center; padding: 4rem 0; max-width: 900px; margin: 0 auto; }
          .hero-stats-mini { display: flex; gap: 1rem; }
          .mini-card-saas { background: white; padding: 1.25rem; border-radius: 1.25rem; border: 1px solid var(--alvo-line); text-align: center; min-width: 130px; box-shadow: var(--alvo-shadow); }
          .mini-card-saas strong { display: block; font-size: 1.5rem; color: var(--alvo-accent); letter-spacing: -0.04em; }
          .mini-card-saas span { font-size: 0.7rem; text-transform: uppercase; font-weight: 800; color: var(--alvo-ink-soft); }

          .premium-fieldset { border: none; background: white; padding: 2.5rem; border-radius: 2.5rem; border: 1px solid var(--alvo-line); margin-bottom: 2.5rem; box-shadow: var(--alvo-shadow-strong); }
          .premium-fieldset legend { font-weight: 950; font-size: 1.5rem; margin-bottom: 2rem; letter-spacing: -0.05em; color: var(--alvo-ink); background: white; padding: 0 1rem; }
          .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
          .field-hint { font-size: 0.8125rem; color: var(--alvo-ink-soft); margin-top: 0.5rem; }

          .modules-grid-selection { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; }
          .checkbox-tile { position: relative; cursor: pointer; display: block; }
          .checkbox-tile input { position: absolute; opacity: 0; }
          .tile-content { border: 2px solid #f1f5f9; padding: 1.5rem; border-radius: 1.5rem; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
          .checkbox-tile input:checked + .tile-content { border-color: var(--alvo-accent); background: #fff7ed; transform: scale(1.02); }
          .tile-content strong { display: block; font-size: 1rem; color: var(--alvo-ink); }
          .tile-content span { font-size: 0.8125rem; color: var(--alvo-ink-soft); }

          .form-actions-saas { text-align: center; margin-top: 4rem; padding-bottom: 6rem; }
          .primary-button.giant { padding: 1.5rem 4rem; font-size: 1.25rem; border-radius: 1.5rem; font-weight: 900; }
          .status-message-saas { margin-top: 2rem; font-weight: 800; color: var(--alvo-accent); font-size: 1.125rem; }

          @media (max-width: 768px) {
            .form-row, .modules-grid-selection { grid-template-columns: 1fr; }
            .premium-onboarding { flex-direction: column; text-align: center; gap: 2rem; }
          }
        `}</style>
    </main>
  );
}

function getFormValue(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

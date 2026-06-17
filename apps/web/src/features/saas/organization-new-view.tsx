"use client";

import Link from "next/link";
import { useState, type CSSProperties, type FormEvent } from "react";
import {
  Building2,
  CheckCircle2,
  Globe2,
  Landmark,
  Layers3,
  LockKeyhole,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";
import {
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

const moduleOptions = [
  { id: "visitors", label: "Recepção", desc: "Visitantes e boas-vindas", source: "plan" },
  { id: "finance", label: "Finanças", desc: "Gestão e transparência", source: "addon" },
  { id: "children", label: "Kids Security", desc: "Segurança infantil", source: "manual" },
  { id: "tribes", label: "Tribos", desc: "Identidade e dons", source: "plan" },
  { id: "journeys", label: "Jornadas", desc: "Discipulado e integração", source: "plan" },
  { id: "ai", label: "IA Pastoral", desc: "Insights e sinais", source: "trial" },
  { id: "events", label: "Eventos", desc: "Check-in e inscrições", source: "plan" },
  { id: "groups", label: "Células", desc: "Pequenos grupos", source: "plan" },
  { id: "volunteers", label: "Escalas", desc: "Serviço e voluntários", source: "addon" },
  { id: "communication", label: "Comunicação", desc: "WhatsApp e campanhas", source: "addon" }
] as const;

const planDefaults = {
  base: { seats: 4, campuses: 1, aiQuota: 50 },
  growth: { seats: 8, campuses: 1, aiQuota: 100 },
  advanced: { seats: 18, campuses: 3, aiQuota: 350 },
  enterprise: { seats: 50, campuses: 10, aiQuota: 1000 }
} as const;

export function OrganizationNewView() {
  const { configured, user, firebaseConfig } = useAppAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [planTier, setPlanTier] = useState<OrganizationSubscriptionSettings["planTier"]>("growth");
  const [brandMode, setBrandMode] = useState<OrganizationBrandingSettings["brandMode"]>("co_branded");
  const [primaryColor, setPrimaryColor] = useState("#06b6d4");

  const planConfig = planDefaults[planTier];
  const publicUrl = `${slug || "sua-unidade"}.getro.app`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const displayName = getFormValue(form, "displayName");
    const publicName = getFormValue(form, "publicName") || displayName;
    const slug = slugify(getFormValue(form, "slug") || publicName);
    const organizationId = `org_${slug}`;
    const organizationType = (getFormValue(form, "organizationType") || "church") as Organization["organizationType"];
    const brandMode = (getFormValue(form, "brandMode") || "co_branded") as OrganizationBrandingSettings["brandMode"];
    const selectedPlanTier = (getFormValue(form, "planTier") || "growth") as OrganizationSubscriptionSettings["planTier"];
    const billingCycle = (getFormValue(form, "billingCycle") || "monthly") as OrganizationSubscriptionSettings["billingCycle"];
    const memberRange = (getFormValue(form, "memberRange") || "101_to_300") as OrganizationSubscriptionSettings["memberRange"];

    if (!displayName || !slug) {
      setStatus("Informe o nome da instituicao e um slug valido.");
      return;
    }

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Formulario validado. Entre no Firebase para cadastrar a instituicao.");
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
      organizationType
    };
    const branding: OrganizationBrandingSettings = {
      organizationId,
      brandMode,
      publicProductName: getFormValue(form, "productName") || "Getro Church",
      publicShortName: getFormValue(form, "shortName") || "Getro",
      primaryColor: getFormValue(form, "primaryColor") || "#06b6d4",
      secondaryColor: "#1c2433",
      accentColor: "#e8dcc7",
      surfaceColor: "#f7f3ea",
      textColor: "#1c2433",
      showPoweredByAlvo: Boolean(form.get("showPoweredByAlvo")),
      poweredByLabel: "by Getro"
    };
    const subscription: OrganizationSubscriptionSettings = {
      organizationId,
      planCode: `getro-${selectedPlanTier}`,
      planTier: selectedPlanTier,
      billingCycle,
      memberRange,
      seatLimit: Number(getFormValue(form, "seatLimit") || planDefaults[selectedPlanTier].seats),
      campusLimit: Number(getFormValue(form, "campusLimit") || planDefaults[selectedPlanTier].campuses),
      aiQuota: Number(getFormValue(form, "aiQuota") || planDefaults[selectedPlanTier].aiQuota),
      whiteLabelEnabled: brandMode === "white_label",
      coBrandingEnabled: brandMode === "co_branded",
      multiCampusEnabled: Number(getFormValue(form, "campusLimit") || 1) > 1,
      denominationalModeEnabled: organizationType === "denomination",
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
      setIsSaving(true);
      setStatus("Provisionando tenant, branding, assinatura e permissoes...");
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
      setDisplayName("");
      setSlug("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel criar a instituicao.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="form-page saas-form-page">
      <section className="form-hero premium-onboarding">
        <div className="hero-content">
          <Link className="back-link" href="/">
            Voltar ao painel
          </Link>
          <p className="eyebrow"><Rocket size={14} /> SaaS Hub · Onboarding</p>
          <h1>Nova Organização</h1>
          <p>
            Expanda o ecossistema criando uma nova organização. Configure a identidade estratégica, 
            escolha o modelo pastoral (Tribos) e ative os módulos operacionais.
          </p>
        </div>
        <aside className="hero-stats-mini">
           <div className="mini-card-saas">
              <ShieldCheck size={18} />
              <strong>99.9%</strong>
              <span>Uptime Garantido</span>
           </div>
           <div className="mini-card-saas">
              <LockKeyhole size={18} />
              <strong>Multi-tenant</strong>
              <span>Isolamento Total</span>
           </div>
        </aside>
      </section>

      <form className="onboarding-form" onSubmit={handleSubmit}>
        <div className="onboarding-sections">
          <fieldset className="premium-fieldset">
            <legend><Building2 size={22} /> Identidade & Estratégia</legend>
            <div className="form-row">
              <label>
                Nome da Igreja/Unidade
                <input
                  name="displayName"
                  placeholder="Igreja Alvo Sul"
                  required
                  value={displayName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDisplayName(value);
                    if (!slug) setSlug(slugify(value));
                  }}
                />
              </label>
              <label>
                Slug da URL (subdomínio)
                <input
                  name="slug"
                  placeholder="alvo-sul"
                  required
                  value={slug}
                  onChange={(event) => setSlug(slugify(event.target.value))}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Nome público
                <input name="publicName" placeholder="Alvo Sul" defaultValue={displayName} />
              </label>
              <label>
                Razão social
                <input name="legalName" placeholder="Igreja Alvo Sul LTDA" />
              </label>
            </div>
            <div className="form-row">
              <label>
                Tipo de organização
                <select name="organizationType" defaultValue="church">
                  <option value="church">Igreja local</option>
                  <option value="network">Rede de igrejas</option>
                  <option value="denomination">Denominação</option>
                  <option value="institution">Instituição</option>
                </select>
              </label>
              <label>
                Fuso horário
                <select name="timezone" defaultValue="America/Belem">
                  <option value="America/Belem">Belém / Brasília sem horário de verão</option>
                  <option value="America/Sao_Paulo">São Paulo / Brasília</option>
                  <option value="America/Manaus">Manaus</option>
                  <option value="America/Fortaleza">Fortaleza</option>
                </select>
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
            <div className="tenant-preview">
              <Globe2 size={18} />
              <span>Prévia pública</span>
              <strong>{publicUrl}</strong>
            </div>
          </fieldset>

          <fieldset className="premium-fieldset">
            <legend><Layers3 size={22} /> Módulos Ativos</legend>
            <div className="modules-grid-selection">
               {moduleOptions.map(mod => (
                 <label className="checkbox-tile" key={mod.id}>
                    <input type="checkbox" name={mod.id} defaultChecked />
                    <div className="tile-content">
                       <strong>{mod.label}</strong>
                       <span>{mod.desc}</span>
                       <small>{mod.source}</small>
                    </div>
                 </label>
               ))}
            </div>
          </fieldset>

          <fieldset className="premium-fieldset">
            <legend><Landmark size={22} /> Plano & Capacidade</legend>
            <div className="form-row">
              <label>
                Plano
                <select
                  name="planTier"
                  value={planTier}
                  onChange={(event) => setPlanTier(event.target.value as OrganizationSubscriptionSettings["planTier"])}
                >
                  <option value="base">Base</option>
                  <option value="growth">Growth</option>
                  <option value="advanced">Advanced</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label>
                Ciclo de cobrança
                <select name="billingCycle" defaultValue="monthly">
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                  <option value="custom">Contrato personalizado</option>
                </select>
              </label>
            </div>
            <div className="form-row three-columns">
              <label>
                Faixa de membros
                <select name="memberRange" defaultValue="101_to_300">
                  <option value="up_to_100">Até 100</option>
                  <option value="101_to_300">101 a 300</option>
                  <option value="301_to_800">301 a 800</option>
                  <option value="801_plus">801+</option>
                </select>
              </label>
              <label>
                Usuários internos
                <input name="seatLimit" type="number" min="1" value={planConfig.seats} readOnly />
              </label>
              <label>
                Campi/unidades
                <input name="campusLimit" type="number" min="1" value={planConfig.campuses} readOnly />
              </label>
            </div>
            <label>
              Cota mensal de IA
              <input name="aiQuota" type="number" min="0" value={planConfig.aiQuota} readOnly />
              <p className="field-hint">A cota alimenta os limites iniciais da IA Pastoral para esse tenant.</p>
            </label>
          </fieldset>

          <fieldset className="premium-fieldset">
            <legend><Palette size={22} /> Branding & White-label</legend>
            <div className="form-row">
              <label>
                Nome do Produto
                <input name="productName" defaultValue="Alvo Church" />
              </label>
              <label>
                Nome curto
                <input name="shortName" defaultValue="Getro" />
              </label>
            </div>
            <div className="form-row">
              <label>
                Cor Primária
                <input
                  name="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                />
              </label>
              <label>
                Modo de Marca
                <select
                  name="brandMode"
                  value={brandMode}
                  onChange={(event) => setBrandMode(event.target.value as OrganizationBrandingSettings["brandMode"])}
                >
                  <option value="alvo_managed">Marca Alvo Standard</option>
                  <option value="co_branded">Co-branded (Recomendado)</option>
                  <option value="white_label">White-label Premium</option>
                </select>
              </label>
            </div>
            <label className="check-row org-check-row">
              <input name="showPoweredByAlvo" type="checkbox" defaultChecked />
              <span>Exibir selo “by Getro” no rodapé público</span>
            </label>
            <div className="brand-preview" style={{ "--preview-color": primaryColor } as CSSProperties}>
              <Sparkles size={18} />
              <span>{brandMode === "white_label" ? "White-label premium" : brandMode === "co_branded" ? "Co-branded recomendado" : "Marca Alvo standard"}</span>
            </div>
          </fieldset>
        </div>

        <div className="form-actions-saas">
           <button type="submit" className="primary-button giant antigravity-float" disabled={isSaving}>
             {isSaving ? "Provisionando..." : "Provisionar Nova Organização"}
           </button>
           {status && (
            <p className="status-message-saas">
              <CheckCircle2 size={18} />
              {status}
            </p>
           )}
        </div>

        <style jsx>{`
          .onboarding-form { max-width: 1180px; margin: 0 auto; }
          .premium-onboarding { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: end; padding: 28px 0 30px; max-width: 1180px; margin: 0 auto; }
          .premium-onboarding .eyebrow { display: inline-flex; align-items: center; gap: 8px; color: #ea580c; }
          .premium-onboarding h1 { max-width: 760px; font-size: clamp(48px, 5.4vw, 76px); line-height: 0.98; color: #111827; letter-spacing: 0; }
          .hero-stats-mini { display: grid; grid-template-columns: repeat(2, minmax(120px, 1fr)); gap: 12px; }
          .mini-card-saas { background: rgba(255,255,255,0.94); padding: 1rem; border-radius: 14px; border: 1px solid rgba(15,23,42,0.10); text-align: left; min-width: 150px; box-shadow: 0 18px 44px -30px rgba(15,23,42,0.45); }
          .mini-card-saas svg { color: #16a34a; }
          .mini-card-saas strong { display: block; margin-top: 10px; font-size: 1.1rem; color: #111827; letter-spacing: 0; }
          .mini-card-saas span { display: block; margin-top: 3px; font-size: 0.72rem; text-transform: uppercase; font-weight: 850; color: #64748b; }

          .premium-fieldset { border: 1px solid rgba(15,23,42,0.10); background: rgba(255,255,255,0.96); padding: 2rem; border-radius: 18px; margin-bottom: 24px; box-shadow: 0 18px 44px -30px rgba(15,23,42,0.45); }
          .premium-fieldset legend { display: inline-flex; align-items: center; gap: 10px; font-weight: 950; font-size: 1.35rem; margin-bottom: 1.5rem; letter-spacing: 0; color: #0891b2; background: transparent; padding: 0; }
          .premium-fieldset legend svg { color: #ea580c; }
          .form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-bottom: 18px; }
          .form-row.three-columns { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .field-hint { font-size: 0.8125rem; color: #64748b; margin: 0.5rem 0 0; }
          label { color: #111827; font-weight: 850; }
          input, select { width: 100%; min-height: 46px; margin-top: 8px; padding: 0 14px; border: 1px solid rgba(15,23,42,0.14); border-radius: 10px; background: #ffffff; color: #111827; font-size: 15px; font-weight: 700; outline: none; }
          input:focus, select:focus { border-color: #0891b2; box-shadow: 0 0 0 4px rgba(8,145,178,0.12); }
          input[readonly] { background: #f8fafc; color: #475569; }

          .modules-grid-selection { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
          .checkbox-tile { position: relative; cursor: pointer; display: block; }
          .checkbox-tile input { position: absolute; opacity: 0; }
          .tile-content { min-height: 112px; border: 1px solid rgba(15,23,42,0.12); padding: 1.2rem; border-radius: 14px; transition: all 0.2s ease; background: #f8fafc; }
          .checkbox-tile input:checked + .tile-content { border-color: #0891b2; background: rgba(8,145,178,0.08); transform: translateY(-1px); }
          .tile-content strong { display: block; font-size: 1rem; color: #111827; }
          .tile-content span { display: block; margin-top: 4px; font-size: 0.8125rem; color: #64748b; }
          .tile-content small { display: inline-flex; margin-top: 12px; padding: 3px 8px; border-radius: 999px; background: #ffffff; color: #0891b2; font-size: 0.68rem; font-weight: 900; text-transform: uppercase; }

          .tenant-preview,
          .brand-preview,
          .org-check-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 18px;
            padding: 14px;
            border-radius: 12px;
            background: #f8fafc;
            color: #475569;
            border: 1px solid rgba(15,23,42,0.08);
          }

          .tenant-preview strong { color: #111827; overflow-wrap: anywhere; }
          .tenant-preview svg,
          .brand-preview svg { color: #0891b2; flex: 0 0 auto; }
          .brand-preview { border-color: color-mix(in srgb, var(--preview-color) 35%, rgba(15,23,42,0.10)); }
          .brand-preview span { color: #111827; font-weight: 850; }
          .org-check-row input { width: 18px; min-height: 18px; margin: 0; padding: 0; }

          .form-actions-saas { text-align: center; margin-top: 2.5rem; padding-bottom: 6rem; }
          .primary-button.giant { min-height: 64px; padding: 0 3.2rem; font-size: 1.1rem; border-radius: 16px; font-weight: 900; background: #111827; color: #ffffff; border: 0; }
          .primary-button.giant:disabled { opacity: 0.62; cursor: progress; }
          .status-message-saas { display: inline-flex; align-items: center; gap: 8px; margin-top: 1.25rem; padding: 12px 16px; border-radius: 12px; font-weight: 850; color: #166534; background: #ecfdf5; border: 1px solid rgba(22,163,74,0.18); font-size: 0.95rem; }

          @media (max-width: 768px) {
            .premium-onboarding,
            .form-row,
            .form-row.three-columns,
            .modules-grid-selection { grid-template-columns: 1fr; }
            .premium-onboarding { text-align: left; gap: 1rem; padding-top: 12px; }
            .hero-stats-mini { grid-template-columns: 1fr 1fr; }
            .premium-fieldset { padding: 1.25rem; border-radius: 16px; }
            .form-actions-saas { padding-bottom: 2rem; }
          }
        `}</style>
      </form>
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

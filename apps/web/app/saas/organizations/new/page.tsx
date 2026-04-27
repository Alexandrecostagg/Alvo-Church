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
import { useAppAuth } from "../../../providers";

export default function NewContractingOrganizationPage() {
  const { configured, user } = useAppAuth();
  const [status, setStatus] = useState<string | null>(null);

  const firebaseConfig = useMemo(
    () =>
      createFirebaseWebRuntimeConfigFromEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      }),
    []
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
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
      event.currentTarget.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel criar a instituicao.");
    }
  }

  return (
    <main className="form-page saas-form-page">
      <section className="form-hero">
        <Link className="back-link" href="/">
          Voltar ao painel
        </Link>
        <p className="eyebrow">Cadastro SaaS</p>
        <h1>Nova instituicao contratante</h1>
        <p>
          Use esta pagina para abrir um tenant: organizacao, marca, plano, limites,
          modulos contratados e acesso inicial do gestor.
        </p>
      </section>

      <form className="form-card form-grid" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Dados da instituicao</legend>
          <label>
            Nome de exibicao
            <input name="displayName" placeholder="Igreja Getro Norte" required />
          </label>
          <label>
            Nome publico
            <input name="publicName" placeholder="Getro Norte" />
          </label>
          <label>
            Razao social
            <input name="legalName" />
          </label>
          <label>
            Slug
            <input name="slug" placeholder="getro-norte" />
          </label>
          <label>
            Tipo
            <select name="organizationType" defaultValue="church">
              <option value="church">Igreja local</option>
              <option value="network">Rede</option>
              <option value="denomination">Denominacao</option>
              <option value="institution">Instituicao</option>
            </select>
          </label>
          <label>
            Fuso horario
            <input name="timezone" defaultValue="America/Belem" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Marca e plano</legend>
          <label>
            Produto exibido
            <input name="productName" defaultValue="Getro Church" />
          </label>
          <label>
            Nome curto
            <input name="shortName" defaultValue="Getro" />
          </label>
          <label>
            Cor primaria
            <input name="primaryColor" type="color" defaultValue="#d27836" />
          </label>
          <label>
            Marca
            <select name="brandMode" defaultValue="co_branded">
              <option value="alvo_managed">Marca Getro</option>
              <option value="co_branded">Co-branded</option>
              <option value="white_label">White-label</option>
            </select>
          </label>
          <label>
            Plano
            <select name="planTier" defaultValue="growth">
              <option value="base">Base</option>
              <option value="growth">Growth</option>
              <option value="advanced">Advanced</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <label>
            Ciclo
            <select name="billingCycle" defaultValue="monthly">
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          <label className="check-row">
            <input name="showPoweredByAlvo" type="checkbox" defaultChecked />
            Mostrar assinatura powered by Getro
          </label>
        </fieldset>

        <fieldset>
          <legend>Capacidade contratada</legend>
          <label>
            Faixa de membros
            <select name="memberRange" defaultValue="101_to_300">
              <option value="up_to_100">Ate 100</option>
              <option value="101_to_300">101 a 300</option>
              <option value="301_to_800">301 a 800</option>
              <option value="801_plus">801+</option>
            </select>
          </label>
          <label>
            Usuarios internos
            <input name="seatLimit" type="number" defaultValue="8" min="1" />
          </label>
          <label>
            Campi
            <input name="campusLimit" type="number" defaultValue="1" min="1" />
          </label>
          <label>
            Cota mensal de IA
            <input name="aiQuota" type="number" defaultValue="100" min="0" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Modulos liberados</legend>
          {[
            ["visitors", "Visitantes e portaria"],
            ["groups", "Celulas e grupos"],
            ["events", "Eventos e check-in"],
            ["journeys", "Jornadas"],
            ["communication", "Comunicacao"],
            ["finance", "Transparencia financeira"],
            ["tribes", "Tribos ministeriais"],
            ["ai", "IA pastoral"],
            ["children", "Criancas"],
            ["youth", "Jovens"],
            ["volunteers", "Voluntarios"]
          ].map(([name, label]) => (
            <label className="check-row" key={name}>
              <input
                name={name}
                type="checkbox"
                defaultChecked={!["children", "youth", "volunteers"].includes(name)}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="form-actions">
          <button className="primary-button" type="submit">
            Criar instituicao
          </button>
          {status ? <p className="form-status">{status}</p> : null}
        </div>
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

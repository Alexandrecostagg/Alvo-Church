"use client";

import { useState, useCallback } from "react";
import {
  Copy, Check, QrCode, ExternalLink,
  Bot, CalendarRange, GraduationCap, Handshake,
  HeartHandshake, Landmark, Map as MapIcon, MessageSquareText,
  ShieldCheck, Store, Tent, Users, Waypoints, CheckCircle, XCircle,
  Save, Loader2, Info, Building2, Layers,
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { useOrgFeatures, type GroupsModelType, type OrgTier } from "../../../contexts/OrgFeaturesContext";
import { saveOrganizationFeaturesSettings, saveOrganizationBrandingSettings, isFirebaseWebRuntimeConfigured } from "@alvo/firebase";
import type { OrganizationFeaturesSettings } from "@alvo/types";
import type { ModuleKey } from "@alvo/domain";

const GROUPS_MODEL_OPTIONS: { value: GroupsModelType; label: string; desc: string }[] = [
  { value: "cell",       label: "Células",    desc: "Grupos geográficos semanais — modelo de célula clássico" },
  { value: "gc",         label: "G.C.",       desc: "Grupos de Crescimento — mesmo modelo, nome diferente" },
  { value: "leadership", label: "Lideranças", desc: "Liderança de Casais, Jovens, Famílias — grupos temáticos" },
  { value: "generic",    label: "Grupos",     desc: "Nomenclatura genérica sem vínculo a modelo específico" },
];

const ORG_TIER_OPTIONS: { value: OrgTier; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "solo",         label: "Igreja Solo",   desc: "Igreja independente — simples, sem hierarquia",                icon: Building2 },
  { value: "campus",       label: "Multi-campus",  desc: "Uma sede com múltiplos campi sob a mesma liderança",           icon: Layers },
  { value: "network",      label: "Rede",          desc: "Instituição com igrejas afiliadas — visão consolidada",        icon: Layers },
  { value: "denomination", label: "Denominação",   desc: "Estrutura formal com hierarquia nacional e múltiplos níveis",  icon: Layers },
];

/* ── QR helper ──────────────────────────────────────────────────────────── */
function QRCodeDisplay({ size = 180 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: "#f8fafc", borderRadius: 12, border: "1px dashed rgba(29,41,64,0.2)" }}>
      <QrCode size={40} strokeWidth={1.4} style={{ color: "var(--alvo-accent-dark)" }} />
      <span style={{ fontSize: 11, color: "#64748b", textAlign: "center", lineHeight: 1.5, padding: "0 12px" }}>
        Copie o link abaixo e gere o QR Code em <strong>qr.io</strong> ou imprima diretamente
      </span>
    </div>
  );
}

/* ── Module definitions ──────────────────────────────────────────────────── */
type ModuleDef = {
  key: ModuleKey;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
};

const MODULE_DEFS: ModuleDef[] = [
  { key: "visitors",      label: "Recepção & Visitantes",  desc: "Formulários de visita, painel do pastor, triagem de novos contatos", icon: Users,             color: "#3b82f6" },
  { key: "groups",        label: "Células",                desc: "Grupos de discipulado, reuniões, chamadas e relatórios de célula",   icon: Waypoints,         color: "#10b981" },
  { key: "tribes",        label: "Tribos Ministeriais",    desc: "Classificação vocacional por IA, perfil ministerial e indicação",    icon: Tent,              color: "#f97316" },
  { key: "journeys",      label: "Jornadas & EAD",         desc: "Trilha de integração de novos membros e escola de discipulado EAD",  icon: MapIcon,           color: "#8b5cf6" },
  { key: "events",        label: "Eventos",                desc: "Agenda estratégica, inscrições, check-in e relatórios de presença",  icon: CalendarRange,     color: "#06b6d4" },
  { key: "volunteers",    label: "Escalas & Louvor",       desc: "Escalas de serviço, gestão de equipes e cifras para músicos",        icon: Handshake,         color: "#ec4899" },
  { key: "communication", label: "Comunicação",            desc: "Envio de mensagens, push, WhatsApp e segmentação por grupo",        icon: MessageSquareText, color: "#64748b" },
  { key: "giving",        label: "Doações & Dízimos",      desc: "Recebimento de dízimos e ofertas via PIX, cartão e boleto",         icon: HeartHandshake,    color: "#16a34a" },
  { key: "finance",       label: "Finanças",               desc: "Relatórios financeiros, receitas, despesas e fluxo de caixa",       icon: Landmark,          color: "#d97706" },
  { key: "ai",            label: "Cuidado Pastoral",            desc: "Análise preditiva de risco de desengajamento e insights por membro", icon: Bot,               color: "#7c3aed" },
  { key: "marketplace",   label: "Marketplace",            desc: "Comunidade de trocas e serviços entre membros da igreja",           icon: Store,             color: "#0ea5e9" },
  { key: "children",      label: "Segurança Kids",         desc: "Check-in de crianças, identificação e rastreio de retirada",       icon: ShieldCheck,       color: "#f43f5e" },
  { key: "publicForms",   label: "Formulários Públicos",   desc: "QR Codes para visitantes e links de cadastro sem login",           icon: GraduationCap,     color: "#84cc16" },
];

/* ── Toggle switch ───────────────────────────────────────────────────────── */
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: enabled ? "var(--alvo-accent)" : "var(--alvo-line)",
        position: "relative", flexShrink: 0, transition: "background 0.2s",
      }}
      aria-checked={enabled}
      role="switch"
    >
      <span style={{
        position: "absolute", top: 3, left: enabled ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "white",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

/* ── Main view ───────────────────────────────────────────────────────────── */
export function SettingsView() {
  const { organizationId, firebaseConfig, tenantRuntime } = useAppAuth();
  const { features, ready, orgTier, groupsModelType } = useOrgFeatures();
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pixKey, setPixKey] = useState(tenantRuntime?.settings?.branding?.pixKey ?? "");
  const [pixName, setPixName] = useState(tenantRuntime?.settings?.branding?.pixReceiverName ?? "");
  const [pixWhatsapp, setPixWhatsapp] = useState(tenantRuntime?.settings?.branding?.givingWhatsappNumber ?? "");
  const [pixSaving, setPixSaving] = useState(false);
  const [pixSaved, setPixSaved] = useState(false);
  // Groups config
  const [groupsModel, setGroupsModel] = useState<GroupsModelType>(
    (tenantRuntime?.settings?.branding?.groupsModelType as GroupsModelType | undefined) ?? "cell"
  );
  const [groupsCustomLabel, setGroupsCustomLabel] = useState(
    tenantRuntime?.settings?.branding?.groupsModuleLabel ?? ""
  );
  const [groupsSaving, setGroupsSaving] = useState(false);
  const [groupsSaved, setGroupsSaved] = useState(false);
  // Org tier
  const [selectedTier, setSelectedTier] = useState<OrgTier>(orgTier);
  const [tierSaving, setTierSaving] = useState(false);
  const [tierSaved, setTierSaved] = useState(false);

  // Local module state — initialized from Firestore or all-enabled fallback
  const [moduleState, setModuleState] = useState<Record<ModuleKey, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const def of MODULE_DEFS) {
      initial[def.key] = features?.modules?.[def.key]?.enabled ?? true;
    }
    return initial as Record<ModuleKey, boolean>;
  });

  const toggleModule = useCallback((key: ModuleKey, value: boolean) => {
    setModuleState(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  async function saveModules() {
    if (!isFirebaseWebRuntimeConfigured(firebaseConfig)) return;
    setSaving(true);
    try {
      const modules = {} as OrganizationFeaturesSettings["modules"];
      for (const def of MODULE_DEFS) {
        (modules as Record<string, unknown>)[def.key] = { enabled: moduleState[def.key] };
      }
      // core is always enabled
      (modules as Record<string, unknown>).core = { enabled: true };

      const updated: OrganizationFeaturesSettings = {
        organizationId: organizationId ?? "",
        modules,
      };
      await saveOrganizationFeaturesSettings(firebaseConfig, updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save features:", e);
    } finally {
      setSaving(false);
    }
  }

  async function savePixConfig() {
    if (!isFirebaseWebRuntimeConfigured(firebaseConfig) || !tenantRuntime?.settings?.branding) return;
    setPixSaving(true);
    try {
      const updated = {
        ...tenantRuntime.settings.branding,
        pixKey: pixKey.trim(),
        pixReceiverName: pixName.trim(),
        givingWhatsappNumber: pixWhatsapp.replace(/\D/g, ""),
      };
      await saveOrganizationBrandingSettings(firebaseConfig, updated);
      setPixSaved(true);
      setTimeout(() => setPixSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save PIX config:", e);
    } finally {
      setPixSaving(false);
    }
  }

  async function saveGroupsConfig() {
    if (!isFirebaseWebRuntimeConfigured(firebaseConfig) || !tenantRuntime?.settings?.branding) return;
    setGroupsSaving(true);
    try {
      await saveOrganizationBrandingSettings(firebaseConfig, {
        ...tenantRuntime.settings.branding,
        groupsModelType: groupsModel,
        groupsModuleLabel: groupsCustomLabel.trim() || undefined,
      });
      setGroupsSaved(true);
      setTimeout(() => setGroupsSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save groups config:", e);
    } finally {
      setGroupsSaving(false);
    }
  }

  async function saveTierConfig() {
    if (!isFirebaseWebRuntimeConfigured(firebaseConfig) || !tenantRuntime?.organization) return;
    setTierSaving(true);
    try {
      const { saveOrganizationProfile } = await import("@alvo/firebase");
      await saveOrganizationProfile(firebaseConfig, {
        ...tenantRuntime.organization,
        organizationTier: selectedTier,
      });
      setTierSaved(true);
      setTimeout(() => setTierSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save tier:", e);
    } finally {
      setTierSaving(false);
    }
  }

  const orgSlug = organizationId;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const publicLinks = [
    { key: "visit",  label: "Formulário de Visitante", desc: "Exiba este QR Code na entrada do culto", path: `/p/${orgSlug}/visit`, highlight: true },
    { key: "give",   label: "Link de Doação",          desc: "Compartilhe para receber dízimos e ofertas", path: `/p/${orgSlug}/give`, highlight: false },
    { key: "portal", label: "Portal Público",          desc: "Página pública da organização", path: `/p/${orgSlug}`, highlight: false },
  ];

  async function copyLink(url: string, key: string) {
    await navigator.clipboard.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const enabledCount = Object.values(moduleState).filter(Boolean).length;

  return (
    <div className="page-root">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Gerencie módulos ativos, links públicos e personalizações da organização</p>
        </div>
      </header>

      {/* ── Módulos ──────────────────────────────────────────────────── */}
      <section className="content-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Módulos do Sistema</h2>
            <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)", margin: "2px 0 0" }}>
              {enabledCount} de {MODULE_DEFS.length} módulos ativos — controle o que aparece no menu de navegação
            </p>
          </div>
          <button
            onClick={saveModules}
            disabled={saving || !isFirebaseWebRuntimeConfigured(firebaseConfig)}
            className="btn-primary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 120, justifyContent: "center" }}
          >
            {saving ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Salvando…</>
            ) : saved ? (
              <><CheckCircle size={14} /> Salvo!</>
            ) : (
              <><Save size={14} /> Salvar</>
            )}
          </button>
        </div>

        {!isFirebaseWebRuntimeConfigured(firebaseConfig) && (
          <div className="settings-demo-banner">
            <Info size={14} style={{ color: "#d97706", flexShrink: 0 }} />
            <span>Modo demonstração — as alterações de módulos não serão salvas</span>
          </div>
        )}

        <div className="modules-grid">
          {MODULE_DEFS.map(def => {
            const Icon = def.icon;
            const enabled = moduleState[def.key];
            return (
              <div
                key={def.key}
                className="module-card"
                style={{ borderColor: enabled ? `${def.color}30` : "var(--alvo-line)", opacity: enabled ? 1 : 0.65 }}
              >
                <div className="module-card-left">
                  <div className="module-icon" style={{ background: `${def.color}18`, color: def.color }}>
                    <Icon size={18} />
                  </div>
                  <div className="module-info">
                    <strong style={{ fontSize: 13, color: "var(--alvo-ink)", display: "flex", alignItems: "center", gap: 6 }}>
                      {def.label}
                      {enabled
                        ? <CheckCircle size={12} style={{ color: "#16a34a" }} />
                        : <XCircle size={12} style={{ color: "#dc2626" }} />}
                    </strong>
                    <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)", lineHeight: 1.4 }}>{def.desc}</span>
                  </div>
                </div>
                <Toggle enabled={enabled} onChange={v => toggleModule(def.key, v)} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Modelo de Grupos ─────────────────────────────────────────── */}
      <section className="content-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Modelo de Grupos</h2>
            <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)", margin: "2px 0 0" }}>
              Define como o módulo de grupos aparece no menu e nas telas da sua instituição
            </p>
          </div>
          <button
            onClick={saveGroupsConfig}
            disabled={groupsSaving || !isFirebaseWebRuntimeConfigured(firebaseConfig) || !tenantRuntime?.settings?.branding}
            className="btn-primary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 120, justifyContent: "center" }}
          >
            {groupsSaving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Salvando…</> :
             groupsSaved  ? <><CheckCircle size={14} /> Salvo!</> :
                            <><Save size={14} /> Salvar</>}
          </button>
        </div>

        <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {GROUPS_MODEL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setGroupsModel(opt.value); setGroupsCustomLabel(""); setGroupsSaved(false); }}
                style={{
                  textAlign: "left", padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  border: `1.5px solid ${groupsModel === opt.value ? "var(--alvo-accent)" : "var(--alvo-line)"}`,
                  background: groupsModel === opt.value ? "var(--alvo-accent-soft)" : "var(--alvo-surface)",
                  transition: "all 0.15s",
                }}
              >
                <strong style={{ display: "block", fontSize: 14, color: groupsModel === opt.value ? "var(--alvo-accent-dark)" : "var(--alvo-ink)", marginBottom: 4 }}>
                  {opt.label}
                </strong>
                <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)", lineHeight: 1.4 }}>{opt.desc}</span>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--alvo-ink)" }}>
              Nome personalizado
              <span style={{ fontWeight: 400, color: "var(--alvo-ink-soft)", fontSize: 12, marginLeft: 6 }}>
                (opcional — sobrescreve o nome do modelo acima)
              </span>
            </label>
            <input
              type="text"
              placeholder={`Ex: "${GROUPS_MODEL_OPTIONS.find(o => o.value === groupsModel)?.label ?? "Células"}"`}
              value={groupsCustomLabel}
              onChange={e => { setGroupsCustomLabel(e.target.value); setGroupsSaved(false); }}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--alvo-line)", fontSize: 14, outline: "none", background: "var(--alvo-surface)", color: "var(--alvo-ink)" }}
            />
          </div>
        </div>
      </section>

      {/* ── Tipo de Organização ───────────────────────────────────────── */}
      <section className="content-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Tipo de Organização</h2>
            <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)", margin: "2px 0 0" }}>
              Define a estrutura institucional e desbloqueia funcionalidades específicas por porte
            </p>
          </div>
          <button
            onClick={saveTierConfig}
            disabled={tierSaving || !isFirebaseWebRuntimeConfigured(firebaseConfig) || !tenantRuntime?.organization}
            className="btn-primary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 120, justifyContent: "center" }}
          >
            {tierSaving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Salvando…</> :
             tierSaved   ? <><CheckCircle size={14} /> Salvo!</> :
                           <><Save size={14} /> Salvar</>}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 640 }}>
          {ORG_TIER_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isSelected = selectedTier === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { setSelectedTier(opt.value); setTierSaved(false); }}
                style={{
                  textAlign: "left", padding: "16px", borderRadius: 12, cursor: "pointer",
                  border: `1.5px solid ${isSelected ? "var(--alvo-accent)" : "var(--alvo-line)"}`,
                  background: isSelected ? "var(--alvo-accent-soft)" : "var(--alvo-surface)",
                  display: "flex", flexDirection: "column", gap: 8, transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon size={16} style={{ color: isSelected ? "var(--alvo-accent)" : "var(--alvo-ink-soft)" }} />
                  <strong style={{ fontSize: 13, color: isSelected ? "var(--alvo-accent-dark)" : "var(--alvo-ink)" }}>
                    {opt.label}
                  </strong>
                  {isSelected && <CheckCircle size={13} style={{ color: "var(--alvo-accent)", marginLeft: "auto" }} />}
                </div>
                <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)", lineHeight: 1.4 }}>{opt.desc}</span>
              </button>
            );
          })}
        </div>

        {(selectedTier === "network" || selectedTier === "denomination") && (
          <div className="settings-demo-banner" style={{ marginTop: 12 }}>
            <Info size={14} style={{ color: "#3b82f6", flexShrink: 0 }} />
            <span>
              <strong style={{ color: "var(--alvo-ink)" }}>Painel de Rede</strong> será habilitado no menu lateral —
              gerencie igrejas afiliadas e visualize métricas consolidadas
            </span>
          </div>
        )}
      </section>

      {/* ── PIX ──────────────────────────────────────────────────────── */}
      <section className="content-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Configuração PIX</h2>
            <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)", margin: "2px 0 0" }}>
              Chave usada para gerar QR Codes de doação na página pública
            </p>
          </div>
          <button
            onClick={savePixConfig}
            disabled={pixSaving || !isFirebaseWebRuntimeConfigured(firebaseConfig) || !tenantRuntime?.settings?.branding}
            className="btn-primary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 120, justifyContent: "center" }}
          >
            {pixSaving ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Salvando…</>
            ) : pixSaved ? (
              <><CheckCircle size={14} /> Salvo!</>
            ) : (
              <><Save size={14} /> Salvar</>
            )}
          </button>
        </div>
        <div style={{ display: "grid", gap: 12, maxWidth: 500 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--alvo-ink)" }}>
              Chave PIX
            </label>
            <input
              type="text"
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              value={pixKey}
              onChange={e => { setPixKey(e.target.value); setPixSaved(false); }}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--alvo-line)", fontSize: 14, outline: "none", background: "var(--alvo-surface)", color: "var(--alvo-ink)" }}
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--alvo-ink)" }}>
              Nome do beneficiário
              <span style={{ fontWeight: 400, color: "var(--alvo-ink-soft)", fontSize: 12, marginLeft: 6 }}>(aparece no app do banco)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Igreja Esdras Comunidade"
              value={pixName}
              onChange={e => { setPixName(e.target.value); setPixSaved(false); }}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--alvo-line)", fontSize: 14, outline: "none", background: "var(--alvo-surface)", color: "var(--alvo-ink)" }}
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--alvo-ink)" }}>
              WhatsApp da igreja
              <span style={{ fontWeight: 400, color: "var(--alvo-ink-soft)", fontSize: 12, marginLeft: 6 }}>(botão "Falar no WhatsApp" na página pública de doação)</span>
            </label>
            <input
              type="tel"
              placeholder="Ex: 5511999999999 (com DDI 55)"
              value={pixWhatsapp}
              onChange={e => { setPixWhatsapp(e.target.value); setPixSaved(false); }}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--alvo-line)", fontSize: 14, outline: "none", background: "var(--alvo-surface)", color: "var(--alvo-ink)" }}
            />
          </div>
        </div>
      </section>

      {/* ── Links Públicos ────────────────────────────────────────────── */}
      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Links Públicos &amp; QR Codes</h2>
        </div>
        <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
          {publicLinks.map(link => {
            const fullUrl = `${baseUrl}${link.path}`;
            return (
              <div key={link.key} style={{
                padding: "20px 24px", borderRadius: 14,
                background: link.highlight ? "#fffdf8" : "var(--alvo-surface)",
                border: link.highlight ? "1px solid rgba(154,52,18,0.2)" : "1px solid var(--alvo-line)",
                display: "grid", gap: 14,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--alvo-ink)", marginBottom: 2 }}>{link.label}</strong>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--alvo-ink-soft)" }}>{link.desc}</p>
                  </div>
                  <a href={link.path} target="_blank" rel="noreferrer" style={{ display: "flex", color: "var(--alvo-ink-soft)", padding: 4 }}>
                    <ExternalLink size={14} />
                  </a>
                </div>
                {link.highlight && <div style={{ display: "flex", justifyContent: "center" }}><QRCodeDisplay size={160} /></div>}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "var(--alvo-surface-muted)", border: "1px solid var(--alvo-line)", overflow: "hidden" }}>
                  <code style={{ flex: 1, fontSize: 12, color: "var(--alvo-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullUrl}</code>
                  <button
                    onClick={() => copyLink(fullUrl, link.key)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, border: "1px solid var(--alvo-line)", background: "var(--alvo-surface)", fontSize: 12, fontWeight: 500, cursor: "pointer", flexShrink: 0 }}
                  >
                    {copied === link.key ? <Check size={13} /> : <Copy size={13} />}
                    {copied === link.key ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <style jsx>{`
        .settings-demo-banner {
          display: flex; align-items: center; gap: 8px;
          background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 10px; padding: 10px 14px;
          font-size: 12px; color: var(--alvo-ink-soft); margin-bottom: 12px;
        }
        .modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 10px;
        }
        .module-card {
          display: flex; align-items: center; justify-content: space-between; gap: 14px;
          padding: 14px 16px; border-radius: 12px;
          background: var(--alvo-surface); border: 1.5px solid;
          transition: border-color 0.2s, opacity 0.2s;
        }
        .module-card-left {
          display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0;
        }
        .module-icon {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .module-info {
          display: flex; flex-direction: column; gap: 3px; min-width: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

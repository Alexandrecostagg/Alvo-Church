"use client";

import {
  Building2, Users, TrendingUp, MapPin, Plus,
  ChevronRight, CheckCircle, Clock, AlertCircle, Layers
} from "lucide-react";
import { useOrgFeatures } from "../../../contexts/OrgFeaturesContext";

const MOCK_AFFILIATES = [
  { id: "1", name: "Igreja Alvo Sede",        city: "São Paulo, SP",   members: 1240, status: "active",   last_sync: "hoje" },
  { id: "2", name: "Igreja Alvo Campinas",    city: "Campinas, SP",    members: 430,  status: "active",   last_sync: "hoje" },
  { id: "3", name: "Igreja Alvo Santos",      city: "Santos, SP",      members: 210,  status: "active",   last_sync: "ontem" },
  { id: "4", name: "Igreja Alvo Ribeirão",    city: "Ribeirão Preto, SP", members: 380, status: "active", last_sync: "hoje" },
  { id: "5", name: "Igreja Alvo Sorocaba",    city: "Sorocaba, SP",    members: 155,  status: "pending",  last_sync: "—" },
  { id: "6", name: "Igreja Alvo Bauru",       city: "Bauru, SP",       members: 98,   status: "pending",  last_sync: "—" },
];

const STATUS_CONFIG = {
  active:  { label: "Ativa",     color: "#16a34a", bg: "#dcfce7", icon: CheckCircle },
  pending: { label: "Pendente",  color: "#d97706", bg: "#fef3c7", icon: Clock },
  inactive:{ label: "Inativa",   color: "#dc2626", bg: "#fee2e2", icon: AlertCircle },
};

export default function NetworkPage() {
  const { orgTier } = useOrgFeatures();

  const totalMembers = MOCK_AFFILIATES.reduce((acc, a) => acc + a.members, 0);
  const activeCount  = MOCK_AFFILIATES.filter(a => a.status === "active").length;
  const pendingCount = MOCK_AFFILIATES.filter(a => a.status === "pending").length;

  const tierLabel = orgTier === "denomination" ? "Denominação" : "Rede de Igrejas";

  return (
    <div className="page-root">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{tierLabel}</h1>
          <p className="page-subtitle">
            Gerencie igrejas afiliadas, acompanhe métricas consolidadas e monitore o crescimento da rede
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} /> Adicionar Igreja
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
            <Building2 size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Igrejas na rede</span>
            <span className="stat-value">{MOCK_AFFILIATES.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <CheckCircle size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Ativas</span>
            <span className="stat-value">{activeCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <Clock size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Aguardando integração</span>
            <span className="stat-value">{pendingCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}>
            <Users size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Membros na rede</span>
            <span className="stat-value">{totalMembers.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      </div>

      {/* Affiliate list */}
      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Igrejas Afiliadas</h2>
          <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>
            Dados sincronizados via integração Alvo
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {MOCK_AFFILIATES.map(affiliate => {
            const status = STATUS_CONFIG[affiliate.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
            const StatusIcon = status.icon;
            return (
              <div
                key={affiliate.id}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 20px", borderRadius: 14,
                  background: "var(--alvo-surface)", border: "1px solid var(--alvo-border)",
                  cursor: "pointer", transition: "box-shadow 0.15s",
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Building2 size={20} style={{ color: "#64748b" }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 14, color: "var(--alvo-ink)", display: "block" }}>{affiliate.name}</strong>
                  <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)", display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={11} /> {affiliate.city}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 100 }}>
                  <Users size={13} style={{ color: "var(--alvo-ink-soft)" }} />
                  <span style={{ fontSize: 13, color: "var(--alvo-ink)", fontWeight: 700 }}>
                    {affiliate.members.toLocaleString("pt-BR")}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>membros</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: status.bg, minWidth: 90 }}>
                  <StatusIcon size={12} style={{ color: status.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: status.color }}>{status.label}</span>
                </div>

                <span style={{ fontSize: 11, color: "var(--alvo-ink-soft)", minWidth: 60, textAlign: "right" }}>
                  sync {affiliate.last_sync}
                </span>

                <ChevronRight size={16} style={{ color: "var(--alvo-border)", flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Growth chart placeholder */}
      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Crescimento da Rede</h2>
        </div>
        <div style={{ height: 160, background: "var(--alvo-surface-muted)", borderRadius: 14, border: "1px dashed var(--alvo-border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <TrendingUp size={28} style={{ color: "var(--alvo-border)" }} />
          <p style={{ margin: 0, fontSize: 13, color: "var(--alvo-ink-soft)" }}>
            Gráfico de crescimento consolidado — disponível após sincronização das igrejas
          </p>
        </div>
      </section>
    </div>
  );
}

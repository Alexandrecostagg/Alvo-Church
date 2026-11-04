"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Building2, Users, TrendingUp, MapPin, Plus,
  ChevronRight, CheckCircle, Clock, AlertCircle,
  Heart, CalendarRange, Waypoints, RefreshCw, Copy,
  Download, History,
} from "lucide-react";
import {
  fetchNetworkAffiliates,
  fetchLatestNetworkSnapshot,
  fetchNetworkSnapshotsHistory,
  isFirebaseWebRuntimeConfigured,
} from "@alvo/firebase";
import type { NetworkAffiliate, NetworkSnapshot } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { useOrgFeatures } from "../../../contexts/OrgFeaturesContext";
import { MetricCard, BarChart, Donut, Sparkline } from "../../../src/components/charts/NetworkCharts";


const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
function monthLabel(m: string) {
  const idx = parseInt(m.slice(5, 7), 10) - 1;
  return MONTH_LABELS[idx] ?? m;
}

const STATUS_CONFIG = {
  active:   { label: "Ativa",    color: "#16a34a", bg: "#dcfce7", icon: CheckCircle },
  pending:  { label: "Pendente", color: "#d97706", bg: "#fef3c7", icon: Clock },
  inactive: { label: "Inativa",  color: "#dc2626", bg: "#fee2e2", icon: AlertCircle },
};

function fmt(n: number) { return n.toLocaleString("pt-BR"); }
function fmtBRL(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }); }
function pctDelta(now: number, prev: number) {
  if (!prev) return null;
  const d = ((now - prev) / prev) * 100;
  return { text: `${Math.abs(d).toFixed(1)}%`, positive: d >= 0 };
}

/* ── Invite modal ────────────────────────────────────────────────────────── */
function InviteModal({ parentOrgId, onClose, onSave }: { parentOrgId: string; onClose: () => void; onSave: (a: NetworkAffiliate) => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAppAuth();
  const [inviteError, setInviteError] = useState("");
  const [created, setCreated] = useState<{ code: string; url: string } | null>(null);
  const requestId = useMemo(() => crypto.randomUUID(), []);

  async function handleCreate() {
    if (!name.trim()) return;
    if (!user) { setInviteError("Entre na conta para criar o convite."); return; }
    setSaving(true);
    try {
      setInviteError("");
      const response = await fetch("/api/network/invitations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          action: "create",
          organizationId: parentOrgId,
          requestId,
          childName: name.trim(),
          childCity: city.trim(),
          childState: state.trim(),
        }),
      });
      const data = await response.json() as { affiliate?: NetworkAffiliate; inviteCode?: string; error?: string };
      if (!response.ok || !data.affiliate || !data.inviteCode) throw new Error(data.error || "Não foi possível criar o convite.");
      onSave(data.affiliate);
      setCreated({ code: data.inviteCode, url: `${window.location.origin}/join/${data.inviteCode}` });
    } catch (error) { setInviteError(error instanceof Error ? error.message : "Não foi possível salvar o convite. Tente novamente."); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--alvo-surface)", borderRadius: 20, padding: "28px 24px", maxWidth: 420, width: "100%", display: "grid", gap: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {inviteError && <p role="alert">{inviteError}</p>}
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--alvo-ink)" }}>Convidar igreja</h2>
        {!created && [
          { label: "Nome da Igreja *", value: name, set: setName, placeholder: "Ex: Igreja Esdras Campinas" },
          { label: "Cidade",           value: city, set: setCity, placeholder: "Ex: Campinas" },
          { label: "Estado",           value: state, set: setState, placeholder: "Ex: SP" },
        ].map(f => (
          <div key={f.label} style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--alvo-ink)" }}>{f.label}</label>
            <input
              value={f.value} onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--alvo-line)", fontSize: 14, outline: "none", background: "var(--alvo-surface)", color: "var(--alvo-ink)" }}
            />
          </div>
        ))}
        {created && <div style={{ background: "var(--alvo-surface-muted)", border: "1px solid var(--alvo-line)", borderRadius: 10, padding: "16px", display: "grid", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--alvo-ink)", fontWeight: 700 }}>Convite criado por 30 dias</p>
          <code style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.1em", color: "var(--alvo-accent-dark)" }}>{created.code}</code>
          <button type="button" className="btn-outline" onClick={() => void navigator.clipboard.writeText(created.url)}>
            <Copy size={15} /> Copiar link seguro
          </button>
        </div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid var(--alvo-line)", background: "none", cursor: "pointer", fontSize: 14, color: "var(--alvo-ink)" }}>
            {created ? "Concluir" : "Cancelar"}
          </button>
          {!created && <button onClick={handleCreate} disabled={!name.trim() || saving} style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: "var(--alvo-accent-dark)", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            {saving ? "Salvando…" : "Criar convite"}
          </button>}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export function NetworkView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const { orgTier } = useOrgFeatures();

  const [affiliates, setAffiliates]   = useState<NetworkAffiliate[]>([]);
  const [snapshots, setSnapshots]     = useState<Record<string, NetworkSnapshot>>({});
  const [history, setHistory]         = useState<NetworkSnapshot[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showInvite, setShowInvite]   = useState(false);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const [rowError, setRowError]       = useState<string | null>(null);
  const [renewedInvites, setRenewedInvites] = useState<Record<string, { code: string; url: string }>>({});

  const isReal = configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig);

  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setAffiliates([]); setSnapshots({}); setHistory([]); setLoadError(null); setLoading(true);
    async function load() {
      if (!isReal || !organizationId) {
        setAffiliates([]);
        setSnapshots({});
        setHistory([]);
        setLoading(false);
        return;
      }
      try {
        const affs = await fetchNetworkAffiliates(firebaseConfig, organizationId);
        const usedAffs = affs.filter((affiliate) => affiliate.status !== "inactive");
        if (cancelled) return;
        setAffiliates(usedAffs);

        const snaps: Record<string, NetworkSnapshot> = {};
        const histByMonth: Record<string, NetworkSnapshot> = {};

        await Promise.all(
          usedAffs.filter(a => a.status === "active").map(async a => {
            const [latest, hist] = await Promise.all([
              fetchLatestNetworkSnapshot(firebaseConfig, a.childOrganizationId),
              fetchNetworkSnapshotsHistory(firebaseConfig, a.childOrganizationId, 6),
            ]);
            if (latest) snaps[a.childOrganizationId] = latest;
            // Aggregate history across all affiliates by month
            for (const h of hist) {
              if (!histByMonth[h.month]) {
                histByMonth[h.month] = { ...h, organizationId: "net", id: h.month };
              } else {
                const acc = histByMonth[h.month]!;
                acc.totalMembers         += h.totalMembers;
                acc.newMembersThisMonth  += h.newMembersThisMonth;
                acc.activeMembers        += h.activeMembers;
                acc.visitors             += h.visitors;
                acc.totalGroups          += h.totalGroups;
                acc.activeGroups         += h.activeGroups;
                acc.givingThisMonth      += h.givingThisMonth;
                acc.givingLastMonth      += h.givingLastMonth;
                acc.eventsThisMonth      += h.eventsThisMonth;
                acc.totalEventAttendance += h.totalEventAttendance;
              }
            }
          })
        );

        if (cancelled) return;
        setSnapshots(snaps);
        const sortedHistory = Object.values(histByMonth)
          .map((snapshot) => ({
            ...snapshot,
            serviceAttendanceRate: snapshot.totalMembers
              ? Math.round((snapshot.activeMembers / snapshot.totalMembers) * 100)
              : 0,
          }))
          .sort((a, b) => a.month.localeCompare(b.month));
        setHistory(sortedHistory);
      } catch (e) {
        if (cancelled) return;
        setLoadError("Dados da rede indisponíveis. Atualize a página para tentar novamente.");
        setAffiliates([]);
        setSnapshots({});
        setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [isReal, organizationId, firebaseConfig]);

  /* ── Totais consolidados ──────────────────────────────────────────── */
  const totals = useMemo(() => {
    const active = affiliates.filter(a => a.status === "active");
    return active.reduce((acc, a) => {
      const s = snapshots[a.childOrganizationId];
      if (!s) return acc;
      acc.members  += s.totalMembers;
      acc.visitors += s.visitors;
      acc.groups   += s.totalGroups;
      acc.giving   += s.givingThisMonth;
      acc.events   += s.eventsThisMonth;
      acc.newMembers += s.newMembersThisMonth;
      acc.givingLast += s.givingLastMonth;
      return acc;
    }, { members: 0, visitors: 0, groups: 0, giving: 0, events: 0, newMembers: 0, givingLast: 0 });
  }, [affiliates, snapshots]);

  const activeAffiliates = affiliates.filter(a => a.status === "active");
  const pendingAffiliates = affiliates.filter(a => a.status === "pending");
  const consolidatedAffiliates = activeAffiliates.filter(a => snapshots[a.childOrganizationId]);
  const latestSnapshotDate = Object.values(snapshots)
    .map((snapshot) => snapshot.date)
    .sort()
    .at(-1);
  const givingDelta = pctDelta(totals.giving, totals.givingLast);

  /* ── Bar chart data ───────────────────────────────────────────────── */
  const memberBarData = activeAffiliates
    .map(a => ({ label: a.childName.replace("Igreja Esdras ", ""), value: snapshots[a.childOrganizationId]?.totalMembers ?? 0, color: "var(--alvo-accent)" }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const givingBarData = activeAffiliates
    .map(a => ({ label: a.childName.replace("Igreja Esdras ", ""), value: snapshots[a.childOrganizationId]?.givingThisMonth ?? 0, color: "#10b981" }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const tierLabel = orgTier === "denomination" ? "Denominação" : "Rede de Igrejas";
  const avgActiveMemberRate = activeAffiliates.length
    ? Math.round(activeAffiliates.reduce((a, af) => a + (snapshots[af.childOrganizationId]?.serviceAttendanceRate ?? 0), 0) / activeAffiliates.length)
    : 0;

  function exportCSV() {
    const headers = [
      "Igreja","Cidade","Estado","Status","Membros","Novos/mês","Membros ativos",
      "Visitantes","Grupos totais","Grupos ativos","Arrecadação (R$)","Arrecad. anterior (R$)",
      "Δ arrecadação (%)","Eventos/mês","Presenças em eventos/mês","Membros ativos (%)",
    ];
    const rows = affiliates.map(a => {
      const s = snapshots[a.childOrganizationId];
      const delta = s ? ((s.givingThisMonth - s.givingLastMonth) / (s.givingLastMonth || 1) * 100).toFixed(1) : "";
      return [
        a.childName, a.childCity ?? "", a.childState ?? "", a.status,
        s?.totalMembers ?? "", s?.newMembersThisMonth ?? "", s?.activeMembers ?? "",
        s?.visitors ?? "", s?.totalGroups ?? "", s?.activeGroups ?? "",
        s?.givingThisMonth ?? "", s?.givingLastMonth ?? "",
        delta, s?.eventsThisMonth ?? "", s?.totalEventAttendance ?? "",
        s?.serviceAttendanceRate ?? "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rede-igrejas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function manageAffiliate(action: "renew" | "deactivate", affiliate: NetworkAffiliate) {
    if (!user || !organizationId) return;
    if (action === "deactivate") {
      const label = affiliate.status === "pending" ? "revogar este convite" : "desvincular esta instituição";
      if (!window.confirm(`Confirma que deseja ${label}?`)) return;
    }
    const actionId = `${action}:${affiliate.id}`;
    setRowActionId(actionId);
    setRowError(null);
    try {
      const response = await fetch("/api/network/invitations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ action, organizationId, affiliateId: affiliate.id }),
      });
      const data = await response.json() as { inviteCode?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o vínculo.");
      if (action === "renew" && data.inviteCode) {
        setRenewedInvites((current) => ({
          ...current,
          [affiliate.id]: { code: data.inviteCode!, url: `${window.location.origin}/join/${data.inviteCode}` },
        }));
      } else if (action === "deactivate") {
        setAffiliates((current) => current.filter((item) => item.id !== affiliate.id));
        setSelectedId(null);
      }
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Não foi possível atualizar o vínculo.");
    } finally {
      setRowActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="page-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <RefreshCw size={24} style={{ color: "var(--alvo-ink-soft)", animation: "spin 1s linear infinite" }} />
        <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadError) return <main><p role="alert">{loadError}</p></main>;
  const selectedAffiliate = selectedId ? affiliates.find(a => a.id === selectedId) : null;
  const selectedSnap = selectedAffiliate ? snapshots[selectedAffiliate.childOrganizationId] : null;

  return (
    <div className="page-root">
      {showInvite && organizationId && (
        <InviteModal
          parentOrgId={organizationId}
          onClose={() => setShowInvite(false)}
          onSave={a => setAffiliates(prev => [a, ...prev.filter(item => item.id !== a.id)])}
        />
      )}

      {/* Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{tierLabel}</h1>
          <p className="page-subtitle">
            Visão consolidada de desempenho, crescimento e saúde pastoral da rede
          </p>
        </div>
        <div className="page-header-actions">
          <button onClick={exportCSV} className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={15} /> Exportar CSV
          </button>
          <button onClick={() => setShowInvite(true)} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} /> Convidar igreja
          </button>
        </div>
      </header>

      {/* Stats consolidados */}
      <div className="stats-row" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}><Building2 size={18} /></div>
          <div className="stat-body">
            <span className="stat-label">Igrejas na rede</span>
            <span className="stat-value">{affiliates.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}><Users size={18} /></div>
          <div className="stat-body">
            <span className="stat-label">Membros total</span>
            <span className="stat-value">{fmt(totals.members)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}><TrendingUp size={18} /></div>
          <div className="stat-body">
            <span className="stat-label">Novos este mês</span>
            <span className="stat-value">{fmt(totals.newMembers)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}><Heart size={18} /></div>
          <div className="stat-body">
            <span className="stat-label">Arrecadação</span>
            <span className="stat-value" style={{ fontSize: "1.1rem" }}>{fmtBRL(totals.giving)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fdf2f8", color: "#ec4899" }}><Waypoints size={18} /></div>
          <div className="stat-body">
            <span className="stat-label">Grupos ativos</span>
            <span className="stat-value">{fmt(totals.groups)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#ecfeff", color: "#06b6d4" }}><CalendarRange size={18} /></div>
          <div className="stat-body">
            <span className="stat-label">Visitantes</span>
            <span className="stat-value">{fmt(totals.visitors)}</span>
          </div>
        </div>
      </div>

      {activeAffiliates.length > 0 && (
        <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--alvo-line)", background: "var(--alvo-surface-muted)", color: "var(--alvo-ink-soft)", fontSize: 12 }}>
          Indicadores consolidados de <strong>{consolidatedAffiliates.length}/{activeAffiliates.length}</strong> instituições ativas
          {latestSnapshotDate ? ` · última consolidação: ${latestSnapshotDate.split("-").reverse().join("/")}` : " · aguardando a primeira execução diária"}.
          {consolidatedAffiliates.length < activeAffiliates.length && " Os totais ainda não incluem as instituições sem snapshot."}
        </div>
      )}

      {/* KPI cards com trend */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        <MetricCard
          label="Total de Membros"
          value={totals.members}
          delta={`+${totals.newMembers} este mês`}
          deltaPositive
          trend={activeAffiliates.map(a => snapshots[a.childOrganizationId]?.totalMembers ?? 0)}
          color="var(--alvo-accent)"
          icon={<Users size={20} />}
        />
        <MetricCard
          label="Arrecadação"
          value={fmtBRL(totals.giving)}
          delta={givingDelta?.text}
          deltaPositive={givingDelta?.positive}
          trend={activeAffiliates.map(a => snapshots[a.childOrganizationId]?.givingThisMonth ?? 0)}
          color="#10b981"
          icon={<Heart size={20} />}
        />
        <MetricCard
          label="Visitantes"
          value={totals.visitors}
          trend={activeAffiliates.map(a => snapshots[a.childOrganizationId]?.visitors ?? 0)}
          color="#f59e0b"
          icon={<Users size={20} />}
        />
        <div style={{ background: "var(--alvo-surface)", border: "1px solid var(--alvo-line)", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
          <Donut value={avgActiveMemberRate} color="var(--alvo-accent)" size={80} label={`${avgActiveMemberRate}%`} />
          <div>
            <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Membros ativos
            </span>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--alvo-ink-soft)", lineHeight: 1.4 }}>
              proporção média nas igrejas
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos por igreja */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title">Membros por Igreja</h2>
          </div>
          <BarChart data={memberBarData} height={140} />
        </section>
        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title">Arrecadação por Igreja</h2>
          </div>
          <BarChart
            data={givingBarData.map(d => ({ ...d, value: Math.round(d.value / 1000) }))}
            height={140}
          />
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--alvo-ink-soft)" }}>valores em R$ mil</p>
        </section>
      </div>

      {/* Evolução histórica */}
      {history.length >= 2 && (
        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <History size={16} style={{ color: "var(--alvo-accent)" }} /> Evolução Histórica
            </h2>
            <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>últimos {history.length} meses</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {[
              { label: "Membros", key: "totalMembers" as const, color: "var(--alvo-accent)" },
              { label: "Arrecadação", key: "givingThisMonth" as const, color: "#10b981", isCurrency: true },
              { label: "Visitantes", key: "visitors" as const, color: "#f59e0b" },
              { label: "Grupos ativos", key: "activeGroups" as const, color: "#8b5cf6" },
            ].map(({ label, key, color, isCurrency }) => {
              const values = history.map(h => h[key] as number);
              const last = values[values.length - 1] ?? 0;
              const prev = values[values.length - 2] ?? 0;
              const delta = prev ? ((last - prev) / prev * 100) : 0;
              const positive = delta >= 0;
              return (
                <div key={label} style={{ background: "var(--alvo-surface)", border: "1px solid var(--alvo-line)", borderRadius: 14, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--alvo-ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                      <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "var(--alvo-ink)" }}>
                        {isCurrency ? fmtBRL(last) : fmt(last)}
                      </p>
                    </div>
                    {delta !== 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: positive ? "#dcfce7" : "#fee2e2", color: positive ? "#16a34a" : "#dc2626" }}>
                        {positive ? "+" : ""}{delta.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <Sparkline data={values} color={color} height={48} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--alvo-ink-soft)" }}>{monthLabel(history[0]!.month)}</span>
                    <span style={{ fontSize: 10, color: "var(--alvo-ink-soft)" }}>{monthLabel(history[history.length - 1]!.month)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Lista de igrejas */}
      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Igrejas Afiliadas</h2>
          <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>
            {activeAffiliates.length} ativas · {pendingAffiliates.length} aguardando integração
          </span>
        </div>
        {rowError && <p role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{rowError}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {affiliates.map(affiliate => {
            const snap = snapshots[affiliate.childOrganizationId];
            const status = STATUS_CONFIG[affiliate.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = status.icon;
            const isSelected = selectedId === affiliate.id;

            return (
              <div key={affiliate.id} style={{ display: "flex", flexDirection: "column", border: "1px solid var(--alvo-line)", borderRadius: 14, overflow: "hidden" }}>
                <button
                  onClick={() => setSelectedId(isSelected ? null : affiliate.id)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: isSelected ? "var(--alvo-surface-muted)" : "var(--alvo-surface)", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Building2 size={18} style={{ color: "#64748b" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 14, color: "var(--alvo-ink)", display: "block" }}>{affiliate.childName}</strong>
                    {(affiliate.childCity || affiliate.childState) && (
                      <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)", display: "flex", alignItems: "center", gap: 3 }}>
                        <MapPin size={11} /> {[affiliate.childCity, affiliate.childState].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>

                  {snap ? (
                    <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 800, color: "var(--alvo-ink)" }}>{fmt(snap.totalMembers)}</div>
                        <div style={{ fontSize: 11, color: "var(--alvo-ink-soft)" }}>membros</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 800, color: "#16a34a" }}>{fmtBRL(snap.givingThisMonth)}</div>
                        <div style={{ fontSize: 11, color: "var(--alvo-ink-soft)" }}>arrecadação</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 800, color: "var(--alvo-ink)" }}>{snap.serviceAttendanceRate}%</div>
                        <div style={{ fontSize: 11, color: "var(--alvo-ink-soft)" }}>membros ativos</div>
                      </div>
                    </div>
                  ) : affiliate.status === "pending" ? (
                    <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>
                      Aguardando aceite
                    </span>
                  ) : affiliate.status === "active" ? (
                    <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>
                      Aguardando consolidação
                    </span>
                  ) : null}

                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: status.bg, flexShrink: 0 }}>
                    <StatusIcon size={12} style={{ color: status.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: status.color }}>{status.label}</span>
                  </div>

                  <ChevronRight size={15} style={{ color: "var(--alvo-line)", transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                </button>

                {/* Detalhe expandido */}
                {isSelected && snap && (
                  <div style={{ padding: "16px 20px", borderTop: "1px solid var(--alvo-line)", background: "var(--alvo-surface-muted)", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
                    {[
                      { label: "Novos membros",     value: `+${snap.newMembersThisMonth}`, color: "#16a34a" },
                      { label: "Visitantes",         value: fmt(snap.visitors),             color: "#f59e0b" },
                      { label: "Grupos ativos",      value: `${snap.activeGroups}/${snap.totalGroups}`, color: "#8b5cf6" },
                      { label: "Presença média",      value: `${snap.avgGroupAttendance} p/encontro`, color: "#06b6d4" },
                      { label: "Eventos/mês",        value: snap.eventsThisMonth,           color: "#ec4899" },
                      { label: "Presenças em eventos/mês", value: fmt(snap.totalEventAttendance), color: "#ec4899" },
                      { label: "Arrecad. anterior",  value: fmtBRL(snap.givingLastMonth),   color: "#64748b" },
                      { label: "Δ arrecadação",      value: (() => { const d = pctDelta(snap.givingThisMonth, snap.givingLastMonth); return d ? `${d.positive ? "+" : "-"}${d.text}` : "—"; })(), color: "#10b981" },
                    ].map(item => (
                      <div key={item.label} style={{ background: "var(--alvo-surface)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--alvo-line)" }}>
                        <span style={{ fontSize: 11, color: "var(--alvo-ink-soft)", display: "block", marginBottom: 2 }}>{item.label}</span>
                        <strong style={{ fontSize: 15, color: item.color }}>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {isSelected && affiliate.status === "active" && (
                  <div style={{ padding: "12px 20px", borderTop: "1px solid var(--alvo-line)", background: "var(--alvo-surface-muted)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>
                      {snap ? `Snapshot de ${snap.date.split("-").reverse().join("/")}` : "O cron diário ainda não consolidou esta instituição."}
                    </span>
                    <button
                      type="button"
                      className="btn-outline"
                      disabled={rowActionId === `deactivate:${affiliate.id}`}
                      onClick={() => void manageAffiliate("deactivate", affiliate)}
                      style={{ color: "#b91c1c" }}
                    >
                      {rowActionId === `deactivate:${affiliate.id}` ? "Desvinculando…" : "Desvincular instituição"}
                    </button>
                  </div>
                )}

                {isSelected && !snap && affiliate.status === "pending" && (
                  <div style={{ padding: "14px 20px", borderTop: "1px solid var(--alvo-line)", background: "var(--alvo-surface-muted)", display: "grid", gap: 12, fontSize: 13, color: "var(--alvo-ink-soft)" }}>
                    <span>Igreja aguardando integração. Por segurança, o código só é exibido quando o convite é criado ou reemitido.</span>
                    {renewedInvites[affiliate.id] && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <code style={{ fontSize: 17, fontWeight: 800, color: "var(--alvo-accent-dark)", letterSpacing: "0.08em" }}>{renewedInvites[affiliate.id]!.code}</code>
                        <button type="button" className="btn-outline" onClick={() => void navigator.clipboard.writeText(renewedInvites[affiliate.id]!.url)}>
                          <Copy size={14} /> Copiar novo link
                        </button>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-outline"
                        disabled={rowActionId === `renew:${affiliate.id}`}
                        onClick={() => void manageAffiliate("renew", affiliate)}
                      >
                        {rowActionId === `renew:${affiliate.id}` ? "Reemitindo…" : "Reemitir convite"}
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        disabled={rowActionId === `deactivate:${affiliate.id}`}
                        onClick={() => void manageAffiliate("deactivate", affiliate)}
                        style={{ color: "#b91c1c" }}
                      >
                        {rowActionId === `deactivate:${affiliate.id}` ? "Revogando…" : "Revogar convite"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

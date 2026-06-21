"use client";

import { useEffect, useState, useRef } from "react";
import {
  Printer, Download, Users, Heart, Waypoints,
  TrendingUp, CalendarRange, UserPlus, RefreshCw,
} from "lucide-react";
import {
  fetchPeople, fetchGroups, fetchEvents,
  isFirebaseWebRuntimeConfigured,
} from "@alvo/firebase";
import type { Person, Group, Event } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { Sparkline, BarChart } from "../../components/charts/NetworkCharts";

/* ── Tipos ─────────────────────────────────────────────────────────────────── */
interface KpiBlock { label: string; value: string | number; sub?: string; color: string; bg: string }

/* ── Mock data ─────────────────────────────────────────────────────────────── */
const MOCK_MEMBERS_TREND = [210, 228, 245, 260, 271, 285];
const MOCK_VISITORS_TREND = [18, 22, 19, 25, 30, 27];
const MOCK_GIVING_TREND   = [14200, 15800, 14900, 16500, 17200, 16800];
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function monthLabel(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return MONTHS[d.getMonth()];
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export function ReportsView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [people, setPeople]   = useState<Person[]>([]);
  const [groups, setGroups]   = useState<Group[]>([]);
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  const generatedAt = new Date().toLocaleString("pt-BR");

  const isReal = configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig);

  useEffect(() => {
    async function load() {
      if (!isReal || !organizationId) { setLoading(false); return; }
      try {
        const [p, g, e] = await Promise.all([
          fetchPeople(firebaseConfig, { organizationId }, 2000),
          fetchGroups(firebaseConfig, { organizationId }),
          fetchEvents(firebaseConfig, { organizationId }),
        ]);
        setPeople(p); setGroups(g); setEvents(e);
      } catch { /* use defaults */ } finally { setLoading(false); }
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReal, organizationId]);

  /* ── Métricas ────────────────────────────────────────────────────────── */
  const totalMembers   = people.filter(p => p.memberStatus !== "visitor").length || 285;
  const totalVisitors  = people.filter(p => p.memberStatus === "visitor").length  || 27;
  const activeGroups   = groups.filter(g => g.status === "active").length         || 18;
  const totalEvents    = events.length                                             || 9;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const newThisMonth = people.filter(p => (p as unknown as {createdAt?: string}).createdAt && (p as unknown as {createdAt?: string}).createdAt! >= monthStart).length || 12;

  const kpis: KpiBlock[] = [
    { label: "Membros", value: totalMembers, sub: `+${newThisMonth} este mês`, color: "#2563eb", bg: "#eff6ff" },
    { label: "Visitantes", value: totalVisitors, sub: "mês atual", color: "#d97706", bg: "#fef3c7" },
    { label: "Grupos ativos", value: activeGroups, sub: `de ${groups.length || 20} grupos`, color: "#7c3aed", bg: "#f5f3ff" },
    { label: "Eventos/mês", value: totalEvents, sub: "realizados", color: "#059669", bg: "#ecfdf5" },
    { label: "Novos membros", value: newThisMonth, sub: "mês atual", color: "#0891b2", bg: "#ecfeff" },
    { label: "Arrecadação", value: fmtBRL(16800), sub: "estimativa mês atual", color: "#16a34a", bg: "#f0fdf4" },
  ];

  /* ── Status breakdown ────────────────────────────────────────────────── */
  const statusCounts = (["member","leader","volunteer","visitor"] as const).map(s => ({
    label: s === "member" ? "Membro" : s === "leader" ? "Líder" : s === "volunteer" ? "Voluntário" : "Visitante",
    value: people.filter(p => p.memberStatus === s).length || [totalMembers - 40, 20, 20, totalVisitors][["member","leader","volunteer","visitor"].indexOf(s)],
    color: ["#2563eb","#7c3aed","#059669","#d97706"][["member","leader","volunteer","visitor"].indexOf(s)],
  }));

  /* ── Trend labels ─────────────────────────────────────────────────────── */
  const trendLabels = Array.from({ length: 6 }, (_, i) => monthLabel(5 - i));

  /* ── Bar chart por tribo ─────────────────────────────────────────────── */
  const tribeData = [
    { label: "Judá",   value: Math.round(totalMembers * 0.14), color: "#f97316" },
    { label: "Levi",   value: Math.round(totalMembers * 0.12), color: "#3b82f6" },
    { label: "José",   value: Math.round(totalMembers * 0.11), color: "#06b6d4" },
    { label: "Aser",   value: Math.round(totalMembers * 0.10), color: "#10b981" },
    { label: "Efraim", value: Math.round(totalMembers * 0.09), color: "#84cc16" },
    { label: "Outros", value: Math.round(totalMembers * 0.44), color: "#94a3b8" },
  ];

  function handlePrint() { window.print(); }

  function exportCSV() {
    const rows = [
      ["Indicador","Valor","Período"],
      ["Total de Membros", String(totalMembers), "Atual"],
      ["Visitantes", String(totalVisitors), "Mês atual"],
      ["Novos Membros", String(newThisMonth), "Mês atual"],
      ["Grupos Ativos", String(activeGroups), "Atual"],
      ["Eventos Realizados", String(totalEvents), "Mês atual"],
      ["Arrecadação Estimada", "R$ 16.800", "Mês atual"],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `relatorio-${now.toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="page-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <RefreshCw size={24} style={{ color: "var(--alvo-ink-soft)", animation: "spin 1s linear infinite" }} />
        <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="page-root" ref={printRef}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="page-header no-print">
        <div className="page-header-left">
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Visão gerencial consolidada · gerado em {generatedAt}</p>
        </div>
        <div className="page-header-actions">
          <button onClick={exportCSV} className="btn-outline" style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Download size={15} /> Exportar CSV
          </button>
          <button onClick={handlePrint} className="btn-primary" style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Printer size={15} /> Imprimir / PDF
          </button>
        </div>
      </header>

      {/* Print header (visible only when printing) */}
      <div className="print-only" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Relatório Gerencial</h1>
        <p style={{ color: "#64748b", margin: "4px 0 0" }}>Gerado em {generatedAt}</p>
      </div>

      {/* ── KPI Stats ──────────────────────────────────────────────────── */}
      <div className="stats-row" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {kpis.map(k => (
          <div key={k.label} className="stat-card">
            <div className="stat-icon" style={{ background: k.bg, color: k.color }}>
              {k.label === "Membros"       ? <Users size={18} />       :
               k.label === "Visitantes"    ? <UserPlus size={18} />    :
               k.label === "Grupos ativos" ? <Waypoints size={18} />   :
               k.label === "Eventos/mês"   ? <CalendarRange size={18} />:
               k.label === "Novos membros" ? <TrendingUp size={18} />  :
               <Heart size={18} />}
            </div>
            <div className="stat-body">
              <span className="stat-label">{k.label}</span>
              <span className="stat-value" style={{ fontSize: typeof k.value === "string" && k.value.length > 6 ? "1.1rem" : undefined }}>{k.value}</span>
              {k.sub && <span style={{ fontSize: 11, color: "var(--alvo-ink-soft)" }}>{k.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tendências ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {[
          { label: "Crescimento de Membros", data: MOCK_MEMBERS_TREND, color: "#2563eb" },
          { label: "Visitantes por Mês",     data: MOCK_VISITORS_TREND, color: "#d97706" },
          { label: "Arrecadação (R$ mil)",   data: MOCK_GIVING_TREND.map(v => Math.round(v / 1000)), color: "#16a34a" },
        ].map(({ label, data, color }) => {
          const last = data[data.length - 1]!;
          const prev = data[data.length - 2]!;
          const delta = prev ? ((last - prev) / prev * 100) : 0;
          const pos = delta >= 0;
          return (
            <section key={label} className="content-section" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--alvo-ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: pos ? "#dcfce7" : "#fee2e2", color: pos ? "#16a34a" : "#dc2626" }}>
                  {pos ? "+" : ""}{delta.toFixed(1)}%
                </span>
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "var(--alvo-ink)" }}>{last}</p>
              <Sparkline data={data} color={color} height={48} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "var(--alvo-ink-soft)" }}>{trendLabels[0]}</span>
                <span style={{ fontSize: 10, color: "var(--alvo-ink-soft)" }}>{trendLabels[5]}</span>
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Status de Membros + Tribos ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title">Composição de Membros</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {statusCounts.map(s => {
              const pct = totalMembers ? Math.round((s.value / (totalMembers + totalVisitors)) * 100) : 0;
              return (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 80, fontSize: 13, fontWeight: 600, color: "var(--alvo-ink)" }}>{s.label}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--alvo-surface-muted)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: s.color, borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 50, fontSize: 12, color: "var(--alvo-ink-soft)", textAlign: "right" }}>{s.value} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title">Membros por Tribo</h2>
          </div>
          <BarChart data={tribeData} height={120} />
        </section>
      </div>

      {/* ── Tabela resumo ──────────────────────────────────────────────── */}
      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Resumo Executivo</h2>
          <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>dados do mês atual</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--alvo-border)" }}>
              {["Indicador","Mês Atual","Mês Anterior","Variação"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--alvo-ink-soft)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { ind: "Total de Membros",   cur: totalMembers,   prev: totalMembers - newThisMonth, unit: "" },
              { ind: "Novos Membros",      cur: newThisMonth,   prev: 9,  unit: "" },
              { ind: "Visitantes",         cur: totalVisitors,  prev: 30, unit: "" },
              { ind: "Grupos Ativos",      cur: activeGroups,   prev: activeGroups - 1, unit: "" },
              { ind: "Eventos Realizados", cur: totalEvents,    prev: 7,  unit: "" },
              { ind: "Arrecadação",        cur: 16800,          prev: 15200, unit: "R$" },
            ].map((row, i) => {
              const delta = row.prev ? ((row.cur - row.prev) / row.prev * 100) : 0;
              const pos   = delta >= 0;
              const fmt   = (v: number) => row.unit === "R$" ? fmtBRL(v) : String(v);
              return (
                <tr key={row.ind} style={{ borderBottom: "1px solid var(--alvo-border)", background: i % 2 === 0 ? "transparent" : "var(--alvo-surface-muted)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--alvo-ink)" }}>{row.ind}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--alvo-ink)" }}>{fmt(row.cur)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--alvo-ink-soft)" }}>{fmt(row.prev)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: pos ? "#dcfce7" : "#fee2e2", color: pos ? "#16a34a" : "#dc2626" }}>
                      {pos ? "+" : ""}{delta.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .page-root { padding: 0 !important; }
          .content-section { break-inside: avoid; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}

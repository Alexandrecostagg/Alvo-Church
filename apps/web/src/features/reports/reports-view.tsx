"use client";

import { useEffect, useState, useRef } from "react";
import {
  Printer, Download, Users, Heart, Waypoints,
  TrendingUp, CalendarRange, UserPlus, RefreshCw,
} from "lucide-react";
import {
  fetchEvents, fetchFinancialTransactions,
  isFirebaseWebRuntimeConfigured,
} from "@alvo/firebase";
import { cachedFetchPeople, cachedFetchGroups } from "../../lib/org-data-cache";
import { getTribeDisplayLabel } from "@alvo/domain";
import type { Person, Group, Event, FinancialTransaction, TribeCode } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { Sparkline, BarChart } from "../../components/charts/NetworkCharts";

/* ── Tipos ─────────────────────────────────────────────────────────────────── */
interface KpiBlock { label: string; value: string | number; sub?: string; color: string; bg: string }

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const TRIBE_PALETTE = ["#f97316","#3b82f6","#06b6d4","#10b981","#84cc16","#a855f7","#ec4899","#eab308","#14b8a6","#ef4444","#6366f1","#0ea5e9"];

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

// Chave YYYY-MM de uma data.
function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

/* ── Component ─────────────────────────────────────────────────────────────── */
export function ReportsView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [people, setPeople]   = useState<Person[]>([]);
  const [groups, setGroups]   = useState<Group[]>([]);
  const [events, setEvents]   = useState<Event[]>([]);
  const [txns, setTxns]       = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  const generatedAt = new Date().toLocaleString("pt-BR");

  const isReal = configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig);

  useEffect(() => {
    async function load() {
      if (!isReal || !organizationId) { setLoading(false); return; }
      try {
        const [p, g, e, t] = await Promise.all([
          cachedFetchPeople(firebaseConfig, { organizationId }, 2000),
          cachedFetchGroups(firebaseConfig, { organizationId }),
          fetchEvents(firebaseConfig, { organizationId }),
          fetchFinancialTransactions(firebaseConfig, { organizationId }, 2000),
        ]);
        setPeople(p); setGroups(g); setEvents(e); setTxns(t);
      } catch { /* mantém vazio — mostra estado honesto */ } finally { setLoading(false); }
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReal, organizationId]);

  /* ── Métricas reais ──────────────────────────────────────────────────── */
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const monthStartISO = new Date(y, m, 1).toISOString();

  const totalMembers   = people.filter(p => p.memberStatus !== "visitor").length;
  const totalVisitors  = people.filter(p => p.memberStatus === "visitor").length;
  const activeGroups   = groups.filter(g => g.status === "active").length;
  const totalEvents    = events.length;
  // Data de entrada real (createdAt); cadastros antigos caem no consentimento LGPD.
  const joinedAt = (p: Person) => p.createdAt ?? p.consentLgpdAt;
  const newThisMonth   = people.filter(p => { const j = joinedAt(p); return j !== undefined && j >= monthStartISO; }).length;

  /* ── Arrecadação real (ledger financeiro) ────────────────────────────── */
  const incomeByMonth = new Map<string, number>();
  for (const t of txns) {
    if (t.kind !== "income") continue;
    const key = t.date.slice(0, 7); // YYYY-MM
    incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + t.amount);
  }
  const givingThisMonth = incomeByMonth.get(monthKey(now)) ?? 0;
  const givingPrevMonth = incomeByMonth.get(monthKey(new Date(y, m - 1, 1))) ?? 0;
  const hasFinance = txns.length > 0;

  // Série real dos últimos 6 meses.
  const givingSeries = Array.from({ length: 6 }, (_, i) => incomeByMonth.get(monthKey(new Date(y, m - 5 + i, 1))) ?? 0);
  const givingLabels = Array.from({ length: 6 }, (_, i) => MONTHS[new Date(y, m - 5 + i, 1).getMonth()]);
  const givingDelta = givingPrevMonth ? ((givingThisMonth - givingPrevMonth) / givingPrevMonth * 100) : 0;

  const kpis: KpiBlock[] = [
    { label: "Membros", value: totalMembers, sub: newThisMonth ? `+${newThisMonth} este mês` : "total atual", color: "#2563eb", bg: "#eff6ff" },
    { label: "Visitantes", value: totalVisitors, sub: "cadastrados", color: "#d97706", bg: "#fef3c7" },
    { label: "Grupos ativos", value: activeGroups, sub: `de ${groups.length} grupos`, color: "#7c3aed", bg: "#f5f3ff" },
    { label: "Eventos", value: totalEvents, sub: "cadastrados", color: "#059669", bg: "#ecfdf5" },
    { label: "Novos membros", value: newThisMonth, sub: "este mês", color: "#0891b2", bg: "#ecfeff" },
    { label: "Arrecadação", value: hasFinance ? fmtBRL(givingThisMonth) : "—", sub: "mês atual", color: "#16a34a", bg: "#f0fdf4" },
  ];

  /* ── Composição de membros (real) ────────────────────────────────────── */
  const statusDefs = [
    { key: "member",    label: "Membro",     color: "#2563eb" },
    { key: "leader",    label: "Líder",      color: "#7c3aed" },
    { key: "volunteer", label: "Voluntário", color: "#059669" },
    { key: "visitor",   label: "Visitante",  color: "#d97706" },
  ] as const;
  const statusCounts = statusDefs.map(s => ({
    label: s.label,
    value: people.filter(p => p.memberStatus === s.key).length,
    color: s.color,
  }));
  const totalPeople = people.length;

  /* ── Membros por tribo (real) ────────────────────────────────────────── */
  const tribeCounts = new Map<TribeCode, number>();
  let semTribo = 0;
  for (const p of people) {
    if (p.memberStatus === "visitor") continue;
    if (p.tribePrimaryCode) tribeCounts.set(p.tribePrimaryCode, (tribeCounts.get(p.tribePrimaryCode) ?? 0) + 1);
    else semTribo++;
  }
  const tribeData = [...tribeCounts.entries()]
    .map(([code, value], i) => ({ label: getTribeDisplayLabel(code), value, color: TRIBE_PALETTE[i % TRIBE_PALETTE.length]! }))
    .sort((a, b) => b.value - a.value);
  if (semTribo) tribeData.push({ label: "Sem tribo", value: semTribo, color: "#94a3b8" });

  function handlePrint() { window.print(); }

  function exportCSV() {
    const rows: string[][] = [
      ["Indicador","Valor","Período"],
      ["Total de Membros", String(totalMembers), "Atual"],
      ["Visitantes", String(totalVisitors), "Atual"],
      ["Novos Membros (LGPD)", String(newThisMonth), "Mês atual"],
      ["Grupos Ativos", String(activeGroups), "Atual"],
      ["Eventos", String(totalEvents), "Atual"],
    ];
    if (hasFinance) rows.push(["Arrecadação", fmtBRL(givingThisMonth), "Mês atual"]);
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
               k.label === "Eventos"       ? <CalendarRange size={18} />:
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

      {/* ── Arrecadação — últimos 6 meses (real, do ledger) ─────────────── */}
      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Arrecadação — últimos 6 meses</h2>
          {hasFinance && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: givingDelta >= 0 ? "#dcfce7" : "#fee2e2", color: givingDelta >= 0 ? "#16a34a" : "#dc2626" }}>
              {givingDelta >= 0 ? "+" : ""}{givingDelta.toFixed(1)}% vs. mês anterior
            </span>
          )}
        </div>
        {hasFinance ? (
          <>
            <p style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 800, color: "var(--alvo-ink)" }}>{fmtBRL(givingThisMonth)}</p>
            <Sparkline data={givingSeries} color="#16a34a" height={56} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "var(--alvo-ink-soft)" }}>{givingLabels[0]}</span>
              <span style={{ fontSize: 10, color: "var(--alvo-ink-soft)" }}>{givingLabels[5]}</span>
            </div>
          </>
        ) : (
          <p style={{ color: "var(--alvo-ink-soft)", fontSize: 13, margin: 0 }}>
            Nenhum lançamento financeiro registrado ainda. Os valores aparecem aqui conforme entradas são lançadas em Finanças.
          </p>
        )}
      </section>

      {/* ── Status de Membros + Tribos ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title">Composição de Membros</h2>
          </div>
          {totalPeople === 0 ? (
            <p style={{ color: "var(--alvo-ink-soft)", fontSize: 13, margin: 0 }}>Nenhuma pessoa cadastrada ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {statusCounts.map(s => {
                const pct = totalPeople ? Math.round((s.value / totalPeople) * 100) : 0;
                return (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 80, fontSize: 13, fontWeight: 600, color: "var(--alvo-ink)" }}>{s.label}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--alvo-surface-muted)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: s.color, borderRadius: 4 }} />
                    </div>
                    <span style={{ width: 60, fontSize: 12, color: "var(--alvo-ink-soft)", textAlign: "right" }}>{s.value} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title">Membros por Tribo</h2>
          </div>
          {tribeData.length === 0 ? (
            <p style={{ color: "var(--alvo-ink-soft)", fontSize: 13, margin: 0 }}>Nenhum membro classificado em tribos ainda.</p>
          ) : (
            <BarChart data={tribeData} height={120} />
          )}
        </section>
      </div>

      {/* ── Tabela resumo ──────────────────────────────────────────────── */}
      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Resumo Executivo</h2>
          <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>estado atual</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--alvo-line)" }}>
              {["Indicador","Mês Atual","Mês Anterior","Variação"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--alvo-ink-soft)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { ind: "Total de Membros",   cur: String(totalMembers),  prev: null,  delta: null },
              { ind: "Novos Membros (mês)",cur: String(newThisMonth),  prev: null,  delta: null },
              { ind: "Visitantes",         cur: String(totalVisitors), prev: null,  delta: null },
              { ind: "Grupos Ativos",      cur: String(activeGroups),  prev: null,  delta: null },
              { ind: "Eventos",            cur: String(totalEvents),   prev: null,  delta: null },
              ...(hasFinance ? [{
                ind: "Arrecadação",
                cur: fmtBRL(givingThisMonth),
                prev: fmtBRL(givingPrevMonth),
                delta: givingDelta,
              }] : []),
            ].map((row, i) => {
              const pos = (row.delta ?? 0) >= 0;
              return (
                <tr key={row.ind} style={{ borderBottom: "1px solid var(--alvo-line)", background: i % 2 === 0 ? "transparent" : "var(--alvo-surface-muted)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--alvo-ink)" }}>{row.ind}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--alvo-ink)" }}>{row.cur}</td>
                  <td style={{ padding: "10px 12px", color: "var(--alvo-ink-soft)" }}>{row.prev ?? "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    {row.delta === null ? (
                      <span style={{ color: "var(--alvo-ink-soft)" }}>—</span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: pos ? "#dcfce7" : "#fee2e2", color: pos ? "#16a34a" : "#dc2626" }}>
                        {pos ? "+" : ""}{row.delta.toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: "var(--alvo-ink-soft)", margin: "10px 2px 0" }}>
          Comparativos mês a mês disponíveis para indicadores com histórico registrado (ex.: arrecadação). Demais indicadores refletem o estado atual.
        </p>
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

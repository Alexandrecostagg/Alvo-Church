"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Building2,
  Users,
  TrendingUp,
  MapPin,
  Plus,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Heart,
  CalendarRange,
  Waypoints,
  RefreshCw,
  Copy,
  Check,
  Download,
  History,
} from "lucide-react";
import {
  fetchNetworkAffiliates,
  fetchLatestNetworkSnapshot,
  fetchNetworkSnapshotsHistory,
  saveNetworkAffiliate,
  isFirebaseWebRuntimeConfigured,
} from "@alvo/firebase";
import type { NetworkAffiliate, NetworkSnapshot } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { useOrgFeatures } from "../../../contexts/OrgFeaturesContext";
import {
  MetricCard,
  BarChart,
  Donut,
  Sparkline,
} from "../../../src/components/charts/NetworkCharts";

/* ── Mock data (fallback offline) ────────────────────────────────────────── */
const MOCK_AFFILIATES: NetworkAffiliate[] = [
  {
    id: "1",
    parentOrganizationId: "demo",
    childOrganizationId: "child-1",
    childName: "Igreja Esdras Sede",
    childCity: "São Paulo",
    childState: "SP",
    status: "active",
    joinedAt: "2024-01-10",
  },
  {
    id: "2",
    parentOrganizationId: "demo",
    childOrganizationId: "child-2",
    childName: "Igreja Esdras Campinas",
    childCity: "Campinas",
    childState: "SP",
    status: "active",
    joinedAt: "2024-03-05",
  },
  {
    id: "3",
    parentOrganizationId: "demo",
    childOrganizationId: "child-3",
    childName: "Igreja Esdras Santos",
    childCity: "Santos",
    childState: "SP",
    status: "active",
    joinedAt: "2024-04-12",
  },
  {
    id: "4",
    parentOrganizationId: "demo",
    childOrganizationId: "child-4",
    childName: "Igreja Esdras Ribeirão",
    childCity: "Ribeirão Preto",
    childState: "SP",
    status: "active",
    joinedAt: "2024-06-01",
  },
  {
    id: "5",
    parentOrganizationId: "demo",
    childOrganizationId: "child-5",
    childName: "Igreja Esdras Sorocaba",
    childCity: "Sorocaba",
    childState: "SP",
    status: "pending",
  },
  {
    id: "6",
    parentOrganizationId: "demo",
    childOrganizationId: "child-6",
    childName: "Igreja Esdras Bauru",
    childCity: "Bauru",
    childState: "SP",
    status: "pending",
  },
];

const MOCK_SNAPSHOTS: Record<string, NetworkSnapshot> = {
  "child-1": {
    id: "t",
    organizationId: "child-1",
    date: "2026-06-21",
    month: "2026-06",
    totalMembers: 1240,
    newMembersThisMonth: 28,
    activeMembers: 890,
    visitors: 64,
    totalGroups: 48,
    activeGroups: 44,
    avgGroupAttendance: 11,
    eventsThisMonth: 4,
    totalEventAttendance: 620,
    givingThisMonth: 42800,
    givingLastMonth: 38500,
    serviceAttendanceRate: 72,
    createdAt: "",
  },
  "child-2": {
    id: "t",
    organizationId: "child-2",
    date: "2026-06-21",
    month: "2026-06",
    totalMembers: 430,
    newMembersThisMonth: 11,
    activeMembers: 310,
    visitors: 22,
    totalGroups: 18,
    activeGroups: 16,
    avgGroupAttendance: 9,
    eventsThisMonth: 2,
    totalEventAttendance: 215,
    givingThisMonth: 16200,
    givingLastMonth: 14800,
    serviceAttendanceRate: 72,
    createdAt: "",
  },
  "child-3": {
    id: "t",
    organizationId: "child-3",
    date: "2026-06-21",
    month: "2026-06",
    totalMembers: 210,
    newMembersThisMonth: 5,
    activeMembers: 155,
    visitors: 14,
    totalGroups: 9,
    activeGroups: 8,
    avgGroupAttendance: 8,
    eventsThisMonth: 1,
    totalEventAttendance: 98,
    givingThisMonth: 7600,
    givingLastMonth: 7200,
    serviceAttendanceRate: 74,
    createdAt: "",
  },
  "child-4": {
    id: "t",
    organizationId: "child-4",
    date: "2026-06-21",
    month: "2026-06",
    totalMembers: 380,
    newMembersThisMonth: 9,
    activeMembers: 280,
    visitors: 31,
    totalGroups: 14,
    activeGroups: 13,
    avgGroupAttendance: 10,
    eventsThisMonth: 2,
    totalEventAttendance: 190,
    givingThisMonth: 14100,
    givingLastMonth: 12900,
    serviceAttendanceRate: 74,
    createdAt: "",
  },
};

// Mock histórico 6 meses para demo
const MOCK_HISTORY: NetworkSnapshot[] = [
  {
    id: "h1",
    organizationId: "net",
    date: "2026-01-01",
    month: "2026-01",
    totalMembers: 2080,
    newMembersThisMonth: 38,
    activeMembers: 1490,
    visitors: 88,
    totalGroups: 84,
    activeGroups: 76,
    avgGroupAttendance: 10,
    eventsThisMonth: 7,
    totalEventAttendance: 980,
    givingThisMonth: 68500,
    givingLastMonth: 64000,
    serviceAttendanceRate: 72,
    createdAt: "",
  },
  {
    id: "h2",
    organizationId: "net",
    date: "2026-02-01",
    month: "2026-02",
    totalMembers: 2138,
    newMembersThisMonth: 42,
    activeMembers: 1540,
    visitors: 92,
    totalGroups: 85,
    activeGroups: 78,
    avgGroupAttendance: 10,
    eventsThisMonth: 6,
    totalEventAttendance: 920,
    givingThisMonth: 71200,
    givingLastMonth: 68500,
    serviceAttendanceRate: 72,
    createdAt: "",
  },
  {
    id: "h3",
    organizationId: "net",
    date: "2026-03-01",
    month: "2026-03",
    totalMembers: 2195,
    newMembersThisMonth: 44,
    activeMembers: 1580,
    visitors: 98,
    totalGroups: 87,
    activeGroups: 80,
    avgGroupAttendance: 11,
    eventsThisMonth: 8,
    totalEventAttendance: 1050,
    givingThisMonth: 74800,
    givingLastMonth: 71200,
    serviceAttendanceRate: 72,
    createdAt: "",
  },
  {
    id: "h4",
    organizationId: "net",
    date: "2026-04-01",
    month: "2026-04",
    totalMembers: 2250,
    newMembersThisMonth: 40,
    activeMembers: 1620,
    visitors: 95,
    totalGroups: 88,
    activeGroups: 81,
    avgGroupAttendance: 11,
    eventsThisMonth: 7,
    totalEventAttendance: 1020,
    givingThisMonth: 76200,
    givingLastMonth: 74800,
    serviceAttendanceRate: 72,
    createdAt: "",
  },
  {
    id: "h5",
    organizationId: "net",
    date: "2026-05-01",
    month: "2026-05",
    totalMembers: 2310,
    newMembersThisMonth: 47,
    activeMembers: 1665,
    visitors: 105,
    totalGroups: 89,
    activeGroups: 82,
    avgGroupAttendance: 11,
    eventsThisMonth: 9,
    totalEventAttendance: 1120,
    givingThisMonth: 79400,
    givingLastMonth: 76200,
    serviceAttendanceRate: 72,
    createdAt: "",
  },
  {
    id: "h6",
    organizationId: "net",
    date: "2026-06-01",
    month: "2026-06",
    totalMembers: 2360,
    newMembersThisMonth: 53,
    activeMembers: 1710,
    visitors: 131,
    totalGroups: 89,
    activeGroups: 81,
    avgGroupAttendance: 11,
    eventsThisMonth: 9,
    totalEventAttendance: 1123,
    givingThisMonth: 80700,
    givingLastMonth: 79400,
    serviceAttendanceRate: 72,
    createdAt: "",
  },
];

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
function monthLabel(m: string) {
  const idx = parseInt(m.slice(5, 7), 10) - 1;
  return MONTH_LABELS[idx] ?? m;
}

const STATUS_CONFIG = {
  active: {
    label: "Ativa",
    color: "#16a34a",
    bg: "#dcfce7",
    icon: CheckCircle,
  },
  pending: { label: "Pendente", color: "#d97706", bg: "#fef3c7", icon: Clock },
  inactive: {
    label: "Inativa",
    color: "#dc2626",
    bg: "#fee2e2",
    icon: AlertCircle,
  },
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}
function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}
function pctDelta(now: number, prev: number) {
  if (!prev) return null;
  const d = ((now - prev) / prev) * 100;
  return { text: `${Math.abs(d).toFixed(1)}%`, positive: d >= 0 };
}

/* ── Invite modal ────────────────────────────────────────────────────────── */
function InviteModal({
  parentOrgId,
  onClose,
  onSave,
}: {
  parentOrgId: string;
  onClose: () => void;
  onSave: (a: NetworkAffiliate) => void;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);
  const { firebaseConfig } = useAppAuth();

  const code = useMemo(
    () => Math.random().toString(36).slice(2, 8).toUpperCase(),
    [],
  );

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    const affiliate: NetworkAffiliate = {
      id: `aff-${Date.now()}`,
      parentOrganizationId: parentOrgId,
      childOrganizationId: "",
      childName: name.trim(),
      childCity: city.trim() || undefined,
      childState: state.trim() || undefined,
      status: "pending",
      inviteCode: code,
    };
    if (isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      await saveNetworkAffiliate(firebaseConfig, affiliate);
    }
    onSave(affiliate);
    setSaving(false);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--alvo-surface)",
          borderRadius: 20,
          padding: "28px 24px",
          maxWidth: 420,
          width: "100%",
          display: "grid",
          gap: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: "var(--alvo-ink)",
          }}
        >
          Adicionar Igreja
        </h2>
        {[
          {
            label: "Nome da Igreja *",
            value: name,
            set: setName,
            placeholder: "Ex: Igreja Esdras Campinas",
          },
          {
            label: "Cidade",
            value: city,
            set: setCity,
            placeholder: "Ex: Campinas",
          },
          {
            label: "Estado",
            value: state,
            set: setState,
            placeholder: "Ex: SP",
          },
        ].map((f) => (
          <div key={f.label} style={{ display: "grid", gap: 6 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--alvo-ink)",
              }}
            >
              {f.label}
            </label>
            <input
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.placeholder}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid var(--alvo-line)",
                fontSize: 14,
                outline: "none",
                background: "var(--alvo-surface)",
                color: "var(--alvo-ink)",
              }}
            />
          </div>
        ))}
        <div
          style={{
            background: "var(--alvo-surface-muted)",
            border: "1px solid var(--alvo-line)",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 12,
              color: "var(--alvo-ink-soft)",
              fontWeight: 600,
            }}
          >
            Código de convite (enviar ao pastor)
          </p>
          <code
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: "var(--alvo-accent-dark)",
            }}
          >
            {code}
          </code>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "1px solid var(--alvo-line)",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "var(--alvo-ink)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: 12,
              border: "none",
              background: "var(--alvo-accent-dark)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {saving ? "Salvando…" : "Criar convite"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export function NetworkView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } =
    useAppAuth();
  const { orgTier } = useOrgFeatures();

  const [affiliates, setAffiliates] = useState<NetworkAffiliate[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, NetworkSnapshot>>(
    {},
  );
  const [history, setHistory] = useState<NetworkSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isReal =
    configured &&
    firebaseReady &&
    user &&
    isFirebaseWebRuntimeConfigured(firebaseConfig);

  useEffect(() => {
    async function load() {
      if (!isReal || !organizationId) {
        setAffiliates(MOCK_AFFILIATES);
        setSnapshots(MOCK_SNAPSHOTS);
        setHistory(MOCK_HISTORY);
        setLoading(false);
        return;
      }
      try {
        const affs = await fetchNetworkAffiliates(
          firebaseConfig,
          organizationId,
        );
        const usedAffs = affs.length ? affs : MOCK_AFFILIATES;
        setAffiliates(usedAffs);

        const snaps: Record<string, NetworkSnapshot> = {};
        const histByMonth: Record<string, NetworkSnapshot> = {};

        await Promise.all(
          usedAffs
            .filter((a) => a.status === "active")
            .map(async (a) => {
              const [latest, hist] = await Promise.all([
                fetchLatestNetworkSnapshot(
                  firebaseConfig,
                  a.childOrganizationId,
                ),
                fetchNetworkSnapshotsHistory(
                  firebaseConfig,
                  a.childOrganizationId,
                  6,
                ),
              ]);
              if (latest) snaps[a.childOrganizationId] = latest;
              // Aggregate history across all affiliates by month
              for (const h of hist) {
                if (!histByMonth[h.month]) {
                  histByMonth[h.month] = {
                    ...h,
                    organizationId: "net",
                    id: h.month,
                  };
                } else {
                  const acc = histByMonth[h.month]!;
                  acc.totalMembers += h.totalMembers;
                  acc.newMembersThisMonth += h.newMembersThisMonth;
                  acc.activeMembers += h.activeMembers;
                  acc.visitors += h.visitors;
                  acc.totalGroups += h.totalGroups;
                  acc.givingThisMonth += h.givingThisMonth;
                  acc.totalEventAttendance += h.totalEventAttendance;
                }
              }
            }),
        );

        setSnapshots(Object.keys(snaps).length ? snaps : MOCK_SNAPSHOTS);
        const sortedHistory = Object.values(histByMonth).sort((a, b) =>
          a.month.localeCompare(b.month),
        );
        setHistory(sortedHistory.length >= 2 ? sortedHistory : MOCK_HISTORY);
      } catch (e) {
        setAffiliates(MOCK_AFFILIATES);
        setSnapshots(MOCK_SNAPSHOTS);
        setHistory(MOCK_HISTORY);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [isReal, organizationId]);

  /* ── Totais consolidados ──────────────────────────────────────────── */
  const totals = useMemo(() => {
    const active = affiliates.filter((a) => a.status === "active");
    return active.reduce(
      (acc, a) => {
        const s = snapshots[a.childOrganizationId];
        if (!s) return acc;
        acc.members += s.totalMembers;
        acc.visitors += s.visitors;
        acc.groups += s.totalGroups;
        acc.giving += s.givingThisMonth;
        acc.events += s.eventsThisMonth;
        acc.newMembers += s.newMembersThisMonth;
        acc.givingLast += s.givingLastMonth;
        return acc;
      },
      {
        members: 0,
        visitors: 0,
        groups: 0,
        giving: 0,
        events: 0,
        newMembers: 0,
        givingLast: 0,
      },
    );
  }, [affiliates, snapshots]);

  const activeAffiliates = affiliates.filter((a) => a.status === "active");
  const pendingAffiliates = affiliates.filter((a) => a.status === "pending");
  const givingDelta = pctDelta(totals.giving, totals.givingLast);

  /* ── Bar chart data ───────────────────────────────────────────────── */
  const memberBarData = activeAffiliates
    .map((a) => ({
      label: a.childName.replace("Igreja Esdras ", ""),
      value: snapshots[a.childOrganizationId]?.totalMembers ?? 0,
      color: "var(--alvo-accent)",
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const givingBarData = activeAffiliates
    .map((a) => ({
      label: a.childName.replace("Igreja Esdras ", ""),
      value: snapshots[a.childOrganizationId]?.givingThisMonth ?? 0,
      color: "#10b981",
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const tierLabel =
    orgTier === "denomination" ? "Denominação" : "Rede de Igrejas";
  const avgAttendance = activeAffiliates.length
    ? Math.round(
        activeAffiliates.reduce(
          (a, af) =>
            a + (snapshots[af.childOrganizationId]?.serviceAttendanceRate ?? 0),
          0,
        ) / activeAffiliates.length,
      )
    : 0;

  function exportCSV() {
    const headers = [
      "Igreja",
      "Cidade",
      "Estado",
      "Status",
      "Membros",
      "Novos/mês",
      "Membros ativos",
      "Visitantes",
      "Grupos totais",
      "Grupos ativos",
      "Arrecadação (R$)",
      "Arrecad. anterior (R$)",
      "Δ arrecadação (%)",
      "Eventos/mês",
      "Total presença eventos",
      "Engajamento (%)",
    ];
    const rows = affiliates.map((a) => {
      const s = snapshots[a.childOrganizationId];
      const delta = s
        ? (
            ((s.givingThisMonth - s.givingLastMonth) /
              (s.givingLastMonth || 1)) *
            100
          ).toFixed(1)
        : "";
      return [
        a.childName,
        a.childCity ?? "",
        a.childState ?? "",
        a.status,
        s?.totalMembers ?? "",
        s?.newMembersThisMonth ?? "",
        s?.activeMembers ?? "",
        s?.visitors ?? "",
        s?.totalGroups ?? "",
        s?.activeGroups ?? "",
        s?.givingThisMonth ?? "",
        s?.givingLastMonth ?? "",
        delta,
        s?.eventsThisMonth ?? "",
        s?.totalEventAttendance ?? "",
        s?.serviceAttendanceRate ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
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

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) {
    return (
      <div
        className="page-root"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
        }}
      >
        <RefreshCw
          size={24}
          style={{
            color: "var(--alvo-ink-soft)",
            animation: "spin 1s linear infinite",
          }}
        />
        <style jsx global>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const selectedAffiliate = selectedId
    ? affiliates.find((a) => a.id === selectedId)
    : null;
  const selectedSnap = selectedAffiliate
    ? snapshots[selectedAffiliate.childOrganizationId]
    : null;

  return (
    <div className="page-root">
      {showInvite && organizationId && (
        <InviteModal
          parentOrgId={organizationId}
          onClose={() => setShowInvite(false)}
          onSave={(a) => setAffiliates((prev) => [...prev, a])}
        />
      )}

      {/* Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{tierLabel}</h1>
          <p className="page-subtitle">
            Visão consolidada de desempenho, crescimento e saúde pastoral da
            rede
          </p>
        </div>
        <div className="page-header-actions">
          <button
            onClick={exportCSV}
            className="btn-outline"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Download size={15} /> Exportar CSV
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={15} /> Adicionar Igreja
          </button>
        </div>
      </header>

      {/* Stats consolidados */}
      <div
        className="stats-row"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
      >
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#eff6ff", color: "#3b82f6" }}
          >
            <Building2 size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Igrejas na rede</span>
            <span className="stat-value">{affiliates.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#ede9fe", color: "#7c3aed" }}
          >
            <Users size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Membros total</span>
            <span className="stat-value">{fmt(totals.members)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#fef3c7", color: "#d97706" }}
          >
            <TrendingUp size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Novos este mês</span>
            <span className="stat-value">{fmt(totals.newMembers)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#f0fdf4", color: "#16a34a" }}
          >
            <Heart size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Arrecadação</span>
            <span className="stat-value" style={{ fontSize: "1.1rem" }}>
              {fmtBRL(totals.giving)}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#fdf2f8", color: "#ec4899" }}
          >
            <Waypoints size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Grupos ativos</span>
            <span className="stat-value">{fmt(totals.groups)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "#ecfeff", color: "#06b6d4" }}
          >
            <CalendarRange size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-label">Visitantes</span>
            <span className="stat-value">{fmt(totals.visitors)}</span>
          </div>
        </div>
      </div>

      {/* KPI cards com trend */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <MetricCard
          label="Total de Membros"
          value={totals.members}
          delta={`+${totals.newMembers} este mês`}
          deltaPositive
          trend={activeAffiliates.map(
            (a) => snapshots[a.childOrganizationId]?.totalMembers ?? 0,
          )}
          color="var(--alvo-accent)"
          icon={<Users size={20} />}
        />
        <MetricCard
          label="Arrecadação"
          value={fmtBRL(totals.giving)}
          delta={givingDelta?.text}
          deltaPositive={givingDelta?.positive}
          trend={activeAffiliates.map(
            (a) => snapshots[a.childOrganizationId]?.givingThisMonth ?? 0,
          )}
          color="#10b981"
          icon={<Heart size={20} />}
        />
        <MetricCard
          label="Visitantes"
          value={totals.visitors}
          trend={activeAffiliates.map(
            (a) => snapshots[a.childOrganizationId]?.visitors ?? 0,
          )}
          color="#f59e0b"
          icon={<Users size={20} />}
        />
        <div
          style={{
            background: "var(--alvo-surface)",
            border: "1px solid var(--alvo-line)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Donut
            value={avgAttendance}
            color="var(--alvo-accent)"
            size={80}
            label={`${avgAttendance}%`}
          />
          <div>
            <span
              style={{
                fontSize: 12,
                color: "var(--alvo-ink-soft)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Engajamento médio
            </span>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "var(--alvo-ink-soft)",
                lineHeight: 1.4,
              }}
            >
              média das igrejas ativas
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
            data={givingBarData.map((d) => ({
              ...d,
              value: Math.round(d.value / 1000),
            }))}
            height={140}
          />
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 11,
              color: "var(--alvo-ink-soft)",
            }}
          >
            valores em R$ mil
          </p>
        </section>
      </div>

      {/* Evolução histórica */}
      {history.length >= 2 && (
        <section className="content-section">
          <div className="section-header">
            <h2
              className="section-title"
              style={{ display: "flex", alignItems: "center", gap: 7 }}
            >
              <History size={16} style={{ color: "var(--alvo-accent)" }} />{" "}
              Evolução Histórica
            </h2>
            <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)" }}>
              últimos {history.length} meses
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                label: "Membros",
                key: "totalMembers" as const,
                color: "var(--alvo-accent)",
              },
              {
                label: "Arrecadação",
                key: "givingThisMonth" as const,
                color: "#10b981",
                isCurrency: true,
              },
              {
                label: "Visitantes",
                key: "visitors" as const,
                color: "#f59e0b",
              },
              {
                label: "Grupos ativos",
                key: "activeGroups" as const,
                color: "#8b5cf6",
              },
            ].map(({ label, key, color, isCurrency }) => {
              const values = history.map((h) => h[key] as number);
              const last = values[values.length - 1] ?? 0;
              const prev = values[values.length - 2] ?? 0;
              const delta = prev ? ((last - prev) / prev) * 100 : 0;
              const positive = delta >= 0;
              return (
                <div
                  key={label}
                  style={{
                    background: "var(--alvo-surface)",
                    border: "1px solid var(--alvo-line)",
                    borderRadius: 14,
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--alvo-ink-soft)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {label}
                      </span>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 20,
                          fontWeight: 800,
                          color: "var(--alvo-ink)",
                        }}
                      >
                        {isCurrency ? fmtBRL(last) : fmt(last)}
                      </p>
                    </div>
                    {delta !== 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: positive ? "#dcfce7" : "#fee2e2",
                          color: positive ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {positive ? "+" : ""}
                        {delta.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <Sparkline data={values} color={color} height={48} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 4,
                    }}
                  >
                    <span
                      style={{ fontSize: 10, color: "var(--alvo-ink-soft)" }}
                    >
                      {monthLabel(history[0]!.month)}
                    </span>
                    <span
                      style={{ fontSize: 10, color: "var(--alvo-ink-soft)" }}
                    >
                      {monthLabel(history[history.length - 1]!.month)}
                    </span>
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
            {activeAffiliates.length} ativas · {pendingAffiliates.length}{" "}
            aguardando integração
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {affiliates.map((affiliate) => {
            const snap = snapshots[affiliate.childOrganizationId];
            const status =
              STATUS_CONFIG[affiliate.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = status.icon;
            const isSelected = selectedId === affiliate.id;

            return (
              <div
                key={affiliate.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid var(--alvo-line)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() =>
                    setSelectedId(isSelected ? null : affiliate.id)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 18px",
                    background: isSelected
                      ? "var(--alvo-surface-muted)"
                      : "var(--alvo-surface)",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 9,
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Building2 size={18} style={{ color: "#64748b" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong
                      style={{
                        fontSize: 14,
                        color: "var(--alvo-ink)",
                        display: "block",
                      }}
                    >
                      {affiliate.childName}
                    </strong>
                    {(affiliate.childCity || affiliate.childState) && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--alvo-ink-soft)",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <MapPin size={11} />{" "}
                        {[affiliate.childCity, affiliate.childState]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </div>

                  {snap ? (
                    <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{ fontWeight: 800, color: "var(--alvo-ink)" }}
                        >
                          {fmt(snap.totalMembers)}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--alvo-ink-soft)",
                          }}
                        >
                          membros
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 800, color: "#16a34a" }}>
                          {fmtBRL(snap.givingThisMonth)}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--alvo-ink-soft)",
                          }}
                        >
                          arrecadação
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{ fontWeight: 800, color: "var(--alvo-ink)" }}
                        >
                          {snap.serviceAttendanceRate}%
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--alvo-ink-soft)",
                          }}
                        >
                          engajamento
                        </div>
                      </div>
                    </div>
                  ) : affiliate.status === "pending" && affiliate.inviteCode ? (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <code
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--alvo-accent-dark)",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {affiliate.inviteCode}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void copyCode(affiliate.inviteCode!);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          color: "var(--alvo-ink-soft)",
                        }}
                      >
                        {copiedCode === affiliate.inviteCode ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 8,
                      background: status.bg,
                      flexShrink: 0,
                    }}
                  >
                    <StatusIcon size={12} style={{ color: status.color }} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <ChevronRight
                    size={15}
                    style={{
                      color: "var(--alvo-line)",
                      transform: isSelected ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s",
                      flexShrink: 0,
                    }}
                  />
                </button>

                {/* Detalhe expandido */}
                {isSelected && snap && (
                  <div
                    style={{
                      padding: "16px 20px",
                      borderTop: "1px solid var(--alvo-line)",
                      background: "var(--alvo-surface-muted)",
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(130px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {[
                      {
                        label: "Novos membros",
                        value: `+${snap.newMembersThisMonth}`,
                        color: "#16a34a",
                      },
                      {
                        label: "Visitantes",
                        value: fmt(snap.visitors),
                        color: "#f59e0b",
                      },
                      {
                        label: "Grupos ativos",
                        value: `${snap.activeGroups}/${snap.totalGroups}`,
                        color: "#8b5cf6",
                      },
                      {
                        label: "Participação média",
                        value: `${snap.avgGroupAttendance} p/grupo`,
                        color: "#06b6d4",
                      },
                      {
                        label: "Eventos/mês",
                        value: snap.eventsThisMonth,
                        color: "#ec4899",
                      },
                      {
                        label: "Total eventos",
                        value: fmt(snap.totalEventAttendance),
                        color: "#ec4899",
                      },
                      {
                        label: "Arrecad. anterior",
                        value: fmtBRL(snap.givingLastMonth),
                        color: "#64748b",
                      },
                      {
                        label: "Δ arrecadação",
                        value: (() => {
                          const d = pctDelta(
                            snap.givingThisMonth,
                            snap.givingLastMonth,
                          );
                          return d ? `${d.positive ? "+" : "-"}${d.text}` : "—";
                        })(),
                        color: "#10b981",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          background: "var(--alvo-surface)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          border: "1px solid var(--alvo-line)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--alvo-ink-soft)",
                            display: "block",
                            marginBottom: 2,
                          }}
                        >
                          {item.label}
                        </span>
                        <strong style={{ fontSize: 15, color: item.color }}>
                          {item.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                {isSelected && !snap && affiliate.status === "pending" && (
                  <div
                    style={{
                      padding: "14px 20px",
                      borderTop: "1px solid var(--alvo-line)",
                      background: "var(--alvo-surface-muted)",
                      fontSize: 13,
                      color: "var(--alvo-ink-soft)",
                    }}
                  >
                    Igreja aguardando integração. Compartilhe o código{" "}
                    <strong style={{ color: "var(--alvo-accent-dark)" }}>
                      {affiliate.inviteCode}
                    </strong>{" "}
                    com o administrador da igreja.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

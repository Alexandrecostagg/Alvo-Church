"use client";

import { useEffect, useMemo, useState } from "react";
import { friendlyError } from "../../lib/friendly-error";
import { AlertTriangle, Building2, Loader2, ShieldAlert, Sparkles, TrendingUp, Users } from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { fetchPlatformOverview, isPlatformAdmin } from "@alvo/firebase";
import type { PlatformOrgSummary } from "@alvo/firebase";
import type { PlanId } from "@alvo/firebase";

const PLAN_LABELS: Record<PlanId, string> = {
  free: "Gratuito",
  comunidade: "Comunidade",
  pastoral: "Pastoral",
  rede: "Rede",
  enterprise: "Enterprise"
};

// Preços mensais de referência (mesmos de /settings/plano). MRR aqui é uma
// ESTIMATIVA com base no plano corrente — não substitui o valor real de
// faturamento/gateway, que esta plataforma ainda não integra.
const PLAN_PRICE: Record<PlanId, number> = {
  free: 0,
  comunidade: 79,
  pastoral: 159,
  rede: 399,
  enterprise: 0
};

const PLAN_BADGE_COLOR: Record<PlanId, { bg: string; text: string }> = {
  free: { bg: "#F1EFE8", text: "#444441" },
  comunidade: { bg: "#EEEDFE", text: "#3C3489" },
  pastoral: { bg: "#FAEEDA", text: "#633806" },
  rede: { bg: "#E1F5EE", text: "#085041" },
  enterprise: { bg: "#FCEBEB", text: "#A32D2D" }
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export function PlatformAdminView() {
  const { user, firebaseConfig } = useAppAuth();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgs, setOrgs] = useState<PlatformOrgSummary[]>([]);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    isPlatformAdmin(firebaseConfig, user.uid)
      .then((ok) => setAuthorized(ok))
      .finally(() => setChecking(false));
  }, [user, firebaseConfig]);

  useEffect(() => {
    if (!authorized) return;
    setLoading(true);
    fetchPlatformOverview(firebaseConfig)
      .then(setOrgs)
      .catch((e) => setError(friendlyError(e, "Erro ao carregar visão da plataforma")))
      .finally(() => setLoading(false));
  }, [authorized, firebaseConfig]);

  const stats = useMemo(() => {
    const totalMembers = orgs.reduce((s, o) => s + o.memberCount, 0);
    const mrr = orgs.reduce((s, o) => s + (PLAN_PRICE[o.plan] ?? 0), 0);
    const aiUsedTotal = orgs.reduce((s, o) => s + o.aiUsed, 0);
    const aiLimitTotal = orgs.reduce((s, o) => s + o.aiLimit, 0);
    const byPlan = orgs.reduce((acc, o) => {
      acc[o.plan] = (acc[o.plan] ?? 0) + 1;
      return acc;
    }, {} as Partial<Record<PlanId, number>>);
    const inactive = orgs.filter((o) => (o.daysSinceActivity ?? 0) >= 30);
    return { totalMembers, mrr, aiUsedTotal, aiLimitTotal, byPlan, inactive };
  }, [orgs]);

  if (checking) {
    return (
      <div style={{ padding: "4rem", display: "flex", justifyContent: "center", color: "var(--color-text-secondary)" }}>
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{ padding: "4rem 1.5rem", textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
        <ShieldAlert size={40} style={{ color: "var(--color-text-secondary)", marginBottom: 12 }} />
        <p style={{ fontWeight: 600, fontSize: 16, margin: "0 0 6px" }}>Acesso restrito</p>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>
          Esta área é exclusiva da equipe da Plataforma Esdras.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#534AB7", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>
          Painel Esdras
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", color: "var(--color-text-primary)" }}>
          Visão da plataforma
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>
          Todas as organizações, planos e uso de IA em um só lugar.
        </p>
      </div>

      {error && (
        <div style={{ padding: 14, borderRadius: 10, background: "#FCEBEB", color: "#A32D2D", marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "3rem", display: "flex", justifyContent: "center", color: "var(--color-text-secondary)" }}>
          <Loader2 size={22} className="spin" />
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            <StatCard icon={<Building2 size={16} />} label="Organizações" value={String(orgs.length)} />
            <StatCard icon={<Users size={16} />} label="Membros na plataforma" value={stats.totalMembers.toLocaleString("pt-BR")} />
            <StatCard icon={<TrendingUp size={16} />} label="MRR estimado" value={formatBRL(stats.mrr)} sub="baseado no plano atual de cada igreja" />
            <StatCard icon={<Sparkles size={16} />} label="Uso de IA este mês" value={`${stats.aiUsedTotal} / ${stats.aiLimitTotal || "—"}`} />
          </div>

          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px", color: "var(--color-text-primary)" }}>Distribuição por plano</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(Object.keys(PLAN_LABELS) as PlanId[]).map((planId) => {
                const count = stats.byPlan[planId] ?? 0;
                if (count === 0) return null;
                const c = PLAN_BADGE_COLOR[planId];
                return (
                  <div key={planId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, background: c.bg }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{count}</span>
                    <span style={{ fontSize: 12, color: c.text }}>{PLAN_LABELS[planId]}</span>
                  </div>
                );
              })}
              {orgs.length === 0 && <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhuma organização ainda.</span>}
            </div>
          </div>

          {stats.inactive.length > 0 && (
            <div style={{ background: "#FCEBEB", border: "0.5px solid rgba(163,45,45,0.2)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <AlertTriangle size={15} color="#A32D2D" />
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#A32D2D" }}>
                  {stats.inactive.length} organizaç{stats.inactive.length === 1 ? "ão" : "ões"} sem sinal de atividade há 30+ dias
                </p>
              </div>
              <p style={{ fontSize: 12, color: "#A32D2D", margin: 0, opacity: 0.85 }}>
                {stats.inactive.map((o) => o.displayName).join(", ")}
              </p>
            </div>
          )}

          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", textAlign: "left" }}>
                  <th style={thStyle}>Organização</th>
                  <th style={thStyle}>Plano</th>
                  <th style={thStyle}>Membros</th>
                  <th style={thStyle}>IA (mês)</th>
                  <th style={thStyle}>Última atividade</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => {
                  const c = PLAN_BADGE_COLOR[org.plan];
                  const isStale = (org.daysSinceActivity ?? 0) >= 30;
                  return (
                    <tr key={org.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <td style={tdStyle}>
                        <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-primary)" }}>{org.displayName}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>{org.id}</p>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: c.bg, color: c.text }}>
                          {PLAN_LABELS[org.plan]}
                        </span>
                      </td>
                      <td style={tdStyle}>{org.memberCount}</td>
                      <td style={tdStyle}>{org.aiUsed} / {org.aiLimit || "—"}</td>
                      <td style={{ ...tdStyle, color: isStale ? "#A32D2D" : "var(--color-text-secondary)" }}>
                        {org.daysSinceActivity !== null ? `há ${org.daysSinceActivity} dias` : "sem registro"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 11, color: "var(--color-text-tertiary, #94a3b8)", marginTop: 12 }}>
            "Última atividade" usa o check-in de culto mais recente registrado; organizações sem check-ins mostram a data de início da assinatura. MRR é estimado pelo preço de tabela do plano atual — não reflete cobrança real, já que não há gateway de pagamento integrado ainda.
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)", fontSize: 12, marginBottom: 8 }}>
        {icon} {label}
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: "var(--color-text-tertiary, #94a3b8)", margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--color-text-secondary)" };
const tdStyle: React.CSSProperties = { padding: "10px 16px" };

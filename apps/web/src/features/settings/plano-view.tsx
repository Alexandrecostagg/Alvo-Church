"use client";

import { Check, Sparkles, Lock, Zap } from "lucide-react";
import { usePlan } from "../../../contexts/PlanContext";
import { useAppAuth } from "../../../app/providers";
import type { PlanId } from "@alvo/firebase";

const SALES_WHATSAPP = "5562993330336";

function upgradeWhatsappHref(planName: string, orgName: string) {
  const message = `Olá! Quero fazer upgrade da minha organização "${orgName}" para o plano ${planName} na Plataforma Esdras.`;
  return `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

const PLANS: Array<{
  id: PlanId;
  name: string;
  price: string;
  priceAnual: string;
  limit: string;
  highlight?: boolean;
  features: string[];
  locked: string[];
}> = [
  {
    id: "free",
    name: "Gratuito",
    price: "R$ 0",
    priceAnual: "",
    limit: "até 50 membros cadastrados",
    features: ["Cadastro de membros", "Agenda e eventos", "Comunicados", "App mobile membros"],
    locked: ["Tribos e vocações", "Finanças", "Células ilimitadas", "IA Pastoral"],
  },
  {
    id: "comunidade",
    name: "Comunidade",
    price: "R$ 79/mês",
    priceAnual: "R$ 67/mês no anual",
    limit: "até 300 membros",
    features: [
      "Tudo do Gratuito",
      "Tribos e vocações",
      "Finanças",
      "Células ilimitadas",
      "Recepção e visitantes",
      "50 consultas IA/mês (prévia)",
    ],
    locked: ["IA Pastoral completa", "Escalas", "Kids check-in", "Escola EAD"],
  },
  {
    id: "pastoral",
    name: "Pastoral",
    price: "R$ 159/mês",
    priceAnual: "R$ 134/mês no anual",
    limit: "membros ilimitados",
    highlight: true,
    features: [
      "Tudo do Comunidade",
      "IA Pastoral completa — 500 consultas/mês",
      "Escalas de servir",
      "Kids check-in",
      "Escola EAD",
      "Louvor e cifras",
      "Jornadas de discipulado",
      "Relatórios completos",
    ],
    locked: [],
  },
  {
    id: "rede",
    name: "Rede",
    price: "A partir de R$ 399/mês",
    priceAnual: "R$ 336/mês no anual",
    limit: "múltiplas igrejas · ilimitados",
    features: [
      "Tudo do Pastoral",
      "Multi-tenant (várias igrejas)",
      "Painel da denominação",
      "Relatórios consolidados",
      "IA em todas as igrejas",
      "Onboarding dedicado",
    ],
    locked: [],
  },
];

const REDE_FAIXAS = [
  { label: "até 10 igrejas", price: "R$ 399/mês", anual: "R$ 336/mês" },
  { label: "até 25 igrejas", price: "R$ 799/mês", anual: "R$ 679/mês" },
  { label: "até 50 igrejas", price: "R$ 1.290/mês", anual: "R$ 1.097/mês" },
  { label: "50+ igrejas", price: "Enterprise", anual: "sob consulta" },
];

export function PlanoView() {
  const { plan, aiQuota, ready } = usePlan();
  const { tenantRuntime, organizationId } = useAppAuth();
  const orgName = tenantRuntime?.organization?.displayName ?? tenantRuntime?.organization?.name ?? organizationId;

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px" }}>Plano e faturamento</h1>
      <p style={{ margin: "0 0 2rem", color: "var(--color-text-secondary)", fontSize: 14 }}>
        Gerencie seu plano e acompanhe o uso de IA.
      </p>

      {ready && (
        <div style={{
          display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
          padding: "1rem 1.25rem", borderRadius: 12,
          background: "var(--color-background-secondary)",
          marginBottom: "2rem", fontSize: 14,
        }}>
          <div>
            Plano atual: <strong style={{ fontWeight: 500 }}>
              {PLANS.find(p => p.id === plan)?.name ?? plan}
            </strong>
          </div>
          {aiQuota && aiQuota.limit > 0 && (
            <>
              <div style={{ width: 1, height: 16, background: "var(--color-border-tertiary)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={14} style={{ color: "#f59e0b" }} />
                IA: <strong style={{ fontWeight: 500 }}>{aiQuota.used}</strong>/{aiQuota.limit} consultas em {aiQuota.month}
                {!aiQuota.allowed && (
                  <span style={{ color: "var(--color-text-danger)", fontSize: 12 }}>— cota esgotada</span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: "2rem" }}>
        {PLANS.map((p) => (
          <div key={p.id} style={{
            background: "var(--color-background-primary)",
            border: p.id === plan
              ? "2px solid #7c3aed"
              : p.highlight
                ? "2px solid var(--color-border-info)"
                : "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12,
            padding: "1.25rem",
            position: "relative",
          }}>
            {p.id === plan && (
              <div style={{
                position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                background: "#7c3aed", color: "#fff",
                fontSize: 11, padding: "3px 12px", borderRadius: 6, whiteSpace: "nowrap", fontWeight: 500,
              }}>Plano atual</div>
            )}
            {p.highlight && p.id !== plan && (
              <div style={{
                position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                background: "var(--color-background-info)", color: "var(--color-text-info)",
                fontSize: 11, padding: "3px 12px", borderRadius: 6, whiteSpace: "nowrap", fontWeight: 500,
              }}>Mais popular</div>
            )}
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 6 }}>{p.name}</div>
            <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 2 }}>{p.price}</div>
            {p.priceAnual && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{p.priceAnual}</div>}
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 14 }}>{p.limit}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              {p.features.map((f) => (
                <div key={f} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  {f.includes("IA") || f.includes("consultas") ? (
                    <Sparkles size={13} style={{ color: "#f59e0b", marginTop: 2, flexShrink: 0 }} />
                  ) : (
                    <Check size={13} style={{ color: "var(--color-text-success)", marginTop: 2, flexShrink: 0 }} />
                  )}
                  {f}
                </div>
              ))}
              {p.locked.map((f) => (
                <div key={f} style={{ display: "flex", gap: 6, alignItems: "flex-start", color: "var(--color-text-tertiary)" }}>
                  <Lock size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
            {p.id !== plan && (
              <a
                href={upgradeWhatsappHref(p.name, orgName)}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: 16, width: "100%", padding: "8px 0",
                  background: p.highlight ? "#7c3aed" : "transparent",
                  color: p.highlight ? "#fff" : "var(--color-text-secondary)",
                  border: p.highlight ? "none" : "0.5px solid var(--color-border-secondary)",
                  borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
                  display: "block", textAlign: "center", textDecoration: "none",
                }}
              >
                {p.id === "rede" ? "Falar com vendas" : "Fazer upgrade"}
              </a>
            )}
          </div>
        ))}
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1.25rem" }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Zap size={15} />
          Faixas do plano Rede
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {REDE_FAIXAS.map((f) => (
            <div key={f.label} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "0.875rem", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: 17, fontWeight: 500 }}>{f.price}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{f.anual}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "1.5rem", background: "var(--color-background-secondary)", borderRadius: 10, padding: "1rem 1.25rem", fontSize: 13, color: "var(--color-text-secondary)" }}>
        <div style={{ fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>Proteção de margem da IA</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <span><Sparkles size={12} style={{ marginRight: 4, verticalAlign: -1, color: "#f59e0b" }} />Comunidade: 50 consultas/mês</span>
          <span><Sparkles size={12} style={{ marginRight: 4, verticalAlign: -1, color: "#f59e0b" }} />Pastoral: 500 consultas/mês</span>
          <span><Sparkles size={12} style={{ marginRight: 4, verticalAlign: -1, color: "#f59e0b" }} />Rede: 500/mês por igreja</span>
          <span>+ Pacote extra: R$ 29/100 consultas</span>
        </div>
      </div>
    </div>
  );
}

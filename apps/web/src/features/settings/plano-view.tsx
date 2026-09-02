"use client";

import { useEffect, useState } from "react";
import { friendlyError } from "../../lib/friendly-error";
import {
  Check,
  Sparkles,
  Lock,
  Zap,
  Loader2,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { usePlan } from "../../../contexts/PlanContext";
import { useAppAuth } from "../../../app/providers";
import type { PlanId } from "@alvo/firebase";
import { linkAsaasSubscription } from "@alvo/firebase";

const SALES_WHATSAPP = "5562993330336";

// Planos com preço fechado viram checkout self-service (Asaas). O plano
// Rede é sob consulta — continua indo pro WhatsApp de vendas.
const SELF_SERVICE_PLANS = new Set<PlanId>(["comunidade", "pastoral"]);

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
    features: [
      "Cadastro de membros",
      "Recepção e visitantes",
      "App mobile membros",
      "Dashboard básico",
    ],
    locked: [
      "Agenda e eventos",
      "Comunicados",
      "Tribos e vocações",
      "Finanças",
      "Doações (PIX)",
      "Células ilimitadas",
      "IA Pastoral",
      "Marketplace",
    ],
  },
  {
    id: "comunidade",
    name: "Comunidade",
    price: "R$ 79/mês",
    priceAnual: "R$ 67/mês no anual",
    limit: "até 300 membros",
    features: [
      "Tudo do Gratuito",
      "Agenda e eventos",
      "Comunicados",
      "Tribos e vocações",
      "Finanças",
      "Doações (PIX)",
      "Células ilimitadas",
      "50 consultas IA/mês (prévia)",
    ],
    locked: [
      "IA Pastoral completa",
      "Escalas",
      "Kids check-in",
      "Escola EAD",
      "Marketplace",
    ],
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
      "Marketplace da comunidade",
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

interface Invoice {
  id: string;
  value: number;
  status: string;
  dueDate: string;
  paymentDate: string | null;
  invoiceUrl: string | null;
}

const INVOICE_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Aguardando pagamento", color: "#9a6b00" },
  OVERDUE: { label: "Vencida", color: "#A32D2D" },
  CONFIRMED: { label: "Paga", color: "#1b8a4a" },
  RECEIVED: { label: "Paga", color: "#1b8a4a" },
  RECEIVED_IN_CASH: { label: "Paga", color: "#1b8a4a" },
  REFUNDED: { label: "Estornada", color: "#6b7280" },
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
}

export function PlanoView() {
  const { plan, aiQuota, ready, billingStatus, overdueSince } = usePlan();
  const { tenantRuntime, organizationId, user, firebaseConfig } = useAppAuth();
  const orgName =
    tenantRuntime?.organization?.displayName ??
    tenantRuntime?.organization?.name ??
    organizationId;
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<PlanId | null>(
    null,
  );
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [cpfCnpjPlan, setCpfCnpjPlan] = useState<PlanId | null>(null);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  useEffect(() => {
    if (!user || !organizationId) return;
    let cancelled = false;
    setInvoicesLoading(true);
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(
          `/api/billing/invoices?organizationId=${encodeURIComponent(organizationId)}`,
          {
            headers: { Authorization: `Bearer ${idToken}` },
          },
        );
        const data = await res.json();
        if (!cancelled) setInvoices(res.ok ? (data.invoices ?? []) : []);
      } catch {
        if (!cancelled) setInvoices([]);
      } finally {
        if (!cancelled) setInvoicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, organizationId]);

  async function startCheckout(planId: PlanId, cpfCnpjValue: string) {
    if (!user) return;
    setCheckoutError(null);
    setCheckoutLoadingPlan(planId);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          organizationId,
          planId,
          orgName,
          email: user.email,
          cpfCnpj: cpfCnpjValue.replace(/\D/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok)
        throw new Error(data.error ?? "Não foi possível iniciar o checkout.");
      if (data.asaasCustomerId && data.asaasSubscriptionId) {
        await linkAsaasSubscription(
          firebaseConfig,
          { organizationId },
          {
            asaasCustomerId: data.asaasCustomerId,
            asaasSubscriptionId: data.asaasSubscriptionId,
          },
        ).catch(() => undefined);
      }
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setCheckoutError(friendlyError(e, "Erro ao iniciar checkout."));
      setCheckoutLoadingPlan(null);
    }
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px" }}>
        Plano e faturamento
      </h1>
      <p
        style={{
          margin: "0 0 2rem",
          color: "var(--color-text-secondary)",
          fontSize: 14,
        }}
      >
        Gerencie seu plano e acompanhe o uso de IA.
      </p>

      {ready && billingStatus !== "active" && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: "1rem 1.25rem",
            borderRadius: 12,
            background: "var(--color-background-danger, #FCEBEB)",
            color: "var(--color-text-danger, #A32D2D)",
            marginBottom: "1rem",
            fontSize: 13,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>
              {billingStatus === "suspended"
                ? "Sistema suspenso por falta de pagamento."
                : "Fatura em atraso."}
            </strong>{" "}
            {billingStatus === "suspended"
              ? "Regularize o pagamento abaixo para restaurar o acesso completo."
              : overdueSince
                ? `Vencida desde ${new Date(overdueSince).toLocaleDateString("pt-BR")}. Regularize para evitar a suspensão do sistema.`
                : "Regularize para evitar a suspensão do sistema."}
          </div>
        </div>
      )}

      {ready && (
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            padding: "1rem 1.25rem",
            borderRadius: 12,
            background: "var(--color-background-secondary)",
            marginBottom: "2rem",
            fontSize: 14,
          }}
        >
          <div>
            Plano atual:{" "}
            <strong style={{ fontWeight: 500 }}>
              {PLANS.find((p) => p.id === plan)?.name ?? plan}
            </strong>
          </div>
          {aiQuota && aiQuota.limit > 0 && (
            <>
              <div
                style={{
                  width: 1,
                  height: 16,
                  background: "var(--color-border-tertiary)",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={14} style={{ color: "#f59e0b" }} />
                IA: <strong style={{ fontWeight: 500 }}>{aiQuota.used}</strong>/
                {aiQuota.limit} consultas em {aiQuota.month}
                {!aiQuota.allowed && (
                  <span
                    style={{ color: "var(--color-text-danger)", fontSize: 12 }}
                  >
                    — cota esgotada
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: "2rem",
        }}
      >
        {PLANS.map((p) => (
          <div
            key={p.id}
            style={{
              background: "var(--color-background-primary)",
              border:
                p.id === plan
                  ? "2px solid #7c3aed"
                  : p.highlight
                    ? "2px solid var(--color-border-info)"
                    : "0.5px solid var(--color-border-tertiary)",
              borderRadius: 12,
              padding: "1.25rem",
              position: "relative",
            }}
          >
            {p.id === plan && (
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#7c3aed",
                  color: "#fff",
                  fontSize: 11,
                  padding: "3px 12px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
              >
                Plano atual
              </div>
            )}
            {p.highlight && p.id !== plan && (
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--color-background-info)",
                  color: "var(--color-text-info)",
                  fontSize: 11,
                  padding: "3px 12px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
              >
                Mais popular
              </div>
            )}
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--color-text-secondary)",
                marginBottom: 6,
              }}
            >
              {p.name}
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 2 }}>
              {p.price}
            </div>
            {p.priceAnual && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  marginBottom: 4,
                }}
              >
                {p.priceAnual}
              </div>
            )}
            <div
              style={{
                fontSize: 11,
                color: "var(--color-text-tertiary)",
                marginBottom: 14,
              }}
            >
              {p.limit}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 13,
              }}
            >
              {p.features.map((f) => (
                <div
                  key={f}
                  style={{ display: "flex", gap: 6, alignItems: "flex-start" }}
                >
                  {f.includes("IA") || f.includes("consultas") ? (
                    <Sparkles
                      size={13}
                      style={{ color: "#f59e0b", marginTop: 2, flexShrink: 0 }}
                    />
                  ) : (
                    <Check
                      size={13}
                      style={{
                        color: "var(--color-text-success)",
                        marginTop: 2,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {f}
                </div>
              ))}
              {p.locked.map((f) => (
                <div
                  key={f}
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "flex-start",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  <Lock size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
            {p.id !== plan &&
              SELF_SERVICE_PLANS.has(p.id) &&
              cpfCnpjPlan !== p.id && (
                <button
                  onClick={() => {
                    setCpfCnpjPlan(p.id);
                    setCpfCnpj(tenantRuntime?.organization?.taxId ?? "");
                    setCheckoutError(null);
                  }}
                  disabled={checkoutLoadingPlan !== null}
                  style={{
                    marginTop: 16,
                    width: "100%",
                    padding: "8px 0",
                    background: p.highlight ? "#7c3aed" : "transparent",
                    color: p.highlight ? "#fff" : "var(--color-text-secondary)",
                    border: p.highlight
                      ? "none"
                      : "0.5px solid var(--color-border-secondary)",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor:
                      checkoutLoadingPlan !== null ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    opacity: checkoutLoadingPlan !== null ? 0.5 : 1,
                  }}
                >
                  Fazer upgrade
                </button>
              )}
            {p.id !== plan &&
              SELF_SERVICE_PLANS.has(p.id) &&
              cpfCnpjPlan === p.id && (
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <label
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    CPF ou CNPJ do responsável (exigido pelo gateway de
                    pagamento)
                    <input
                      autoFocus
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                      placeholder="000.000.000-00"
                      style={{
                        width: "100%",
                        marginTop: 4,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "0.5px solid var(--color-border-secondary)",
                        fontSize: 13,
                      }}
                    />
                  </label>
                  <button
                    onClick={() => startCheckout(p.id, cpfCnpj)}
                    disabled={
                      checkoutLoadingPlan !== null ||
                      cpfCnpj.replace(/\D/g, "").length < 11
                    }
                    style={{
                      width: "100%",
                      padding: "8px 0",
                      background: p.highlight ? "#7c3aed" : "#374151",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor:
                        checkoutLoadingPlan !== null ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      opacity:
                        checkoutLoadingPlan !== null ||
                        cpfCnpj.replace(/\D/g, "").length < 11
                          ? 0.6
                          : 1,
                    }}
                  >
                    {checkoutLoadingPlan === p.id ? (
                      <Loader2 size={14} className="spin" />
                    ) : null}
                    {checkoutLoadingPlan === p.id
                      ? "Abrindo checkout..."
                      : "Continuar para pagamento"}
                  </button>
                </div>
              )}
            {p.id !== plan && !SELF_SERVICE_PLANS.has(p.id) && (
              <a
                href={upgradeWhatsappHref(p.name, orgName)}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: 16,
                  width: "100%",
                  padding: "8px 0",
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "block",
                  textAlign: "center",
                  textDecoration: "none",
                }}
              >
                Falar com vendas
              </a>
            )}
          </div>
        ))}
      </div>

      {checkoutError && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: 8,
            background: "var(--color-background-danger, #FCEBEB)",
            color: "var(--color-text-danger, #A32D2D)",
            fontSize: 13,
            marginBottom: "1.5rem",
          }}
        >
          {checkoutError}
        </div>
      )}

      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12,
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Zap size={15} />
          Faixas do plano Rede
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
          }}
        >
          {REDE_FAIXAS.map((f) => (
            <div
              key={f.label}
              style={{
                background: "var(--color-background-secondary)",
                borderRadius: 8,
                padding: "0.875rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  marginBottom: 4,
                }}
              >
                {f.label}
              </div>
              <div style={{ fontSize: 17, fontWeight: 500 }}>{f.price}</div>
              <div
                style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}
              >
                {f.anual}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(invoicesLoading || (invoices && invoices.length > 0)) && (
        <div
          style={{
            marginTop: "1.5rem",
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12,
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Receipt size={15} />
            Histórico de faturas
          </div>
          {invoicesLoading ? (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Carregando...
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {invoices!.map((inv) => {
                const statusInfo = INVOICE_STATUS_LABEL[inv.status] ?? {
                  label: inv.status,
                  color: "#6b7280",
                };
                return (
                  <div
                    key={inv.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      padding: "0.6rem 0.75rem",
                      borderRadius: 8,
                      background: "var(--color-background-secondary)",
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 90,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {formatDate(inv.dueDate)}
                    </span>
                    <span style={{ fontWeight: 500, minWidth: 90 }}>
                      {formatCurrency(inv.value)}
                    </span>
                    <span
                      style={{
                        color: statusInfo.color,
                        fontWeight: 500,
                        minWidth: 130,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                    {inv.paymentDate && (
                      <span
                        style={{
                          color: "var(--color-text-tertiary)",
                          fontSize: 12,
                        }}
                      >
                        pago em {formatDate(inv.paymentDate)}
                      </span>
                    )}
                    {inv.invoiceUrl &&
                      (inv.status === "PENDING" ||
                        inv.status === "OVERDUE") && (
                        <a
                          href={inv.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            marginLeft: "auto",
                            color: "#7c3aed",
                            fontWeight: 500,
                            textDecoration: "none",
                            fontSize: 12,
                          }}
                        >
                          Pagar agora
                        </a>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: "1.5rem",
          background: "var(--color-background-secondary)",
          borderRadius: 10,
          padding: "1rem 1.25rem",
          fontSize: 13,
          color: "var(--color-text-secondary)",
        }}
      >
        <div
          style={{
            fontWeight: 500,
            color: "var(--color-text-primary)",
            marginBottom: 6,
          }}
        >
          Proteção de margem da IA
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <span>
            <Sparkles
              size={12}
              style={{ marginRight: 4, verticalAlign: -1, color: "#f59e0b" }}
            />
            Comunidade: 50 consultas/mês
          </span>
          <span>
            <Sparkles
              size={12}
              style={{ marginRight: 4, verticalAlign: -1, color: "#f59e0b" }}
            />
            Pastoral: 500 consultas/mês
          </span>
          <span>
            <Sparkles
              size={12}
              style={{ marginRight: 4, verticalAlign: -1, color: "#f59e0b" }}
            />
            Rede: 500/mês por igreja
          </span>
          <span>+ Pacote extra: R$ 29/100 consultas</span>
        </div>
      </div>
    </div>
  );
}

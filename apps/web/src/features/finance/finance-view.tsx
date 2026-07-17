"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  ReceiptText, 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Download,
  Calendar,
  Wallet,
  PieChart as PieIcon,
  Plus,
  Send,
  MessageSquare,
  Sparkles,
  Smartphone,
  Copy,
  Check,
  X,
  Printer,
  ChevronRight,
  TrendingUp as ChartIcon,
  HeartHandshake
} from "lucide-react";
import Link from "next/link";
import { useAppAuth } from "../../../app/providers";
import type { MemberContribution, FinancialTransaction } from "@alvo/types";
import {
  fetchAllContributions,
  confirmMemberContribution,
  fetchContributionReceipt,
  fetchFinancialTransactions,
  addFinancialTransaction,
  deleteFinancialTransaction
} from "@alvo/firebase";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

// Campanhas / Metas de Arrecadação
export interface GivingGoal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  category: string;
}

const initialGivingGoals: GivingGoal[] = [
  {
    id: "goal_temple",
    title: "Reforma & Ampliação do Templo",
    description: "Meta para ampliação das galerias laterais do auditório e modernização do sistema de som.",
    targetAmount: 100000,
    raisedAmount: 64500,
    category: "Obras"
  },
  {
    id: "goal_social",
    title: "Ação Social Cesta Solidária",
    description: "Arrecadação mensal de mantimentos e kits de higiene para famílias vulneráveis.",
    targetAmount: 12000,
    raisedAmount: 9800,
    category: "Social"
  }
];

export function FinanceView() {
  const { configured, user, organizationId, firebaseConfig, tenantRuntime } = useAppAuth();
  const orgSlug = tenantRuntime?.organization?.slug ?? "";

  // Contribuições reais vindas do app (PIX autodeclarado) — os relatórios
  // mensais abaixo (income/expenses/missions) continuam sendo lançamento
  // manual da liderança; isto aqui é o que os membros registraram sozinhos
  // pelo app mobile e que precisa de confirmação humana antes de contar
  // como recebido de fato.
  const [contributions, setContributions] = useState<MemberContribution[]>([]);
  const [contribLoading, setContribLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // Comprovante: modal com a imagem (base64) carregada sob demanda
  const [receiptModal, setReceiptModal] = useState<string | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  async function openReceipt(receiptId: string) {
    if (!organizationId) return;
    setLoadingReceiptId(receiptId);
    try {
      const r = await fetchContributionReceipt(firebaseConfig, { organizationId }, receiptId);
      if (r) setReceiptModal(r.dataUri);
    } catch (e) {
      console.error("Falha ao carregar comprovante:", e);
    } finally {
      setLoadingReceiptId(null);
    }
  }

  useEffect(() => {
    if (!configured || !organizationId) { setContribLoading(false); return; }
    let cancelled = false;
    fetchAllContributions(firebaseConfig, { organizationId }, 200)
      .then((list) => { if (!cancelled) setContributions(list); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setContribLoading(false); });
    return () => { cancelled = true; };
  }, [configured, organizationId, firebaseConfig]);

  async function handleConfirmContribution(id: string) {
    if (!organizationId || !user) return;
    setConfirmingId(id);
    try {
      await confirmMemberContribution(firebaseConfig, { organizationId }, id, user.uid);
      setContributions((prev) => prev.map((c) => c.id === id ? { ...c, status: "confirmed", confirmedBy: user.uid, confirmedAt: new Date().toISOString() } : c));
    } catch {
      // silencioso — admin pode tentar de novo pelo botão
    } finally {
      setConfirmingId(null);
    }
  }

  const pendingContributions = contributions.filter((c) => c.status === "pending");
  const confirmedContributions = contributions.filter((c) => c.status === "confirmed");

  // Ledger real: lançamentos individuais (entradas/saídas/missões).
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const reloadTransactions = useCallback(async () => {
    if (!configured || !organizationId) return;
    try {
      const list = await fetchFinancialTransactions(firebaseConfig, { organizationId }, 500);
      setTransactions(list);
    } catch { /* silencioso */ }
  }, [configured, organizationId, firebaseConfig]);
  useEffect(() => { void reloadTransactions(); }, [reloadTransactions]);

  const [filterQuery, setFilterQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"chart" | "distribution" | "goals">("chart");

  // Metas de Arrecadação (ainda estático — real fica p/ fase futura)
  const [givingGoals] = useState<GivingGoal[]>(initialGivingGoals);

  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintStatement, setShowPrintStatement] = useState(false);

  // Form de Lançamento Manual
  const [newEntry, setNewEntry] = useState({
    category: "Entrada" as "Entrada" | "Saída" | "Missões",
    label: "",
    amount: "",
    note: ""
  });

  // Extrato/relatório derivado 100% dos dados reais: lançamentos manuais
  // (financialTransactions) + contribuições PIX confirmadas. Sinal por kind:
  // Entrada e Missões contam como arrecadação; Saída é despesa.
  const currentReport = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
      .format(new Date());
    const kindToCategory: Record<FinancialTransaction["kind"], "Entrada" | "Saída" | "Missões"> = {
      income: "Entrada",
      expense: "Saída",
      missions: "Missões"
    };

    const entries = [
      ...transactions.map((t) => ({
        id: t.id,
        category: kindToCategory[t.kind],
        label: t.label,
        amount: t.amount,
        note: t.note ?? "",
        createdAt: t.date,
        source: "tx" as const
      })),
      ...confirmedContributions.map((c) => ({
        id: c.id,
        category: "Entrada" as const,
        label: `${c.contributorName ?? "Membro"} — PIX (${c.type})`,
        amount: c.amount,
        note: "Confirmada pela liderança",
        createdAt: c.date,
        source: "contrib" as const
      }))
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const isMonth = (d: string) => (d ?? "").slice(0, 7) === monthKey;
    const sumBy = (pred: (e: (typeof entries)[number]) => boolean) =>
      entries.filter(pred).reduce((s, e) => s + e.amount, 0);

    const incomeMonth = sumBy((e) => e.category !== "Saída" && isMonth(e.createdAt));
    const expensesMonth = sumBy((e) => e.category === "Saída" && isMonth(e.createdAt));
    const missionsMonth = sumBy((e) => e.category === "Missões" && isMonth(e.createdAt));
    const incomeAll = sumBy((e) => e.category !== "Saída");
    const expensesAll = sumBy((e) => e.category === "Saída");

    return {
      month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      income: incomeMonth,
      expenses: expensesMonth,
      missions: missionsMonth,
      balance: incomeAll - expensesAll,
      entries
    };
  }, [transactions, confirmedContributions]);

  // Filtra lançamentos do extrato
  const filteredEntries = useMemo(() => {
    return currentReport.entries.filter(entry =>
      entry.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
      entry.category.toLowerCase().includes(filterQuery.toLowerCase())
    );
  }, [currentReport, filterQuery]);

  // Série mensal real (últimos 6 meses) p/ o gráfico de evolução.
  const monthlySeries = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const e of currentReport.entries) {
      const key = (e.createdAt ?? "").slice(0, 7);
      if (!key) continue;
      const cur = map.get(key) ?? { income: 0, expense: 0 };
      if (e.category === "Saída") cur.expense += e.amount; else cur.income += e.amount;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-6)
      .map(([month, v]) => ({
        label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${month}-01T12:00:00`)),
        income: v.income,
        expense: v.expense
      }));
  }, [currentReport]);

  // Quebra real das despesas por descrição (top 6) p/ o gráfico de distribuição.
  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of currentReport.entries) {
      if (e.category !== "Saída") continue;
      map.set(e.label, (map.get(e.label) ?? 0) + e.amount);
    }
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, amount]) => ({ label, amount, pct: total ? Math.round((amount / total) * 100) : 0 }));
  }, [currentReport]);

  // Lançamento Manual — persiste de verdade no ledger (financialTransactions).
  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newEntry.amount);
    if (!newEntry.label || isNaN(amountVal) || amountVal <= 0) return;
    if (!configured || !organizationId) { setShowAddModal(false); return; }

    const kind: FinancialTransaction["kind"] =
      newEntry.category === "Entrada" ? "income" : newEntry.category === "Saída" ? "expense" : "missions";
    try {
      await addFinancialTransaction(firebaseConfig, { organizationId }, {
        kind,
        label: newEntry.label.trim(),
        amount: amountVal,
        note: newEntry.note.trim() || undefined,
        date: new Date().toISOString(),
        createdByUserId: user?.uid
      });
      await reloadTransactions();
      setNewEntry({ category: "Entrada", label: "", amount: "", note: "" });
      setShowAddModal(false);
    } catch {
      // mantém o modal aberto para o admin tentar de novo
    }
  };

  // Excluir lançamento (só os manuais; contribuições PIX se gerenciam no painel próprio).
  const handleDeleteEntry = async (id: string, source: "tx" | "contrib") => {
    if (source !== "tx" || !configured || !organizationId) return;
    if (!window.confirm("Excluir este lançamento do ledger?")) return;
    try {
      await deleteFinancialTransaction(firebaseConfig, { organizationId }, id);
      await reloadTransactions();
    } catch { /* silencioso */ }
  };

  return (
    <main className="finance-workbench animate-entrance">
      
      {/* Estilo e Folha de Impressão Contábil */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-statement, .printable-statement * {
            visibility: visible;
          }
          .printable-statement {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 2.5rem !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
        @keyframes scanLine {
          0% { top: 15%; }
          50% { top: 85%; }
          100% { top: 15%; }
        }
      `}</style>

      {/* 1. Modal de Lançamento Manual */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(9, 13, 22, 0.8)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(6px)"
          }}
          className="animate-entrance"
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 24,
              padding: "2.5rem",
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              color: "white"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                <ReceiptText size={20} style={{ color: "#f97316" }} />
                Novo Lançamento Contábil
              </h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Tipo de Fluxo *</label>
                <select
                  value={newEntry.category}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, category: e.target.value as "Entrada" | "Saída" | "Missões" }))}
                  style={{ width: "100%", padding: "0.75rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none" }}
                >
                  <option value="Entrada">Entrada (Dízimo/Oferta)</option>
                  <option value="Saída">Saída (Despesa/Custo)</option>
                  <option value="Missões">Fundo Missionário</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Descrição / Identificação *</label>
                <input
                  required
                  placeholder="Ex: Oferta Especial Culto de Missões"
                  value={newEntry.label}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, label: e.target.value }))}
                  style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Valor Monetário (R$) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="Ex: 1250.00"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, amount: e.target.value }))}
                    style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Anotação / Observação</label>
                <input
                  placeholder="Observação contábil para conciliação..."
                  value={newEntry.note}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, note: e.target.value }))}
                  style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="secondary-button"
                  style={{ width: "50%", padding: "0.85rem", color: "white", borderColor: "rgba(255,255,255,0.2)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  style={{ width: "50%", padding: "0.85rem", backgroundColor: "#f97316", color: "white", fontWeight: 700 }}
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal do Relatório Contábil Consolidado (Visualizador / Impressão) */}
      {showPrintStatement && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(9, 13, 22, 0.9)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)",
            padding: "2rem"
          }}
          className="animate-entrance"
        >
          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: "2.5rem",
              width: "100%",
              maxWidth: 800,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}
          >
            {/* Folha Contábil Oficial */}
            <div
              className="printable-statement"
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: "2rem",
                background: "#ffffff",
                color: "#1e293b",
                fontFamily: "Georgia, serif"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #0f172a", paddingBottom: "1.5rem" }}>
                <div>
                  <strong style={{ fontSize: "1.4rem", color: "#0f172a", display: "block" }}>ALVO CHURCH CONTABILIDADE</strong>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Relatório Geral de Transparência Financeira</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>Competência: {currentReport.month}</strong>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Emitido em {new Date().toLocaleDateString("pt-BR")}</span>
                </div>
              </div>

              {/* Tabela de Consolidado */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", margin: "1.5rem 0", padding: "1.25rem", background: "#f8fafc", borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Arrecadação Geral (Entradas)</span>
                  <strong style={{ display: "block", fontSize: "1.25rem", color: "#16a34a", marginTop: 4 }}>{formatCurrency(currentReport.income)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Despesas Consolidadas (Saídas)</span>
                  <strong style={{ display: "block", fontSize: "1.25rem", color: "#dc2626", marginTop: 4 }}>{formatCurrency(currentReport.expenses)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Fundo Missionário Alocado</span>
                  <strong style={{ display: "block", fontSize: "1.25rem", color: "#2563eb", marginTop: 4 }}>{formatCurrency(currentReport.missions)}</strong>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
                <strong style={{ fontSize: "1.1rem", color: "#0f172a" }}>Saldo Líquido Operacional em Caixa</strong>
                <strong style={{ fontSize: "1.25rem", color: "#f97316" }}>{formatCurrency(currentReport.balance)}</strong>
              </div>

              <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: "0.75rem", color: "#0f172a" }}>Detalhamento das Operações Recentes:</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {currentReport.entries.map((ent, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "6px 0", borderBottom: "1px dashed #e2e8f0" }}>
                    <span>
                      <strong>{ent.label}</strong>
                      <small style={{ color: "#64748b", display: "block" }}>Categoria: {ent.category}</small>
                    </span>
                    <strong style={{ color: ent.category === "Saída" ? "#dc2626" : "#16a34a" }}>
                      {ent.category === "Saída" ? "-" : "+"} {formatCurrency(ent.amount)}
                    </strong>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px dashed #cbd5e1" }}>
                <div style={{ textAlign: "center", width: "240px" }}>
                  <div style={{ borderBottom: "1px solid #94a3b8", height: 20 }} />
                  <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", marginTop: 6, display: "block" }}>Liderança Financeira Esdras</span>
                </div>
                <div style={{ textAlign: "center", width: "240px" }}>
                  <div style={{ borderBottom: "1px solid #94a3b8", height: 20 }} />
                  <span style={{ fontSize: "0.7er", color: "#64748b", textTransform: "uppercase", marginTop: 6, display: "block" }}>Conselho de Transparência</span>
                </div>
              </div>
            </div>

            {/* Ações da Janela */}
            <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button
                onClick={() => setShowPrintStatement(false)}
                className="secondary-button"
                style={{ padding: "0.75rem 1.5rem", borderRadius: 12 }}
              >
                Fechar Painel
              </button>
              <button
                onClick={() => window.print()}
                className="primary-button"
                style={{ backgroundColor: "#f97316", color: "white", padding: "0.75rem 1.5rem", borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}
              >
                <Printer size={16} />
                Confirmar Impressão Contábil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="finance-hero topbar">
        <div className="topbar-content">
          <p className="eyebrow" style={{ color: "#f97316" }}>Finanças e transparência</p>
          <h1>Gestão Financeira da Igreja</h1>
          <p>Controle entradas, saídas, missões, metas e contribuições por PIX em uma visão clara para liderança e transparência.</p>
        </div>
        <div className="topbar-actions">
           <button onClick={() => setShowPrintStatement(true)} className="ghost-button compact" style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
             <Download size={16} /> Exportar Relatório
           </button>
           <button onClick={() => setShowAddModal(true)} className="primary-button compact" style={{ backgroundColor: "#f97316", color: "white", borderRadius: 12 }}>
             <Plus size={16} /> Lançamento Manual
           </button>
        </div>
      </header>

      {/* Contribuições reais recebidas via PIX pelo app mobile — precisam de
          confirmação humana antes de entrar no relatório mensal manual abaixo. */}
      {!contribLoading && contributions.length > 0 && (
        <section
          className="no-print"
          style={{
            marginTop: "1.5rem",
            background: "#1e293b",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "1.25rem 1.5rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
              <Smartphone size={18} style={{ color: "#f97316" }} />
              Contribuições via PIX (app)
            </h3>
            {pendingContributions.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.12)", padding: "4px 10px", borderRadius: 100 }}>
                {pendingContributions.length} pendente{pendingContributions.length > 1 ? "s" : ""} de confirmação
              </span>
            )}
          </div>

          {pendingContributions.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              Nenhuma contribuição pendente — {contributions.length} registro{contributions.length > 1 ? "s" : ""} no total, todos conferidos.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingContributions.slice(0, 8).map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "0.75rem 1rem",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 10
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <div>
                      <strong style={{ color: "white", fontSize: 14 }}>{c.contributorName ?? "Membro"}</strong>
                      <span style={{ marginLeft: 8, fontSize: 14, color: "#22c55e", fontWeight: 700 }}>{formatCurrency(c.amount)}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                      {c.type} · {new Date(c.date).toLocaleDateString("pt-BR")}
                      {c.receiptId && (
                        <> · <button
                          onClick={() => openReceipt(c.receiptId!)}
                          disabled={loadingReceiptId === c.receiptId}
                          style={{ background: "none", border: "none", padding: 0, color: "#60a5fa", fontWeight: 600, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                        >{loadingReceiptId === c.receiptId ? "Carregando…" : "Ver comprovante"}</button></>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => handleConfirmContribution(c.id)}
                    disabled={confirmingId === c.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "#16a34a", color: "white", border: "none",
                      borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600,
                      cursor: confirmingId === c.id ? "default" : "pointer",
                      opacity: confirmingId === c.id ? 0.6 : 1
                    }}
                  >
                    <Check size={14} />
                    {confirmingId === c.id ? "Confirmando..." : "Confirmar recebimento"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Main Grid: Insights Contábeis + WhatsApp Smartphone Sim */}
      <section className="finance-layout" style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "2.5rem", marginTop: "2rem" }}>
        
        {/* Lado Esquerdo: Cards, Gráficos Dinâmicos e Extrato */}
        <div className="finance-left-column" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Nubank Card de Caixa e Indicadores */}
          <div className="finance-main-card antigravity-float" style={{ width: "100%" }}>
            <div className="card-header">
               <div className="month-selector">
                 <Calendar size={18} style={{ color: "#f97316" }} />
                 <strong>{currentReport.month}</strong>
               </div>
               <div className="status-pill published">Painel de Transparência Ativo</div>
            </div>
            
            <div className="main-metrics">
              <div className="metric-primary">
                <span>Arrecadação Total (Entradas)</span>
                <strong style={{ color: "white" }}>{formatCurrency(currentReport.income)}</strong>
                <div className="trend up">
                  <ArrowUpRight size={14} /> 12.8% vs mês anterior
                </div>
              </div>
              <div className="metric-primary">
                <span>Saldo em Caixa</span>
                <strong style={{ color: "#f97316" }}>{formatCurrency(currentReport.balance)}</strong>
                <p style={{ opacity: 0.6, fontSize: "0.85rem", marginTop: 4 }}>Saldo operacional líquido disponível</p>
              </div>
            </div>

            <div className="mini-stats">
               <div className="mini-stat">
                 <TrendingDown size={16} color="#ef4444" />
                 <div>
                   <small>Despesas Consolidadas</small>
                   <b>{formatCurrency(currentReport.expenses)}</b>
                 </div>
               </div>
               <div className="mini-stat">
                 <Globe size={16} color="#0ea5e9" />
                 <div>
                   <small>Fundo Missionário</small>
                   <b>{formatCurrency(currentReport.missions)}</b>
                 </div>
               </div>
               <div className="mini-stat">
                 <Wallet size={16} color="#10b981" />
                 <div>
                   <small>Reserva de Contingência (10%)</small>
                   <b>{formatCurrency(currentReport.income * 0.1)}</b>
                 </div>
               </div>
            </div>
          </div>

          {/* Gráfico & Insights Tab System */}
          <div
            className="finance-insight-panel"
            style={{
              background: "rgba(30, 41, 59, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: 24,
              padding: "2rem"
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <button
                className={activeTab === "chart" ? "finance-tab-button is-active" : "finance-tab-button"}
                onClick={() => setActiveTab("chart")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 10,
                  background: activeTab === "chart" ? "rgba(249, 115, 22, 0.15)" : "transparent",
                  border: "none",
                  color: activeTab === "chart" ? "#f97316" : "rgba(255,255,255,0.6)",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <ChartIcon size={14} />
                Histórico Anual
              </button>
              <button
                className={activeTab === "distribution" ? "finance-tab-button is-active" : "finance-tab-button"}
                onClick={() => setActiveTab("distribution")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 10,
                  background: activeTab === "distribution" ? "rgba(249, 115, 22, 0.15)" : "transparent",
                  border: "none",
                  color: activeTab === "distribution" ? "#f97316" : "rgba(255,255,255,0.6)",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <PieIcon size={14} />
                Distribuição de Despesas
              </button>
              <button
                className={activeTab === "goals" ? "finance-tab-button is-active" : "finance-tab-button"}
                onClick={() => setActiveTab("goals")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 10,
                  background: activeTab === "goals" ? "rgba(249, 115, 22, 0.15)" : "transparent",
                  border: "none",
                  color: activeTab === "goals" ? "#f97316" : "rgba(255,255,255,0.6)",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <HeartHandshake size={14} />
                Metas / Campanhas
              </button>
            </div>

            <div style={{ minHeight: "220px" }}>
              
              {/* ABA 1: Evolução mensal (dados reais) */}
              {activeTab === "chart" && (
                <div className="animate-entrance">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <h4 style={{ color: "white", fontSize: "0.95rem", fontWeight: 700 }}>Entradas vs Saídas por mês</h4>
                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Últimos {monthlySeries.length} meses</span>
                  </div>
                  {monthlySeries.length === 0 ? (
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", padding: "2.5rem 0", textAlign: "center" }}>Sem lançamentos ainda. Registre entradas e saídas para ver a evolução.</p>
                  ) : (
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", height: 200, paddingTop: 10 }}>
                      {(() => {
                        const max = Math.max(1, ...monthlySeries.map((m) => Math.max(m.income, m.expense)));
                        return monthlySeries.map((m, i) => (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: "100%", width: "100%", justifyContent: "center" }}>
                              <div title={"Entradas " + formatCurrency(m.income)} style={{ width: 14, height: (m.income / max) * 100 + "%", background: "#f97316", borderRadius: "4px 4px 0 0", minHeight: 2 }} />
                              <div title={"Saídas " + formatCurrency(m.expense)} style={{ width: 14, height: (m.expense / max) * 100 + "%", background: "#ef4444", borderRadius: "4px 4px 0 0", minHeight: 2 }} />
                            </div>
                            <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>{m.label}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#f97316" }} />Entradas</span>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444" }} />Saídas</span>
                  </div>
                </div>
              )}

              {/* ABA 2: Distribuição real das despesas por descrição */}
              {activeTab === "distribution" && (
                <div className="animate-entrance">
                  <h4 style={{ color: "white", fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem" }}>Para onde vão as despesas</h4>
                  {expenseBreakdown.length === 0 ? (
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", padding: "2.5rem 0", textAlign: "center" }}>Nenhuma saída registrada ainda.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                      {expenseBreakdown.map((it, i) => (
                        <div key={i}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", overflowWrap: "anywhere" }}>{it.label}</span>
                            <strong style={{ fontSize: "0.85rem", color: "white", whiteSpace: "nowrap", marginLeft: 8 }}>{formatCurrency(it.amount)} · {it.pct}%</strong>
                          </div>
                          <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden" }}>
                            <div style={{ width: it.pct + "%", height: "100%", background: "#f97316", borderRadius: 6 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 3: Metas e Campanhas da Igreja (Giving Goals Progress Bars) */}
              {activeTab === "goals" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }} className="animate-entrance">
                  {givingGoals.map(goal => {
                    const percent = Math.min(Math.round((goal.raisedAmount / goal.targetAmount) * 100), 100);
                    return (
                      <div 
                        key={goal.id} 
                        style={{
                          padding: "1rem", 
                          background: "rgba(255,255,255,0.03)", 
                          border: "1px solid rgba(255,255,255,0.05)", 
                          borderRadius: 16
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div>
                            <strong style={{ color: "white", fontSize: "0.9rem", display: "block" }}>{goal.title}</strong>
                            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>{goal.description}</span>
                          </div>
                          <span style={{ fontSize: "0.8rem", color: "#f97316", fontWeight: 700 }}>{percent}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ width: "100%", height: 8, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", margin: "8px 0" }}>
                          <div style={{ width: `${percent}%`, height: "100%", backgroundColor: "#f97316", borderRadius: 4 }} />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                          <span>Arrecadado: <strong>{formatCurrency(goal.raisedAmount)}</strong></span>
                          <span>Meta Geral: <strong>{formatCurrency(goal.targetAmount)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

          {/* Extrato de Lançamentos */}
          <section className="finance-entries-panel" style={{ margin: 0, width: "100%", background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24 }}>
            <div className="section-header">
               <h2 style={{ color: "white" }}>Extrato de Lançamentos</h2>
               <div className="filter-row">
                 <div className="search-box-compact" style={{ background: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                   <Filter size={14} style={{ color: "#94a3b8" }} />
                   <input 
                     placeholder="Filtrar lançamentos..." 
                     value={filterQuery}
                     onChange={e => setFilterQuery(e.target.value)}
                     style={{ color: "white" }}
                   />
                 </div>
               </div>
            </div>

            <div className="entries-table-wrapper" style={{ maxHeight: "380px", overflowY: "auto" }}>
              <table className="entries-table">
                <thead>
                  <tr>
                    <th style={{ color: "rgba(255,255,255,0.4)", borderBottomColor: "rgba(255,255,255,0.08)" }}>Data</th>
                    <th style={{ color: "rgba(255,255,255,0.4)", borderBottomColor: "rgba(255,255,255,0.08)" }}>Categoria</th>
                    <th style={{ color: "rgba(255,255,255,0.4)", borderBottomColor: "rgba(255,255,255,0.08)" }}>Descrição</th>
                    <th style={{ color: "rgba(255,255,255,0.4)", borderBottomColor: "rgba(255,255,255,0.08)" }}>Valor</th>
                    <th style={{ color: "rgba(255,255,255,0.4)", borderBottomColor: "rgba(255,255,255,0.08)" }}>Canal</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => (
                    <tr key={entry.id} className="animate-entrance" style={{ borderBottomColor: "rgba(255,255,255,0.05)" }}>
                      <td style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—"}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span className={`entry-badge ${entry.category === 'Entrada' ? 'income' : entry.category === 'Missões' ? 'missions' : 'expense'}`} style={{
                          backgroundColor: entry.category === "Entrada" ? "rgba(16,185,129,0.15)" : entry.category === "Missões" ? "rgba(14,165,233,0.15)" : "rgba(239,68,68,0.15)",
                          color: entry.category === "Entrada" ? "#10b981" : entry.category === "Missões" ? "#0ea5e9" : "#ef4444"
                        }}>
                          {entry.category}
                        </span>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <strong style={{ color: "white" }}>{entry.label}</strong>
                        {entry.note && <p className="entry-note" style={{ color: "#c084fc", fontWeight: 600 }}>✨ {entry.note}</p>}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <b className={entry.category === 'Entrada' || entry.category === 'Missões' ? 'text-income' : 'text-expense'} style={{
                          color: entry.category === "Entrada" || entry.category === "Missões" ? "#10b981" : "#ef4444"
                        }}>
                          {entry.category === 'Entrada' || entry.category === 'Missões' ? '+ ' : '- '}
                          {formatCurrency(entry.amount)}
                        </b>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 8, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                            {entry.source === "contrib" ? "📱 PIX (app)" : "✏️ Lançamento"}
                          </span>
                          {entry.source === "tx" && (
                            <button type="button" onClick={() => handleDeleteEntry(entry.id, entry.source)} title="Excluir lançamento" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 4 }}>
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: "2.5rem 1rem", textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>
                        {filterQuery
                          ? "Nenhum lançamento corresponde ao filtro."
                          : "Nenhum lançamento ainda. Use “Lançamento Manual” ou confirme uma contribuição PIX."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* Lado Direito: WhatsApp Smartphone Simulator */}
        <aside className="finance-gateway-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, color: "#a855f7" }}>
            <Smartphone size={14} />
            Doações sem-app
          </span>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <HeartHandshake size={26} style={{ color: "#25D366" }} />
            <h3 style={{ color: "white", margin: 0, fontSize: "1.15rem" }}>Link público de doação</h3>
            <p style={{ color: "rgba(255,255,255,0.65)", margin: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>
              Qualquer pessoa (mesmo não-membro) contribui via PIX em segundos, sem baixar o app nem se cadastrar. O dinheiro cai direto na conta da igreja.
            </p>
            {orgSlug ? (
              <Link href={`/p/${orgSlug}/give`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", borderRadius: 12, background: "#25D366", color: "#062b15", fontWeight: 800, textDecoration: "none" }}>
                <ArrowUpRight size={16} /> Abrir página de doação
              </Link>
            ) : (
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem" }}>Configure o slug público da igreja em Configurações.</span>
            )}
            <small style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem" }}>
              Compartilhe o link/QR. As doações captadas aparecem em <strong>Doações</strong>.
            </small>
          </div>
        </aside>

      </section>

      {/* Modal do comprovante (imagem carregada sob demanda) */}
      {receiptModal && (
        <div
          onClick={() => setReceiptModal(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receiptModal} alt="Comprovante" style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 10, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }} />
            <button
              onClick={() => setReceiptModal(null)}
              style={{ background: "white", color: "#111", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >Fechar</button>
          </div>
        </div>
      )}
    </main>
  );
}

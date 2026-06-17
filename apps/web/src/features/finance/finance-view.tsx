"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useAppAuth } from "../../../app/providers";
import type { FinancialTransparencyReport } from "@alvo/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

// Interface estendida para manter compatibilidade
export interface ExtendedReport {
  id: string;
  organizationId: string;
  month: string;
  income: number;
  expenses: number;
  missions: number;
  balance: number;
  status: string;
  publishedAt?: string;
  entries: {
    id: string;
    category: "Entrada" | "Saída" | "Missões";
    label: string;
    amount: number;
    note: string;
    createdAt?: string;
  }[];
}

const initialMockReports: ExtendedReport[] = [
  {
    id: "rep_may_2026",
    organizationId: "org_alvo",
    month: "Maio 2026",
    income: 42500.80,
    expenses: 18200.40,
    missions: 4250.00,
    balance: 24300.40,
    status: "published",
    publishedAt: "2026-05-01T10:00:00Z",
    entries: [
      { id: "e1", category: "Entrada", label: "Dízimos e Ofertas Regulares", amount: 38000.00, note: "Entradas consolidadas do Caixa Geral" },
      { id: "e2", category: "Entrada", label: "Oferta Especial de Missões", amount: 4500.80, note: "Fundo missionário transacional" },
      { id: "e3", category: "Saída", label: "Aluguel da Nave Principal e IPTU", amount: 8500.00, note: "Custo fixo operacional" },
      { id: "e4", category: "Saída", label: "Manutenção, Energia e Água", amount: 1200.40, note: "Manutenção do templo" },
      { id: "e5", category: "Missões", label: "Base Missionária do Sertão", amount: 3000.00, note: "Apoio mensal à família missionária" },
      { id: "e6", category: "Saída", label: "Cestas Básicas de Ação Social", amount: 1800.00, note: "Compra de mantimentos solidários" }
    ]
  }
];

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

interface ChatMessage {
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  pixDetails?: {
    value: number;
    qrCodeUrl: string;
    pixCode: string;
  };
  isConfirmed?: boolean;
}

export function FinanceView() {
  const { configured } = useAppAuth();
  
  // Estados Reativos Principais
  const [reports, setReports] = useState<ExtendedReport[]>(initialMockReports);
  const [filterQuery, setFilterQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"chart" | "distribution" | "goals">("chart");
  
  // Metas de Arrecadação
  const [givingGoals, setGivingGoals] = useState<GivingGoal[]>(initialGivingGoals);

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

  // Estado do Simulador de WhatsApp
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: "Olá! Sou o Assistente Financeiro Inteligente da Alvo Church. 🤖✨\n\nComo posso abençoar o seu dia hoje?\n\nDigite [1] para contribuir com Dízimos ou [2] para Ofertas de Missões.",
      timestamp: "19:14"
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [currentStep, setCurrentStep] = useState<"choose" | "amount" | "pix" | "done">("choose");
  const [selectedCategory, setSelectedCategory] = useState<"Dízimos" | "Missões">("Dízimos");
  const [activeValue, setActiveValue] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const currentReport = useMemo(() => reports[0] ?? initialMockReports[0], [reports]);

  // Filtra lançamentos do extrato
  const filteredEntries = useMemo(() => {
    return currentReport.entries.filter(entry => 
      entry.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
      entry.category.toLowerCase().includes(filterQuery.toLowerCase())
    );
  }, [currentReport, filterQuery]);

  // Cadastro de Lançamento Manual reativo
  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newEntry.amount);
    if (!newEntry.label || isNaN(amountVal) || amountVal <= 0) return;

    setReports(prevReports => {
      const updated = prevReports.map(rep => {
        const addedEntry = {
          id: `entry_manual_${Date.now()}`,
          category: newEntry.category,
          label: newEntry.label,
          amount: amountVal,
          note: newEntry.note || "",
          createdAt: new Date().toLocaleDateString("pt-BR")
        };

        let nextIncome = rep.income;
        let nextExpenses = rep.expenses;
        let nextMissions = rep.missions;

        if (newEntry.category === "Entrada") {
          nextIncome += amountVal;
        } else if (newEntry.category === "Saída") {
          nextExpenses += amountVal;
        } else if (newEntry.category === "Missões") {
          nextIncome += amountVal;
          nextMissions += amountVal;
        }

        const nextBalance = nextIncome - nextExpenses;

        return {
          ...rep,
          income: nextIncome,
          expenses: nextExpenses,
          missions: nextMissions,
          balance: nextBalance,
          entries: [addedEntry, ...rep.entries]
        };
      });
      return updated;
    });

    // Se for uma entrada vinculada a metas de arrecadação
    if (newEntry.category === "Entrada") {
      if (newEntry.label.toLowerCase().includes("reforma") || newEntry.label.toLowerCase().includes("templo")) {
        setGivingGoals(prev => prev.map(g => g.id === "goal_temple" ? { ...g, raisedAmount: g.raisedAmount + amountVal } : g));
      } else if (newEntry.label.toLowerCase().includes("cesta") || newEntry.label.toLowerCase().includes("social")) {
        setGivingGoals(prev => prev.map(g => g.id === "goal_social" ? { ...g, raisedAmount: g.raisedAmount + amountVal } : g));
      }
    }

    // Reseta form e fecha modal
    setNewEntry({
      category: "Entrada",
      label: "",
      amount: "",
      note: ""
    });
    setShowAddModal(false);
  };

  // Manipulador do chat WhatsApp
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal.trim();
    const nowTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const userMsg: ChatMessage = {
      sender: "user",
      text: userText,
      timestamp: nowTime
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputVal("");

    setTimeout(() => {
      const botTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      if (currentStep === "choose") {
        if (userText === "1" || userText.toLowerCase().includes("dizimo") || userText.toLowerCase().includes("dízimo")) {
          setSelectedCategory("Dízimos");
          setChatMessages(prev => [...prev, {
            sender: "bot",
            text: "Perfeito! Você selecionou contribuir com Dízimo Geral da igreja. 🕊️\n\nPor favor, digite o valor que deseja doar (ex: 150 ou 200).",
            timestamp: botTime
          }]);
          setCurrentStep("amount");
        } else if (userText === "2" || userText.toLowerCase().includes("missao") || userText.toLowerCase().includes("missão")) {
          setSelectedCategory("Missões");
          setChatMessages(prev => [...prev, {
            sender: "bot",
            text: "Excelente! Você escolheu apoiar nossa Oferta Missionária. 🌍\n\nPor favor, digite o valor que deseja enviar.",
            timestamp: botTime
          }]);
          setCurrentStep("amount");
        } else {
          setChatMessages(prev => [...prev, {
            sender: "bot",
            text: "Opção inválida. Por favor, digite [1] para Dízimos ou [2] para Ofertas de Missões.",
            timestamp: botTime
          }]);
        }
      } else if (currentStep === "amount") {
        const amountNum = parseFloat(userText.replace(/[^0-9.]/g, ""));
        if (isNaN(amountNum) || amountNum <= 0) {
          setChatMessages(prev => [...prev, {
            sender: "bot",
            text: "Valor inválido. Digite um número positivo correspondente ao valor de sua contribuição.",
            timestamp: botTime
          }]);
        } else {
          setActiveValue(amountNum);
          setCurrentStep("pix");
          setChatMessages(prev => [...prev, {
            sender: "bot",
            text: `Confirmado! Gerando o seu código PIX no valor de ${formatCurrency(amountNum)} para a Alvo Church.\n\nEscaneie o QR Code abaixo ou utilize a chave PIX Copia e Cola.`,
            timestamp: botTime,
            pixDetails: {
              value: amountNum,
              qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020101021226870014br.gov.bcb.pix2565pix-gateway.alvochurch.app/pay",
              pixCode: `00020101021226870014br.gov.bcb.pix2565pix-gateway.alvochurch.app/pay/val-${amountNum}-alvo`
            }
          }]);
        }
      }
    }, 1000);
  };

  // Simula confirmação de pagamento do banco (Webhook real-time)
  const handleSimulatePayment = () => {
    if (activeValue <= 0) return;
    const botTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // 1. Envia notificação no chat de que o PIX foi compensado
    setChatMessages(prev => {
      const updated = prev.map(m => {
        if (m.pixDetails && m.pixDetails.value === activeValue) {
          return { ...m, isConfirmed: true };
        }
        return m;
      });
      return [
        ...updated,
        {
          sender: "bot",
          text: `🎉 *PAGAMENTO CONFIRMADO!*\n\nRecebemos sua contribuição no valor de *${formatCurrency(activeValue)}* com sucesso.\n\nDeus abençoe ricamente sua generosidade e fidelidade! Seu comprovante já foi automaticamente anexado ao extrato contábil digital da Alvo Church.`,
          timestamp: botTime
        }
      ];
    });

    // 2. Atualiza o caixa da igreja reativamente na mesma tela!
    setReports(prevReports => {
      const updated = prevReports.map(rep => {
        const newEntryItem = {
          id: `entry_whatsapp_${Date.now()}`,
          category: selectedCategory === "Dízimos" ? "Entrada" as const : "Missões" as const,
          label: `${selectedCategory === "Dízimos" ? "Dízimo" : "Oferta"} via WhatsApp - Alexandre Costa`,
          amount: activeValue,
          note: "Aprovado via Gateway Instantâneo PIX IA",
          createdAt: new Date().toLocaleDateString("pt-BR")
        };
        const nextIncome = rep.income + activeValue;
        const nextMissions = selectedCategory === "Missões" ? rep.missions + activeValue : rep.missions;
        const nextBalance = nextIncome - rep.expenses;

        return {
          ...rep,
          income: nextIncome,
          balance: nextBalance,
          missions: nextMissions,
          entries: [newEntryItem, ...rep.entries]
        };
      });
      return updated;
    });

    // Atualiza metas de arrecadação se coincidir
    if (selectedCategory === "Missões") {
      setGivingGoals(prev => prev.map(g => g.id === "goal_social" ? { ...g, raisedAmount: g.raisedAmount + activeValue } : g));
    }

    setCurrentStep("done");
  };

  // Reseta chatbot para nova transação
  const handleResetChat = () => {
    setChatMessages([
      {
        sender: "bot",
        text: "Olá! Sou o Assistente Financeiro Inteligente da Alvo Church. 🤖✨\n\nComo posso abençoar o seu dia hoje?\n\nDigite [1] para contribuir com Dízimos ou [2] para Ofertas de Missões.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      }
    ]);
    setActiveValue(0);
    setCurrentStep("choose");
  };

  const copyPixCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                  onChange={(e) => setNewEntry(prev => ({ ...prev, category: e.target.value as ExtendedReport["entries"][0]["category"] }))}
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
                  <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", marginTop: 6, display: "block" }}>Liderança Financeira Alvo</span>
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
              
              {/* ABA 1: Histórico Anual em SVG Dinâmico (Neon Line Chart) */}
              {activeTab === "chart" && (
                <div style={{ position: "relative" }} className="animate-entrance">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <h4 style={{ color: "white", fontSize: "0.95rem", fontWeight: 700 }}>Evolução de Entradas vs Saídas</h4>
                    <span style={{ fontSize: "0.75rem", color: "#a855f7" }}>✨ Gráfico Gerado por IA</span>
                  </div>

                  {/* SVG Chart */}
                  <svg viewBox="0 0 600 200" style={{ width: "100%", height: "200px" }}>
                    <defs>
                      <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Linhas de Grade de Fundo */}
                    <line x1="50" y1="30" x2="550" y2="30" stroke="rgba(255,255,255,0.05)" />
                    <line x1="50" y1="80" x2="550" y2="80" stroke="rgba(255,255,255,0.05)" />
                    <line x1="50" y1="130" x2="550" y2="130" stroke="rgba(255,255,255,0.05)" />
                    <line x1="50" y1="180" x2="550" y2="180" stroke="rgba(255,255,255,0.1)" />

                    {/* Área Sob a Linha de Entradas */}
                    <path
                      d="M 50 180 L 50 130 Q 150 110 250 80 T 450 60 L 550 45 L 550 180 Z"
                      fill="url(#glowGrad)"
                    />

                    {/* Linha Principal de Entradas (Neon Glow) */}
                    <path
                      d="M 50 130 Q 150 110 250 80 T 450 60 L 550 45"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Linha Vermelha de Despesas */}
                    <path
                      d="M 50 160 Q 150 150 250 130 T 450 110 L 550 100"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />

                    {/* Marcadores de Meses (Pontos) */}
                    <circle cx="50" cy="130" r="5" fill="#f97316" />
                    <circle cx="150" cy="115" r="5" fill="#f97316" />
                    <circle cx="250" cy="80" r="5" fill="#f97316" />
                    <circle cx="350" cy="72" r="5" fill="#f97316" />
                    <circle cx="450" cy="60" r="5" fill="#f97316" />
                    <circle cx="550" cy="45" r="5" fill="#f97316" />

                    {/* Legenda X */}
                    <text x="50" y="198" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">Dez</text>
                    <text x="150" y="198" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">Jan</text>
                    <text x="250" y="198" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">Fev</text>
                    <text x="350" y="198" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">Mar</text>
                    <text x="450" y="198" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">Abr</text>
                    <text x="550" y="198" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">Mai</text>

                    {/* Valores Flutuantes em Mai */}
                    <text x="540" y="30" fill="white" fontWeight="800" fontSize="10" textAnchor="end">Mai: R$ 42.500</text>
                  </svg>
                </div>
              )}

              {/* ABA 2: Distribuição de Despesas em Gráfico de Rosca SVG */}
              {activeTab === "distribution" && (
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "2rem", alignItems: "center" }} className="animate-entrance">
                  {/* Rosca SVG */}
                  <svg width="160" height="160" viewBox="0 0 100 100">
                    {/* Fundo da rosca */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                    
                    {/* Aluguel / Operacional (45% - Laranja) */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke="#f97316" 
                      strokeWidth="10" 
                      strokeDasharray="113.1" 
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                    />
                    
                    {/* Missões (35% - Azul) */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke="#0ea5e9" 
                      strokeWidth="10" 
                      strokeDasharray="88" 
                      strokeDashoffset="-113.1"
                      transform="rotate(-90 50 50)"
                    />

                    {/* Ação Social / Outros (20% - Verde) */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke="#10b981" 
                      strokeWidth="10" 
                      strokeDasharray="50.2" 
                      strokeDashoffset="-201.1"
                      transform="rotate(-90 50 50)"
                    />

                    <text x="50" y="54" fill="white" fontWeight="800" fontSize="11" textAnchor="middle">Gerais</text>
                  </svg>

                  {/* Legenda Lateral */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#f97316" }} />
                      <div>
                        <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block" }}>Operacional & Estrutura (45%)</span>
                        <strong style={{ fontSize: "0.9rem", color: "white" }}>{formatCurrency(currentReport.expenses * 0.45)}</strong>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#0ea5e9" }} />
                      <div>
                        <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block" }}>Fundo Missionário & Apoios (35%)</span>
                        <strong style={{ fontSize: "0.9rem", color: "white" }}>{formatCurrency(currentReport.expenses * 0.35)}</strong>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#10b981" }} />
                      <div>
                        <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "block" }}>Ação Social & Comunidade (20%)</span>
                        <strong style={{ fontSize: "0.9rem", color: "white" }}>{formatCurrency(currentReport.expenses * 0.20)}</strong>
                      </div>
                    </div>
                  </div>
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
                        {entry.createdAt || "Hoje"}
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
                        <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 8, color: "rgba(255,255,255,0.6)" }}>
                          {entry.id.includes("whatsapp") ? "📱 WhatsApp Bot" : entry.id.includes("manual") ? "✏️ Lançamento" : "💻 Admin Web"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* Lado Direito: WhatsApp Smartphone Simulator */}
        <aside className="finance-gateway-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, color: "#a855f7" }}>
              <MessageSquare size={14} />
              WhatsApp PIX Gateway
            </span>
            <button 
              onClick={handleResetChat} 
              style={{ background: "none", border: "none", color: "#f97316", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
            >
              Resetar Chat
            </button>
          </div>

          {/* Smartphone Chassis Container */}
          <div
            style={{
              width: "100%",
              height: 640,
              backgroundColor: "#0b141a",
              border: "12px solid #334155",
              borderRadius: 36,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              position: "relative"
            }}
          >
            {/* Notch */}
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 18, backgroundColor: "#334155", borderBottomLeftRadius: 10, borderBottomRightRadius: 10, zIndex: 10 }} />

            {/* Cabeçalho */}
            <div
              style={{
                backgroundColor: "#1f2c34",
                padding: "1.5rem 1rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#f97316", display: "flex", alignItems: "center", justifySelf: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: "0.9rem" }}>
                ⛪
              </div>
              <div>
                <strong style={{ color: "white", fontSize: "0.9rem", display: "block" }}>Alvo Finanças 🤖</strong>
                <span style={{ color: "#81e6a7", fontSize: "0.75rem", display: "block" }}>online</span>
              </div>
            </div>

            {/* Balões do Chat */}
            <div
              style={{
                flex: 1,
                padding: "1rem",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                backgroundSize: "cover"
              }}
            >
              {chatMessages.map((msg, idx) => {
                const isBot = msg.sender === "bot";
                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isBot ? "flex-start" : "flex-end",
                      backgroundColor: isBot ? "#202c33" : "#005c4b",
                      color: "white",
                      padding: "0.75rem 1rem",
                      borderRadius: 14,
                      maxWidth: "85%",
                      fontSize: "0.85rem",
                      lineHeight: "1.3rem",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                      whiteSpace: "pre-wrap",
                      position: "relative"
                    }}
                    className="animate-entrance"
                  >
                    {msg.text}

                    {msg.pixDetails && (
                      <div
                        style={{
                          marginTop: "1rem",
                          backgroundColor: "white",
                          padding: "1rem",
                          borderRadius: 12,
                          textAlign: "center"
                        }}
                      >
                        <img 
                          src={msg.pixDetails.qrCodeUrl} 
                          alt="Pix QR Code" 
                          style={{ width: 130, height: 130, margin: "0 auto" }} 
                        />
                        <span style={{ fontSize: "0.7rem", color: "#1e293b", display: "block", marginTop: 8, fontWeight: 700 }}>
                          PIX Gateway Alvo Church
                        </span>
                        
                        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => copyPixCode(msg.pixDetails!.pixCode)}
                            style={{
                              backgroundColor: "#f97316",
                              color: "white",
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 12px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 4
                            }}
                          >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? "Copiado!" : "Copiar Código Pix"}
                          </button>

                          {!msg.isConfirmed && (
                            <button
                              type="button"
                              onClick={handleSimulatePayment}
                              style={{
                                backgroundColor: "#8b5cf6",
                                color: "white",
                                border: "none",
                                borderRadius: 8,
                                padding: "8px 12px",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                cursor: "pointer",
                                boxShadow: "0 4px 6px rgba(139, 92, 246, 0.2)"
                              }}
                            >
                              ⚡ Simular Depósito PIX
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <span style={{ display: "block", textAlign: "right", fontSize: "0.65rem", opacity: 0.5, marginTop: 4 }}>
                      {msg.timestamp}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Digitação */}
            {currentStep !== "done" ? (
              <form
                onSubmit={handleSendMessage}
                style={{
                  backgroundColor: "#1f2c34",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  gap: 8,
                  alignItems: "center"
                }}
              >
                <input
                  type="text"
                  placeholder={
                    currentStep === "choose" 
                      ? "Digite 1 ou 2..." 
                      : "Digite o valor da doação..."
                  }
                  style={{
                    flex: 1,
                    backgroundColor: "#2a3942",
                    border: "none",
                    borderRadius: 20,
                    padding: "8px 16px",
                    color: "white",
                    fontSize: "0.85rem",
                    outline: "none"
                  }}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: "#00a884",
                    border: "none",
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    cursor: "pointer"
                  }}
                >
                  <Send size={16} />
                </button>
              </form>
            ) : (
              <div
                style={{
                  backgroundColor: "#1f2c34",
                  padding: "1rem",
                  textAlign: "center"
                }}
              >
                <button
                  onClick={handleResetChat}
                  style={{
                    backgroundColor: "#00a884",
                    color: "white",
                    border: "none",
                    borderRadius: 12,
                    padding: "8px 16px",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  Contribuir Novamente
                </button>
              </div>
            )}
          </div>

          {/* Info Badge */}
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              padding: "1rem",
              borderRadius: 16,
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.5)",
              display: "flex",
              gap: 8,
              alignItems: "center"
            }}
          >
            <Sparkles size={16} style={{ color: "#f97316", flexShrink: 0 }} />
            <span>Navegue pelo fluxo do chat digitando valores ou use o botão roxo para simular a compensação bancária e ver o caixa atualizar instantaneamente.</span>
          </div>

        </aside>

      </section>
    </main>
  );
}

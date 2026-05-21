"use client";

import { useState, useEffect } from "react";
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
  PieChart,
  Plus,
  Send,
  MessageSquare,
  Sparkles,
  Smartphone,
  Copy,
  Check
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { fetchFinancialTransparencyReports } from "@alvo/firebase";
import type { FinancialTransparencyReport } from "@alvo/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

// Mock inicial
const initialMockReports: FinancialTransparencyReport[] = [
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
      { id: "e1", category: "Entrada", label: "Dízimos e Ofertas", amount: 38000.00, note: "" },
      { id: "e2", category: "Entrada", label: "Oferta de Missões", amount: 4500.80, note: "" },
      { id: "e3", category: "Saída", label: "Aluguel e IPTU", amount: 8500.00, note: "" },
      { id: "e4", category: "Saída", label: "Energia e Água", amount: 1200.40, note: "" },
      { id: "e5", category: "Missões", label: "Base Missionária Sertão", amount: 3000.00, note: "" },
    ]
  } as unknown as FinancialTransparencyReport
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
  const { configured, firebaseConfig, organizationId } = useAppAuth();
  
  // Estados Reativos Principais
  const [reports, setReports] = useState<FinancialTransparencyReport[]>(initialMockReports);
  const [status, setStatus] = useState("Carregando balancetes...");
  const [filterQuery, setFilterQuery] = useState("");

  // Estado do Simulador de WhatsApp
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: "Olá! Sou o Assistente Financeiro Inteligente da Alvo Church. 🤖✨\n\nComo posso abençoar o seu dia hoje?\n\nDigite [1] para contribuir com Dízimos ou [2] para Ofertas de Missões.",
      timestamp: "09:30"
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [currentStep, setCurrentStep] = useState<"choose" | "amount" | "pix" | "done">("choose");
  const [selectedCategory, setSelectedCategory] = useState<"Dízimos" | "Missões">("Dízimos");
  const [activeValue, setActiveValue] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!configured) return;

    async function loadFinance() {
      try {
        const nextReports = await fetchFinancialTransparencyReports(firebaseConfig, { organizationId }, 12);
        setReports(nextReports.length > 0 ? nextReports : initialMockReports);
        setStatus("Dados financeiros sincronizados.");
      } catch (error) {
        setReports(initialMockReports);
        setStatus("Exibindo dados demonstrativos.");
      }
    }
    void loadFinance();
  }, [configured, firebaseConfig, organizationId]);

  const currentReport = reports[0] || initialMockReports[0];

  // Filtra lançamentos do extrato
  const filteredEntries = currentReport.entries.filter(entry => 
    entry.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
    entry.category.toLowerCase().includes(filterQuery.toLowerCase())
  );

  // Manipulador do chat WhatsApp
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal.trim();
    const nowTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // 1. Mensagem do usuário
    const userMsg: ChatMessage = {
      sender: "user",
      text: userText,
      timestamp: nowTime
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputVal("");

    // 2. Fluxo da IA do Bot
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
      // Marca o último card de pix como confirmado
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

    // 2. Atualiza a planilha e o caixa da igreja reativamente na mesma tela!
    setReports(prevReports => {
      const updated = prevReports.map(rep => {
        const newEntry = {
          id: `entry_whatsapp_${Date.now()}`,
          category: selectedCategory === "Dízimos" ? "Entrada" : "Missões",
          label: `${selectedCategory === "Dízimos" ? "Dízimo" : "Oferta"} via WhatsApp - Alexandre Costa`,
          amount: activeValue,
          note: "Aprovado via Gateway Instantâneo PIX IA"
        };
        const nextIncome = rep.income + activeValue;
        const nextBalance = rep.balance + activeValue;
        const nextMissions = selectedCategory === "Missões" ? rep.missions + activeValue : rep.missions;

        return {
          ...rep,
          income: nextIncome,
          balance: nextBalance,
          missions: nextMissions,
          entries: [newEntry, ...rep.entries]
        };
      });
      return updated;
    });

    // Finaliza fluxo e zera estados do chat
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
    <main className="finance-workbench animate-entrance" style={{ maxWidth: 1400, padding: "2rem" }}>
      <header className="topbar">
        <div className="topbar-content">
          <p className="eyebrow" style={{ color: "#f97316" }}>Fase 3: Operações & Gateway PIX</p>
          <h1>Finanças Alvo</h1>
          <p>Visão clara de recursos e portal interativo de doações inteligentes por IA.</p>
        </div>
        <div className="topbar-actions">
           <button className="ghost-button compact">
             <Download size={16} /> Exportar PDF
           </button>
           <button className="primary-button compact">
             <Plus size={16} /> Lançamento Manual
           </button>
        </div>
      </header>

      {/* Grid Principal de 3 Colunas: Métricas + Extrato + Simulador do Chat */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "2.5rem", marginTop: "2rem" }}>
        
        {/* Lado Esquerdo: Métricas Consolidadas e Lançamentos */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Card Principal de Caixa e Indicadores */}
          <div className="finance-main-card antigravity-float" style={{ width: "100%" }}>
            <div className="card-header">
               <div className="month-selector">
                 <Calendar size={18} />
                 <strong>{currentReport.month}</strong>
               </div>
               <div className="status-pill published">Relatório Consolidado</div>
            </div>
            
            <div className="main-metrics">
              <div className="metric-primary">
                <span>Arrecadação Total</span>
                <strong>{formatCurrency(currentReport.income)}</strong>
                <div className="trend up">
                  <ArrowUpRight size={14} /> 12.8% vs mês anterior
                </div>
              </div>
              <div className="metric-primary">
                <span>Saldo Operacional</span>
                <strong style={{ color: "#f97316" }}>{formatCurrency(currentReport.balance)}</strong>
                <p style={{ opacity: 0.6, fontSize: "0.85rem", marginTop: 4 }}>Saldo disponível para investimento local</p>
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

          {/* Lista de Extrato de Lançamentos */}
          <section className="finance-entries-panel" style={{ margin: 0, width: "100%" }}>
            <div className="section-header">
               <h2>Extrato de Lançamentos</h2>
               <div className="filter-row">
                 <div className="search-box-compact">
                   <Filter size={14} />
                   <input 
                     placeholder="Filtrar lançamentos..." 
                     value={filterQuery}
                     onChange={e => setFilterQuery(e.target.value)}
                   />
                 </div>
               </div>
            </div>

            <div className="entries-table-wrapper">
              <table className="entries-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Canal</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => (
                    <tr key={entry.id} className="animate-entrance">
                      <td style={{ fontSize: "0.85rem", color: "var(--alvo-ink-soft)" }}>Hoje</td>
                      <td>
                        <span className={`entry-badge ${entry.category === 'Entrada' ? 'income' : entry.category === 'Missões' ? 'missions' : 'expense'}`}>
                          {entry.category}
                        </span>
                      </td>
                      <td>
                        <strong>{entry.label}</strong>
                        {entry.note && <p className="entry-note" style={{ color: "#8b5cf6", fontWeight: 600 }}>✨ {entry.note}</p>}
                      </td>
                      <td>
                        <b className={entry.category === 'Entrada' || entry.category === 'Missões' ? 'text-income' : 'text-expense'}>
                          {entry.category === 'Entrada' || entry.category === 'Missões' ? '+ ' : '- '}
                          {formatCurrency(entry.amount)}
                        </b>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 8 }}>
                          {entry.id.includes("whatsapp") ? "📱 WhatsApp Bot" : "💻 Admin Web"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* Lado Direito: Simulador Smartphone WhatsApp de Doações */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, color: "#8b5cf6" }}>
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
              backgroundColor: "#0b141a", // Fundo do WhatsApp Dark
              border: "12px solid #334155",
              borderRadius: 36,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              position: "relative"
            }}
          >
            {/* Telefone Notch/Câmera */}
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 18, backgroundColor: "#334155", borderBottomLeftRadius: 10, borderBottomRightRadius: 10, zIndex: 10 }} />

            {/* Cabeçalho do WhatsApp */}
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
              <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#d27836", display: "flex", alignItems: "center", justifySelf: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: "0.9rem" }}>
                ⛪
              </div>
              <div>
                <strong style={{ color: "white", fontSize: "0.9rem", display: "block" }}>Alvo Assistente 🤖</strong>
                <span style={{ color: "#81e6a7", fontSize: "0.75rem", display: "block" }}>online</span>
              </div>
            </div>

            {/* Área de Mensagens do Chat */}
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

                    {/* Exibe o QR Code PIX se estiver disponível */}
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
                          style={{ width: 140, height: 140, margin: "0 auto" }} 
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
                              ⚡ Confirmar Pagamento pelo Banco
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

            {/* Barra de Digitação */}
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
                  Fazer Nova Contribuição
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

      <style jsx global>{`
        .finance-workbench {
          padding: 2rem;
          margin: 0 auto;
        }
        .finance-main-card {
          background: #111827;
          color: white;
          padding: 2.5rem;
          border-radius: 2.5rem;
          box-shadow: var(--alvo-shadow-strong);
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          background: radial-gradient(circle at top right, rgba(249, 115, 22, 0.15), transparent), #111827;
        }
        .card-header { display: flex; justify-content: space-between; align-items: center; }
        .month-selector { display: flex; align-items: center; gap: 0.75rem; background: rgba(255,255,255,0.1); padding: 0.5rem 1rem; border-radius: 12px; }
        .status-pill.published { background: #16a34a; color: white; padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
        
        .main-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .metric-primary span { font-size: 0.875rem; color: rgba(255,255,255,0.6); display: block; margin-bottom: 0.5rem; }
        .metric-primary strong { font-size: 3rem; line-height: 1; letter-spacing: -0.04em; }
        .trend { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; margin-top: 0.5rem; }
        .trend.up { color: #4ade80; }
 
        .mini-stats { display: flex; gap: 2rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 2rem; }
        .mini-stat { display: flex; align-items: center; gap: 0.75rem; }
        .mini-stat small { display: block; color: rgba(255,255,255,0.5); font-size: 0.75rem; }
        .mini-stat b { font-size: 1.125rem; }
 
        .finance-entries-panel { background: white; border-radius: 2.5rem; padding: 2.5rem; border: 1px solid var(--alvo-line); }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .search-box-compact { display: flex; align-items: center; gap: 0.5rem; background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 12px; width: 300px; }
        .search-box-compact input { border: none; background: transparent; outline: none; font-size: 0.875rem; width: 100%; }
 
        .entries-table { width: 100%; border-collapse: collapse; }
        .entries-table th { text-align: left; padding: 1rem; border-bottom: 2px solid #f1f5f9; font-size: 0.75rem; text-transform: uppercase; color: var(--alvo-ink-soft); }
        .entries-table td { padding: 1.25rem 1rem; border-bottom: 1px solid #f1f5f9; }
        
        .entry-badge { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
        .entry-badge.income { background: #dcfce7; color: #166534; }
        .entry-badge.expense { background: #fee2e2; color: #991b1b; }
        .entry-badge.missions { background: #e0f2fe; color: #0369a1; }
        
        .text-income { color: #16a34a; }
        .text-expense { color: #dc2626; }
        .entry-note { font-size: 0.8125rem; color: var(--alvo-ink-soft); margin-top: 2px; }
      `}</style>
    </main>
  );
}

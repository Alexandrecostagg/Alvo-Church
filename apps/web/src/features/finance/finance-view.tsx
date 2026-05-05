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
  Plus
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

// Mock fallback
const mockReports: FinancialTransparencyReport[] = [
  {
    id: "rep_may_2026",
    organizationId: "org_alvo",
    month: "Maio 2026",
    income: 42500.80,
    expenses: 18200.40,
    missions: 4250.00,
    balance: 20050.40,
    status: "published",
    publishedAt: "2026-05-01T10:00:00Z",
    entries: [
      { id: "e1", category: "Entrada", label: "Dízimos e Ofertas", amount: 38000.00, note: "" },
      { id: "e2", category: "Entrada", label: "Oferta de Missões", amount: 4500.80, note: "" },
      { id: "e3", category: "Saída", label: "Aluguel e IPTU", amount: 8500.00, note: "" },
      { id: "e4", category: "Saída", label: "Energia e Água", amount: 1200.40, note: "" },
      { id: "e5", category: "Missões", label: "Base Missionária Sertão", amount: 3000.00, note: "" },
    ]
  } as FinancialTransparencyReport
];

export function FinanceView() {
  const { configured, firebaseConfig, organizationId } = useAppAuth();
  const [reports, setReports] = useState<FinancialTransparencyReport[]>([]);
  const [status, setStatus] = useState("Carregando balancetes...");

  useEffect(() => {
    if (!configured) return;

    async function loadFinance() {
      try {
        const nextReports = await fetchFinancialTransparencyReports(firebaseConfig, { organizationId }, 12);
        setReports(nextReports.length > 0 ? nextReports : mockReports);
        setStatus("Dados financeiros sincronizados.");
      } catch (error) {
        setReports(mockReports);
        setStatus("Exibindo dados demonstrativos.");
      }
    }
    void loadFinance();
  }, [configured, firebaseConfig, organizationId]);

  const currentReport = reports[0] || mockReports[0];

  return (
    <main className="finance-workbench animate-entrance">
      <header className="topbar">
        <div className="topbar-content">
          <p className="eyebrow">Gestão e Transparência</p>
          <h1>Finanças Alvo</h1>
          <p>Visão clara e responsável de cada recurso investido no Reino.</p>
        </div>
        <div className="topbar-actions">
           <button className="ghost-button compact">
             <Download size={16} /> Exportar PDF
           </button>
           <button className="primary-button compact">
             <Plus size={16} /> Novo Lançamento
           </button>
        </div>
      </header>

      <section className="finance-dashboard-grid">
        <div className="finance-main-card antigravity-float">
          <div className="card-header">
             <div className="month-selector">
               <Calendar size={18} />
               <strong>{currentReport.month}</strong>
             </div>
             <div className="status-pill published">Relatório Publicado</div>
          </div>
          
          <div className="main-metrics">
            <div className="metric-primary">
              <span>Arrecadação Total</span>
              <strong>{formatCurrency(currentReport.income)}</strong>
              <div className="trend up">
                <ArrowUpRight size={14} /> 12% vs mês anterior
              </div>
            </div>
            <div className="metric-primary">
              <span>Saldo Operacional</span>
              <strong style={{ color: "var(--alvo-accent)" }}>{formatCurrency(currentReport.balance)}</strong>
              <p>Disponível em caixa</p>
            </div>
          </div>

          <div className="mini-stats">
             <div className="mini-stat">
               <TrendingDown size={16} color="#ef4444" />
               <div>
                 <small>Saídas</small>
                 <b>{formatCurrency(currentReport.expenses)}</b>
               </div>
             </div>
             <div className="mini-stat">
               <Globe size={16} color="#0284c7" />
               <div>
                 <small>Missões</small>
                 <b>{formatCurrency(currentReport.missions)}</b>
               </div>
             </div>
             <div className="mini-stat">
               <Wallet size={16} color="#16a34a" />
               <div>
                 <small>Reserva</small>
                 <b>{formatCurrency(currentReport.income * 0.1)}</b>
               </div>
             </div>
          </div>
        </div>

        <aside className="finance-side-panels">
          <div className="panel-card pie-summary">
            <h3>Distribuição de Gastos</h3>
            <div className="pie-placeholder">
               <PieChart size={64} opacity={0.2} />
               <p>Visualização Gráfica em breve</p>
            </div>
            <ul className="category-list">
              <li><span className="dot" style={{background: "#f97316"}}></span> Manutenção 45%</li>
              <li><span className="dot" style={{background: "#0ea5e9"}}></span> Missões 15%</li>
              <li><span className="dot" style={{background: "#8b5cf6"}}></span> Eventos 20%</li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="finance-entries-panel">
        <div className="section-header">
           <h2>Extrato Detalhado</h2>
           <div className="filter-row">
             <div className="search-box-compact">
               <Filter size={14} />
               <input placeholder="Filtrar por categoria ou descrição..." />
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
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentReport.entries.map(entry => (
                <tr key={entry.id}>
                  <td>05/05/2026</td>
                  <td>
                    <span className={`entry-badge ${entry.category === 'Entrada' ? 'income' : entry.category === 'Missões' ? 'missions' : 'expense'}`}>
                      {entry.category}
                    </span>
                  </td>
                  <td>
                    <strong>{entry.label}</strong>
                    {entry.note && <p className="entry-note">{entry.note}</p>}
                  </td>
                  <td>
                    <b className={entry.category === 'Entrada' ? 'text-income' : 'text-expense'}>
                      {entry.category === 'Entrada' ? '+ ' : '- '}
                      {formatCurrency(entry.amount)}
                    </b>
                  </td>
                  <td><div className="status-dot-active"></div> Confirmado</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .finance-workbench {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .finance-dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 1.5rem;
          margin-top: 2rem;
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

        .mini-stats { display: flex; gap: 2rem; border-top: 1px solid rgba(255,255,255,0.1); pt-1.5rem; padding-top: 2rem; }
        .mini-stat { display: flex; align-items: center; gap: 0.75rem; }
        .mini-stat small { display: block; color: rgba(255,255,255,0.5); font-size: 0.75rem; }
        .mini-stat b { font-size: 1.125rem; }

        .panel-card { background: white; border-radius: 2rem; padding: 1.5rem; border: 1px solid var(--alvo-line); }
        .pie-placeholder { height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: var(--alvo-ink-soft); }
        .category-list { list-style: none; padding: 0; margin-top: 1rem; }
        .category-list li { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
        .dot { width: 8px; height: 8px; border-radius: 50%; }

        .finance-entries-panel { background: white; border-radius: 2.5rem; padding: 2.5rem; margin-top: 2rem; border: 1px solid var(--alvo-line); }
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
        .status-dot-active { width: 8px; height: 8px; background: #16a34a; border-radius: 50%; display: inline-block; margin-right: 4px; }

        @media (max-width: 1024px) {
          .finance-dashboard-grid { grid-template-columns: 1fr; }
          .main-metrics { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { 
  QrCode, 
  ShieldCheck, 
  Baby, 
  Search, 
  CheckCircle2, 
  X, 
  Camera, 
  Scan, 
  ArrowLeft,
  Users,
  Clock,
  UserCheck,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useAppAuth } from "../../../app/providers";

// Mock data for the leader
const checkedInKids = [
  { id: "child_2", name: "Ana Beatriz", age: 3, photo: "", status: "checked_in", checkInTime: "18:30", parentName: "Michelle Oliveira" },
  { id: "child_3", name: "Gabriel Souza", age: 6, photo: "", status: "checked_in", checkInTime: "18:45", parentName: "Carlos Souza" },
];

const authorizedGuardians = {
  "child_2": ["Michelle Oliveira", "Ricardo Silva"],
  "child_3": ["Carlos Souza"]
};

export function KidsLeaderView() {
  const { user } = useAppAuth();
  const [view, setView] = useState<"list" | "scan" | "checkout">("list");
  const [search, setSearch] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedChild, setScannedChild] = useState<any>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<"pending" | "success" | "error" | null>(null);

  const filteredKids = checkedInKids.filter(k => 
    k.name.toLowerCase().includes(search.toLowerCase()) || 
    k.parentName.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartScan = () => {
    setView("scan");
    setIsScanning(true);
    // Simulate scan after 2 seconds
    setTimeout(() => {
      setIsScanning(false);
      setScannedChild(checkedInKids[0]); // Simulate scanning Ana Beatriz
    }, 2000);
  };

  const handleCheckout = () => {
    setCheckoutStatus("pending");
    setTimeout(() => {
      setCheckoutStatus("success");
      setTimeout(() => {
        setView("list");
        setScannedChild(null);
        setCheckoutStatus(null);
      }, 1500);
    }, 1000);
  };

  return (
    <main className="kids-leader-workbench animate-entrance">
      <header className="topbar">
        <div className="topbar-content">
          <Link href="/dashboard" className="back-link">
             <ArrowLeft size={16} /> Voltar
          </Link>
          <h1>Operação Kids Alvo</h1>
          <p className="eyebrow">Painel do Líder de Escolinha</p>
        </div>
        <div className="topbar-actions">
           <div className="status-pill online">
             <span className="live-pulse"></span>
             Sistema de Segurança Ativo
           </div>
        </div>
      </header>

      {view === "list" && (
        <section className="kids-dashboard">
          <div className="kids-stats-row">
            <div className="stat-card-premium">
              <Baby size={24} />
              <strong>{checkedInKids.length}</strong>
              <span>Crianças Presentes</span>
            </div>
            <div className="stat-card-premium">
              <Users size={24} />
              <strong>12</strong>
              <span>Vagas Disponíveis</span>
            </div>
            <button className="scan-trigger-card antigravity-float" onClick={handleStartScan}>
              <Scan size={32} />
              <strong>Escanear Token</strong>
              <span>Check-in ou Retirada</span>
            </button>
          </div>

          <div className="kids-inventory-panel">
            <div className="panel-header">
              <h2>Lista de Presença</h2>
              <div className="search-bar-compact">
                <Search size={16} />
                <input 
                  placeholder="Buscar criança ou responsável..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="kids-table-wrapper">
              <table className="kids-table">
                <thead>
                  <tr>
                    <th>Criança</th>
                    <th>Responsável</th>
                    <th>Entrada</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKids.map(kid => (
                    <tr key={kid.id}>
                      <td>
                        <div className="kid-cell">
                          <div className="avatar-small"><Baby size={16} /></div>
                          <div>
                            <strong>{kid.name}</strong>
                            <small>{kid.age} anos</small>
                          </div>
                        </div>
                      </td>
                      <td>{kid.parentName}</td>
                      <td>
                        <div className="time-cell">
                          <Clock size={12} /> {kid.checkInTime}
                        </div>
                      </td>
                      <td>
                        <span className="badge-success">Checked-in</span>
                      </td>
                      <td>
                        <button className="action-button-small" onClick={() => {
                          setScannedChild(kid);
                          setView("checkout");
                        }}>
                          Retirada
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {view === "scan" && (
        <section className="scanner-overlay">
          <div className="scanner-container">
            <div className="scanner-viewfinder">
               {isScanning ? (
                 <div className="scan-animation">
                   <div className="scan-line"></div>
                   <p>Buscando QR Code...</p>
                 </div>
               ) : scannedChild ? (
                 <div className="scan-result-preview animate-entrance">
                   <div className="success-icon-large"><CheckCircle2 size={48} /></div>
                   <h2>Token Validado!</h2>
                   <p>Criança identificada: <strong>{scannedChild.name}</strong></p>
                   <button className="primary-button" onClick={() => setView("checkout")}>
                     Prosseguir para Retirada
                   </button>
                 </div>
               ) : (
                 <div className="scanner-idle">
                    <Camera size={48} opacity={0.3} />
                    <p>Câmera desativada</p>
                 </div>
               )}
            </div>
            <button className="close-scanner" onClick={() => setView("list")}>
              <X size={24} />
            </button>
          </div>
        </section>
      )}

      {view === "checkout" && scannedChild && (
        <section className="checkout-screen animate-entrance">
          <div className="checkout-card antigravity-float">
            <div className="checkout-header">
              <ShieldCheck size={32} color="#16a34a" />
              <h1>Protocolo de Retirada</h1>
            </div>

            <div className="checkout-body">
              <div className="checkout-section">
                <p className="eyebrow">Criança</p>
                <div className="entity-summary">
                  <div className="avatar-medium"><Baby size={24} /></div>
                  <div>
                    <strong>{scannedChild.name}</strong>
                    <span>{scannedChild.age} anos • Sala 02</span>
                  </div>
                </div>
              </div>

              <div className="checkout-section">
                <p className="eyebrow">Responsáveis Autorizados</p>
                <div className="guardians-list">
                  {authorizedGuardians[scannedChild.id as keyof typeof authorizedGuardians].map(g => (
                    <div key={g} className="guardian-item">
                       <UserCheck size={16} />
                       <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="security-alert">
                 <AlertTriangle size={16} />
                 <p>Confirme a identidade visual do responsável antes de liberar.</p>
              </div>
            </div>

            <div className="checkout-footer">
              {checkoutStatus === "success" ? (
                <div className="checkout-success animate-entrance">
                   <CheckCircle2 size={24} />
                   <span>Retirada Confirmada!</span>
                </div>
              ) : (
                <div className="action-row">
                  <button className="ghost-button" onClick={() => setView("list")}>Cancelar</button>
                  <button 
                    className="primary-button" 
                    onClick={handleCheckout}
                    disabled={checkoutStatus === "pending"}
                  >
                    {checkoutStatus === "pending" ? "Processando..." : "Confirmar Entrega"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <style jsx>{`
        .kids-leader-workbench {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .kids-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stat-card-premium {
          background: white;
          padding: 1.5rem;
          border-radius: 1.5rem;
          border: 1px solid var(--alvo-line);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .stat-card-premium strong { font-size: 2.5rem; line-height: 1; }
        .stat-card-premium span { font-size: 0.875rem; color: var(--alvo-ink-soft); font-weight: 600; }
        
        .scan-trigger-card {
          background: linear-gradient(135deg, var(--alvo-accent) 0%, #9a3412 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 1.5rem;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .scan-trigger-card:hover { transform: scale(1.02); }

        .kids-inventory-panel {
          background: white;
          border-radius: 2rem;
          padding: 2rem;
          border: 1px solid var(--alvo-line);
          box-shadow: var(--alvo-shadow);
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .search-bar-compact {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f1f5f9;
          padding: 0.5rem 1rem;
          border-radius: 999px;
          width: 320px;
        }
        .search-bar-compact input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          font-size: 0.875rem;
        }

        .kids-table {
          width: 100%;
          border-collapse: collapse;
        }
        .kids-table th {
          text-align: left;
          padding: 1rem;
          border-bottom: 2px solid #f1f5f9;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--alvo-ink-soft);
        }
        .kids-table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .kid-cell { display: flex; align-items: center; gap: 0.75rem; }
        .avatar-small { width: 32px; height: 32px; border-radius: 8px; background: #f1f5f9; display: grid; place-items: center; color: var(--alvo-accent); }
        .kid-cell strong { display: block; font-size: 0.9375rem; }
        .kid-cell small { color: var(--alvo-ink-soft); font-size: 0.8125rem; }

        .time-cell { display: flex; align-items: center; gap: 0.4rem; color: var(--alvo-ink-soft); font-size: 0.875rem; }
        .badge-success { background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
        
        .action-button-small {
          background: white;
          border: 1px solid var(--alvo-line);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
        }
        .action-button-small:hover { background: #f8fafc; border-color: var(--alvo-accent); color: var(--alvo-accent); }

        /* Scanner */
        .scanner-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .scanner-container {
          width: 100%;
          max-width: 500px;
          position: relative;
        }
        .scanner-viewfinder {
          background: #000;
          aspect-ratio: 1;
          border-radius: 2rem;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 4px solid rgba(255,255,255,0.1);
        }
        .scan-animation { text-align: center; color: white; }
        .scan-line {
          width: 100%;
          height: 2px;
          background: var(--alvo-accent);
          position: absolute;
          top: 0;
          box-shadow: 0 0 20px var(--alvo-accent);
          animation: scanLine 2s infinite;
        }
        @keyframes scanLine {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        
        .scan-result-preview { text-align: center; color: white; padding: 2rem; }
        .success-icon-large { margin-bottom: 1.5rem; color: #22c55e; }
        
        .close-scanner {
          position: absolute;
          top: -4rem;
          right: 0;
          background: white;
          border: none;
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          cursor: pointer;
        }

        /* Checkout */
        .checkout-screen {
          display: flex;
          justify-content: center;
          padding: 2rem 0;
        }
        .checkout-card {
          background: white;
          width: 100%;
          max-width: 500px;
          padding: 2.5rem;
          border-radius: 2.5rem;
          box-shadow: var(--alvo-shadow-strong);
        }
        .checkout-header { text-align: center; margin-bottom: 2rem; }
        .checkout-header h1 { font-size: 1.75rem; margin-top: 1rem; }
        
        .checkout-section { margin-bottom: 2rem; }
        .entity-summary { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f8fafc; border-radius: 1rem; }
        .avatar-medium { width: 48px; height: 48px; border-radius: 12px; background: white; display: grid; place-items: center; color: var(--alvo-accent); }
        
        .guardians-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .guardian-item { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border: 1.5px dashed #cbd5e1; border-radius: 1rem; color: var(--alvo-ink-bold); font-weight: 700; }
        
        .security-alert { display: flex; gap: 0.75rem; padding: 1rem; background: #fff7ed; color: #9a3412; border-radius: 1rem; font-size: 0.875rem; font-weight: 600; }
        
        .checkout-success { display: flex; align-items: center; gap: 0.75rem; color: #16a34a; font-weight: 900; justify-content: center; width: 100%; }
        .action-row { display: flex; gap: 1rem; }
      `}</style>
    </main>
  );
}

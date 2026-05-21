"use client";

import { useState, useEffect, useMemo } from "react";
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
  AlertTriangle,
  Plus,
  FileText,
  UserX,
  Activity,
  Heart,
  Volume2
} from "lucide-react";
import Link from "next/link";
import { useAppAuth } from "../../../app/providers";

interface KidRecord {
  id: string;
  name: string;
  age: number;
  photo: string;
  status: "checked_in" | "checked_out";
  checkInTime: string;
  parentName: string;
  allergies?: string;
  securityRestrictions?: string;
}

export function KidsLeaderView() {
  const { user } = useAppAuth();
  
  // Interactive Kids presence states
  const [kidsList, setKidsList] = useState<KidRecord[]>([
    { 
      id: "child_1", 
      name: "Ana Beatriz Oliveira", 
      age: 3, 
      photo: "", 
      status: "checked_in", 
      checkInTime: "18:30", 
      parentName: "Michelle Oliveira",
      allergies: "Alergia severa a lactose",
      securityRestrictions: "Apenas pais biológicos podem retirar"
    },
    { 
      id: "child_2", 
      name: "Gabriel Souza Costa", 
      age: 6, 
      photo: "", 
      status: "checked_in", 
      checkInTime: "18:45", 
      parentName: "Carlos Souza",
      allergies: "Nenhuma",
      securityRestrictions: "Nenhuma"
    },
  ]);

  // Kids Security Incident & Movement logs
  const [securityLogs, setSecurityLogs] = useState([
    { time: "18:30", text: "Check-in: Ana Beatriz Oliveira autorizada por Michelle Oliveira.", type: "success" },
    { time: "18:45", text: "Check-in: Gabriel Souza Costa autorizado por Carlos Souza.", type: "success" }
  ]);

  const [view, setView] = useState<"list" | "scan" | "checkout" | "checkin">("list");
  const [search, setSearch] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedChild, setScannedChild] = useState<KidRecord | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<"pending" | "success" | "error" | null>(null);

  // New check-in state
  const [newKidDraft, setNewKidDraft] = useState({
    name: "",
    age: "",
    parentName: "",
    allergies: "",
    securityRestrictions: ""
  });

  const [scanSoundVisual, setScanSoundVisual] = useState(false);

  const filteredKids = kidsList.filter(k => 
    k.name.toLowerCase().includes(search.toLowerCase()) || 
    k.parentName.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartScan = () => {
    setView("scan");
    setIsScanning(true);
    // Simulate scan after 2 seconds
    setTimeout(() => {
      setIsScanning(false);
      setScanSoundVisual(true);
      // Select the first kid on scan
      setScannedChild(kidsList[0]); 
      
      // Turn off scan success sound visual after 1s
      setTimeout(() => {
        setScanSoundVisual(false);
      }, 1000);
    }, 2000);
  };

  const handleCheckout = () => {
    if (!scannedChild) return;
    setCheckoutStatus("pending");
    setTimeout(() => {
      setCheckoutStatus("success");
      
      // Update local list status
      setKidsList(prev => prev.map(k => k.id === scannedChild.id ? { ...k, status: "checked_out" } : k));
      
      // Log audit action
      const timeString = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setSecurityLogs(prev => [
        { time: timeString, text: `Retirada: ${scannedChild.name} foi retirado(a) por ${scannedChild.parentName}.`, type: "success" },
        ...prev
      ]);

      setTimeout(() => {
        setView("list");
        setScannedChild(null);
        setCheckoutStatus(null);
      }, 1500);
    }, 1000);
  };

  const handleCheckinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKidDraft.name || !newKidDraft.parentName || !newKidDraft.age) return;

    const timeString = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const newKid: KidRecord = {
      id: `child_${Date.now()}`,
      name: newKidDraft.name,
      age: parseInt(newKidDraft.age),
      photo: "",
      status: "checked_in",
      checkInTime: timeString,
      parentName: newKidDraft.parentName,
      allergies: newKidDraft.allergies || "Nenhuma",
      securityRestrictions: newKidDraft.securityRestrictions || "Nenhuma"
    };

    setKidsList(prev => [newKid, ...prev]);
    setSecurityLogs(prev => [
      { time: timeString, text: `Check-in: ${newKid.name} cadastrado e autorizado por ${newKid.parentName}.`, type: "success" },
      ...prev
    ]);

    setNewKidDraft({
      name: "",
      age: "",
      parentName: "",
      allergies: "",
      securityRestrictions: ""
    });
    
    setView("list");
  };

  const activeCheckedInCount = kidsList.filter(k => k.status === "checked_in").length;

  return (
    <main className="kids-leader-workbench" style={{ background: "#070c14", color: "#f8fafc", minHeight: "100vh", padding: "2rem" }}>
      
      {/* HEADER TOPBAR (Futuristic Security Style) */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1.5rem", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <Link href="/" style={{ color: "#f97316", textDecoration: "none", fontSize: "0.85rem", fontWeight: 800 }}>
            ← Voltar ao painel principal
          </Link>
          <p className="eyebrow" style={{ color: "#f97316", marginTop: "1rem" }}>Lounge Kids & Segurança Ativa</p>
          <h1 style={{ color: "white", fontSize: "2rem", fontWeight: 950, letterSpacing: "-0.03em", margin: "4px 0" }}>
            Operação Kids Alvo
          </h1>
        </div>
        <div>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "20px", padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", color: "#10b981", fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, background: "#10b981", borderRadius: "50%", display: "inline-block", animation: "pulse 2s infinite" }}></span>
            Rede Kids Protegida e Criptografada
          </div>
        </div>
      </header>

      {/* DASHBOARD PRINCIPAL LIST */}
      {view === "list" && (
        <section className="kids-dashboard">
          
          {/* STATS & QUICK ACTIONS ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
            <div style={{ background: "rgba(30, 41, 59, 0.25)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "20px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase" }}>Presentes Agora</span>
              <strong style={{ fontSize: "2rem", color: "white" }}>{activeCheckedInCount}</strong>
              <p style={{ color: "#64748b", fontSize: "0.7rem" }}>crianças sob cuidado pastoral</p>
            </div>
            
            <div style={{ background: "rgba(30, 41, 59, 0.25)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "20px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase" }}>Vagas das Salas</span>
              <strong style={{ fontSize: "2rem", color: "white" }}>15</strong>
              <p style={{ color: "#64748b", fontSize: "0.7rem" }}>capacidade técnica recomendada</p>
            </div>

            <button 
              onClick={() => setView("checkin")}
              style={{ background: "rgba(249, 115, 22, 0.15)", border: "1px solid rgba(249, 115, 22, 0.25)", color: "white", borderRadius: "20px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 4, textAlign: "left", cursor: "pointer" }}
            >
              <Plus size={24} style={{ color: "#f97316" }} />
              <strong style={{ fontSize: "1.1rem", marginTop: 4 }}>Check-in Lounge</strong>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Cadastrar nova criança de entrada</span>
            </button>

            <button 
              onClick={handleStartScan}
              style={{ background: "#f97316", border: "none", color: "white", borderRadius: "20px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 4, textAlign: "left", cursor: "pointer" }}
            >
              <Scan size={24} />
              <strong style={{ fontSize: "1.1rem", marginTop: 4 }}>Escanear Token QR</strong>
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.8)" }}>Validar saída/retirada segura</span>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
            
            {/* TABELA DE PRESENTES */}
            <article style={{ background: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "24px", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <h2 style={{ fontSize: "1.25rem", color: "white", fontWeight: 800, margin: 0 }}>Crianças Ativas nas Salas</h2>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                  <input 
                    placeholder="Filtrar criança ou responsável..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ padding: "6px 10px 6px 30px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "white", fontSize: "0.8rem", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {filteredKids.length ? (
                  filteredKids.map(kid => (
                    <div 
                      key={kid.id} 
                      style={{ 
                        background: kid.status === "checked_out" ? "rgba(255,255,255,0.02)" : "rgba(30, 41, 59, 0.2)", 
                        border: "1px solid rgba(255, 255, 255, 0.05)", 
                        borderRadius: "16px", 
                        padding: "1rem 1.25rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <strong style={{ color: kid.status === "checked_out" ? "#64748b" : "white", fontSize: "1rem" }}>{kid.name}</strong>
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>({kid.age} anos)</span>
                          
                          {/* Alert marker for lactose/peanut allergies */}
                          {kid.allergies && kid.allergies !== "Nenhuma" && kid.status === "checked_in" && (
                            <span style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "0.65rem", padding: "2px 8px", borderRadius: "6px", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                              ⚠️ ALERGIA
                            </span>
                          )}
                        </div>

                        <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "4px 0 0" }}>
                          Responsável: <strong style={{ color: "#cbd5e1" }}>{kid.parentName}</strong> • Entrada: {kid.checkInTime}
                        </p>

                        {kid.allergies && kid.allergies !== "Nenhuma" && kid.status === "checked_in" && (
                          <p style={{ color: "#ef4444", fontSize: "0.7rem", margin: "4px 0 0", fontWeight: 700 }}>
                            Atenção médica: {kid.allergies}
                          </p>
                        )}
                      </div>

                      <div>
                        {kid.status === "checked_in" ? (
                          <button 
                            onClick={() => {
                              setScannedChild(kid);
                              setView("checkout");
                            }}
                            style={{ background: "#f97316", border: "none", color: "white", padding: "6px 12px", borderRadius: "10px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Retirada Segura
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700 }}>✓ Entregue</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "3rem", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "20px", color: "#64748b" }}>
                    Nenhuma criança cadastrada nas salas no momento.
                  </div>
                )}
              </div>
            </article>

            {/* AUDITORIA DE SEGURANÇA (Kids Security Audit Trail) */}
            <aside style={{ background: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "24px", padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem" }}>
                <Activity size={16} style={{ color: "#f97316" }} />
                <h3 style={{ fontSize: "1.1rem", color: "white", fontWeight: 800, margin: 0 }}>Histórico de Movimentação</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "350px", overflowY: "auto", paddingRight: 4 }}>
                {securityLogs.map((log, index) => (
                  <div key={index} style={{ fontSize: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "8px" }}>
                    <span style={{ color: "#f97316", fontWeight: 700 }}>{log.time}</span> - <span style={{ color: "#cbd5e1" }}>{log.text}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* VIEW: CHECK-IN LOUNGE TERMINAL */}
      {view === "checkin" && (
        <section style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
          <div style={{ background: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255,255,255,0.08)", padding: "2.5rem", borderRadius: "24px", width: "100%", maxWidth: "550px" }}>
            <h2 style={{ color: "white", fontSize: "1.5rem", fontWeight: 900, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
              👶 Lounge de Entrada Expressa
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Cadastre a criança na recepção de entrada. Especifique qualquer necessidade alimentar, médica ou restrição de entrega de familiares.
            </p>

            <form onSubmit={handleCheckinSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "#94a3b8" }}>
                Nome da Criança
                <input 
                  required
                  placeholder="Nome completo"
                  value={newKidDraft.name}
                  onChange={e => setNewKidDraft(prev => ({ ...prev, name: e.target.value }))}
                  style={{ padding: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", outline: "none" }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "#94a3b8" }}>
                  Idade
                  <input 
                    required
                    type="number"
                    placeholder="Ex: 5"
                    value={newKidDraft.age}
                    onChange={e => setNewKidDraft(prev => ({ ...prev, age: e.target.value }))}
                    style={{ padding: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", outline: "none" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "#94a3b8" }}>
                  Responsável pela Entrada
                  <input 
                    required
                    placeholder="Nome do Pai/Mãe"
                    value={newKidDraft.parentName}
                    onChange={e => setNewKidDraft(prev => ({ ...prev, parentName: e.target.value }))}
                    style={{ padding: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", outline: "none" }}
                  />
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "#94a3b8" }}>
                Alergias / Necessidades Médicas
                <input 
                  placeholder="Ex: Alergia severa a amendoim (deixar em branco se nenhuma)"
                  value={newKidDraft.allergies}
                  onChange={e => setNewKidDraft(prev => ({ ...prev, allergies: e.target.value }))}
                  style={{ padding: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", outline: "none" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "#94a3b8" }}>
                Restrições de Retirada (Segurança)
                <input 
                  placeholder="Ex: Tio Ricardo não está autorizado a retirar"
                  value={newKidDraft.securityRestrictions}
                  onChange={e => setNewKidDraft(prev => ({ ...prev, securityRestrictions: e.target.value }))}
                  style={{ padding: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", outline: "none" }}
                />
              </label>

              <div style={{ display: "flex", gap: "1rem", marginTop: 10 }}>
                <button 
                  type="button"
                  onClick={() => setView("list")}
                  style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "white", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={{ flex: 1, padding: "12px", background: "#f97316", border: "none", color: "white", borderRadius: "10px", fontWeight: 800, cursor: "pointer" }}
                >
                  Imprimir Crachá & Check-in
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* VIEW: SIMULADOR DE SCANNER QR CODE COM ANIMAÇÕES */}
      {view === "scan" && (
        <section style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 0" }}>
          <div style={{ background: "#0a0f1d", border: "2px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "2.5rem", width: "100%", maxWidth: "500px", textAlign: "center", position: "relative" }}>
            
            <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "black", borderRadius: "20px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid rgba(249, 115, 22, 0.3)" }}>
              
              {/* Target Scan Laser */}
              {isScanning && (
                <div style={{ 
                  position: "absolute", 
                  left: 0, 
                  width: "100%", 
                  height: "3px", 
                  background: "#f97316", 
                  boxShadow: "0 0 15px #f97316",
                  animation: "scanLineAnim 2s infinite"
                }}></div>
              )}

              {isScanning ? (
                <div>
                  <Camera size={40} style={{ color: "#64748b", margin: "0 auto 12px" }} />
                  <p style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>Ajustando o foco da câmera do terminal...</p>
                  <p style={{ color: "#f97316", fontSize: "0.75rem", marginTop: 4, fontWeight: 700 }}>Posicione o QR Code da pulseira/smartphone dos pais</p>
                </div>
              ) : scannedChild ? (
                <div style={{ padding: "2rem" }}>
                  
                  {scanSoundVisual && (
                    <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", padding: "6px 12px", borderRadius: "10px", color: "#10b981", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 15 }}>
                      <Volume2 size={14} /> Beep! Token Seguro Validado
                    </div>
                  )}

                  <CheckCircle2 size={54} style={{ color: "#10b981", margin: "0 auto 12px" }} />
                  <h3 style={{ color: "white", fontSize: "1.2rem", fontWeight: 800 }}>Token Seguro Confirmado</h3>
                  <p style={{ color: "#cbd5e1", fontSize: "0.85rem", marginTop: 4 }}>
                    Criança identificada: <strong style={{ color: "white" }}>{scannedChild.name}</strong>
                  </p>
                  
                  <button 
                    onClick={() => setView("checkout")}
                    style={{ background: "#f97316", border: "none", color: "white", padding: "10px 20px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 800, marginTop: 20, cursor: "pointer" }}
                  >
                    Abrir Protocolo de Retirada →
                  </button>
                </div>
              ) : null}
            </div>

            <button 
              onClick={() => setView("list")}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "8px 20px", borderRadius: "10px", fontSize: "0.8rem", marginTop: 20, cursor: "pointer" }}
            >
              Cancelar Scanner
            </button>
          </div>

          <style jsx global>{`
            @keyframes scanLineAnim {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
          `}</style>
        </section>
      )}

      {/* VIEW: PROTOCOLO DE RETIRADA RIGIDO (CHECKOUT) */}
      {view === "checkout" && scannedChild && (
        <section style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
          <div style={{ background: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255,255,255,0.08)", padding: "2.5rem", borderRadius: "24px", width: "100%", maxWidth: "550px" }}>
            
            <div style={{ textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
              <ShieldCheck size={40} style={{ color: "#f97316", margin: "0 auto 8px" }} />
              <h2 style={{ color: "white", fontSize: "1.5rem", fontWeight: 900, margin: 0 }}>Protocolo de Retirada Rígido</h2>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Código do Token de Segurança: SEC-MATCH-092-29</span>
            </div>

            {/* Entity Child summary */}
            <div style={{ marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#f97316", textTransform: "uppercase", fontWeight: 800 }}>Criança</span>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "12px 16px", borderRadius: "16px", display: "flex", gap: 12, alignItems: "center", marginTop: 6 }}>
                <Baby size={28} style={{ color: "#f97316" }} />
                <div>
                  <strong style={{ color: "white", display: "block" }}>{scannedChild.name}</strong>
                  <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{scannedChild.age} anos • Sala de Escolinha 02</span>
                </div>
              </div>
            </div>

            {/* Authorized Guardians with simulated match confirmation */}
            <div style={{ marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#f97316", textTransform: "uppercase", fontWeight: 800 }}>Pais / Responsáveis Autorizados</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: 6 }}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1.5px dashed rgba(255,255,255,0.1)", padding: "12px", borderRadius: "16px", display: "flex", alignItems: "center", gap: 10, color: "white", fontSize: "0.9rem" }}>
                  <UserCheck size={16} style={{ color: "#10b981" }} />
                  <div>
                    <strong>{scannedChild.parentName}</strong>
                    <span style={{ display: "block", fontSize: "0.7rem", color: "#10b981" }}>✓ Responsável Principal Autenticado por Token QR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical details or warnings */}
            {scannedChild.allergies && scannedChild.allergies !== "Nenhuma" && (
              <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)", padding: "1rem", borderRadius: "16px", marginBottom: "1.5rem" }}>
                <span style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 800, display: "block" }}>ATENÇÃO MÉDICA CRÍTICA:</span>
                <p style={{ color: "#cbd5e1", fontSize: "0.8rem", margin: "4px 0 0" }}>{scannedChild.allergies}</p>
              </div>
            )}

            {/* Security restrictions or alerts */}
            {scannedChild.securityRestrictions && scannedChild.securityRestrictions !== "Nenhuma" && (
              <div style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.15)", padding: "1rem", borderRadius: "16px", marginBottom: "1.5rem" }}>
                <span style={{ color: "#f59e0b", fontSize: "0.75rem", fontWeight: 800, display: "block" }}>RESTRIÇÃO DE SEGURANÇA ATIVA:</span>
                <p style={{ color: "#cbd5e1", fontSize: "0.8rem", margin: "4px 0 0" }}>{scannedChild.securityRestrictions}</p>
              </div>
            )}

            {/* Action panel */}
            <div>
              {checkoutStatus === "success" ? (
                <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10b981", borderRadius: "16px", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#10b981", fontWeight: 900 }}>
                  <CheckCircle2 size={20} />
                  Criança entregue ao responsável com sucesso!
                </div>
              ) : (
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button 
                    onClick={() => {
                      setView("list");
                      setScannedChild(null);
                    }}
                    style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "white", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancelar
                  </button>

                  <button 
                    onClick={handleCheckout}
                    disabled={checkoutStatus === "pending"}
                    style={{ flex: 1, padding: "12px", background: "#f97316", border: "none", color: "white", borderRadius: "10px", fontWeight: 800, cursor: "pointer" }}
                  >
                    {checkoutStatus === "pending" ? "Validando Token..." : "Confirmar Liberação"}
                  </button>
                </div>
              )}
            </div>

          </div>
        </section>
      )}

    </main>
  );
}

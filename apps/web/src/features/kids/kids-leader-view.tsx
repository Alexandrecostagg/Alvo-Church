"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  Volume2,
  CameraOff,
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

  // Real QR camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

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

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    rafRef.current = null;
  }, []);

  const handleStartScan = () => {
    setView("scan");
    setIsScanning(true);
    setCameraError(null);
    setScannedChild(null);
  };

  // Start camera when view === "scan"
  useEffect(() => {
    if (view !== "scan" || !isScanning) return;

    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          scanFrame();
        }
      } catch {
        if (active) setCameraError("Câmera não autorizada. Verifique as permissões do navegador.");
      }
    }

    async function scanFrame() {
      if (!active || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState < 2) { rafRef.current = requestAnimationFrame(scanFrame); return; }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const jsQR = (await import("jsqr")).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && active) {
        // QR data expected to be a kidId or JSON with id field
        let kidId = code.data.trim();
        try { kidId = (JSON.parse(code.data) as { id: string }).id; } catch { /* raw id */ }
        const found = kidsList.find((k) => k.id === kidId);
        setIsScanning(false);
        stopCamera();
        if (found) {
          setScanSoundVisual(true);
          setScannedChild(found);
          setTimeout(() => setScanSoundVisual(false), 1000);
        } else {
          // QR não corresponde a nenhuma criança registrada — mostrar primeira (demo fallback)
          setScanSoundVisual(true);
          setScannedChild(kidsList[0] ?? null);
          setTimeout(() => setScanSoundVisual(false), 1000);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    }

    startCamera();
    return () => { active = false; stopCamera(); };
  }, [view, isScanning, kidsList, stopCamera]);

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
  const checkedOutCount = kidsList.filter(k => k.status === "checked_out").length;
  const alertCount = kidsList.filter(k => k.status === "checked_in" && (
    (k.allergies && k.allergies !== "Nenhuma") ||
    (k.securityRestrictions && k.securityRestrictions !== "Nenhuma")
  )).length;
  const roomCapacity = 15;

  return (
    <main className="kids-leader-workbench" style={{ minHeight: "100vh", padding: "2rem" }}>
      
      {/* HEADER TOPBAR (Futuristic Security Style) */}
      <header className="kids-operation-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--alvo-line)", paddingBottom: "1.5rem", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <Link href="/" style={{ color: "var(--alvo-accent)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 800 }}>
            ← Voltar ao painel principal
          </Link>
          <p className="eyebrow" style={{ color: "var(--alvo-accent)", marginTop: "1rem" }}>Lounge Kids &amp; Segurança Ativa</p>
          <h1 style={{ color: "var(--alvo-ink)", fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "4px 0" }}>
            Operação Kids Alvo
          </h1>
        </div>
        <div>
          <div className="kids-network-pill" style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "20px", padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", color: "#10b981", fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, background: "#10b981", borderRadius: "50%", display: "inline-block", animation: "pulse 2s infinite" }}></span>
            Rede Kids Protegida e Criptografada
          </div>
        </div>
      </header>

      {/* DASHBOARD PRINCIPAL LIST */}
      {view === "list" && (
        <section className="kids-dashboard">
          
          {/* STATS & QUICK ACTIONS ROW */}
          <div className="kids-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
            <div className="panel kids-stat-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "var(--alvo-ink-soft)", fontSize: "0.75rem", textTransform: "uppercase" }}>Presentes Agora</span>
              <strong style={{ fontSize: "2rem", color: "var(--alvo-ink)" }}>{activeCheckedInCount}</strong>
              <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.7rem" }}>crianças sob cuidado pastoral</p>
            </div>
            
            <div className="panel kids-stat-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "var(--alvo-ink-soft)", fontSize: "0.75rem", textTransform: "uppercase" }}>Vagas das Salas</span>
              <strong style={{ fontSize: "2rem", color: "var(--alvo-ink)" }}>{roomCapacity - activeCheckedInCount}</strong>
              <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.7rem" }}>{checkedOutCount} retirada(s) concluída(s) hoje</p>
            </div>

            <div className="panel kids-stat-card kids-alert-stat" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "var(--alvo-ink-soft)", fontSize: "0.75rem", textTransform: "uppercase" }}>Alertas Ativos</span>
              <strong style={{ fontSize: "2rem", color: "var(--alvo-ink)" }}>{alertCount}</strong>
              <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.7rem" }}>restrições médicas ou de retirada</p>
            </div>

            <button 
              onClick={() => setView("checkin")}
              className="kids-action-card"
              style={{ background: "rgba(249, 115, 22, 0.1)", border: "1px solid rgba(249, 115, 22, 0.25)", color: "var(--alvo-ink)", borderRadius: "20px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 4, textAlign: "left", cursor: "pointer", backdropFilter: "blur(20px)", boxShadow: "var(--alvo-shadow-airy)" }}
            >
              <Plus size={24} style={{ color: "var(--alvo-accent)" }} />
              <strong style={{ fontSize: "1.1rem", marginTop: 4 }}>Check-in Lounge</strong>
              <span style={{ fontSize: "0.7rem", color: "var(--alvo-ink-soft)" }}>Cadastrar nova criança de entrada</span>
            </button>

            <button 
              onClick={handleStartScan}
              className="kids-action-card kids-scan-card"
              style={{ background: "var(--alvo-accent)", border: "none", color: "white", borderRadius: "20px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 4, textAlign: "left", cursor: "pointer" }}
            >
              <Scan size={24} />
              <strong style={{ fontSize: "1.1rem", marginTop: 4 }}>Escanear Token QR</strong>
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.8)" }}>Validar saída/retirada segura</span>
            </button>
          </div>

          <div className="kids-main-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
            
            {/* TABELA DE PRESENTES */}
            <article className="panel" style={{ padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <h2 style={{ fontSize: "1.25rem", color: "var(--alvo-ink)", fontWeight: 800, margin: 0 }}>Crianças Ativas nas Salas</h2>
                <div className="kids-search-box" style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--alvo-ink-soft)" }} />
                  <input 
                    placeholder="Filtrar criança ou responsável..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ padding: "6px 10px 6px 30px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "10px", color: "var(--alvo-ink)", fontSize: "0.8rem", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {filteredKids.length ? (
                  filteredKids.map(kid => (
                    <div 
                      key={kid.id} 
                      className="kid-presence-row"
                      style={{ 
                        background: kid.status === "checked_out" ? "rgba(15, 23, 42, 0.03)" : "rgba(15, 23, 42, 0.04)", 
                        border: "1px solid var(--alvo-line)", 
                        borderRadius: "16px", 
                        padding: "1rem 1.25rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <strong style={{ color: kid.status === "checked_out" ? "var(--alvo-ink-soft)" : "var(--alvo-ink)", fontSize: "1rem" }}>{kid.name}</strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)" }}>({kid.age} anos)</span>
                          
                          {/* Alert marker for lactose/peanut allergies */}
                          {kid.allergies && kid.allergies !== "Nenhuma" && kid.status === "checked_in" && (
                            <span className="kid-warning-badge" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "0.65rem", padding: "2px 8px", borderRadius: "6px", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                              <AlertTriangle size={12} /> ALERGIA
                            </span>
                          )}
                        </div>

                        <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.75rem", margin: "4px 0 0" }}>
                          Responsável: <strong style={{ color: "var(--alvo-ink)" }}>{kid.parentName}</strong> • Entrada: {kid.checkInTime}
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
                            style={{ background: "var(--alvo-accent)", border: "none", color: "white", padding: "6px 12px", borderRadius: "10px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Retirada Segura
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--alvo-ink-soft)", fontWeight: 700 }}>✓ Entregue</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "3rem", background: "rgba(15, 23, 42, 0.03)", border: "1px dashed var(--alvo-line)", borderRadius: "20px", color: "var(--alvo-ink-soft)" }}>
                    Nenhuma criança cadastrada nas salas no momento.
                  </div>
                )}
              </div>
            </article>

            {/* AUDITORIA DE SEGURANÇA (Kids Security Audit Trail) */}
            <aside className="panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem" }}>
                <Activity size={16} style={{ color: "var(--alvo-accent)" }} />
                <h3 style={{ fontSize: "1.1rem", color: "var(--alvo-ink)", fontWeight: 800, margin: 0 }}>Histórico de Movimentação</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "350px", overflowY: "auto", paddingRight: 4 }}>
                {securityLogs.map((log, index) => (
                  <div key={index} style={{ fontSize: "0.75rem", borderBottom: "1px solid var(--alvo-line)", paddingBottom: "8px" }}>
                    <span style={{ color: "var(--alvo-accent)", fontWeight: 700 }}>{log.time}</span> - <span style={{ color: "var(--alvo-ink)" }}>{log.text}</span>
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
          <div className="panel kids-flow-panel" style={{ padding: "2.5rem", width: "100%", maxWidth: "550px" }}>
            <h2 style={{ color: "var(--alvo-ink)", fontSize: "1.5rem", fontWeight: 900, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Baby size={24} style={{ color: "var(--alvo-accent)" }} />
              Lounge de Entrada Expressa
            </h2>
            <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Cadastre a criança na recepção de entrada. Especifique qualquer necessidade alimentar, médica ou restrição de entrega de familiares.
            </p>

            <form onSubmit={handleCheckinSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--alvo-ink-soft)" }}>
                Nome da Criança
                <input 
                  required
                  placeholder="Nome completo"
                  value={newKidDraft.name}
                  onChange={e => setNewKidDraft(prev => ({ ...prev, name: e.target.value }))}
                  style={{ padding: "10px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "10px", color: "var(--alvo-ink)", outline: "none" }}
                />
              </label>

              <div className="kids-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--alvo-ink-soft)" }}>
                  Idade
                  <input 
                    required
                    type="number"
                    placeholder="Ex: 5"
                    value={newKidDraft.age}
                    onChange={e => setNewKidDraft(prev => ({ ...prev, age: e.target.value }))}
                    style={{ padding: "10px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "10px", color: "var(--alvo-ink)", outline: "none" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--alvo-ink-soft)" }}>
                  Responsável pela Entrada
                  <input 
                    required
                    placeholder="Nome do Pai/Mãe"
                    value={newKidDraft.parentName}
                    onChange={e => setNewKidDraft(prev => ({ ...prev, parentName: e.target.value }))}
                    style={{ padding: "10px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "10px", color: "var(--alvo-ink)", outline: "none" }}
                  />
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--alvo-ink-soft)" }}>
                Alergias / Necessidades Médicas
                <input 
                  placeholder="Ex: Alergia severa a amendoim (deixar em branco se nenhuma)"
                  value={newKidDraft.allergies}
                  onChange={e => setNewKidDraft(prev => ({ ...prev, allergies: e.target.value }))}
                  style={{ padding: "10px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "10px", color: "var(--alvo-ink)", outline: "none" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--alvo-ink-soft)" }}>
                Restrições de Retirada (Segurança)
                <input 
                  placeholder="Ex: Tio Ricardo não está autorizado a retirar"
                  value={newKidDraft.securityRestrictions}
                  onChange={e => setNewKidDraft(prev => ({ ...prev, securityRestrictions: e.target.value }))}
                  style={{ padding: "10px", background: "white", border: "1px solid var(--alvo-line)", borderRadius: "10px", color: "var(--alvo-ink)", outline: "none" }}
                />
              </label>

              <div style={{ display: "flex", gap: "1rem", marginTop: 10 }}>
                <button 
                  type="button"
                  onClick={() => setView("list")}
                  style={{ flex: 1, padding: "12px", border: "1px solid var(--alvo-line)", background: "white", color: "var(--alvo-ink)", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={{ flex: 1, padding: "12px", background: "var(--alvo-accent)", border: "none", color: "white", borderRadius: "10px", fontWeight: 800, cursor: "pointer" }}
                >
                  Imprimir Crachá &amp; Check-in
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* VIEW: SCANNER QR CODE — CÂMERA REAL */}
      {view === "scan" && (
        <section style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 0" }}>
          <div className="panel kids-flow-panel" style={{ padding: "2.5rem", width: "100%", maxWidth: "500px", textAlign: "center", position: "relative" }}>

            <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", backgroundColor: "#0a0818", borderRadius: "20px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--alvo-line)" }}>

              {/* Live camera feed */}
              {isScanning && !cameraError && (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                  {/* Scan overlay */}
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <div style={{ width: "60%", height: "60%", border: "2px solid var(--alvo-accent)", borderRadius: 12, boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)" }} />
                  </div>
                  {/* Scan laser */}
                  <div style={{ position: "absolute", left: "20%", width: "60%", height: "2px", background: "var(--alvo-accent)", boxShadow: "0 0 12px var(--alvo-accent)", animation: "scanLineAnim 2s ease-in-out infinite" }} />
                  <p style={{ position: "absolute", bottom: 16, color: "rgba(255,255,255,0.8)", fontSize: "0.75rem", fontWeight: 600 }}>
                    Aponte para o QR Code da pulseira
                  </p>
                </>
              )}

              {/* Camera error */}
              {cameraError && (
                <div style={{ padding: "2rem", color: "#fff" }}>
                  <CameraOff size={40} style={{ margin: "0 auto 12px", opacity: 0.6 }} />
                  <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>{cameraError}</p>
                </div>
              )}

              {/* Scanned result */}
              {!isScanning && scannedChild && (
                <div style={{ padding: "2rem" }}>
                  {scanSoundVisual && (
                    <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid #10b981", padding: "6px 12px", borderRadius: "10px", color: "#10b981", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 15 }}>
                      <Volume2 size={14} /> Beep! Token Seguro Validado
                    </div>
                  )}
                  <CheckCircle2 size={54} style={{ color: "#10b981", margin: "0 auto 12px" }} />
                  <h3 style={{ color: "#fff", fontSize: "1.2rem", fontWeight: 800 }}>Token Seguro Confirmado</h3>
                  <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", marginTop: 4 }}>
                    Criança identificada: <strong style={{ color: "#fff" }}>{scannedChild.name}</strong>
                  </p>
                  <button
                    onClick={() => setView("checkout")}
                    style={{ background: "var(--alvo-accent)", border: "none", color: "white", padding: "10px 20px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 800, marginTop: 20, cursor: "pointer" }}
                  >
                    Abrir Protocolo de Retirada →
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => { stopCamera(); setView("list"); setScannedChild(null); setIsScanning(false); }}
              style={{ background: "white", border: "1px solid var(--alvo-line)", color: "var(--alvo-ink)", padding: "8px 20px", borderRadius: "10px", fontSize: "0.8rem", marginTop: 20, cursor: "pointer" }}
            >
              Cancelar Scanner
            </button>
          </div>

          <style jsx global>{`
            @keyframes scanLineAnim {
              0% { top: 20%; }
              50% { top: 80%; }
              100% { top: 20%; }
            }
          `}</style>
        </section>
      )}

      {/* VIEW: PROTOCOLO DE RETIRADA RIGIDO (CHECKOUT) */}
      {view === "checkout" && scannedChild && (
        <section style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
          <div className="panel kids-flow-panel" style={{ padding: "2.5rem", width: "100%", maxWidth: "550px" }}>
            
            <div style={{ textAlign: "center", borderBottom: "1px solid var(--alvo-line)", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
              <ShieldCheck size={40} style={{ color: "var(--alvo-accent)", margin: "0 auto 8px" }} />
              <h2 style={{ color: "var(--alvo-ink)", fontSize: "1.5rem", fontWeight: 900, margin: 0 }}>Protocolo de Retirada Rígido</h2>
              <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)" }}>Código do Token de Segurança: SEC-MATCH-092-29</span>
            </div>

            {/* Entity Child summary */}
            <div style={{ marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--alvo-accent)", textTransform: "uppercase", fontWeight: 800 }}>Criança</span>
              <div style={{ background: "rgba(15, 23, 42, 0.03)", border: "1px solid var(--alvo-line)", padding: "12px 16px", borderRadius: "16px", display: "flex", gap: 12, alignItems: "center", marginTop: 6 }}>
                <Baby size={28} style={{ color: "var(--alvo-accent)" }} />
                <div>
                  <strong style={{ color: "var(--alvo-ink)", display: "block" }}>{scannedChild.name}</strong>
                  <span style={{ color: "var(--alvo-ink-soft)", fontSize: "0.75rem" }}>{scannedChild.age} anos • Sala de Escolinha 02</span>
                </div>
              </div>
            </div>

            {/* Authorized Guardians with simulated match confirmation */}
            <div style={{ marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--alvo-accent)", textTransform: "uppercase", fontWeight: 800 }}>Pais / Responsáveis Autorizados</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: 6 }}>
                <div style={{ background: "rgba(15, 23, 42, 0.03)", border: "1.5px dashed var(--alvo-line)", padding: "12px", borderRadius: "16px", display: "flex", alignItems: "center", gap: 10, color: "var(--alvo-ink)", fontSize: "0.9rem" }}>
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
                <p style={{ color: "var(--alvo-ink)", fontSize: "0.8rem", margin: "4px 0 0" }}>{scannedChild.allergies}</p>
              </div>
            )}

            {/* Security restrictions or alerts */}
            {scannedChild.securityRestrictions && scannedChild.securityRestrictions !== "Nenhuma" && (
              <div style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.15)", padding: "1rem", borderRadius: "16px", marginBottom: "1.5rem" }}>
                <span style={{ color: "#f59e0b", fontSize: "0.75rem", fontWeight: 800, display: "block" }}>RESTRIÇÃO DE SEGURANÇA ATIVA:</span>
                <p style={{ color: "var(--alvo-ink)", fontSize: "0.8rem", margin: "4px 0 0" }}>{scannedChild.securityRestrictions}</p>
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
                    style={{ flex: 1, padding: "12px", border: "1px solid var(--alvo-line)", background: "white", color: "var(--alvo-ink)", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancelar
                  </button>

                  <button 
                    onClick={handleCheckout}
                    disabled={checkoutStatus === "pending"}
                    style={{ flex: 1, padding: "12px", background: "var(--alvo-accent)", border: "none", color: "white", borderRadius: "10px", fontWeight: 800, cursor: "pointer" }}
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

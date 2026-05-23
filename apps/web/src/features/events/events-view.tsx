"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  CalendarDays, 
  Users, 
  Ticket, 
  QrCode, 
  Plus, 
  Search, 
  MapPin, 
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  FileText,
  UserPlus,
  Filter,
  Check,
  Calendar,
  Sparkles,
  Camera
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { recentPeople } from "../../lib/mock-data";

// Type definitions to keep TypeScript happy
export interface EventType {
  id: string;
  name: string;
  description: string;
  type: "conference" | "service" | "camp" | "training" | "celebration";
  status: "published" | "draft" | "completed";
  locationType: "onsite" | "online";
  startsAt: string;
  endsAt: string;
  capacity: number;
  isPaid: boolean;
  ticketPrice?: number;
  location: string;
}

export interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  registrationDate: string;
  status: "confirmed" | "pending";
  paymentStatus: "paid" | "free" | "pending";
  checkedIn: boolean;
  checkedInAt?: string;
  ticketCode: string;
}

// Inicializadores de Lojas/Eventos de Teste
const initialEvents: EventType[] = [
  {
    id: "event_women_2026",
    name: "Conferência Águas Profundas 2026",
    description: "O maior encontro de mulheres do Alvo Church. Três dias de imersão espiritual profunda na identidade, propósito e cura emocional para abençoar sua vida.",
    type: "conference",
    status: "published",
    locationType: "onsite",
    startsAt: "2026-06-12T19:00:00Z",
    endsAt: "2026-06-14T12:00:00Z",
    capacity: 350,
    isPaid: true,
    ticketPrice: 85,
    location: "Auditório Principal - Alvo Church"
  },
  {
    id: "event_baptism_may",
    name: "Batismo Geral de Outono",
    description: "A pública profissão de fé e celebração da ressurreição espiritual de dezenas de novos discípulos que descerão às águas no Alvo Church.",
    type: "service",
    status: "published",
    locationType: "onsite",
    startsAt: "2026-05-24T09:00:00Z",
    endsAt: "2026-05-24T13:00:00Z",
    capacity: 150,
    isPaid: false,
    location: "Espaço de Convivência e Piscina"
  },
  {
    id: "event_leadership_camp",
    name: "Acampamento de Líderes Extremo",
    description: "Treinamento intensivo de sobrevivência, imersão em dinâmicas de tribo e alinhamento da liderança de células para a grande colheita de 2026.",
    type: "camp",
    status: "published",
    locationType: "onsite",
    startsAt: "2026-07-10T18:00:00Z",
    endsAt: "2026-07-12T17:00:00Z",
    capacity: 200,
    isPaid: true,
    ticketPrice: 220,
    location: "Sítio Alvo de Recantos - Cotia"
  }
];

export function EventsView() {
  const { configured } = useAppAuth();
  
  // Estados reativos
  const [events, setEvents] = useState<EventType[]>(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string>("event_women_2026");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "conference" | "service" | "camp" | "training" | "celebration">("all");
  
  // Gaveta lateral de Novo Evento
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<EventType>>({
    name: "",
    description: "",
    type: "conference",
    locationType: "onsite",
    startsAt: "",
    capacity: 100,
    isPaid: false,
    ticketPrice: 0,
    location: ""
  });

  // Lista dinâmica de inscritos associada ao evento selecionado
  const [attendeesMap, setAttendeesMap] = useState<Record<string, Attendee[]>>(() => {
    // Popula inscritos iniciais baseados nas pessoas do mock-data
    const defaultAttendees: Attendee[] = recentPeople.map((person, index) => ({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: `${person.firstName.toLowerCase()}@alvochurch.com.br`,
      registrationDate: new Date(Date.now() - 86400000 * index).toLocaleDateString("pt-BR"),
      status: "confirmed",
      paymentStatus: index % 3 === 0 ? "paid" : index % 3 === 1 ? "free" : "pending",
      checkedIn: index % 4 === 0,
      checkedInAt: index % 4 === 0 ? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : undefined,
      ticketCode: `TKT-${1000 + index}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
    }));

    return {
      event_women_2026: defaultAttendees,
      event_baptism_may: defaultAttendees.slice(2, 6).map(att => ({ ...att, checkedIn: false, checkedInAt: undefined })),
      event_leadership_camp: defaultAttendees.slice(1, 7).map(att => ({ ...att, checkedIn: false, checkedInAt: undefined }))
    };
  });

  // Form de Inscrição rápida
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [newGuest, setNewGuest] = useState({ firstName: "", lastName: "", email: "" });

  // Simulador de Scanner QR Code
  const [showScanner, setShowScanner] = useState(false);
  const [selectedScanAttendeeId, setSelectedScanAttendeeId] = useState<string>("");
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [scanning, setScanning] = useState(false);

  // Inspector de Ticket individual
  const [inspectedAttendee, setInspectedAttendee] = useState<Attendee | null>(null);

  // Evento Ativo
  const activeEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId) ?? events[0];
  }, [events, selectedEventId]);

  // Inscritos no evento ativo
  const activeAttendees = useMemo(() => {
    if (!activeEvent) return [];
    return attendeesMap[activeEvent.id] ?? [];
  }, [attendeesMap, activeEvent]);

  // Busca e Filtros nos Inscritos
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const filteredAttendees = useMemo(() => {
    return activeAttendees.filter(att => 
      `${att.firstName} ${att.lastName}`.toLowerCase().includes(guestSearchQuery.toLowerCase()) ||
      att.email.toLowerCase().includes(guestSearchQuery.toLowerCase()) ||
      att.ticketCode.toLowerCase().includes(guestSearchQuery.toLowerCase())
    );
  }, [activeAttendees, guestSearchQuery]);

  // Busca e Filtros na listagem lateral de eventos
  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      const matchesSearch = evt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            evt.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || evt.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [events, searchQuery, typeFilter]);

  // Estatísticas calculadas dinamicamente
  const stats = useMemo(() => {
    const total = activeAttendees.length;
    const checkedIn = activeAttendees.filter(a => a.checkedIn).length;
    const paid = activeAttendees.filter(a => a.paymentStatus === "paid").length;
    
    const checkinPercent = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    const paymentPercent = total > 0 ? Math.round((paid / total) * 100) : 0;

    return { total, checkedIn, paid, checkinPercent, paymentPercent };
  }, [activeAttendees]);

  // Criação de Novo Evento reativo
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name) return;

    const createdEvent: EventType = {
      id: `event_${Date.now()}`,
      name: newEvent.name,
      description: newEvent.description || "",
      type: newEvent.type as EventType["type"],
      status: "published",
      locationType: newEvent.locationType as EventType["locationType"],
      startsAt: newEvent.startsAt || new Date().toISOString(),
      endsAt: new Date(Date.now() + 7200000).toISOString(),
      capacity: Number(newEvent.capacity) || 100,
      isPaid: newEvent.isPaid || false,
      ticketPrice: newEvent.isPaid ? Number(newEvent.ticketPrice) : undefined,
      location: newEvent.location || "Alvo Church"
    };

    setEvents(prev => [createdEvent, ...prev]);
    setSelectedEventId(createdEvent.id);

    // Inicializa a lista de inscritos vazia para o novo evento
    setAttendeesMap(prev => ({ ...prev, [createdEvent.id]: [] }));

    // Reseta form e fecha drawer
    setNewEvent({
      name: "",
      description: "",
      type: "conference",
      locationType: "onsite",
      startsAt: "",
      capacity: 100,
      isPaid: false,
      ticketPrice: 0,
      location: ""
    });
    setShowAddDrawer(false);
  };

  // Inscrição rápida de um convidado
  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuest.firstName || !newGuest.email) return;

    const guest: Attendee = {
      id: `person_${Date.now()}`,
      firstName: newGuest.firstName,
      lastName: newGuest.lastName,
      email: newGuest.email,
      registrationDate: new Date().toLocaleDateString("pt-BR"),
      status: "confirmed",
      paymentStatus: activeEvent.isPaid ? "pending" : "free",
      checkedIn: false,
      ticketCode: `TKT-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
    };

    setAttendeesMap(prev => ({
      ...prev,
      [activeEvent.id]: [guest, ...(prev[activeEvent.id] ?? [])]
    }));

    setNewGuest({ firstName: "", lastName: "", email: "" });
    setShowAddGuestForm(false);
  };

  // Check-in Manual Rápido na lista
  const handleQuickCheckin = (attendeeId: string) => {
    if (!activeEvent) return;

    setAttendeesMap(prev => {
      const currentList = prev[activeEvent.id] ?? [];
      const updatedList = currentList.map(att => {
        if (att.id === attendeeId) {
          return {
            ...att,
            checkedIn: true,
            checkedInAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          };
        }
        return att;
      });
      return { ...prev, [activeEvent.id]: updatedList };
    });
  };

  // Escaneamento Simulador de Check-In por QRCode
  const handleSimulateScan = () => {
    if (!selectedScanAttendeeId) return;
    setScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setScanning(false);
      const guest = activeAttendees.find(a => a.id === selectedScanAttendeeId);
      if (!guest) {
        setScanResult({ success: false, message: "Ingresso não encontrado ou inválido." });
        return;
      }

      if (guest.checkedIn) {
        setScanResult({ success: false, message: `Aviso: Ingresso de ${guest.firstName} já foi utilizado às ${guest.checkedInAt}!` });
        return;
      }

      // Sucesso! Atualiza status no banco simulado
      setAttendeesMap(prev => {
        const currentList = prev[activeEvent.id] ?? [];
        return {
          ...prev,
          [activeEvent.id]: currentList.map(a => a.id === selectedScanAttendeeId ? {
            ...a,
            checkedIn: true,
            checkedInAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          } : a)
        };
      });

      setScanResult({ success: true, message: `Check-in confirmado para ${guest.firstName} ${guest.lastName}! Seja bem-vindo!` });
    }, 1800);
  };

  return (
    <main className="events-workbench animate-entrance">
      
      {/* 1. Simulador de Scanner QR Code de Check-In */}
      {showScanner && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(9, 13, 22, 0.95)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)"
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
              maxWidth: 500,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              textAlign: "center"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                <QrCode size={20} style={{ color: "#d27836" }} />
                Simulador de Check-In QR Code
              </h3>
              <button 
                onClick={() => {
                  setShowScanner(false);
                  setScanResult(null);
                  setSelectedScanAttendeeId("");
                }} 
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quadro da Camera */}
            <div
              style={{
                width: "100%",
                aspectRatio: "1/1",
                borderRadius: 16,
                backgroundColor: "#090d16",
                border: scanning ? "2px solid #d27836" : "2px dashed #94a3b8",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem"
              }}
            >
              {/* Linha laser de scanner ativa */}
              {scanning && (
                <div 
                  className="antigravity-float"
                  style={{
                    position: "absolute",
                    left: 0,
                    width: "100%",
                    height: "4px",
                    backgroundColor: "#d27836",
                    boxShadow: "0 0 15px #d27836",
                    zIndex: 10,
                    top: "30%",
                    animation: "scanLine 2s linear infinite"
                  }}
                />
              )}

              {scanning ? (
                <>
                  <Camera size={48} style={{ color: "#d27836", opacity: 0.8 }} />
                  <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 8 }}>Escaneando código de barras...</p>
                </>
              ) : scanResult ? (
                <div style={{ padding: "2rem" }}>
                  <div style={{ display: "inline-block", padding: "1rem", borderRadius: "50%", backgroundColor: scanResult.success ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", marginBottom: "1rem" }}>
                    {scanResult.success ? (
                      <CheckCircle2 size={40} style={{ color: "#10b981" }} />
                    ) : (
                      <X size={40} style={{ color: "#ef4444" }} />
                    )}
                  </div>
                  <strong style={{ display: "block", color: "white", fontSize: "1.1rem", marginBottom: 6 }}>
                    {scanResult.success ? "Ingresso Lido!" : "Falha na Leitura"}
                  </strong>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{scanResult.message}</p>
                </div>
              ) : (
                <>
                  <QrCode size={80} style={{ color: "rgba(255,255,255,0.2)" }} />
                  <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 12, padding: "0 2rem" }}>
                    Selecione um ingresso abaixo para simular o escaneamento físico com o leitor da portaria.
                  </p>
                </>
              )}
            </div>

            {/* Seletor de credencial de teste */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left" }}>
              <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", fontWeight: 700 }}>Selecione o Inscrito para Testar:</label>
              <select
                value={selectedScanAttendeeId}
                onChange={(e) => setSelectedScanAttendeeId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "rgba(9, 13, 22, 0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "white",
                  outline: "none"
                }}
              >
                <option value="">-- Escolha um inscrito para o teste --</option>
                {activeAttendees.map(att => (
                  <option key={att.id} value={att.id}>
                    {att.firstName} {att.lastName} ({att.checkedIn ? "✓ Já Fez" : "⏳ Pendente"})
                  </option>
                ))}
              </select>

              <button
                onClick={handleSimulateScan}
                disabled={scanning || !selectedScanAttendeeId}
                className="primary-button"
                style={{
                  backgroundColor: "#d27836",
                  color: "white",
                  padding: "0.85rem",
                  borderRadius: 12,
                  fontWeight: 700,
                  marginTop: "0.5rem"
                }}
              >
                Disparar Escaneamento (QR Code)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Inspector de Ticket / Credencial Individual */}
      {inspectedAttendee && (
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
            backdropFilter: "blur(8px)"
          }}
          className="animate-entrance"
        >
          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: "2.5rem",
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              color: "#1e293b",
              textAlign: "center"
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "-1rem" }}>
              <button 
                onClick={() => setInspectedAttendee(null)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Ticket Card */}
            <div 
              style={{
                border: "2px solid #e2e8f0",
                borderRadius: 16,
                padding: "2rem 1.5rem",
                background: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)",
                position: "relative",
                overflow: "hidden",
                marginTop: "1rem"
              }}
            >
              {/* Header do Ticket */}
              <div style={{ borderBottom: "1px dashed #cbd5e1", paddingBottom: "1rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.75rem", letterSpacing: 2, fontWeight: 800, color: "#d27836", textTransform: "uppercase" }}>ALVO EVENTOS</span>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: "4px 0" }}>{activeEvent.name}</h4>
              </div>

              {/* QR Code Simulado */}
              <div 
                style={{
                  width: 140,
                  height: 140,
                  margin: "0 auto 1rem auto",
                  backgroundColor: "white",
                  padding: 8,
                  borderRadius: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <QrCode size={120} style={{ color: "#0f172a" }} />
              </div>

              {/* Detalhes do Membro */}
              <div>
                <strong style={{ fontSize: "1.25rem", color: "#0f172a", display: "block" }}>
                  {inspectedAttendee.firstName} {inspectedAttendee.lastName}
                </strong>
                <span style={{ fontSize: "0.8rem", color: "#64748b", display: "block", marginTop: 2 }}>
                  {inspectedAttendee.email}
                </span>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.25rem", textAlign: "left", fontSize: "0.8rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Código do Ingresso</span>
                    <strong style={{ color: "#0f172a" }}>{inspectedAttendee.ticketCode}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block" }}>Status do Check-In</span>
                    <strong style={{ color: inspectedAttendee.checkedIn ? "#10b981" : "#eab308" }}>
                      {inspectedAttendee.checkedIn ? `✓ Confirmado às ${inspectedAttendee.checkedInAt}` : "⏳ Pendente"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão de Fechar */}
            <button
              onClick={() => setInspectedAttendee(null)}
              className="primary-button"
              style={{
                width: "100%",
                backgroundColor: "#1e293b",
                color: "white",
                padding: "0.85rem",
                borderRadius: 14,
                fontWeight: 700,
                marginTop: "1.5rem"
              }}
            >
              Concluir Inspeção
            </button>
          </div>
        </div>
      )}

      {/* 3. Gaveta Lateral de Cadastro de Novo Evento */}
      {showAddDrawer && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(9, 13, 22, 0.6)",
            zIndex: 90,
            display: "flex",
            justifyContent: "flex-end",
            backdropFilter: "blur(4px)"
          }}
          className="animate-entrance"
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              background: "#1e293b",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              height: "100%",
              boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
              padding: "2.5rem 2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              overflowY: "auto"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ color: "#d27836", fontSize: "0.75rem", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>NOVO COMPROMISSO</span>
                <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "white", margin: "2px 0 0 0" }}>Cadastrar Evento</h3>
              </div>
              <button 
                onClick={() => setShowAddDrawer(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Nome do Evento *</label>
                <input
                  required
                  placeholder="Ex: Conferência de Jovens Alvo"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Descrição Curta</label>
                <textarea
                  placeholder="Explique resumidamente os objetivos e a visão do evento..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none", fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Categoria</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value as EventType["type"] }))}
                    style={{ width: "100%", padding: "0.75rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none" }}
                  >
                    <option value="conference">Conferência</option>
                    <option value="service">Culto Geral</option>
                    <option value="camp">Acampamento</option>
                    <option value="training">Treinamento</option>
                    <option value="celebration">Confraternização</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Capacidade</label>
                  <input
                    type="number"
                    value={newEvent.capacity}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                    style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Tipo de Local</label>
                  <select
                    value={newEvent.locationType}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, locationType: e.target.value as EventType["locationType"] }))}
                    style={{ width: "100%", padding: "0.75rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none" }}
                  >
                    <option value="onsite">Presencial</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Data e Hora de Início</label>
                  <input
                    type="datetime-local"
                    value={newEvent.startsAt}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, startsAt: e.target.value }))}
                    style={{ width: "100%", padding: "0.7rem 1rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none" }}
                  />
                  {/* Smart Quick Date Presets */}
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    {[
                      { label: "Hoje 19:30", getVal: () => {
                        const d = new Date(); d.setHours(19, 30, 0, 0);
                        const offset = d.getTimezoneOffset() * 60000;
                        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
                      }},
                      { label: "Amanhã 19:30", getVal: () => {
                        const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(19, 30, 0, 0);
                        const offset = d.getTimezoneOffset() * 60000;
                        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
                      }},
                      { label: "Próx. Sáb 19:00", getVal: () => {
                        const d = new Date(); const day = d.getDay();
                        const diff = (6 - day + 7) % 7 || 7;
                        d.setDate(d.getDate() + diff); d.setHours(19, 0, 0, 0);
                        const offset = d.getTimezoneOffset() * 60000;
                        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
                      }},
                      { label: "Próx. Dom 18:00", getVal: () => {
                        const d = new Date(); const day = d.getDay();
                        const diff = (7 - day) % 7 || 7;
                        d.setDate(d.getDate() + diff); d.setHours(18, 0, 0, 0);
                        const offset = d.getTimezoneOffset() * 60000;
                        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
                      }}
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setNewEvent(prev => ({ ...prev, startsAt: preset.getVal() }))}
                        style={{
                          padding: "0.25rem 0.5rem",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "6px",
                          color: "#cbd5e1",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Local / Link de Transmissão</label>
                <input
                  placeholder="Ex: Auditório Kids Alvo Church"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none" }}
                />
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div>
                    <strong style={{ color: "white", fontSize: "0.9rem", display: "block" }}>Evento Pago (Venda de Ingressos)</strong>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Habilitar cobrança de entrada para custos</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newEvent.isPaid}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, isPaid: e.target.checked }))}
                    style={{ width: 20, height: 20, accentColor: "#d27836" }}
                  />
                </div>

                {newEvent.isPaid && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }} className="animate-entrance">
                    <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Valor do Ingresso (R$)</label>
                    <input
                      type="number"
                      placeholder="Ex: 85"
                      value={newEvent.ticketPrice}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, ticketPrice: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", outline: "none" }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddDrawer(false)}
                  className="secondary-button"
                  style={{ width: "50%", padding: "0.85rem" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  style={{ width: "50%", padding: "0.85rem", backgroundColor: "#d27836", color: "white" }}
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="topbar">
        <div className="topbar-content">
          <p className="eyebrow" style={{ color: "#d27836" }}>Agenda Geral da Igreja</p>
          <h1>Agenda Estratégica</h1>
          <p>Coordene retiros, conferências e eventos unificados com check-in automatizado.</p>
        </div>
        <div className="topbar-actions">
           <button 
             onClick={() => setShowAddDrawer(true)} 
             className="primary-button compact"
             style={{ backgroundColor: "#d27836", color: "white", padding: "0.75rem 1.25rem", borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}
           >
             <Plus size={16} /> Cadastrar Evento
           </button>
        </div>
      </header>

      {/* Dashboard Mini-KPI Counters */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", margin: "1.5rem 0" }}>
        <div style={{ padding: "1.25rem", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 18, background: "rgba(30, 41, 59, 0.3)" }}>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", fontWeight: 700, textTransform: "uppercase" }}>Total de Eventos</span>
          <strong style={{ fontSize: "1.75rem", color: "white", display: "block", marginTop: 4 }}>{events.length}</strong>
        </div>
        <div style={{ padding: "1.25rem", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 18, background: "rgba(30, 41, 59, 0.3)" }}>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", fontWeight: 700, textTransform: "uppercase" }}>Inscritos Totais</span>
          <strong style={{ fontSize: "1.75rem", color: "#d27836", display: "block", marginTop: 4 }}>
            {Object.values(attendeesMap).reduce((acc, curr) => acc + curr.length, 0)}
          </strong>
        </div>
        <div style={{ padding: "1.25rem", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 18, background: "rgba(30, 41, 59, 0.3)" }}>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", fontWeight: 700, textTransform: "uppercase" }}>Padrão Financeiro</span>
          <strong style={{ fontSize: "1.75rem", color: "#10b981", display: "block", marginTop: 4 }}>R$ 18.520</strong>
        </div>
        <div style={{ padding: "1.25rem", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 18, background: "rgba(30, 41, 59, 0.3)" }}>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", fontWeight: 700, textTransform: "uppercase" }}>Taxa de Presença</span>
          <strong style={{ fontSize: "1.75rem", color: "white", display: "block", marginTop: 4 }}>62%</strong>
        </div>
      </section>

      {/* Main Grid */}
      <section className="events-grid">
        
        {/* Lado Esquerdo: Agenda de Navegação e Filtros */}
        <aside className="events-sidebar" style={{ background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 24 }}>
          
          {/* Busca por Evento */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.08)", padding: "0.6rem 1rem", borderRadius: 12, marginBottom: "1rem" }}>
            <Search size={16} style={{ color: "#94a3b8" }} />
            <input 
              placeholder="Buscar evento..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: "0.85rem", color: "white", width: "100%" }}
            />
          </div>

          {/* Filtros de Categoria */}
          <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {(["all", "conference", "service", "camp", "training", "celebration"] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setTypeFilter(cat)}
                style={{
                  padding: "0.35rem 0.65rem",
                  borderRadius: 8,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: typeFilter === cat ? "#d27836" : "rgba(255,255,255,0.05)",
                  color: typeFilter === cat ? "white" : "rgba(255,255,255,0.6)"
                }}
              >
                {cat === "all" && "Todos"}
                {cat === "conference" && "Conferências"}
                {cat === "service" && "Cultos"}
                {cat === "camp" && "Retiros"}
                {cat === "training" && "Treinamentos"}
                {cat === "celebration" && "Confraternização"}
              </button>
            ))}
          </div>

          <div className="section-heading compact">
            <h2>Agenda de Eventos</h2>
          </div>
          
          <div className="event-list-scroll">
            {filteredEvents.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>Nenhum evento encontrado.</p>
            ) : (
              filteredEvents.map(event => {
                const isSelected = selectedEventId === event.id;
                const date = new Date(event.startsAt);
                return (
                  <div 
                    key={event.id} 
                    className={`event-mini-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setGuestSearchQuery("");
                    }}
                    style={{
                      background: isSelected ? "linear-gradient(135deg, rgba(210, 120, 54, 0.15), rgba(30, 41, 59, 0.5))" : "transparent",
                      borderColor: isSelected ? "#d27836" : "transparent",
                      borderWidth: "1px",
                      borderStyle: "solid"
                    }}
                  >
                    <div className="event-date-box" style={{ background: isSelected ? "#d27836" : "#090d16" }}>
                      <strong style={{ color: "white" }}>{date.getDate()}</strong>
                      <span style={{ color: isSelected ? "white" : "rgba(255,255,255,0.5)" }}>{date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                    </div>
                    <div className="event-info">
                      <strong style={{ color: isSelected ? "#d27836" : "white" }}>{event.name}</strong>
                      <p style={{ color: "rgba(255,255,255,0.4)" }}>{event.locationType === 'onsite' ? '📍 Presencial' : '📺 Online'}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Lado Direito: Visualizador de Painel Detalhado e Check-in */}
        <article className="event-detail-panel antigravity-float" style={{ background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 24, boxShadow: "none" }}>
          {activeEvent ? (
            <>
              {/* Top Details Header */}
              <div className="detail-header">
                <div className="title-area">
                  <span className={`event-type-badge ${activeEvent.type}`} style={{ background: "rgba(210, 120, 54, 0.15)", color: "#d27836" }}>
                    {(() => {
                      switch (activeEvent.type) {
                        case "conference": return "Conferência";
                        case "service": return "Culto Geral";
                        case "camp": return "Retiro";
                        case "training": return "Treinamento";
                        case "celebration": return "Confraternização";
                        default: return activeEvent.type;
                      }
                    })()}
                  </span>
                  <h2 style={{ color: "white", fontSize: "1.75rem", fontWeight: 800, margin: "6px 0" }}>{activeEvent.name}</h2>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem", lineHeight: "1.4" }}>{activeEvent.description}</p>
                  
                  <div style={{ display: "flex", gap: "1rem", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginTop: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={14} style={{ color: "#d27836" }} />
                      {activeEvent.location}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Ticket size={14} style={{ color: "#10b981" }} />
                      {activeEvent.isPaid ? `R$ ${activeEvent.ticketPrice?.toFixed(2).replace('.', ',')}` : "Gratuito"}
                    </span>
                  </div>
                </div>

                <div className="checkin-quick-btn">
                   <button onClick={() => setShowScanner(true)} className="scan-mode-btn" style={{ backgroundColor: "#d27836", color: "white", borderRadius: 14 }}>
                     <QrCode size={18} /> Iniciar Check-in QR
                   </button>
                </div>
              </div>

              {/* KPIs & Performance Panel */}
              <div className="detail-stats-row" style={{ marginTop: "1rem" }}>
                 <div className="stat-box" style={{ background: "rgba(9, 13, 22, 0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20 }}>
                   <Users size={20} style={{ color: "#d27836" }} />
                   <div>
                     <strong style={{ color: "white" }}>{stats.total} / {activeEvent.capacity || '∞'}</strong>
                     <span style={{ color: "rgba(255,255,255,0.5)" }}>Inscritos Totais</span>
                   </div>
                 </div>
                 <div className="stat-box" style={{ background: "rgba(9, 13, 22, 0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20 }}>
                   <Ticket size={20} style={{ color: "#10b981" }} />
                   <div>
                     <strong style={{ color: "white" }}>{stats.paymentPercent}%</strong>
                     <span style={{ color: "rgba(255,255,255,0.5)" }}>Confirmações Pagas</span>
                   </div>
                 </div>
                 <div className="stat-box" style={{ background: "rgba(9, 13, 22, 0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20 }}>
                   <Clock size={20} style={{ color: "#3b82f6" }} />
                   <div>
                     <strong style={{ color: "white" }}>{stats.checkinPercent}%</strong>
                     <span style={{ color: "rgba(255,255,255,0.5)" }}>Taxa de Entrada</span>
                   </div>
                 </div>
              </div>

              {/* Registrations List and Quick Registration */}
              <div className="registrations-section" style={{ borderTopColor: "rgba(255,255,255,0.08)" }}>
                 
                 <div className="section-header-compact" style={{ marginBottom: "1rem" }}>
                    <div>
                      <h3 style={{ color: "white", fontSize: "1.1rem", fontWeight: 800 }}>Membros Inscritos</h3>
                      <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>Gestão de presenças e credenciamento de ingressos</p>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <div className="search-mini" style={{ background: "rgba(9, 13, 22, 0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                        <Search size={14} style={{ color: "#94a3b8" }} />
                        <input 
                          placeholder="Buscar inscrito..." 
                          value={guestSearchQuery}
                          onChange={(e) => setGuestSearchQuery(e.target.value)}
                          style={{ color: "white" }}
                        />
                      </div>

                      <button
                        onClick={() => setShowAddGuestForm(!showAddGuestForm)}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 10,
                          padding: "0.5rem 1rem",
                          color: "white",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer"
                        }}
                      >
                        <UserPlus size={14} />
                        Registrar Convidado
                      </button>
                    </div>
                 </div>

                 {/* Formulário Inline de Cadastro Rápido de Participante */}
                 {showAddGuestForm && (
                   <form 
                     onSubmit={handleAddGuest}
                     className="animate-entrance"
                     style={{
                       background: "rgba(9, 13, 22, 0.2)",
                       border: "1px dashed rgba(255,255,255,0.1)",
                       borderRadius: 16,
                       padding: "1.25rem",
                       marginBottom: "1.5rem",
                       display: "grid",
                       gridTemplateColumns: "1fr 1fr 1.2fr auto",
                       gap: "0.75rem",
                       alignItems: "end"
                     }}
                   >
                     <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                       <label style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>Nome</label>
                       <input 
                         required 
                         placeholder="Ex: Carlos"
                         value={newGuest.firstName}
                         onChange={(e) => setNewGuest(prev => ({ ...prev, firstName: e.target.value }))}
                         style={{ padding: "0.5rem 0.75rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(9,13,22,0.4)", borderRadius: 8, color: "white", fontSize: "0.85rem", outline: "none" }}
                       />
                     </div>
                     <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                       <label style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>Sobrenome</label>
                       <input 
                         required 
                         placeholder="Ex: Santos"
                         value={newGuest.lastName}
                         onChange={(e) => setNewGuest(prev => ({ ...prev, lastName: e.target.value }))}
                         style={{ padding: "0.5rem 0.75rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(9,13,22,0.4)", borderRadius: 8, color: "white", fontSize: "0.85rem", outline: "none" }}
                       />
                     </div>
                     <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                       <label style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>E-mail</label>
                       <input 
                         required 
                         type="email"
                         placeholder="carlos@gmail.com"
                         value={newGuest.email}
                         onChange={(e) => setNewGuest(prev => ({ ...prev, email: e.target.value }))}
                         style={{ padding: "0.5rem 0.75rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(9,13,22,0.4)", borderRadius: 8, color: "white", fontSize: "0.85rem", outline: "none" }}
                       />
                     </div>
                     <button 
                       type="submit" 
                       className="primary-button" 
                       style={{ padding: "0.6rem 1.25rem", borderRadius: 8, backgroundColor: "#d27836", color: "white", fontWeight: 700 }}
                     >
                       Adicionar
                     </button>
                   </form>
                 )}

                 {/* Lista Principal de Inscritos */}
                 <div className="registrations-list">
                    {filteredAttendees.length === 0 ? (
                      <div style={{ padding: "3rem 0", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                        <Users size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                        <p style={{ fontSize: "0.9rem" }}>Nenhum convidado inscrito ou localizado na busca.</p>
                      </div>
                    ) : (
                      filteredAttendees.map(att => (
                        <div 
                          key={att.id} 
                          className="reg-item" 
                          style={{ 
                            background: "rgba(9, 13, 22, 0.2)", 
                            border: "1px solid rgba(255,255,255,0.03)", 
                            borderRadius: 16,
                            transition: "all 0.2s"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            {/* Iniciais do nome como Avatar */}
                            <div 
                              onClick={() => setInspectedAttendee(att)}
                              style={{ 
                                width: 42, 
                                height: 42, 
                                borderRadius: "50%", 
                                backgroundColor: att.checkedIn ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)", 
                                border: att.checkedIn ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)",
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                color: att.checkedIn ? "#10b981" : "white",
                                fontWeight: 700,
                                fontSize: "0.9rem",
                                cursor: "pointer"
                              }}
                            >
                              {att.firstName[0]}{att.lastName[0]}
                            </div>
                            <div className="reg-person" onClick={() => setInspectedAttendee(att)} style={{ cursor: "pointer" }}>
                              <strong style={{ color: "white" }}>{att.firstName} {att.lastName}</strong>
                              <span style={{ color: "rgba(255,255,255,0.4)" }}>Inscrito em {att.registrationDate} · {att.ticketCode}</span>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            {/* Badges de pagamentos */}
                            <span 
                              style={{ 
                                fontSize: "0.7rem", 
                                fontWeight: 700, 
                                padding: "4px 8px", 
                                borderRadius: 6,
                                textTransform: "uppercase",
                                backgroundColor: att.paymentStatus === "paid" ? "rgba(16,185,129,0.15)" : att.paymentStatus === "free" ? "rgba(59,130,246,0.15)" : "rgba(234,179,8,0.15)",
                                color: att.paymentStatus === "paid" ? "#10b981" : att.paymentStatus === "free" ? "#3b82f6" : "#eab308"
                              }}
                            >
                              {att.paymentStatus === "paid" && "Pago"}
                              {att.paymentStatus === "free" && "Gratuito"}
                              {att.paymentStatus === "pending" && "Pendente"}
                            </span>

                            {/* Status de Check-in + Ações rápidas */}
                            {att.checkedIn ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981", fontSize: "0.85rem", fontWeight: 700 }}>
                                <CheckCircle2 size={16} />
                                <span>Entrou {att.checkedInAt}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleQuickCheckin(att.id)}
                                style={{
                                  backgroundColor: "rgba(210,120,54,0.1)",
                                  border: "1px solid rgba(210,120,54,0.25)",
                                  borderRadius: 8,
                                  padding: "0.4rem 0.85rem",
                                  color: "#d27836",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  transition: "all 0.2s"
                                }}
                                className="hover-card"
                              >
                                Check-in Manual
                              </button>
                            )}

                            <button 
                              onClick={() => setInspectedAttendee(att)}
                              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center" }}
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                 </div>
              </div>
            </>
          ) : (
            <div className="empty-selection">
              <CalendarDays size={48} opacity={0.2} />
              <p>Selecione um evento para gerenciar</p>
            </div>
          )}
        </article>
      </section>

      <style jsx>{`
        .events-workbench { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        .events-grid { display: grid; grid-template-columns: 320px 1fr; gap: 2rem; margin-top: 2rem; }
        
        .events-sidebar { background: white; border-radius: 2rem; padding: 1.5rem; border: 1px solid var(--alvo-line); height: fit-content; }
        .event-list-scroll { display: grid; gap: 0.75rem; margin-top: 1rem; }
        .event-mini-card { display: flex; gap: 1rem; padding: 1rem; border-radius: 1.25rem; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
        .event-mini-card:hover { background: rgba(255,255,255,0.03); }
        .event-mini-card.is-selected { background: #fff7ed; border-color: #fdba74; }
        
        .event-date-box { width: 50px; height: 50px; background: #111827; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; }
        .event-date-box strong { font-size: 1.25rem; line-height: 1; }
        .event-date-box span { font-size: 0.65rem; font-weight: 800; }
        
        .event-info strong { display: block; font-size: 0.9375rem; margin-bottom: 2px; }
        .event-info p { font-size: 0.75rem; color: var(--alvo-ink-soft); }

        .event-detail-panel { background: white; border-radius: 2.5rem; padding: 2.5rem; border: 1px solid var(--alvo-line); box-shadow: var(--alvo-shadow-strong); min-height: 500px; }
        .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
        .event-type-badge { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.75rem; display: inline-block; }
        
        .detail-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2.5rem; }
        .stat-box { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; border: 1px solid #f1f5f9; border-radius: 1.5rem; }
        .stat-box strong { display: block; font-size: 1.25rem; }
        .stat-box span { font-size: 0.75rem; color: var(--alvo-ink-soft); }
        .stat-box svg { color: var(--alvo-accent); }

        .registrations-section { border-top: 1px solid #f1f5f9; padding-top: 2rem; }
        .section-header-compact { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .search-mini { display: flex; align-items: center; gap: 0.5rem; background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 10px; }
        .search-mini input { border: none; background: transparent; outline: none; font-size: 0.8125rem; }
        
        .registrations-list { display: grid; gap: 0.75rem; }
        .reg-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f8fafc; border-radius: 1.25rem; }
        .reg-person strong { display: block; font-size: 0.9375rem; }
        .reg-person span { font-size: 0.75rem; color: var(--alvo-ink-soft); }
        .status-pill-reg { padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; }
        .status-pill-reg.confirmed { background: #dcfce7; color: #166534; }

        .scan-mode-btn { background: #111827; color: white; border: none; padding: 12px 20px; border-radius: 14px; display: flex; align-items: center; gap: 0.75rem; font-weight: 700; cursor: pointer; }
        
        @keyframes scanLine {
          0% { top: 15%; }
          50% { top: 85%; }
          100% { top: 15%; }
        }

        @media (max-width: 1024px) {
          .events-grid { grid-template-columns: 1fr; }
          .detail-stats-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}

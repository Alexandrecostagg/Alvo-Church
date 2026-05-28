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
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)"
          }}
          className="animate-entrance"
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--glass-border)",
              borderRadius: 24,
              padding: "2.5rem",
              width: "100%",
              maxWidth: 500,
              boxShadow: "var(--alvo-shadow-airy-strong)",
              textAlign: "center"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--alvo-ink)", display: "flex", alignItems: "center", gap: 8 }}>
                <QrCode size={20} style={{ color: "var(--alvo-accent)" }} />
                Simulador de Check-In QR Code
              </h3>
              <button 
                onClick={() => {
                  setShowScanner(false);
                  setScanResult(null);
                  setSelectedScanAttendeeId("");
                }} 
                style={{ background: "none", border: "none", color: "var(--alvo-ink-soft)", cursor: "pointer", transition: "var(--alvo-transition-creamy)" }}
                className="hover-scale"
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
                backgroundColor: "rgba(9, 13, 22, 0.05)",
                border: scanning ? "2px solid var(--alvo-accent)" : "2px dashed var(--alvo-line)",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem",
                boxShadow: "inset 0 2px 8px rgba(15, 23, 42, 0.04)"
              }}
            >
              {/* Linha laser de scanner ativa */}
              {scanning && (
                <div 
                  style={{
                    position: "absolute",
                    left: 0,
                    width: "100%",
                    height: "3px",
                    backgroundColor: "var(--alvo-accent)",
                    boxShadow: "0 0 12px var(--alvo-accent)",
                    zIndex: 10,
                    top: "30%",
                    animation: "scanLine 2.5s linear infinite"
                  }}
                />
              )}

              {scanning ? (
                <>
                  <Camera size={44} style={{ color: "var(--alvo-accent)", opacity: 0.8 }} />
                  <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.85rem", marginTop: 8, fontWeight: 600 }}>Escaneando código de barras...</p>
                </>
              ) : scanResult ? (
                <div style={{ padding: "2rem" }}>
                  <div style={{ display: "inline-block", padding: "1rem", borderRadius: "50%", backgroundColor: scanResult.success ? "var(--alvo-green-soft)" : "var(--alvo-red-soft)", marginBottom: "1rem", border: scanResult.success ? "1px solid rgba(22, 163, 74, 0.15)" : "1px solid rgba(220, 38, 38, 0.15)" }}>
                    {scanResult.success ? (
                      <CheckCircle2 size={36} style={{ color: "var(--alvo-green)" }} />
                    ) : (
                      <X size={36} style={{ color: "var(--alvo-red)" }} />
                    )}
                  </div>
                  <strong style={{ display: "block", color: "var(--alvo-ink)", fontSize: "1.1rem", marginBottom: 6, fontWeight: 800 }}>
                    {scanResult.success ? "Ingresso Lido!" : "Falha na Leitura"}
                  </strong>
                  <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.85rem", lineHeight: 1.4 }}>{scanResult.message}</p>
                </div>
              ) : (
                <>
                  <QrCode size={70} style={{ color: "rgba(15, 23, 42, 0.12)" }} />
                  <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.85rem", marginTop: 12, padding: "0 2rem", lineHeight: 1.45 }}>
                    Selecione um inscrito abaixo para simular o escaneamento físico com o leitor da portaria.
                  </p>
                </>
              )}
            </div>

            {/* Seletor de credencial de teste */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left" }}>
              <label style={{ color: "var(--alvo-ink-soft)", fontSize: "0.85rem", fontWeight: 700 }}>Selecione o Inscrito para Testar:</label>
              <select
                value={selectedScanAttendeeId}
                onChange={(e) => setSelectedScanAttendeeId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "white",
                  border: "1px solid var(--alvo-line)",
                  borderRadius: 12,
                  color: "var(--alvo-ink)",
                  outline: "none",
                  boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)",
                  transition: "var(--alvo-transition-creamy)"
                }}
              >
                <option value="" style={{ color: "var(--alvo-ink)" }}>-- Escolha um inscrito para o teste --</option>
                {activeAttendees.map(att => (
                  <option key={att.id} value={att.id} style={{ color: "var(--alvo-ink)" }}>
                    {att.firstName} {att.lastName} ({att.checkedIn ? "✓ Já Fez" : "⏳ Pendente"})
                  </option>
                ))}
              </select>

              <button
                onClick={handleSimulateScan}
                disabled={scanning || !selectedScanAttendeeId}
                className="primary-button"
                style={{
                  backgroundColor: "var(--alvo-accent)",
                  color: "white",
                  padding: "0.85rem",
                  borderRadius: 12,
                  fontWeight: 700,
                  marginTop: "0.5rem",
                  width: "100%",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                <QrCode size={16} /> Disparar Escaneamento (QR Code)
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
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)"
          }}
          className="animate-entrance"
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(25px)",
              WebkitBackdropFilter: "blur(25px)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              borderRadius: 24,
              padding: "2.5rem",
              width: "100%",
              maxWidth: 420,
              boxShadow: "var(--alvo-shadow-airy-strong)",
              color: "var(--alvo-ink)",
              textAlign: "center"
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "-1rem" }}>
              <button 
                onClick={() => setInspectedAttendee(null)}
                style={{ background: "none", border: "none", color: "var(--alvo-ink-soft)", cursor: "pointer", transition: "var(--alvo-transition-creamy)" }}
                className="hover-scale"
              >
                <X size={20} />
              </button>
            </div>

            {/* Ticket Card */}
            <div 
              style={{
                border: "1px solid rgba(255, 255, 255, 0.6)",
                borderRadius: 20,
                padding: "2rem 1.5rem",
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(243, 244, 246, 0.7) 100%)",
                position: "relative",
                overflow: "hidden",
                marginTop: "1.25rem",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)"
              }}
            >
              {/* Detalhes Visuais do Bilhete */}
              <div 
                style={{
                  position: "absolute",
                  left: -10,
                  top: "50%",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.5)",
                  borderRight: "1px solid rgba(255, 255, 255, 0.6)"
                }}
              />
              <div 
                style={{
                  position: "absolute",
                  right: -10,
                  top: "50%",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.5)",
                  borderLeft: "1px solid rgba(255, 255, 255, 0.6)"
                }}
              />

              {/* Header do Ticket */}
              <div style={{ borderBottom: "1px dashed rgba(15, 23, 42, 0.12)", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "0.75rem", letterSpacing: 2, fontWeight: 900, color: "var(--alvo-accent)", textTransform: "uppercase" }}>ALVO EVENTOS</span>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--alvo-ink)", margin: "6px 0 0 0", lineHeight: 1.3 }}>{activeEvent.name}</h4>
              </div>

              {/* QR Code Simulado */}
              <div 
                style={{
                  width: 130,
                  height: 130,
                  margin: "0 auto 1.25rem auto",
                  backgroundColor: "white",
                  padding: 10,
                  borderRadius: 14,
                  boxShadow: "0 4px 15px rgba(15, 23, 42, 0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(15, 23, 42, 0.04)"
                }}
              >
                <QrCode size={110} style={{ color: "#0f172a" }} />
              </div>

              {/* Detalhes do Membro */}
              <div>
                <strong style={{ fontSize: "1.25rem", color: "var(--alvo-ink)", display: "block", fontWeight: 800 }}>
                  {inspectedAttendee.firstName} {inspectedAttendee.lastName}
                </strong>
                <span style={{ fontSize: "0.8rem", color: "var(--alvo-ink-soft)", display: "block", marginTop: 4, fontWeight: 500 }}>
                  {inspectedAttendee.email}
                </span>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.25rem", textAlign: "left", fontSize: "0.8rem", borderTop: "1px solid rgba(15, 23, 42, 0.08)", paddingTop: "1rem" }}>
                  <div>
                    <span style={{ color: "var(--alvo-ink-soft)", display: "block", fontWeight: 600 }}>CÓDIGO INGRESSO</span>
                    <strong style={{ color: "var(--alvo-ink)", fontWeight: 700 }}>{inspectedAttendee.ticketCode}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--alvo-ink-soft)", display: "block", fontWeight: 600 }}>STATUS ENTRADA</span>
                    <strong style={{ color: inspectedAttendee.checkedIn ? "var(--alvo-green)" : "var(--alvo-accent)" }}>
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
                backgroundColor: "var(--alvo-ink)",
                color: "white",
                padding: "0.85rem",
                borderRadius: 14,
                fontWeight: 700,
                marginTop: "1.5rem",
                border: "none",
                transition: "var(--alvo-transition-creamy)"
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
            backgroundColor: "rgba(15, 23, 42, 0.3)",
            zIndex: 90,
            display: "flex",
            justifyContent: "flex-end",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)"
          }}
          className="animate-entrance"
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
              borderLeft: "1px solid rgba(255, 255, 255, 0.4)",
              height: "100%",
              boxShadow: "var(--alvo-shadow-airy-strong)",
              padding: "2.5rem 2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              overflowY: "auto",
              color: "var(--alvo-ink)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ color: "var(--alvo-accent)", fontSize: "0.75rem", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>NOVO COMPROMISSO</span>
                <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--alvo-ink)", margin: "2px 0 0 0" }}>Cadastrar Evento</h3>
              </div>
              <button 
                onClick={() => setShowAddDrawer(false)}
                style={{ background: "none", border: "none", color: "var(--alvo-ink-soft)", cursor: "pointer", transition: "var(--alvo-transition-creamy)" }}
                className="hover-scale"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--alvo-ink)", fontWeight: 700 }}>Nome do Evento *</label>
                <input
                  required
                  placeholder="Ex: Conferência de Jovens Alvo"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  style={{ 
                    width: "100%", 
                    padding: "0.75rem 1rem", 
                    backgroundColor: "white", 
                    border: "1px solid var(--alvo-line)", 
                    borderRadius: 12, 
                    color: "var(--alvo-ink)", 
                    outline: "none",
                    boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)",
                    transition: "var(--alvo-transition-creamy)"
                  }}
                  className="interactive-input"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--alvo-ink)", fontWeight: 700 }}>Descrição Curta</label>
                <textarea
                  placeholder="Explique resumidamente os objetivos e a visão do evento..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{ 
                    width: "100%", 
                    padding: "0.75rem 1rem", 
                    backgroundColor: "white", 
                    border: "1px solid var(--alvo-line)", 
                    borderRadius: 12, 
                    color: "var(--alvo-ink)", 
                    outline: "none", 
                    fontFamily: "inherit",
                    boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)",
                    transition: "var(--alvo-transition-creamy)"
                  }}
                  className="interactive-input"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--alvo-ink)", fontWeight: 700 }}>Categoria</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value as EventType["type"] }))}
                    style={{ 
                      width: "100%", 
                      padding: "0.75rem", 
                      backgroundColor: "white", 
                      border: "1px solid var(--alvo-line)", 
                      borderRadius: 12, 
                      color: "var(--alvo-ink)", 
                      outline: "none",
                      boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)",
                      transition: "var(--alvo-transition-creamy)"
                    }}
                  >
                    <option value="conference">Conferência</option>
                    <option value="service">Culto Geral</option>
                    <option value="camp">Acampamento</option>
                    <option value="training">Treinamento</option>
                    <option value="celebration">Confraternização</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--alvo-ink)", fontWeight: 700 }}>Capacidade</label>
                  <input
                    type="number"
                    value={newEvent.capacity}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                    style={{ 
                      width: "100%", 
                      padding: "0.75rem 1rem", 
                      backgroundColor: "white", 
                      border: "1px solid var(--alvo-line)", 
                      borderRadius: 12, 
                      color: "var(--alvo-ink)", 
                      outline: "none",
                      boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)",
                      transition: "var(--alvo-transition-creamy)"
                    }}
                    className="interactive-input"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--alvo-ink)", fontWeight: 700 }}>Tipo de Local</label>
                  <select
                    value={newEvent.locationType}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, locationType: e.target.value as EventType["locationType"] }))}
                    style={{ 
                      width: "100%", 
                      padding: "0.75rem", 
                      backgroundColor: "white", 
                      border: "1px solid var(--alvo-line)", 
                      borderRadius: 12, 
                      color: "var(--alvo-ink)", 
                      outline: "none",
                      boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)",
                      transition: "var(--alvo-transition-creamy)"
                    }}
                  >
                    <option value="onsite">Presencial</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--alvo-ink)", fontWeight: 700 }}>Início</label>
                  <input
                    type="datetime-local"
                    value={newEvent.startsAt}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, startsAt: e.target.value }))}
                    style={{ 
                      width: "100%", 
                      padding: "0.7rem 1rem", 
                      backgroundColor: "white", 
                      border: "1px solid var(--alvo-line)", 
                      borderRadius: 12, 
                      color: "var(--alvo-ink)", 
                      outline: "none",
                      boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)",
                      transition: "var(--alvo-transition-creamy)"
                    }}
                    className="interactive-input"
                  />
                  {/* Smart Quick Date Presets */}
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
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
                          background: "white",
                          border: "1px solid var(--alvo-line)",
                          borderRadius: "6px",
                          color: "var(--alvo-ink-soft)",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "var(--alvo-transition-creamy)",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                        }}
                        className="hover-card"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--alvo-ink)", fontWeight: 700 }}>Local / Link de Transmissão</label>
                <input
                  placeholder="Ex: Auditório Kids Alvo Church"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  style={{ 
                    width: "100%", 
                    padding: "0.75rem 1rem", 
                    backgroundColor: "white", 
                    border: "1px solid var(--alvo-line)", 
                    borderRadius: 12, 
                    color: "var(--alvo-ink)", 
                    outline: "none",
                    boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)",
                    transition: "var(--alvo-transition-creamy)"
                  }}
                  className="interactive-input"
                />
              </div>

              <div style={{ borderTop: "1px solid var(--alvo-line)", paddingTop: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div>
                    <strong style={{ color: "var(--alvo-ink)", fontSize: "0.9rem", display: "block", fontWeight: 700 }}>Evento Pago (Venda de Ingressos)</strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", fontWeight: 500 }}>Habilitar cobrança de entrada para custos</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newEvent.isPaid}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, isPaid: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: "var(--alvo-accent)", cursor: "pointer" }}
                  />
                </div>

                {newEvent.isPaid && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }} className="animate-entrance">
                    <label style={{ fontSize: "0.85rem", color: "var(--alvo-ink)", fontWeight: 700 }}>Valor do Ingresso (R$)</label>
                    <input
                      type="number"
                      placeholder="Ex: 85"
                      value={newEvent.ticketPrice}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, ticketPrice: Number(e.target.value) }))}
                      style={{ 
                        width: "100%", 
                        padding: "0.75rem 1rem", 
                        backgroundColor: "white", 
                        border: "1px solid var(--alvo-line)", 
                        borderRadius: 12, 
                        color: "var(--alvo-ink)", 
                        outline: "none",
                        boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)",
                        transition: "var(--alvo-transition-creamy)"
                      }}
                      className="interactive-input"
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddDrawer(false)}
                  className="ghost-button"
                  style={{ width: "50%", padding: "0.85rem", borderRadius: 12, border: "1px solid var(--alvo-line)", background: "transparent" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  style={{ width: "50%", padding: "0.85rem", backgroundColor: "var(--alvo-accent)", color: "white", borderRadius: 12, border: "none" }}
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
          <p className="eyebrow" style={{ color: "var(--alvo-accent)" }}>Agenda Geral da Igreja</p>
          <h1>Agenda Estratégica</h1>
          <p>Coordene retiros, conferências e cultos unificados com check-in automatizado.</p>
        </div>
        <div className="topbar-actions">
           <button 
             onClick={() => setShowAddDrawer(true)} 
             className="primary-button compact"
             style={{ backgroundColor: "var(--alvo-accent)", color: "white", padding: "0.75rem 1.25rem", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, border: "none" }}
           >
             <Plus size={16} /> Cadastrar Evento
           </button>
        </div>
      </header>

      {/* Dashboard Mini-KPI Counters */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", margin: "1.5rem 0" }}>
        <div className="metric-card" style={{ padding: "1.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", display: "block", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total de Eventos</span>
          <strong style={{ fontSize: "1.75rem", color: "var(--alvo-ink)", display: "block", marginTop: 4, fontWeight: 850 }}>{events.length}</strong>
        </div>
        <div className="metric-card" style={{ padding: "1.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", display: "block", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Inscritos Totais</span>
          <strong style={{ fontSize: "1.75rem", color: "var(--alvo-accent)", display: "block", marginTop: 4, fontWeight: 850 }}>
            {Object.values(attendeesMap).reduce((acc, curr) => acc + curr.length, 0)}
          </strong>
        </div>
        <div className="metric-card" style={{ padding: "1.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", display: "block", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Padrão Financeiro</span>
          <strong style={{ fontSize: "1.75rem", color: "var(--alvo-green)", display: "block", marginTop: 4, fontWeight: 850 }}>R$ 18.520</strong>
        </div>
        <div className="metric-card" style={{ padding: "1.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", display: "block", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Taxa de Presença</span>
          <strong style={{ fontSize: "1.75rem", color: "var(--alvo-ink)", display: "block", marginTop: 4, fontWeight: 850 }}>62%</strong>
        </div>
      </section>

      {/* Main Grid */}
      <section className="events-grid">
        
        {/* Lado Esquerdo: Agenda de Navegação e Filtros */}
        <aside className="events-sidebar panel" style={{ padding: "1.5rem" }}>
          
          {/* Busca por Evento */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "white", border: "1px solid var(--alvo-line)", padding: "0.6rem 1rem", borderRadius: 12, marginBottom: "1.25rem", boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)" }}>
            <Search size={16} style={{ color: "var(--alvo-ink-soft)" }} />
            <input 
              placeholder="Buscar evento..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: "0.85rem", color: "var(--alvo-ink)", width: "100%", fontWeight: 500 }}
            />
          </div>

          {/* Filtros de Categoria */}
          <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
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
                  background: typeFilter === cat ? "var(--alvo-accent)" : "rgba(15, 23, 42, 0.04)",
                  color: typeFilter === cat ? "white" : "var(--alvo-ink-soft)",
                  transition: "var(--alvo-transition-creamy)",
                  boxShadow: typeFilter === cat ? "0 4px 10px rgba(249, 115, 22, 0.2)" : "none"
                }}
                className="hover-scale"
              >
                {cat === "all" && "Todos"}
                {cat === "conference" && "Conferências"}
                {cat === "service" && "Cultos"}
                {cat === "camp" && "Retiros"}
                {cat === "training" && "Treinos"}
                {cat === "celebration" && "Festa"}
              </button>
            ))}
          </div>

          <div className="section-heading compact">
            <h2>Agenda de Eventos</h2>
          </div>
          
          <div className="event-list-scroll">
            {filteredEvents.length === 0 ? (
              <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem 0", fontWeight: 500 }}>Nenhum evento encontrado.</p>
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
                      background: isSelected ? "linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(37, 99, 235, 0.02) 100%)" : "transparent",
                      borderColor: isSelected ? "rgba(249, 115, 22, 0.25)" : "transparent",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      boxShadow: isSelected ? "inset 0 0 0 1px rgba(249, 115, 22, 0.1)" : "none",
                      transform: isSelected ? "translateX(4px)" : "none"
                    }}
                  >
                    <div className="event-date-box" style={{ background: isSelected ? "var(--alvo-accent)" : "rgba(15, 23, 42, 0.05)" }}>
                      <strong style={{ color: isSelected ? "white" : "var(--alvo-ink)" }}>{date.getDate()}</strong>
                      <span style={{ color: isSelected ? "white" : "var(--alvo-ink-soft)" }}>{date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                    </div>
                    <div className="event-info">
                      <strong style={{ color: isSelected ? "var(--alvo-accent)" : "var(--alvo-ink)" }}>{event.name}</strong>
                      <p style={{ color: "var(--alvo-ink-soft)" }}>{event.locationType === 'onsite' ? '📍 Presencial' : '📺 Online'}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Lado Direito: Visualizador de Painel Detalhado e Check-in */}
        <article className="event-detail-panel panel" style={{ boxShadow: "var(--alvo-shadow-airy)" }}>
          {activeEvent ? (
            <>
              {/* Top Details Header */}
              <div className="detail-header">
                <div className="title-area" style={{ flex: 1 }}>
                  <span className={`event-type-badge ${activeEvent.type}`} style={{ background: "rgba(249, 115, 22, 0.1)", color: "var(--alvo-accent)" }}>
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
                  <h2 style={{ color: "var(--alvo-ink)", fontSize: "1.75rem", fontWeight: 850, margin: "6px 0 10px 0", letterSpacing: "-0.02em" }}>{activeEvent.name}</h2>
                  <p style={{ color: "var(--alvo-ink-soft)", fontSize: "0.95rem", lineHeight: "1.55", fontWeight: 500 }}>{activeEvent.description}</p>
                  
                  <div style={{ display: "flex", gap: "1rem", color: "var(--alvo-ink-soft)", fontSize: "0.85rem", marginTop: 14, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                      <MapPin size={14} style={{ color: "var(--alvo-accent)" }} />
                      {activeEvent.location}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                      <Ticket size={14} style={{ color: "var(--alvo-green)" }} />
                      {activeEvent.isPaid ? `R$ ${activeEvent.ticketPrice?.toFixed(2).replace('.', ',')}` : "Gratuito"}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                      <Calendar size={14} style={{ color: "var(--alvo-blue)" }} />
                      {new Date(activeEvent.startsAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                </div>

                <div className="checkin-quick-btn" style={{ marginLeft: "1.5rem" }}>
                   <button 
                     onClick={() => setShowScanner(true)} 
                     className="scan-mode-btn hover-scale" 
                     style={{ 
                       backgroundColor: "var(--alvo-accent)", 
                       color: "white", 
                       borderRadius: 14, 
                       border: "none", 
                       boxShadow: "0 4px 15px rgba(249, 115, 22, 0.25)",
                       transition: "var(--alvo-transition-creamy)"
                     }}
                   >
                     <QrCode size={18} /> Iniciar Check-in QR
                   </button>
                </div>
              </div>

              {/* KPIs & Performance Panel */}
              <div className="detail-stats-row" style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem", marginBottom: "2rem" }}>
                 <div className="stat-box" style={{ background: "rgba(255, 255, 255, 0.5)", border: "1px solid rgba(255, 255, 255, 0.6)", borderRadius: 20, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.01)" }}>
                   <Users size={20} style={{ color: "var(--alvo-accent)" }} />
                   <div>
                     <strong style={{ color: "var(--alvo-ink)", fontWeight: 800 }}>{stats.total} / {activeEvent.capacity || '∞'}</strong>
                     <span style={{ color: "var(--alvo-ink-soft)", fontWeight: 600 }}>Inscritos Totais</span>
                   </div>
                 </div>
                 <div className="stat-box" style={{ background: "rgba(255, 255, 255, 0.5)", border: "1px solid rgba(255, 255, 255, 0.6)", borderRadius: 20, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.01)" }}>
                   <Ticket size={20} style={{ color: "var(--alvo-green)" }} />
                   <div>
                     <strong style={{ color: "var(--alvo-ink)", fontWeight: 800 }}>{stats.paymentPercent}%</strong>
                     <span style={{ color: "var(--alvo-ink-soft)", fontWeight: 600 }}>Confirmações Pagas</span>
                   </div>
                 </div>
                 <div className="stat-box" style={{ background: "rgba(255, 255, 255, 0.5)", border: "1px solid rgba(255, 255, 255, 0.6)", borderRadius: 20, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.01)" }}>
                   <Clock size={20} style={{ color: "var(--alvo-blue)" }} />
                   <div>
                     <strong style={{ color: "var(--alvo-ink)", fontWeight: 800 }}>{stats.checkinPercent}%</strong>
                     <span style={{ color: "var(--alvo-ink-soft)", fontWeight: 600 }}>Taxa de Entrada</span>
                   </div>
                 </div>
              </div>

              {/* Registrations List and Quick Registration */}
              <div className="registrations-section" style={{ borderTop: "1px solid var(--alvo-line)", paddingTop: "1.75rem" }}>
                 
                 <div className="section-header-compact" style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ color: "var(--alvo-ink)", fontSize: "1.1rem", fontWeight: 850 }}>Membros Inscritos</h3>
                      <p style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", margin: 0, fontWeight: 500 }}>Gestão de presenças e credenciamento de ingressos</p>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <div className="search-mini" style={{ background: "white", border: "1px solid var(--alvo-line)", borderRadius: 10, boxShadow: "0 2px 4px rgba(15, 23, 42, 0.01)" }}>
                        <Search size={14} style={{ color: "var(--alvo-ink-soft)" }} />
                        <input 
                          placeholder="Buscar inscrito..." 
                          value={guestSearchQuery}
                          onChange={(e) => setGuestSearchQuery(e.target.value)}
                          style={{ color: "var(--alvo-ink)", fontSize: "0.8rem", fontWeight: 500 }}
                        />
                      </div>

                      <button
                        onClick={() => setShowAddGuestForm(!showAddGuestForm)}
                        style={{
                          backgroundColor: "white",
                          border: "1px solid var(--alvo-line)",
                          borderRadius: 10,
                          padding: "0.5rem 1rem",
                          color: "var(--alvo-ink)",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                          transition: "var(--alvo-transition-creamy)",
                          boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)"
                        }}
                        className="hover-card"
                      >
                        <UserPlus size={14} style={{ color: "var(--alvo-accent)" }} />
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
                       background: "rgba(255, 255, 255, 0.35)",
                       border: "1px dashed rgba(15, 23, 42, 0.12)",
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
                       <label style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", fontWeight: 700 }}>NOME</label>
                       <input 
                         required 
                         placeholder="Ex: Carlos"
                         value={newGuest.firstName}
                         onChange={(e) => setNewGuest(prev => ({ ...prev, firstName: e.target.value }))}
                         style={{ 
                           padding: "0.5rem 0.75rem", 
                           border: "1px solid var(--alvo-line)", 
                           background: "white", 
                           borderRadius: 8, 
                           color: "var(--alvo-ink)", 
                           fontSize: "0.85rem", 
                           outline: "none",
                           boxShadow: "0 2px 4px rgba(15, 23, 42, 0.01)" 
                         }}
                         className="interactive-input"
                       />
                     </div>
                     <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                       <label style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", fontWeight: 700 }}>SOBRENOME</label>
                       <input 
                         required 
                         placeholder="Ex: Santos"
                         value={newGuest.lastName}
                         onChange={(e) => setNewGuest(prev => ({ ...prev, lastName: e.target.value }))}
                         style={{ 
                           padding: "0.5rem 0.75rem", 
                           border: "1px solid var(--alvo-line)", 
                           background: "white", 
                           borderRadius: 8, 
                           color: "var(--alvo-ink)", 
                           fontSize: "0.85rem", 
                           outline: "none",
                           boxShadow: "0 2px 4px rgba(15, 23, 42, 0.01)" 
                         }}
                         className="interactive-input"
                       />
                     </div>
                     <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                       <label style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", fontWeight: 700 }}>E-MAIL</label>
                       <input 
                         required 
                         type="email"
                         placeholder="carlos@gmail.com"
                         value={newGuest.email}
                         onChange={(e) => setNewGuest(prev => ({ ...prev, email: e.target.value }))}
                         style={{ 
                           padding: "0.5rem 0.75rem", 
                           border: "1px solid var(--alvo-line)", 
                           background: "white", 
                           borderRadius: 8, 
                           color: "var(--alvo-ink)", 
                           fontSize: "0.85rem", 
                           outline: "none",
                           boxShadow: "0 2px 4px rgba(15, 23, 42, 0.01)" 
                         }}
                         className="interactive-input"
                       />
                     </div>
                     <button 
                       type="submit" 
                       className="primary-button" 
                       style={{ padding: "0.6rem 1.25rem", borderRadius: 8, backgroundColor: "var(--alvo-accent)", color: "white", fontWeight: 700, border: "none" }}
                     >
                       Adicionar
                     </button>
                   </form>
                 )}

                 {/* Lista Principal de Inscritos */}
                 <div className="registrations-list" style={{ display: "grid", gap: "0.75rem" }}>
                    {filteredAttendees.length === 0 ? (
                      <div style={{ padding: "3.5rem 0", textAlign: "center", color: "var(--alvo-ink-soft)" }}>
                        <Users size={36} style={{ opacity: 0.25, marginBottom: 10, color: "var(--alvo-accent)" }} />
                        <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>Nenhum convidado inscrito ou localizado na busca.</p>
                      </div>
                    ) : (
                      filteredAttendees.map(att => (
                        <div 
                          key={att.id} 
                          className="reg-item" 
                          style={{ 
                            background: "rgba(255, 255, 255, 0.35)", 
                            border: "1px solid rgba(255, 255, 255, 0.5)", 
                            borderRadius: 16,
                            transition: "var(--alvo-transition-creamy)",
                            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.01)"
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
                                backgroundColor: att.checkedIn ? "var(--alvo-green-soft)" : "rgba(15, 23, 42, 0.04)", 
                                border: att.checkedIn ? "1px solid rgba(22, 163, 74, 0.2)" : "1px solid rgba(15, 23, 42, 0.06)",
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                color: att.checkedIn ? "var(--alvo-green)" : "var(--alvo-ink)",
                                fontWeight: 750,
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                transition: "var(--alvo-transition-creamy)"
                              }}
                              className="hover-scale"
                            >
                              {att.firstName[0]}{att.lastName[0]}
                            </div>
                            <div className="reg-person" onClick={() => setInspectedAttendee(att)} style={{ cursor: "pointer" }}>
                              <strong style={{ color: "var(--alvo-ink)", fontWeight: 750, fontSize: "0.9375rem" }}>{att.firstName} {att.lastName}</strong>
                              <span style={{ color: "var(--alvo-ink-soft)", fontWeight: 500 }}>Inscrito em {att.registrationDate} · <span style={{ fontFamily: "monospace" }}>{att.ticketCode}</span></span>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                            {/* Badges de pagamentos */}
                            <span 
                              style={{ 
                                fontSize: "0.7rem", 
                                fontWeight: 800, 
                                padding: "4px 8px", 
                                borderRadius: 6,
                                textTransform: "uppercase",
                                backgroundColor: att.paymentStatus === "paid" ? "var(--alvo-green-soft)" : att.paymentStatus === "free" ? "var(--alvo-blue-soft)" : "rgba(234, 179, 8, 0.12)",
                                color: att.paymentStatus === "paid" ? "var(--alvo-green)" : att.paymentStatus === "free" ? "var(--alvo-blue)" : "#d97706",
                                border: att.paymentStatus === "paid" ? "1px solid rgba(22, 163, 74, 0.15)" : att.paymentStatus === "free" ? "1px solid rgba(37, 99, 235, 0.15)" : "1px solid rgba(234, 179, 8, 0.15)"
                              }}
                            >
                              {att.paymentStatus === "paid" && "Pago"}
                              {att.paymentStatus === "free" && "Gratuito"}
                              {att.paymentStatus === "pending" && "Pendente"}
                            </span>

                            {/* Status de Check-in + Ações rápidas */}
                            {att.checkedIn ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--alvo-green)", fontSize: "0.85rem", fontWeight: 750 }}>
                                <CheckCircle2 size={16} />
                                <span>Entrou {att.checkedInAt}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleQuickCheckin(att.id)}
                                style={{
                                  backgroundColor: "white",
                                  border: "1px solid var(--alvo-line)",
                                  borderRadius: 8,
                                  padding: "0.4rem 0.85rem",
                                  color: "var(--alvo-ink)",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  transition: "var(--alvo-transition-creamy)",
                                  boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)"
                                }}
                                className="hover-card"
                              >
                                Check-in Manual
                              </button>
                            )}

                            <button 
                              onClick={() => setInspectedAttendee(att)}
                              style={{ background: "none", border: "none", color: "var(--alvo-ink-soft)", cursor: "pointer", display: "flex", alignItems: "center", transition: "var(--alvo-transition-creamy)" }}
                              className="hover-scale"
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
              <CalendarDays size={48} style={{ opacity: 0.25, color: "var(--alvo-accent)", marginBottom: 12 }} />
              <p style={{ color: "var(--alvo-ink-soft)", fontWeight: 600 }}>Selecione um evento para gerenciar</p>
            </div>
          )}
        </article>
      </section>

      <style jsx>{`
        .events-workbench { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        .events-grid { display: grid; grid-template-columns: 320px 1fr; gap: 2rem; margin-top: 2rem; }
        
        .events-sidebar { height: fit-content; }
        .event-list-scroll { display: grid; gap: 0.75rem; margin-top: 1rem; }
        .event-mini-card { display: flex; gap: 1rem; padding: 1rem; border-radius: 1.25rem; cursor: pointer; transition: var(--alvo-transition-creamy); border: 1px solid transparent; }
        .event-mini-card:hover { background: rgba(255, 255, 255, 0.25); border-color: rgba(255, 255, 255, 0.4); transform: translateY(-1px); }
        
        .event-date-box { width: 50px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; transition: var(--alvo-transition-creamy); }
        .event-date-box strong { font-size: 1.25rem; line-height: 1; }
        .event-date-box span { font-size: 0.65rem; font-weight: 800; }
        
        .event-info strong { display: block; font-size: 0.9375rem; margin-bottom: 2px; transition: var(--alvo-transition-creamy); }
        .event-info p { font-size: 0.75rem; font-weight: 600; }

        .event-detail-panel { min-height: 500px; }
        .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .event-type-badge { padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.75rem; display: inline-block; }
        
        .stat-box { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; transition: var(--alvo-transition-creamy); }
        .stat-box:hover { transform: translateY(-2px); border-color: var(--alvo-accent-soft); }
        .stat-box strong { display: block; font-size: 1.25rem; }
        .stat-box span { font-size: 0.75rem; }

        .registrations-section { }
        .search-mini { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; }
        .search-mini input { border: none; background: transparent; outline: none; }
        
        .reg-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; }
        .reg-item:hover { background: rgba(255, 255, 255, 0.5) !important; border-color: rgba(255, 255, 255, 0.75) !important; transform: translateY(-1.5px); }
        .reg-person strong { display: block; }
        .reg-person span { font-size: 0.75rem; }

        .scan-mode-btn { color: white; border: none; padding: 12px 20px; border-radius: 14px; display: flex; align-items: center; gap: 0.75rem; font-weight: 800; cursor: pointer; }
        
        /* Utility animations & styles */
        .hover-scale { transition: var(--alvo-transition-creamy); }
        .hover-scale:hover { transform: scale(1.03); }
        .hover-card { transition: var(--alvo-transition-creamy); }
        .hover-card:hover { transform: translateY(-1.5px); border-color: var(--glass-border-hover) !important; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04) !important; }
        
        .interactive-input {
          transition: var(--alvo-transition-creamy);
        }
        .interactive-input:focus {
          border-color: var(--alvo-accent) !important;
          box-shadow: 0 0 0 3px var(--alvo-field-ring) !important;
        }

        .empty-selection {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          text-align: center;
        }
        
        @keyframes scanLine {
          0% { top: 15%; }
          50% { top: 85%; }
          100% { top: 15%; }
        }

        @media (max-width: 1024px) {
          .events-grid { grid-template-columns: 1fr; }
          .detail-stats-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

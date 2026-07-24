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
import { fetchEvents, saveEvent, deleteEvent, fetchEventRegistrations } from "@alvo/firebase";
import type { Event as DomainEvent, EventRegistration as DomainEventRegistration } from "@alvo/types";

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

export interface VolunteerAssignment {
  id: string;
  role: string;
  volunteerName: string;
  status: "confirmed" | "pending" | "declined";
  teamName: string;
}

export interface WorshipSong {
  id: string;
  title: string;
  artist: string;
  key: string;
  links: {
    chords?: string;
    youtube?: string;
    spotify?: string;
  }
}

// Inicializadores de Lojas/Eventos de Teste
const initialEvents: EventType[] = [
  {
    id: "event_women_2026",
    name: "Conferência Águas Profundas 2026",
    description: "O maior encontro de mulheres do Plataforma Esdras. Três dias de imersão espiritual profunda na identidade, propósito e cura emocional para abençoar sua vida.",
    type: "conference",
    status: "published",
    locationType: "onsite",
    startsAt: "2026-06-12T19:00:00Z",
    endsAt: "2026-06-14T12:00:00Z",
    capacity: 350,
    isPaid: true,
    ticketPrice: 85,
    location: "Auditório Principal - Plataforma Esdras"
  },
  {
    id: "event_baptism_may",
    name: "Batismo Geral de Outono",
    description: "A pública profissão de fé e celebração da ressurreição espiritual de dezenas de novos discípulos que descerão às águas no Plataforma Esdras.",
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
    location: "Sítio Esdras de Recantos - Cotia"
  }
];

const mockScheduleMap: Record<string, VolunteerAssignment[]> = {
  event_women_2026: [
    { id: "v1", role: "Líder de Recepção", volunteerName: "Ana Silva", status: "confirmed", teamName: "Acolhimento" },
    { id: "v2", role: "Operador de Som", volunteerName: "Felipe Andrade", status: "confirmed", teamName: "Mídia/Som" },
    { id: "v3", role: "Câmera 1", volunteerName: "Rodrigo Melo", status: "pending", teamName: "Mídia/Som" },
    { id: "v4", role: "Apoio Diaconato", volunteerName: "Matheus Costa", status: "confirmed", teamName: "Ordem e Protocolo" },
    { id: "v5", role: "Recepcionista Portal", volunteerName: "Clara Santos", status: "pending", teamName: "Acolhimento" },
  ],
  event_baptism_may: [
    { id: "v10", role: "Apoio Batismo", volunteerName: "Matheus Costa", status: "confirmed", teamName: "Ordem e Protocolo" },
    { id: "v11", role: "Operador de Som", volunteerName: "Felipe Andrade", status: "confirmed", teamName: "Mídia/Som" },
    { id: "v12", role: "Fotógrafo", volunteerName: "Júlia Reis", status: "confirmed", teamName: "Mídia/Som" },
  ],
  event_leadership_camp: [
    { id: "v20", role: "Coordenador Geral", volunteerName: "Marina Souza", status: "confirmed", teamName: "Liderança" },
    { id: "v21", role: "Som & Iluminação", volunteerName: "Felipe Andrade", status: "confirmed", teamName: "Mídia/Som" },
    { id: "v22", role: "Socorrista", volunteerName: "Dra. Patrícia Lima", status: "confirmed", teamName: "Saúde" },
    { id: "v23", role: "Logística Sítio", volunteerName: "Carlos Silveira", status: "pending", teamName: "Infraestrutura" },
  ]
};

const mockWorshipMap: Record<string, WorshipSong[]> = {
  event_women_2026: [
    { id: "s1", title: "Águas Profundas", artist: "Esdras Worship", key: "D", links: { chords: "https://cifraclub.com.br", youtube: "https://youtube.com", spotify: "https://spotify.com" } },
    { id: "s2", title: "O Lindo Nome", artist: "Hillsong Em Português", key: "D", links: { chords: "https://cifraclub.com.br", youtube: "https://youtube.com", spotify: "https://spotify.com" } },
    { id: "s3", title: "Yeshua", artist: "Alessandro Vilas Boas", key: "Am", links: { chords: "https://cifraclub.com.br", youtube: "https://youtube.com", spotify: "https://spotify.com" } },
  ],
  event_baptism_may: [
    { id: "s10", title: "Fará Ele Outra Vez", artist: "Elevation Worship", key: "G", links: { chords: "https://cifraclub.com.br", youtube: "https://youtube.com" } },
    { id: "s11", title: "A Ele a Glória", artist: "Diante do Trono", key: "C", links: { chords: "https://cifraclub.com.br", spotify: "https://spotify.com" } },
  ],
  event_leadership_camp: [
    { id: "s20", title: "Tua Presença é o Meu Bem", artist: "Esdras Worship", key: "E", links: { chords: "https://cifraclub.com.br", youtube: "https://youtube.com", spotify: "https://spotify.com" } },
    { id: "s21", title: "Ruach", artist: "Comunidade da Zona Sul", key: "F#m", links: { chords: "https://cifraclub.com.br", youtube: "https://youtube.com" } },
  ]
};

// Mapeadores entre o shape rico do view (EventType) e o Event persistido no Firestore.
function slugifyEvent(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}
const TYPE_TO_DOMAIN: Record<EventType["type"], DomainEvent["type"]> = {
  conference: "conference", service: "service", camp: "retreat", training: "training", celebration: "kids_event"
};
const TYPE_FROM_DOMAIN: Record<DomainEvent["type"], EventType["type"]> = {
  conference: "conference", service: "service", retreat: "camp", training: "training", integration_class: "training", kids_event: "celebration"
};
function viewToDomain(v: EventType, orgId: string): DomainEvent {
  return {
    id: v.id,
    organizationId: orgId,
    name: v.name,
    slug: slugifyEvent(v.name) || v.id,
    description: v.description || undefined,
    type: TYPE_TO_DOMAIN[v.type] ?? "service",
    status: v.status === "completed" ? "closed" : v.status === "draft" ? "draft" : "published",
    locationType: v.locationType === "online" ? "online" : "onsite",
    startsAt: v.startsAt,
    endsAt: v.endsAt || undefined,
    capacity: v.capacity || undefined,
    isPaid: v.isPaid,
    locationName: v.location || undefined,
    priceAmount: v.isPaid ? (v.ticketPrice ?? 0) : undefined
  };
}
function domainToView(e: DomainEvent): EventType {
  return {
    id: e.id,
    name: e.name,
    description: e.description ?? "",
    type: TYPE_FROM_DOMAIN[e.type] ?? "service",
    status: e.status === "closed" || e.status === "cancelled" ? "completed" : e.status === "draft" ? "draft" : "published",
    locationType: e.locationType === "online" ? "online" : "onsite",
    startsAt: e.startsAt,
    endsAt: e.endsAt ?? "",
    capacity: e.capacity ?? 0,
    isPaid: e.isPaid,
    ticketPrice: e.priceAmount,
    location: e.locationName ?? ""
  };
}

// Inscrição real (Firestore) -> Attendee do view. checkedIn fica false até o
// scanner de check-in (fatia 3b) gravar EventCheckIn.
function regToAttendee(reg: DomainEventRegistration): Attendee {
  const name = (reg.personName && reg.personName.trim()) || reg.registrationCode;
  const parts = name.split(" ");
  return {
    id: reg.id,
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    email: reg.personEmail ?? "",
    registrationDate: reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString("pt-BR") : "",
    status: reg.status === "confirmed" ? "confirmed" : "pending",
    paymentStatus: reg.paymentStatus === "paid" ? "paid" : reg.paymentStatus === "not_required" ? "free" : "pending",
    checkedIn: false,
    ticketCode: reg.registrationCode,
  };
}

export function EventsView() {
  const { configured, firebaseReady, firebaseConfig, organizationId } = useAppAuth();
  
  // Estados reativos — eventos carregados do Firestore (não mais mock).
  const [events, setEvents] = useState<EventType[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "conference" | "service" | "camp" | "training" | "celebration">("all");
  
  // Novos estados para Abas e Calendário
  const [activeTab, setActiveTab] = useState<"attendees" | "schedule" | "worship">("attendees");
  const [sidebarMode, setSidebarMode] = useState<"list" | "calendar">("list");
  const [notifiedAttendeeId, setNotifiedAttendeeId] = useState<string | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2026, 5, 1)); // Junho 2026

  // Carga real dos eventos do Firestore (substitui o mock local).
  useEffect(() => {
    let cancelled = false;
    if (!configured || !firebaseReady || !organizationId) return;
    (async () => {
      try {
        const domain = await fetchEvents(firebaseConfig, { organizationId }, 100);
        if (cancelled) return;
        const mapped = domain.map(domainToView).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        setEvents(mapped);
        setSelectedEventId((cur) => cur || mapped[0]?.id || "");
        // Inscrições REAIS: monta o attendeesMap a partir do Firestore.
        try {
          const regs = await fetchEventRegistrations(firebaseConfig, { organizationId }, domain, 500);
          if (cancelled) return;
          const map: Record<string, Attendee[]> = {};
          for (const reg of regs) {
            (map[reg.eventId] ??= []).push(regToAttendee(reg));
          }
          setAttendeesMap(map);
        } catch (regErr) {
          console.error("fetchEventRegistrations falhou:", regErr);
        }
      } catch (err) {
        console.error("fetchEvents falhou:", err);
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    })();
    return () => { cancelled = true; };
  }, [configured, firebaseReady, firebaseConfig, organizationId]);

  // Sincroniza o mês do calendário com o evento selecionado
  useEffect(() => {
    const active = events.find(e => e.id === selectedEventId);
    if (active) {
      const d = new Date(active.startsAt);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [selectedEventId, events]);

  // Helpers para o Mini-Calendário
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: Array<{ dayNumber: number | null; hasEvent: boolean; isSelected: boolean }> = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, hasEvent: false, isSelected: false });
    }
    
    const active = events.find(e => e.id === selectedEventId);
    for (let day = 1; day <= totalDays; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayHasEvent = events.some(e => e.startsAt.startsWith(dateString));
      
      let dayIsSelected = false;
      if (active) {
        const activeDate = new Date(active.startsAt);
        dayIsSelected = activeDate.getFullYear() === year &&
                        activeDate.getMonth() === month &&
                        activeDate.getDate() === day;
      }
      
      days.push({ dayNumber: day, hasEvent: dayHasEvent, isSelected: dayIsSelected });
    }
    
    return days;
  }, [currentMonth, events, selectedEventId]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (dayNumber: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    const dayEvent = events.find(e => e.startsAt.startsWith(dateString));
    if (dayEvent) {
      setSelectedEventId(dayEvent.id);
    }
  };
  
  // Gaveta lateral de Novo Evento (também usada para editar)
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  // Inscritos por evento — preenchido com dados REAIS do Firestore no efeito de carga.
  const [attendeesMap, setAttendeesMap] = useState<Record<string, Attendee[]>>({});

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

  const resetEventForm = () => {
    setNewEvent({
      name: "", description: "", type: "conference", locationType: "onsite",
      startsAt: "", capacity: 100, isPaid: false, ticketPrice: 0, location: ""
    });
    setEditingId(null);
    setShowAddDrawer(false);
  };

  // Abre a gaveta em modo EDIÇÃO, pré-preenchida com o evento.
  const openEditDrawer = (evt: EventType) => {
    setNewEvent({
      name: evt.name, description: evt.description, type: evt.type,
      locationType: evt.locationType, startsAt: evt.startsAt, capacity: evt.capacity,
      isPaid: evt.isPaid, ticketPrice: evt.ticketPrice ?? 0, location: evt.location
    });
    setEditingId(evt.id);
    setShowAddDrawer(true);
  };

  // Cria OU edita — persiste no Firestore (aparece/atualiza no app).
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name) return;

    const isEdit = !!editingId;
    const existing = isEdit ? events.find(ev => ev.id === editingId) : undefined;
    const savedEvent: EventType = {
      id: editingId ?? `event_${Date.now()}`,
      name: newEvent.name,
      description: newEvent.description || "",
      type: newEvent.type as EventType["type"],
      status: existing?.status ?? "published",
      locationType: newEvent.locationType as EventType["locationType"],
      startsAt: newEvent.startsAt || new Date().toISOString(),
      endsAt: existing?.endsAt || new Date(Date.now() + 7200000).toISOString(),
      capacity: Number(newEvent.capacity) || 100,
      isPaid: newEvent.isPaid || false,
      ticketPrice: newEvent.isPaid ? Number(newEvent.ticketPrice) : undefined,
      location: newEvent.location || "Plataforma Esdras"
    };

    try {
      await saveEvent(firebaseConfig, { organizationId }, viewToDomain(savedEvent, organizationId));
    } catch (err) {
      console.error("saveEvent falhou:", err);
      setNotificationBanner({ message: "Não foi possível salvar o evento. Tente de novo.", type: "info" });
      return;
    }

    setEvents(prev => {
      const next = isEdit ? prev.map(ev => ev.id === savedEvent.id ? savedEvent : ev) : [savedEvent, ...prev];
      return next.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    });
    setSelectedEventId(savedEvent.id);
    setNotificationBanner({
      message: isEdit ? `Evento "${savedEvent.name}" atualizado.` : `Evento "${savedEvent.name}" publicado — já aparece no app.`,
      type: "success"
    });
    if (!isEdit) setAttendeesMap(prev => ({ ...prev, [savedEvent.id]: [] }));
    resetEventForm();
  };

  // Exclui o evento (some do web e do app).
  const handleDeleteEvent = async (evt: EventType) => {
    setDeletingId(evt.id);
    try {
      await deleteEvent(firebaseConfig, { organizationId }, evt.id);
      setEvents(prev => {
        const next = prev.filter(ev => ev.id !== evt.id);
        setSelectedEventId(cur => cur === evt.id ? (next[0]?.id ?? "") : cur);
        return next;
      });
      setNotificationBanner({ message: `Evento "${evt.name}" excluído.`, type: "info" });
    } catch (err) {
      console.error("deleteEvent falhou:", err);
      setNotificationBanner({ message: "Não foi possível excluir o evento.", type: "info" });
    } finally {
      setDeletingId(null);
    }
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

    if (activeEvent.isPaid) {
      setNotificationBanner({
        message: `Inscrição para ${newGuest.firstName} realizada! Uma notificação de cobrança (PIX) no valor de R$ ${(activeEvent.ticketPrice ?? 0).toFixed(2).replace('.', ',')} foi enviada ao app pessoal dele.`,
        type: "success"
      });
    } else {
      setNotificationBanner({
        message: `Inscrição gratuita para ${newGuest.firstName} realizada! A credencial foi enviada ao app pessoal dele.`,
        type: "info"
      });
    }

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
    <main 
      className="events-workbench animate-entrance"
      style={{
        ["--alvo-accent" as string]: "#2563eb",
        ["--alvo-accent-soft" as string]: "rgba(37, 99, 235, 0.08)",
        ["--alvo-accent-dark" as string]: "#1e3a8a"
      }}
    >
      
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
              textAlign: "center",
              maxHeight: "90vh",
              overflowY: "auto"
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
                <span style={{ fontSize: "0.75rem", letterSpacing: 2, fontWeight: 900, color: "var(--alvo-accent)", textTransform: "uppercase" }}>ESDRAS EVENTOS</span>
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

                {/* Logística de Cobrança e Notificação do App Esdras */}
                {activeEvent.isPaid && (
                  <div style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(15, 23, 42, 0.08)", paddingTop: "1.25rem", textAlign: "left" }}>
                    <h5 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--alvo-ink)", margin: "0 0 0.75rem 0" }}>💰 Cobrança & Integração App</h5>
                    
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", fontWeight: 600 }}>Status Pagamento:</span>
                      <span style={{ 
                        fontSize: "0.75rem", 
                        fontWeight: 700, 
                        padding: "2px 8px", 
                        borderRadius: 6,
                        backgroundColor: inspectedAttendee.paymentStatus === "paid" ? "var(--alvo-green-soft)" : "rgba(234, 179, 8, 0.12)",
                        color: inspectedAttendee.paymentStatus === "paid" ? "var(--alvo-green)" : "#d97706"
                      }}>
                        {inspectedAttendee.paymentStatus === "paid" ? "Pago (PIX)" : "Aguardando Pagamento"}
                      </span>
                    </div>

                    {inspectedAttendee.paymentStatus !== "paid" && (
                      <div style={{ background: "rgba(15, 23, 42, 0.03)", padding: "0.85rem", borderRadius: 12, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        
                        {/* QR Code de Pagamento PIX */}
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                          <div style={{ background: "white", padding: "4px", borderRadius: 8, border: "1px solid var(--alvo-line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <QrCode size={50} style={{ color: "#0f172a" }} />
                          </div>
                          <div>
                            <span style={{ fontSize: "0.7rem", color: "var(--alvo-ink-soft)", display: "block", fontWeight: 800 }}>PIX COPIA E COLA / QR CODE</span>
                            <span style={{ fontSize: "0.72rem", color: "var(--alvo-ink)", fontWeight: 500 }}>R$ {(activeEvent.ticketPrice ?? 0).toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>

                        {/* Chave PIX */}
                        <div>
                          <span style={{ fontSize: "0.7rem", color: "var(--alvo-ink-soft)", display: "block", fontWeight: 800 }}>CHAVE PIX</span>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                            <code style={{ fontSize: "0.75rem", color: "var(--alvo-accent)", fontWeight: 700 }}>financeiro@plataformaesdras.com.br</code>
                            <button 
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText("financeiro@plataformaesdras.com.br");
                                alert("Chave PIX copiada!");
                              }}
                              style={{ padding: "2px 6px", fontSize: "0.65rem", background: "white", border: "1px solid var(--alvo-line)", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
                            >
                              Copiar
                            </button>
                          </div>
                        </div>

                        {/* Dados Bancários */}
                        <div>
                          <span style={{ fontSize: "0.7rem", color: "var(--alvo-ink-soft)", display: "block", fontWeight: 800 }}>DADOS BANCÁRIOS</span>
                          <p style={{ margin: "2px 0 0 0", fontSize: "0.72rem", color: "var(--alvo-ink)", lineHeight: 1.3 }}>
                            Banco Cora (403) • Ag. 0001<br />
                            C/C: 128456-9 • Plataforma Esdras
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Notificação Push no App */}
                    <div style={{ marginTop: "0.75rem", background: "var(--alvo-accent-soft)", border: "1px solid rgba(37, 99, 235, 0.12)", padding: "0.85rem", borderRadius: 12 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--alvo-accent-dark)", display: "block" }}>
                        📲 Notificação no App Esdras
                      </span>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.72rem", color: "var(--alvo-ink-soft)", lineHeight: 1.3 }}>
                        A cobrança está ativa na área pessoal do membro e pode ser paga diretamente via aplicativo.
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setNotifiedAttendeeId(inspectedAttendee.id);
                          setTimeout(() => {
                            alert(`A cobrança já está visível para ${inspectedAttendee.firstName} no aplicativo. O reenvio de notificação push estará disponível em breve.`);
                          }, 100);
                        }}
                        style={{
                          marginTop: "0.75rem",
                          width: "100%",
                          padding: "0.45rem",
                          backgroundColor: notifiedAttendeeId === inspectedAttendee.id ? "var(--alvo-green)" : "var(--alvo-accent)",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        {notifiedAttendeeId === inspectedAttendee.id ? "✓ Cobrança Notificada no Celular!" : "🔔 Reenviar Notificação no Celular"}
                      </button>
                    </div>
                  </div>
                )}
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
                <span style={{ color: "var(--alvo-accent)", fontSize: "0.75rem", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{editingId ? "EDIÇÃO" : "NOVO COMPROMISSO"}</span>
                <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--alvo-ink)", margin: "2px 0 0 0" }}>{editingId ? "Editar Evento" : "Cadastrar Evento"}</h3>
              </div>
              <button
                onClick={resetEventForm}
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
                  placeholder="Ex: Conferência de Jovens Esdras"
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
                  placeholder="Ex: Auditório Kids Plataforma Esdras"
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
                      type="text"
                      placeholder="R$ 0,00"
                      value={newEvent.ticketPrice !== undefined ? newEvent.ticketPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/\D/g, "");
                        const numericVal = cleanVal ? parseFloat(cleanVal) / 100 : undefined;
                        setNewEvent(prev => ({ ...prev, ticketPrice: numericVal }));
                      }}
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
                  onClick={resetEventForm}
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
                  {editingId ? "Salvar alterações" : "Salvar Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Agenda Estratégica</h1>
          <p className="page-subtitle">Coordene retiros, conferências e cultos unificados com check-in automatizado.</p>
        </div>
        <div className="page-header-actions">
           <button
             onClick={() => { resetEventForm(); setShowAddDrawer(true); }}
             className="primary-button compact"
             style={{ backgroundColor: "var(--alvo-accent)", color: "white", padding: "0.75rem 1.25rem", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, border: "none" }}
           >
             <Plus size={16} /> Cadastrar Evento
           </button>
        </div>
      </header>

      {/* Dashboard Mini-KPI Counters */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-body">
            <span className="stat-label">Total de Eventos</span>
            <span className="stat-value">{events.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-body">
            <span className="stat-label">Inscritos Totais</span>
            <span className="stat-value">{Object.values(attendeesMap).reduce((acc, curr) => acc + curr.length, 0)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-body">
            <span className="stat-label">Padrão Financeiro</span>
            <span className="stat-value">—</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-body">
            <span className="stat-label">Taxa de Presença</span>
            <span className="stat-value">—</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <section className="events-grid">
        
        {/* Lado Esquerdo: Agenda de Navegação e Filtros */}
        <aside className="events-sidebar panel" style={{ padding: "1.5rem" }}>
          
          {/* Alternador de Visualização da Sidebar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.25rem", padding: "3px", background: "var(--alvo-surface-muted)", borderRadius: 10 }}>
            <button
              onClick={() => setSidebarMode("list")}
              style={{
                padding: "0.5rem",
                borderRadius: 8,
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: sidebarMode === "list" ? "var(--alvo-surface)" : "transparent",
                color: sidebarMode === "list" ? "var(--alvo-accent)" : "var(--alvo-ink-soft)",
                boxShadow: sidebarMode === "list" ? "0 2px 5px rgba(0,0,0,0.05)" : "none",
                transition: "var(--alvo-transition-creamy)"
              }}
            >
              Lista
            </button>
            <button
              onClick={() => setSidebarMode("calendar")}
              style={{
                padding: "0.5rem",
                borderRadius: 8,
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: sidebarMode === "calendar" ? "var(--alvo-surface)" : "transparent",
                color: sidebarMode === "calendar" ? "var(--alvo-accent)" : "var(--alvo-ink-soft)",
                boxShadow: sidebarMode === "calendar" ? "0 2px 5px rgba(0,0,0,0.05)" : "none",
                transition: "var(--alvo-transition-creamy)"
              }}
            >
              Calendário
            </button>
          </div>

          {sidebarMode === "list" ? (
            <>
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
                      boxShadow: typeFilter === cat ? "0 4px 10px rgba(37, 99, 235, 0.15)" : "none"
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
                          background: isSelected ? "linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(37, 99, 235, 0.01) 100%)" : "var(--alvo-surface)",
                          borderColor: isSelected ? "var(--alvo-accent)" : "var(--alvo-line)",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.04)" : "0 2px 4px rgba(15, 23, 42, 0.02)",
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
            </>
          ) : (
            <div className="mini-calendar-container animate-entrance" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "var(--alvo-ink)", fontSize: "0.9rem", textTransform: "capitalize" }}>
                  {currentMonth.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
                </strong>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button onClick={handlePrevMonth} style={{ border: "1px solid var(--alvo-line)", background: "var(--alvo-surface)", borderRadius: "6px", width: "26px", height: "26px", cursor: "pointer", color: "var(--alvo-ink)", fontWeight: "bold" }}>&lt;</button>
                  <button onClick={handleNextMonth} style={{ border: "1px solid var(--alvo-line)", background: "var(--alvo-surface)", borderRadius: "6px", width: "26px", height: "26px", cursor: "pointer", color: "var(--alvo-ink)", fontWeight: "bold" }}>&gt;</button>
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" }}>
                {["D", "S", "T", "Q", "Q", "S", "S"].map(d => (
                  <small key={d} style={{ color: "var(--alvo-ink-soft)", fontWeight: 800, fontSize: "0.7rem" }}>{d}</small>
                ))}
                {calendarDays.map((day, idx) => {
                  if (day.dayNumber === null) {
                    return <div key={`empty-${idx}`} />;
                  }
                  const isDaySelected = day.isSelected;
                  const hasEvent = day.hasEvent;
                  
                  return (
                    <button
                      key={`day-${day.dayNumber}`}
                      onClick={() => handleDayClick(day.dayNumber!)}
                      disabled={!hasEvent}
                      style={{
                        border: "none",
                        borderRadius: "8px",
                        aspectRatio: "1",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: hasEvent ? "pointer" : "default",
                        background: isDaySelected
                          ? "var(--alvo-accent)"
                          : hasEvent
                          ? "var(--alvo-accent-soft)"
                          : "transparent",
                        color: isDaySelected
                          ? "white"
                          : hasEvent
                          ? "var(--alvo-accent)"
                          : "var(--alvo-ink-soft)",
                        position: "relative",
                        transition: "var(--alvo-transition-creamy)",
                        opacity: hasEvent ? 1 : 0.4
                      }}
                      className={hasEvent ? "hover-scale" : ""}
                    >
                      {day.dayNumber}
                      {hasEvent && !isDaySelected && (
                        <span style={{ position: "absolute", bottom: "3px", left: "50%", transform: "translateX(-50%)", width: "4px", height: "4px", borderRadius: "50%", background: "var(--alvo-accent)" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Lado Direito: Visualizador de Painel Detalhado e Check-in */}
        <article className="event-detail-panel panel" style={{ boxShadow: "var(--alvo-shadow-airy)" }}>
          {activeEvent ? (
            <>
              {/* Top Details Header */}
              <div className="detail-header">
                <div className="title-area" style={{ flex: 1 }}>
                  <span className={`event-type-badge ${activeEvent.type}`} style={{ background: "var(--alvo-accent-soft)", color: "var(--alvo-accent)" }}>
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
                      {activeEvent.isPaid ? `R$ ${(activeEvent.ticketPrice ?? 0).toFixed(2).replace('.', ',')}` : "Gratuito"}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                      <Calendar size={14} style={{ color: "var(--alvo-blue)" }} />
                      {new Date(activeEvent.startsAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                </div>

                <div className="checkin-quick-btn" style={{ marginLeft: "1.5rem", display: "flex", alignItems: "center", gap: 8 }}>
                   <button
                     onClick={() => openEditDrawer(activeEvent)}
                     className="hover-scale"
                     style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: "var(--alvo-surface)", color: "var(--alvo-ink)", borderRadius: 12, border: "1px solid var(--alvo-line)", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}
                   >
                     <FileText size={16} /> Editar
                   </button>
                   <button
                     onClick={() => { if (window.confirm(`Excluir o evento "${activeEvent.name}"? Some do web e do app.`)) void handleDeleteEvent(activeEvent); }}
                     disabled={deletingId === activeEvent.id}
                     className="hover-scale"
                     style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: "var(--alvo-surface)", color: "#c0392b", borderRadius: 12, border: "1px solid var(--alvo-line)", padding: "10px 14px", fontWeight: 700, cursor: "pointer", opacity: deletingId === activeEvent.id ? 0.6 : 1 }}
                   >
                     <X size={16} /> Excluir
                   </button>
                   <button
                     onClick={() => setShowScanner(true)}
                     className="scan-mode-btn hover-scale"
                     style={{
                       backgroundColor: "var(--alvo-accent)",
                       color: "white",
                       borderRadius: 14,
                       border: "none",
                       boxShadow: "0 4px 15px rgba(37, 99, 235, 0.2)",
                       transition: "var(--alvo-transition-creamy)"
                     }}
                   >
                     <QrCode size={18} /> Iniciar Check-in QR
                   </button>
                </div>
              </div>

              {/* KPIs & Performance Panel */}
              <div className="detail-stats-row" style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem", marginBottom: "2rem" }}>
                 <div className="stat-box" style={{ background: "var(--alvo-surface)", border: "1px solid var(--alvo-line)", borderRadius: 20, boxShadow: "0 2px 6px rgba(15, 23, 42, 0.02)" }}>
                   <Users size={20} style={{ color: "var(--alvo-accent)" }} />
                   <div>
                     <strong style={{ color: "var(--alvo-ink)", fontWeight: 800 }}>{stats.total} / {activeEvent.capacity || '∞'}</strong>
                     <span style={{ color: "var(--alvo-ink-soft)", fontWeight: 600 }}>Inscritos Totais</span>
                   </div>
                 </div>
                 <div className="stat-box" style={{ background: "var(--alvo-surface)", border: "1px solid var(--alvo-line)", borderRadius: 20, boxShadow: "0 2px 6px rgba(15, 23, 42, 0.02)" }}>
                   <Ticket size={20} style={{ color: "var(--alvo-green)" }} />
                   <div>
                     <strong style={{ color: "var(--alvo-ink)", fontWeight: 800 }}>{stats.paymentPercent}%</strong>
                     <span style={{ color: "var(--alvo-ink-soft)", fontWeight: 600 }}>Confirmações Pagas</span>
                   </div>
                 </div>
                 <div className="stat-box" style={{ background: "var(--alvo-surface)", border: "1px solid var(--alvo-line)", borderRadius: 20, boxShadow: "0 2px 6px rgba(15, 23, 42, 0.02)" }}>
                   <Clock size={20} style={{ color: "var(--alvo-blue)" }} />
                   <div>
                     <strong style={{ color: "var(--alvo-ink)", fontWeight: 800 }}>{stats.checkinPercent}%</strong>
                     <span style={{ color: "var(--alvo-ink-soft)", fontWeight: 600 }}>Taxa de Entrada</span>
                   </div>
                 </div>
              </div>

              {/* Tabs Navigation */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--alvo-line)", marginBottom: "1.5rem" }}>
                {[
                  { id: "attendees", label: "Inscritos (Check-in)" },
                  { id: "schedule", label: "Escala de Serviço" },
                  { id: "worship", label: "Repertório (Worship)" }
                ].map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      style={{
                        padding: "0.75rem 1.25rem",
                        border: "none",
                        background: "none",
                        borderBottom: isActive ? "2px solid var(--alvo-accent)" : "2px solid transparent",
                        color: isActive ? "var(--alvo-accent)" : "var(--alvo-ink-soft)",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "var(--alvo-transition-creamy)",
                        marginBottom: "-1px"
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === "attendees" && (
                <div className="registrations-section animate-entrance" style={{ paddingTop: "0.5rem" }}>
                   {notificationBanner && (
                     <div 
                       style={{ 
                         display: "flex", 
                         alignItems: "center", 
                         justifyContent: "space-between", 
                         padding: "0.75rem 1rem", 
                         background: notificationBanner.type === "success" ? "var(--alvo-green-soft)" : "var(--alvo-accent-soft)", 
                         border: `1px solid ${notificationBanner.type === "success" ? "rgba(22, 163, 74, 0.2)" : "rgba(37, 99, 235, 0.2)"}`, 
                         borderRadius: 12, 
                         color: notificationBanner.type === "success" ? "var(--alvo-green)" : "var(--alvo-accent-dark)", 
                         fontSize: "0.8rem", 
                         fontWeight: 600, 
                         marginBottom: "1rem" 
                       }}
                     >
                       <span>{notificationBanner.message}</span>
                       <button 
                         type="button"
                         onClick={() => setNotificationBanner(null)} 
                         style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center" }}
                       >
                         <X size={14} />
                       </button>
                     </div>
                   )}
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
                         background: "var(--alvo-surface)",
                         border: "1px dashed var(--alvo-line)",
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
                              background: "var(--alvo-surface)", 
                              border: "1px solid var(--alvo-line)", 
                              borderRadius: 16,
                              transition: "var(--alvo-transition-creamy)",
                              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)"
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
              )}

              {activeTab === "schedule" && (
                <div className="schedule-section animate-entrance" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div>
                    <h3 style={{ color: "var(--alvo-ink)", fontSize: "1.1rem", fontWeight: 850, margin: 0 }}>Escala de Serviço</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", margin: "4px 0 0 0", fontWeight: 500 }}>Voluntários escalados para este evento e status de confirmação</p>
                  </div>
                  
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {(!mockScheduleMap[activeEvent.id] || mockScheduleMap[activeEvent.id].length === 0) ? (
                      <div style={{ padding: "3.5rem 0", textAlign: "center", color: "var(--alvo-ink-soft)" }}>
                        <Users size={36} style={{ opacity: 0.25, marginBottom: 10, color: "var(--alvo-accent)" }} />
                        <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>Nenhum voluntário escalado para este evento.</p>
                      </div>
                    ) : (
                      mockScheduleMap[activeEvent.id].map(assignment => (
                        <div
                          key={assignment.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "1rem",
                            background: "var(--alvo-surface)",
                            border: "1px solid var(--alvo-line)",
                            borderRadius: 16,
                            boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)"
                          }}
                        >
                          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                            <div style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: "var(--alvo-surface-muted)",
                              border: "1px solid var(--alvo-line)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--alvo-accent)",
                              fontWeight: 800,
                              fontSize: "0.8rem"
                            }}>
                              {assignment.role.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ color: "var(--alvo-ink)", fontSize: "0.9rem", fontWeight: 750, display: "block" }}>{assignment.volunteerName}</strong>
                              <span style={{ color: "var(--alvo-ink-soft)", fontSize: "0.75rem", fontWeight: 600 }}>{assignment.role} · <code style={{ color: "var(--alvo-accent)" }}>{assignment.teamName}</code></span>
                            </div>
                          </div>
                          
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              padding: "4px 8px",
                              borderRadius: 6,
                              textTransform: "uppercase",
                              backgroundColor: assignment.status === "confirmed" ? "var(--alvo-green-soft)" : assignment.status === "pending" ? "rgba(234, 179, 8, 0.12)" : "var(--alvo-red-soft)",
                              color: assignment.status === "confirmed" ? "var(--alvo-green)" : assignment.status === "pending" ? "#d97706" : "var(--alvo-red)",
                              border: assignment.status === "confirmed" ? "1px solid rgba(22, 163, 74, 0.15)" : assignment.status === "pending" ? "1px solid rgba(234, 179, 8, 0.15)" : "1px solid rgba(220, 38, 38, 0.15)"
                            }}
                          >
                            {assignment.status === "confirmed" ? "Confirmado" : assignment.status === "pending" ? "Pendente" : "Recusado"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === "worship" && (
                <div className="worship-section animate-entrance" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div>
                    <h3 style={{ color: "var(--alvo-ink)", fontSize: "1.1rem", fontWeight: 850, margin: 0 }}>Setlist & Repertório</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)", margin: "4px 0 0 0", fontWeight: 500 }}>Músicas selecionadas para o culto/evento e materiais de ensaio</p>
                  </div>
                  
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {(!mockWorshipMap[activeEvent.id] || mockWorshipMap[activeEvent.id].length === 0) ? (
                      <div style={{ padding: "3.5rem 0", textAlign: "center", color: "var(--alvo-ink-soft)" }}>
                        <Users size={36} style={{ opacity: 0.25, marginBottom: 10, color: "var(--alvo-accent)" }} />
                        <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>Nenhuma música cadastrada no setlist deste evento.</p>
                      </div>
                    ) : (
                      mockWorshipMap[activeEvent.id].map(song => (
                        <div
                          key={song.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "1rem",
                            background: "var(--alvo-surface)",
                            border: "1px solid var(--alvo-line)",
                            borderRadius: 16,
                            boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)"
                          }}
                        >
                          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                            <div style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: "var(--alvo-accent-soft)",
                              border: "1px solid var(--alvo-line)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--alvo-accent)",
                              fontWeight: 850,
                              fontSize: "0.8rem"
                            }}>
                              Tom: {song.key}
                            </div>
                            <div>
                              <strong style={{ color: "var(--alvo-ink)", fontSize: "0.9rem", fontWeight: 750, display: "block" }}>{song.title}</strong>
                              <span style={{ color: "var(--alvo-ink-soft)", fontSize: "0.75rem", fontWeight: 600 }}>{song.artist}</span>
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            {song.links.chords && (
                              <a
                                href={song.links.chords}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  padding: "0.4rem 0.75rem",
                                  borderRadius: 8,
                                  background: "var(--alvo-surface)",
                                  border: "1px solid var(--alvo-line)",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: "var(--alvo-ink)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  textDecoration: "none"
                                }}
                                className="hover-card"
                              >
                                <FileText size={12} style={{ color: "var(--alvo-accent)" }} />
                                Cifra
                              </a>
                            )}
                            {song.links.youtube && (
                              <a
                                href={song.links.youtube}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  padding: "0.4rem 0.75rem",
                                  borderRadius: 8,
                                  background: "var(--alvo-surface)",
                                  border: "1px solid var(--alvo-line)",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: "var(--alvo-ink)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  textDecoration: "none"
                                }}
                                className="hover-card"
                              >
                                <ArrowRight size={12} style={{ color: "var(--alvo-red)" }} />
                                YouTube
                              </a>
                            )}
                            {song.links.spotify && (
                              <a
                                href={song.links.spotify}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  padding: "0.4rem 0.75rem",
                                  borderRadius: 8,
                                  background: "var(--alvo-surface)",
                                  border: "1px solid var(--alvo-line)",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: "var(--alvo-ink)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  textDecoration: "none"
                                }}
                                className="hover-card"
                              >
                                <Check size={12} style={{ color: "var(--alvo-green)" }} />
                                Spotify
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
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
        .event-mini-card { display: flex; gap: 1rem; padding: 1rem; border-radius: 1.25rem; cursor: pointer; transition: var(--alvo-transition-creamy); border: 1px solid var(--alvo-line); background: var(--alvo-surface); box-shadow: 0 2px 4px rgba(15, 23, 42, 0.02); }
        .event-mini-card:hover { border-color: rgba(37, 99, 235, 0.25); background: var(--alvo-surface-muted); transform: translateY(-1.5px); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04); }
        
        .event-date-box { width: 50px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; transition: var(--alvo-transition-creamy); }
        .event-date-box strong { font-size: 1.25rem; line-height: 1; }
        .event-date-box span { font-size: 0.65rem; font-weight: 800; }
        
        .event-info strong { display: block; font-size: 0.9375rem; margin-bottom: 2px; transition: var(--alvo-transition-creamy); }
        .event-info p { font-size: 0.75rem; font-weight: 600; }

        .event-detail-panel { min-height: 500px; }
        .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .event-type-badge { padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.75rem; display: inline-block; }
        
        .stat-box { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; transition: var(--alvo-transition-creamy); }
        .stat-box:hover { transform: translateY(-2px); border-color: rgba(37, 99, 235, 0.25); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04); }
        .stat-box strong { display: block; font-size: 1.25rem; }
        .stat-box span { font-size: 0.75rem; }

        .registrations-section { }
        .search-mini { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; }
        .search-mini input { border: none; background: transparent; outline: none; }
        
        .reg-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; }
        .reg-item:hover { background: var(--alvo-surface) !important; border-color: rgba(37, 99, 235, 0.3) !important; transform: translateY(-1.5px); box-shadow: 0 6px 15px rgba(15, 23, 42, 0.06) !important; }
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

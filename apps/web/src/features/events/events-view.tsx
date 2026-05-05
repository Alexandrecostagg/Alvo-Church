"use client";

import { useState, useEffect } from "react";
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
  ArrowRight
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { fetchEvents, fetchEventRegistrations } from "@alvo/firebase";
import type { Event, EventRegistration } from "@alvo/types";
import { recentPeople } from "../../lib/mock-data";

// Mock Fallback
const mockEvents: Event[] = [
  {
    id: "event_women_2026",
    organizationId: "org_alvo",
    title: "Conferência Águas Profundas",
    description: "Um mergulho na identidade e propósito feminino.",
    type: "conference",
    status: "published",
    locationType: "onsite",
    locationName: "Campus Central Alvo",
    startAt: "2026-06-12T19:00:00Z",
    endAt: "2026-06-14T12:00:00Z",
    capacity: 350,
    tags: ["mulheres", "conferencia"]
  },
  {
    id: "event_baptism_may",
    organizationId: "org_alvo",
    title: "Batismo de Outono",
    description: "Pública profissão de fé de novos discípulos.",
    type: "service",
    status: "published",
    locationType: "onsite",
    locationName: "Sítio Alvo",
    startAt: "2026-05-24T09:00:00Z",
    endAt: "2026-05-24T13:00:00Z",
    capacity: 100,
    tags: ["batismo", "festa"]
  }
];

export function EventsView() {
  const { configured, firebaseConfig, organizationId } = useAppAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [status, setStatus] = useState("Sincronizando calendário...");

  useEffect(() => {
    if (!configured) return;

    async function loadEvents() {
      try {
        const nextEvents = await fetchEvents(firebaseConfig, { organizationId }, 10);
        const finalEvents = nextEvents.length > 0 ? nextEvents : mockEvents;
        setEvents(finalEvents);
        setSelectedEventId(finalEvents[0]?.id || null);
        setStatus(nextEvents.length > 0 ? `${nextEvents.length} eventos reais.` : "Modo demonstração ativo.");
      } catch (error) {
        setEvents(mockEvents);
        setSelectedEventId(mockEvents[0]?.id || null);
        setStatus("Falha ao sincronizar. Usando dados mock.");
      }
    }
    void loadEvents();
  }, [configured, firebaseConfig, organizationId]);

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

  return (
    <main className="events-workbench animate-entrance">
      <header className="topbar">
        <div className="topbar-content">
          <p className="eyebrow">Eventos e Experiências</p>
          <h1>Agenda Estratégica</h1>
          <p>Gerencie conferências, batismos e treinamentos com inteligência de dados.</p>
        </div>
        <div className="topbar-actions">
           <button className="primary-button compact">
             <Plus size={16} /> Novo Evento
           </button>
        </div>
      </header>

      <section className="events-grid">
        <aside className="events-sidebar">
          <div className="section-heading compact">
            <h2>Próximos Eventos</h2>
          </div>
          <div className="event-list-scroll">
            {events.map(event => (
              <div 
                key={event.id} 
                className={`event-mini-card ${selectedEventId === event.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedEventId(event.id)}
              >
                <div className="event-date-box">
                  <strong>{new Date(event.startAt).getDate()}</strong>
                  <span>{new Date(event.startAt).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                </div>
                <div className="event-info">
                  <strong>{event.title}</strong>
                  <p>{event.locationName}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <article className="event-detail-panel antigravity-float">
          {selectedEvent ? (
            <>
              <div className="detail-header">
                <div className="title-area">
                  <span className={`event-type-badge ${selectedEvent.type}`}>{selectedEvent.type}</span>
                  <h2>{selectedEvent.title}</h2>
                  <p>{selectedEvent.description}</p>
                </div>
                <div className="checkin-quick-btn">
                   <button className="scan-mode-btn">
                     <QrCode size={18} /> Iniciar Check-in
                   </button>
                </div>
              </div>

              <div className="detail-stats-row">
                 <div className="stat-box">
                   <Users size={20} />
                   <div>
                     <strong>128 / {selectedEvent.capacity || '∞'}</strong>
                     <span>Inscritos</span>
                   </div>
                 </div>
                 <div className="stat-box">
                   <Ticket size={20} />
                   <div>
                     <strong>84%</strong>
                     <span>Pagamentos</span>
                   </div>
                 </div>
                 <div className="stat-box">
                   <Clock size={20} />
                   <div>
                     <strong>{new Date(selectedEvent.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                     <span>Início</span>
                   </div>
                 </div>
              </div>

              <div className="registrations-section">
                 <div className="section-header-compact">
                    <h3>Inscrições Recentes</h3>
                    <div className="search-mini">
                      <Search size={14} />
                      <input placeholder="Filtrar por nome..." />
                    </div>
                 </div>
                 <div className="registrations-list">
                    {recentPeople.slice(0, 5).map(person => (
                      <div key={person.id} className="reg-item">
                        <div className="reg-person">
                           <strong>{person.firstName} {person.lastName}</strong>
                           <span>Inscrito em {new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="reg-status">
                           <span className="status-pill-reg confirmed">Confirmado</span>
                           <ArrowRight size={14} />
                        </div>
                      </div>
                    ))}
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
        .event-mini-card:hover { background: #f8fafc; }
        .event-mini-card.is-selected { background: #fff7ed; border-color: #fdba74; }
        
        .event-date-box { width: 50px; height: 50px; background: #111827; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; }
        .event-date-box strong { font-size: 1.25rem; line-height: 1; }
        .event-date-box span { font-size: 0.65rem; font-weight: 800; }
        
        .event-info strong { display: block; font-size: 0.9375rem; margin-bottom: 2px; }
        .event-info p { font-size: 0.75rem; color: var(--alvo-ink-soft); }

        .event-detail-panel { background: white; border-radius: 2.5rem; padding: 2.5rem; border: 1px solid var(--alvo-line); box-shadow: var(--alvo-shadow-strong); min-height: 500px; }
        .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
        .event-type-badge { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.75rem; display: inline-block; }
        .event-type-badge.conference { background: #dbeafe; color: #1e40af; }
        .event-type-badge.service { background: #fef3c7; color: #92400e; }
        
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
        
        @media (max-width: 1024px) {
          .events-grid { grid-template-columns: 1fr; }
          .detail-stats-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}

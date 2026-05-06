"use client";

import { useEffect, useState } from "react";
import { 
  HeartPulse, 
  AlertTriangle, 
  Calendar, 
  Video, 
  BookOpen, 
  LineChart, 
  Smile, 
  Meh, 
  Frown, 
  Zap, 
  ShieldAlert,
  UserCheck,
  MessageCircle,
  Play,
  Loader2
} from "lucide-react";
import type { LeaderEmotionalPulse, WellBeingResource, MentoringSession, TenantContext } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { 
  fetchLeaderEmotionalPulses, 
  fetchWellBeingResources, 
  fetchMentoringSessions,
  saveLeaderEmotionalPulse,
  triggerEmergencySOS
} from "@alvo/firebase";

export function WellnessView() {
  const { user, firebaseConfig, organizationId, firebaseReady, tenantReady } = useAppAuth();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [pulses, setPulses] = useState<LeaderEmotionalPulse[]>([]);
  const [resources, setResources] = useState<WellBeingResource[]>([]);
  const [sessions, setSessions] = useState<MentoringSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!firebaseReady || !tenantReady || !user?.uid) return;
      try {
        setLoading(true);
        const context: TenantContext = { organizationId };
        const [p, r, s] = await Promise.all([
          fetchLeaderEmotionalPulses(firebaseConfig, context, user.uid),
          fetchWellBeingResources(firebaseConfig, context),
          fetchMentoringSessions(firebaseConfig, context, user.uid)
        ]);
        setPulses(p);
        setResources(r);
        setSessions(s);
      } catch (error) {
        console.error("Error loading wellness data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [firebaseConfig, organizationId, firebaseReady, tenantReady, user?.uid]);

  const handleMoodSelect = async (moodId: string) => {
    if (!firebaseReady || !tenantReady || !user?.uid) return;
    
    const context: TenantContext = { organizationId };
    setSelectedMood(moodId);
    
    // Map moodId to numeric energy level (simple mapping for now)
    const energyMap: Record<string, number> = {
      radiant: 10,
      happy: 8,
      neutral: 5,
      tired: 3,
      exhausted: 1,
      distressed: 0
    };

    try {
      await saveLeaderEmotionalPulse(firebaseConfig, context, {
        leaderId: user.uid,
        organizationId: organizationId,
        mood: moodId as any,
        energyLevel: energyMap[moodId] || 5,
        stressLevel: 5, // Default for now
        notedAt: new Date().toISOString(),
      });
      
      // Refresh pulses
      const updatedPulses = await fetchLeaderEmotionalPulses(firebaseConfig, context, user.uid);
      setPulses(updatedPulses);
      
      if (moodId === 'distressed') {
        await triggerEmergencySOS(firebaseConfig, context, user.uid, "Auto-triggered via mood tracker");
        alert("S.O.S disparado! Nossa equipe entrará em contato em breve.");
      }
    } catch (error) {
      console.error("Error saving mood:", error);
    }
  };

  const moods = [
    { id: "radiant", icon: Zap, label: "Radiante", color: "#fbbf24" },
    { id: "happy", icon: Smile, label: "Bem", color: "#10b981" },
    { id: "neutral", icon: Meh, label: "Ok", color: "#6b7280" },
    { id: "tired", icon: Frown, label: "Cansado", color: "#f59e0b" },
    { id: "exhausted", icon: AlertTriangle, label: "Exausto", color: "#ef4444" },
    { id: "distressed", icon: ShieldAlert, label: "S.O.S", color: "#7f1d1d" },
  ];

  return (
    <main className="wellness-container animate-entrance">
      <header className="wellness-header">
        <div className="header-info">
          <div className="eyebrow">
            <HeartPulse size={14} />
            Cuidado e Sustentabilidade
          </div>
          <h1>Saúde do Líder</h1>
          <p>Porque para cuidar de outros, você precisa estar bem. Monitore sua saúde emocional e acesse suporte especializado.</p>
        </div>

        <button 
          className="sos-emergency-btn"
          onClick={async () => {
            if (!firebaseReady || !tenantReady || !user?.uid) return;
            const context: TenantContext = { organizationId };
            if (confirm("Você deseja disparar um S.O.S Liderança?")) {
              await triggerEmergencySOS(firebaseConfig, context, user.uid, "Manual trigger via SOS button");
              alert("S.O.S disparado! Nossa equipe entrará em contato em breve.");
            }
          }}
        >
          <Zap size={20} fill="currentColor" />
          <span>S.O.S LIDERANÇA</span>
          <div className="pulse-ring"></div>
        </button>
      </header>

      {loading && (
        <div className="loading-overlay">
          <Loader2 className="animate-spin" />
          <span>Carregando dados...</span>
        </div>
      )}

      <div className="wellness-grid">
        {/* Mood Tracker Section */}
        <section className="wellness-card mood-tracker">
          <div className="card-header">
            <div className="header-title">
              <Smile size={20} />
              <h3>Como você está hoje?</h3>
            </div>
            <span>Check-in diário</span>
          </div>
          <div className="mood-options">
            {moods.map((mood) => (
              <button 
                key={mood.id} 
                className={`mood-btn ${selectedMood === mood.id ? 'active' : ''}`}
                onClick={() => handleMoodSelect(mood.id)}
                style={{ '--mood-color': mood.color } as any}
              >
                <mood.icon size={24} />
                <span>{mood.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Emotional Pulse Chart (Mock representation) */}
        <section className="wellness-card emotional-pulse">
          <div className="card-header">
            <div className="header-title">
              <LineChart size={20} />
              <h3>Pulso Emocional</h3>
            </div>
            <button className="text-link">Ver histórico</button>
          </div>
          <div className="chart-placeholder">
            <div className="mock-chart">
              {pulses.map((pulse, i) => (
                <div key={pulse.id} className="chart-bar-wrapper">
                  <div 
                    className="chart-bar" 
                    style={{ 
                      height: `${(pulse.energyLevel / 10) * 100}%`,
                      background: i === pulses.length - 1 ? 'var(--alvo-accent)' : 'var(--alvo-line)'
                    }}
                  >
                    <div className="bar-tooltip">{pulse.energyLevel}/10</div>
                  </div>
                  <span className="bar-label">{new Date(pulse.notedAt).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mentoring Section */}
        <section className="wellness-card mentoring-list">
          <div className="card-header">
            <div className="header-title">
              <UserCheck size={20} />
              <h3>Minhas Mentorias</h3>
            </div>
            <button className="primary-link">Agendar Nova</button>
          </div>
          <div className="sessions-list">
            {sessions.map(session => (
              <div key={session.id} className="session-item">
                <div className="session-info">
                  <div className="specialist-avatar">
                    {session.mentorName[0]}
                  </div>
                  <div>
                    <h4>{session.mentorName}</h4>
                    <span className="specialist-type">Mentor Alvo</span>
                  </div>
                </div>
                <div className="session-time">
                  <Calendar size={14} />
                  <span>{new Date(session.scheduledAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <a href={session.meetingLink} target="_blank" className="join-btn">
                  <Video size={16} /> Entrar
                </a>
              </div>
            ))}
            {sessions.length === 0 && <p className="empty-state">Nenhuma mentoria agendada.</p>}
          </div>
        </section>

        {/* Resources Library */}
        <section className="wellness-card resources-library">
          <div className="card-header">
            <div className="header-title">
              <BookOpen size={20} />
              <h3>Biblioteca de Bem-Estar</h3>
            </div>
          </div>
          <div className="resources-grid">
            {resources.map(resource => (
              <div key={resource.id} className="resource-mini-card">
                <div className="resource-thumb">
                  <Play size={24} fill="white" />
                </div>
                <div className="resource-meta">
                  <span className="res-cat">{resource.category === 'mental' ? 'Saúde Mental' : 'Liderança'}</span>
                  <h4>{resource.title}</h4>
                  <div className="res-footer">
                    <span>Alvo Church</span>
                    <span>{resource.durationMinutes} min</span>
                  </div>
                </div>
              </div>
            ))}
            {resources.length === 0 && <p className="empty-state">Nenhum recurso disponível.</p>}
          </div>
        </section>
      </div>

      <style jsx>{`
        .wellness-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .wellness-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 3rem;
          gap: 2rem;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: #ef4444;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        h1 {
          font-size: 3rem;
          font-weight: 900;
          color: var(--alvo-ink);
          margin-bottom: 1rem;
          letter-spacing: -0.04em;
        }

        .header-info p {
          font-size: 1.25rem;
          color: var(--alvo-ink-soft);
          max-width: 600px;
          line-height: 1.6;
        }

        .sos-emergency-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 1.25rem 2rem;
          border-radius: 1.5rem;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          position: relative;
          box-shadow: 0 10px 40px -10px rgba(239, 68, 68, 0.5);
          transition: all 0.3s;
        }

        .sos-emergency-btn:hover {
          transform: scale(1.05);
          background: #dc2626;
        }

        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid #ef4444;
          border-radius: 1.5rem;
          left: 0;
          top: 0;
          animation: sos-pulse 2s infinite;
          pointer-events: none;
        }

        @keyframes sos-pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        .wellness-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
        }

        .wellness-card {
          background: white;
          border-radius: 2rem;
          border: 1px solid var(--alvo-line);
          padding: 2rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--alvo-ink);
        }

        .header-title h3 {
          font-size: 1.25rem;
          font-weight: 800;
        }

        .card-header span {
          font-size: 0.875rem;
          color: var(--alvo-ink-soft);
          font-weight: 600;
        }

        /* Mood Tracker Styles */
        .mood-options {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 1rem;
        }

        .mood-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 1.25rem;
          border: 1px solid var(--alvo-line);
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--alvo-ink-soft);
        }

        .mood-btn:hover {
          background: white;
          border-color: var(--mood-color);
          color: var(--mood-color);
          transform: translateY(-4px);
        }

        .mood-btn.active {
          background: var(--mood-color);
          color: white;
          border-color: transparent;
          box-shadow: 0 10px 20px -5px var(--mood-color);
        }

        /* Chart Styles */
        .chart-placeholder {
          height: 120px;
          display: flex;
          align-items: flex-end;
        }

        .mock-chart {
          display: flex;
          align-items: flex-end;
          gap: 1.5rem;
          width: 100%;
          height: 100%;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--alvo-line);
        }

        .chart-bar-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          height: 100%;
          justify-content: flex-end;
        }

        .chart-bar {
          width: 100%;
          border-radius: 6px 6px 0 0;
          position: relative;
          min-height: 4px;
        }

        .bar-tooltip {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: #111827;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .chart-bar:hover .bar-tooltip {
          opacity: 1;
        }

        .bar-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--alvo-ink-soft);
          text-transform: uppercase;
        }

        /* Mentoring Styles */
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .session-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          background: #f8fafc;
          border-radius: 1.5rem;
          border: 1px solid var(--alvo-line);
        }

        .session-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .specialist-avatar {
          width: 44px;
          height: 44px;
          background: #e2e8f0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: var(--alvo-ink);
        }

        .session-info h4 {
          font-weight: 800;
          color: var(--alvo-ink);
        }

        .specialist-type {
          font-size: 0.75rem;
          color: var(--alvo-ink-soft);
          font-weight: 600;
        }

        .session-time {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--alvo-ink-soft);
        }

        .join-btn {
          background: white;
          border: 1px solid var(--alvo-line);
          padding: 0.5rem 1rem;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: var(--alvo-ink);
          transition: all 0.2s;
        }

        .join-btn:hover {
          background: var(--alvo-ink);
          color: white;
        }

        /* Resources Styles */
        .resources-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .resource-mini-card {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border-radius: 1.25rem;
          border: 1px solid var(--alvo-line);
          cursor: pointer;
          transition: all 0.2s;
        }

        .resource-mini-card:hover {
          background: #f8fafc;
          border-color: var(--alvo-ink-soft);
        }

        .resource-thumb {
          width: 80px;
          height: 80px;
          background: #111827;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .res-cat {
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--alvo-accent);
          margin-bottom: 0.25rem;
          display: block;
        }

        .resource-meta h4 {
          font-size: 0.9375rem;
          font-weight: 800;
          line-height: 1.3;
          margin-bottom: 0.5rem;
          color: var(--alvo-ink);
        }

        .res-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--alvo-ink-soft);
          font-weight: 600;
        }

        .text-link, .primary-link {
          background: none;
          border: none;
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--alvo-accent);
          cursor: pointer;
        }

        @media (max-width: 1024px) {
          .wellness-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .wellness-header {
            flex-direction: column;
          }
          h1 { font-size: 2.25rem; }
          .mood-options {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .loading-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem;
          color: var(--alvo-ink-soft);
        }

        .empty-state {
          font-size: 0.875rem;
          color: var(--alvo-ink-soft);
          text-align: center;
          padding: 1rem;
          border: 1px dashed var(--alvo-line);
          border-radius: 1rem;
        }
      `}</style>
    </main>
  );
}

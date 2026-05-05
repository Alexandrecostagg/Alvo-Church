"use client";

import Link from "next/link";
import { 
  QrCode, 
  Trophy, 
  Tent, 
  Zap, 
  MapPin, 
  Settings, 
  LogOut, 
  Heart,
  ChevronRight,
  ShieldCheck,
  Star,
  Baby,
  Handshake
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  fetchPeople,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import type { Person, TribeCode } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

export function MemberProfileView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setLoading(false);
      return;
    }

    async function loadMemberData() {
      try {
        const people = await fetchPeople(firebaseConfig, { organizationId }, 100);
        // Find person by email or some mapping (in demo, we match first person or by email)
        const currentPerson = people.find(p => p.email === user?.email) || people[0];
        setPerson(currentPerson);
      } catch (error) {
        console.error("Failed to load member profile:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadMemberData();
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  if (loading) {
    return (
      <div className="member-loading">
        <div className="spinner"></div>
        <p>Sincronizando seu perfil pastoral...</p>
      </div>
    );
  }

  const tribeInfo = getTribeInfo(person?.tribePrimaryCode);
  const tribeAccent = getTribeAccent(person?.tribePrimaryCode);

  return (
    <main className="member-app-shell">
      <header className="member-header">
        <div className="member-user-info">
          <div className="avatar x-large animate-entrance">
            {getInitials(person?.firstName || user?.email || "U")}
          </div>
          <div className="member-welcome animate-entrance" style={{ animationDelay: "0.1s" }}>
            <p className="eyebrow">Olá, {person?.firstName || "Membro Alvo"}</p>
            <h1>É bom ter você aqui.</h1>
            <span className="status-badge" style={{ backgroundColor: tribeAccent.soft, color: tribeAccent.dark }}>
              <ShieldCheck size={12} />
              {person?.memberStatus === "member" ? "Membro Ativo" : "Visitante em Jornada"}
            </span>
          </div>
        </div>
        <button className="tool-button" aria-label="Notificações">
          <Settings size={20} />
        </button>
      </header>

      <section className="member-quick-actions animate-entrance" style={{ animationDelay: "0.2s" }}>
        <Link href="/me/kids" className="action-circle-wrapper">
          <div className="action-circle" style={{ background: '#fef2f2', color: '#ef4444' }}><Baby size={24} /></div>
          <span>Kids</span>
        </Link>
        <Link href="#checkin" className="action-circle-wrapper">
          <div className="action-circle"><QrCode size={24} /></div>
          <span>Check-in</span>
        </Link>
        <Link href="#prayer" className="action-circle-wrapper">
          <div className="action-circle"><Heart size={24} /></div>
          <span>Orar</span>
        </Link>
        <Link href="#giving" className="action-circle-wrapper">
          <div className="action-circle"><Star size={24} /></div>
          <span>Ofertar</span>
        </Link>
      </section>

      <section className="member-cards-container animate-entrance" style={{ animationDelay: "0.3s" }}>
        <article className="member-card-premium">
          <div className="card-tag" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>Próximo Culto</div>
          <h3>Celebração de Domingo</h3>
          <div className="card-meta">
            <MapPin size={14} />
            <span>Campus Principal • 18:00</span>
          </div>
          <button className="primary-pill compact">Lembrar-me</button>
        </article>

        <article className="member-card-premium">
          <div className="card-tag" style={{ backgroundColor: tribeAccent.soft, color: tribeAccent.dark }}>Minha Tribo</div>
          <div className="tribe-row">
             <div className="tribe-icon-small" style={{ backgroundColor: tribeAccent.soft, color: tribeAccent.dark }}>
                <Tent size={20} />
             </div>
             <div>
               <strong>{tribeInfo.name}</strong>
               <p style={{ fontSize: '12px', color: 'var(--alvo-ink-soft)' }}>{tribeInfo.summary}</p>
             </div>
          </div>
          <Link href="/tribes/test" className="text-link" style={{ color: tribeAccent.dark, fontSize: '13px' }}>
            Refazer teste de dons <ChevronRight size={14} />
          </Link>
        </article>

        <article className="member-card-premium">
          <div className="card-tag" style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>Atenção</div>
          <div className="serving-badge">
             <Zap size={20} color="#f59e0b" />
             <div>
                <strong>Você serve hoje!</strong>
                <p style={{ fontSize: '12px', color: 'var(--alvo-ink-soft)' }}>Equipe de Recepção • 17:30</p>
             </div>
          </div>
          <button className="primary-button compact" style={{ backgroundColor: '#111827' }}>Confirmar Presença</button>
        </article>
      </section>

      <section className="member-pass-section animate-entrance" style={{ animationDelay: "0.4s" }}>
        <div className={`getro-pass-card tribe-${person?.tribePrimaryCode || "default"}`}>
          <div className="pass-header">
            <div className="pass-brand">
              <div className="pass-logo">A</div>
              <span>ALVO PASS</span>
            </div>
            <QrCode size={24} opacity={0.6} />
          </div>
          <div className="pass-body">
            <div className="qr-placeholder">
              <svg viewBox="0 0 100 100" fill="currentColor">
                <rect x="10" y="10" width="20" height="20" />
                <rect x="70" y="10" width="20" height="20" />
                <rect x="10" y="70" width="20" height="20" />
                <rect x="35" y="35" width="30" height="30" />
                <rect x="75" y="75" width="15" height="15" />
              </svg>
            </div>
            <div className="pass-details">
              <strong>{person?.memberCardCode || "GETRO-00000"}</strong>
              <p>Escaneie nos parceiros</p>
            </div>
          </div>
        </div>
      </section>

      <section className="journey-progress-card animate-entrance" style={{ animationDelay: "0.5s" }}>
        <div className="card-header">
          <Trophy size={18} />
          <strong>Minha Jornada</strong>
        </div>
        <div className="progress-content">
          <div className="progress-label">
            <span>Membro em Desenvolvimento</span>
            <b style={{ color: tribeAccent.dark }}>72%</b>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: "72%", 
                background: `linear-gradient(90deg, ${tribeAccent.dark}, ${tribeAccent.main})` 
              }} 
            />
          </div>
        </div>
      </section>

      <footer className="member-footer-actions">
        <button className="member-action-button logout">
          <LogOut size={18} />
          <span>Sair do App</span>
        </button>
      </footer>
    </main>
    </main>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function getTribeInfo(code?: TribeCode) {
  const tribes: Record<string, { name: string; summary: string }> = {
    ASHER: { 
      name: "Tribo de Aser", 
      summary: "Excelencia no acolhimento e cuidado de familias." 
    },
    LEVI: { 
      name: "Tribo de Levi", 
      summary: "Adoracao e servico espiritual no ambiente do culto." 
    },
    JUDAH: { 
      name: "Tribo de Judá", 
      summary: "Lideranca, governo e direcao ministerial." 
    },
    default: { 
      name: "Tribo Indefinida", 
      summary: "Faca o teste para descobrir seu perfil pastoral." 
    }
  };

  return tribes[code as string] || tribes.default;
}
function getTribeAccent(code?: TribeCode) {
  const accents: Record<string, { main: string; soft: string; dark: string }> = {
    ASHER: { main: "#10b981", soft: "#ecfdf5", dark: "#065f46" },
    LEVI: { main: "#3b82f6", soft: "#eff6ff", dark: "#1e3a8a" },
    JUDAH: { main: "#f97316", soft: "#fff7ed", dark: "#7c2d12" },
    default: { main: "#6366f1", soft: "#f5f3ff", dark: "#4338ca" }
  };

  return accents[code as string] || accents.default;
}

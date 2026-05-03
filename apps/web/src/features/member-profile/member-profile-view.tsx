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
  Star
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  fetchPeople,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import type { Person, TribeCode } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

const organizationId = "org_alvo_demo";

export function MemberProfileView() {
  const { configured, firebaseReady, user } = useAppAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  const firebaseConfig = useMemo(
    () =>
      createFirebaseWebRuntimeConfigFromEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      }),
    []
  );

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
  }, [configured, firebaseConfig, firebaseReady, user]);

  if (loading) {
    return (
      <div className="member-loading">
        <div className="spinner"></div>
        <p>Sincronizando seu perfil pastoral...</p>
      </div>
    );
  }

  const tribeInfo = getTribeInfo(person?.tribePrimaryCode);

  return (
    <main className="member-app-shell">
      <header className="member-header">
        <div className="member-user-info">
          <div className="avatar x-large animate-entrance">
            {getInitials(person?.firstName || user?.email || "U")}
          </div>
          <div className="member-welcome animate-entrance" style={{ animationDelay: "0.1s" }}>
            <p className="eyebrow">Bem-vindo(a) de volta</p>
            <h1>{person?.firstName || "Membro Alvo"}</h1>
            <span className="status-badge">
              <ShieldCheck size={12} />
              {person?.memberStatus === "member" ? "Membro Ativo" : "Visitante em Jornada"}
            </span>
          </div>
        </div>
        <button className="icon-button ghost" aria-label="Configuracoes">
          <Settings size={20} />
        </button>
      </header>

      <section className="member-pass-section animate-entrance" style={{ animationDelay: "0.2s" }}>
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
                <rect x="50" y="10" width="10" height="10" />
                <rect x="10" y="50" width="10" height="10" />
              </svg>
            </div>
            <div className="pass-details">
              <strong>{person?.memberCardCode || "GETRO-00000"}</strong>
              <p>Escaneie na recepcao ou parceiros</p>
            </div>
          </div>
          <div className="pass-footer">
            <span>Validado por Getro S.O.</span>
            <div className="benefit-hint">
              <Star size={12} />
              Beneficios Ativos
            </div>
          </div>
        </div>
      </section>

      <div className="member-content-grid">
        <section className="tribe-profile-card animate-entrance" style={{ animationDelay: "0.3s" }}>
          <div className="card-header">
            <div className="icon-box tribe-accent">
              <Tent size={18} />
            </div>
            <strong>Minha Tribo</strong>
          </div>
          <div className="tribe-summary">
            <h3>{tribeInfo.name}</h3>
            <p>{tribeInfo.summary}</p>
          </div>
          <Link href="/tribes/test" className="text-link">
            Refazer teste de dons <ChevronRight size={14} />
          </Link>
        </section>

        <section className="journey-progress-card animate-entrance" style={{ animationDelay: "0.4s" }}>
          <div className="card-header">
            <div className="icon-box journey-accent">
              <Trophy size={18} />
            </div>
            <strong>Minha Jornada</strong>
          </div>
          <div className="progress-content">
            <div className="progress-label">
              <span>Membro em Desenvolvimento</span>
              <b>72%</b>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: "72%" }}></div>
            </div>
            <p className="next-step-hint">Falta pouco: Conclua o Trilha 2 para subir de nivel!</p>
          </div>
        </section>

        <section className="connections-grid animate-entrance" style={{ animationDelay: "0.5s" }}>
          <div className="connection-card">
            <Zap size={20} className="icon-zap" />
            <strong>Célula</strong>
            <span>Centro Norte</span>
            <small>Quarta, 19:30</small>
          </div>
          <div className="connection-card">
            <MapPin size={20} className="icon-pin" />
            <strong>Escala</strong>
            <span>Recepção</span>
            <small>Dom, 18:00</small>
          </div>
        </section>

        <section className="member-actions animate-entrance" style={{ animationDelay: "0.6s" }}>
          <button className="member-action-button">
            <Heart size={18} />
            <span>Fazer uma oferta</span>
          </button>
          <button className="member-action-button logout">
            <LogOut size={18} />
            <span>Sair do App</span>
          </button>
        </section>
      </div>
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

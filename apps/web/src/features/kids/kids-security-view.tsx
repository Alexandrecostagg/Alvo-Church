"use client";

import { useState, useEffect } from "react";
import { 
  QrCode, 
  ShieldCheck, 
  UserCircle, 
  Baby, 
  History, 
  AlertCircle,
  ChevronRight,
  Camera,
  CheckCircle2,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useAppAuth } from "../../../app/providers";

// Mock children data for demo
const demoChildren = [
  { id: "child_1", name: "Lucas Santos", age: 5, photo: "", status: "home", lastCheckIn: "2026-05-03" },
  { id: "child_2", name: "Ana Beatriz", age: 3, photo: "", status: "checked_in", lastCheckIn: "2026-05-04 18:30" }
];

export function KidsSecurityView() {
  const { user } = useAppAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [securityToken, setSecurityToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateToken = (childId: string) => {
    setIsGenerating(true);
    setSelectedChildId(childId);
    // Simulate token generation
    setTimeout(() => {
      setSecurityToken(`KIDS_SEC_${Math.random().toString(36).substring(7).toUpperCase()}`);
      setIsGenerating(false);
    }, 800);
  };

  return (
    <main className="member-app-shell">
      <header className="member-header">
        <div className="member-user-info">
          <Link href="/me" className="back-link-circle"><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></Link>
          <div className="member-welcome">
            <p className="eyebrow">Segurança Kids</p>
            <h1>Check-in Escolinha</h1>
          </div>
        </div>
        <div className="icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
           <ShieldCheck size={20} />
        </div>
      </header>

      <section className="kids-status-container">
        <p className="section-subtitle">Selecione o filho para check-in ou retirada</p>
        
        <div className="kids-list">
          {demoChildren.map(child => (
            <div 
              key={child.id} 
              className={`child-card ${selectedChildId === child.id ? 'selected' : ''}`}
              onClick={() => handleGenerateToken(child.id)}
            >
              <div className="child-avatar">
                {child.photo ? <img src={child.photo} alt={child.name} /> : <Baby size={32} />}
              </div>
              <div className="child-info">
                <strong>{child.name}</strong>
                <span>{child.age} anos • {child.status === 'checked_in' ? 'Na Escolinha' : 'Em Casa'}</span>
              </div>
              <div className="child-status-indicator">
                 {child.status === 'checked_in' ? (
                   <span className="live-pulse"></span>
                 ) : (
                   <CheckCircle2 size={20} color="#cbd5e1" />
                 )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {securityToken && (
        <section className="security-token-overlay animate-entrance">
          <div className="token-card antigravity-float">
            <div className="token-header">
              <ShieldCheck size={24} />
              <strong>Token de Segurança</strong>
            </div>
            
            <div className="qr-container">
              {isGenerating ? (
                <div className="qr-skeleton animate-pulse" />
              ) : (
                <div className="qr-display">
                  {/* Real QR component would go here */}
                  <QrCode size={180} strokeWidth={1.5} />
                  <div className="qr-overlay-logo">A</div>
                </div>
              )}
            </div>

            <div className="token-details">
              <strong>{securityToken}</strong>
              <p>Apresente este QR Code para o líder da escolinha no momento da entrega ou retirada.</p>
            </div>

            <div className="token-timer">
              <Clock size={14} />
              <span>Expira em 04:59</span>
            </div>

            <button className="primary-button full" onClick={() => setSecurityToken(null)}>
              Fechar Token
            </button>
          </div>
        </section>
      )}

      <section className="kids-additional-info">
        <article className="info-card">
           <div className="icon-box-small"><Camera size={16} /></div>
           <div>
             <strong>Validação Visual</strong>
             <p>Líderes comparam sua foto cadastrada no momento da retirada.</p>
           </div>
        </article>
        <article className="info-card">
           <div className="icon-box-small"><AlertCircle size={16} /></div>
           <div>
             <strong>Retirada por Terceiros</strong>
             <p>Apenas pessoas autorizadas em seu perfil podem retirar a criança.</p>
           </div>
        </article>
      </section>

      <footer className="kids-history">
        <button className="ghost-button full">
          <History size={18} />
          Ver histórico de check-ins
        </button>
      </footer>
    </main>
  );
}

"use client";

import { MessageSquareText, Bell, Mail, Smartphone, Plus, Send } from "lucide-react";

const CHANNELS = [
  { key: "push", label: "Push Notification", icon: Bell, desc: "Membros com app instalado · gratuito" },
  { key: "email", label: "Email", icon: Mail, desc: "Todos com email cadastrado · via Resend" },
  { key: "sms", label: "SMS", icon: Smartphone, desc: "Alcance amplo · Zenvia · cobrado por envio" },
];

export function CommunicationView() {
  return (
    <div className="page-root">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Comunicação</h1>
          <p className="page-subtitle">Mensagens segmentadas por push, email e SMS</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-primary">
            <Plus size={16} />
            Nova mensagem
          </button>
        </div>
      </header>

      <div className="stats-row">
        {CHANNELS.map((ch) => (
          <div key={ch.key} className="stat-card">
            <div className="stat-icon"><ch.icon size={20} /></div>
            <div className="stat-body">
              <span className="stat-label">{ch.label}</span>
              <span className="stat-value" style={{ fontSize: 13, fontWeight: 500, color: "var(--alvo-ink-soft)" }}>{ch.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Histórico de mensagens</h2>
          <a href="/communication/new" className="section-action">Nova mensagem</a>
        </div>
        <div className="empty-state">
          <Send size={40} strokeWidth={1.4} />
          <p>Nenhuma mensagem enviada ainda.</p>
          <p className="empty-hint">Crie sua primeira mensagem para alcançar membros e visitantes de forma segmentada.</p>
          <button className="btn-primary btn-sm">
            <Plus size={14} />
            Enviar primeira mensagem
          </button>
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Templates salvos</h2>
        </div>
        <div className="empty-state">
          <MessageSquareText size={40} strokeWidth={1.4} />
          <p>Nenhum template criado.</p>
          <p className="empty-hint">Templates agilizam o envio de mensagens recorrentes como lembretes de evento e boas-vindas.</p>
        </div>
      </section>
    </div>
  );
}

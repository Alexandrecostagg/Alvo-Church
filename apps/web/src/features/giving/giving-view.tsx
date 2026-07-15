"use client";

import { useEffect, useState } from "react";
import { HeartHandshake, TrendingUp, Users, Target, Plus, MessageCircle } from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { fetchGivingIntents, isFirebaseWebRuntimeConfigured } from "@alvo/firebase";
import type { GivingIntent } from "@alvo/types";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function GivingView() {
  const { organizationId, firebaseConfig } = useAppAuth();
  const [intents, setIntents] = useState<GivingIntent[]>([]);

  useEffect(() => {
    if (!isFirebaseWebRuntimeConfigured(firebaseConfig)) return;
    fetchGivingIntents(firebaseConfig, { organizationId })
      .then(setIntents)
      .catch((e) => console.error("Falha ao carregar doações captadas:", e));
  }, [organizationId, firebaseConfig]);

  const totalCaptured = intents.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="page-root">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Doações</h1>
          <p className="page-subtitle">Dízimos, ofertas e campanhas da organização</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-primary">
            <Plus size={16} />
            Nova Campanha
          </button>
        </div>
      </header>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon"><HeartHandshake size={20} /></div>
          <div className="stat-body">
            <span className="stat-label">Este mês</span>
            <span className="stat-value">R$ 0,00</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={20} /></div>
          <div className="stat-body">
            <span className="stat-label">Recorrências ativas</span>
            <span className="stat-value">0</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Users size={20} /></div>
          <div className="stat-body">
            <span className="stat-label">Captadas (link público)</span>
            <span className="stat-value">{intents.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Target size={20} /></div>
          <div className="stat-body">
            <span className="stat-label">Campanhas ativas</span>
            <span className="stat-value">0</span>
          </div>
        </div>
      </div>

      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Campanhas de oferta</h2>
        </div>
        <div className="empty-state">
          <Target size={40} strokeWidth={1.4} />
          <p>Nenhuma campanha criada ainda.</p>
          <p className="empty-hint">Crie uma campanha para arrecadar para um projeto ou causa específica.</p>
          <button className="btn-primary btn-sm">
            <Plus size={14} />
            Criar primeira campanha
          </button>
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Doações captadas (link público)</h2>
          {intents.length > 0 && <span style={{ fontSize: 13, color: "var(--alvo-ink-soft, #64748b)" }}>{formatBRL(totalCaptured)} em intenções</span>}
        </div>
        {intents.length === 0 ? (
          <div className="empty-state">
            <HeartHandshake size={40} strokeWidth={1.4} />
            <p>Nenhuma doação captada ainda.</p>
            <p className="empty-hint">As doações feitas pelo link público (/p/&lt;sua-igreja&gt;/give) aparecerão aqui, com o contato do doador.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {intents.map((i) => (
              <div key={i.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderRadius: 12, background: "var(--alvo-surface, #fff)", border: "1px solid var(--alvo-line, #e2e8f0)" }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ color: "var(--alvo-ink, #0f172a)", display: "block", overflowWrap: "anywhere" }}>{i.name}</strong>
                  <span style={{ fontSize: 12, color: "var(--alvo-ink-soft, #64748b)" }}>{formatDate(i.createdAt)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <a href={`https://wa.me/${i.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "#25D366", textDecoration: "none", fontWeight: 600 }}>
                    <MessageCircle size={15} /> {i.whatsapp}
                  </a>
                  <strong style={{ color: "#16a34a" }}>{formatBRL(i.amount)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

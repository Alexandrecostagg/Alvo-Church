"use client";

import { HeartHandshake, TrendingUp, Users, Target, Plus } from "lucide-react";

export function GivingView() {
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
            <span className="stat-label">Doadores únicos</span>
            <span className="stat-value">0</span>
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
          <h2 className="section-title">Últimas doações</h2>
        </div>
        <div className="empty-state">
          <HeartHandshake size={40} strokeWidth={1.4} />
          <p>Nenhuma doação registrada ainda.</p>
          <p className="empty-hint">As doações feitas pelo app ou pelo link público aparecerão aqui.</p>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { HeartHandshake, TrendingUp, Users, Target, Plus, MessageCircle, Trash2, X, CheckCircle2 } from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import {
  fetchGivingIntents,
  fetchGivingCampaigns,
  saveGivingCampaign,
  deleteGivingCampaign,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import type { GivingIntent, GivingCampaign } from "@alvo/types";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function parseAmount(raw: string): number {
  const n = parseFloat(raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function GivingView() {
  const { organizationId, firebaseConfig, user } = useAppAuth();
  const [intents, setIntents] = useState<GivingIntent[]>([]);
  const [campaigns, setCampaigns] = useState<GivingCampaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", goal: "" });

  useEffect(() => {
    if (!isFirebaseWebRuntimeConfigured(firebaseConfig) || !organizationId) return;
    fetchGivingIntents(firebaseConfig, { organizationId }).then(setIntents).catch(() => {});
    fetchGivingCampaigns(firebaseConfig, { organizationId }).then(setCampaigns).catch(() => {});
  }, [organizationId, firebaseConfig]);

  const totalCaptured = useMemo(() => intents.reduce((s, i) => s + i.amount, 0), [intents]);
  const capturedThisMonth = useMemo(() => {
    const now = new Date();
    return intents
      .filter((i) => {
        const d = new Date(i.createdAt);
        return !isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, i) => s + i.amount, 0);
  }, [intents]);
  const activeCampaigns = useMemo(() => campaigns.filter((c) => c.status === "active"), [campaigns]);
  const totalRaised = useMemo(() => campaigns.reduce((s, c) => s + (c.raisedAmount || 0), 0), [campaigns]);

  async function handleCreateCampaign() {
    if (!organizationId || !user || !form.title.trim() || parseAmount(form.goal) <= 0) return;
    setSaving(true);
    try {
      const id = await saveGivingCampaign(firebaseConfig, { organizationId }, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim() || undefined,
        goalAmount: parseAmount(form.goal),
        raisedAmount: 0,
        status: "active",
        createdByUserId: user.uid,
      });
      const now = new Date().toISOString();
      setCampaigns((prev) => [{
        id, organizationId, title: form.title.trim(), description: form.description.trim(),
        category: form.category.trim() || undefined, goalAmount: parseAmount(form.goal),
        raisedAmount: 0, status: "active", createdByUserId: user.uid, createdAt: now, updatedAt: now
      }, ...prev]);
      setForm({ title: "", description: "", category: "", goal: "" });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function updateCampaign(c: GivingCampaign, patch: Partial<GivingCampaign>) {
    if (!organizationId || !user) return;
    const updated = { ...c, ...patch };
    setCampaigns((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    try {
      await saveGivingCampaign(firebaseConfig, { organizationId }, {
        id: c.id, title: updated.title, description: updated.description, category: updated.category,
        goalAmount: updated.goalAmount, raisedAmount: updated.raisedAmount, status: updated.status,
        createdByUserId: c.createdByUserId, createdAt: c.createdAt,
      });
    } catch { /* mantém otimista */ }
  }

  function handleRegisterRaise(c: GivingCampaign) {
    const raw = window.prompt(`Quanto entrou nesta campanha? (some ao total atual de ${formatBRL(c.raisedAmount)})`, "");
    if (!raw) return;
    const add = parseAmount(raw);
    if (add <= 0) return;
    void updateCampaign(c, { raisedAmount: c.raisedAmount + add });
  }

  async function handleDeleteCampaign(c: GivingCampaign) {
    if (!organizationId) return;
    if (!window.confirm(`Excluir a campanha "${c.title}"?`)) return;
    setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
    try {
      await deleteGivingCampaign(firebaseConfig, { organizationId }, c.id);
    } catch { /* ignora */ }
  }

  return (
    <div className="page-root">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Doações</h1>
          <p className="page-subtitle">Dízimos, ofertas e campanhas da organização</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Fechar" : "Nova Campanha"}
          </button>
        </div>
      </header>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon"><HeartHandshake size={20} /></div>
          <div className="stat-body">
            <span className="stat-label">Captado este mês</span>
            <span className="stat-value">{formatBRL(capturedThisMonth)}</span>
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
            <span className="stat-value">{activeCampaigns.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={20} /></div>
          <div className="stat-body">
            <span className="stat-label">Arrecadado (campanhas)</span>
            <span className="stat-value">{formatBRL(totalRaised)}</span>
          </div>
        </div>
      </div>

      {showForm && (
        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title">Nova campanha de oferta</h2>
          </div>
          <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
            <input
              type="text" placeholder="Título (ex: Reforma do templo)"
              value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--alvo-line)", fontSize: 14 }}
            />
            <textarea
              placeholder="Descrição da causa (opcional)" rows={2}
              value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--alvo-line)", fontSize: 14, resize: "vertical", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                type="text" placeholder="Categoria (ex: Obras, Missões)"
                value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                style={{ flex: 1, minWidth: 160, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--alvo-line)", fontSize: 14 }}
              />
              <input
                type="text" inputMode="decimal" placeholder="Meta (R$)"
                value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                style={{ width: 160, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--alvo-line)", fontSize: 14 }}
              />
            </div>
            <button
              className="btn-primary" onClick={handleCreateCampaign}
              disabled={saving || !form.title.trim() || parseAmount(form.goal) <= 0}
              style={{ justifySelf: "start", opacity: saving || !form.title.trim() || parseAmount(form.goal) <= 0 ? 0.5 : 1 }}
            >
              <CheckCircle2 size={16} /> {saving ? "Criando..." : "Criar campanha"}
            </button>
          </div>
        </section>
      )}

      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Campanhas de oferta</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="empty-state">
            <Target size={40} strokeWidth={1.4} />
            <p>Nenhuma campanha criada ainda.</p>
            <p className="empty-hint">Crie uma campanha para arrecadar para um projeto ou causa específica.</p>
            <button className="btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Criar primeira campanha
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {campaigns.map((c) => {
              const pct = c.goalAmount > 0 ? Math.min(100, Math.round((c.raisedAmount / c.goalAmount) * 100)) : 0;
              return (
                <div key={c.id} style={{ padding: 16, borderRadius: 14, border: "1px solid var(--alvo-line)", background: "var(--alvo-surface, #fff)", opacity: c.status === "closed" ? 0.7 : 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 16, color: "var(--alvo-ink)" }}>{c.title}</strong>
                        {c.category && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--alvo-accent-soft, #eff6ff)", color: "var(--alvo-accent-dark, #1e3a8a)" }}>{c.category}</span>}
                        {c.status === "closed" && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#f1f5f9", color: "#64748b" }}>Encerrada</span>}
                      </div>
                      {c.description && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--alvo-ink-soft)" }}>{c.description}</p>}
                    </div>
                    <button onClick={() => handleDeleteCampaign(c)} aria-label="Excluir campanha" style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 4 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>{formatBRL(c.raisedAmount)}</span>
                      <span style={{ color: "var(--alvo-ink-soft)" }}>de {formatBRL(c.goalAmount)} · {pct}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "#16a34a", borderRadius: 999 }} />
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {c.status === "active" && (
                      <>
                        <button className="btn-secondary btn-sm" onClick={() => handleRegisterRaise(c)}>
                          <Plus size={14} /> Registrar arrecadação
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => updateCampaign(c, { status: "closed" })}>
                          Encerrar
                        </button>
                      </>
                    )}
                    {c.status === "closed" && (
                      <button className="btn-secondary btn-sm" onClick={() => updateCampaign(c, { status: "active" })}>
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

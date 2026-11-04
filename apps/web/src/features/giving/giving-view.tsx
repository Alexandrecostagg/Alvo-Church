"use client";

import { useEffect, useMemo, useState } from "react";
import { HeartHandshake, TrendingUp, Users, Target, Plus, MessageCircle, Trash2, X, CheckCircle2, Copy, Megaphone, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppAuth } from "../../../app/providers";
import {
  fetchGivingIntents,
  fetchGivingCampaigns,
  fetchGivingReceipts,
  saveGivingCampaign,
  deleteGivingCampaign,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import { financeRequest } from "../../lib/finance-client";
import type { GivingIntent, GivingCampaign, GivingReceipt } from "@alvo/types";

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
  const { organizationId, firebaseConfig, user, tenantRuntime } = useAppAuth();
  const router = useRouter();
  const orgSlug = tenantRuntime?.organization?.slug ?? "";
  const [intents, setIntents] = useState<GivingIntent[]>([]);
  const [campaigns, setCampaigns] = useState<GivingCampaign[]>([]);
  const [receipts, setReceipts] = useState<GivingReceipt[]>([]);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function openReceipt(r: GivingReceipt) {
    if (!user) return;
    try { const data = await financeRequest(user, { action: "receipt", organizationId, receiptId: r.receiptId || r.id, legacyGiving: !r.receiptId }); setViewingReceipt(data.dataUrl); }
    catch (e) { setError(e instanceof Error ? e.message : "Comprovante indisponível."); }
  }
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "", goal: "" });

  // Comprovantes indexados por intentId — mostra "Pago ✓" na doação captada.
  const receiptByIntent = useMemo(() => {
    const map = new Map<string, GivingReceipt>();
    for (const r of receipts) if (r.intentId) map.set(r.intentId, r);
    return map;
  }, [receipts]);

  // Link público da campanha + soma automática das doações captadas por ela.
  function campaignLink(id: string) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/p/${orgSlug}/give?campanha=${id}`;
  }
  function campaignAutoRaised(id: string) {
    return intents.filter((i) => i.campaignId === id && i.status === "confirmed").reduce((s, i) => s + i.amount, 0);
  }
  function shareMessage(c: GivingCampaign) {
    return `🙌 *${c.title}*\n${c.description ? c.description + "\n" : ""}Ajude nossa igreja a alcançar a meta de ${formatBRL(c.goalAmount)}. Contribua aqui (PIX): ${campaignLink(c.id)}`;
  }
  async function copyLink(c: GivingCampaign) {
    try {
      await navigator.clipboard.writeText(campaignLink(c.id));
      setCopiedId(c.id);
      setTimeout(() => setCopiedId((v) => (v === c.id ? null : v)), 2000);
    } catch { /* ignore */ }
  }
  function broadcastToMembers(c: GivingCampaign) {
    router.push(`/communication?compose=${encodeURIComponent(shareMessage(c))}`);
  }

  useEffect(() => {
    if (!isFirebaseWebRuntimeConfigured(firebaseConfig) || !organizationId) return;
    let cancelled = false; setIntents([]); setCampaigns([]); setReceipts([]); setViewingReceipt(null); setError("");
    Promise.all([fetchGivingIntents(firebaseConfig, { organizationId }), fetchGivingCampaigns(firebaseConfig, { organizationId }), fetchGivingReceipts(firebaseConfig, { organizationId })]).then(([i,c,r]) => { if (!cancelled) { setIntents(i); setCampaigns(c); setReceipts(r); } }).catch(() => { if (!cancelled) setError("Não foi possível carregar as doações."); });
    return () => { cancelled = true; };
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
  const totalRaised = useMemo(
    () => campaigns.reduce((s, c) => s + (c.raisedAmount || 0), 0),
    [campaigns, intents]
  );

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
    } catch { setError("Não foi possível criar a campanha."); } finally {
      setSaving(false);
    }
  }

  async function updateCampaign(c: GivingCampaign, patch: Partial<GivingCampaign>) {
    if (!organizationId || !user) return;
    const updated = { ...c, ...patch };
    try {
      await saveGivingCampaign(firebaseConfig, { organizationId }, {
        id: c.id, title: updated.title, description: updated.description, category: updated.category,
        goalAmount: updated.goalAmount, raisedAmount: updated.raisedAmount, status: updated.status,
        createdByUserId: c.createdByUserId, createdAt: c.createdAt,
      });
      setCampaigns((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    } catch { setError("Não foi possível atualizar a campanha."); }
  }

  async function handleDeleteCampaign(c: GivingCampaign) {
    if (!organizationId) return;
    if (!window.confirm(`Excluir a campanha "${c.title}"?`)) return;
    try {
      await deleteGivingCampaign(firebaseConfig, { organizationId }, c.id);
      setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
    } catch { setError("Não foi possível excluir a campanha."); }
  }

  return (
    <div className="page-root">
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      <p>Declarações aguardam conferência em <a href="/finance">Finanças</a>. Intenção e comprovante não confirmam recebimento.</p>
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
              const auto = campaignAutoRaised(c.id);
              const raised = c.raisedAmount;
              const pct = c.goalAmount > 0 ? Math.min(100, Math.round((raised / c.goalAmount) * 100)) : 0;
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
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>{formatBRL(raised)}</span>
                      <span style={{ color: "var(--alvo-ink-soft)" }}>de {formatBRL(c.goalAmount)} · {pct}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "#16a34a", borderRadius: 999 }} />
                    </div>
                    {auto > 0 && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--alvo-ink-soft)" }}>{formatBRL(auto)} pelo link público · {formatBRL(c.raisedAmount)} total conferido</p>}
                  </div>

                  {/* Disparo: compartilhar o link da campanha pros doadores */}
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button className="btn-secondary btn-sm" onClick={() => copyLink(c)}>
                      {copiedId === c.id ? <Check size={14} /> : <Copy size={14} />} {copiedId === c.id ? "Copiado!" : "Copiar link"}
                    </button>
                    <a
                      className="btn-secondary btn-sm"
                      href={`https://wa.me/?text=${encodeURIComponent(shareMessage(c))}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "#25D366" }}
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                    <button className="btn-secondary btn-sm" onClick={() => broadcastToMembers(c)}>
                      <Megaphone size={14} /> Disparar pros membros
                    </button>
                  </div>

                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {c.status === "active" && (
                      <>

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
            {intents.map((i) => {
              const receipt = receiptByIntent.get(i.id);
              return (
              <div key={i.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderRadius: 12, background: "var(--alvo-surface, #fff)", border: "1px solid var(--alvo-line, #e2e8f0)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ color: "var(--alvo-ink, #0f172a)", overflowWrap: "anywhere" }}>{i.name}</strong>
                    {receipt && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#dcfce7", color: "#15803d" }}>
                        <CheckCircle2 size={12} /> {i.status === "confirmed" ? "Conferido" : i.status === "rejected" ? "Rejeitado" : "Declarado — conferir"}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: "var(--alvo-ink-soft, #64748b)" }}>{formatDate(i.createdAt)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  {(receipt?.receiptId || receipt?.imageBase64) && (
                    <button onClick={() => receipt && openReceipt(receipt)} className="btn-secondary btn-sm">
                      Ver comprovante
                    </button>
                  )}
                  <a aria-disabled={!i.consentContact} href={i.consentContact ? `https://wa.me/${i.whatsapp.replace(/\D/g, "")}` : undefined} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "#25D366", textDecoration: "none", fontWeight: 600 }}>
                    <MessageCircle size={15} /> {i.whatsapp}
                  </a>
                  <strong style={{ color: "#16a34a" }}>{formatBRL(i.amount)}</strong>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {viewingReceipt && (
        <div
          onClick={() => setViewingReceipt(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "100%", background: "#fff", borderRadius: 16, padding: 16, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <strong style={{ fontSize: 15, color: "#0f172a" }}>Comprovante</strong>
              <button onClick={() => setViewingReceipt(null)} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={18} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingReceipt}
              alt="Comprovante de pagamento"
              style={{ width: "100%", borderRadius: 10, display: "block" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, Bell, Mail, Smartphone, Plus, Send, Search, X, CheckCircle2, AlertTriangle, Trash2, Save, Sparkles } from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import {
  fetchCommunicationLog,
  saveCommunicationTemplate,
  fetchCommunicationTemplates,
  deleteCommunicationTemplate
} from "@alvo/firebase";
import { cachedFetchPeople } from "../../lib/org-data-cache";
import type { Person, CommunicationLogEntry, CommunicationTemplate } from "@alvo/types";

const CHANNELS = [
  { key: "push", label: "Push Notification", icon: Bell, desc: "Membros com app instalado · em breve" },
  { key: "email", label: "Email", icon: Mail, desc: "Todos com email cadastrado · em breve" },
  { key: "whatsapp", label: "WhatsApp", icon: Smartphone, desc: "Pelo seu WhatsApp · grátis" },
];

interface PreparedRecipient { personId: string; name: string; whatsapp: string }

export function CommunicationView() {
  const { user, organizationId, firebaseConfig, configured } = useAppAuth();

  const [composing, setComposing] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [preparedRecipients, setPreparedRecipients] = useState<PreparedRecipient[]>([]);
  const [loggingCampaign, setLoggingCampaign] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CommunicationLogEntry[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiObjective, setAiObjective] = useState("");
  const [aiAudience, setAiAudience] = useState("Membros e visitantes selecionados");
  const [aiDetails, setAiDetails] = useState("");
  const [aiTone, setAiTone] = useState("acolhedor");
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Histórico e templates reais (persistidos): carrega ao abrir a tela.
  useEffect(() => {
    if (!configured || !organizationId) return;
    void fetchCommunicationLog(firebaseConfig, { organizationId }, 30).then(setHistory).catch(() => {});
    void fetchCommunicationTemplates(firebaseConfig, { organizationId }, 30).then(setTemplates).catch(() => {});
  }, [configured, organizationId, firebaseConfig]);

  // Abre o compositor com a mensagem pré-preenchida (ex: disparo de campanha
  // vindo da tela de Doações via ?compose=).
  useEffect(() => {
    const compose = new URLSearchParams(window.location.search).get("compose");
    if (compose) {
      setMessage(compose);
      setComposing(true);
    }
  }, []);

  async function handleSaveTemplate() {
    if (!organizationId || !user || !message.trim()) return;
    const title = window.prompt("Nome do template (ex: Boas-vindas, Lembrete de culto):")?.trim();
    if (!title) return;
    setSavingTemplate(true);
    try {
      const id = await saveCommunicationTemplate(firebaseConfig, { organizationId }, {
        title, message: message.trim(), createdByUserId: user.uid
      });
      setTemplates((prev) => [
        { id, organizationId, title, message: message.trim(), createdByUserId: user.uid, createdAt: new Date().toISOString() },
        ...prev
      ]);
    } catch {
      setError("Não foi possível salvar o template.");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!organizationId) return;
    try {
      await deleteCommunicationTemplate(firebaseConfig, { organizationId }, id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("Não foi possível excluir o template.");
    }
  }

  function useTemplate(t: CommunicationTemplate) {
    setMessage(t.message);
    setComposing(true);
  }

  useEffect(() => {
    if (!composing || !configured || !organizationId || people.length > 0) return;
    setLoadingPeople(true);
    cachedFetchPeople(firebaseConfig, { organizationId }, 300)
      .then(setPeople)
      .catch(() => setError("Não foi possível carregar a lista de pessoas."))
      .finally(() => setLoadingPeople(false));
  }, [composing, configured, organizationId, firebaseConfig, people.length]);

  const peopleWithWhatsapp = useMemo(
    () => people.filter((p) => p.whatsappPhone || p.mobilePhone),
    [people]
  );

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return peopleWithWhatsapp;
    return peopleWithWhatsapp.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
  }, [peopleWithWhatsapp, search]);

  const allFilteredSelected = filteredPeople.length > 0
    && filteredPeople.every((person) => selected.has(person.id));

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      allFilteredSelected
        ? new Set([...prev].filter((id) => !filteredPeople.some((person) => person.id === id)))
        : new Set([...prev, ...filteredPeople.map((person) => person.id)])
    );
  }

  async function campaignRequest(body: Record<string, unknown>) {
    if (!user) throw new Error("Entre na sua conta.");
    const response = await fetch("/api/communication/send-whatsapp", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({})) as Record<string, any>;
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível registrar a campanha.");
    return data;
  }

  async function generateDraft() {
    if (!organizationId || !user || !aiObjective.trim() || !aiAudience.trim()) return;
    setGeneratingDraft(true);
    setError(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ organizationId, task: "communication_draft", input: { objective: aiObjective.trim(), audience: aiAudience.trim(), details: aiDetails.trim(), tone: aiTone } }),
      });
      const data = await response.json().catch(() => ({})) as Record<string, any>;
      if (!response.ok || typeof data.content !== "string") throw new Error(typeof data.error === "string" ? data.error : "Não foi possível gerar o rascunho.");
      setMessage(data.content.trim());
      setAiOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o rascunho.");
    } finally {
      setGeneratingDraft(false);
    }
  }

  async function prepareCampaign() {
    if (!organizationId || !user || selected.size === 0 || !message.trim()) return;
    setLoggingCampaign(true);
    setError(null);
    try {
      const requestId = crypto.randomUUID();
      const data = await campaignRequest({ action: "prepare", organizationId, requestId, message: message.trim(), recipientIds: [...selected] });
      setCampaignId(data.campaignId);
      setPreparedRecipients(data.recipients ?? []);
      if (Array.isArray(data.skipped) && data.skipped.length) setError(`${data.skipped.length} pessoa(s) ficaram de fora por cadastro inativo, telefone inválido ou opt-out.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar a campanha.");
    } finally {
      setLoggingCampaign(false);
    }
  }

  function openWhatsapp(recipient: PreparedRecipient) {
    if (!message.trim()) return;
    window.open(`https://wa.me/${recipient.whatsapp}?text=${encodeURIComponent(message.trim())}`, "_blank", "noopener");
    setOpened((prev) => new Set(prev).add(recipient.personId));
  }

  function toggleConfirmed(personId: string) {
    setConfirmed((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId); else next.add(personId);
      return next;
    });
  }

  async function completeCampaign() {
    if (!organizationId || !campaignId || confirmed.size === 0) return;
    setLoggingCampaign(true);
    setError(null);
    try {
      await campaignRequest({ action: "complete", organizationId, campaignId, confirmedRecipientIds: [...confirmed] });
      const refreshed = await fetchCommunicationLog(firebaseConfig, { organizationId }, 30);
      setHistory(refreshed);
      setMessage("");
      setOpened(new Set());
      setConfirmed(new Set());
      setSelected(new Set());
      setCampaignId(null);
      setPreparedRecipients([]);
      setComposing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar as confirmações.");
    } finally {
      setLoggingCampaign(false);
    }
  }

  if (composing) {
    return (
      <div className="page-root">
        <header className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Nova mensagem</h1>
            <p className="page-subtitle">Abra a conversa no WhatsApp com a mensagem pronta e envie pelo seu número — grátis.</p>
          </div>
          <div className="page-header-actions">
            <button className="btn-secondary" onClick={() => { setComposing(false); setError(null); }}>
              <X size={16} /> Cancelar
            </button>
          </div>
        </header>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#FCEBEB", color: "#A32D2D", fontSize: 13, marginBottom: 16 }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <section className="content-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div><strong>Mensagem</strong><p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--alvo-ink-soft)" }}>Revise o texto antes de abrir as conversas.</p></div>
            <button className="btn-secondary btn-sm" type="button" onClick={() => setAiOpen((value) => !value)}><Sparkles size={14} /> Criar rascunho com IA</button>
          </div>
          {aiOpen && <div style={{ display: "grid", gap: 10, padding: 14, border: "1px solid var(--alvo-line)", borderRadius: 10, marginBottom: 12, background: "var(--alvo-surface-soft, var(--alvo-surface))" }}>
            <input value={aiObjective} onChange={(event) => setAiObjective(event.target.value)} maxLength={500} placeholder="Objetivo: lembrar o culto de domingo..." style={inputStyle} />
            <input value={aiAudience} onChange={(event) => setAiAudience(event.target.value)} maxLength={200} placeholder="Público do comunicado" style={inputStyle} />
            <textarea value={aiDetails} onChange={(event) => setAiDetails(event.target.value)} maxLength={1000} rows={3} placeholder="Detalhes confirmados: data, horário, local e chamada para ação" style={{ ...inputStyle, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><select value={aiTone} onChange={(event) => setAiTone(event.target.value)} style={inputStyle}><option value="acolhedor">Acolhedor</option><option value="objetivo">Objetivo</option><option value="celebrativo">Celebrativo</option><option value="pastoral">Pastoral</option></select><button className="btn-primary btn-sm" type="button" disabled={generatingDraft || !aiObjective.trim() || !aiAudience.trim()} onClick={() => void generateDraft()}><Sparkles size={14} /> {generatingDraft ? "Gerando..." : "Gerar para revisar"}</button></div>
            <small style={{ color: "var(--alvo-ink-soft)" }}>Não inclua dados pessoais ou pastorais. A geração usa a cota mensal da instituição e fica registrada sem salvar o conteúdo no log de IA.</small>
          </div>}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva a mensagem que será enviada por WhatsApp..."
            rows={4}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--alvo-line)", fontSize: 14, fontFamily: "inherit", resize: "vertical", background: "var(--alvo-surface)", color: "var(--alvo-ink)", boxSizing: "border-box" }}
          />
        </section>

        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title">Pessoas com WhatsApp ({filteredPeople.length})</h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)", margin: "0 0 12px" }}>
            Selecione os destinatários. O servidor confere igreja, cadastro ativo, telefone e opt-out antes de liberar as conversas.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Search size={16} style={{ color: "var(--alvo-ink-soft)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--alvo-line)", fontSize: 13, background: "var(--alvo-surface)", color: "var(--alvo-ink)" }}
            />
          </div>

          {!campaignId && !loadingPeople && filteredPeople.length > 0 && (
            <button className="btn-secondary btn-sm" type="button" onClick={toggleSelectAll} style={{ marginBottom: 10 }}>
              {allFilteredSelected ? "Limpar esta lista" : "Selecionar esta lista"}
            </button>
          )}

          {loadingPeople ? (
            <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)" }}>Carregando pessoas...</p>
          ) : filteredPeople.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)" }}>
              Nenhuma pessoa com WhatsApp cadastrado{search ? " para essa busca" : ""}.
            </p>
          ) : campaignId ? (
            <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {preparedRecipients.map((recipient) => (
                <div key={recipient.personId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--alvo-line)" }}>
                  <span style={{ fontSize: 13, color: "var(--alvo-ink)" }}>{recipient.name}</span>
                  <button className="btn-secondary btn-sm" type="button" onClick={() => openWhatsapp(recipient)} style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
                    <Smartphone size={14} /> {opened.has(recipient.personId) ? "Reabrir conversa" : "Abrir no WhatsApp"}
                  </button>
                  <button className="btn-secondary btn-sm" type="button" disabled={!opened.has(recipient.personId)} onClick={() => toggleConfirmed(recipient.personId)} style={{ color: confirmed.has(recipient.personId) ? "#16a34a" : undefined, opacity: opened.has(recipient.personId) ? 1 : 0.5, whiteSpace: "nowrap" }}>
                    <CheckCircle2 size={14} /> {confirmed.has(recipient.personId) ? "Envio confirmado" : "Confirmar que enviei"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {filteredPeople.map((p) => (
                <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelected(p.id)} />
                  <span style={{ fontSize: 13, color: "var(--alvo-ink)" }}>{p.firstName} {p.lastName}</span>
                  <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)", marginLeft: "auto" }}>{p.whatsappPhone || p.mobilePhone}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn-primary"
            onClick={campaignId ? completeCampaign : prepareCampaign}
            disabled={loggingCampaign || (campaignId ? confirmed.size === 0 : selected.size === 0 || !message.trim())}
            style={{ opacity: loggingCampaign || (campaignId ? confirmed.size === 0 : selected.size === 0 || !message.trim()) ? 0.5 : 1 }}
          >
            <CheckCircle2 size={16} />
            {loggingCampaign ? "Registrando..." : campaignId ? `Salvar confirmações (${confirmed.size})` : `Preparar conversas (${selected.size})`}
          </button>
          <button
            className="btn-secondary"
            onClick={handleSaveTemplate}
            disabled={savingTemplate || !message.trim()}
            style={{ opacity: savingTemplate || !message.trim() ? 0.5 : 1 }}
          >
            <Save size={16} /> {savingTemplate ? "Salvando..." : "Salvar como template"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-root">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Comunicação</h1>
          <p className="page-subtitle">Mensagens segmentadas por WhatsApp</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={() => setComposing(true)}>
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
        </div>
        {history.length === 0 ? (
          <div className="empty-state">
            <Send size={40} strokeWidth={1.4} />
            <p>Nenhuma mensagem enviada ainda.</p>
            <p className="empty-hint">Crie sua primeira mensagem para alcançar membros e visitantes de forma segmentada.</p>
            <button className="btn-primary btn-sm" onClick={() => setComposing(true)}>
              <Plus size={14} />
              Enviar primeira mensagem
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((h) => (
              <div key={h.id} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--alvo-line)" }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--alvo-ink)" }}>{h.message}</p>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--alvo-ink-soft)" }}>
                  {new Date(h.createdAt).toLocaleString("pt-BR")} · {h.sentCount} envio{h.sentCount !== 1 ? "s" : ""} confirmado{h.sentCount !== 1 ? "s" : ""} pela liderança
                  {h.status === "prepared" ? " · campanha preparada, sem envio confirmado" : ""}
                  {h.failedCount > 0 ? ` · ${h.failedCount} falharam` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">Templates salvos</h2>
        </div>
        {templates.length === 0 ? (
          <div className="empty-state">
            <MessageSquareText size={40} strokeWidth={1.4} />
            <p>Nenhum template criado.</p>
            <p className="empty-hint">Templates agilizam envios recorrentes (lembretes de culto, boas-vindas). Escreva uma mensagem em "Nova mensagem" e clique em "Salvar como template".</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {templates.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 10, border: "1px solid var(--alvo-line)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 14, color: "var(--alvo-ink)", display: "block" }}>{t.title}</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--alvo-ink-soft)", whiteSpace: "pre-wrap" }}>{t.message}</p>
                </div>
                <button className="btn-secondary btn-sm" onClick={() => useTemplate(t)}>
                  <Send size={14} /> Usar
                </button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => handleDeleteTemplate(t.id)}
                  aria-label="Excluir template"
                  style={{ color: "#dc2626" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const inputStyle = { padding: "9px 11px", borderRadius: 8, border: "1px solid var(--alvo-line)", background: "var(--alvo-surface)", color: "var(--alvo-ink)", font: "inherit", boxSizing: "border-box" as const };

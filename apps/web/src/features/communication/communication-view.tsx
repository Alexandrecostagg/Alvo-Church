"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MessageSquareText,
  Bell,
  Mail,
  Smartphone,
  Plus,
  Send,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Save,
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import {
  addCommunicationLogEntry,
  fetchCommunicationLog,
  saveCommunicationTemplate,
  fetchCommunicationTemplates,
  deleteCommunicationTemplate,
} from "@alvo/firebase";
import { cachedFetchPeople } from "../../lib/org-data-cache";
import type {
  Person,
  CommunicationLogEntry,
  CommunicationTemplate,
} from "@alvo/types";

const CHANNELS = [
  {
    key: "push",
    label: "Push Notification",
    icon: Bell,
    desc: "Membros com app instalado · em breve",
  },
  {
    key: "email",
    label: "Email",
    icon: Mail,
    desc: "Todos com email cadastrado · em breve",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: Smartphone,
    desc: "Pelo seu WhatsApp · grátis",
  },
];

interface SendResult {
  sent: number;
  failedCount: number;
  failed: Array<{ phone: string; error?: string }>;
}

export function CommunicationView() {
  const { user, organizationId, firebaseConfig, configured } = useAppAuth();

  const [composing, setComposing] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [loggingCampaign, setLoggingCampaign] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CommunicationLogEntry[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Histórico e templates reais (persistidos): carrega ao abrir a tela.
  useEffect(() => {
    if (!configured || !organizationId) return;
    void fetchCommunicationLog(firebaseConfig, { organizationId }, 30)
      .then(setHistory)
      .catch(() => {});
    void fetchCommunicationTemplates(firebaseConfig, { organizationId }, 30)
      .then(setTemplates)
      .catch(() => {});
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
    const title = window
      .prompt("Nome do template (ex: Boas-vindas, Lembrete de culto):")
      ?.trim();
    if (!title) return;
    setSavingTemplate(true);
    try {
      const id = await saveCommunicationTemplate(
        firebaseConfig,
        { organizationId },
        {
          title,
          message: message.trim(),
          createdByUserId: user.uid,
        },
      );
      setTemplates((prev) => [
        {
          id,
          organizationId,
          title,
          message: message.trim(),
          createdByUserId: user.uid,
          createdAt: new Date().toISOString(),
        },
        ...prev,
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
    if (!composing || !configured || !organizationId || people.length > 0)
      return;
    setLoadingPeople(true);
    cachedFetchPeople(firebaseConfig, { organizationId }, 300)
      .then(setPeople)
      .catch(() => setError("Não foi possível carregar a lista de pessoas."))
      .finally(() => setLoadingPeople(false));
  }, [composing, configured, organizationId, firebaseConfig, people.length]);

  const peopleWithWhatsapp = useMemo(
    () => people.filter((p) => p.whatsappPhone || p.mobilePhone),
    [people],
  );

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return peopleWithWhatsapp;
    return peopleWithWhatsapp.filter((p) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q),
    );
  }, [peopleWithWhatsapp, search]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filteredPeople.length
        ? new Set()
        : new Set(filteredPeople.map((p) => p.id)),
    );
  }

  // Abre a conversa no WhatsApp (wa.me) com a mensagem pronta — envio pelo
  // próprio número da liderança, grátis. Marca a pessoa como "aberta".
  function openWhatsapp(p: Person) {
    const raw = (p.whatsappPhone || p.mobilePhone || "").replace(/\D/g, "");
    if (!raw || !message.trim()) return;
    const withCountry = raw.startsWith("55") ? raw : `55${raw}`;
    window.open(
      `https://wa.me/${withCountry}?text=${encodeURIComponent(message.trim())}`,
      "_blank",
      "noopener",
    );
    setOpened((prev) => new Set(prev).add(p.id));
  }

  // Registra a campanha no histórico (quantos você abriu pra enviar).
  async function logCampaign() {
    if (!organizationId || !user || opened.size === 0 || !message.trim())
      return;
    setLoggingCampaign(true);
    try {
      const entryBase = {
        channel: "whatsapp" as const,
        message: message.trim(),
        recipientCount: opened.size,
        sentCount: opened.size,
        failedCount: 0,
        sentByUserId: user.uid,
      };
      let logId = crypto.randomUUID();
      try {
        logId = await addCommunicationLogEntry(
          firebaseConfig,
          { organizationId },
          entryBase,
        );
      } catch {
        /* mesmo sem gravar, mantém na sessão */
      }
      setHistory((prev) => [
        {
          id: logId,
          organizationId,
          createdAt: new Date().toISOString(),
          ...entryBase,
        },
        ...prev,
      ]);
      setMessage("");
      setOpened(new Set());
      setSelected(new Set());
      setComposing(false);
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
            <p className="page-subtitle">
              Abra a conversa no WhatsApp com a mensagem pronta e envie pelo seu
              número — grátis.
            </p>
          </div>
          <div className="page-header-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setComposing(false);
                setError(null);
              }}
            >
              <X size={16} /> Cancelar
            </button>
          </div>
        </header>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              background: "#FCEBEB",
              color: "#A32D2D",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <section className="content-section">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva a mensagem que será enviada por WhatsApp..."
            rows={4}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--alvo-line)",
              fontSize: 14,
              fontFamily: "inherit",
              resize: "vertical",
              background: "var(--alvo-surface)",
              color: "var(--alvo-ink)",
              boxSizing: "border-box",
            }}
          />
        </section>

        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title">
              Pessoas com WhatsApp ({filteredPeople.length})
            </h2>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--alvo-ink-soft)",
              margin: "0 0 12px",
            }}
          >
            Escreva a mensagem acima, depois clique em{" "}
            <strong>Abrir no WhatsApp</strong> de cada pessoa — a conversa abre
            com o texto pronto pra você enviar do seu número.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Search size={16} style={{ color: "var(--alvo-ink-soft)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--alvo-line)",
                fontSize: 13,
                background: "var(--alvo-surface)",
                color: "var(--alvo-ink)",
              }}
            />
          </div>

          {loadingPeople ? (
            <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)" }}>
              Carregando pessoas...
            </p>
          ) : filteredPeople.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)" }}>
              Nenhuma pessoa com WhatsApp cadastrado
              {search ? " para essa busca" : ""}.
            </p>
          ) : (
            <div
              style={{
                maxHeight: 360,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {filteredPeople.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--alvo-ink)" }}>
                    {p.firstName} {p.lastName}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--alvo-ink-soft)",
                      marginLeft: "auto",
                    }}
                  >
                    {p.whatsappPhone || p.mobilePhone}
                  </span>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => openWhatsapp(p)}
                    disabled={!message.trim()}
                    style={{
                      opacity: !message.trim() ? 0.5 : 1,
                      color: opened.has(p.id) ? "#16a34a" : undefined,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Smartphone size={14} />{" "}
                    {opened.has(p.id) ? "Aberto ✓" : "Abrir no WhatsApp"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn-primary"
            onClick={logCampaign}
            disabled={loggingCampaign || opened.size === 0}
            style={{ opacity: loggingCampaign || opened.size === 0 ? 0.5 : 1 }}
          >
            <CheckCircle2 size={16} />
            {loggingCampaign
              ? "Registrando..."
              : `Registrar no histórico (${opened.size})`}
          </button>
          <button
            className="btn-secondary"
            onClick={handleSaveTemplate}
            disabled={savingTemplate || !message.trim()}
            style={{ opacity: savingTemplate || !message.trim() ? 0.5 : 1 }}
          >
            <Save size={16} />{" "}
            {savingTemplate ? "Salvando..." : "Salvar como template"}
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
            <div className="stat-icon">
              <ch.icon size={20} />
            </div>
            <div className="stat-body">
              <span className="stat-label">{ch.label}</span>
              <span
                className="stat-value"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--alvo-ink-soft)",
                }}
              >
                {ch.desc}
              </span>
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
            <p className="empty-hint">
              Crie sua primeira mensagem para alcançar membros e visitantes de
              forma segmentada.
            </p>
            <button
              className="btn-primary btn-sm"
              onClick={() => setComposing(true)}
            >
              <Plus size={14} />
              Enviar primeira mensagem
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((h) => (
              <div
                key={h.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--alvo-line)",
                }}
              >
                <p
                  style={{ margin: 0, fontSize: 13, color: "var(--alvo-ink)" }}
                >
                  {h.message}
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 12,
                    color: "var(--alvo-ink-soft)",
                  }}
                >
                  {new Date(h.createdAt).toLocaleString("pt-BR")} ·{" "}
                  {h.sentCount} enviada{h.sentCount !== 1 ? "s" : ""}
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
            <p className="empty-hint">
              Templates agilizam envios recorrentes (lembretes de culto,
              boas-vindas). Escreva uma mensagem em "Nova mensagem" e clique em
              "Salvar como template".
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {templates.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--alvo-line)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong
                    style={{
                      fontSize: 14,
                      color: "var(--alvo-ink)",
                      display: "block",
                    }}
                  >
                    {t.title}
                  </strong>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 13,
                      color: "var(--alvo-ink-soft)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {t.message}
                  </p>
                </div>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => useTemplate(t)}
                >
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

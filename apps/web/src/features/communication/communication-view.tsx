"use client";

import { WhatsappChannelView } from "./whatsapp-channel-view";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  MessageSquareText,
  Smartphone,
  Plus,
  Send,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Save,
  Sparkles,
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import {
  fetchCommunicationLog,
  saveCommunicationTemplate,
  fetchCommunicationTemplates,
  deleteCommunicationTemplate,
} from "@alvo/firebase";
import styles from "./communication.module.css";
import type {
  Person,
  CommunicationLogEntry,
  CommunicationTemplate,
} from "@alvo/types";

interface PreparedRecipient {
  personId: string;
  name: string;
  whatsapp: string;
}

export function CommunicationView() {
  const { organizationId, user, roles, tenantReady } = useAppAuth();
  return tenantReady && user ? (
    <CommunicationContent
      key={`${organizationId}:${user.uid}:${roles.join(",")}`}
    />
  ) : (
    <p role="status">Carregando acesso…</p>
  );
}
function manualUrl(value: string) {
  const u = new URL(value);
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? value
    : `https://web.whatsapp.com/send?phone=${u.pathname.slice(1)}&${u.searchParams.toString()}`;
}
function CommunicationContent() {
  const { user, organizationId, firebaseConfig, configured } = useAppAuth();

  const [mode, setMode] = useState<"manual" | "api">("manual");
  const [notice, setNotice] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true),
    [historyRevision, setHistoryRevision] = useState(0);
  const [peopleLoaded, setPeopleLoaded] = useState(false),
    [peopleCursor, setPeopleCursor] = useState<string | null>(null);
  const [readyUrls, setReadyUrls] = useState<Record<string, string>>({});
  const [savedConfirmed, setSavedConfirmed] = useState<Set<string>>(new Set());
  const attempt = useRef({ fingerprint: "", id: "" }),
    lock = useRef(false);
  function startNew() {
    setMessage("");
    setCampaignId(null);
    setPreparedRecipients([]);
    setSelected(new Set());
    setOpened(new Set());
    setConfirmed(new Set());
    setSavedConfirmed(new Set());
    setReadyUrls({});
    setDirectPersonId("");
    setSearch("");
    setAiOpen(false);
    setDirectPhone("");
    setDirectUrl("");
    setError(null);
    setNotice("");
    setComposing(true);
    attempt.current = { fingerprint: "", id: "" };
  }
  async function resume(id: string) {
    setLoggingCampaign(true);
    setError(null);
    try {
      const result = await campaignRequest({
        action: "resume",
        organizationId,
        campaignId: id,
      });
      setMessage(result.message);
      setCampaignId(result.campaignId);
      setPreparedRecipients(result.recipients);
      setConfirmed(new Set(result.confirmedRecipientIds));
      setSavedConfirmed(new Set(result.confirmedRecipientIds));
      setOpened(new Set());
      setReadyUrls({});
      setComposing(true);
      setDirectPhone("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível retomar.");
    } finally {
      setLoggingCampaign(false);
    }
  }
  const [directPhone, setDirectPhone] = useState("");
  const [directPersonId, setDirectPersonId] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const [composing, setComposing] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [preparedRecipients, setPreparedRecipients] = useState<
    PreparedRecipient[]
  >([]);
  const [loggingCampaign, setLoggingCampaign] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CommunicationLogEntry[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiObjective, setAiObjective] = useState("");
  const [aiAudience, setAiAudience] = useState(
    "Membros e visitantes selecionados",
  );
  const [aiDetails, setAiDetails] = useState("");
  const [aiTone, setAiTone] = useState("acolhedor");
  const [generatingDraft, setGeneratingDraft] = useState(false);

  useEffect(() => {
    if (!configured || !organizationId) return;
    let cancelled = false;
    setHistoryLoading(true);
    Promise.all([
      fetchCommunicationLog(firebaseConfig, { organizationId }, 30),
      fetchCommunicationTemplates(firebaseConfig, { organizationId }, 30),
    ])
      .then(([h, t]) => {
        if (!cancelled) {
          setHistory(h);
          setTemplates(t);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Não foi possível carregar histórico e modelos. Tente Atualizar.",
          );
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [configured, organizationId, firebaseConfig, historyRevision]);

  // Abre o compositor com a mensagem pré-preenchida (ex: disparo de campanha
  // vindo da tela de Doações via ?compose=).
  useEffect(() => {
    const compose = new URLSearchParams(window.location.search).get("compose");
    if (compose) {
      const params = new URLSearchParams(window.location.search);
      setDirectPhone(params.get("phone") ?? "");
      setDirectPersonId(params.get("personId") ?? "");
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
    if (title.length > 120) {
      setError("Use até 120 caracteres para o nome do modelo.");
      return;
    }
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
      setNotice("Modelo salvo.");
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
      setNotice("Modelo excluído.");
    } catch {
      setError("Não foi possível excluir o template.");
    }
  }

  function useTemplate(t: CommunicationTemplate) {
    startNew();
    setMessage(t.message);
  }

  async function loadPeople(cursor?: string) {
    setLoadingPeople(true);
    try {
      const result = await campaignRequest({
        action: "people",
        organizationId,
        cursor,
      });
      setPeople((prev) =>
        cursor
          ? [
              ...new Map(
                [...prev, ...result.people].map((p) => [p.id, p]),
              ).values(),
            ]
          : result.people,
      );
      setPeopleCursor(result.cursor);
      setPeopleLoaded(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível carregar pessoas.",
      );
    } finally {
      setLoadingPeople(false);
    }
  }
  useEffect(() => {
    if (composing && !directPhone && !campaignId && !peopleLoaded)
      void loadPeople();
  }, [composing, directPhone, campaignId, peopleLoaded]);

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

  const allFilteredSelected =
    filteredPeople.length > 0 &&
    filteredPeople.every((person) => selected.has(person.id));

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 100) next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      allFilteredSelected
        ? new Set(
            [...prev].filter(
              (id) => !filteredPeople.some((person) => person.id === id),
            ),
          )
        : new Set(
            [
              ...new Set([
                ...prev,
                ...filteredPeople.map((person) => person.id),
              ]),
            ].slice(0, 100),
          ),
    );
  }

  async function campaignRequest(body: Record<string, unknown>) {
    if (!user) throw new Error("Entre na sua conta.");
    const response = await fetch("/api/communication/send-whatsapp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      any
    >;
    if (!response.ok)
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "Não foi possível registrar a campanha.",
      );
    return data;
  }

  async function generateDraft() {
    if (!organizationId || !user || !aiObjective.trim() || !aiAudience.trim())
      return;
    setGeneratingDraft(true);
    setError(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          organizationId,
          task: "communication_draft",
          input: {
            objective: aiObjective.trim(),
            audience: aiAudience.trim(),
            details: aiDetails.trim(),
            tone: aiTone,
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        any
      >;
      if (!response.ok || typeof data.content !== "string")
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Não foi possível gerar o rascunho.",
        );
      setMessage(data.content.trim());
      setAiOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível gerar o rascunho.",
      );
    } finally {
      setGeneratingDraft(false);
    }
  }

  async function prepareCampaign() {
    if (!organizationId || !user || selected.size === 0 || !message.trim())
      return;
    if (lock.current) return;
    lock.current = true;
    setLoggingCampaign(true);
    setError(null);
    try {
      const fingerprint = JSON.stringify([
        message.trim(),
        [...selected].sort(),
      ]);
      if (attempt.current.fingerprint !== fingerprint)
        attempt.current = { fingerprint, id: crypto.randomUUID() };
      const requestId = attempt.current.id;
      const data = await campaignRequest({
        action: "prepare",
        organizationId,
        requestId,
        message: message.trim(),
        recipientIds: [...selected],
      });
      setCampaignId(data.campaignId);
      setPreparedRecipients(data.recipients ?? []);
      setConfirmed(new Set(data.confirmedRecipientIds || []));
      setSavedConfirmed(new Set(data.confirmedRecipientIds || []));
      setHistoryRevision((v) => v + 1);
      if (Array.isArray(data.skipped) && data.skipped.length)
        setError(
          `${data.skipped.length} pessoa(s) ficaram de fora por cadastro inativo, telefone inválido, repetido ou preferência de contato.`,
        );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível preparar a campanha.",
      );
    } finally {
      lock.current = false;
      setLoggingCampaign(false);
    }
  }

  async function openWhatsapp(recipient: PreparedRecipient) {
    if (!campaignId || loggingCampaign) return;
    setLoggingCampaign(true);
    setError(null);
    setReadyUrls((prev) => {
      const next = { ...prev };
      delete next[recipient.personId];
      return next;
    });
    try {
      const data = await campaignRequest({
        action: "campaign-contact",
        organizationId,
        campaignId,
        personId: recipient.personId,
      });
      setReadyUrls((prev) => ({
        ...prev,
        [recipient.personId]: manualUrl(data.url),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Contato indisponível.");
    } finally {
      setLoggingCampaign(false);
    }
  }

  function toggleConfirmed(personId: string) {
    setConfirmed((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  async function completeCampaign() {
    if (!organizationId || !campaignId || confirmed.size === 0) return;
    setLoggingCampaign(true);
    setError(null);
    try {
      await campaignRequest({
        action: "complete",
        organizationId,
        campaignId,
        confirmedRecipientIds: [...confirmed],
      });
      const refreshed = await fetchCommunicationLog(
        firebaseConfig,
        { organizationId },
        30,
      );
      setHistory(refreshed);
      setNotice(
        "Confirmações registradas pela equipe. Isso não comprova entrega ou leitura no WhatsApp.",
      );
      setMessage("");
      setOpened(new Set());
      setConfirmed(new Set());
      setSelected(new Set());
      setCampaignId(null);
      setPreparedRecipients([]);
      setComposing(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar as confirmações.",
      );
    } finally {
      setLoggingCampaign(false);
    }
  }

  if (composing && directPhone)
    return (
      <div className={`page-root ${styles.root}`}>
        <header className="page-header">
          <h1 className="page-title">Preparar conversa no WhatsApp</h1>
        </header>
        <section className="content-section">
          <p>
            Confira o texto. A preferência atual de contato será validada no
            servidor antes de abrir o WhatsApp.
          </p>
          <p>Contato: +{directPhone}</p>
          <textarea
            aria-label="Mensagem"
            readOnly={loggingCampaign}
            rows={6}
            maxLength={4000}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setDirectUrl("");
            }}
            style={{ ...inputStyle, width: "100%" }}
          />
          {error && <p role="alert">{error}</p>}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn-primary"
              disabled={loggingCampaign || !message.trim()}
              onClick={() => {
                setLoggingCampaign(true);
                setError(null);
                setDirectUrl("");
                void campaignRequest({
                  action: "contact",
                  organizationId,
                  requestId: crypto.randomUUID(),
                  phone: directPhone,
                  personId: directPersonId || undefined,
                  message: message.trim(),
                })
                  .then((result) => setDirectUrl(manualUrl(result.url)))
                  .catch((cause) => setError(cause.message))
                  .finally(() => setLoggingCampaign(false));
              }}
            >
              {loggingCampaign
                ? "Conferindo…"
                : "Conferir preferência de contato"}
            </button>
            {directUrl && (
              <a
                className="btn-secondary"
                href={directUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir conversa para envio manual
              </a>
            )}
            <button
              className="btn-secondary"
              onClick={() => {
                setDirectPhone("");
                setDirectUrl("");
                setComposing(false);
              }}
            >
              Voltar à comunicação
            </button>
          </div>
          <p>Abertura da conversa não comprova envio ou entrega.</p>
        </section>
      </div>
    );

  if (composing) {
    return (
      <div className={`page-root ${styles.root}`}>
        <header className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">
              {campaignId ? "Continuar envio manual" : "Nova mensagem"}
            </h1>
            <p className="page-subtitle">
              Prepare a lista, abra cada conversa e envie pelo WhatsApp da
              igreja.
            </p>
          </div>
          <div className="page-header-actions">
            <button
              className="btn-secondary"
              disabled={loggingCampaign || generatingDraft}
              onClick={() => {
                setComposing(false);
                setError(null);
                setHistoryRevision((v) => v + 1);
              }}
            >
              <X size={16} /> {campaignId ? "Voltar às listas" : "Cancelar"}
            </button>
          </div>
        </header>

        {notice && (
          <p role="status" className={styles.success}>
            {notice}
          </p>
        )}
        {error && (
          <div
            role="alert"
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong>Mensagem</strong>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 12,
                  color: "var(--alvo-ink-soft)",
                }}
              >
                Use {"{{nome}}"} para inserir o nome de cada destinatário.
                Depois de preparar, o texto fica preservado no histórico.
              </p>
            </div>
            <button
              className="btn-secondary btn-sm"
              type="button"
              disabled={!!campaignId}
              onClick={() => setAiOpen((value) => !value)}
            >
              <Sparkles size={14} /> Criar rascunho com Sabedoria Pastoral
            </button>
          </div>
          {aiOpen && !campaignId && (
            <div
              style={{
                display: "grid",
                gap: 10,
                padding: 14,
                border: "1px solid var(--alvo-line)",
                borderRadius: 10,
                marginBottom: 12,
                background: "var(--alvo-surface-soft, var(--alvo-surface))",
              }}
            >
              <input
                value={aiObjective}
                onChange={(event) => setAiObjective(event.target.value)}
                maxLength={500}
                placeholder="Objetivo: lembrar o culto de domingo..."
                style={inputStyle}
              />
              <input
                value={aiAudience}
                onChange={(event) => setAiAudience(event.target.value)}
                maxLength={200}
                placeholder="Público do comunicado"
                style={inputStyle}
              />
              <textarea
                value={aiDetails}
                onChange={(event) => setAiDetails(event.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Detalhes confirmados: data, horário, local e chamada para ação"
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <select
                  value={aiTone}
                  onChange={(event) => setAiTone(event.target.value)}
                  style={inputStyle}
                >
                  <option value="acolhedor">Acolhedor</option>
                  <option value="objetivo">Objetivo</option>
                  <option value="celebrativo">Celebrativo</option>
                  <option value="pastoral">Pastoral</option>
                </select>
                <button
                  className="btn-primary btn-sm"
                  type="button"
                  disabled={
                    generatingDraft || !aiObjective.trim() || !aiAudience.trim()
                  }
                  onClick={() => void generateDraft()}
                >
                  <Sparkles size={14} />{" "}
                  {generatingDraft ? "Gerando..." : "Gerar para revisar"}
                </button>
              </div>
              <small style={{ color: "var(--alvo-ink-soft)" }}>
                Não inclua dados pessoais ou pastorais. A geração usa a cota
                mensal da instituição e fica registrada sem salvar o conteúdo no
                log de Sabedoria Pastoral.
              </small>
            </div>
          )}
          <textarea
            aria-label="Mensagem aos destinatários"
            readOnly={!!campaignId || generatingDraft || loggingCampaign}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva a mensagem que será enviada por WhatsApp..."
            rows={6}
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
              {campaignId
                ? `Destinatários da lista (${preparedRecipients.length})`
                : `Pessoas com WhatsApp (${filteredPeople.length})`}
            </h2>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--alvo-ink-soft)",
              margin: "0 0 12px",
            }}
          >
            Selecione até 100 pessoas por lista. A busca usa os cadastros já
            carregados. O servidor confere igreja, cadastro ativo, telefone e
            opt-out antes de liberar as conversas.
          </p>

          {!campaignId && (
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
          )}

          {!campaignId && !loadingPeople && filteredPeople.length > 0 && (
            <button
              className="btn-secondary btn-sm"
              type="button"
              onClick={toggleSelectAll}
              style={{ marginBottom: 10 }}
            >
              {allFilteredSelected
                ? "Limpar esta lista"
                : "Selecionar esta lista"}
            </button>
          )}

          {!campaignId && peopleCursor && (
            <button
              className="btn-secondary"
              disabled={loadingPeople}
              onClick={() => void loadPeople(peopleCursor)}
            >
              Carregar mais pessoas
            </button>
          )}
          {!campaignId && !peopleLoaded && !loadingPeople && (
            <button className="btn-secondary" onClick={() => void loadPeople()}>
              Tentar carregar novamente
            </button>
          )}
          {loadingPeople ? (
            <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)" }}>
              Carregando pessoas...
            </p>
          ) : !campaignId && filteredPeople.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--alvo-ink-soft)" }}>
              Nenhuma pessoa com WhatsApp cadastrado
              {search ? " para essa busca" : ""}.
            </p>
          ) : campaignId ? (
            <div
              style={{
                maxHeight: 380,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {preparedRecipients.map((recipient) => (
                <div
                  key={recipient.personId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--alvo-line)",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--alvo-ink)" }}>
                    {recipient.name}
                  </span>
                  <button
                    className="btn-secondary btn-sm"
                    type="button"
                    disabled={
                      loggingCampaign || savedConfirmed.has(recipient.personId)
                    }
                    onClick={() => openWhatsapp(recipient)}
                    style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
                  >
                    <Smartphone size={14} />{" "}
                    {savedConfirmed.has(recipient.personId)
                      ? "Envio já registrado"
                      : readyUrls[recipient.personId]
                        ? "Revalidar contato"
                        : "Preparar conversa"}
                  </button>
                  {readyUrls[recipient.personId] &&
                    !savedConfirmed.has(recipient.personId) && (
                      <a
                        className="btn-primary btn-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={readyUrls[recipient.personId]}
                        onClick={() =>
                          setOpened((prev) =>
                            new Set(prev).add(recipient.personId),
                          )
                        }
                      >
                        Abrir WhatsApp
                      </a>
                    )}
                  <button
                    className="btn-secondary btn-sm"
                    type="button"
                    disabled={
                      savedConfirmed.has(recipient.personId) ||
                      !opened.has(recipient.personId)
                    }
                    onClick={() => toggleConfirmed(recipient.personId)}
                    style={{
                      color: confirmed.has(recipient.personId)
                        ? "#16a34a"
                        : undefined,
                      opacity: opened.has(recipient.personId) ? 1 : 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <CheckCircle2 size={14} />{" "}
                    {confirmed.has(recipient.personId)
                      ? "Envio confirmado"
                      : "Confirmar que enviei"}
                  </button>
                </div>
              ))}
            </div>
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
                <label
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    disabled={!selected.has(p.id) && selected.size >= 100}
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelected(p.id)}
                  />
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
                </label>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn-primary"
            onClick={campaignId ? completeCampaign : prepareCampaign}
            disabled={
              loggingCampaign ||
              generatingDraft ||
              (campaignId
                ? confirmed.size === 0
                : selected.size === 0 || !message.trim())
            }
            style={{
              opacity:
                loggingCampaign ||
                (campaignId
                  ? confirmed.size === 0
                  : selected.size === 0 || !message.trim())
                  ? 0.5
                  : 1,
            }}
          >
            <CheckCircle2 size={16} />
            {loggingCampaign
              ? "Registrando..."
              : campaignId
                ? `Salvar confirmações (${confirmed.size})`
                : `Preparar conversas (${selected.size})`}
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
    <div className={`page-root ${styles.root}`}>
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Comunicação</h1>
          <p className="page-subtitle">
            Conversas manuais e atendimento da igreja
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={startNew}>
            <Plus size={16} />
            Nova mensagem
          </button>
        </div>
      </header>

      {notice && (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.modes} aria-label="Modo de comunicação">
        <button
          className={mode === "manual" ? "btn-primary" : "btn-secondary"}
          aria-pressed={mode === "manual"}
          onClick={() => setMode("manual")}
        >
          WhatsApp manual
        </button>
        <button
          className={mode === "api" ? "btn-primary" : "btn-secondary"}
          aria-pressed={mode === "api"}
          onClick={() => setMode("api")}
        >
          Atendimento pela API Meta
        </button>
      </div>
      {mode === "manual" ? (
        <section className={styles.intro}>
          <h2>Prepare aqui. Envie pelo WhatsApp da igreja.</h2>
          <p>
            Escolha as pessoas, revise o texto e abra cada conversa com a
            mensagem pronta. Entre no WhatsApp Web com o número da igreja. Esse
            modo não usa a API Meta e não dispara notificações no aplicativo.
          </p>
          <p>
            Registre apenas os envios que você realizou. É possível salvar uma
            parte e retomar os demais depois.
          </p>
        </section>
      ) : (
        <WhatsappChannelView />
      )}
      {mode === "manual" && (
        <>
          <section className="content-section">
            <div className="section-header">
              <h2 className="section-title">
                Últimas 30 listas e envios manuais
              </h2>
              <button
                className="btn-secondary"
                disabled={historyLoading}
                onClick={() => setHistoryRevision((v) => v + 1)}
              >
                Atualizar
              </button>
            </div>
            {historyLoading ? (
              <p role="status">Carregando histórico…</p>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <Send size={40} strokeWidth={1.4} />
                <p>Nenhuma lista preparada ainda.</p>
                <p className="empty-hint">
                  Crie sua primeira mensagem para alcançar membros e visitantes
                  de forma segmentada.
                </p>
                <button className="btn-primary btn-sm" onClick={startNew}>
                  <Plus size={14} />
                  Preparar primeira mensagem
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
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: "var(--alvo-ink)",
                      }}
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
                      {h.sentCount} envio{h.sentCount !== 1 ? "s" : ""}{" "}
                      confirmado{h.sentCount !== 1 ? "s" : ""} pela liderança
                      {h.status === "prepared"
                        ? " · campanha preparada, sem envio confirmado"
                        : ""}
                      {h.failedCount > 0 ? ` · ${h.failedCount} falharam` : ""}
                    </p>
                    {["prepared", "partially_confirmed"].includes(
                      h.status || "",
                    ) && (
                      <button
                        disabled={loggingCampaign}
                        className="btn-secondary"
                        onClick={() => void resume(h.id)}
                      >
                        Retomar lista
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="content-section">
            <div className="section-header">
              <h2 className="section-title">Modelos manuais salvos</h2>
            </div>
            {templates.length === 0 ? (
              <div className="empty-state">
                <MessageSquareText size={40} strokeWidth={1.4} />
                <p>Nenhum modelo criado.</p>
                <p className="empty-hint">
                  Estes modelos não exigem aprovação da Meta e agilizam envios
                  manuais recorrentes (lembretes de culto, boas-vindas). Escreva
                  uma mensagem em "Nova mensagem" e clique em "Salvar como
                  template".
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
        </>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "9px 11px",
  borderRadius: 8,
  border: "1px solid var(--alvo-line)",
  background: "var(--alvo-surface)",
  color: "var(--alvo-ink)",
  font: "inherit",
  boxSizing: "border-box" as const,
};

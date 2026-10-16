"use client";
import { useEffect, useRef, useState } from "react";
import { useAppAuth } from "../../../app/providers";
import { PASTORAL_CONTEXT_LIMITS } from "@alvo/ai";

const fields: Record<string, string> = {
  assistantName: "Nome da assistente",
  greeting: "Saudação",
  bibleVersion: "Versão da Bíblia",
  pastors: "Pastores e referências",
  churchHistory: "História e informações da igreja",
  socialProjects: "Projetos sociais",
  contributionGuidance: "Orientações sobre contribuições",
  instructions: "Preferências de linguagem e atendimento",
};
const flags: Record<string, string> = {
  enabled: "Ativar atendimento automático",
  aiEnabled: "Permitir perguntas gerais com IA (usa a cota da igreja)",
  eventsEnabled: "Agenda e inscrições",
  careEnabled: "Pedidos privados de oração e cuidado",
  visitorsEnabled: "Cadastro de visitantes",
  groupsEnabled: "Declaração de presença na célula (contas vinculadas)",
};
export function WhatsappChannelView() {
  const { user, organizationId } = useAppAuth();
  const [data, setData] = useState<any>(null),
    [settings, setSettings] = useState<Record<string, any>>({}),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const [contact, setContact] = useState<any>(null),
    [thread, setThread] = useState<any[]>([]),
    [text, setText] = useState(""),
    [template, setTemplate] = useState(""),
    [parameters, setParameters] = useState(""),
    [language, setLanguage] = useState("pt_BR"),
    [scheduledAt, setScheduledAt] = useState("");
  const attempt = useRef({ fingerprint: "", id: "" });
  async function request(body: Record<string, any>) {
    if (!user) throw new Error("Entre na sua conta.");
    const response = await fetch("/api/whatsapp/manage", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({ ...body, organizationId }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Não foi possível concluir.");
    return result;
  }
  async function load() {
    try {
      setError("");
      const next = await request({ action: "settings" });
      setData(next);
      setSettings(next.settings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar.");
    }
  }
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setContact(null);
    setThread([]);
    setSettings({});
    if (!user) return;
    void request({ action: "settings" })
      .then((next) => {
        if (!cancelled) {
          setData(next);
          setSettings(next.settings);
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause.message);
      });
    return () => {
      cancelled = true;
    };
  }, [user, organizationId]);
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await work();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível concluir.",
      );
    } finally {
      setBusy(false);
    }
  }
  const input = {
    width: "100%",
    padding: 10,
    border: "1px solid var(--alvo-line)",
    borderRadius: 8,
    font: "inherit",
    color: "var(--alvo-ink)",
    background: "var(--alvo-surface)",
    boxSizing: "border-box" as const,
  };
  return (
    <section className="content-section" aria-label="Atendimento pelo WhatsApp">
      <h2 className="section-title">
        Participação pelo WhatsApp, sem aplicativo
      </h2>
      <p>Agenda, inscrições, visitantes e cuidado na mesma base da igreja.</p>
      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      {!data ? (
        <button className="btn-secondary" onClick={() => void load()}>
          Carregar conexão
        </button>
      ) : (
        <>
          <p>
            <strong>
              {data.connection.configured
                ? "Conexão configurada — falta confirmar operação com um número real se ainda não foi homologada."
                : "Conexão pendente: a plataforma precisa provisionar o número e as credenciais da API oficial."}
            </strong>
          </p>
          {data.connection.publicPhone && (
            <p>Número da igreja: +{data.connection.publicPhone}</p>
          )}
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Identidade da assistente e opções de atendimento
            </summary>
            <form
              style={{ display: "grid", gap: 14, marginTop: 16 }}
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () => {
                  const next = await request({ action: "settings", settings });
                  setData(next);
                  setSettings(next.settings);
                  setStatus("Configurações salvas.");
                });
              }}
            >
              {Object.entries(fields).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <textarea
                    rows={
                      key === "churchHistory" || key === "instructions" ? 3 : 2
                    }
                    style={input}
                    maxLength={
                      PASTORAL_CONTEXT_LIMITS[
                        key as keyof typeof PASTORAL_CONTEXT_LIMITS
                      ]
                    }
                    value={settings[key] ?? ""}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, [key]: e.target.value }))
                    }
                  />
                </label>
              ))}
              {Object.entries(flags).map(([key, label]) => (
                <label key={key} style={{ display: "flex", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings[key] === true}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, [key]: e.target.checked }))
                    }
                  />
                  {label}
                </label>
              ))}
              <p>
                Perguntas gerais usam Gemini/Groq. Pedidos de oração seguem
                diretamente à equipe, sem geração automática. Não inclua
                segredos ou dados pessoais no contexto institucional.
              </p>
              <button disabled={busy} className="btn-primary" type="submit">
                {busy ? "Salvando…" : "Salvar configurações"}
              </button>
            </form>
          </details>
          <h3>Conversas recentes</h3>
          <p>
            Ao iniciar uma conversa, o contato poderá usar MENU, AGENDA,
            VISITANTE, ORACAO, HUMANO e SAIR.
          </p>
          {!data.inbox.length && (
            <p>Nenhuma conversa recebida nesta conexão.</p>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {data.inbox.map((c: any) => (
              <div
                key={c.id}
                style={{
                  border: "1px solid var(--alvo-line)",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <strong>{c.name}</strong> · +{c.phone}{" "}
                {c.handoff && <strong> · Aguardando equipe</strong>}
                <p style={{ whiteSpace: "pre-wrap" }}>{c.lastText}</p>
                <button
                  disabled={busy}
                  className="btn-secondary btn-sm"
                  onClick={() =>
                    void action(async () => {
                      setContact(c);
                      setTemplate("");
                      setText("");
                      const result = await request({
                        action: "history",
                        contactId: c.id,
                      });
                      setThread(result.thread);
                    })
                  }
                >
                  Ver conversa e responder
                </button>{" "}
                <button
                  disabled={busy}
                  className="btn-secondary btn-sm"
                  onClick={() =>
                    void action(async () => {
                      await request({
                        action: "handoff",
                        contactId: c.id,
                        handoff: !c.handoff,
                      });
                      await load();
                      setStatus(
                        c.handoff
                          ? "Atendimento humano concluído; automação retomada."
                          : "Conversa assumida pela equipe.",
                      );
                    })
                  }
                >
                  {c.handoff
                    ? "Concluir atendimento humano"
                    : "Assumir atendimento"}
                </button>
              </div>
            ))}
          </div>
          {contact && (
            <form
              style={{ display: "grid", gap: 12, marginTop: 18 }}
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () => {
                  const values = {
                    to: contact.phone,
                    kind: template ? "template" : "text",
                    text,
                    templateName: template,
                    language,
                    parameters: parameters.split("\n").filter(Boolean),
                    scheduledAt: scheduledAt
                      ? new Date(scheduledAt).toISOString()
                      : undefined,
                  };
                  const fingerprint = JSON.stringify(values);
                  if (attempt.current.fingerprint !== fingerprint)
                    attempt.current = { fingerprint, id: crypto.randomUUID() };
                  const result = await request({
                    action: "send",
                    ...values,
                    requestId: attempt.current.id,
                  });
                  setStatus(
                    `Mensagem registrada: ${result.status}. Aceita pelo provedor não significa entregue.`,
                  );
                  await load();
                });
              }}
            >
              <h3>Responder a {contact.name}</h3>
              <div
                style={{
                  maxHeight: 320,
                  overflowY: "auto",
                  display: "grid",
                  gap: 10,
                }}
              >
                {thread.map((m: any, i: number) => (
                  <p
                    key={i}
                    style={{
                      whiteSpace: "pre-wrap",
                      padding: 10,
                      background: "var(--alvo-surface-muted)",
                      borderRadius: 8,
                    }}
                  >
                    <strong>
                      {m.direction === "in" ? "Contato" : "Assistente/equipe"}:
                    </strong>{" "}
                    {m.text}
                  </p>
                ))}
              </div>
              <label>
                Tipo de mensagem
                <select
                  style={input}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                >
                  <option value="">Texto na janela de atendimento</option>
                  {data.connection.templates.map((t: string) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              {!template ? (
                <label>
                  Texto
                  <textarea
                    required
                    maxLength={4000}
                    rows={4}
                    style={input}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
              ) : (
                <>
                  <label>
                    Idioma aprovado
                    <input
                      style={input}
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    />
                  </label>
                  <label>
                    Parâmetros do corpo, um por linha
                    <textarea
                      rows={3}
                      style={input}
                      value={parameters}
                      onChange={(e) => setParameters(e.target.value)}
                    />
                  </label>
                </>
              )}
              <label>
                Agendar (opcional, horário local)
                <input
                  style={input}
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </label>
              <p>
                Fora da janela de atendimento, selecione um template aprovado.
                Envios agendados dependem do processador periódico da
                plataforma. Resultado incerto exige conferência antes de uma
                nova tentativa.
              </p>
              <button
                type="submit"
                className="btn-primary"
                disabled={busy || !data.connection.configured}
              >
                {busy ? "Registrando…" : "Registrar envio pela API"}
              </button>
            </form>
          )}
          <h3>Envios e confirmações do provedor</h3>
          <button
            className="btn-secondary btn-sm"
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await request({ action: "process" });
                await load();
                setStatus(
                  "Fila conferida. Envios incertos não foram repetidos.",
                );
              })
            }
          >
            Processar fila pendente
          </button>{" "}
          <button
            className="btn-secondary btn-sm"
            disabled={busy}
            onClick={() => void load()}
          >
            Atualizar
          </button>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Contato</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Agendado</th>
                </tr>
              </thead>
              <tbody>
                {data.outbox.map((m: any) => (
                  <tr key={m.id}>
                    <td>+{m.to}</td>
                    <td>{m.kind}</td>
                    <td>
                      {(
                        {
                          pending: "Pendente",
                          sending: "Em envio — conferir se persistir",
                          accepted: "Aceita pelo provedor",
                          sent: "Enviada",
                          delivered: "Entregue",
                          read: "Lida",
                          failed: "Recusada",
                          uncertain: "Resultado incerto — conferir",
                          blocked: "Bloqueada",
                          expired: "Janela expirada",
                        } as Record<string, string>
                      )[m.status] ?? m.status}
                    </td>
                    <td>
                      {m.scheduledAt
                        ? new Date(m.scheduledAt).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAppAuth } from "../../../app/providers";
import s from "./pastoral.module.css";
type Row = {
  id: string;
  personName: string;
  personId: string | null;
  message: string;
  phone: string;
  priority: string;
  status: string;
  stage: string;
  ownerName: string;
  dueAt: string | null;
  createdAt: string;
  source: string;
  revision: number;
  groupId: string | null;
};
type Overview = {
  scope: string;
  canManage?: boolean;
  requests?: Row[];
  summary: Record<string, number>;
  partial: boolean;
  hasMore?: boolean;
  asOf: string;
  churches?: Array<{
    id: string;
    name: string;
    open: number | null;
    waiting: number | null;
    inProgress: number | null;
    urgent: number | null;
    overdue: number | null;
    available: boolean;
  }>;
};
const label: Record<string, string> = {
  open: "Novo",
  new: "Novo",
  triage: "Em triagem",
  in_progress: "Em acompanhamento",
  assigned: "Atribuído",
  resolved: "Concluído",
  urgent: "Urgente",
  important: "Importante",
  normal: "Normal",
  app: "App",
  reception: "Recepção",
  whatsapp: "WhatsApp",
  public_form: "Formulário público",
};
const date = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("pt-BR")
    : "Sem prazo";
export function PastoralWorkspace({
  initialRadar = false,
}: {
  initialRadar?: boolean;
}) {
  const { user, organizationId, roles } = useAppAuth();
  const [profile, setProfile] = useState<string | undefined>(),
    [revision, setRevision] = useState(0),
    [offset, setOffset] = useState(0),
    [resolved, setResolved] = useState(false);
  const [tab, setTab] = useState(initialRadar ? "radar" : "queue"),
    [data, setData] = useState<Overview>(),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const [directory, setDirectory] = useState<any>(),
    [radar, setRadar] = useState<any>(),
    [selected, setSelected] = useState<Row>(),
    [history, setHistory] = useState<Array<{ action: string; at: string }>>([]);
  const [form, setForm] = useState({
      personId: "",
      personName: "",
      message: "",
      phone: "",
      category: "Oração",
    }),
    [linkedPerson, setLinkedPerson] = useState(""),
    [owner, setOwner] = useState(""),
    [group, setGroup] = useState(""),
    [due, setDue] = useState(""),
    [priority, setPriority] = useState("normal"),
    [reply, setReply] = useState(""),
    [whatsapp, setWhatsapp] = useState<string | null>(null),
    [showCreate, setShowCreate] = useState(false),
    [checkDate, setCheckDate] = useState(
      new Date().toLocaleDateString("sv-SE"),
    );
  const detailGeneration = useRef(0),
    generation = useRef(0),
    lock = useRef(false),
    attempt = useRef("");
  async function call(body: Record<string, unknown>) {
    if (!user) throw Error("Entre na sua conta.");
    const r = await fetch("/api/pastoral", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({ ...body, organizationId, profile }),
      cache: "no-store",
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.error || "Não foi possível concluir.");
    return result;
  }
  useEffect(() => {
    setProfile(
      new URLSearchParams(window.location.search).get("profile") || undefined,
    );
  }, []);
  useEffect(() => {
    setSelected(undefined);
    setDirectory(undefined);
    setRadar(undefined);
    setReply("");
    setWhatsapp(null);
    setStatus("");
    setShowCreate(false);
    attempt.current = "";
    setForm({
      personId: "",
      personName: "",
      message: "",
      phone: "",
      category: "Oração",
    });
  }, [organizationId, user?.uid, profile]);
  useEffect(() => {
    const g = ++generation.current;
    setData(undefined);
    setSelected(undefined);
    setHistory([]);
    setReply("");
    setLoading(true);
    setError("");
    lock.current = false;
    setBusy(false);
    if (!user) {
      setLoading(false);
      return;
    }
    void call({ action: "overview", offset, resolved })
      .then((r) => {
        if (g === generation.current) setData(r);
      })
      .catch((e) => {
        if (g === generation.current) setError(e.message);
      })
      .finally(() => {
        if (g === generation.current) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [user, organizationId, profile, revision, offset, resolved]);
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setDirectory(undefined);
    setRadar(undefined);
    if (data.canManage)
      void call({ action: "directory" })
        .then((r) => {
          if (!cancelled) setDirectory(r);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    if (tab === "radar" && data.scope !== "network")
      void call({ action: "radar" })
        .then((r) => {
          if (!cancelled) setRadar(r);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    return () => {
      cancelled = true;
    };
  }, [data, tab]);
  async function run(body: Record<string, unknown>, message: string) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    const g = generation.current;
    try {
      await call(body);
      if (g !== generation.current) return false;
      setStatus(message);
      setRevision((n) => n + 1);
      return true;
    } catch (e) {
      if (g === generation.current)
        setError(e instanceof Error ? e.message : "Não foi possível concluir.");
      return false;
    } finally {
      if (g === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  async function select(r: Row) {
    const selection = ++detailGeneration.current;
    setSelected(r);
    setReply("");
    setOwner("");
    setLinkedPerson("");
    setGroup(r.groupId || "");
    setPriority(r.priority);
    setDue(r.dueAt?.slice(0, 10) || "");
    setHistory([]);
    const g = generation.current;
    try {
      const d = await call({ action: "detail", requestId: r.id });
      if (g === generation.current && selection === detailGeneration.current) {
        setSelected(d.request);
        setHistory(d.history);
      }
    } catch (e) {
      if (g === generation.current) setError((e as Error).message);
    }
  }
  async function generate() {
    if (!selected || !user || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const id = selected.id,
      g = generation.current;
    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          task: "care_reply",
          organizationId,
          requestId: id,
          profile,
          input: {},
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (g === generation.current)
        setSelected((current) => {
          if (current?.id === id) setReply(d.content);
          return current;
        });
    } catch (e) {
      if (g === generation.current) setError((e as Error).message);
    } finally {
      if (g === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  const change = (action: string, extra: Record<string, unknown> = {}) =>
    selected &&
    run(
      { action, requestId: selected.id, revision: selected.revision, ...extra },
      "Acompanhamento atualizado. Os painéis consultarão a mesma fila.",
    );
  useEffect(() => {
    setWhatsapp(null);
  }, [reply, selected?.id, organizationId, user, profile]);
  async function prepareWhatsapp() {
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const g = generation.current,
      selection = detailGeneration.current;
    try {
      const result = await call({
        action: "whatsapp-link",
        requestId: selected.id,
        message: reply,
      });
      if (g === generation.current && selection === detailGeneration.current)
        setWhatsapp(result.url);
    } catch (e) {
      if (g === generation.current) setError((e as Error).message);
    } finally {
      if (g === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  const metrics =
    data?.scope === "network"
      ? [
          ["open", "Pedidos abertos"],
          ["inProgress", "Em acompanhamento"],
          ["covered", "Instituições com dados"],
          ["total", "Vínculos verificados"],
        ]
      : [
          ["open", "Pedidos abertos"],
          ["urgent", "Urgentes"],
          ["unassigned", "Sem responsável"],
          ["overdue", "Prazo vencido"],
        ];
  return (
    <main className={s.page}>
      <header>
        <p className={s.eyebrow}>CUIDADO PASTORAL</p>
        <h1>
          {data?.scope === "network"
            ? "Cuidado das instituições"
            : "Da escuta ao acompanhamento"}
        </h1>
        <p>
          {data?.scope === "network"
            ? "Identifique onde a liderança precisa de apoio, com indicadores das instituições vinculadas."
            : "Cada pedido com responsável, prazo e próximo passo. A liderança revisa os sinais e as respostas sugeridas."}
        </p>
      </header>
      <div className={s.actions}>
        <Link href="/app">Dashboard</Link>
        <button disabled={busy} onClick={() => setRevision((n) => n + 1)}>
          Atualizar
        </button>
        <label>
          Visão
          <select
            value={profile || ""}
            onChange={(e) => {
              setProfile(e.target.value || undefined);
              setOffset(0);
            }}
          >
            <option value="">Automática pela conta</option>
            {roles.some((r) =>
              ["pastor", "church_admin", "super_admin"].includes(r),
            ) && <option value="pastoral">Pastor da instituição</option>}
            {roles.includes("group_leader") && (
              <option value="cell_leader">Líder de célula</option>
            )}
            {roles.some((r) => ["church_admin", "super_admin"].includes(r)) && (
              <option value="network">Pastor presidente / rede</option>
            )}
          </select>
        </label>
      </div>
      <p className={s.scope}>
        {data?.scope === "assigned"
          ? "Você recebe somente pedidos atribuídos a você, vinculados a pessoas das células que lidera."
          : data?.scope === "network"
            ? "Somente vínculos ativos confirmados. Relatos, contatos e nomes dos solicitantes não são compartilhados nesta visão."
            : "Fila da instituição ativa. Encaminhar a um líder libera apenas aquele pedido, enquanto o vínculo com a célula permanecer ativo."}
      </p>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <p role="status">{busy ? "Processando…" : status}</p>
      {loading && <p>Carregando cuidado pastoral…</p>}
      {data && (
        <>
          <div className={s.metrics}>
            {metrics.map(([key, title]) => (
              <article key={key}>
                <span>
                  {title}
                  {data.partial ? " · amostra" : ""}
                </span>
                <strong>{data.summary[key] ?? "—"}</strong>
              </article>
            ))}
          </div>
          <p className={s.muted}>
            Consulta de {date(data.asOf)}. Urgência é definida na triagem
            humana; não representa diagnóstico.
          </p>
          {data.partial && (
            <p role="alert">
              Consulta parcial por limite de volume. Não interprete os números
              como totais completos.
            </p>
          )}
          {data.scope === "network" ? (
            <section className={s.card}>
              <h2>Onde apoiar a liderança</h2>
              {!data.churches?.length && (
                <p>Nenhum vínculo ativo confirmado.</p>
              )}
              {data.churches?.map((c) => (
                <article className={s.row} key={c.id}>
                  <h3>{c.name}</h3>
                  <p>
                    {c.available
                      ? `${c.open} pedido(s) aberto(s) · ${c.waiting} aguardando início · ${c.inProgress} em acompanhamento · ${c.urgent} urgente(s) · ${c.overdue} com prazo vencido`
                      : "Dados pastorais indisponíveis; não significa fila vazia."}
                  </p>
                </article>
              ))}
              <p>
                Combine com cada pastor a distribuição do cuidado. O acesso aos
                relatos exige uma função local autorizada na instituição.
              </p>
              <Link href="/network">Gerenciar vínculos da rede</Link>
            </section>
          ) : (
            <>
              <nav className={s.actions} aria-label="Visões do cuidado">
                <button
                  aria-pressed={tab === "queue"}
                  onClick={() => setTab("queue")}
                >
                  Fila de cuidado
                </button>
                <button
                  aria-pressed={tab === "radar"}
                  onClick={() => setTab("radar")}
                >
                  Radar pastoral
                </button>
              </nav>
              {tab === "radar" ? (
                <section className={s.card}>
                  <h2>Sinais para revisão humana</h2>
                  <p>
                    Presenças, escalas futuras e discipulado ajudam a levantar
                    perguntas. Nenhum sinal envia mensagens ou classifica a
                    espiritualidade de uma pessoa.
                  </p>
                  {!radar ? (
                    <p>Consultando registros…</p>
                  ) : (
                    <>
                      {radar.warnings.map((w: string) => (
                        <p className={s.scope} key={w}>
                          {w}
                        </p>
                      ))}
                      {!radar.signals.length && (
                        <p>
                          Nenhum sinal nas fontes consultadas. Isso não comprova
                          que todos receberam acompanhamento.
                        </p>
                      )}
                      {radar.signals.map((r: any, i: number) => (
                        <article
                          className={s.row}
                          key={r.personId + r.kind + i}
                        >
                          <strong>{r.name}</strong>
                          <p>{r.detail}</p>
                          {data.canManage && (
                            <button
                              onClick={() => {
                                setForm({
                                  ...form,
                                  personId: r.personId,
                                  personName: r.name,
                                  message: r.detail,
                                });
                                setShowCreate(true);
                                setTab("queue");
                              }}
                            >
                              Registrar cuidado após revisão
                            </button>
                          )}
                        </article>
                      ))}
                    </>
                  )}
                  {data.canManage && directory && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(
                          {
                            action: "checkin",
                            personId: form.personId,
                            date: checkDate,
                          },
                          "Presença de culto registrada.",
                        );
                      }}
                    >
                      <h3>Registrar presença realizada</h3>
                      <label>
                        Pessoa
                        <select
                          required
                          value={form.personId}
                          onChange={(e) =>
                            setForm({ ...form, personId: e.target.value })
                          }
                        >
                          <option value="">Selecione</option>
                          {directory.people.map((p: any) => (
                            <option value={p.id} key={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Data do culto
                        <input
                          required
                          type="date"
                          value={checkDate}
                          onChange={(e) => setCheckDate(e.target.value)}
                        />
                      </label>
                      <button disabled={busy}>Registrar presença</button>
                    </form>
                  )}
                </section>
              ) : (
                <>
                  <div className={s.actions}>
                    <button
                      aria-pressed={!resolved}
                      onClick={() => {
                        setResolved(false);
                        setOffset(0);
                      }}
                    >
                      Em aberto
                    </button>
                    <button
                      aria-pressed={resolved}
                      onClick={() => {
                        setResolved(true);
                        setOffset(0);
                      }}
                    >
                      Concluídos
                    </button>
                    {data.canManage && (
                      <button onClick={() => setShowCreate(!showCreate)}>
                        Novo pedido
                      </button>
                    )}
                  </div>
                  {showCreate && data.canManage && (
                    <form
                      className={s.card}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        attempt.current ||= crypto.randomUUID();
                        if (
                          await run(
                            {
                              action: "create",
                              requestId: attempt.current,
                              ...form,
                            },
                            "Pedido registrado na fila pastoral.",
                          )
                        ) {
                          attempt.current = "";
                          setShowCreate(false);
                          setForm({
                            personId: "",
                            personName: "",
                            message: "",
                            phone: "",
                            category: "Oração",
                          });
                        }
                      }}
                    >
                      <h2>Registrar pedido privado</h2>
                      <label>
                        Pessoa cadastrada (opcional)
                        <select
                          value={form.personId}
                          onChange={(e) =>
                            setForm({ ...form, personId: e.target.value })
                          }
                        >
                          <option value="">Pessoa ainda não cadastrada</option>
                          {directory?.people.map((p: any) => (
                            <option value={p.id} key={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {!form.personId && (
                        <label>
                          Nome
                          <input
                            required
                            maxLength={160}
                            value={form.personName}
                            onChange={(e) =>
                              setForm({ ...form, personName: e.target.value })
                            }
                          />
                        </label>
                      )}
                      <label>
                        Telefone (opcional)
                        <input
                          maxLength={30}
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Categoria
                        <input
                          required
                          maxLength={80}
                          value={form.category}
                          onChange={(e) =>
                            setForm({ ...form, category: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Pedido
                        <textarea
                          required
                          maxLength={2000}
                          value={form.message}
                          onChange={(e) =>
                            setForm({ ...form, message: e.target.value })
                          }
                        />
                      </label>
                      <button disabled={busy}>Salvar pedido</button>
                    </form>
                  )}
                  {directory?.partial && (
                    <p>
                      Seletores limitados a 500 cadastros. Procure a
                      administração se não encontrar a pessoa ou o responsável.
                    </p>
                  )}
                  <div className={s.columns}>
                    <section className={s.card}>
                      <h2>
                        {resolved ? "Pedidos concluídos" : "Próximos cuidados"}
                      </h2>
                      <p>Urgência, prazo e ordem de chegada orientam a fila.</p>
                      {!data.requests?.length && (
                        <p>Nenhum pedido nesta página e neste escopo.</p>
                      )}
                      <div
                        className={s.requestList}
                        aria-label="Lista de pedidos"
                      >
                        {data.requests?.map((r) => (
                          <button
                            className={s.request}
                            aria-pressed={selected?.id === r.id}
                            onClick={() => void select(r)}
                            key={r.id}
                          >
                            <strong>{r.personName}</strong>
                            <span>
                              {label[r.priority]} ·{" "}
                              {label[r.stage] || label[r.status]}
                            </span>
                            <span>
                              {r.ownerName || "Sem responsável"} ·{" "}
                              {date(r.dueAt)}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className={s.actions}>
                        <button
                          disabled={offset === 0 || busy}
                          onClick={() => setOffset(Math.max(0, offset - 100))}
                        >
                          Anterior
                        </button>
                        <span>Página {offset / 100 + 1}</span>
                        <button
                          disabled={!data.hasMore || busy}
                          onClick={() => setOffset(offset + 100)}
                        >
                          Próxima
                        </button>
                      </div>
                    </section>
                    <section className={s.card}>
                      <h2>Próximo passo</h2>
                      {!selected ? (
                        <p>Selecione um pedido para revisar e acompanhar.</p>
                      ) : (
                        <>
                          <h3>{selected.personName}</h3>
                          <p className={s.message}>{selected.message}</p>
                          <p>
                            {label[selected.source] || selected.source} ·
                            Recebido em {date(selected.createdAt)}
                          </p>
                          <p>
                            Responsável:{" "}
                            {selected.ownerName || "Ainda não atribuído"} ·
                            Prazo: {date(selected.dueAt)}
                          </p>
                          {data.canManage && selected.status !== "resolved" && (
                            <>
                              {!selected.personId && (
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    void change("link-person", {
                                      personId: linkedPerson,
                                    });
                                  }}
                                >
                                  <h3>Vincular ao cadastro</h3>
                                  <p>
                                    Confira a identidade antes de associar o
                                    pedido. A vinculação permite encaminhar à
                                    liderança da célula.
                                  </p>
                                  <label>
                                    Pessoa
                                    <select
                                      required
                                      value={linkedPerson}
                                      onChange={(e) =>
                                        setLinkedPerson(e.target.value)
                                      }
                                    >
                                      <option value="">Selecione</option>
                                      {directory?.people.map((p: any) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <button disabled={busy}>
                                    Confirmar vínculo
                                  </button>
                                </form>
                              )}
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  void change("triage", {
                                    priority,
                                    dueAt: due,
                                  });
                                }}
                              >
                                <h3>Triagem</h3>
                                <label>
                                  Prioridade
                                  <select
                                    value={priority}
                                    onChange={(e) =>
                                      setPriority(e.target.value)
                                    }
                                  >
                                    <option value="normal">Normal</option>
                                    <option value="important">
                                      Importante
                                    </option>
                                    <option value="urgent">Urgente</option>
                                  </select>
                                </label>
                                <label>
                                  Prazo
                                  <input
                                    type="date"
                                    value={due}
                                    onChange={(e) => setDue(e.target.value)}
                                  />
                                </label>
                                <button disabled={busy}>Salvar triagem</button>
                              </form>
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  void change("assign", {
                                    ownerId: owner,
                                    groupId: group,
                                    dueAt: due,
                                  });
                                }}
                              >
                                <h3>Encaminhar a um responsável</h3>
                                <label>
                                  Responsável
                                  <select
                                    required
                                    value={owner}
                                    onChange={(e) => setOwner(e.target.value)}
                                  >
                                    <option value="">Selecione</option>
                                    {directory?.owners.map((o: any) => (
                                      <option value={o.id} key={o.id}>
                                        {o.name}
                                        {o.leader ? " · líder de célula" : ""}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  Célula (obrigatória para líder)
                                  <select
                                    value={group}
                                    onChange={(e) => setGroup(e.target.value)}
                                  >
                                    <option value="">
                                      Atendimento pastoral
                                    </option>
                                    {directory?.groups.map((g: any) => (
                                      <option key={g.id} value={g.id}>
                                        {g.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <p>
                                  O vínculo da pessoa e do líder é conferido ao
                                  salvar.
                                </p>
                                <button disabled={busy}>
                                  Confirmar encaminhamento
                                </button>
                              </form>
                            </>
                          )}
                          {selected.status !== "resolved" ? (
                            <>
                              <h3>Resposta sugerida</h3>
                              <p>
                                O relato será usado para preparar um rascunho.
                                Revise o texto antes de copiar ou enviar;
                                nenhuma mensagem é enviada automaticamente.
                              </p>
                              <button
                                disabled={busy}
                                onClick={() => void generate()}
                              >
                                Gerar rascunho com Sabedoria Pastoral
                              </button>
                              <label>
                                Rascunho para revisão
                                <textarea
                                  value={reply}
                                  onChange={(e) => setReply(e.target.value)}
                                />
                              </label>
                              <div className={s.actions}>
                                <button
                                  disabled={!reply}
                                  onClick={() =>
                                    void navigator.clipboard
                                      .writeText(reply)
                                      .then(() =>
                                        setStatus("Rascunho copiado."),
                                      )
                                      .catch(() =>
                                        setError("Não foi possível copiar."),
                                      )
                                  }
                                >
                                  Copiar rascunho
                                </button>
                                {!!selected.phone && (
                                  <button
                                    disabled={busy || !reply.trim()}
                                    onClick={() => void prepareWhatsapp()}
                                  >
                                    Preparar contato no WhatsApp
                                  </button>
                                )}
                                {whatsapp && (
                                  <a
                                    href={whatsapp}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Abrir WhatsApp
                                  </a>
                                )}
                              </div>
                              <div className={s.actions}>
                                <button
                                  disabled={busy}
                                  onClick={() => void change("contact")}
                                >
                                  Registrar contato realizado
                                </button>
                                <button
                                  disabled={busy}
                                  onClick={() => void change("resolve")}
                                >
                                  Concluir acompanhamento
                                </button>
                              </div>
                            </>
                          ) : (
                            data.canManage && (
                              <button
                                disabled={busy}
                                onClick={() => void change("reopen")}
                              >
                                Reabrir acompanhamento
                              </button>
                            )
                          )}
                          <h3>Histórico registrado</h3>
                          {!history.length && (
                            <p>Nenhuma ação registrada por este fluxo ainda.</p>
                          )}
                          <ul>
                            {history.map((h, i) => (
                              <li key={i}>
                                {(
                                  {
                                    created: "Pedido criado",
                                    assign: "Responsável atribuído",
                                    "link-person":
                                      "Pedido vinculado ao cadastro",
                                    triage: "Triagem revisada",
                                    resolve: "Acompanhamento concluído",
                                    reopen: "Pedido reaberto",
                                    contact: "Contato registrado",
                                  } as Record<string, string>
                                )[h.action] || h.action}{" "}
                                · {date(h.at)}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </section>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

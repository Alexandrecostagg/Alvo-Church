"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAppAuth } from "../../../app/providers";
import { invalidateOrgDataCache } from "../../lib/org-data-cache";
import s from "./reception.module.css";
type Row = {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: string;
  personId: string | null;
  journeyId: string | null;
  stage: string | null;
  note: string;
  consentContact: boolean;
  contactState: string;
  greetingApproved: boolean;
  greetingDate: string;
  greetingText: string;
  greetedAt: string | null;
  revision: number;
  createdAt: string;
  careRequestId: string | null;
};
type PublicRow = { id: string; name: string; text: string; revision: number };
type Overview = {
  organizationId: string;
  summary: {
    total: number;
    pending: number;
    greetings: number | null;
    activeJourneys: number | null;
  };
  items: Row[];
  pulpit: PublicRow[];
  hasMore: boolean;
  partial: boolean;
  asOf: string;
  day: string;
  today: string;
  timezone: string;
  publicUrl: string | null;
  publicFormsEnabled: boolean;
  canCare: boolean;
};
const empty = {
  name: "",
  phone: "",
  source: "Recepção",
  note: "",
  consentContact: false,
  existingPersonId: "",
};
const stage: Record<string, string> = {
  new_visitor: "Acolhimento inicial",
  welcomed: "Acolhido",
  invited_to_group: "Convidado para célula",
  attending_class: "Em integração",
  ready_for_membership: "Pronto para membresia",
  completed: "Jornada concluída",
};
const actionLabel: Record<string, string> = {
  captured_new: "Cadastro e jornada criados",
  captured_existing: "Entrada vinculada a pessoa existente",
  integrated_new: "Integrado com novo cadastro",
  "integrate-existing": "Integrado a cadastro existente",
  "prepare-whatsapp": "Mensagem preparada, sem confirmação de envio",
  "contact-consent": "Preferência de contato atualizada",
  "contact-complete": "Contato registrado",
  "approve-greeting": "Autorização de saudação atualizada",
  greet: "Saudação registrada",
  "pastoral-care": "Encaminhado ao Cuidado Pastoral",
};
const origin: Record<string, string> = {
  public_form: "Formulário público",
  whatsapp: "WhatsApp",
  reception: "Recepção",
  campaign: "Campanha de convites",
};
const date = (v: string) => new Date(v).toLocaleString("pt-BR");
export function ReceptionView() {
  const { user, organizationId, signOut } = useAppAuth();
  const [data, setData] = useState<Overview>(),
    [selectedId, setSelectedId] = useState(""),
    [directory, setDirectory] = useState<
      Array<{ id: string; name: string; phone: string }>
    >([]),
    [directoryPartial, setDirectoryPartial] = useState(false);
  const [form, setForm] = useState({ ...empty }),
    [view, setView] = useState("all"),
    [offset, setOffset] = useState(0),
    [refresh, setRefresh] = useState(0),
    [day, setDay] = useState(""),
    [mode, setMode] = useState("desk");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pulpit, setPulpit] = useState<PublicRow[]>([]);
  const [pulpitPartial, setPulpitPartial] = useState(false);
  const [personId, setPersonId] = useState(""),
    [message, setMessage] = useState(""),
    [url, setUrl] = useState(""),
    [careMessage, setCareMessage] = useState(""),
    [channel, setChannel] = useState("presential"),
    [greeting, setGreeting] = useState({ approved: false, day: "", text: "" }),
    [history, setHistory] = useState<Array<{ action: string; at: string }>>([]);
  const scope = organizationId + ":" + user?.uid,
    scopeRef = useRef(scope);
  scopeRef.current = scope;
  const attempt = useRef(""),
    integrationAttempt = useRef(""),
    lock = useRef(false);
  const selected =
    data && data.organizationId === organizationId
      ? data.items.find((r) => r.id === selectedId)
      : undefined;
  async function api(body: Record<string, unknown>) {
    if (!user || !organizationId) throw new Error("Entre na sua conta.");
    const response = await fetch("/api/reception", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + (await user.getIdToken()),
      },
      body: JSON.stringify({ ...body, organizationId }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Não foi possível concluir.");
    return result;
  }
  useEffect(() => {
    setData(undefined);
    setSelectedId("");
    setForm({ ...empty });
    setDirectory([]);
    setHistory([]);
    setUrl("");
    setPulpit([]);
    setError("");
    setNotice("");
    setDay("");
    setMode("desk");
    setOffset(0);
    attempt.current = crypto.randomUUID();
  }, [scope]);
  useEffect(() => {
    if (!user || !organizationId) return;
    let active = true;
    const current = scope;
    setLoading(true);
    if (mode === "pulpit") setPulpit([]);
    setError("");
    api({
      action: mode === "pulpit" ? "pulpit" : "overview",
      view,
      offset,
      day: day || undefined,
    })
      .then((result) => {
        if (!active || scopeRef.current !== current) return;
        if (mode === "pulpit") {
          setPulpit(result.items);
          setPulpitPartial(result.partial);
        } else setData(result);
      })
      .catch((e) => {
        if (active && scopeRef.current === current) {
          setData(undefined);
          setPulpit([]);
          setError(e.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scope, view, offset, refresh, day, mode]);
  useEffect(() => {
    if (mode !== "pulpit") return;
    const timer = setInterval(() => setRefresh((v) => v + 1), 30000);
    return () => clearInterval(timer);
  }, [mode]);
  useEffect(() => {
    if (!selected) {
      setHistory([]);
      setUrl("");
      return;
    }
    setPersonId("");
    setMessage(
      `Olá, ${selected.name}! Foi uma alegria receber você. Como podemos ajudar no seu acolhimento?`,
    );
    setCareMessage("");
    setGreeting({
      approved: selected.greetingApproved,
      day: selected.greetingDate || data?.today || "",
      text: selected.greetingText,
    });
    setUrl("");
    setHistory([]);
    integrationAttempt.current = crypto.randomUUID();
  }, [selected?.id]);
  useEffect(() => {
    if (selected)
      setGreeting({
        approved: selected.greetingApproved,
        day: selected.greetingDate || data?.today || "",
        text: selected.greetingText,
      });
  }, [selected?.id, selected?.revision]);
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const current = scope;
    try {
      await work();
    } catch (e) {
      if (scopeRef.current === current)
        setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      lock.current = false;
      if (scopeRef.current === current) setBusy(false);
    }
  }
  async function loadDirectory() {
    await run(async () => {
      const current = scope;
      const result = await api({ action: "directory" });
      if (scopeRef.current !== current) return;
      setDirectory(result.people);
      setDirectoryPartial(result.partial);
      setNotice("Cadastros disponíveis para selecionar.");
    });
  }
  async function mutate(
    action: string,
    extra: Record<string, unknown> = {},
    row: Pick<Row, "id" | "revision"> | undefined = selected,
  ) {
    if (!row) return;
    await run(async () => {
      const current = scope;
      const result = await api({
        action,
        intakeId: row.id,
        revision: row.revision,
        ...extra,
      });
      if (scopeRef.current !== current) return;
      invalidateOrgDataCache(organizationId!);
      setNotice(
        action === "prepare-whatsapp"
          ? "Mensagem preparada. Abra o WhatsApp e confira antes de enviar."
          : "Alteração registrada.",
      );
      setRefresh((v) => v + 1);
      setUrl(result.url || "");
      setHistory([]);
    });
  }
  async function capture(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const current = scope,
        result = await api({
          action: "capture",
          ...form,
          requestId: attempt.current,
        });
      if (scopeRef.current !== current) return;
      invalidateOrgDataCache(organizationId!);
      setForm({ ...empty });
      attempt.current = crypto.randomUUID();
      setSelectedId(result.intakeId);
      setOffset(0);
      setView("all");
      setRefresh((v) => v + 1);
      setNotice(
        "Entrada integrada. O cadastro e a jornada estão disponíveis para acompanhamento.",
      );
    });
  }
  async function showHistory() {
    if (!selected) return;
    const id = selected.id,
      current = scope;
    await run(async () => {
      const result = await api({ action: "history", intakeId: id });
      if (scopeRef.current === current) {
        setHistory(result.items);
        setNotice(
          result.partial
            ? "Exibindo os últimos 50 eventos."
            : "Histórico atualizado.",
        );
      }
    });
  }
  async function openTotem() {
    if (!data?.publicUrl) return;
    const target = data.publicUrl;
    await run(async () => {
      await signOut();
      setData(undefined);
      setSelectedId("");
      setPulpit([]);
      window.location.replace(target);
    });
  }
  function selectPerson(id: string) {
    const person = directory.find((p) => p.id === id);
    setForm((f) => ({
      ...f,
      existingPersonId: id,
      name: person?.name || "",
      phone: person?.phone || "",
      consentContact: false,
    }));
    attempt.current = crypto.randomUUID();
  }
  const changeForm = (key: keyof typeof empty, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    attempt.current = crypto.randomUUID();
  };
  return (
    <main className={s.workspace}>
      <header className={s.header}>
        <div>
          <p className={s.eyebrow}>
            {mode === "pulpit" ? "SAUDAÇÃO PÚBLICA" : "RECEPÇÃO E ACOLHIMENTO"}
          </p>
          <h1>
            {mode === "pulpit"
              ? "Painel do pastor"
              : "Da chegada ao acompanhamento"}
          </h1>
          <p>
            {mode === "pulpit"
              ? "Somente nomes e textos autorizados para a data escolhida."
              : "Registre a chegada, confira o vínculo e acompanhe o próximo passo de cada pessoa."}
          </p>
        </div>
        <div className={s.actions}>
          <Link href="/app">Dashboard</Link>
          <button
            onClick={() => {
              setMode(mode === "desk" ? "pulpit" : "desk");
              setNotice("");
              setError("");
            }}
          >
            {mode === "desk" ? "Painel do pastor" : "Voltar à recepção"}
          </button>
          <button
            disabled={busy || loading}
            onClick={() => setRefresh((v) => v + 1)}
          >
            Atualizar
          </button>
        </div>
      </header>
      <div className={s.actions}>
        <label>
          Data da saudação{" "}
          <input
            type="date"
            value={day || data?.day || ""}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <span>Sem autorização explícita, o nome não aparece no painel.</span>
      </div>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      )}
      {loading && <p role="status">Atualizando recepção…</p>}
      {mode === "pulpit" ? (
        <section className={s.pulpit} aria-label="Nomes para saudação">
          {pulpitPartial && (
            <p>
              Esta lista é parcial: há mais de 1.000 entradas nesta data.
              Confira a fila com a equipe de recepção.
            </p>
          )}
          {!loading && !pulpit.length && (
            <p>Nenhuma saudação autorizada e pendente nesta data.</p>
          )}
          {pulpit.map((r) => (
            <article key={r.id}>
              <h2>{r.name}</h2>
              {r.text && <p>{r.text}</p>}
              <button
                disabled={busy || (!!day && day !== data?.today)}
                onClick={() => mutate("greet", {}, r)}
              >
                Marcar como saudado
              </button>
            </article>
          ))}
        </section>
      ) : (
        data &&
        data.organizationId === organizationId && (
          <>
            <section className={s.metrics} aria-label="Indicadores da recepção">
              {[
                ["Entradas registradas", data.summary.total],
                ["Aguardando integração", data.summary.pending],
                ["Saudações nesta data", data.summary.greetings ?? "—"],
                ["Jornadas ativas", data.summary.activeJourneys ?? "—"],
              ].map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </section>
            <p className={s.muted}>
              Entradas podem incluir retornos da mesma pessoa. Consulta:{" "}
              {date(data.asOf)} · {data.timezone}.{" "}
              {data.partial &&
                "A lista exibe até 1.000 entradas; os totais de entradas e pendências consultam a base completa."}
            </p>
            <nav className={s.actions} aria-label="Atalhos de acolhimento">
              <Link href="/members">Pessoas</Link>
              <Link href="/journeys">Jornadas e tarefas</Link>
              <Link href="/groups">Células</Link>
              <Link href="/campaigns">Convidados de campanhas</Link>
              {data.canCare && (
                <Link href="/pastoral-ai">Cuidado Pastoral</Link>
              )}
            </nav>
            <details className={s.card}>
              <summary>Autoatendimento e link de visitantes</summary>
              <p>
                Para deixar este dispositivo com visitantes, encerre a sessão da
                equipe e abra o formulário público. Cada envio limpa os campos e
                permite iniciar outro cadastro.
              </p>
              {data.publicUrl && data.publicFormsEnabled ? (
                <div className={s.actions}>
                  <a
                    href={data.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver formulário público
                  </a>
                  <button disabled={busy} onClick={openTotem}>
                    Sair da conta e abrir totem
                  </button>
                </div>
              ) : (
                <p>
                  O formulário público está indisponível. Confira o endereço e o
                  módulo da instituição.
                </p>
              )}
            </details>
            <div className={s.columns}>
              <section className={s.card}>
                <p className={s.eyebrow}>ENTRADA RÁPIDA</p>
                <h2>Registrar chegada</h2>
                <p>Confira se a pessoa já tem cadastro antes de criar outro.</p>
                <button disabled={busy} onClick={loadDirectory}>
                  Consultar cadastros existentes
                </button>
                {directoryPartial && (
                  <p>
                    Exibindo até 500 cadastros. Consulte Pessoas se não
                    encontrar o cadastro.
                  </p>
                )}
                <form onSubmit={capture}>
                  <fieldset disabled={busy}>
                    <label>
                      Cadastro
                      <select
                        value={form.existingPersonId}
                        onChange={(e) => selectPerson(e.target.value)}
                      >
                        <option value="">
                          Criar novo cadastro de visitante
                        </option>
                        {directory.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.phone ? " · " + p.phone : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Nome completo
                      <input
                        required
                        maxLength={120}
                        value={form.name}
                        onChange={(e) => changeForm("name", e.target.value)}
                      />
                    </label>
                    <label>
                      Telefone (opcional)
                      <input
                        type="tel"
                        maxLength={30}
                        value={form.phone}
                        onChange={(e) => changeForm("phone", e.target.value)}
                      />
                    </label>
                    <label>
                      Origem
                      <input
                        required
                        maxLength={120}
                        value={form.source}
                        onChange={(e) => changeForm("source", e.target.value)}
                      />
                    </label>
                    <label>
                      Observação interna (opcional)
                      <textarea
                        maxLength={1000}
                        value={form.note}
                        onChange={(e) => changeForm("note", e.target.value)}
                      />
                    </label>
                    <label className={s.check}>
                      <input
                        type="checkbox"
                        checked={form.consentContact}
                        onChange={(e) =>
                          changeForm("consentContact", e.target.checked)
                        }
                      />
                      A pessoa autorizou contato por WhatsApp.
                    </label>
                    <p className={s.muted}>
                      Sem autorização, o acolhimento pode continuar
                      pessoalmente. Nenhuma mensagem é enviada ao salvar.
                    </p>
                    <button className={s.primary} type="submit">
                      Registrar e integrar
                    </button>
                  </fieldset>
                </form>
              </section>
              <section className={s.card}>
                <p className={s.eyebrow}>FILA DA RECEPÇÃO</p>
                <h2>Entradas e retornos</h2>
                <div className={s.actions}>
                  <button
                    aria-pressed={view === "all"}
                    onClick={() => {
                      setView("all");
                      setOffset(0);
                      setSelectedId("");
                    }}
                  >
                    Todas
                  </button>
                  <button
                    aria-pressed={view === "pending"}
                    onClick={() => {
                      setView("pending");
                      setOffset(0);
                      setSelectedId("");
                    }}
                  >
                    Aguardando integração
                  </button>
                </div>
                {!data.items.length && <p>Nenhuma entrada neste filtro.</p>}
                <div className={s.list}>
                  {data.items.map((r) => (
                    <button
                      key={r.id}
                      aria-pressed={selectedId === r.id}
                      onClick={() => setSelectedId(r.id)}
                    >
                      <strong>{r.name}</strong>
                      <span>
                        {r.status === "archived"
                          ? "Arquivada"
                          : r.personId
                            ? "Integrada"
                            : "Aguardando integração"}{" "}
                        · {date(r.createdAt)}
                      </span>
                      <small>
                        {r.greetedAt
                          ? "Saudação registrada"
                          : r.greetingApproved
                            ? "Saudação autorizada"
                            : "Sem saudação autorizada"}
                      </small>
                    </button>
                  ))}
                </div>
                <div className={s.actions}>
                  <button
                    disabled={!offset || loading}
                    onClick={() => {
                      setOffset((v) => v - 100);
                      setSelectedId("");
                    }}
                  >
                    Anterior
                  </button>
                  <span>Página {offset / 100 + 1}</span>
                  <button
                    disabled={!data.hasMore || loading}
                    onClick={() => {
                      setOffset((v) => v + 100);
                      setSelectedId("");
                    }}
                  >
                    Próxima
                  </button>
                </div>
              </section>
            </div>
            {selected && (
              <section className={s.card} aria-label="Entrada selecionada">
                <p className={s.eyebrow}>ACOMPANHAMENTO</p>
                <h2>{selected.name}</h2>
                <p>
                  {selected.phone || "Sem telefone"} ·{" "}
                  {origin[selected.source] || selected.source} ·{" "}
                  {selected.stage
                    ? stage[selected.stage] || selected.stage
                    : "Aguardando integração"}
                </p>
                {selected.note && (
                  <p className={s.internal}>
                    Observação interna: {selected.note}
                  </p>
                )}
                {selected.status === "archived" ? (
                  <p>
                    Entrada arquivada. Consulte a jornada da pessoa para
                    continuar o acompanhamento.
                  </p>
                ) : (
                  <div className={s.columns}>
                    <section>
                      <h3>1. Integrar e acolher</h3>
                      {!selected.personId ? (
                        <>
                          <p>
                            Vincule a uma pessoa existente ou confirme a criação
                            de um novo cadastro.
                          </p>
                          <button disabled={busy} onClick={loadDirectory}>
                            Consultar cadastros
                          </button>
                          <label>
                            Pessoa existente
                            <select
                              value={personId}
                              onChange={(e) => setPersonId(e.target.value)}
                            >
                              <option value="">Selecione…</option>
                              {directory.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className={s.actions}>
                            <button
                              disabled={busy || !personId}
                              onClick={() =>
                                mutate("integrate-existing", { personId })
                              }
                            >
                              Vincular cadastro
                            </button>
                            <button
                              disabled={busy}
                              onClick={() =>
                                mutate("integrate-new", {
                                  requestId: integrationAttempt.current,
                                })
                              }
                            >
                              Integrar como novo visitante
                            </button>
                          </div>
                        </>
                      ) : (
                        <p>
                          Cadastro vinculado. As tarefas e etapas continuam em{" "}
                          <Link href="/journeys">Jornadas</Link>.
                        </p>
                      )}
                      <label className={s.check}>
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={selected.consentContact}
                          onChange={(e) =>
                            mutate("contact-consent", {
                              allowed: e.target.checked,
                            })
                          }
                        />
                        Contato por WhatsApp autorizado nesta entrada
                      </label>
                      <p className={s.muted}>
                        A preferência do cadastro da pessoa também será
                        conferida antes de preparar a mensagem.
                      </p>
                      <label>
                        Mensagem de boas-vindas
                        <textarea
                          maxLength={2000}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                      </label>
                      <button
                        disabled={
                          busy || !selected.consentContact || !selected.phone
                        }
                        onClick={() => mutate("prepare-whatsapp", { message })}
                      >
                        Preparar WhatsApp
                      </button>
                      {url && (
                        <p>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir mensagem no WhatsApp
                          </a>{" "}
                          · Confira o destinatário e envie pelo seu WhatsApp.
                        </p>
                      )}
                      <p>
                        Contato:{" "}
                        {selected.contactState === "recorded"
                          ? "registrado pela equipe"
                          : selected.contactState === "prepared"
                            ? "mensagem preparada; envio não confirmado"
                            : "ainda não registrado"}
                        .
                      </p>
                      <label>
                        Como o contato aconteceu
                        <select
                          value={channel}
                          onChange={(e) => setChannel(e.target.value)}
                        >
                          <option value="presential">Presencial</option>
                          <option value="phone">Telefone</option>
                          <option value="whatsapp">WhatsApp</option>
                        </select>
                      </label>
                      <button
                        disabled={busy}
                        onClick={() => mutate("contact-complete", { channel })}
                      >
                        Confirmar contato realizado
                      </button>
                      <p className={s.muted}>
                        Este registro não conclui automaticamente as tarefas de
                        Jornadas.
                      </p>
                    </section>
                    <section>
                      <h3>2. Preparar saudação</h3>
                      <p>
                        Confirme com a pessoa a autorização para apresentar seu
                        nome e este texto em público.
                      </p>
                      <label className={s.check}>
                        <input
                          type="checkbox"
                          checked={greeting.approved}
                          onChange={(e) =>
                            setGreeting((g) => ({
                              ...g,
                              approved: e.target.checked,
                            }))
                          }
                        />
                        Pessoa autorizou saudação pública
                      </label>
                      <label>
                        Data
                        <input
                          type="date"
                          value={greeting.day}
                          onChange={(e) =>
                            setGreeting((g) => ({ ...g, day: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Texto público (opcional)
                        <textarea
                          maxLength={300}
                          value={greeting.text}
                          onChange={(e) =>
                            setGreeting((g) => ({ ...g, text: e.target.value }))
                          }
                        />
                      </label>
                      <div className={s.preview}>
                        <strong>{selected.name}</strong>
                        <p>
                          {greeting.text || "Apenas o nome será apresentado."}
                        </p>
                      </div>
                      <button
                        disabled={busy || !greeting.day}
                        onClick={() => mutate("approve-greeting", greeting)}
                      >
                        Salvar autorização de saudação
                      </button>
                      {selected.greetedAt && (
                        <p>
                          Saudação registrada em {date(selected.greetedAt)}. Uma
                          nova autorização permite outra saudação.
                        </p>
                      )}
                      {data.canCare && (
                        <>
                          <h3>3. Encaminhar ao cuidado</h3>
                          {selected.careRequestId ? (
                            <p>
                              Pedido registrado. Acompanhe em{" "}
                              <Link href="/pastoral-ai">Cuidado Pastoral</Link>.
                            </p>
                          ) : (
                            <>
                              <label>
                                Pedido autorizado para a equipe pastoral
                                <textarea
                                  maxLength={2000}
                                  value={careMessage}
                                  onChange={(e) =>
                                    setCareMessage(e.target.value)
                                  }
                                />
                              </label>
                              <button
                                disabled={busy || !careMessage.trim()}
                                onClick={() =>
                                  mutate("pastoral-care", {
                                    message: careMessage,
                                  })
                                }
                              >
                                Encaminhar ao Cuidado Pastoral
                              </button>
                              <p className={s.muted}>
                                O pedido é privado e aguarda triagem pastoral. A
                                observação interna não é copiada.
                              </p>
                            </>
                          )}
                        </>
                      )}
                    </section>
                  </div>
                )}
                <details>
                  <summary>Histórico da entrada</summary>
                  <button disabled={busy} onClick={showHistory}>
                    Consultar histórico
                  </button>
                  <ul>
                    {history.map((e, i) => (
                      <li key={i}>
                        {date(e.at)} · {actionLabel[e.action] || e.action}
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            )}
          </>
        )
      )}
    </main>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CARE_TASKS,
  INTEGRATION_LABELS,
  INTEGRATION_STAGES,
  isCarePending,
  type IntegrationPerson,
  type IntegrationSnapshot,
  type IntegrationSummary,
} from "@alvo/domain";
import { whatsappHref } from "@alvo/utils";
import { useAppAuth } from "../../../app/providers";
import { useJourneyApi, useJourneyResource } from "./journey-api";
import styles from "./journeys.module.css";

export function IntegrationCharts({
  summary,
}: {
  summary: IntegrationSummary;
}) {
  const [tab, setTab] = useState<"current" | "history">("current");
  return (
    <section className={styles.panel} aria-label="Indicadores da integração">
      <div className={styles.heading}>
        <h2>Integração das pessoas</h2>
        <div className={styles.actions}>
          <button
            type="button"
            aria-pressed={tab === "current"}
            onClick={() => setTab("current")}
          >
            Situação atual
          </button>
          <button
            type="button"
            aria-pressed={tab === "history"}
            onClick={() => setTab("history")}
          >
            Evolução
          </button>
        </div>
      </div>
      {summary.partial && (
        <p role="status">
          Dados parciais: os limites de consulta foram atingidos. Estes números
          não representam toda a instituição.
        </p>
      )}
      {tab === "current" ? (
        <>
          <div className={styles.stats}>
            {[
              [summary.total, "Pessoas"],
              [summary.needsContact, "Sem contato concluído"],
              [summary.withoutCell, "Sem célula ativa"],
              [summary.ready, "Decisões de membresia"],
              [summary.pending, "Tarefas pendentes"],
            ].map(([n, label]) => (
              <div key={label}>
                <strong>{n}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className={styles.bars}>
            {summary.stages.map((s) => (
              <div key={s.key}>
                <span>{s.label}</span>
                <meter
                  min={0}
                  max={Math.max(1, summary.total)}
                  value={s.value}
                  aria-label={`${s.label}: ${s.value}`}
                />
                <strong>{s.value}</strong>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p>
            Transições registradas nas últimas oito semanas (UTC). O histórico
            começa com as alterações feitas após esta atualização; registros
            antigos não são inventados.
          </p>
          <div className={styles.bars}>
            {summary.weeks.map((w) => (
              <div key={w.date}>
                <span>Semana de {w.date.split("-").reverse().join("/")}</span>
                <meter
                  min={0}
                  max={Math.max(1, ...summary.weeks.map((x) => x.transitions))}
                  value={w.transitions}
                  aria-label={`${w.transitions} avanços, ${w.completed} conclusões`}
                />
                <strong>
                  {w.transitions} avanços · {w.completed} conclusões
                </strong>
              </div>
            ))}
          </div>
          {!summary.historySince && (
            <p>Ainda não há transições registradas neste período.</p>
          )}
        </>
      )}
    </section>
  );
}
export function JourneyDashboard({
  profile,
  revision,
}: {
  profile: string;
  revision: number;
}) {
  const { data, error } = useJourneyResource<IntegrationSummary>(
    { action: "summary", profile },
    revision,
  );
  return (
    <div className={styles.page}>
      {error ? (
        <p role="alert">Integração: {error}</p>
      ) : data ? (
        <>
          <IntegrationCharts summary={data} />
          <Link href="/journeys">Abrir acompanhamentos de integração →</Link>
        </>
      ) : (
        <p>Carregando integração…</p>
      )}
    </div>
  );
}
export function JourneysView() {
  const { organizationId, user, roles } = useAppAuth();
  return (
    <JourneyCenter key={`${organizationId}:${user?.uid}:${roles.join(",")}`} />
  );
}
function JourneyCenter() {
  const { user, tenantRuntime } = useAppAuth(),
    { call } = useJourneyApi();
  const [revision, setRevision] = useState(0),
    [page, setPage] = useState(0),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const lock = useRef(false);
  const { data, error: loadError } = useJourneyResource<IntegrationSnapshot>(
    { action: "overview", page, query: search, filter },
    revision,
  );
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(query);
      setPage(0);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);
  useEffect(() => {
    const refresh = () => {
      if (!lock.current) setRevision((n) => n + 1);
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  const person = data?.people.find((p) => p.id === selected);
  async function mutate(body: Record<string, unknown>) {
    if (lock.current || !person) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await call({
        requestId: crypto.randomUUID(),
        personId: person.id,
        expectedRevision: person.revision,
        ...body,
      });
      setMessage(
        "Salvo. O acompanhamento foi atualizado. Avisos no app dependem de conta vinculada e aparelho registrado.",
      );
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const orgName =
    tenantRuntime?.organization?.displayName ||
    tenantRuntime?.organization?.name ||
    "nossa igreja";
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span>ACOLHIMENTO · CUIDADO · INTEGRAÇÃO</span>
          <h1>Jornadas de integração</h1>
          <p>
            Acompanhe o contato realizado, a participação em células e as
            decisões de membresia.
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => {
            setRevision((n) => n + 1);
            setError("");
          }}
        >
          Atualizar
        </button>
      </header>
      <div aria-live="polite">
        {message && <p className={styles.success}>{message}</p>}
        {(error || loadError) && (
          <p role="alert" className={styles.error}>
            {error || loadError}
          </p>
        )}
      </div>
      {data && <IntegrationCharts summary={data.summary} />}
      <section className={styles.panel}>
        <div className={styles.controls}>
          <label>
            Buscar pessoa
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, e-mail ou telefone"
            />
          </label>
          <label>
            Mostrar
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
            >
              {[
                ["all", "Todas as pessoas"],
                ["contact", "Sem contato concluído"],
                ["cell", "Sem célula ativa"],
                ["ready", "Decisão de membresia"],
                ["tasks", "Com tarefas pendentes"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!data && !loadError && <p>Carregando pessoas e acompanhamentos…</p>}
        {data && (
          <>
            <p>
              {data.canManage
                ? "Visão da equipe pastoral e administrativa."
                : "Somente pessoas das suas células e tarefas atribuídas a você."}{" "}
              {data.totalFiltered} pessoa(s) encontradas
              {data.partial ? " na consulta parcial" : ""}.
            </p>
            <div className={styles.list}>
              {data.people.map((p) => (
                <button
                  key={p.id}
                  className={styles.person}
                  aria-pressed={p.id === selected}
                  disabled={busy}
                  onClick={() => {
                    setSelected(p.id);
                    setError("");
                    setMessage("");
                  }}
                >
                  <strong>{p.name}</strong>
                  <span>
                    {p.stage
                      ? INTEGRATION_LABELS[p.stage]
                      : "Sem jornada iniciada"}{" "}
                    ·{" "}
                    {p.cells.map((g) => g.name).join(", ") ||
                      "Sem célula ativa"}
                  </span>
                  <span>
                    {p.openTasks} tarefa(s) pendente(s)
                    {p.needsContact ? " · Contato não concluído" : ""}
                    {p.overdue ? " · Atenção: prazo vencido" : ""}
                  </span>
                </button>
              ))}
            </div>
            {!data.people.length && <p>Nenhuma pessoa neste filtro.</p>}
            <div className={styles.actions}>
              <button
                disabled={page === 0 || busy}
                onClick={() => setPage((n) => n - 1)}
              >
                Anterior
              </button>
              <span>Página {page + 1}</span>
              <button
                disabled={!data.hasMore || busy}
                onClick={() => setPage((n) => n + 1)}
              >
                Próxima
              </button>
            </div>
          </>
        )}
      </section>
      {person && data && (
        <PersonEditor
          key={person.id}
          person={person}
          snapshot={data}
          uid={user!.uid}
          orgName={orgName}
          busy={busy}
          mutate={mutate}
          error={error}
        />
      )}
      <p>
        WhatsApp: envio manual. Abrir a conversa não conclui um contato.
        Registre a tarefa como concluída somente após realizar o acompanhamento.
      </p>
    </main>
  );
}
function PersonEditor({
  person: p,
  snapshot,
  uid,
  orgName,
  busy,
  mutate,
  error,
}: {
  person: IntegrationPerson;
  snapshot: IntegrationSnapshot;
  uid: string;
  orgName: string;
  busy: boolean;
  mutate: (body: Record<string, unknown>) => Promise<void>;
  error: string;
}) {
  const [groupId, setGroupId] = useState(""),
    [assignee, setAssignee] = useState(uid),
    [type, setType] = useState<keyof typeof CARE_TASKS>("first_contact"),
    [due, setDue] = useState(""),
    [status, setStatus] = useState(p.memberStatus);
  const [draft, setDraft] = useState(
    `Olá, ${p.name.split(" ")[0]}! Aqui é da ${orgName}. Gostaríamos de saber como você está e combinar seu próximo encontro conosco. Podemos conversar?`,
  );
  const href = whatsappHref({ mobilePhone: p.phone }, draft),
    webHref = href
      ?.replace("https://wa.me/", "https://web.whatsapp.com/send?phone=")
      .replace("?text=", "&text=");
  const next =
    INTEGRATION_STAGES[
      (p.stage ? INTEGRATION_STAGES.indexOf(p.stage) : -1) + 1
    ];
  return (
    <section
      className={styles.panel}
      aria-label={`Acompanhamento de ${p.name}`}
    >
      <h2>{p.name}</h2>
      <p>
        {p.stage ? INTEGRATION_LABELS[p.stage] : "Sem jornada iniciada"} ·{" "}
        {p.cells.map((g) => g.name).join(", ") || "Sem célula ativa"}
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <fieldset disabled={busy} className={styles.fieldset}>
        {snapshot.canManage && (
          <>
            <div className={styles.actions}>
              {next && (
                <button
                  onClick={() => void mutate({ action: "stage", stage: next })}
                >
                  {p.stage
                    ? `Confirmar etapa: ${INTEGRATION_LABELS[next]}`
                    : "Iniciar integração"}
                </button>
              )}
              <Link href={`/members/${p.id}`}>Ver cadastro</Link>
            </div>
            <p>
              Confirme uma etapa apenas depois de realizá-la. Criar convite não
              comprova participação na classe.
            </p>
            <div className={styles.controls}>
              <label>
                Situação de membresia
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {[
                    ["visitor", "Visitante"],
                    ["congregant", "Congregado / aspirante"],
                    ["new_believer", "Novo convertido"],
                    ["member", "Membro"],
                    ["volunteer", "Voluntário"],
                    ["leader", "Líder"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={status === p.memberStatus}
                onClick={() =>
                  void mutate({ action: "member-status", memberStatus: status })
                }
              >
                Confirmar situação
              </button>
            </div>
            <p>
              Efetivar como membro, voluntário ou líder também conclui a
              integração em aberto.
            </p>
            <div className={styles.controls}>
              <label>
                Célula ativa
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                >
                  <option value="">Escolha uma célula</option>
                  {snapshot.cells.map((g) => (
                    <option
                      key={g.id}
                      value={g.id}
                      disabled={p.cells.some((c) => c.id === g.id)}
                    >
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={!groupId || p.cells.some((c) => c.id === groupId)}
                onClick={() => void mutate({ action: "assign-cell", groupId })}
              >
                Vincular à célula
              </button>
            </div>
            <h3>Novo acompanhamento</h3>
            <div className={styles.controls}>
              <label>
                Tipo
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as keyof typeof CARE_TASKS)
                  }
                >
                  {Object.entries(CARE_TASKS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Responsável
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="">Escolha um responsável</option>
                  {snapshot.assignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Prazo (horário deste aparelho)
                <input
                  type="datetime-local"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </label>
            </div>
            <p>
              Para atribuir a um líder de célula, vincule primeiro a pessoa a
              uma célula que ele lidera.
            </p>
            <button
              disabled={!due || !assignee}
              onClick={() =>
                void mutate({
                  action: "create-task",
                  type,
                  assignedToUserId: assignee,
                  dueAt: new Date(due).toISOString(),
                })
              }
            >
              Criar acompanhamento
            </button>
            <h3>Preparar mensagem pessoal</h3>
            <label>
              Mensagem
              <textarea
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </label>
            <div className={styles.actions}>
              {href && draft.trim() ? (
                <>
                  <a href={webHref} target="_blank" rel="noopener noreferrer">
                    Abrir WhatsApp Web
                  </a>
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    Abrir no celular
                  </a>
                </>
              ) : (
                <p>
                  Contato indisponível para WhatsApp. Confira o telefone e a
                  preferência de comunicação no cadastro.
                </p>
              )}
            </div>
          </>
        )}
        <h3>Acompanhamentos</h3>
        {!p.tasks.length && <p>Nenhum acompanhamento disponível.</p>}
        {p.tasks.map((t) => (
          <article key={t.id} className={styles.task}>
            <strong>{t.title}</strong>
            <p>
              {(
                {
                  open: "Aberto",
                  in_progress: "Em andamento",
                  completed: "Concluído",
                  cancelled: "Cancelado",
                } as Record<string, string>
              )[t.status] || t.status}{" "}
              ·{" "}
              {snapshot.assignees.find((a) => a.id === t.assignedToUserId)
                ?.name || (t.assignedToUserId === uid ? "Você" : "Equipe")}{" "}
              {t.dueAt && Number.isFinite(Date.parse(t.dueAt))
                ? ` · Prazo: ${new Date(t.dueAt).toLocaleString("pt-BR", { timeZone: snapshot.timezone })}`
                : ""}
            </p>
            {isCarePending(t) && (
              <div className={styles.actions}>
                {t.status === "open" && (
                  <button
                    onClick={() =>
                      void mutate({
                        action: "task-status",
                        taskId: t.id,
                        expectedTaskRevision: t.revision || 0,
                        status: "in_progress",
                      })
                    }
                  >
                    Iniciar
                  </button>
                )}
                <button
                  onClick={() =>
                    void mutate({
                      action: "task-status",
                      taskId: t.id,
                      expectedTaskRevision: t.revision || 0,
                      status: "completed",
                    })
                  }
                >
                  Registrar conclusão
                </button>
                {snapshot.canManage && (
                  <button
                    onClick={() =>
                      void mutate({
                        action: "task-status",
                        taskId: t.id,
                        expectedTaskRevision: t.revision || 0,
                        status: "cancelled",
                      })
                    }
                  >
                    Cancelar tarefa
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </fieldset>
      {busy && <p role="status">Salvando alteração…</p>}
    </section>
  );
}

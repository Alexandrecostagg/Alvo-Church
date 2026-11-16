"use client";
import { ContactActions } from "../dashboard/leader-insights";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { isCellGroup, homeProfiles } from "@alvo/domain";
import { useAppAuth } from "../../../app/providers";
import { useGroupApi, useGroupResource } from "./group-api";
import s from "./groups.module.css";
type Data = Record<string, any>;
const labels: Record<string, string> = {
  cell: "Célula",
  small_group: "Pequeno grupo",
  class: "Classe / Escola",
  youth_group: "Grupo de jovens",
  scheduled: "Agendado / chamada aberta",
  completed: "Encerrado",
  cancelled: "Cancelado",
  present: "Presente",
  absent: "Ausente",
  justified: "Justificou",
  first_time_guest: "Primeira visita",
  leader: "Líder",
  co_leader: "Co-líder",
  supervisor: "Supervisor",
  member: "Membro",
  visitor: "Visitante",
};
const date = (v: string, tz: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: tz,
  }).format(new Date(v));
export function GroupsView() {
  const { organizationId, user } = useAppAuth();
  return <Center key={`${organizationId}:${user?.uid}`} />;
}
function Center() {
  const { call } = useGroupApi(),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(""),
    [form, setForm] = useState<Data | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("cell"),
    [query, setQuery] = useState("");
  const lock = useRef(false),
    attempt = useRef<{ signature: string; id: string } | null>(null);
  const { data, error: loadError } = useGroupResource<Data>(
    { action: "overview" },
    revision,
  );
  useEffect(() => {
    const f = () => {
      if (!lock.current) setRevision((n) => n + 1);
    };
    window.addEventListener("focus", f);
    return () => window.removeEventListener("focus", f);
  }, []);
  async function mutate(body: Data) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const signature = JSON.stringify(body);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: crypto.randomUUID() };
    try {
      const r = await call<Data>({ ...body, requestId: attempt.current.id });
      attempt.current = null;
      setMessage(
        "Alteração salva. Os painéis e o app consultarão os dados atualizados. Avisos dependem de conta e aparelho vinculados.",
      );
      setRevision((n) => n + 1);
      return r;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const groups = (data?.groups || []).filter(
    (g: Data) =>
      (filter === "all" ||
        (filter === "cell" && isCellGroup(g)) ||
        (filter === "other" && !isCellGroup(g))) &&
      g.name.toLowerCase().includes(query.toLowerCase()),
  );
  const id = groups.some((g: Data) => g.id === selected)
    ? selected
    : groups[0]?.id;
  return (
    <main className={s.page}>
      <header className={s.heading}>
        <div>
          <small>ENCONTROS · COMUNHÃO · CUIDADO</small>
          <h1>Células e grupos</h1>
          <p>Organize os vínculos, escolha o encontro e acompanhe a chamada.</p>
        </div>
        <div className={s.actions}>
          <button disabled={busy} onClick={() => setRevision((n) => n + 1)}>
            Atualizar
          </button>
          {data?.canManage && (
            <button
              className={s.primary}
              disabled={busy}
              onClick={() => setForm({})}
            >
              + Nova célula / grupo
            </button>
          )}
        </div>
      </header>
      <div className={s.feedback} aria-live="polite">
        {message && <p className={s.success}>{message}</p>}
        {(error || loadError) && (
          <p role="alert" className={s.error}>
            {error || loadError}
          </p>
        )}
      </div>
      {data?.partial && (
        <p role="status" className={s.error}>
          Consulta parcial: limite de 200 grupos ou 2.000 pessoas atingido. Os
          indicadores abaixo não representam toda a instituição.
        </p>
      )}
      {data && (
        <section className={s.stats} aria-label="Indicadores de células">
          {[
            [data.stats.cells, "Células e pequenos grupos ativos"],
            [data.stats.people, "Pessoas únicas nas células"],
            [data.stats.links, "Vínculos nas células"],
            [
              data.stats.available,
              `Vagas com capacidade definida${data.stats.unlimited ? ` · ${data.stats.unlimited} sem limite informado` : ""}`,
            ],
            ...(data.canManage
              ? [[data.withoutCell.length, "Pessoas sem célula ativa"]]
              : []),
          ].map(([n, l]) => (
            <div key={l}>
              <strong>{n}</strong>
              <span>{l}</span>
            </div>
          ))}
        </section>
      )}
      {form && data && (
        <GroupForm
          key={form.id || "new"}
          group={form}
          people={data.people}
          busy={busy}
          cancel={() => setForm(null)}
          save={async (values) => {
            const r = await mutate({
              action: "save-group",
              groupId: form.id,
              expectedRevision: form.revision || 0,
              ...values,
            });
            if (r) {
              setForm(null);
              setSelected(r.id);
              setFilter("all");
            }
          }}
        />
      )}
      <section className={s.panel}>
        <div className={s.controls}>
          <label>
            Buscar grupo
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome da célula ou grupo"
            />
          </label>
          <label>
            Tipo
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="cell">Células e pequenos grupos</option>
              <option value="other">Classes e outros grupos</option>
              <option value="all">Todos os grupos</option>
            </select>
          </label>
          <label>
            Grupo selecionado
            <select
              value={id || ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              {!groups.length && <option>Nenhum grupo encontrado</option>}
              {groups.map((g: Data) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {labels[g.type] || g.type}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p>
          Classes e grupos de jovens ficam separados dos indicadores de
          integração em células.
        </p>
      </section>
      {!data && !loadError && <p role="status">Carregando grupos…</p>}
      {id && data && (
        <Workspace
          key={id}
          id={id}
          revision={revision}
          busy={busy}
          mutate={mutate}
          people={data.people}
          canManage={data.canManage}
          edit={() => setForm(data.groups.find((g: Data) => g.id === id))}
        />
      )}
    </main>
  );
}
function GroupForm({
  group,
  people,
  busy,
  cancel,
  save,
}: {
  group: Data;
  people: Data[];
  busy: boolean;
  cancel: () => void;
  save: (v: Data) => Promise<void>;
}) {
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    await save(d);
  }
  return (
    <section className={s.panel}>
      <h2>
        {group.id ? "Editar grupo e liderança" : "Cadastrar célula ou grupo"}
      </h2>
      <p>
        A troca abaixo substitui o líder principal. Co-líderes e supervisores já
        cadastrados são preservados. O responsável precisa de conta vinculada e
        acesso de liderança.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className={s.form}>
          <label>
            Nome
            <input
              name="name"
              required
              maxLength={160}
              defaultValue={group.name}
            />
          </label>
          <label>
            Tipo
            <select name="type" defaultValue={group.type || "cell"}>
              {["cell", "small_group", "class", "youth_group"].map((t) => (
                <option key={t} value={t}>
                  {labels[t]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Líder principal
            <select
              name="leaderPersonId"
              defaultValue={group.leaderPersonId || ""}
            >
              <option value="">Sem líder principal</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Capacidade máxima (em branco: não definida)
            <input
              name="capacity"
              type="number"
              min={1}
              max={500}
              defaultValue={group.capacity ?? ""}
            />
          </label>
          <label>
            Dia da semana
            <select
              name="meetingDayOfWeek"
              defaultValue={group.meetingDayOfWeek ?? 3}
            >
              {[
                "Domingo",
                "Segunda",
                "Terça",
                "Quarta",
                "Quinta",
                "Sexta",
                "Sábado",
              ].map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            Horário habitual
            <input
              name="meetingTime"
              type="time"
              defaultValue={group.meetingTime || "19:30"}
            />
          </label>
          <label>
            Local do encontro
            <input
              name="location"
              maxLength={160}
              defaultValue={group.location}
              placeholder="Ex.: Salão da comunidade"
            />
          </label>
          <label>
            Endereço para os participantes
            <input
              name="address"
              maxLength={350}
              defaultValue={group.address}
              placeholder="Rua, número, bairro e referência"
            />
          </label>
          <label>
            Cidade
            <input name="city" maxLength={100} defaultValue={group.city} />
          </label>
          <label>
            Estado
            <input name="state" maxLength={30} defaultValue={group.state} />
          </label>
          <div className={s.actions}>
            <button className={s.primary}>
              {busy ? "Salvando…" : "Salvar grupo"}
            </button>
            <button type="button" onClick={cancel}>
              Cancelar
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
function Workspace({
  id,
  revision,
  busy,
  mutate,
  people,
  canManage,
  edit,
}: {
  id: string;
  revision: number;
  busy: boolean;
  mutate: (v: Data) => Promise<any>;
  people: Data[];
  canManage: boolean;
  edit: () => void;
}) {
  const { roles } = useAppAuth();
  const [reportRevision, setReportRevision] = useState<number>();
  const [meetingId, setMeeting] = useState(""),
    [page, setPage] = useState(0),
    [create, setCreate] = useState(false),
    [search, setSearch] = useState(""),
    [candidate, setCandidate] = useState(""),
    [personPage, setPersonPage] = useState(0),
    [confirmArchive, setConfirmArchive] = useState(false),
    [remove, setRemove] = useState(""),
    [report, setReport] = useState<string | null>(null),
    [follow, setFollow] = useState("");
  const { data, error } = useGroupResource<Data>(
    { action: "detail", groupId: id, meetingId: meetingId || undefined, page },
    revision,
  );
  useEffect(() => {
    if (!meetingId && data?.meeting?.id) setMeeting(data.meeting.id);
  }, [meetingId, data?.meeting?.id]);
  if (!data)
    return (
      <p role={error ? "alert" : "status"}>
        {error || "Carregando participantes e encontros…"}
      </p>
    );
  const d = data,
    g = d.group,
    m = d.meeting,
    summary = d.summary;
  const available = people.filter(
    (p) =>
      !d.people.some((m: Data) => m.personId === p.id) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const address = [g.address, g.city, g.state].filter(Boolean).join(", ");
  return (
    <section className={s.panel}>
      <div className={s.heading}>
        <div>
          <small>{labels[g.type] || g.type}</small>
          <h2>{g.name}</h2>
          <p>
            {g.location || "Local a definir"} ·{" "}
            {g.meetingTime || "Horário a definir"} · {d.people.length}{" "}
            participantes ativos
          </p>
          {address && (
            <a
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            >
              Ver endereço no mapa
            </a>
          )}
        </div>
        <div className={s.actions}>
          {canManage && (
            <>
              <button disabled={busy} onClick={edit}>
                Editar grupo
              </button>
              <button disabled={busy} onClick={() => setConfirmArchive(true)}>
                Arquivar
              </button>
            </>
          )}
          <Link href={`/groups/${id}/banner`}>Preparar banner</Link>
        </div>
      </div>
      {confirmArchive && (
        <div role="alert" className={s.notice}>
          <p>
            Arquivar oculta o grupo das novas operações e do app, preservando
            encontros e relatórios.
          </p>
          <button
            disabled={busy}
            onClick={() =>
              mutate({
                action: "archive-group",
                groupId: id,
                expectedRevision: g.revision,
              })
            }
          >
            Confirmar arquivamento
          </button>
          <button onClick={() => setConfirmArchive(false)}>Cancelar</button>
        </div>
      )}
      {d.partial && (
        <p className={s.error}>
          Histórico parcial: limite de consulta atingido. Não interprete estes
          totais como todo o histórico.
        </p>
      )}
      <div className={s.heading}>
        <h3>Encontros e chamada</h3>
        <button
          className={s.primary}
          disabled={busy}
          onClick={() => setCreate(!create)}
        >
          {create ? "Fechar formulário" : "+ Novo encontro"}
        </button>
      </div>
      {create && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const v = Object.fromEntries(new FormData(e.currentTarget));
            const r = await mutate({
              action: "create-meeting",
              groupId: id,
              ...v,
            });
            if (r) {
              setMeeting(r.id);
              setPage(0);
              setCreate(false);
            }
          }}
        >
          <fieldset className={s.form} disabled={busy}>
            <p>
              Data e horário no fuso {d.timezone}. Repetir o mesmo horário
              reutiliza o encontro.
            </p>
            <label>
              Data
              <input name="date" type="date" required />
            </label>
            <label>
              Horário
              <input
                name="time"
                type="time"
                required
                defaultValue={g.meetingTime || "19:30"}
              />
            </label>
            <button className={s.primary}>
              {busy ? "Salvando…" : "Criar encontro"}
            </button>
          </fieldset>
        </form>
      )}
      {d.openOld > 0 && (
        <p className={s.notice}>
          {d.openOld} encontro(s) antigo(s) ainda com chamada aberta. Selecione
          a data e encerre quando a revisão estiver concluída.
        </p>
      )}
      <label>
        Selecionar encontro
        <select
          value={m?.id || ""}
          onChange={(e) => {
            setMeeting(e.target.value);
            setReport(null);
            setReportRevision(undefined);
          }}
        >
          {!d.meetings.length && (
            <option value="">Nenhum encontro nesta página</option>
          )}
          {m && !d.meetings.some((x: Data) => x.id === m.id) && (
            <option value={m.id}>
              {date(m.startsAt, d.timezone)} · selecionado
            </option>
          )}
          {d.meetings.map((x: Data) => (
            <option key={x.id} value={x.id}>
              {date(x.startsAt, d.timezone)} · {labels[x.status]}
            </option>
          ))}
        </select>
      </label>
      <div className={s.actions}>
        <button disabled={!page || busy} onClick={() => setPage((n) => n - 1)}>
          Encontros mais recentes
        </button>
        <span>Página {page + 1}</span>
        <button
          disabled={!d.hasMore || busy}
          onClick={() => setPage((n) => n + 1)}
        >
          Encontros anteriores
        </button>
      </div>
      {m && (
        <>
          <h3>
            {date(m.startsAt, d.timezone)} · {labels[m.status]}
          </h3>
          <div className={s.stats}>
            {[
              [summary.present, "Presentes (inclui visitas)"],
              [summary.absent, "Ausentes registrados"],
              [summary.justified, "Justificados"],
              [summary.pending, "Sem registro"],
              [
                summary.expected,
                m.legacyRoster
                  ? "Participantes atuais · encontro antigo"
                  : "Participantes previstos no encontro",
              ],
            ].map(([n, l]) => (
              <div key={l}>
                <strong>{n}</strong>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <p>
            Falta de registro não significa ausência.{" "}
            {d.historicalRecords > 0
              ? `${d.historicalRecords} registro(s) de pessoas que já saíram do grupo permanecem no histórico.`
              : ""}{" "}
            {m.legacyRoster
              ? "Este encontro antigo não registrou a composição da época; o total previsto usa os vínculos atuais."
              : ""}
          </p>
          {m.status === "scheduled" && (
            <button
              disabled={busy || Date.parse(m.startsAt) > Date.now()}
              onClick={() =>
                mutate({
                  action: "close-meeting",
                  groupId: id,
                  meetingId: m.id,
                  expectedRevision: m.revision,
                })
              }
            >
              Encerrar encontro · preservar pendências
            </button>
          )}
        </>
      )}
      <h3>Participantes ativos</h3>
      <p>
        A chamada mostra o estado confirmado pelo servidor. Alterações
        simultâneas exigem atualização.
      </p>
      <div className={s.roster}>
        {d.people.map((p: Data) => (
          <article key={p.personId}>
            <div>
              <strong>{p.name}</strong>
              <p>
                {labels[p.role] || p.role} ·{" "}
                {labels[p.status] || "Sem registro"}
              </p>
            </div>
            <div className={s.actions}>
              {m &&
                m.status !== "cancelled" &&
                ["present", "first_time_guest", "justified", "absent"].map(
                  (st) => (
                    <button
                      disabled={busy || p.status === st}
                      aria-pressed={p.status === st}
                      key={st}
                      onClick={() =>
                        mutate({
                          action: "attendance",
                          groupId: id,
                          meetingId: m.id,
                          personId: p.personId,
                          expectedStatus: p.status,
                          status: st,
                        })
                      }
                    >
                      {labels[st]}
                    </button>
                  ),
                )}
              <button disabled={busy} onClick={() => setFollow(p.personId)}>
                Criar acompanhamento
              </button>
              {canManage && (
                <button disabled={busy} onClick={() => setRemove(p.personId)}>
                  Remover vínculo
                </button>
              )}
            </div>
            <ContactActions
              profile={homeProfiles(roles)[0]}
              personId={p.personId}
              groupId={id}
              reason="care"
            />
          </article>
        ))}
      </div>
      {remove && (
        <div className={s.notice}>
          <p>
            Remover o vínculo ativo preserva o histórico e retira o acesso a
            este grupo.
          </p>
          <button
            disabled={busy}
            onClick={async () => {
              if (
                await mutate({
                  action: "remove-member",
                  groupId: id,
                  personId: remove,
                  expectedRevision: g.revision,
                })
              )
                setRemove("");
            }}
          >
            Confirmar remoção
          </button>
          <button onClick={() => setRemove("")}>Cancelar</button>
        </div>
      )}
      {follow && (
        <form
          className={s.notice}
          onSubmit={async (e) => {
            e.preventDefault();
            const due = new FormData(e.currentTarget).get("due");
            const r = await mutate({
              action: "follow-up",
              groupId: id,
              personId: follow,
              dueAt: new Date(String(due)).toISOString(),
            });
            if (r) setFollow("");
          }}
        >
          <p>
            Será criada uma tarefa em Jornadas, atribuída à sua conta. O prazo
            usa o horário deste dispositivo.
          </p>
          <label>
            Prazo
            <input name="due" type="datetime-local" required />
          </label>
          <button disabled={busy}>Salvar acompanhamento</button>
          <button type="button" onClick={() => setFollow("")}>
            Cancelar
          </button>
        </form>
      )}
      {canManage && (
        <section className={s.notice}>
          <h3>Adicionar participante</h3>
          <label>
            Buscar pessoa
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPersonPage(0);
              }}
            />
          </label>
          <label>
            Pessoa
            <select
              value={candidate}
              onChange={(e) => setCandidate(e.target.value)}
            >
              <option value="">Selecione</option>
              {available
                .slice(personPage * 40, personPage * 40 + 40)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <div className={s.actions}>
            <button
              disabled={!personPage}
              onClick={() => setPersonPage((n) => n - 1)}
            >
              Anteriores
            </button>
            <span>{available.length} pessoas encontradas</span>
            <button
              disabled={(personPage + 1) * 40 >= available.length}
              onClick={() => setPersonPage((n) => n + 1)}
            >
              Mais pessoas
            </button>
            <button
              disabled={busy || !candidate}
              onClick={async () => {
                if (
                  await mutate({
                    action: "assign-member",
                    groupId: id,
                    personId: candidate,
                    expectedRevision: g.revision,
                  })
                )
                  setCandidate("");
              }}
            >
              Vincular pessoa
            </button>
          </div>
        </section>
      )}
      {m && (
        <form
          className={s.notice}
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await mutate({
                action: "save-report",
                groupId: id,
                meetingId: m.id,
                text: report ?? d.report?.text ?? "",
                expectedRevision: reportRevision ?? d.report?.revision ?? 0,
              })
            )
              setReport(null);
            setReportRevision(undefined);
          }}
        >
          <h3>Relatório do encontro</h3>
          <p>
            Salve o resumo revisado para consulta da liderança. Os indicadores
            usam a chamada registrada, não números escritos no texto.
          </p>
          <label>
            Resumo e próximos passos
            <textarea
              rows={6}
              maxLength={12000}
              required
              value={report ?? d.report?.text ?? ""}
              onChange={(e) => {
                if (report === null) setReportRevision(d.report?.revision || 0);
                setReport(e.target.value);
              }}
            />
          </label>
          <button disabled={busy} className={s.primary}>
            {busy ? "Salvando…" : "Salvar relatório"}
          </button>
          {d.report?.updatedAt && (
            <p>Último registro: {date(d.report.updatedAt, d.timezone)}</p>
          )}
        </form>
      )}
    </section>
  );
}

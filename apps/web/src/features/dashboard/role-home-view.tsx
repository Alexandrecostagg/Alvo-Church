"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Cake,
  Check,
  HeartHandshake,
  RefreshCw,
  X,
} from "lucide-react";
import {
  HOME_PROFILE_LABELS,
  type HomeProfile,
  type RoleHomeSnapshot,
} from "@alvo/domain";
import { useAppAuth } from "../../../app/providers";
import { useHomeApi, useHomeResource } from "./home-api";
import { ContactActions, LeaderInsights } from "./leader-insights";
import styles from "./role-home.module.css";

const explanations: Record<HomeProfile, string> = {
  pastoral:
    "Pessoas, acolhimento e cuidado. Veja quem precisa da sua atenção e organize o próximo passo.",
  administration:
    "Pessoas, equipes e rotina da igreja. Acesse as tarefas da administração com clareza.",
  cell_leader:
    "Prepare seus encontros, acompanhe as pessoas e registre as presenças das células que você lidera.",
  member: "Sua vida na igreja: encontros, serviço, convites e próximos passos.",
  network:
    "Acompanhe as igrejas da sua rede a partir dos indicadores que elas compartilham.",
};
export function RoleHomeView() {
  const { organizationId, user, roles } = useAppAuth();
  return (
    <RoleHomeContent
      key={`${organizationId}:${user?.uid}:${roles.join(",")}`}
    />
  );
}
function RoleHomeContent() {
  const [profile, setProfile] = useState<HomeProfile>();
  const [period, setPeriod] = useState("week");
  const [revision, setRevision] = useState(0);
  const [absence, setAbsence] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const { call } = useHomeApi();
  const { data, error } = useHomeResource<RoleHomeSnapshot>(
    { action: "overview", profile, birthdayPeriod: period },
    revision,
  );
  async function closeAbsence(id: string) {
    setBusy(id);
    setMessage("");
    try {
      await call({ action: "close-absence", profile: data!.profile, id });
      setMessage(
        "Contato registrado. O acompanhamento saiu da lista em aberto.",
      );
      setRevision((n) => n + 1);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const date = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: data?.timezone || "America/Belem",
    }).format(new Date(iso));
  return (
    <main className={styles.home}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>ESDRAS · INÍCIO</span>
          <h1>{data ? HOME_PROFILE_LABELS[data.profile] : "Seu painel"}</h1>
          <p>
            {data
              ? explanations[data.profile]
              : "Carregando sua visão de acesso…"}
          </p>
        </div>
        <button
          className={styles.button}
          onClick={() => {
            setMessage("");
            setRevision((n) => n + 1);
          }}
          aria-label="Atualizar painel"
        >
          <RefreshCw size={17} /> Atualizar
        </button>
      </header>
      {error && (
        <div role="alert" className={styles.notice}>
          {error}
        </div>
      )}
      {!data && !error && (
        <p role="status">Consultando suas responsabilidades…</p>
      )}
      {data && (
        <>
          <div className={styles.scope}>
            <div>
              <strong>{data.organizationName}</strong>
              <span>
                {data.scopeLabel} · atualizado {date(data.asOf)}
              </span>
            </div>
            {data.profiles.length > 1 && (
              <label>
                Minha visão{" "}
                <select
                  value={data.profile}
                  onChange={(e) => {
                    setProfile(e.target.value as HomeProfile);
                    setMessage("");
                  }}
                  aria-label="Minha visão"
                >
                  {data.profiles.map((p) => (
                    <option key={p} value={p}>
                      {HOME_PROFILE_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {data.warnings.map((w) => (
            <p className={styles.notice} key={w}>
              {w}
            </p>
          ))}
          {!!data.metrics.length && (
            <section
              className={styles.metrics}
              aria-label="Indicadores do meu acesso"
            >
              {data.metrics.map((m) => (
                <div className={styles.metric} key={m.key}>
                  <span>{m.label}</span>
                  <strong>
                    {m.value === null ? "—" : m.value.toLocaleString("pt-BR")}
                  </strong>
                  {m.href && (
                    <Link href={m.href}>
                      Conferir <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
              ))}
            </section>
          )}
          {["pastoral", "administration", "cell_leader"].includes(
            data.profile,
          ) &&
            data.actions.some((a) => a.key === "groups") && (
              <LeaderInsights data={data} revision={revision} />
            )}
          <section>
            <h2>O que você precisa fazer?</h2>
            <div className={styles.actions}>
              {data.actions.map((a) => (
                <Link className={styles.action} key={a.key} href={a.href}>
                  <ArrowUpRight size={20} />
                  <strong>{a.title}</strong>
                  <span>{a.detail}</span>
                </Link>
              ))}
            </div>
          </section>
          {message && (
            <p role="status" className={styles.notice}>
              {message}
            </p>
          )}
          <div className={styles.columns}>
            {data.actions.some((a) => a.key === "absence") && (
              <section id="acompanhamento" className={styles.panel}>
                <div className={styles.sectionHead}>
                  <h2>
                    <HeartHandshake size={21} /> Quem precisa de cuidado
                  </h2>
                  <button
                    className={styles.primary}
                    onClick={() => setAbsence(true)}
                  >
                    Registrar ausência percebida
                  </button>
                </div>
                <p>
                  Registro feito por uma pessoa. A falta de check-in, por si só,
                  não indica ausência.
                </p>
                {!data.absences.length && (
                  <p className={styles.empty}>
                    Nenhum acompanhamento em aberto nesta visão.
                  </p>
                )}
                {data.absences.map((a) => (
                  <article key={a.id} className={styles.row}>
                    <div>
                      <strong>{a.name}</strong>
                      <span>
                        Ausência percebida em{" "}
                        {a.date.split("-").reverse().join("/")}
                      </span>
                      {a.note && <p>{a.note}</p>}
                      <ContactActions
                        profile={data.profile}
                        personId={a.personId}
                        groupId={a.groupId}
                        reason="care"
                      />
                    </div>
                    <button
                      className={styles.button}
                      disabled={!!busy}
                      onClick={() => void closeAbsence(a.id)}
                    >
                      <Check size={16} />{" "}
                      {busy === a.id ? "Salvando…" : "Já realizei o contato"}
                    </button>
                  </article>
                ))}
              </section>
            )}
            {["pastoral", "administration", "cell_leader"].includes(
              data.profile,
            ) && (
              <section className={styles.panel}>
                <div className={styles.sectionHead}>
                  <h2>
                    <Cake size={21} /> Aniversariantes
                  </h2>
                  <label className={styles.srOnly} htmlFor="birthday-period">
                    Período de aniversários
                  </label>
                  <select
                    id="birthday-period"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option value="today">Hoje</option>
                    <option value="week">Próximos 7 dias</option>
                    <option value="month">Este mês</option>
                  </select>
                </div>
                <p>
                  {data.profile === "cell_leader"
                    ? "Pessoas das células que você lidera."
                    : "Pessoas ativas da instituição."}
                </p>
                {!data.birthdays.length && (
                  <p className={styles.empty}>
                    Nenhum aniversário encontrado neste período.
                  </p>
                )}
                {data.birthdays.map((p) => (
                  <div key={p.id} className={styles.row}>
                    <strong>{p.name}</strong>
                    <span>{p.date}</span>
                    <ContactActions
                      profile={data.profile}
                      personId={p.id}
                      groupId={p.groupId}
                      reason="birthday"
                    />
                  </div>
                ))}
              </section>
            )}
            {data.profile === "network" && (
              <section className={styles.panel}>
                <h2>Igrejas e últimos indicadores</h2>
                {!data.churches.length && (
                  <p className={styles.empty}>
                    Nenhuma igreja com vínculo ativo verificado. Cadastre e
                    confirme os vínculos em Rede de Igrejas.
                  </p>
                )}
                {data.churches.map((c) => (
                  <article className={styles.row} key={c.id}>
                    <div>
                      <strong>{c.name}</strong>
                      <span>
                        {c.date
                          ? `Consolidado de ${c.date}`
                          : "Aguardando primeiro consolidado"}
                      </span>
                    </div>
                    <span>
                      {c.members ?? "—"} membros · {c.groups ?? "—"} células
                    </span>
                  </article>
                ))}
              </section>
            )}
            {!!data.tasks.length && (
              <section className={styles.panel}>
                <h2>Próximos acompanhamentos</h2>
                {data.tasks.map((t) => (
                  <article className={styles.row} key={t.id}>
                    <strong>{t.title}</strong>
                    {t.dueAt && <span>{date(t.dueAt)}</span>}
                  </article>
                ))}
                <Link
                  href={
                    data.profile === "cell_leader" ? "/my-groups" : "/reception"
                  }
                >
                  Abrir minha área de trabalho →
                </Link>
              </section>
            )}
            {!!data.groups.length && (
              <section className={styles.panel}>
                <h2>
                  {data.profile === "cell_leader"
                    ? "Células que você lidera"
                    : "Meus vínculos"}
                </h2>
                {data.groups.map((g) => (
                  <Link className={styles.row} key={g.id} href="/my-groups">
                    <strong>{g.name}</strong>
                    <span>{g.meetingTime || "Horário a confirmar"} →</span>
                  </Link>
                ))}
              </section>
            )}
            {!!data.events.length && (
              <section className={styles.panel}>
                <h2>
                  <CalendarDays size={21} /> Próximos eventos
                </h2>
                {data.events.map((e) => (
                  <Link className={styles.row} key={e.id} href="/events">
                    <div>
                      <strong>{e.name}</strong>
                      <span>{date(e.startsAt)}</span>
                      <span>{e.location}</span>
                    </div>
                    <ArrowUpRight size={18} />
                  </Link>
                ))}
              </section>
            )}
          </div>
          {absence && (
            <AbsenceForm
              data={data}
              onClose={() => setAbsence(false)}
              onSaved={() => {
                setAbsence(false);
                setMessage(
                  "Ausência percebida registrada para acompanhamento.",
                );
                setRevision((n) => n + 1);
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
function AbsenceForm({
  data,
  onClose,
  onSaved,
}: {
  data: RoleHomeSnapshot;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { call } = useHomeApi();
  const leader = data.profile === "cell_leader";
  const [groupId, setGroup] = useState(leader ? data.groups[0]?.id || "" : "");
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<Array<{ id: string; name: string }>>([]);
  const [personId, setPerson] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [partial, setPartial] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  useEffect(() => {
    if (!leader || !groupId) return;
    const controller = new AbortController();
    setPeople([]);
    setPerson("");
    call<{ people: Array<{ id: string; name: string }> }>(
      { action: "group-detail", profile: data.profile, groupId },
      controller.signal,
    )
      .then((r) => {
        if (!controller.signal.aborted) setPeople(r.people);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [groupId, call, data.profile, leader]);
  async function findPeople() {
    setBusy(true);
    setError("");
    setPerson("");
    try {
      const r = await call<{ people: typeof people; partial: boolean }>({
        action: "search-people",
        profile: data.profile,
        search,
      });
      setPeople(r.people);
      setPartial(r.partial);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = new FormData(e.currentTarget);
    try {
      await call({
        action: "absence",
        profile: data.profile,
        personId,
        groupId: groupId || undefined,
        date: values.get("date"),
        note: values.get("note"),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <dialog ref={ref} className={styles.dialog} onCancel={onClose}>
      <form onSubmit={save}>
        <div className={styles.sectionHead}>
          <h2>Registrar ausência percebida</h2>
          <button
            type="button"
            className={styles.button}
            aria-label="Fechar formulário"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          Informe uma ausência que você percebeu. Não registre informações
          sensíveis sobre a pessoa.
        </p>
        {leader ? (
          <label>
            Célula
            <select
              required
              value={groupId}
              onChange={(e) => setGroup(e.target.value)}
            >
              {data.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Buscar pessoa pelo nome
            <div className={styles.search}>
              <input
                value={search}
                minLength={2}
                maxLength={80}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Digite pelo menos 2 letras"
              />
              <button
                type="button"
                className={styles.button}
                disabled={busy || search.trim().length < 2}
                onClick={() => void findPeople()}
              >
                Buscar
              </button>
            </div>
          </label>
        )}
        {partial && (
          <p className={styles.notice}>
            A busca rápida pode estar incompleta. Consulte o cadastro de
            Pessoas.
          </p>
        )}
        <label>
          Pessoa
          <select
            required
            value={personId}
            onChange={(e) => setPerson(e.target.value)}
          >
            <option value="">Selecione uma pessoa</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Data da ausência
          <input required type="date" name="date" />
        </label>
        <label>
          Observação para acompanhamento (opcional)
          <textarea
            name="note"
            rows={4}
            maxLength={500}
            placeholder="Ex.: tentar contato para saber como está."
          />
        </label>
        {error && (
          <p role="alert" className={styles.notice}>
            {error}
          </p>
        )}
        <button className={styles.primary} disabled={busy || !personId}>
          {busy ? "Salvando…" : "Salvar acompanhamento"}
        </button>
      </form>
    </dialog>
  );
}

"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { homeProfiles, type HomeGroupDetail } from "@alvo/domain";
import { useAppAuth } from "../../../app/providers";
import { useHomeApi, useHomeResource } from "./home-api";
import styles from "./role-home.module.css";

export function ScopedGroupsView() {
  const { roles, organizationId, user } = useAppAuth();
  return (
    <GroupsContent key={`${organizationId}:${user?.uid}:${roles.join(",")}`} />
  );
}
function GroupsContent() {
  const { roles } = useAppAuth();
  const profile = roles.includes("group_leader")
    ? "cell_leader"
    : homeProfiles(roles)[0];
  const { data, error } = useHomeResource<{
    linked: boolean;
    groups: Array<{ id: string; name: string; meetingTime: string | null }>;
    timezone: string;
  }>({ action: "my-groups", profile });
  const [selected, setSelected] = useState("");
  const groupId = selected || data?.groups[0]?.id;
  return (
    <main className={styles.home}>
      <header>
        <span className={styles.eyebrow}>MEUS VÍNCULOS</span>
        <h1>
          {profile === "cell_leader"
            ? "Minhas células · liderança"
            : "Minhas células"}
        </h1>
        <p>
          {profile === "cell_leader"
            ? "Encontros, presenças e pessoas das células em que você é responsável."
            : "Os encontros das células às quais seu cadastro está vinculado."}
        </p>
        <Link href="/app">← Voltar ao meu painel</Link>
      </header>
      {error && (
        <p role="alert" className={styles.notice}>
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Carregando seus vínculos…</p>}
      {data && !data.linked && (
        <p className={styles.notice}>
          Peça à secretaria para vincular sua conta ao seu cadastro de pessoa.
        </p>
      )}
      {data && !data.groups.length && (
        <p className={styles.empty}>
          Nenhuma célula vinculada a esta visão. A administração deve cadastrar
          o vínculo e a responsabilidade na célula.
        </p>
      )}
      {!!data?.groups.length && (
        <label>
          Célula
          <select value={groupId} onChange={(e) => setSelected(e.target.value)}>
            {data.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {groupId && profile === "cell_leader" && (
        <GroupWorkspace key={groupId} groupId={groupId} profile={profile} />
      )}
      {profile !== "cell_leader" &&
        data?.groups.map((g) => (
          <article className={styles.panel} key={g.id}>
            <h2>{g.name}</h2>
            <p>
              Horário do encontro:{" "}
              {g.meetingTime || "a confirmar com a liderança"}
            </p>
            <p>
              Consulte seu líder para confirmar o local e os detalhes do próximo
              encontro.
            </p>
          </article>
        ))}
    </main>
  );
}
function GroupWorkspace({
  groupId,
  profile,
}: {
  groupId: string;
  profile: string;
}) {
  const [meetingId, setMeeting] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [creating, setCreating] = useState(false);
  const createAttempt = useRef<{ signature: string; id: string } | null>(null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const { call } = useHomeApi();
  const { data, error } = useHomeResource<HomeGroupDetail>(
    { action: "group-detail", profile, groupId, meetingId },
    revision,
  );
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const values = new FormData(e.currentTarget);
    const signature = `${values.get("date")}:${values.get("time")}`;
    if (createAttempt.current?.signature !== signature)
      createAttempt.current = { signature, id: crypto.randomUUID() };
    try {
      const r = await call<{ id: string }>({
        action: "create-meeting",
        profile,
        groupId,
        requestId: createAttempt.current.id,
        date: values.get("date"),
        time: values.get("time"),
      });
      createAttempt.current = null;
      setMeeting(r.id);
      setCreating(false);
      setRevision((n) => n + 1);
      setMessage("Encontro criado.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function attendance(
    p: HomeGroupDetail["people"][number],
    status: string,
  ) {
    setBusy(true);
    setMessage("");
    try {
      await call({
        action: "attendance",
        profile,
        groupId,
        meetingId: data!.meetingId,
        personId: p.id,
        expectedStatus: p.status,
        status,
      });
      setRevision((n) => n + 1);
      setMessage(`Presença de ${p.name} salva.`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const statusLabels: Record<string, string> = {
    present: "Presente",
    absent: "Ausente",
    justified: "Justificou",
    first_time_guest: "Primeira visita",
  };
  return (
    <section className={styles.panel}>
      <div className={styles.sectionHead}>
        <h2>Encontros e presenças</h2>
        <button
          className={styles.primary}
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? "Fechar formulário" : "+ Novo encontro"}
        </button>
      </div>
      {creating && (
        <form
          onSubmit={create}
          className={styles.panel}
          style={{ marginTop: 20, display: "grid", gap: 18 }}
        >
          <h2>Novo encontro</h2>
          <p>Horário local: {data?.timezone || "fuso da igreja"}.</p>
          <label>
            Data
            <input required name="date" type="date" />
          </label>
          <label>
            Horário
            <input required name="time" type="time" />
          </label>
          <button disabled={busy} className={styles.primary}>
            {busy ? "Salvando…" : "Criar encontro"}
          </button>
        </form>
      )}
      {(message || error) && (
        <p role={error ? "alert" : "status"} className={styles.notice}>
          {error || message}
        </p>
      )}
      {!data && !error && <p role="status">Consultando encontro…</p>}
      {data && (
        <>
          <label style={{ marginTop: 20 }}>
            Encontro
            <select
              value={data.meetingId || ""}
              onChange={(e) => setMeeting(e.target.value)}
            >
              {!data.meetings.length && (
                <option value="">Cadastre o primeiro encontro</option>
              )}
              {data.meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: data.timezone,
                  }).format(new Date(m.startsAt))}
                </option>
              ))}
            </select>
          </label>
          <p>
            A lista mostra os últimos 50 encontros. Presenças podem ser
            registradas a partir de 3 horas antes do encontro e por até 90 dias.
          </p>
          {!data.people.length && (
            <p className={styles.empty}>
              Cadastre os vínculos das pessoas desta célula com a administração.
            </p>
          )}
          {data.people.map((p) => (
            <article className={styles.row} key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <span>
                  {p.status ? statusLabels[p.status] : "Sem registro"}
                </span>
              </div>
              <label>
                Situação de presença
                <select
                  aria-label={`Presença de ${p.name}`}
                  disabled={busy || !data.meetingId}
                  value={p.status || ""}
                  onChange={(e) => void attendance(p, e.target.value)}
                >
                  <option disabled value="">
                    Selecionar
                  </option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </>
      )}
    </section>
  );
}

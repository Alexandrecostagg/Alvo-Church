"use client";
import { useRef, useState } from "react";
import { useAppAuth } from "../../../app/providers";
import { useGroupApi, useGroupResource } from "../groups/group-api";
import s from "../groups/groups.module.css";
type Data = Record<string, any>;
const scopes: Record<string, string> = {
  all: "Todas as células",
  specific: "Células específicas",
  open: "Livre · líder escolhe o assunto",
};
function offset(week: string, n: number) {
  const d = new Date(week + "T12:00Z");
  d.setUTCDate(d.getUTCDate() + 7 * n);
  return d.toISOString().slice(0, 10);
}
export function WeeklyThemeView() {
  const { organizationId, user } = useAppAuth();
  return <Themes key={`${organizationId}:${user?.uid}`} />;
}
function Themes() {
  const { call } = useGroupApi(),
    [week, setWeek] = useState<string>(),
    [revision, refresh] = useState(0),
    [form, setForm] = useState<Data | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [remove, setRemove] = useState<Data | null>(null);
  const lock = useRef(false),
    attempt = useRef<{ signature: string; id: string } | null>(null);
  const { data, error: loadError } = useGroupResource<Data>(
    { action: "weekly-list", week },
    revision,
  );
  async function save(body: Data) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const signature = JSON.stringify(body);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: crypto.randomUUID() };
    try {
      await call({ ...body, requestId: attempt.current.id });
      attempt.current = null;
      setForm(null);
      setRemove(null);
      setNotice(
        "Tema salvo. O app consultará esta versão ao atualizar a preparação do encontro.",
      );
      refresh((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className={s.page}>
      <header className={s.heading}>
        <div>
          <h1>Tema semanal das células</h1>
          <p>
            Oriente os líderes por semana e por célula. A duração também aparece
            no app.
          </p>
        </div>
        <button
          className={s.primary}
          disabled={busy || !data}
          onClick={() =>
            setForm({
              title: "",
              bibleVerse: "",
              description: "",
              durationMinutes: "",
              scope: "all",
              groupIds: [],
            })
          }
        >
          + Novo tema
        </button>
      </header>
      <div aria-live="polite">
        {notice && <p className={s.success}>{notice}</p>}
        {(error || loadError) && (
          <p role="alert" className={s.error}>
            {error || loadError}
          </p>
        )}
      </div>
      {!data && !loadError && <p>Carregando temas…</p>}
      {data && (
        <>
          <section className={s.panel}>
            <div className={s.actions}>
              <button
                disabled={busy || !!form}
                onClick={() => setWeek(offset(data.week, -1))}
              >
                Semana anterior
              </button>
              <strong>
                Semana de {data.week.split("-").reverse().join("/")}
              </strong>
              <button
                disabled={busy || !!form}
                onClick={() => setWeek(offset(data.week, 1))}
              >
                Próxima semana
              </button>
              <button
                disabled={busy || !!form}
                onClick={() => {
                  setWeek(undefined);
                  refresh((n) => n + 1);
                }}
              >
                Semana atual / atualizar
              </button>
            </div>
            <p>
              Calendário da instituição: {data.timezone}. Um tema específico
              prevalece sobre a orientação geral.
            </p>
          </section>
          {data.themes.length === 0 && !form && (
            <p>Nenhum tema definido nesta semana.</p>
          )}
          {data.themes.map((t: Data) => (
            <article key={t.id} className={s.panel}>
              <h2>{t.title}</h2>
              <p>
                {scopes[t.scope]}
                {t.durationMinutes ? ` · ${t.durationMinutes} minutos` : ""}
              </p>
              <p>{t.bibleVerse}</p>
              <p style={{ whiteSpace: "pre-wrap" }}>{t.description}</p>
              {t.scope === "specific" && (
                <p>
                  {t.groupIds
                    .map(
                      (id: string) =>
                        data.groups.find((g: Data) => g.id === id)?.name ||
                        "Célula arquivada",
                    )
                    .join(", ")}
                </p>
              )}
              <div className={s.actions}>
                <button disabled={busy} onClick={() => setForm({ ...t })}>
                  Editar tema
                </button>
                <button disabled={busy} onClick={() => setRemove(t)}>
                  Arquivar tema
                </button>
              </div>
            </article>
          ))}
          {remove && (
            <div className={s.notice}>
              <p>
                Arquivar “{remove.title}” retira essa orientação do app,
                preservando o registro.
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  save({
                    action: "weekly-delete",
                    id: remove.id,
                    expectedRevision: remove.revision,
                  })
                }
              >
                Confirmar arquivamento
              </button>
              <button disabled={busy} onClick={() => setRemove(null)}>
                Cancelar
              </button>
            </div>
          )}
          {form && (
            <form
              className={s.panel}
              onSubmit={(e) => {
                e.preventDefault();
                save({
                  action: "weekly-save",
                  id: form.id,
                  expectedRevision: form.revision || 0,
                  week: data.week,
                  title: form.title,
                  bibleVerse: form.bibleVerse,
                  description: form.description,
                  durationMinutes: form.durationMinutes,
                  scope: form.scope,
                  groupIds: form.groupIds,
                });
              }}
            >
              <h2>{form.id ? "Editar tema" : "Novo tema"}</h2>
              <fieldset disabled={busy} className={s.form}>
                <label>
                  Título
                  <input
                    required
                    maxLength={180}
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Referência bíblica
                  <input
                    maxLength={240}
                    value={form.bibleVerse}
                    onChange={(e) =>
                      setForm({ ...form, bibleVerse: e.target.value })
                    }
                  />
                </label>
                <label>
                  Duração sugerida em minutos
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={form.durationMinutes ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, durationMinutes: e.target.value })
                    }
                  />
                </label>
                <label>
                  Destinatários
                  <select
                    value={form.scope}
                    onChange={(e) =>
                      setForm({ ...form, scope: e.target.value, groupIds: [] })
                    }
                  >
                    {Object.entries(scopes).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Orientações para o líder
                  <textarea
                    rows={5}
                    maxLength={6000}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </label>
                {form.scope === "specific" && (
                  <fieldset>
                    <legend>Células ativas</legend>
                    {data.groups.map((g: Data) => (
                      <label key={g.id}>
                        <input
                          style={{ width: "auto" }}
                          type="checkbox"
                          checked={form.groupIds.includes(g.id)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              groupIds: e.target.checked
                                ? [...form.groupIds, g.id]
                                : form.groupIds.filter(
                                    (id: string) => id !== g.id,
                                  ),
                            })
                          }
                        />
                        {g.name}
                      </label>
                    ))}
                  </fieldset>
                )}
                <div className={s.actions}>
                  <button className={s.primary}>
                    {busy ? "Salvando…" : "Salvar tema"}
                  </button>
                  <button type="button" onClick={() => setForm(null)}>
                    Cancelar
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </>
      )}
    </main>
  );
}

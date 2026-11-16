"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  TRIAL_LABELS,
  OPEN_TRIAL_STATES,
  type TribeSnapshot,
  type TribePerson,
  type TribeTrial,
} from "@alvo/domain";
import { useAppAuth } from "../../../app/providers";
import { useTribeApi, useTribeResource } from "./tribe-api";
import { tribeDefinitions } from "./tribe-definitions";
import styles from "./tribes.module.css";
const label = (code: string) =>
  tribeDefinitions.find((t) => t.code === code)?.name || "Ainda sem referência";
export function TribesView({ personal = false }: { personal?: boolean }) {
  const { identity } = useTribeApi();
  return <TribesContent key={`${identity}:${personal}`} personal={personal} />;
}
function TribesContent({ personal }: { personal: boolean }) {
  const { roles, user, organizationId } = useAppAuth(),
    { call } = useTribeApi(),
    params = useSearchParams();
  const scope = personal
    ? "personal"
    : params.get("scope") === "cell_leader"
      ? "cell_leader"
      : roles.some((r) =>
            ["pastor", "church_admin", "super_admin", "secretary"].includes(r),
          )
        ? "leadership"
        : "cell_leader";
  const [revision, setRevision] = useState(0),
    { data, error } = useTribeResource<TribeSnapshot>(
      { action: "snapshot", scope },
      revision,
    );
  const editor = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [failure, setFailure] = useState("");
  const [tab, setTab] = useState("experiences"),
    [search, setSearch] = useState(""),
    [tribeFilter, setTribeFilter] = useState("");
  const [selected, setSelected] = useState<TribePerson | null>(null),
    [tribe, setTribe] = useState(""),
    [secondary, setSecondary] = useState(""),
    [reason, setReason] = useState(""),
    [agreed, setAgreed] = useState(false);
  const [personId, setPersonId] = useState(""),
    [areaId, setAreaId] = useState(""),
    [purpose, setPurpose] = useState(""),
    [date, setDate] = useState("");
  const [editing, setEditing] = useState<TribeTrial | null>(null),
    [feedback, setFeedback] = useState(""),
    [interest, setInterest] = useState("continue");
  const [recordResponse, setRecordResponse] = useState(false),
    [response, setResponse] = useState("accept"),
    [received, setReceived] = useState(false);
  useEffect(() => {
    if (selected || editing) {
      editor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      editor.current?.focus();
    }
  }, [selected, editing]);
  const mutate = async (body: Record<string, unknown>, message: string) => {
    if (busy) return;
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      await call({ ...body, scope, requestId: crypto.randomUUID() });
      setNotice(message);
      setRevision((n) => n + 1);
      setSelected(null);
      setEditing(null);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };
  async function suggest() {
    if (!selected || !user) return;
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          organizationId,
          task: "tribe_classify",
          input: {
            memberName: "Pessoa",
            ministerialInterests: selected.interests,
            servingProfile: selected.servingProfile,
            availability: selected.availability,
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Falha ao obter sugestão.");
      const parsed = JSON.parse(
        String(d.content).replace(/^```(?:json)?\s*|\s*```$/g, ""),
      );
      if (!tribeDefinitions.some((t) => t.code === parsed.primary))
        throw Error(
          "Não há informações suficientes para sugerir uma tribo. Converse com a pessoa.",
        );
      setTribe(parsed.primary);
      setSecondary(
        tribeDefinitions.some((t) => t.code === parsed.secondary) &&
          parsed.secondary !== parsed.primary
          ? parsed.secondary
          : "",
      );
      setReason(String(parsed.reason || "").slice(0, 500));
      setAgreed(false);
      setNotice("Sugestão pronta para revisão. Nada foi alterado no cadastro.");
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Resposta inválida da IA.");
    } finally {
      setBusy(false);
    }
  }
  const formDate = () => new Date(date).toISOString();
  const startInvite = (t: TribeTrial) => {
    setSelected(null);
    setRecordResponse(false);
    setEditing(t);
    setPurpose(t.purpose);
    setDate("");
    setFeedback("");
    setInterest("continue");
  };
  const review = (p: TribePerson) => {
    setEditing(null);
    setSelected(p);
    setTribe(p.tribe);
    setSecondary(p.secondary);
    setReason("");
    setAgreed(false);
    setNotice("");
    setFailure("");
  };
  const people = (data?.people || []).filter(
    (p) =>
      (!tribeFilter || p.tribe === tribeFilter) &&
      p.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const trials = data?.trials || [],
    active = trials.filter((t) => OPEN_TRIAL_STATES.includes(t.status)),
    own = data?.people[0];
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            DESCOBRIR · EXPERIMENTAR · ACOMPANHAR
          </p>
          <h1>
            {personal
              ? "Meu lugar para servir"
              : "Tribos e oportunidades de servir"}
          </h1>
          <p>
            Interesses que se transformam em experiências reais, com a escolha
            da pessoa e acompanhamento da liderança.
          </p>
        </div>
        <Link href={personal ? "/app" : "/my-tribe"}>
          {personal ? "Voltar ao início" : "Minha participação →"}
        </Link>
      </header>
      <div aria-live="polite" className={styles.feedback}>
        {busy && <p role="status">Salvando / preparando…</p>}
        {notice && <p role="status">✓ {notice}</p>}
        {(failure || error) && (
          <p role="alert">
            {failure || error}{" "}
            <button onClick={() => setRevision((n) => n + 1)}>
              Atualizar dados
            </button>
          </p>
        )}
      </div>
      {!data && !error && <p>Carregando seus vínculos e experiências…</p>}
      {data && (
        <>
          {personal && !data.linked && (
            <section className={styles.panel}>
              Sua conta ainda precisa ser vinculada ao cadastro de pessoa pela
              secretaria.
            </section>
          )}
          <section className={styles.stats} aria-label="Resumo">
            <div>
              <span>{personal ? "Minha referência" : "Pessoas com tribo"}</span>
              <strong>
                {personal
                  ? label(own?.tribe || "")
                  : `${data.people.filter((p) => p.tribe).length} / ${data.people.length}`}
              </strong>
            </div>
            <div>
              <span>
                {personal
                  ? "Convites para responder"
                  : "Interesses para acolher"}
              </span>
              <strong>
                {
                  trials.filter(
                    (t) => t.status === (personal ? "invited" : "requested"),
                  ).length
                }
              </strong>
            </div>
            <div>
              <span>Experiências em andamento</span>
              <strong>{active.length}</strong>
            </div>
            <div>
              <span>
                {personal
                  ? "Retornos para registrar"
                  : "Retornos para acompanhar"}
              </span>
              <strong>
                {
                  trials.filter((t) =>
                    personal
                      ? t.status === "accepted" &&
                        Date.parse(t.scheduledAt) <= Date.now()
                      : t.status === "completed",
                  ).length
                }
              </strong>
            </div>
          </section>
          {!personal && (
            <p>
              {data.staff
                ? "Visão da instituição."
                : "Somente pessoas com vínculo ativo nas células em que você lidera."}{" "}
              Tribos são referências de interesses; não medem maturidade
              espiritual nem concedem funções.
            </p>
          )}
          {!personal && (
            <nav className={styles.tabs} aria-label="Seções de Tribos">
              {[
                ["experiences", "Experiências"],
                ["people", "Pessoas e tribos"],
                ["areas", "Áreas da igreja"],
              ].map(([id, title]) => (
                <button
                  key={id}
                  aria-pressed={tab === id}
                  onClick={() => {
                    setTab(id);
                    setSelected(null);
                    setEditing(null);
                  }}
                >
                  {title}
                </button>
              ))}
            </nav>
          )}
          {(personal || tab === "experiences") && (
            <>
              {!data.servingEnabled && (
                <section className={styles.panel}>
                  As experiências ficam disponíveis com o módulo de Escalas
                  ativo no plano da igreja.
                </section>
              )}
              {data.servingEnabled && data.areas.length === 0 && (
                <section className={styles.panel}>
                  <h2>Primeiro, cadastre as áreas da igreja</h2>
                  <p>
                    Cada igreja usa seus próprios nomes e funções. As
                    experiências usam esse mesmo cadastro.
                  </p>
                  {data.staff && (
                    <Link href="/serving">Cadastrar áreas em Escalas →</Link>
                  )}
                </section>
              )}
              {data.servingEnabled &&
                data.areas.length > 0 &&
                (data.manager || data.linked) && (
                  <section className={styles.panel}>
                    <h2>
                      {personal
                        ? "Experimente servir"
                        : "Convidar para uma experiência"}
                    </h2>
                    <p>
                      {personal
                        ? "Escolha uma área que desperte seu interesse. A liderança vai combinar uma atividade e uma data com você."
                        : "Combine uma atividade curta e uma data com a pessoa. Ela poderá aceitar ou recusar pelo app ou pela web."}
                    </p>
                    <form
                      className={styles.form}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void mutate(
                          {
                            action: recordResponse
                              ? "record-response"
                              : personal
                                ? "request"
                                : "create-invite",
                            personId,
                            areaId,
                            purpose,
                            ...(!personal ? { scheduledAt: formDate() } : {}),
                          },
                          personal
                            ? "Seu interesse foi registrado. Aguarde o convite da liderança."
                            : "Convite registrado e disponível no painel e no app da pessoa.",
                        );
                      }}
                    >
                      {!personal && (
                        <label>
                          Pessoa
                          <select
                            required
                            value={personId}
                            onChange={(e) => setPersonId(e.target.value)}
                          >
                            <option value="">Selecione</option>
                            {data.people.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label>
                        Área da igreja
                        <select
                          required
                          value={areaId}
                          onChange={(e) => setAreaId(e.target.value)}
                        >
                          <option value="">Selecione</option>
                          {data.areas.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                              {personal && a.tribe && a.tribe === own?.tribe
                                ? " · relacionada à sua tribo"
                                : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      {areaId && (
                        <p>
                          {data.areas.find((a) => a.id === areaId)?.summary}{" "}
                          {data.areas
                            .find((a) => a.id === areaId)
                            ?.roles.join(" · ")}
                          {personal &&
                            data.areas.find((a) => a.id === areaId)?.tribe ===
                              own?.tribe &&
                            own?.tribe &&
                            " — Relação configurada pela liderança. Você pode escolher outra área."}
                        </p>
                      )}
                      <label>
                        {personal
                          ? "O que gostaria de experimentar? (opcional)"
                          : "Atividade e orientação de encontro"}
                        <textarea
                          maxLength={500}
                          required={!personal}
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          placeholder="Ex.: acompanhar a equipe na recepção, com orientação de um responsável."
                        />
                      </label>
                      {!personal && (
                        <label>
                          Data e hora <small>(fuso deste dispositivo)</small>
                          <input
                            type="datetime-local"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                          />
                        </label>
                      )}
                      <button className={styles.primary} disabled={busy}>
                        {personal
                          ? "Registrar meu interesse"
                          : "Enviar convite para o app e a web"}
                      </button>
                    </form>
                    <p className={styles.muted}>
                      O convite aparece ao abrir ou atualizar o painel. Esta
                      etapa não cria uma escala, não envia WhatsApp
                      automaticamente e não concede acesso a áreas restritas.
                    </p>
                  </section>
                )}
              <section className={styles.panel}>
                <h2>
                  {personal
                    ? "Minhas experiências"
                    : "Acompanhamento das experiências"}
                </h2>
                {!trials.length && (
                  <p>
                    Nenhuma experiência registrada. Comece com um convite
                    simples.
                  </p>
                )}
                {trials.map((t) => (
                  <article key={t.id} className={styles.card}>
                    <div className={styles.heading}>
                      <h3>
                        {t.areaName}
                        {!personal && ` · ${t.personName}`}
                      </h3>
                      <span className={styles.badge}>
                        {TRIAL_LABELS[t.status] || t.status}
                      </span>
                    </div>
                    <p>{t.purpose}</p>
                    {t.scheduledAt && (
                      <p>
                        {new Date(t.scheduledAt).toLocaleString("pt-BR", {
                          timeZone: data.timezone,
                        })}{" "}
                        · {data.timezone}
                      </p>
                    )}
                    {t.responseSource === "leadership_record" && (
                      <p>
                        Resposta recebida e registrada pela liderança:{" "}
                        {t.responseNote}
                      </p>
                    )}
                    {t.status === "invited" &&
                      Date.parse(t.scheduledAt) <= Date.now() && (
                        <p>
                          Esta data passou. Combine um novo convite com a
                          liderança.
                        </p>
                      )}
                    {t.feedback && (
                      <p>
                        <strong>Retorno da pessoa:</strong> {t.feedback} ·{" "}
                        {{
                          continue: "Quero continuar",
                          explore: "Quero experimentar outra área",
                          pause: "Prefiro pausar",
                        }[t.interest] || t.interest}
                      </p>
                    )}
                    {t.outcome && (
                      <p>
                        <strong>Próximo passo acordado:</strong> {t.outcome}
                      </p>
                    )}
                    <div className={styles.actions}>
                      {!personal &&
                        ["invited", "accepted"].includes(t.status) && (
                          <button
                            onClick={() => {
                              setSelected(null);
                              setEditing(t);
                              setRecordResponse(true);
                              setResponse(
                                t.status === "invited" &&
                                  Date.parse(t.scheduledAt) > Date.now()
                                  ? "accept"
                                  : t.status === "accepted" &&
                                      Date.parse(t.scheduledAt) <= Date.now()
                                    ? "feedback"
                                    : "decline",
                              );
                              setReceived(false);
                              setFeedback("");
                              setInterest("continue");
                            }}
                          >
                            Registrar resposta recebida
                          </button>
                        )}
                      {personal && t.status === "invited" && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void mutate(
                              {
                                action: "accept",
                                id: t.id,
                                revision: t.revision,
                              },
                              "Convite aceito. A liderança já pode ver sua resposta.",
                            )
                          }
                        >
                          Aceitar convite
                        </button>
                      )}
                      {personal &&
                        ["requested", "invited", "accepted"].includes(
                          t.status,
                        ) && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              void mutate(
                                {
                                  action: "decline",
                                  id: t.id,
                                  revision: t.revision,
                                },
                                "Sua decisão foi registrada. Você pode explorar outra área.",
                              )
                            }
                          >
                            {t.status === "requested"
                              ? "Retirar interesse"
                              : "Não posso participar"}
                          </button>
                        )}
                      {personal &&
                        t.status === "accepted" &&
                        Date.parse(t.scheduledAt) <= Date.now() && (
                          <button onClick={() => startInvite(t)}>
                            Como foi a experiência?
                          </button>
                        )}
                      {!personal && t.status === "requested" && (
                        <button onClick={() => startInvite(t)}>
                          Combinar experiência
                        </button>
                      )}
                      {!personal && t.status === "completed" && (
                        <button onClick={() => startInvite(t)}>
                          Registrar próximo passo
                        </button>
                      )}
                      {!personal && OPEN_TRIAL_STATES.includes(t.status) && (
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Cancelar esta experiência? A pessoa verá o cancelamento.",
                              )
                            )
                              void mutate(
                                {
                                  action: "cancel",
                                  id: t.id,
                                  personId: t.personId,
                                  revision: t.revision,
                                },
                                "Experiência cancelada.",
                              );
                          }}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                    {!personal &&
                      ["invited", "accepted"].includes(t.status) && (
                        <TribeContact trial={t} scope={scope} />
                      )}
                  </article>
                ))}
              </section>
            </>
          )}
          {!personal && tab === "people" && (
            <section className={styles.panel}>
              <h2>Referências ministeriais</h2>
              <p>
                A IA pode oferecer uma hipótese. A revisão exige conversa com a
                pessoa, concordância e um motivo registrado.
              </p>
              <div className={styles.form}>
                <label>
                  Buscar pessoa
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <label>
                  Tribo
                  <select
                    value={tribeFilter}
                    onChange={(e) => setTribeFilter(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {tribeDefinitions.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.grid}>
                {people.map((p) => (
                  <article key={p.id} className={styles.card}>
                    <h3>{p.name}</h3>
                    <p>
                      {label(p.tribe)}
                      {p.secondary ? ` · ${label(p.secondary)}` : ""}
                    </p>
                    <p>
                      {p.interests.join(" · ") ||
                        "Interesses ainda não informados."}
                    </p>
                    <p>{p.reason}</p>
                    {data.staff && (
                      <button onClick={() => review(p)}>
                        Revisar com a pessoa
                      </button>
                    )}
                  </article>
                ))}
              </div>
              {!people.length && <p>Nenhuma pessoa encontrada.</p>}
              <details>
                <summary>Conheça as 12 referências</summary>
                <div className={styles.grid}>
                  {tribeDefinitions.map((t) => (
                    <article key={t.code}>
                      <h3>{t.name}</h3>
                      <p>{t.description}</p>
                    </article>
                  ))}
                </div>
              </details>
            </section>
          )}
          {!personal && tab === "areas" && (
            <section className={styles.panel}>
              <h2>Áreas reais, nomes da sua igreja</h2>
              <p>
                Relacionar uma área a uma tribo ajuda a pessoa a explorar
                possibilidades. A relação não é obrigatória nem limita quem pode
                demonstrar interesse.
              </p>
              {data.staff && (
                <Link href="/serving">Gerenciar áreas e funções →</Link>
              )}
              <div className={styles.grid}>
                {data.areas.map((a) => (
                  <article className={styles.card} key={a.id}>
                    <h3>{a.name}</h3>
                    <p>{a.summary}</p>
                    <p>{a.roles.join(" · ")}</p>
                    <label>
                      Referência sugerida
                      <select
                        disabled={!data.staff || busy}
                        value={a.tribe}
                        onChange={(e) =>
                          void mutate(
                            {
                              action: "map-area",
                              areaId: a.id,
                              tribe: e.target.value,
                              revision: a.revision,
                            },
                            "Relação da área atualizada.",
                          )
                        }
                      >
                        <option value="">Aberta a todos os interesses</option>
                        {tribeDefinitions.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            </section>
          )}
          {selected && (
            <section
              ref={editor}
              tabIndex={-1}
              className={styles.editor}
              role="region"
              aria-label="Revisão da tribo"
            >
              <h2>Revisar · {selected.name}</h2>
              <p>
                Interesses informados:{" "}
                {selected.interests.join(", ") || "Não informados"}.{" "}
                {selected.servingProfile}
              </p>
              <button
                disabled={
                  busy ||
                  (!selected.interests.length && !selected.servingProfile)
                }
                onClick={() => void suggest()}
              >
                Pedir sugestão à IA (usa a cota do plano)
              </button>
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(
                    {
                      action: "classify",
                      personId: selected.id,
                      tribe,
                      secondary,
                      reason,
                      memberAgreed: agreed,
                      revision: selected.revision,
                    },
                    "Referência atualizada com histórico e responsável pela revisão.",
                  );
                }}
              >
                <label>
                  Principal
                  <select
                    required
                    value={tribe}
                    onChange={(e) => setTribe(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {tribeDefinitions.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Secundária (opcional)
                  <select
                    value={secondary}
                    onChange={(e) => setSecondary(e.target.value)}
                  >
                    <option value="">Sem secundária</option>
                    {tribeDefinitions
                      .filter((t) => t.code !== tribe)
                      .map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Motivo da revisão
                  <textarea
                    required
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    required
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  Conversei com a pessoa e ela concordou com esta referência.
                </label>
                <div className={styles.actions}>
                  <button className={styles.primary} disabled={busy}>
                    Salvar revisão
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setSelected(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          )}
          {editing && (
            <section
              ref={editor}
              tabIndex={-1}
              className={styles.editor}
              role="region"
              aria-label="Próximo passo da experiência"
            >
              <h2>
                {editing.areaName} · {editing.personName}
              </h2>
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(
                    {
                      id: editing.id,
                      personId: editing.personId,
                      revision: editing.revision,
                      action: personal
                        ? "feedback"
                        : editing.status === "requested"
                          ? "invite"
                          : "close",
                      ...(recordResponse
                        ? {
                            response,
                            confirmedByPerson: received,
                            responseNote: feedback,
                            feedback,
                            interest,
                          }
                        : personal
                          ? { feedback, interest }
                          : editing.status === "requested"
                            ? { purpose, scheduledAt: formDate() }
                            : { outcome: feedback }),
                    },
                    "Próximo passo registrado.",
                  );
                }}
              >
                {recordResponse ? (
                  <>
                    <p>
                      A pessoa pode responder por WhatsApp ou pessoalmente, sem
                      instalar o app. Registre o que ela realmente respondeu; a
                      autoria deste registro ficará no histórico.
                    </p>
                    <label>
                      Resposta recebida
                      <select
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                      >
                        {editing.status === "invited" &&
                          Date.parse(editing.scheduledAt) > Date.now() && (
                            <option value="accept">Aceitou participar</option>
                          )}
                        <option value="decline">
                          Não pode / não quer participar
                        </option>
                        {editing.status === "accepted" &&
                          Date.parse(editing.scheduledAt) <= Date.now() && (
                            <option value="feedback">
                              Contou como foi a experiência
                            </option>
                          )}
                      </select>
                    </label>
                    <label>
                      O que a pessoa respondeu
                      <textarea
                        required
                        maxLength={1000}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                    </label>
                    {response === "feedback" && (
                      <label>
                        Como ela quer seguir?
                        <select
                          value={interest}
                          onChange={(e) => setInterest(e.target.value)}
                        >
                          <option value="continue">Continuar na área</option>
                          <option value="explore">
                            Experimentar outra área
                          </option>
                          <option value="pause">Pausar</option>
                        </select>
                      </label>
                    )}
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        required
                        checked={received}
                        onChange={(e) => setReceived(e.target.checked)}
                      />
                      Recebi essa resposta da própria pessoa.
                    </label>
                  </>
                ) : !personal && editing.status === "requested" ? (
                  <>
                    <label>
                      Atividade combinada
                      <textarea
                        required
                        maxLength={500}
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                      />
                    </label>
                    <label>
                      Data e hora (fuso deste dispositivo)
                      <input
                        required
                        type="datetime-local"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      {personal
                        ? "Como foi?"
                        : "Próximo passo combinado com a pessoa"}
                      <textarea
                        required
                        maxLength={1000}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                    </label>
                    {personal && (
                      <label>
                        Como quer seguir?
                        <select
                          value={interest}
                          onChange={(e) => setInterest(e.target.value)}
                        >
                          <option value="continue">
                            Quero continuar nesta área
                          </option>
                          <option value="explore">
                            Quero experimentar outra área
                          </option>
                          <option value="pause">Prefiro pausar</option>
                        </select>
                      </label>
                    )}
                  </>
                )}
                <div className={styles.actions}>
                  <button className={styles.primary} disabled={busy}>
                    Salvar próximo passo
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEditing(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function TribeContact({ trial, scope }: { trial: TribeTrial; scope: string }) {
  const { call } = useTribeApi(),
    [link, setLink] = useState<{ url: string; message: string }>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function prepare() {
    setBusy(true);
    setLink(undefined);
    setError("");
    try {
      const d = await call<{ url: string; message: string }>({
        action: "contact",
        scope,
        id: trial.id,
        personId: trial.personId,
      });
      const u = new URL(d.url),
        desktop = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (desktop)
        d.url = `https://web.whatsapp.com/send?phone=${u.pathname.slice(1)}&text=${encodeURIComponent(d.message)}`;
      setLink(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button disabled={busy} onClick={() => void prepare()}>
        {busy ? "Preparando…" : "Preparar WhatsApp"}
      </button>
      {error && <p role="alert">{error}</p>}
      {link && (
        <div>
          <p>{link.message}</p>
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            Abrir WhatsApp com esta mensagem ↗
          </a>
          <p>
            Revise e confirme o envio usando o número da igreja. Abrir a
            conversa não registra envio nem aceite.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import type { HomeEvolution, RoleHomeSnapshot } from "@alvo/domain";
import { useHomeApi, useHomeResource } from "./home-api";
import styles from "./role-home.module.css";
export function ContactActions({
  profile,
  personId,
  groupId,
  reason,
}: {
  profile: string;
  personId: string;
  groupId?: string | null;
  reason: "birthday" | "care";
}) {
  const { call } = useHomeApi();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [link, setLink] = useState<{
    url: string;
    message?: string;
    address?: string;
    channel: string;
  }>();
  async function prepare(channel: string) {
    setPending(true);
    setError("");
    setLink(undefined);
    try {
      const r = await call<{ url: string; message?: string; address?: string }>(
        { action: "contact", profile, personId, groupId, reason, channel },
      );
      setLink({ ...r, channel });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className={styles.contact}>
      <div className={styles.contactButtons}>
        <button
          className={styles.button}
          disabled={pending}
          onClick={() => void prepare("whatsapp")}
        >
          WhatsApp
        </button>
        <button
          className={styles.button}
          disabled={pending}
          onClick={() => void prepare("map")}
        >
          Ver endereço no mapa
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {link && (
        <div className={styles.linkPreview}>
          <p>{link.message || link.address}</p>
          <a
            className={styles.primary}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link.channel === "map"
              ? "Abrir Google Maps"
              : "Abrir WhatsApp com esta mensagem"}{" "}
            ↗
          </a>
          <p>
            {link.channel === "map"
              ? "Confira o endereço antes de iniciar o trajeto."
              : "Revise o texto e confirme o envio no WhatsApp. Abrir a conversa não registra contato realizado."}
          </p>
        </div>
      )}
    </div>
  );
}
export function LeaderInsights({
  data,
  revision,
}: {
  data: RoleHomeSnapshot;
  revision: number;
}) {
  const [tab, setTab] = useState("attention");
  const { data: stats, error } = useHomeResource<HomeEvolution>(
    { action: "evolution", profile: data.profile },
    revision,
  );
  const totals = stats?.weeks.reduce(
    (a, w) => ({
      meetings: a.meetings + w.meetings,
      recorded: a.recorded + w.recorded,
      present: a.present + w.present,
      absent: a.absent + w.absent,
      justified: a.justified + w.justified,
    }),
    { meetings: 0, recorded: 0, present: 0, absent: 0, justified: 0 },
  );
  const records = totals
    ? totals.present + totals.absent + totals.justified
    : 0;
  const rate = records ? Math.round((totals!.present / records) * 100) : null;
  const missing = totals ? totals.meetings - totals.recorded : 0;
  return (
    <section
      className={styles.insights}
      aria-label="Acompanhamento da liderança"
    >
      <div className={styles.sectionHead}>
        <div>
          <span className={styles.eyebrow}>ACOMPANHAR PARA CUIDAR</span>
          <h2>O pulso das suas células</h2>
        </div>
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Visão dos indicadores"
        >
          {[
            ["attention", "Atenção agora"],
            ["evolution", "Evolução"],
          ].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls="leader-insights-panel"
              tabIndex={tab === id ? 0 : -1}
              onKeyDown={(e) => {
                if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                  e.preventDefault();
                  const next = tab === "attention" ? "evolution" : "attention";
                  setTab(next);
                  document.getElementById(`tab-${next}`)?.focus();
                }
              }}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div
        role="tabpanel"
        id="leader-insights-panel"
        aria-labelledby={`tab-${tab}`}
      >
        {error && <p role="alert">{error}</p>}
        {!stats && !error && (
          <p role="status">Conferindo encontros e chamadas…</p>
        )}
        {stats && totals && (
          <>
            <p>
              Últimas 8 semanas, incluindo a atual ·{" "}
              {stats.from.split("-").reverse().join("/")} a{" "}
              {stats.to.split("-").reverse().join("/")}
            </p>
            {stats.partial && (
              <p className={styles.notice}>
                Consulta parcial: até 30 células, 100 encontros por célula (120
                no total) e 500 registros por encontro. Os números abaixo
                correspondem apenas a essa amostra.
              </p>
            )}
            <div className={styles.insightNumbers}>
              <div>
                <strong>{rate === null ? "—" : `${rate}%`}</strong>
                <span>Presença nos registros</span>
              </div>
              <div>
                <strong>{totals.present}</strong>
                <span>Participações registradas</span>
              </div>
              <div>
                <strong>
                  {totals.recorded}/{totals.meetings}
                </strong>
                <span>Encontros com alguma chamada</span>
              </div>
            </div>
            {tab === "attention" ? (
              <div className={styles.attentionGrid}>
                <a href="#acompanhamento" className={styles.attentionCard}>
                  <span>CUIDADO PESSOAL</span>
                  <strong>
                    {data.metrics.find((m) => m.key === "care")?.value ?? "—"}
                  </strong>
                  <b>Acompanhamentos abertos</b>
                  <p>Confira quem precisa de contato e registre o retorno.</p>
                </a>
                <div className={styles.attentionCard}>
                  <span>QUALIDADE DO REGISTRO</span>
                  <strong>{missing}</strong>
                  <b>Encontros sem chamada</b>
                  <p>Conclua o registro antes de avaliar a participação.</p>
                  {stats.groups
                    .filter((g) => g.missing)
                    .map((g) => (
                      <p key={g.id}>
                        {g.name}: {g.missing}
                      </p>
                    ))}
                  <a
                    href={
                      data.profile === "cell_leader" ? "/my-groups" : "/groups"
                    }
                  >
                    Conferir encontros →
                  </a>
                </div>
              </div>
            ) : (
              <>
                <h3>Presenças por semana</h3>
                <p>
                  Cada participação corresponde a uma presença em um encontro; a
                  mesma pessoa pode participar mais de uma vez.
                </p>
                <div
                  className={styles.chart}
                  role="img"
                  aria-label={stats.weeks
                    .map(
                      (w) =>
                        `${w.start}: ${w.present} presenças em ${w.recorded} encontros com chamada`,
                    )
                    .join("; ")}
                >
                  {stats.weeks.map((w) => (
                    <div className={styles.chartColumn} key={w.start}>
                      <strong>{w.recorded ? w.present : "—"}</strong>
                      <div className={styles.barTrack}>
                        <div
                          style={{
                            height: `${w.recorded ? Math.max(2, (w.present / Math.max(1, ...stats.weeks.map((x) => x.present))) * 100) : 0}%`,
                          }}
                        />
                      </div>
                      <span>
                        {w.start.slice(8)}/{w.start.slice(5, 7)}
                      </span>
                    </div>
                  ))}
                </div>
                <p>
                  — significa nenhum encontro com chamada na semana. A semana
                  atual ainda está em andamento.
                </p>
                <details>
                  <summary>Ver números e composição da participação</summary>
                  <div className={styles.tableScroll}>
                    <table>
                      <thead>
                        <tr>
                          <th>Semana</th>
                          <th>Com chamada / encontros</th>
                          <th>Presenças</th>
                          <th>Ausências registradas</th>
                          <th>Justificadas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.weeks.map((w) => (
                          <tr key={w.start}>
                            <td>{w.start.split("-").reverse().join("/")}</td>
                            <td>
                              {w.recorded}/{w.meetings}
                            </td>
                            <td>{w.recorded ? w.present : "—"}</td>
                            <td>{w.recorded ? w.absent : "—"}</td>
                            <td>{w.recorded ? w.justified : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
            <p className={styles.insightFoot}>
              A taxa usa presenças ÷ (presenças + ausências + justificativas
              registradas). Uma chamada iniciada pode estar incompleta. Ausência
              de registro não significa ausência da pessoa.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

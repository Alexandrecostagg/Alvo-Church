"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAppAuth } from "../../../app/providers";
import { financeRequest } from "../../lib/finance-client";
import s from "../members/people.module.css";
import f from "./finance.module.css";
type Entry = {
  id: string;
  date: string;
  kind: string;
  label: string;
  note: string;
  amountCents: number;
  source: string;
  canVoid: boolean;
};
type Report = {
  month: string;
  entries: Entry[];
  incomeCents: number;
  expenseCents: number;
  missionsCents: number;
  balanceCents: number;
  unconfirmedLegacyCount: number;
  voidedCount: number;
};
type Overview = {
  report: Report;
  pending: Array<{
    id: string;
    name: string;
    amount: number;
    type: string;
    date: string;
    receiptId: string | null;
  }>;
  pendingCount: number;
  nextPendingCursor: string | null;
  campaigns: Array<{
    id: string;
    title: string;
    goalAmount: number;
    raisedAmount: number;
  }>;
  campaignsTruncated: boolean;
  givingAvailable: boolean;
  publicPath: string | null;
};
type Series = Array<{
  month: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  unconfirmedLegacyCount: number;
}>;
const money = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    c / 100,
  );
const monthName = (v: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(v + "-01T12:00:00Z"));
const localDate = () => new Date().toLocaleDateString("sv-SE");
const labels: Record<string, string> = {
  income: "Entrada",
  expense: "Saída",
  missions: "Entrada para missões",
};
const dateLabel = (v: string) =>
  v ? String(v).slice(0, 10).split("-").reverse().join("/") : "Sem data";
export function FinanceView() {
  const { user, organizationId, tenantReady } = useAppAuth();
  const [month, setMonth] = useState(() => localDate().slice(0, 7)),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<Overview | null>(null),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const [tab, setTab] = useState<"entries" | "evolution" | "campaigns">(
      "entries",
    ),
    [series, setSeries] = useState<Series | null>(null),
    [seriesError, setSeriesError] = useState("");
  const [query, setQuery] = useState(""),
    [cursor, setCursor] = useState("");
  const [manual, setManual] = useState(false),
    [form, setForm] = useState({
      kind: "income",
      label: "",
      amount: "",
      date: localDate(),
      note: "",
    });
  const [decision, setDecision] = useState<{
      id: string;
      action: "confirm" | "reject" | "void";
      label: string;
    } | null>(null),
    [reason, setReason] = useState(""),
    [checked, setChecked] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const generation = useRef(0),
    lock = useRef(false),
    requestId = useRef("");
  useEffect(() => {
    const g = ++generation.current;
    lock.current = false;
    setBusy(false);
    setData(null);
    setError("");
    setSeries(null);
    setSeriesError("");
    setReceipt(null);
    setDecision(null);
    if (!user || !tenantReady) return;
    setLoading(true);
    void financeRequest(user, {
      action: "overview",
      organizationId,
      month,
      pendingAfter: cursor || undefined,
    })
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
  }, [user, organizationId, tenantReady, month, revision, cursor]);
  useEffect(() => {
    setManual(false);
    requestId.current = "";
    setStatus("");
    setCursor("");
    setForm({
      kind: "income",
      label: "",
      amount: "",
      date: localDate(),
      note: "",
    });
  }, [organizationId, user?.uid]);
  useEffect(() => {
    if (tab !== "evolution" || !data || !user) return;
    let cancelled = false;
    setSeries(null);
    setSeriesError("");
    void financeRequest(user, { action: "evolution", organizationId, month })
      .then((r) => {
        if (!cancelled) setSeries(r.series);
      })
      .catch((e) => {
        if (!cancelled) setSeriesError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, data, user, organizationId, month]);
  async function run(body: Record<string, unknown>, message: string) {
    if (!user || lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    const g = generation.current;
    try {
      await financeRequest(user, { ...body, organizationId });
      if (g !== generation.current) return false;
      setStatus(message);
      setRevision((v) => v + 1);
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
  async function saveManual(e: React.FormEvent) {
    e.preventDefault();
    requestId.current ||= crypto.randomUUID();
    if (
      await run(
        {
          action: "manual",
          requestId: requestId.current,
          ...form,
          amount: Number(form.amount),
        },
        "Lançamento registrado. Os totais do mês foram atualizados.",
      )
    ) {
      requestId.current = "";
      setManual(false);
      setForm({
        kind: "income",
        label: "",
        amount: "",
        date: localDate(),
        note: "",
      });
    }
  }
  async function decide(e: React.FormEvent) {
    e.preventDefault();
    if (!decision || (decision.action === "confirm" && !checked)) return;
    await run(
      {
        action: decision.action,
        contributionId: decision.id,
        transactionId: decision.id,
        reference: reason,
        reason,
      },
      decision.action === "confirm"
        ? "Recebimento confirmado e integrado a Doações e ao perfil do contribuinte."
        : decision.action === "reject"
          ? "Declaração rejeitada; nenhum recebimento foi lançado."
          : "Lançamento anulado. O histórico foi preservado.",
    );
  }
  function choose(
    id: string,
    action: "confirm" | "reject" | "void",
    label: string,
  ) {
    setDecision({ id, action, label });
    setReason("");
    setChecked(false);
    setError("");
    setStatus("");
  }
  async function exportCsv() {
    if (!user || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const g = generation.current;
    try {
      const r = await financeRequest(user, {
        action: "report",
        organizationId,
        month,
      });
      if (g !== generation.current) return;
      const url = URL.createObjectURL(
          new Blob([r.csv], { type: "text/csv;charset=utf-8" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "financas-" + month + ".csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(
        "CSV do mês preparado com " + r.entries.length + " lançamentos.",
      );
    } catch (e) {
      if (g === generation.current)
        setError(e instanceof Error ? e.message : "Não foi possível exportar.");
    } finally {
      if (g === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  async function showReceipt(id: string) {
    if (!user || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const g = generation.current;
    try {
      const r = await financeRequest(user, {
        action: "receipt",
        organizationId,
        receiptId: id,
      });
      if (g === generation.current) setReceipt(r.dataUrl);
    } catch (e) {
      if (g === generation.current)
        setError(e instanceof Error ? e.message : "Comprovante indisponível.");
    } finally {
      if (g === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  const entries =
    data?.report.entries.filter((e) =>
      (e.label + " " + labels[e.kind])
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
    ) || [];
  const max = series
    ? Math.max(1, ...series.flatMap((v) => [v.incomeCents, v.expenseCents]))
    : 1;
  return (
    <main className={s.page + " " + f.page}>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
        }
      `}</style>
      <header className={f.header}>
        <div>
          <span className={f.eyebrow}>FINANÇAS E TRANSPARÊNCIA</span>
          <h1>Finanças da igreja</h1>
          <p>
            Recebimentos conferidos, despesas e pendências em uma única visão.
          </p>
        </div>
      </header>
      <div className={s.actions}>
        <label>
          Mês do relatório
          <input
            type="month"
            aria-label="Mês do relatório"
            value={month}
            disabled={busy}
            onChange={(e) => {
              if (e.target.value) {
                setMonth(e.target.value);
                setStatus("");
                setCursor("");
              }
            }}
          />
        </label>
        <button
          disabled={busy || loading}
          onClick={() => setRevision((v) => v + 1)}
        >
          Atualizar
        </button>
        <button disabled={!data || busy || loading} onClick={exportCsv}>
          {busy ? "Aguarde…" : "Baixar CSV do mês"}
        </button>
        <button
          disabled={!data || busy || loading}
          onClick={() => window.print()}
        >
          Imprimir mês
        </button>
        <button
          disabled={!data || busy || loading}
          onClick={() => {
            setManual((v) => !v);
            setDecision(null);
            setStatus("");
          }}
        >
          Lançamento manual
        </button>
      </div>
      <p className={f.help}>
        O período selecionado vale para os totais, o extrato, a impressão e o
        CSV. Pendências de conferência abrangem todos os meses.
      </p>
      <p role="status">
        {loading ? "Carregando Finanças…" : busy ? "Processando…" : status}
      </p>
      {error && (
        <p role="alert" className={s.notice}>
          {error}
        </p>
      )}
      {manual && (
        <section className={s.card}>
          <h2>Novo lançamento manual</h2>
          <p>
            Registra uma movimentação no caixa. Para associar uma contribuição a
            uma pessoa, use o cadastro em <Link href="/members">Pessoas</Link>.
          </p>
          <form onSubmit={saveManual}>
            <fieldset disabled={busy} className={f.form}>
              <label>
                Categoria
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                >
                  {Object.entries(labels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Descrição
                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </label>
              <label>
                Valor (R$)
                <input
                  required
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>
              <label>
                Data do lançamento
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
              <label>
                Observação
                <textarea
                  maxLength={1000}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </label>
              <div className={s.actions}>
                <button type="submit">
                  {busy ? "Salvando…" : "Salvar lançamento"}
                </button>
                <button type="button" onClick={() => setManual(false)}>
                  Fechar
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      {decision && (
        <section className={s.card} aria-label="Conferência financeira">
          <h2>
            {decision.action === "confirm"
              ? "Conferir recebimento"
              : decision.action === "reject"
                ? "Rejeitar declaração"
                : "Anular lançamento"}
          </h2>
          <p>{decision.label}</p>
          <p>
            {decision.action === "confirm"
              ? "Confira o crédito no extrato bancário. O recebimento será registrado na data da confirmação."
              : "O motivo ficará registrado no histórico."}
          </p>
          <form onSubmit={decide}>
            <fieldset disabled={busy} className={f.form}>
              <label>
                {decision.action === "confirm"
                  ? "Referência única do extrato"
                  : "Motivo"}
                <input
                  autoFocus
                  required
                  maxLength={decision.action === "void" ? 500 : 160}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {decision.action === "confirm" && (
                <label className={f.check}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                  />
                  Conferi o valor recebido no extrato bancário.
                </label>
              )}
              <div className={s.actions}>
                <button
                  disabled={
                    !reason.trim() ||
                    (decision.action === "confirm" && !checked)
                  }
                >
                  {busy ? "Registrando…" : "Registrar decisão"}
                </button>
                <button type="button" onClick={() => setDecision(null)}>
                  Cancelar
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      {receipt && (
        <section className={s.card}>
          <h2>Comprovante para conferência</h2>
          <p>A imagem não confirma o recebimento.</p>
          <img
            className={f.receipt}
            src={receipt}
            alt="Comprovante da contribuição selecionada"
          />
          <button onClick={() => setReceipt(null)}>Fechar comprovante</button>
        </section>
      )}
      {data && (
        <>
          <p className={s.notice}>
            <a href="#finance-pending">
              {data.pendingCount} contribuição(ões) aguardando conferência
            </a>{" "}
            · Todos os meses
          </p>
          <section className={f.print} aria-label="Relatório mensal">
            <h2>{monthName(data.report.month)}</h2>
            <div className={s.metrics}>
              <article className={s.card}>
                Entradas do mês<strong>{money(data.report.incomeCents)}</strong>
              </article>
              <article className={s.card}>
                Saídas do mês<strong>{money(data.report.expenseCents)}</strong>
              </article>
              <article className={s.card}>
                Saldo do mês<strong>{money(data.report.balanceCents)}</strong>
              </article>
              <article className={s.card}>
                Entradas para missões
                <strong>{money(data.report.missionsCents)}</strong>
                <small>Já incluídas nas entradas.</small>
              </article>
            </div>
            <p>
              Saldo das movimentações registradas neste período; não é o saldo
              da conta bancária.
            </p>
            {!!data.report.unconfirmedLegacyCount && (
              <p className={s.notice}>
                {data.report.unconfirmedLegacyCount} contribuição(ões) antiga(s)
                sem confirmação excluída(s) das receitas. Solicite revisão do
                histórico à administração.
              </p>
            )}
            {!!data.report.voidedCount && (
              <p>
                {data.report.voidedCount} lançamento(s) anulado(s) excluído(s)
                dos totais; histórico preservado.
              </p>
            )}
            <p className={f.help}>
              Consulta completa do mês até 1.000 registros por origem. Acima
              desse limite, a consulta é bloqueada para não apresentar totais
              parciais.
            </p>
            <div className={f.screenOnly}>
              <nav className={s.actions} aria-label="Visões financeiras">
                {(["entries", "evolution", "campaigns"] as const).map(
                  (v, i) => (
                    <button
                      key={v}
                      aria-pressed={tab === v}
                      onClick={() => setTab(v)}
                    >
                      {["Extrato", "Evolução", "Campanhas"][i]}
                    </button>
                  ),
                )}
              </nav>
              {tab === "entries" && (
                <>
                  <label className={f.filter}>
                    Filtrar lançamentos
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Descrição ou categoria"
                    />
                  </label>
                  <div className={f.tableWrap}>
                    <table className={f.table}>
                      <caption>
                        Extrato de {monthName(month)}
                        {query ? " · filtro: " + query : ""}
                      </caption>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Descrição</th>
                          <th>Categoria</th>
                          <th>Valor</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e) => (
                          <tr key={e.source + e.id}>
                            <td>{dateLabel(e.date)}</td>
                            <td>
                              <strong>{e.label}</strong>
                              {e.note && <small>{e.note}</small>}
                              <small>
                                {e.source === "manual"
                                  ? "Lançamento manual"
                                  : "Contribuição confirmada"}
                              </small>
                            </td>
                            <td>{labels[e.kind]}</td>
                            <td>
                              {e.kind === "expense" ? "− " : "+ "}
                              {money(e.amountCents)}
                            </td>
                            <td>
                              {e.canVoid ? (
                                <button
                                  disabled={busy}
                                  onClick={() => choose(e.id, "void", e.label)}
                                >
                                  Anular
                                </button>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!entries.length && (
                    <p>
                      Nenhum lançamento encontrado neste período
                      {query ? " e filtro" : ""}.
                    </p>
                  )}
                </>
              )}
              {tab === "evolution" && (
                <section className={s.card}>
                  <h3>Evolução nos seis meses até {monthName(month)}</h3>
                  {seriesError ? (
                    <p role="alert">{seriesError}</p>
                  ) : !series ? (
                    <p role="status">Carregando evolução…</p>
                  ) : (
                    <>
                      <div className={f.chart} aria-hidden="true">
                        {series.map((v) => (
                          <div key={v.month} className={f.column}>
                            <div className={f.bars}>
                              <span
                                title={"Entradas: " + money(v.incomeCents)}
                                style={{
                                  height: (v.incomeCents / max) * 100 + "%",
                                  background: "#15803d",
                                }}
                              />
                              <span
                                title={"Saídas: " + money(v.expenseCents)}
                                style={{
                                  height: (v.expenseCents / max) * 100 + "%",
                                  background: "#c2410c",
                                }}
                              />
                            </div>
                            <small>
                              {v.month.slice(5) + "/" + v.month.slice(2, 4)}
                            </small>
                          </div>
                        ))}
                      </div>
                      <p>Verde: entradas · Laranja: saídas</p>
                      <div className={f.tableWrap}>
                        <table className={f.table + " " + f.evolutionTable}>
                          <caption>Valores da evolução</caption>
                          <thead>
                            <tr>
                              <th>Mês</th>
                              <th>Entradas</th>
                              <th>Saídas</th>
                              <th>Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {series.map((v) => (
                              <tr key={v.month}>
                                <th>{monthName(v.month)}</th>
                                <td>{money(v.incomeCents)}</td>
                                <td>{money(v.expenseCents)}</td>
                                <td>{money(v.balanceCents)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {series.some((v) => v.unconfirmedLegacyCount > 0) && (
                        <p>
                          Contribuições antigas sem confirmação não entram nos
                          valores da evolução.
                        </p>
                      )}
                    </>
                  )}
                </section>
              )}
              {tab === "campaigns" && (
                <section className={s.card}>
                  <h3>Campanhas ativas · acumulado confirmado</h3>
                  <p>
                    Os valores das campanhas abrangem toda a campanha,
                    independentemente do mês selecionado.
                  </p>
                  {!data.givingAvailable ? (
                    <p>O módulo Doações está indisponível nesta instituição.</p>
                  ) : !data.campaigns.length ? (
                    <p>Nenhuma campanha ativa.</p>
                  ) : (
                    data.campaigns.map((c) => (
                      <article key={c.id} className={f.campaign}>
                        <strong>{c.title}</strong>
                        <p>
                          {money(c.raisedAmount * 100)} de{" "}
                          {money(c.goalAmount * 100)}
                        </p>
                        {c.goalAmount > 0 && (
                          <progress
                            aria-label={"Progresso de " + c.title}
                            max={c.goalAmount}
                            value={Math.min(c.raisedAmount, c.goalAmount)}
                          />
                        )}
                      </article>
                    ))
                  )}
                  {data.campaignsTruncated && (
                    <p>Exibindo as primeiras 500 campanhas.</p>
                  )}
                </section>
              )}
            </div>
            <table className={f.table + " " + f.printOnly}>
              <caption>Extrato completo do mês selecionado</caption>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.report.entries.map((e) => (
                  <tr key={e.source + e.id}>
                    <td>{dateLabel(e.date)}</td>
                    <td>{e.label}</td>
                    <td>{labels[e.kind]}</td>
                    <td>
                      {e.kind === "expense" ? "− " : "+ "}
                      {money(e.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className={s.card} id="finance-pending">
            <h2>Contribuições para conferência · {data.pendingCount}</h2>
            <p>
              Declarações do app, da equipe e do link público. Só entram nas
              receitas após confirmação.
            </p>
            {!data.pendingCount && (
              <p>Nenhuma declaração pendente de conferência.</p>
            )}
            {!!data.pendingCount && !data.pending.length && (
              <p>Não há mais pendências nesta página.</p>
            )}
            <div
              className={s.list + " " + f.queue}
              tabIndex={0}
              aria-label="Lista de contribuições pendentes"
            >
              {data.pending.map((c) => (
                <article key={c.id} className={s.row}>
                  <div>
                    <strong>
                      {c.name} · {money(c.amount * 100)}
                    </strong>
                    <small>
                      {dateLabel(c.date)} · {c.type}
                    </small>
                  </div>
                  <div className={s.actions}>
                    {c.receiptId && (
                      <button
                        disabled={busy}
                        onClick={() => showReceipt(c.receiptId!)}
                      >
                        Ver comprovante
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() =>
                        choose(
                          c.id,
                          "confirm",
                          c.name + " · " + money(c.amount * 100),
                        )
                      }
                    >
                      Conferir recebimento
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => choose(c.id, "reject", c.name)}
                    >
                      Rejeitar
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className={s.actions}>
              {cursor && (
                <button disabled={busy} onClick={() => setCursor("")}>
                  Primeira página de pendências
                </button>
              )}
              {data.nextPendingCursor && (
                <button
                  disabled={busy}
                  onClick={() => setCursor(data.nextPendingCursor!)}
                >
                  Próximas pendências
                </button>
              )}
            </div>
          </section>
          <section className={s.card}>
            <h2>Doações e acompanhamento</h2>
            <p>
              A confirmação em Finanças atualiza Doações e as contribuições
              pessoais no app e na web, conforme o vínculo da conta.
              Administradores e pastores acompanham as pendências no painel;
              líderes de célula não recebem acesso ao caixa.
            </p>
            <div className={s.actions}>
              {data.givingAvailable && (
                <Link href="/giving">Abrir Doações</Link>
              )}
              {data.publicPath && (
                <Link href={data.publicPath} target="_blank" rel="noreferrer">
                  Abrir página pública de doação
                </Link>
              )}
              <Link href="/app">Voltar ao painel</Link>
            </div>
            {data.givingAvailable && !data.publicPath && (
              <p>
                O link público exige endereço público e PIX configurados para
                esta igreja.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

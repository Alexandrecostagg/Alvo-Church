"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  HeartHandshake,
  Target,
  Copy,
  MessageCircle,
} from "lucide-react";
import {
  GIVING_STATUS,
  parseGivingAmount,
  type GivingOverview,
} from "@alvo/domain";
import { useGivingApi, useGivingResource } from "./giving-api";
import styles from "./giving.module.css";
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (v: string) => {
  const d = new Date(v.length === 10 ? `${v}T12:00:00` : v);
  return Number.isNaN(d.getTime())
    ? "Data não informada"
    : d.toLocaleDateString("pt-BR");
};
export function GivingView() {
  const { identity, ready } = useGivingApi();
  return ready ? (
    <GivingContent key={identity} />
  ) : (
    <p role="status">Carregando seu acesso…</p>
  );
}
function GivingContent() {
  const { call } = useGivingApi();
  const [revision, setRevision] = useState(0),
    { data, error: loadError } = useGivingResource<GivingOverview>(
      { action: "snapshot" },
      revision,
    );
  const [showForm, setShowForm] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [preparedContact, setPreparedContact] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    goal: "",
  });
  const attempt = useRef({ fingerprint: "", id: "" }),
    lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const refresh = () => setRevision((v) => v + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  async function mutate(
    key: string,
    body: Record<string, unknown>,
    message: string,
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await call(body);
      if (!alive.current) return;
      setNotice(message);
      setRevision((v) => v + 1);
      if (key === "create") {
        setForm({ title: "", description: "", category: "", goal: "" });
        setShowForm(false);
        attempt.current = { fingerprint: "", id: "" };
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      lock.current = false;
      if (alive.current) setBusy("");
    }
  }
  function create() {
    const goalAmount = parseGivingAmount(form.goal);
    if (!form.title.trim() || !goalAmount) {
      setError("Preencha o título e uma meta válida, por exemplo 4.000,00.");
      return;
    }
    const body = {
      action: "create",
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      goalAmount,
    };
    const fingerprint = JSON.stringify(body);
    if (attempt.current.fingerprint !== fingerprint)
      attempt.current = { fingerprint, id: crypto.randomUUID() };
    void mutate(
      "create",
      { ...body, requestId: attempt.current.id },
      "Campanha criada. Compartilhe o convite ou acompanhe as contribuições abaixo.",
    );
  }
  async function prepareContact(id: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(id);
    setError("");
    setPreparedContact(null);
    try {
      const result = await call<{ url: string }>({
        action: "contact",
        intentId: id,
      });
      if (alive.current) {
        const url = new URL(result.url);
        setPreparedContact(
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
            ? result.url
            : `https://web.whatsapp.com/send?phone=${url.pathname.slice(1)}&${url.searchParams.toString()}`,
        );
        setNotice(
          "Mensagem preparada. Abra o WhatsApp e confira antes de enviar.",
        );
      }
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível preparar o contato.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy("");
    }
  }
  const publicUrl = (id?: string) =>
    data?.publicPath
      ? `${window.location.origin}${data.publicPath}${id ? `?campanha=${encodeURIComponent(id)}` : ""}`
      : "";
  const message = (c: GivingOverview["campaigns"][number]) =>
    `${c.title}\n${c.description ? c.description + "\n" : ""}Conheça esta campanha e contribua se desejar: ${publicUrl(c.id)}`;
  const whatsapp = (text: string) =>
    `${/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "https://wa.me/" : "https://web.whatsapp.com/send"}?text=${encodeURIComponent(text)}`;
  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(publicUrl(id));
      setNotice("Link copiado.");
      setError("");
    } catch {
      setError(
        "Não foi possível copiar. Abra a página da campanha e copie o endereço.",
      );
    }
  }
  return (
    <div className={`page-root ${styles.root}`}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Doações</h1>
          <p className="page-subtitle">
            {data?.manager
              ? "Campanhas, contribuições e conferência de recebimentos"
              : "Campanhas da igreja e minhas contribuições"}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            className="btn-secondary"
            onClick={() => setRevision((v) => v + 1)}
            disabled={!!busy}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
          {data?.publicPath && data.pixConfigured && (
            <a className="btn-secondary" href={publicUrl()} target="_blank" rel="noopener noreferrer">
              {data.manager ? "Página de doações" : "Contribuir à igreja"}
            </a>
          )}
          {data?.manager && (
            <button
              className="btn-primary"
              disabled={!!busy}
              onClick={() => setShowForm((v) => !v)}
            >
              <Plus size={16} />
              {showForm ? "Fechar formulário" : "Nova campanha"}
            </button>
          )}
        </div>
      </header>
      {notice && (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      )}
      {preparedContact && (
        <a
          className="btn-secondary"
          target="_blank"
          rel="noopener noreferrer"
          href={preparedContact}
        >
          Abrir conversa preparada no WhatsApp
        </a>
      )}
      {(error || loadError) && (
        <p role="alert" className={styles.error}>
          {error || loadError}
        </p>
      )}
      {!data && !loadError && (
        <p role="status">Carregando campanhas e contribuições…</p>
      )}
      {data && (
        <>
          <div className={styles.explanation}>
            <HeartHandshake size={24} />
            <div>
              O PIX é pago à igreja pelo aplicativo do banco. A plataforma
              registra a declaração; o recebimento só é confirmado após
              conferência.
              {data.canReconcile && (
                <>
                  {" "}
                  <Link href="/finance">Abrir conferência em Finanças →</Link>
                </>
              )}
            </div>
          </div>
          {!data.pixConfigured && (
            <p className={styles.warning}>
              A igreja ainda precisa configurar a chave PIX para receber pelo
              app e pelo link público.
              {data.manager && (
                <>
                  {" "}
                  <Link href="/settings">Abrir configurações</Link>
                </>
              )}
            </p>
          )}
          {!data.publicPath && (
            <p className={styles.warning}>
              O link público desta igreja ainda não está disponível.{" "}
              {data.manager
                ? "Confira o endereço público em Configurações."
                : "Você pode contribuir pelo app após a configuração do PIX."}
            </p>
          )}
          <div className="stats-row">
            <div className="stat-card">
              <div>
                <span className="stat-label">Campanhas ativas</span>
                <strong className="stat-value">
                  {data.campaigns.filter((c) => c.status === "active").length}
                </strong>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <span className="stat-label">
                  Confirmado nas campanhas {data.manager ? "" : "ativas"}
                </span>
                <strong className="stat-value">
                  {brl(
                    data.campaigns.reduce(
                      (s, c) => s + Math.round(c.raisedAmount * 100),
                      0,
                    ) / 100,
                  )}
                </strong>
              </div>
            </div>
            {data.manager && (
              <div className="stat-card">
                <div>
                  <span className="stat-label">
                    Declarações aguardando conferência
                  </span>
                  <strong className="stat-value">{data.pendingCount}</strong>
                  {data.canReconcile && (
                    <Link href="/finance">Conferir recebimentos →</Link>
                  )}
                </div>
              </div>
            )}
          </div>
          {showForm && data.manager && (
            <section className={`content-section ${styles.form}`}>
              <h2>Nova campanha de oferta</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  create();
                }}
              >
                <label>
                  Título
                  <input
                    required
                    maxLength={140}
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    placeholder="Ex.: Reforma do templo"
                  />
                </label>
                <label>
                  Descrição da causa
                  <textarea
                    rows={4}
                    maxLength={2000}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </label>
                <div className={styles.columns}>
                  <label>
                    Categoria
                    <input
                      maxLength={80}
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      placeholder="Obras, missões…"
                    />
                  </label>
                  <label>
                    Meta em reais
                    <input
                      required
                      inputMode="decimal"
                      value={form.goal}
                      onChange={(e) =>
                        setForm({ ...form, goal: e.target.value })
                      }
                      placeholder="4.000,00"
                    />
                  </label>
                </div>
                {parseGivingAmount(form.goal) !== null && (
                  <p>
                    Meta: <strong>{brl(parseGivingAmount(form.goal)!)}</strong>
                  </p>
                )}
                <button className="btn-primary" disabled={!!busy}>
                  {busy === "create" ? "Criando campanha…" : "Criar campanha"}
                </button>
              </form>
            </section>
          )}
          <section className="content-section">
            <h2>Campanhas de oferta</h2>
            {!data.campaigns.length && (
              <p>
                Nenhuma campanha {data.manager ? "cadastrada" : "ativa"} no
                momento.
              </p>
            )}
            <div className={styles.campaigns}>
              {data.campaigns.map((c) => {
                const available =
                  c.status === "active" &&
                  !!data.publicPath &&
                  data.pixConfigured;
                const pct =
                  c.goalAmount > 0
                    ? Math.min(
                        100,
                        Math.round((c.raisedAmount / c.goalAmount) * 100),
                      )
                    : 0;
                return (
                  <article key={c.id} className={styles.campaign}>
                    <div className={styles.heading}>
                      <h3>
                        <Target size={19} /> {c.title}
                      </h3>
                      <span>
                        {c.status === "active" ? "Ativa" : "Encerrada"}
                        {c.category ? ` · ${c.category}` : ""}
                      </span>
                    </div>
                    <p>{c.description}</p>
                    <div className={styles.heading}>
                      <strong>{brl(c.raisedAmount)} confirmado</strong>
                      <span>
                        Meta {brl(c.goalAmount)} · {pct}%
                      </span>
                    </div>
                    <progress
                      max={100}
                      value={pct}
                      aria-label={`Progresso da campanha ${c.title}`}
                    />
                    <div className={styles.actions}>
                      {available && (
                        <>
                          <a
                            className="btn-primary"
                            href={publicUrl(c.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {data.manager ? "Ver página pública" : "Contribuir"}
                          </a>
                          <button
                            className="btn-secondary"
                            onClick={() => void copy(c.id)}
                          >
                            <Copy size={16} />
                            Copiar link
                          </button>
                          <a
                            className="btn-secondary"
                            href={whatsapp(message(c))}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle size={16} />
                            Abrir WhatsApp
                          </a>
                          {data.canCommunicate && (
                            <Link
                              className="btn-secondary"
                              href={`/communication?compose=${encodeURIComponent(message(c))}`}
                            >
                              Preparar mensagem aos membros
                            </Link>
                          )}
                        </>
                      )}
                      {data.manager && (
                        <button
                          className="btn-secondary"
                          disabled={!!busy}
                          onClick={() =>
                            void mutate(
                              c.id,
                              {
                                action: "status",
                                campaignId: c.id,
                                status:
                                  c.status === "active" ? "closed" : "active",
                                expectedUpdatedAt: c.updatedAt,
                              },
                              c.status === "active"
                                ? "Campanha encerrada. O histórico foi preservado."
                                : "Campanha reaberta.",
                            )
                          }
                        >
                          {busy === c.id
                            ? "Salvando…"
                            : c.status === "active"
                              ? "Encerrar campanha"
                              : "Reabrir campanha"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className={styles.hint}>
              O WhatsApp abre com o texto preparado. Você escolhe o destinatário
              e confirma o envio.
            </p>
          </section>
          <section className="content-section">
            <h2>
              {data.manager
                ? "Contribuições declaradas · app e link público"
                : "Minhas contribuições pelo app"}
            </h2>
            {!data.manager && <p>Este histórico reúne as declarações feitas com sua conta no app. Contribuições pelo link público são acompanhadas pela secretaria.</p>}
            {data.truncated && (
              <p className={styles.warning}>
                Exibindo até 200 registros recentes por origem. O histórico
                financeiro completo deve ser consultado em Finanças.
              </p>
            )}
            {!data.contributions.length && (
              <p>
                Nenhuma contribuição declarada{" "}
                {data.manager ? "ainda" : "por esta conta"}.
              </p>
            )}
            <div className={styles.records}>
              {data.contributions.map((c) => (
                <article key={c.id} className={styles.record}>
                  <div>
                    <strong>
                      {data.manager ? c.contributorName : "Minha contribuição"}
                    </strong>
                    <p>
                      {date(c.date)} ·{" "}
                      {data.campaigns.find((x) => x.id === c.campaignId)
                        ?.title || c.type}
                    </p>
                    <span
                      className={
                        c.status === "confirmed"
                          ? styles.confirmed
                          : styles.pending
                      }
                    >
                      {GIVING_STATUS[c.status] ||
                        "Registro antigo — consultar Finanças"}
                    </span>
                  </div>
                  <strong>{brl(c.amount)}</strong>
                </article>
              ))}
            </div>
          </section>
          {data.manager && (
            <section className="content-section">
              <h2>Intenções pelo link público</h2>
              <p>
                Gerar um PIX não comprova pagamento. As declarações aparecem
                acima e em Finanças.
              </p>
              {!data.intents.length && (
                <p>Nenhuma intenção registrada pelo link público.</p>
              )}
              <div className={styles.records}>
                {data.intents.map((i) => (
                  <article key={i.id} className={styles.record}>
                    <div>
                      <strong>{i.name}</strong>
                      <p>{date(i.createdAt)}</p>
                      <span>{GIVING_STATUS[i.status] || "A conferir"}</span>
                    </div>
                    <div className={styles.actions}>
                      <strong>{brl(i.amount)}</strong>
                      {i.canContact && (
                        <button
                          className="btn-secondary"
                          disabled={!!busy}
                          onClick={() => void prepareContact(i.id)}
                        >
                          {busy === i.id ? "Preparando…" : "Preparar contato"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

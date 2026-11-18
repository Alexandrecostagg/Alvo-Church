"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type {
  Family,
  Group,
  MemberContribution,
  Person,
  ServiceAssignment,
} from "@alvo/types";
import { getTribeDisplayLabel, type PersonalIntegration } from "@alvo/domain";
import { manualWhatsappLink } from "@alvo/utils";
import { useAppAuth } from "../../../app/providers";
import { peopleRequest } from "../../lib/people-client";
import { financeRequest } from "../../lib/finance-client";
import { personName, statusLabels } from "./members-view";
import s from "./people.module.css";

type Detail = {
  person: Person;
  family: Family | null;
  familyPeople: Person[];
  integration: PersonalIntegration | null;
  groups: Group[];
  contributions: MemberContribution[] | null;
  assignments: ServiceAssignment[] | null;
  notices: string[];
};
const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (s?: string) =>
  s
    ? new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString(
        "pt-BR",
      )
    : "Não informado";
const contributionStatus = (s?: string) =>
  s === "confirmed"
    ? "Confirmada"
    : s === "rejected"
      ? "Rejeitada"
      : s === "pending"
        ? "Aguardando conferência"
        : "Sem confirmação registrada";
export function MemberProfileView() {
  const { personId } = useParams<{ personId: string }>();
  const { tenantReady, user, organizationId, roles } = useAppAuth();
  const allowed = roles.some((r) =>
    ["church_admin", "super_admin", "pastor", "secretary"].includes(r),
  );
  const [data, setData] = useState<Detail | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [tab, setTab] = useState("care");
  const [reload, setReload] = useState(0);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("dizimo");
  const generation = useRef(0),
    lock = useRef(false);
  const attempt = useRef({ snapshot: "", id: "" });
  useEffect(() => {
    const version = ++generation.current;
    setData(null);
    setConsent(false);
    setTab("care");
    setAmount("");
    setStatus("");
    setBusy(false);
    lock.current = false;
    attempt.current = { snapshot: "", id: "" };
    if (!tenantReady || !user || !allowed) return;
    setLoading(true);
    peopleRequest(user, { action: "detail", organizationId, personId })
      .then((result) => {
        if (generation.current === version) {
          setData(result);
          setStatus("Ficha atualizada.");
        }
      })
      .catch((e) => {
        if (generation.current === version) setStatus(e.message);
      })
      .finally(() => {
        if (generation.current === version) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [tenantReady, user, organizationId, personId, allowed, reload]);
  async function preference() {
    if (!data || !user || lock.current) return;
    const version = generation.current;
    const current =
      data.person.communicationOptOut === true ||
      !!data.person.whatsappOptOutAt;
    lock.current = true;
    setBusy(true);
    try {
      const result = await peopleRequest(user, {
        action: "preference",
        organizationId,
        personId,
        expectedOptOut: current,
        optOut: !current,
        consentConfirmed: consent,
      });
      if (version !== generation.current) return;
      setData((old) => (old ? { ...old, person: result.person } : old));
      setConsent(false);
      setStatus(
        current
          ? "Nova autorização de contato registrada."
          : "Bloqueio de contato registrado.",
      );
    } catch (e) {
      if (version === generation.current)
        setStatus(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      if (version === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  async function declare(e: React.FormEvent) {
    e.preventDefault();
    if (!user || lock.current) return;
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setStatus("Informe um valor válido.");
      return;
    }
    const snapshot = JSON.stringify({
      organizationId,
      personId,
      value,
      category,
    });
    if (snapshot !== attempt.current.snapshot)
      attempt.current = { snapshot, id: crypto.randomUUID() };
    const version = generation.current;
    lock.current = true;
    setBusy(true);
    try {
      const result = await financeRequest(user, {
        action: "declare",
        organizationId,
        personId,
        amount: value,
        type: category,
        requestId: attempt.current.id,
      });
      if (version !== generation.current) return;
      const entry = { ...result.contribution, id: result.contributionId };
      setData((old) =>
        old
          ? {
              ...old,
              contributions: [
                entry,
                ...(old.contributions || []).filter((c) => c.id !== entry.id),
              ],
            }
          : old,
      );
      attempt.current = { snapshot: "", id: "" };
      setAmount("");
      setStatus("Declaração salva. O recebimento será conferido em Finanças.");
    } catch (e) {
      if (version === generation.current)
        setStatus(
          e instanceof Error ? e.message : "Não foi possível registrar.",
        );
    } finally {
      if (version === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  const p = data?.person;
  const optedOut = p?.communicationOptOut === true || !!p?.whatsappOptOutAt;
  const whatsapp = p
    ? manualWhatsappLink(
        p,
        `Olá, ${p.preferredName || p.firstName}! Gostaríamos de saber como você está. Podemos conversar?`,
      )
    : null;
  const address = p?.address
    ? [
        p.address.street,
        p.address.number,
        p.address.district,
        p.address.city,
        p.address.state,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  const contributions = data?.contributions || [];
  const confirmed = contributions
    .filter((c) => c.status === "confirmed")
    .reduce((sum, c) => sum + c.amount, 0);
  const nextAssignments = [...(data?.assignments || [])]
    .filter(
      (a) =>
        !["declined", "absent", "cancelled"].includes(a.status) &&
        new Date(a.serviceDate).getTime() >= Date.now(),
    )
    .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
  return (
    <main className={s.page}>
      <Link href="/members">Voltar para pessoas</Link>
      <h1>{p ? personName(p) : "Ficha da pessoa"}</h1>
      {!tenantReady ? (
        <p>Verificando acesso…</p>
      ) : !allowed ? (
        <section className={s.card}>
          <p>
            A ficha completa é restrita à secretaria e aos pastores. Consulte
            seu perfil ou o painel da liderança.
          </p>
          <Link href="/app">Meu painel</Link> ·{" "}
          <Link href="/me">Meu perfil</Link>
        </section>
      ) : (
        <>
          <div className={s.actions}>
            <button
              disabled={loading || busy}
              onClick={() => setReload((v) => v + 1)}
            >
              Atualizar ficha
            </button>
            {whatsapp && (
              <Link className={s.action} href={whatsapp}>
                Preparar WhatsApp
              </Link>
            )}
            {address && (
              <a
                className={s.action}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir endereço no mapa
              </a>
            )}
          </div>
          <p role="status" className={s.status}>
            {loading ? "Carregando ficha…" : busy ? "Salvando…" : status}
          </p>
          {data && p && (
            <>
              {data.notices.map((n) => (
                <p className={s.notice} key={n}>
                  {n}
                </p>
              ))}
              <section className={s.metrics}>
                <article className={s.card}>
                  Situação pastoral
                  <strong>
                    {statusLabels[p.memberStatus] || p.memberStatus}
                  </strong>
                  <p>
                    {p.status === "active"
                      ? "Cadastro ativo"
                      : "Cadastro inativo"}
                  </p>
                </article>
                <article className={s.card}>
                  Família
                  <strong>
                    {data.family?.displayName ||
                      data.family?.familyName ||
                      "Sem família"}
                  </strong>
                </article>
                <article className={s.card}>
                  Tribo
                  <strong>
                    {p.tribePrimaryCode
                      ? getTribeDisplayLabel(p.tribePrimaryCode)
                      : "Não classificada"}
                  </strong>
                  <Link href="/tribes">Consultar tribos</Link>
                </article>
              </section>
              <div className={s.tabs} aria-label="Seções da ficha">
                {[
                  ["care", "Integração e família"],
                  ["finance", "Contribuições"],
                  ["serving", "Escalas"],
                  ["contact", "Contato e privacidade"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={tab === key}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab === "care" && (
                <div className={s.grid}>
                  <section className={s.card}>
                    <h2>Jornada de integração</h2>
                    <p>
                      <strong>
                        {data.integration?.label ||
                          "Consulta de integração indisponível"}
                      </strong>
                    </p>
                    <p>
                      A etapa exibida é a registrada em Jornadas e compartilhada
                      com o app do membro.
                    </p>
                    <Link href="/journeys">Acompanhar em Jornadas</Link>
                    <h2 style={{ marginTop: 24 }}>Células ativas</h2>
                    {data.integration ? (
                      data.groups.length ? (
                        data.groups.map((g) => (
                          <p key={g.id}>
                            <strong>{g.name}</strong>
                            <br />
                            {[g.meetingTime, g.city]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ))
                      ) : (
                        <p>Nenhuma célula ativa vinculada.</p>
                      )
                    ) : (
                      <p>
                        Não foi possível consultar os vínculos. Consulte
                        Células.
                      </p>
                    )}
                    <Link href="/groups">Consultar células e presenças</Link>
                    <h2 style={{ marginTop: 24 }}>Ensino</h2>
                    <p>
                      O progresso das aulas permanece na Escola EAD; ele ainda
                      não é consolidado nesta ficha.
                    </p>
                    <Link href="/learning/manage">Consultar cursos</Link>
                  </section>
                  <section className={s.card}>
                    <h2>Pessoas da família</h2>
                    {data.familyPeople.length ? (
                      <div className={s.list}>
                        {data.familyPeople.map((relative) => (
                          <Link
                            className={s.row}
                            key={relative.id}
                            href={`/members/${relative.id}`}
                          >
                            {personName(relative)}
                            {relative.status !== "active" ? " · Inativo" : ""}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p>Sem pessoas vinculadas a uma família disponível.</p>
                    )}
                    <p>
                      Os nomes vêm do vínculo familiar registrado. Responsáveis
                      legais são conferidos no serviço Kids.
                    </p>
                  </section>
                </div>
              )}
              {tab === "finance" && (
                <section className={s.card}>
                  <h2>Contribuições desta pessoa</h2>
                  {data.contributions === null ? (
                    <p>Consulta financeira indisponível nesta instituição.</p>
                  ) : (
                    <>
                      <p>
                        <strong>{money(confirmed)}</strong> confirmados nos{" "}
                        {contributions.length} registros exibidos.
                      </p>
                      <p>
                        Declarações e comprovantes aguardam conferência.
                        Registros antigos sem situação explícita não entram
                        neste total.
                      </p>
                      <form onSubmit={declare}>
                        <div className={s.filters}>
                          <label>
                            Valor declarado (R$)
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              disabled={busy}
                            />
                          </label>
                          <label>
                            Categoria
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              disabled={busy}
                            >
                              {[
                                ["dizimo", "Dízimo"],
                                ["oferta", "Oferta"],
                                ["missao", "Missões"],
                                ["outro", "Outro"],
                              ].map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button type="submit" disabled={busy}>
                            Registrar declaração
                          </button>
                        </div>
                      </form>
                      <div className={s.table}>
                        <table>
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Categoria</th>
                              <th>Situação</th>
                              <th>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contributions.map((c) => (
                              <tr key={c.id}>
                                <td>{date(c.date)}</td>
                                <td>{c.type}</td>
                                <td>{contributionStatus(c.status)}</td>
                                <td>{money(c.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!contributions.length && (
                        <p>Nenhuma contribuição registrada.</p>
                      )}
                    </>
                  )}
                  <div className={s.actions}>
                    <Link href="/finance">Abrir Finanças</Link>
                  </div>
                </section>
              )}
              {tab === "serving" && (
                <section className={s.card}>
                  <h2>Próximas escalas</h2>
                  {data.assignments === null ? (
                    <p>Consulta de escalas indisponível.</p>
                  ) : nextAssignments.length ? (
                    <div className={s.list}>
                      {nextAssignments.map((a) => (
                        <article className={s.row} key={a.id}>
                          <span>
                            <strong>
                              {a.ministryCode} · {a.role}
                            </strong>
                            <small>
                              {date(a.serviceDate)} ·{" "}
                              {a.status === "confirmed"
                                ? "Confirmada"
                                : "Aguardando participação"}
                            </small>
                          </span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>
                      Nenhuma escala futura encontrada nos registros
                      consultados.
                    </p>
                  )}
                  <div className={s.actions}>
                    <Link href="/serving">Consultar todas as escalas</Link>
                  </div>
                </section>
              )}
              {tab === "contact" && (
                <div className={s.grid}>
                  <section className={s.card}>
                    <h2>Contato</h2>
                    <p>
                      Telefone:{" "}
                      {p.mobilePhone || p.whatsappPhone || "Não informado"}
                    </p>
                    <p>E-mail: {p.email || "Não informado"}</p>
                    <p>Endereço: {address || "Não informado"}</p>
                    <p>Nascimento: {date(p.birthDate)}</p>
                    <h2>WhatsApp</h2>
                    <p>
                      {optedOut
                        ? "Contato bloqueado pela preferência registrada."
                        : "Sem bloqueio de contato registrado."}
                    </p>
                    {optedOut && (
                      <label>
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          disabled={busy}
                        />{" "}
                        A pessoa autorizou novamente o contato por WhatsApp.
                      </label>
                    )}
                    <div className={s.actions}>
                      <button
                        disabled={busy || (optedOut && !consent)}
                        onClick={() => void preference()}
                      >
                        {optedOut
                          ? "Registrar nova autorização"
                          : "Bloquear contato por WhatsApp"}
                      </button>
                    </div>
                  </section>
                  <section className={s.card}>
                    <h2>Esdras Passe</h2>
                    <p>
                      {p.partnerBenefitsEnabled
                        ? "Benefícios habilitados"
                        : "Benefícios não habilitados"}
                    </p>
                    <p>Identificação: {p.memberCardCode || "Não emitida"}</p>
                    <p>
                      A carteira e o QR de validação são acessados pelo próprio
                      membro no app. Esta ficha não emite um QR.
                    </p>
                    <p>Consentimento registrado: {date(p.consentLgpdAt)}</p>
                  </section>
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

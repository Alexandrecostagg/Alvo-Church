"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  campaignLocalDate,
  campaignDay,
  invitationCalendar,
  campaignCadence,
  CAMPAIGN_FIELDS,
  defaultInvitationSteps,
  campaignTemplate,
  campaignPersonalize,
} from "@alvo/domain";
import { useAppAuth } from "../../../app/providers";
import {
  campaignLabel,
  campaignDate,
  campaignStatus,
  useCampaignClient,
} from "./campaign-client";
import { MyInvitations } from "./my-invitations";
import "./campaigns.css";
import { CampaignQrScanner } from "./campaign-qr-scanner";
import {
  CampaignManualQueue,
  ManualGuestResponse,
} from "./campaign-manual-queue";
export function CampaignWorkspace() {
  const { roles } = useAppAuth();
  return roles.some((r) =>
    ["super_admin", "church_admin", "pastor", "secretary"].includes(r),
  ) ? (
    <Workspace />
  ) : (
    <MyInvitations />
  );
}
function Workspace() {
  const [scanner, setScanner] = useState(false),
    [checkinCode, setCheckinCode] = useState("");
  const acceptCode = useCallback((code: string) => {
    setCheckinCode(code);
    setScanner(false);
  }, []);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const askAi = useCampaignClient("/api/campaigns/copy");
  const [aiStatus, setAiStatus] = useState<any>(null),
    [aiObjective, setAiObjective] = useState(
      "Convidar com acolhimento, tirar dúvidas e ajudar a pessoa a chegar ao encontro.",
    ),
    [aiTone, setAiTone] = useState("acolhedor"),
    [aiProposal, setAiProposal] = useState<any>(null);
  const aiDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    void askAi({ action: "status" })
      .then(setAiStatus)
      .catch((e) => setAiStatus({ available: false, reason: e.message }));
  }, [askAi]);
  useEffect(() => {
    if (aiProposal) aiDialog.current?.showModal();
    else aiDialog.current?.close();
  }, [aiProposal]);
  const call = useCampaignClient(),
    [list, setList] = useState<any>(null),
    [detail, setDetail] = useState<any>(null),
    [draft, setDraft] = useState<any>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<any>(null),
    [ack, setAck] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => {
    const d = await call({ action: "list" });
    setList(d);
    return d;
  }, [call]);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  useEffect(() => {
    if (preview) {
      dialogRef.current?.showModal();
    } else dialogRef.current?.close();
  }, [preview]);
  async function select(id: string, cursor?: string) {
    const d = await call({ action: "detail", campaignId: id, cursor });
    if (d.campaign.status === "draft" && !d.campaign.messageStartDate) {
      const eDate = campaignLocalDate(
          d.campaign.event.startsAt,
          d.campaign.timezone,
        ),
        start = campaignDay(eDate, -d.campaign.steps[0].daysBefore);
      d.campaign = {
        ...d.campaign,
        messageStartDate: start,
        intervalDays: 1,
        inviteStartDate: [
          campaignLocalDate(Date.now(), d.campaign.timezone),
          start,
        ].sort()[0],
        copyReviewRequired: true,
        messagesReviewed: false,
      };
    }
    setDetail((old: any) =>
      cursor && old?.campaign.id === id
        ? { ...d, guests: [...old.guests, ...d.guests] }
        : d,
    );
    if (!cursor) {
      setDraft(structuredClone(d.campaign));
      setAck(false);
    }
  }
  async function run(
    work: () => Promise<unknown>,
    message = "Alteração salva.",
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      if (message) setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(body: Record<string, unknown>, message: string) {
    await run(async () => {
      await call({ campaignId: detail.campaign.id, ...body });
      await select(detail.campaign.id);
      await load();
    }, message);
  }
  function defaults(eventId: string) {
    const event = list.events.find((e: any) => e.id === eventId),
      timezone = list.timezone || "America/Belem",
      today = campaignLocalDate(Date.now(), timezone),
      eventDate = campaignLocalDate(event.startsAt, timezone),
      messageStartDate = [today, campaignDay(eventDate, -15)].sort().at(-1)!;
    const calendar = invitationCalendar(eventDate, messageStartDate, 1);
    return {
      inviteStartDate: today,
      messageStartDate,
      intervalDays: 1,
      timezone,
      messagesReviewed: false,
      steps: defaultInvitationSteps(
        calendar.length,
        calendar.map((r) => r.daysBefore),
      ),
    };
  }
  function calendarFor(d: any) {
    const event = d.event || list?.events.find((e: any) => e.id === d.eventId);
    if (!event) return [];
    const date = campaignLocalDate(
      event.startsAt,
      d.timezone || list?.timezone || "America/Belem",
    );
    return d.messageStartDate
      ? invitationCalendar(date, d.messageStartDate, d.intervalDays)
      : d.steps.map((s: any) => ({
          date: campaignDay(date, -s.daysBefore),
          daysBefore: s.daysBefore,
        }));
  }
  function rebuild() {
    try {
      const dates = calendarFor(draft);
      if (!dates.length) throw Error("Escolha um evento e as datas.");
      if (
        window.confirm(
          "Recriar os textos para este calendário? As edições e os nomes de modelos atuais serão substituídos pelas sugestões iniciais.",
        )
      ) {
        setDraft((d: any) => ({
          ...d,
          steps: defaultInvitationSteps(
            dates.length,
            dates.map((r: any) => r.daysBefore),
          ),
          messagesReviewed: false,
        }));
        setNotice("Calendário aplicado. Revise os textos antes de aprovar.");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function generateCopy() {
    await run(async () => {
      const offsets = calendarFor(draft).map((d: any) => d.daysBefore);
      const result = await askAi({
        action: "generate",
        objective: aiObjective,
        tone: aiTone,
        offsets,
      });
      setAiProposal({ steps: result.steps, draftId: draft.id, offsets });
    }, "");
  }
  function acceptCopy() {
    if (
      aiProposal.draftId !== draft.id ||
      JSON.stringify(aiProposal.offsets) !==
        JSON.stringify(calendarFor(draft).map((d: any) => d.daysBefore))
    ) {
      setError("O calendário mudou. Gere novamente.");
      setAiProposal(null);
      return;
    }
    setDraft((d: any) => ({
      ...d,
      steps: aiProposal.steps,
      messagesReviewed: false,
    }));
    setAiProposal(null);
    setNotice(
      "Sugestões da IA aplicadas ao rascunho. Revise cada etapa, aprove os textos e salve. Nenhum modelo da Meta foi criado ou aprovado automaticamente.",
    );
  }
  function create() {
    let configuration;
    try {
      configuration = defaults(list.events[0].id);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setDetail(null);
    setDraft({
      id: crypto.randomUUID(),
      version: 0,
      name: "Campanha de convidados",
      eventId: list?.events[0]?.id || "",
      hour: "10:00",
      target: 800,
      memberGoal: 1,
      maxMessages: 12000,
      status: "draft",
      deliveryMode: "manual",
      manualSenderPhone: "",
      ...configuration,
    });
    setError("");
    setNotice("");
  }
  function update(key: string, value: any) {
    setDraft((d: any) => ({
      ...d,
      [key]: value,
      messagesReviewed: key === "messagesReviewed" ? value : false,
    }));
  }
  function step(i: number, key: string, value: string) {
    setDraft((d: any) => ({
      ...d,
      messagesReviewed: ["body", "confirmedBody"].includes(key)
        ? false
        : d.messagesReviewed,
      steps: d.steps.map((s: any, n: number) =>
        n === i
          ? {
              ...s,
              [key]: value,
              ...(key === "body"
                ? { templateName: "" }
                : key === "confirmedBody"
                  ? { confirmedTemplateName: "" }
                  : {}),
            }
          : s,
      ),
    }));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const { campaign } = await call({ action: "save", ...draft });
      await select(campaign.id);
      await load();
    }, "Rascunho salvo. Revise a sequência antes de abrir as inscrições.");
  }
  async function checkin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget,
      code = String(new FormData(f).get("code") || "");
    await run(async () => {
      const d = await call({ action: "checkin", code });
      if (detail) await select(detail.campaign.id);
      f.reset();
      setCheckinCode("");
      setNotice(
        `${d.name}: presença registrada. ${d.replayed ? "Este convite já havia sido recebido." : "A ficha está disponível na Recepção."}`,
      );
    }, "");
  }
  function demo(body: string) {
    try {
      const event =
        draft?.event ||
        list?.events.find((e: any) => e.id === draft?.eventId) ||
        detail?.campaign.event;
      const date = event?.startsAt ? new Date(event.startsAt) : null;
      const timeZone = draft?.timezone || list?.timezone || "America/Belem";
      return campaignPersonalize(body, {
        convidado: "Ana",
        membro: "João",
        igreja: list?.churchName || detail?.churchName || "Igreja",
        evento: event?.name || "Evento selecionado",
        data:
          date?.toLocaleDateString("pt-BR", { timeZone }) || "Data do evento",
        horario:
          date?.toLocaleTimeString("pt-BR", {
            timeZone,
            hour: "2-digit",
            minute: "2-digit",
          }) || "Horário do evento",
        local: event?.location || "Local do evento",
      }).text;
    } catch (e) {
      return (e as Error).message;
    }
  }
  useEffect(() => {
    if (error || notice) messageRef.current?.focus();
  }, [error, notice]);
  useEffect(() => {
    if (list && location.hash === "#recepcao")
      document.getElementById("recepcao")?.scrollIntoView({ block: "start" });
  }, [list]);
  let dates: { date: string; daysBefore: number }[] = [],
    calendarError = "";
  if (draft) {
    try {
      dates = calendarFor(draft);
    } catch (e) {
      calendarError = (e as Error).message;
    }
  }
  if (draft?.messageStartDate && draft.inviteStartDate > draft.messageStartDate)
    calendarError =
      "A abertura dos convites deve ocorrer até o primeiro lembrete.";
  const calendarMatches =
    !!draft &&
    dates.length === draft.steps.length &&
    dates.every((r, i) => r.daysBefore === draft.steps[i].daysBefore);
  const dirty =
    !!detail && JSON.stringify(draft) !== JSON.stringify(detail.campaign);
  const frozen = draft?.status !== "draft",
    c = detail?.campaign,
    st = detail?.stats || {};
  return (
    <main className="campaign-page" aria-busy={busy}>
      <Link href="/events">← Eventos</Link>
      <header>
        <div>
          <span className="campaign-eyebrow">
            Convite · cuidado · acolhimento
          </span>
          <h1>Campanhas de convidados</h1>
          <p className="campaign-muted">
            Cada membro tem seu convite. Cada pessoa escolhe como participar e
            receber lembretes.
          </p>
        </div>
        <nav>
          {c?.deliveryMode === "manual" && (
            <a className="campaign-button" href="#envios-manuais">
              Envios de hoje
            </a>
          )}
          <a className="campaign-button" href="#recepcao">
            Receber convidado
          </a>
          <Link className="campaign-button" href="/my-invites">
            Meus convidados
          </Link>
          <button
            className="primary"
            disabled={busy || !list?.events.length}
            onClick={create}
          >
            Nova campanha
          </button>
        </nav>
      </header>
      {error && (
        <p
          ref={messageRef}
          tabIndex={-1}
          role="alert"
          className="campaign-notice campaign-error"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          ref={error ? undefined : messageRef}
          tabIndex={-1}
          role="status"
          className="campaign-notice"
        >
          {notice}
        </p>
      )}
      {!list && !error && <p role="status">Carregando campanhas…</p>}
      {list && (
        <>
          <section className="campaign-notice">
            <strong>
              Envio manual assistido disponível · API automática:{" "}
              {list.whatsappConnected
                ? list.paidMessagesEnabled
                  ? "conectado; requer templates e ativação por campanha"
                  : "conectado; mensagens pagas desativadas"
                : "conexão Meta pendente"}
            </strong>
            <p>
              No modo manual, o Esdras prepara cada texto e a equipe envia pelo
              WhatsApp da igreja, sem tarifa da API ou conexão Meta. Automação
              pela API é opcional, exige conexão, modelos aprovados e tem
              cobrança.
            </p>
          </section>
          {!list.events.length && (
            <p className="campaign-notice">
              Cadastre primeiro um evento gratuito, futuro e publicado em{" "}
              <Link href="/events">Eventos</Link>.
            </p>
          )}
          <label className="campaign-field">
            Campanha
            <select
              disabled={busy}
              value={c?.id || ""}
              onChange={(e) => {
                if (e.target.value) void run(() => select(e.target.value), "");
              }}
            >
              <option value="">Selecione uma campanha</option>
              {list.campaigns.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {campaignLabel(v)}
                </option>
              ))}
            </select>
          </label>
          {list.campaigns.length === 0 && !draft && (
            <section className="campaign-card">
              <h2>Transforme um evento em uma missão de convites</h2>
              <p>
                Defina a meta, revise os textos e abra as inscrições. O membro
                recebe um link próprio no app e na web; o convidado recebe um QR
                para a recepção.
              </p>
              <button disabled={!list.events.length} onClick={create}>
                Preparar primeira campanha
              </button>
            </section>
          )}
        </>
      )}
      {c?.deliveryMode === "manual" && c.status !== "draft" && (
        <CampaignManualQueue
          key={c.id}
          campaign={c}
          onChanged={async () => {
            await select(c.id);
          }}
        />
      )}
      {draft && (
        <section className="campaign-card">
          <header>
            <div>
              <h2>{c ? c.name : "Preparar campanha"}</h2>
              <span className="campaign-badge">{campaignLabel(draft)}</span>
            </div>
            {dirty && (
              <p className="campaign-notice">
                Há alterações não salvas. Salve antes de abrir as inscrições ou
                ativar os lembretes.
              </p>
            )}
            {c && (
              <button
                disabled={busy}
                onClick={() =>
                  void run(() => select(c.id), "Dados atualizados.")
                }
              >
                Atualizar
              </button>
            )}
          </header>
          <details open={!frozen || draft.deliveryMode !== "manual"}>
            <summary>Configuração, calendário e textos da campanha</summary>
            <form onSubmit={(e) => void save(e)}>
              <div className="campaign-grid">
                <label className="campaign-field">
                  Como a equipe enviará as mensagens
                  <select
                    disabled={frozen || busy}
                    value={draft.deliveryMode || "api"}
                    onChange={(e) => update("deliveryMode", e.target.value)}
                  >
                    <option value="manual">
                      Manual assistido · sem tarifa da API
                    </option>
                    <option value="api">
                      Automático · API oficial com cobrança
                    </option>
                  </select>
                </label>
                {draft.deliveryMode === "manual" && (
                  <label className="campaign-field">
                    WhatsApp da igreja para os envios
                    <input
                      type="tel"
                      maxLength={25}
                      placeholder="55 + DDD + número"
                      disabled={frozen || busy}
                      value={draft.manualSenderPhone || ""}
                      onChange={(e) =>
                        update("manualSenderPhone", e.target.value)
                      }
                    />
                    <small>
                      Use esse número no WhatsApp ou WhatsApp Web da equipe. O
                      link não troca a conta aberta.
                    </small>
                  </label>
                )}
                <label className="campaign-field">
                  Nome da campanha
                  <input
                    required
                    maxLength={120}
                    disabled={frozen || busy}
                    value={draft.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </label>
                <label className="campaign-field">
                  Evento
                  <select
                    required
                    disabled={frozen || busy}
                    value={draft.eventId}
                    onChange={(e) => {
                      if (
                        e.target.value &&
                        window.confirm(
                          "Trocar o evento e recriar calendário e textos?",
                        )
                      )
                        setDraft((d: any) => ({
                          ...d,
                          eventId: e.target.value,
                          ...defaults(e.target.value),
                        }));
                    }}
                  >
                    {frozen ? (
                      <option value={draft.eventId}>{draft.event.name}</option>
                    ) : (
                      <>
                        <option value="">Escolha um evento</option>
                        {list?.events.map((e: any) => (
                          <option key={e.id} value={e.id}>
                            {e.name} · {campaignDate(e.startsAt)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </label>
                <label className="campaign-field">
                  Meta de convidados
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    required
                    disabled={frozen || busy}
                    value={draft.target}
                    onChange={(e) => update("target", +e.target.value)}
                  />
                </label>
                <label className="campaign-field">
                  Missão por membro
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    disabled={frozen || busy}
                    value={draft.memberGoal}
                    onChange={(e) => update("memberGoal", +e.target.value)}
                  />
                </label>
                <label className="campaign-field">
                  Abertura dos convites
                  <input
                    type="date"
                    required
                    disabled={frozen || busy}
                    value={
                      draft.inviteStartDate ||
                      campaignLocalDate(draft.createdAt, draft.timezone)
                    }
                    onChange={(e) => update("inviteStartDate", e.target.value)}
                  />
                  <small>
                    Data em que os membros poderão convidar e as inscrições
                    serão liberadas.
                  </small>
                </label>
                <label className="campaign-field">
                  Primeiro lembrete pelo WhatsApp
                  <input
                    type="date"
                    required
                    disabled={frozen || busy}
                    value={draft.messageStartDate || dates[0]?.date || ""}
                    onChange={(e) => update("messageStartDate", e.target.value)}
                  />
                </label>
                <label className="campaign-field">
                  Intervalo entre mensagens (dias)
                  <input
                    type="number"
                    min={1}
                    max={30}
                    required
                    disabled={frozen || busy}
                    value={draft.intervalDays || 1}
                    onChange={(e) => update("intervalDays", +e.target.value)}
                  />
                  <small>
                    1 = todos os dias; 2 = dia sim, dia não; 7 = semanal.
                  </small>
                </label>
                <label className="campaign-field">
                  Horário dos lembretes
                  <input
                    type="time"
                    required
                    disabled={frozen || busy}
                    value={draft.hour}
                    onChange={(e) => update("hour", e.target.value)}
                  />
                  <small className="campaign-muted">
                    Fuso: {draft.timezone || "o da instituição"}.{" "}
                    {draft.deliveryMode === "manual"
                      ? "A fila fica disponível a partir deste horário, até o fim do dia. Não há envio automático."
                      : "Entregas podem ocorrer nas próximas 4 horas."}
                  </small>
                </label>
                {draft.deliveryMode !== "manual" && (
                  <label className="campaign-field">
                    Teto total de tentativas de mensagem
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      required
                      disabled={frozen || busy}
                      value={draft.maxMessages}
                      onChange={(e) => update("maxMessages", +e.target.value)}
                    />
                    <small className="campaign-muted">
                      Teto de quantidade; valores são definidos pela
                      Meta/provedor. Falhas no provedor podem consumir este
                      teto.
                    </small>
                  </label>
                )}
              </div>
              <section className="campaign-notice">
                <h3>Calendário de mensagens</h3>
                {calendarError ? (
                  <p role="alert">{calendarError}</p>
                ) : (
                  <>
                    <p>
                      {dates.length} mensagens por convidado,{" "}
                      {campaignCadence(draft.intervalDays || 1)}, até a véspera
                      do evento. Quem se inscrever depois do início recebe
                      apenas as próximas etapas.
                    </p>
                    <ol className="campaign-date-list">
                      {dates.map((d, i) => (
                        <li key={d.date}>
                          {i + 1}. {d.date.split("-").reverse().join("/")} ·{" "}
                          {draft.hour} · {d.daysBefore} dia(s) antes
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                {!frozen && !calendarMatches && !calendarError && (
                  <>
                    <p>
                      O calendário mudou. Recrie a sequência antes de salvar ou
                      gerar novos textos.
                    </p>
                    <button type="button" disabled={busy} onClick={rebuild}>
                      Recriar sequência para estas datas
                    </button>
                  </>
                )}
              </section>
              {!frozen && (
                <section className="campaign-card">
                  <h3>Criar textos variados com IA</h3>
                  <p>
                    A IA prepara a sequência inteira com assuntos diferentes,
                    sem receber nomes ou telefones dos convidados. Os dados
                    pessoais são preenchidos pelo sistema na hora de enviar.
                  </p>
                  <label className="campaign-field">
                    Objetivo e orientações
                    <textarea
                      maxLength={1000}
                      value={aiObjective}
                      disabled={busy}
                      onChange={(e) => setAiObjective(e.target.value)}
                    />
                    <small>
                      Descreva a intenção da campanha. Evite dados pessoais.
                    </small>
                  </label>
                  <label className="campaign-field">
                    Tom
                    <select
                      value={aiTone}
                      disabled={busy}
                      onChange={(e) => setAiTone(e.target.value)}
                    >
                      <option value="acolhedor">Acolhedor</option>
                      <option value="simples">Simples e direto</option>
                      <option value="reverente">Reverente</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="primary"
                    disabled={
                      busy ||
                      !calendarMatches ||
                      !!calendarError ||
                      !aiStatus?.available ||
                      !aiObjective.trim()
                    }
                    onClick={() => void generateCopy()}
                  >
                    {busy ? "Processando…" : "Gerar sequência com IA"}
                  </button>
                  <p className="campaign-muted">
                    Uma geração da sequência usa uma unidade da cota de
                    Sabedoria Pastoral. Tentativas iniciadas no provedor contam
                    mesmo em caso de falha.{" "}
                    {aiStatus?.reason ||
                      "Revise antes de aplicar. A IA não aprova modelos na Meta."}
                  </p>
                </section>
              )}
              <details>
                <summary>
                  Sequência de {draft.steps.length} mensagens ·{" "}
                  {draft.deliveryMode === "manual"
                    ? "textos para envio manual"
                    : "textos e modelos WhatsApp"}
                </summary>
                <p className="campaign-muted">
                  Campos disponíveis:{" "}
                  {CAMPAIGN_FIELDS.map((f) => `{{${f}}}`).join(", ")}. Revise os
                  textos e a frequência com a equipe antes de ativar. A primeira
                  mensagem de cada pessoa sempre apresenta o membro que
                  convidou.
                </p>
                {draft.steps.map((s: any, i: number) => (
                  <details key={s.daysBefore}>
                    <summary>
                      {i + 1}. {dates[i]?.date.split("-").reverse().join("/")} ·{" "}
                      {s.daysBefore} dia(s) antes ·{" "}
                      {s.focus ||
                        (i === 0 ? "apresentação pessoal" : "lembrete")}
                    </summary>
                    <div className="campaign-grid">
                      <label className="campaign-field">
                        Para quem ainda não confirmou
                        <textarea
                          required
                          maxLength={900}
                          disabled={frozen || busy}
                          value={s.body}
                          onChange={(e) => step(i, "body", e.target.value)}
                        />
                      </label>
                      <label className="campaign-field">
                        Para quem já confirmou
                        <textarea
                          required
                          maxLength={900}
                          disabled={frozen || busy}
                          value={s.confirmedBody}
                          onChange={(e) =>
                            step(i, "confirmedBody", e.target.value)
                          }
                        />
                      </label>
                    </div>
                    <details>
                      <summary>
                        {draft.deliveryMode === "manual"
                          ? "Prévia com nomes fictícios"
                          : "Prévia com dados fictícios e texto para aprovação"}
                      </summary>
                      <p className="campaign-sequence">{demo(s.body)}</p>
                      <p className="campaign-sequence">
                        {demo(s.confirmedBody)}
                      </p>
                      {draft.deliveryMode !== "manual" && (
                        <>
                          {[s.body, s.confirmedBody].map((b, j) => {
                            try {
                              return (
                                <pre key={j} className="campaign-sequence">
                                  {campaignTemplate(b).template}
                                </pre>
                              );
                            } catch {
                              return null;
                            }
                          })}
                          <p>
                            Cadastre cada versão no WhatsApp Manager com estes
                            campos na mesma ordem. Depois vincule os nomes
                            aprovados abaixo.
                          </p>
                        </>
                      )}
                    </details>
                    {draft.deliveryMode !== "manual" && (
                      <div className="campaign-grid">
                        <label className="campaign-field">
                          Modelo aprovado · convite
                          <input
                            pattern="[a-z0-9_]*"
                            maxLength={128}
                            disabled={busy || draft.status === "closed"}
                            value={s.templateName}
                            onChange={(e) =>
                              step(i, "templateName", e.target.value)
                            }
                          />
                        </label>
                        <label className="campaign-field">
                          Modelo aprovado · confirmado
                          <input
                            pattern="[a-z0-9_]*"
                            maxLength={128}
                            disabled={busy || draft.status === "closed"}
                            value={s.confirmedTemplateName}
                            onChange={(e) =>
                              step(i, "confirmedTemplateName", e.target.value)
                            }
                          />
                        </label>
                      </div>
                    )}
                  </details>
                ))}
              </details>
              {!frozen && (
                <label className="campaign-check">
                  <input
                    type="checkbox"
                    checked={draft.messagesReviewed === true}
                    onChange={(e) =>
                      update("messagesReviewed", e.target.checked)
                    }
                    disabled={busy || !calendarMatches}
                  />
                  <span>
                    Revisei e aprovo os textos, as datas e a frequência para
                    esta campanha.{" "}
                    {draft.deliveryMode === "manual"
                      ? "A equipe enviará cada mensagem manualmente pelo WhatsApp da igreja."
                      : "Modelos WhatsApp ainda precisam ser aprovados e vinculados separadamente."}
                  </span>
                </label>
              )}
              {!frozen ? (
                <button
                  className="primary"
                  style={{ marginTop: 16 }}
                  disabled={busy || !!calendarError || !calendarMatches}
                  type="submit"
                >
                  Salvar rascunho
                </button>
              ) : (
                <p className="campaign-muted">
                  Conteúdo e data ficam fixos após a abertura. Se o evento
                  mudar, pause esta campanha e prepare outra.{" "}
                  {draft.deliveryMode === "manual"
                    ? "Cada envio é feito e registrado pela equipe."
                    : "Os nomes dos modelos podem ser vinculados quando a Meta estiver pronta."}
                </p>
              )}
            </form>
          </details>
          {frozen && c?.status !== "closed" && c?.deliveryMode !== "manual" && (
            <button
              disabled={busy}
              onClick={() =>
                void action(
                  {
                    action: "templates",
                    templates: draft.steps.map((s: any) => ({
                      templateName: s.templateName,
                      confirmedTemplateName: s.confirmedTemplateName,
                    })),
                  },
                  "Modelos vinculados. Os envios permanecem desativados até nova autorização.",
                )
              }
            >
              Salvar nomes dos modelos
            </button>
          )}
          {c && (
            <div className="campaign-actions" style={{ marginTop: 20 }}>
              {["draft", "paused"].includes(c.status) && (
                <button
                  className="primary"
                  disabled={
                    busy ||
                    dirty ||
                    (c.copyReviewRequired && !c.messagesReviewed)
                  }
                  onClick={() =>
                    void action(
                      { action: "state", status: "active" },
                      c.deliveryMode === "manual"
                        ? "Campanha publicada. Os convites abrem na data configurada; a equipe usa a fila de envios manuais."
                        : "Campanha publicada. Os convites abrem na data configurada; WhatsApp exige ativação separada.",
                    )
                  }
                >
                  {c.status === "draft"
                    ? "Abrir ou agendar convites"
                    : "Retomar inscrições"}
                </button>
              )}
              {c.status === "active" && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(
                      { action: "state", status: "paused" },
                      "Campanha pausada. Inscrições e envios automáticos foram interrompidos.",
                    )
                  }
                >
                  Pausar campanha
                </button>
              )}
              {c.status !== "closed" && (
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Encerrar esta campanha? Não será possível reabri-la. Os dados serão preservados.",
                      )
                    )
                      void action(
                        { action: "state", status: "closed" },
                        "Campanha encerrada.",
                      );
                  }}
                >
                  Encerrar campanha
                </button>
              )}
            </div>
          )}
        </section>
      )}
      {detail && (
        <>
          <section className="campaign-stats">
            {[
              ["Inscritos", st.registered],
              ["Confirmados", st.confirmed],
              ["Compareceram", st.attended],
              c.deliveryMode === "manual"
                ? ["Autorizaram contato", st.consentRequested]
                : ["Números verificados", st.verified],
            ].map(([label, value]) => (
              <div key={label} className="campaign-stat">
                {label}
                <strong>{value || 0}</strong>
              </div>
            ))}
          </section>
          {c.deliveryMode === "manual" ? (
            c.status === "draft" ? (
              <p className="campaign-notice">
                Após revisar e abrir a campanha, a fila de envios manuais
                aparecerá no início desta tela nas datas escolhidas.
              </p>
            ) : null
          ) : (
            <section className="campaign-card">
              <h2>Lembretes pelo WhatsApp</h2>
              <p>
                {c.deliveryEnabled ? "Ativados" : "Desativados"} ·{" "}
                {detail.budget} de {c.maxMessages} tentativas. Entregues:{" "}
                {st.delivered || 0} · Lidos: {st.read || 0} · Falhas:{" "}
                {st.failed || 0} · Resultado incerto: {st.uncertain || 0}.
              </p>
              <p className="campaign-muted">
                Autorização no formulário: {st.consentRequested || 0}. Só
                números confirmados pelo próprio convidado podem receber. Uma
                resposta pedindo ajuda pausa a automação; desistência e SAIR
                impedem novos lembretes. A confirmação de presença muda o texto
                seguinte.
              </p>
              {c.deliveryEnabled ? (
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(
                      { action: "delivery", enabled: false },
                      "Lembretes desativados.",
                    )
                  }
                >
                  Desativar lembretes
                </button>
              ) : (
                <>
                  <label className="campaign-check">
                    <input
                      type="checkbox"
                      checked={ack}
                      onChange={(e) => setAck(e.target.checked)}
                    />
                    <span>
                      Autorizo até {c.maxMessages} tentativas para esta
                      campanha, sujeito à cobrança do provedor. Revisei os
                      textos, a frequência e os modelos aprovados.
                    </span>
                  </label>
                  <button
                    disabled={
                      busy ||
                      !ack ||
                      dirty ||
                      !list?.paidMessagesEnabled ||
                      c.status !== "active"
                    }
                    onClick={() =>
                      void action(
                        {
                          action: "delivery",
                          enabled: true,
                          acknowledgeBudget: ack,
                        },
                        "Lembretes autorizados. Serão processados apenas nos horários previstos e para convidados elegíveis.",
                      )
                    }
                  >
                    Ativar lembretes
                  </button>
                </>
              )}
            </section>
          )}

          <section className="campaign-card">
            <h2>Acompanhamento dos convidados</h2>
            <p className="campaign-muted">
              Exibindo {detail.guests.length} de {st.registered || 0}. Os
              registros de oração e contato abaixo são internos; não enviam
              mensagens.
            </p>
            <div className="campaign-scroll">
              <table className="campaign-table">
                <thead>
                  <tr>
                    <th>Convidado</th>
                    <th>Convite e resposta</th>
                    <th>WhatsApp</th>
                    <th>Acompanhamento</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.guests.map((g: any) => (
                    <tr key={g.id}>
                      <td>
                        <strong>{g.name}</strong>
                        <p>{g.phone}</p>
                        <small>
                          {g.allowInviterView
                            ? "Primeiro nome compartilhado com o membro"
                            : "Reservado para a equipe"}
                        </small>
                      </td>
                      <td>
                        {g.inviterName}
                        <p>
                          <span className="campaign-badge">
                            {campaignStatus[g.status] || g.status}
                          </span>
                        </p>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run(
                              async () =>
                                setPreview(
                                  await call({
                                    action: "preview",
                                    campaignId: c.id,
                                    guestId: g.id,
                                  }),
                                ),
                              "",
                            )
                          }
                        >
                          Ver mensagens
                        </button>
                      </td>
                      <td>
                        {g.optOut
                          ? "Cancelou mensagens"
                          : !g.consent
                            ? "Sem autorização"
                            : c.deliveryMode === "manual"
                              ? g.handoff
                                ? "Pausado para atendimento"
                                : "Autorizado para contato manual"
                              : !g.verifiedAt
                                ? "Aguardando confirmar número"
                                : g.handoff
                                  ? "Pausado para atendimento"
                                  : "Número confirmado"}
                        {c.deliveryMode === "manual" && g.manualLastSentAt && (
                          <p>
                            Último envio informado:{" "}
                            {campaignDate(g.manualLastSentAt, c.timezone)}
                          </p>
                        )}
                      </td>
                      <td>
                        {c.deliveryMode === "manual" && (
                          <ManualGuestResponse
                            disabled={busy}
                            save={async (response) => {
                              await action(
                                {
                                  action: "manual-response",
                                  guestId: g.id,
                                  response,
                                  acknowledgeResponse: true,
                                },
                                "Resposta registrada pela equipe. A fila respeitará essa escolha.",
                              );
                            }}
                          />
                        )}
                        <div className="campaign-actions">
                          <button
                            disabled={busy}
                            onClick={() =>
                              void action(
                                {
                                  action: "guest",
                                  guestId: g.id,
                                  operation: "prayed",
                                },
                                "Oração registrada, sem envio de mensagem.",
                              )
                            }
                          >
                            {g.lastPrayedAt
                              ? "Registrar nova oração"
                              : "Registrar oração"}
                          </button>
                          <button
                            disabled={busy}
                            onClick={() =>
                              void action(
                                {
                                  action: "guest",
                                  guestId: g.id,
                                  operation: "handoff",
                                  value: !g.handoff,
                                },
                                g.handoff
                                  ? "Atendimento concluído. Apenas etapas futuras poderão ser enviadas."
                                  : "Automação pausada para atendimento.",
                              )
                            }
                          >
                            {g.handoff
                              ? "Concluir atendimento"
                              : "Pausar para contato"}
                          </button>
                          {g.status === "attended" && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                void action(
                                  {
                                    action: "guest",
                                    guestId: g.id,
                                    operation: "followup",
                                  },
                                  "Acompanhamento registrado.",
                                )
                              }
                            >
                              {g.followUpDoneAt
                                ? "Contato registrado"
                                : "Registrar contato após visita"}
                            </button>
                          )}
                        </div>
                        {g.lastPrayedAt && (
                          <small>
                            Última oração:{" "}
                            {campaignDate(g.lastPrayedAt, c.timezone)}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {detail.nextCursor && (
              <button
                disabled={busy}
                style={{ marginTop: 18 }}
                onClick={() =>
                  void run(() => select(c.id, detail.nextCursor), "")
                }
              >
                Carregar mais 50 convidados
              </button>
            )}
          </section>
        </>
      )}
      {list && (
        <section className="campaign-card" id="recepcao">
          <h2>Receber um convidado</h2>
          <p>
            Este atendimento recebe pulseiras de qualquer campanha desta igreja.
            Leia o QR com um leitor conectado ou cole o código INV. O check-in
            abre 12 horas antes do evento e termina 24 horas depois. A
            identificação também estará na ficha de visitante.
          </p>
          <form className="campaign-actions" onSubmit={(e) => void checkin(e)}>
            <label
              className="campaign-field"
              style={{ flex: 1, minWidth: 220 }}
            >
              Código da pulseira
              <input
                name="code"
                value={checkinCode}
                onChange={(e) => setCheckinCode(e.target.value)}
                placeholder="INV-…"
                autoComplete="off"
                required
              />
            </label>
            <button className="primary" disabled={busy} type="submit">
              Registrar presença
            </button>
          </form>
          <button disabled={busy} onClick={() => setScanner(true)}>
            Ler QR com a câmera
          </button>
          <Link href="/reception">Abrir Recepção →</Link>
        </section>
      )}
      {aiProposal && (
        <dialog
          ref={aiDialog}
          className="campaign-dialog"
          aria-label="Sugestões da IA"
          onCancel={() => setAiProposal(null)}
        >
          <button autoFocus onClick={() => setAiProposal(null)}>
            Fechar sugestões
          </button>
          <h2>Revise a sequência sugerida</h2>
          <p>
            As mensagens ainda não foram salvas nem enviadas. Confira o conteúdo
            antes de aplicar; os nomes abaixo são fictícios.
          </p>
          {aiProposal.steps.map((s: any, i: number) => (
            <section key={i}>
              <h3>
                {s.daysBefore} dia(s) antes · {s.focus}
              </h3>
              <p className="campaign-sequence">{demo(s.body)}</p>
              <p className="campaign-sequence">
                Já confirmou: {demo(s.confirmedBody)}
              </p>
            </section>
          ))}
          <button className="primary" onClick={acceptCopy}>
            Aplicar ao rascunho para revisão
          </button>
        </dialog>
      )}
      {scanner && (
        <CampaignQrScanner
          onCode={acceptCode}
          onClose={() => setScanner(false)}
        />
      )}
      {preview && (
        <dialog
          ref={dialogRef}
          className="campaign-dialog"
          onCancel={() => setPreview(null)}
          aria-label="Prévia das mensagens"
        >
          <button autoFocus onClick={() => setPreview(null)}>
            Fechar prévia
          </button>
          <h2>Sequência personalizada</h2>
          <p>
            Prévia das etapas futuras. Se a mensagem inicial ainda não tiver
            sido entregue, ela será usada na primeira tentativa. As demais
            dependem da entrega inicial e da resposta da pessoa.
          </p>
          {preview.messages.length === 0 && <p>Não há etapas futuras.</p>}
          {preview.messages.map((m: any, i: number) => (
            <section key={i}>
              <h3>{campaignDate(m.scheduledAt, c?.timezone)}</h3>
              <span className="campaign-badge">
                {m.eligible
                  ? "Elegível, sujeito à ativação e ao teto"
                  : "Não elegível neste momento"}
              </span>
              <p className="campaign-sequence">{m.text}</p>
            </section>
          ))}
        </dialog>
      )}
    </main>
  );
}

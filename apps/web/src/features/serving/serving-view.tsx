"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Plus,
  Settings2,
  RefreshCw,
  Calendar,
  Users,
  X,
  MessageSquare,
} from "lucide-react";
import type { ServiceAssignment, ServiceTeam } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { SERVING_STATUSES, servingDate } from "./serving-contract";
type PersonOption = {
  id: string;
  firstName: string;
  lastName?: string;
  memberStatus?: string;
  hasPhone: boolean;
};
type Snapshot = {
  teams: ServiceTeam[];
  assignments: ServiceAssignment[];
  people: PersonOption[];
  timezone: string;
  whatsappConnected: boolean;
  swaps: Array<{
    id: string;
    assignmentId: string;
    requestorPersonId: string;
    proposedReplacementPersonId?: string;
    targetPersonId?: string;
    note?: string;
  }>;
};
const EMPTY: Snapshot = {
  teams: [],
  assignments: [],
  people: [],
  timezone: "America/Belem",
  whatsappConnected: false,
  swaps: [],
};
const PUSH_LABEL: Record<string, string> = {
  pending: "Aviso push pendente",
  sending: "Envio push em andamento",
  accepted: "Push aceito pelo provedor; entrega no aparelho não confirmada",
  failed: "Push não aceito pelo provedor",
  uncertain: "Resultado do push incerto; sem reenvio automático",
  no_device: "App: sem aparelho habilitado para notificações",
  unlinked: "App: conta do membro ainda não vinculada",
  test_mode: "Push simulado: nenhum aparelho contatado",
};
const blankArea = () => ({
  id: "",
  name: "",
  summary: "",
  roles: "",
  targetVolunteers: 1,
  status: "active",
});
const blankScale = () => ({
  teamId: "",
  role: "",
  serviceName: "",
  date: "",
  time: "",
  durationMinutes: 120,
  personIds: [] as string[],
});
function fullName(p: PersonOption) {
  return `${p.firstName} ${p.lastName || ""}`.trim();
}
function Dialog({
  title,
  busy,
  onClose,
  children,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="serving-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-label={title}
    >
      <header>
        <h2>{title}</h2>
        <button
          type="button"
          className="serving-icon-button"
          disabled={busy}
          aria-label="Fechar formulário"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function ServingView() {
  const { user, organizationId, roles } = useAppAuth();
  const canManage = roles.some((r) =>
    ["super_admin", "church_admin", "pastor", "secretary"].includes(r),
  );
  const [data, setData] = useState<Snapshot>(EMPTY),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<"area" | "scale" | "replace" | null>(
      null,
    ),
    [area, setArea] = useState(blankArea),
    [draft, setDraft] = useState(blankScale);
  const [replacement, setReplacement] = useState({
    assignmentId: "",
    personId: "",
  });
  const [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [search, setSearch] = useState(""),
    [areaFilter, setAreaFilter] = useState(""),
    [dateFilter, setDateFilter] = useState(""),
    [statusFilter, setStatusFilter] = useState("");
  const [preparedLink, setPreparedLink] = useState(""),
    [whatsappAttempt, setWhatsappAttempt] = useState<{
      id: string;
      requestId: string;
    } | null>(null);
  const attemptRef = useRef(crypto.randomUUID()),
    writeRef = useRef(false),
    mutationVersion = useRef(0),
    sequence = useRef(0),
    scope = useRef(organizationId);
  scope.current = organizationId;
  const call = useCallback(
    async (body: Record<string, unknown>) => {
      if (!user) throw new Error("Entre na sua conta.");
      const response = await fetch("/api/serving", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ organizationId, ...body }),
        signal: AbortSignal.timeout(45000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível concluir.");
      return result;
    },
    [organizationId, user],
  );
  const load = useCallback(
    async (silent = false) => {
      const run = ++sequence.current;
      if (!silent) setLoading(true);
      setError("");
      try {
        const next = await call({ action: "snapshot" });
        if (run === sequence.current) setData(next);
      } catch (e) {
        if (run === sequence.current)
          setError(
            e instanceof Error ? e.message : "Falha ao carregar escalas.",
          );
      } finally {
        if (run === sequence.current) setLoading(false);
      }
    },
    [call],
  );
  useEffect(() => {
    mutationVersion.current++;
    writeRef.current = false;
    setBusy(false);
    setData(EMPTY);
    setDialog(null);
    setNotice("");
    setPreparedLink("");
    if (canManage) void load();
    else setLoading(false);
    return () => {
      sequence.current++;
    };
  }, [load, canManage]);
  useEffect(() => {
    if (!canManage) return;
    const refresh = () => {
      if (!document.hidden && !writeRef.current) void load(true);
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load, canManage]);
  const activeTeams = data.teams.filter((t) => t.status === "active");
  const selectedTeam = data.teams.find((t) => t.id === draft.teamId);
  const filtered = data.assignments
    .filter(
      (a) =>
        (!areaFilter ||
          a.serviceTeamId === areaFilter ||
          a.ministryCode ===
            data.teams.find((t) => t.id === areaFilter)?.code) &&
        (!dateFilter ||
          new Intl.DateTimeFormat("en-CA", {
            timeZone: data.timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(a.serviceDate)) === dateFilter) &&
        (!statusFilter || a.status === statusFilter),
    )
    .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
  const candidates = data.people.filter((p) =>
    fullName(p)
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const pending = filtered.filter((a) => a.status === "pending").length;
  function openScale() {
    attemptRef.current = crypto.randomUUID();
    setDraft(blankScale());
    setSearch("");
    setFormError("");
    setDialog(activeTeams.length ? "scale" : "area");
    setArea(blankArea());
  }
  function openArea(team?: ServiceTeam) {
    setArea(
      team
        ? {
            id: team.id,
            name: team.name,
            summary: team.summary || "",
            roles: (team.roles || []).join("\n"),
            targetVolunteers: team.targetVolunteers || 1,
            status: team.status,
          }
        : blankArea(),
    );
    setFormError("");
    setDialog("area");
  }
  async function mutate(
    body: Record<string, unknown>,
    message: string,
    close = false,
  ) {
    if (writeRef.current) return;
    writeRef.current = true;
    const job = ++mutationVersion.current;
    setBusy(true);
    setFormError("");
    setError("");
    setNotice(
      body.action === "whatsapp"
        ? "Solicitando envio ao WhatsApp…"
        : body.action === "notify"
          ? "Preparando aviso no app…"
          : "Salvando alteração…",
    );
    const org = organizationId;
    try {
      const result = await call(body);
      if (scope.current !== org) return;
      setNotice(message);
      if (close) setDialog(null);
      await load(true);
      return scope.current === org && job === mutationVersion.current
        ? result
        : undefined;
    } catch (e) {
      if (scope.current === org) {
        setNotice("");
        const message =
          e instanceof Error ? e.message : "Não foi possível salvar.";
        if (dialog) setFormError(message);
        else setError(message);
      }
    } finally {
      if (job === mutationVersion.current) {
        writeRef.current = false;
        setBusy(false);
      }
    }
  }
  async function saveArea(e: FormEvent) {
    e.preventDefault();
    const result = await mutate(
      {
        action: "save-area",
        ...area,
        id: area.id || undefined,
        roles: area.roles
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      },
      "Área salva. Nome e funções já estão disponíveis.",
      true,
    );
    if (result?.team && !area.id && result.team.status === "active") {
      attemptRef.current = crypto.randomUUID();
      setDraft({
        ...blankScale(),
        teamId: result.team.id,
        role: result.team.roles[0],
      });
      setDialog("scale");
    }
  }
  async function create(e: FormEvent) {
    e.preventDefault();
    await mutate(
      { action: "create", requestId: attemptRef.current, ...draft },
      "Escala salva. Confira abaixo o aviso do app e, se desejar, prepare o WhatsApp.",
      true,
    );
  }
  async function prepareWhatsapp(a: ServiceAssignment) {
    if (writeRef.current) return;
    writeRef.current = true;
    const job = ++mutationVersion.current;
    setBusy(true);
    setError("");
    setPreparedLink("");
    setNotice("Preparando mensagem para envio manual…");
    const org = organizationId;
    try {
      const result = await call({
        action: "manual-whatsapp",
        assignmentId: a.id,
        requestId: crypto.randomUUID(),
      });
      if (scope.current !== org) return;
      setPreparedLink(result.url);
      setNotice(
        "Mensagem preparada. Abra o WhatsApp e confira antes de enviar. Nada foi enviado automaticamente.",
      );
    } catch (e) {
      if (scope.current === org) {
        setNotice("");
        setError(e instanceof Error ? e.message : "Contato indisponível.");
      }
    } finally {
      if (job === mutationVersion.current) {
        writeRef.current = false;
        setBusy(false);
      }
    }
  }
  async function automaticWhatsapp(a: ServiceAssignment) {
    const requestId =
      whatsappAttempt?.id === a.id
        ? whatsappAttempt.requestId
        : crypto.randomUUID();
    setWhatsappAttempt({ id: a.id, requestId });
    const result = await mutate(
      { action: "whatsapp", assignmentId: a.id, requestId },
      "Solicitação de WhatsApp registrada.",
    );
    if (result)
      setNotice(
        `WhatsApp: ${result.status === "sent" ? "aceito pelo provedor; entrega ainda não confirmada" : result.status || "registrado"}.`,
      );
  }
  if (!canManage)
    return (
      <section className="serving-screen">
        <h1>Escalas</h1>
        <p>
          A gestão das escalas é restrita à liderança. No app, abra Minha Escala
          para consultar e responder.
        </p>
      </section>
    );
  return (
    <section className="serving-screen">
      <header className="serving-heading">
        <div>
          <h1>Escalas e equipes</h1>
          <p>
            Cadastre as áreas da sua igreja, monte a escala e acompanhe cada
            resposta.
          </p>
        </div>
        <div className="serving-toolbar">
          <button
            type="button"
            className="serving-button"
            disabled={busy || loading}
            onClick={() => openArea()}
          >
            <Settings2 size={18} />
            Áreas e serviços
          </button>
          <button
            type="button"
            className="serving-button primary"
            disabled={busy || loading}
            onClick={openScale}
          >
            <Plus size={18} />
            Nova escala
          </button>
        </div>
      </header>
      <div role="status" aria-live="polite" className="serving-feedback">
        {loading ? "Carregando áreas, pessoas e escalas…" : notice}
      </div>
      {error && (
        <div role="alert" className="serving-error">
          {error}
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            Atualizar lista
          </button>
        </div>
      )}
      {preparedLink && (
        <div className="serving-feedback">
          <a
            className="serving-button"
            href={preparedLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir mensagem no WhatsApp
          </a>
          <span>Preparado para envio manual; não é comprovante de envio.</span>
        </div>
      )}
      {!loading && (
        <>
          <div className="serving-summary">
            <span>
              <strong>{activeTeams.length}</strong> áreas ativas
            </span>
            <span>
              <strong>{pending}</strong> aguardando resposta
            </span>
            <span>
              <strong>
                {
                  data.assignments.filter((a) => a.status === "confirmed")
                    .length
                }
              </strong>{" "}
              confirmações
            </span>
            <span>
              <strong>
                {data.assignments.filter((a) => a.status === "declined").length}
              </strong>{" "}
              recusas
            </span>
          </div>
          {!data.teams.length && (
            <div className="serving-empty">
              <Users size={30} />
              <h2>Quais são as áreas da sua igreja?</h2>
              <p>
                Use os nomes da sua comunidade: ministério, departamento,
                equipe, pastoral ou serviço. Nenhuma área é cadastrada
                automaticamente.
              </p>
              <button
                className="serving-button primary"
                onClick={() => openArea()}
              >
                Cadastrar primeira área
              </button>
            </div>
          )}
          <section className="serving-panel">
            <div className="serving-section-heading">
              <div>
                <h2>Escalas cadastradas</h2>
                <p>
                  Horários no fuso da instituição: {data.timezone}. Respostas do
                  app e do WhatsApp aparecem na mesma escala.
                </p>
              </div>
              <button
                type="button"
                aria-label="Atualizar escalas"
                className="serving-button"
                disabled={loading || busy}
                onClick={() => void load()}
              >
                <RefreshCw size={16} />
                Atualizar
              </button>
            </div>
            <div className="serving-filters">
              <label>
                Área / serviço
                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                >
                  <option value="">Todas as áreas</option>
                  {data.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.status === "inactive" ? " (inativa)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Data
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </label>
              <label>
                Situação
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todas as situações</option>
                  {Object.entries(SERVING_STATUSES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="serving-button"
                onClick={() => {
                  setDateFilter("");
                  setStatusFilter("");
                  setAreaFilter("");
                }}
              >
                Limpar filtros
              </button>
            </div>
            {!filtered.length ? (
              <div className="serving-empty">
                <Calendar size={28} />
                <h3>Nenhuma escala neste filtro</h3>
                <p>
                  Crie uma escala escolhendo uma área já cadastrada, função,
                  pessoas e horário.
                </p>
                <button
                  className="serving-button primary"
                  disabled={busy}
                  onClick={openScale}
                >
                  Criar nova escala
                </button>
              </div>
            ) : (
              <div className="serving-assignment-list">
                {filtered.map((a) => {
                  const person = data.people.find((p) => p.id === a.personId);
                  return (
                    <article key={a.id} className="serving-assignment">
                      <div className="serving-assignment-top">
                        <div>
                          <h3>
                            {a.areaName || a.ministryCode} · {a.role}
                          </h3>
                          <p>
                            {a.serviceName ||
                              "Serviço cadastrado anteriormente"}{" "}
                            —{" "}
                            {servingDate(
                              a.serviceDate,
                              a.timezone || data.timezone,
                            )}
                          </p>
                          <strong>
                            {person
                              ? fullName(person)
                              : "Cadastro indisponível"}
                          </strong>
                        </div>
                        <span className={`serving-status ${a.status}`}>
                          {SERVING_STATUSES[a.status] || a.status}
                        </span>
                      </div>
                      {a.responseSource && (
                        <p className="serving-helper">
                          Registro via{" "}
                          {a.responseSource === "mobile"
                            ? "app do membro"
                            : a.responseSource === "whatsapp"
                              ? "WhatsApp do membro"
                              : "liderança"}
                          .
                        </p>
                      )}
                      {a.responseNote && (
                        <p className="serving-note">
                          Resposta: {a.responseNote}
                        </p>
                      )}
                      <p className="serving-channel">
                        {PUSH_LABEL[a.pushStatus || ""] ||
                          "Escala antiga: sem registro de envio push."}{" "}
                        · A escala fica disponível no app quando a conta está
                        vinculada.
                      </p>
                      <div className="serving-row-actions">
                        {a.status !== "cancelled" && (
                          <>
                            {a.status === "pending" &&
                              [
                                "pending",
                                "no_device",
                                "unlinked",
                                "failed",
                                "test_mode",
                              ].includes(a.pushStatus || "") && (
                                <button
                                  className="serving-button"
                                  disabled={busy}
                                  onClick={() =>
                                    void mutate(
                                      { action: "notify", assignmentId: a.id },
                                      "Situação do aviso no app atualizada.",
                                    )
                                  }
                                >
                                  Tentar aviso no app
                                </button>
                              )}
                            <label>
                              Registro da liderança
                              <select
                                aria-label={`Situação de ${person ? fullName(person) : a.personId}`}
                                disabled={busy}
                                value={a.status}
                                onChange={(e) =>
                                  void mutate(
                                    {
                                      action: "status",
                                      assignmentId: a.id,
                                      status: e.target.value,
                                    },
                                    "Situação atualizada e registrada.",
                                  )
                                }
                              >
                                {Object.entries(SERVING_STATUSES).map(
                                  ([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="serving-button"
                              disabled={busy}
                              onClick={() => {
                                setReplacement({
                                  assignmentId: a.id,
                                  personId: "",
                                });
                                setFormError("");
                                setDialog("replace");
                              }}
                            >
                              Substituir pessoa
                            </button>
                            <button
                              className="serving-button"
                              disabled={busy || !person?.hasPhone}
                              onClick={() => void prepareWhatsapp(a)}
                            >
                              <MessageSquare size={16} />
                              Preparar WhatsApp
                            </button>
                            {data.whatsappConnected && (
                              <button
                                className="serving-button"
                                disabled={busy}
                                onClick={() => void automaticWhatsapp(a)}
                              >
                                Enviar pelo WhatsApp conectado
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          {data.swaps?.length > 0 && (
            <section className="serving-panel">
              <h2>Solicitações de troca pendentes</h2>
              {data.swaps.map((swap) => (
                <article className="serving-assignment" key={swap.id}>
                  <p>
                    {fullName(
                      data.people.find(
                        (p) => p.id === swap.requestorPersonId,
                      ) || { id: "", firstName: "Pessoa", hasPhone: false },
                    )}{" "}
                    solicita substituição por{" "}
                    {fullName(
                      data.people.find(
                        (p) =>
                          p.id ===
                          (swap.proposedReplacementPersonId ||
                            swap.targetPersonId),
                      ) || {
                        id: "",
                        firstName: "Substituto indisponível",
                        hasPhone: false,
                      },
                    )}
                  </p>
                  {swap.note && <p>{swap.note}</p>}
                  <div className="serving-toolbar">
                    <button
                      className="serving-button"
                      disabled={busy}
                      onClick={() =>
                        void mutate(
                          {
                            action: "swap",
                            swapId: swap.id,
                            decision: "accepted",
                          },
                          "Troca aprovada. A escala anterior foi cancelada e o substituto recebeu um novo convite.",
                        )
                      }
                    >
                      Aprovar troca
                    </button>
                    <button
                      className="serving-button"
                      disabled={busy}
                      onClick={() =>
                        void mutate(
                          {
                            action: "swap",
                            swapId: swap.id,
                            decision: "declined",
                          },
                          "Troca recusada.",
                        )
                      }
                    >
                      Recusar troca
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
          <aside className="serving-channel-note">
            <strong>Como chegam os avisos?</strong>
            <p>
              App: a pessoa precisa ter conta vinculada; push exige permissão e
              aparelho registrado. O aceite do provedor não confirma entrega no
              aparelho.
            </p>
            <p>
              WhatsApp:{" "}
              {data.whatsappConnected
                ? "canal conectado; o envio depende do vínculo, preferência de contato e janela de atendimento."
                : "envio automático ainda não conectado. Use Preparar WhatsApp para enviar manualmente."}{" "}
              Fora da janela de atendimento, use um template aprovado em
              Comunicação. Não há envio pago automático nesta tela.
            </p>
          </aside>
        </>
      )}
      {dialog === "replace" && (
        <Dialog
          title="Substituir pessoa na escala"
          busy={busy}
          onClose={() => setDialog(null)}
        >
          <p>
            A escala original será cancelada e um novo convite será criado para
            o substituto. A resposta anterior permanece no histórico.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(
                { action: "replace", ...replacement },
                "Substituição salva. Confira o aviso do novo convite.",
                true,
              );
            }}
          >
            <fieldset disabled={busy}>
              <label>
                Substituto
                <select
                  required
                  value={replacement.personId}
                  onChange={(e) =>
                    setReplacement({ ...replacement, personId: e.target.value })
                  }
                >
                  <option value="">Selecione uma pessoa</option>
                  {data.people
                    .filter(
                      (p) =>
                        p.id !==
                        data.assignments.find(
                          (a) => a.id === replacement.assignmentId,
                        )?.personId,
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {fullName(p)}
                      </option>
                    ))}
                </select>
              </label>
              <button className="serving-button primary" type="submit">
                Substituir e avisar no app
              </button>
            </fieldset>
          </form>
          {formError && (
            <p className="serving-error" role="alert">
              {formError}
            </p>
          )}
        </Dialog>
      )}
      {dialog === "area" && (
        <Dialog
          title="Áreas e serviços da igreja"
          busy={busy}
          onClose={() => setDialog(null)}
        >
          <p>
            Cadastre os nomes e as funções usados pela sua igreja. Uma área
            inativa permanece no histórico.
          </p>
          <div className="serving-area-editor">
            <nav aria-label="Áreas cadastradas">
              <button
                type="button"
                className="serving-button"
                disabled={busy}
                onClick={() => setArea(blankArea())}
              >
                + Nova área
              </button>
              {data.teams.map((t) => (
                <button
                  type="button"
                  className={`serving-area-item ${area.id === t.id ? "selected" : ""}`}
                  key={t.id}
                  disabled={busy}
                  onClick={() => openArea(t)}
                >
                  {t.name}
                  <small>
                    {t.status === "active" ? "Ativa" : "Inativa"} ·{" "}
                    {(t.roles || []).length} funções
                  </small>
                </button>
              ))}
            </nav>
            <form onSubmit={saveArea}>
              <fieldset disabled={busy}>
                <label>
                  Nome da área / serviço
                  <input
                    required
                    maxLength={100}
                    value={area.name}
                    onChange={(e) => setArea({ ...area, name: e.target.value })}
                    placeholder="Ex.: Equipe de acolhimento"
                  />
                </label>
                <label>
                  Descrição (opcional)
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={area.summary}
                    onChange={(e) =>
                      setArea({ ...area, summary: e.target.value })
                    }
                  />
                </label>
                <label>
                  Funções — uma por linha
                  <textarea
                    required
                    rows={5}
                    maxLength={2400}
                    value={area.roles}
                    onChange={(e) =>
                      setArea({ ...area, roles: e.target.value })
                    }
                    placeholder={
                      "Receber visitantes\nOrganizar a entrada\nApoio"
                    }
                  />
                </label>
                <div className="serving-form-grid">
                  <label>
                    Pessoas desejadas por serviço
                    <input
                      type="number"
                      min={1}
                      max={200}
                      required
                      value={area.targetVolunteers}
                      onChange={(e) =>
                        setArea({
                          ...area,
                          targetVolunteers: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Situação
                    <select
                      value={area.status}
                      onChange={(e) =>
                        setArea({ ...area, status: e.target.value })
                      }
                    >
                      <option value="active">Ativa</option>
                      <option value="inactive">Inativa</option>
                    </select>
                  </label>
                </div>
                <button className="serving-button primary" type="submit">
                  {busy
                    ? "Salvando…"
                    : area.id
                      ? "Salvar área"
                      : "Salvar área e montar escala"}
                </button>
              </fieldset>
            </form>
          </div>
          {formError && (
            <p role="alert" className="serving-error">
              {formError}
            </p>
          )}
          <Link href="/members">Gerenciar os cadastros das pessoas</Link>
        </Dialog>
      )}
      {dialog === "scale" && (
        <Dialog title="Nova escala" busy={busy} onClose={() => setDialog(null)}>
          <form onSubmit={create}>
            <fieldset disabled={busy}>
              <div className="serving-form-grid">
                <label>
                  Área / serviço
                  <select
                    required
                    value={draft.teamId}
                    onChange={(e) => {
                      const team = data.teams.find(
                        (t) => t.id === e.target.value,
                      );
                      setDraft({
                        ...draft,
                        teamId: e.target.value,
                        role: team?.roles?.[0] || "",
                      });
                    }}
                  >
                    <option value="">Selecione uma área cadastrada</option>
                    {activeTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Função
                  <select
                    required
                    value={draft.role}
                    onChange={(e) =>
                      setDraft({ ...draft, role: e.target.value })
                    }
                  >
                    <option value="">Selecione a função</option>
                    {(selectedTeam?.roles || []).map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </label>
              </div>
              {selectedTeam && !selectedTeam.roles?.length && (
                <p className="serving-error">
                  Esta área antiga ainda não tem funções cadastradas.{" "}
                  <button type="button" onClick={() => openArea(selectedTeam)}>
                    Configurar funções
                  </button>
                </p>
              )}
              <label>
                Nome do culto ou evento
                <input
                  required
                  maxLength={100}
                  placeholder="Ex.: Celebração da família"
                  value={draft.serviceName}
                  onChange={(e) =>
                    setDraft({ ...draft, serviceName: e.target.value })
                  }
                />
              </label>
              <div className="serving-form-grid three">
                <label>
                  Data
                  <input
                    type="date"
                    required
                    value={draft.date}
                    onChange={(e) =>
                      setDraft({ ...draft, date: e.target.value })
                    }
                  />
                </label>
                <label>
                  Horário
                  <input
                    type="time"
                    required
                    value={draft.time}
                    onChange={(e) =>
                      setDraft({ ...draft, time: e.target.value })
                    }
                  />
                </label>
                <label>
                  Duração (minutos)
                  <input
                    type="number"
                    required
                    min={15}
                    max={720}
                    value={draft.durationMinutes}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        durationMinutes: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <p className="serving-helper">
                Fuso da instituição: {data.timezone}. Não é necessário que o
                serviço aconteça no domingo.
              </p>
              <label>
                Buscar pessoas
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Digite o nome da pessoa"
                />
              </label>
              <p>
                {draft.personIds.length} pessoa(s) selecionada(s). Uma escala
                por pessoa na função escolhida.
              </p>
              <div className="serving-people-picker">
                {candidates.map((p) => (
                  <label className="serving-person-option" key={p.id}>
                    <input
                      type="checkbox"
                      checked={draft.personIds.includes(p.id)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          personIds: e.target.checked
                            ? [...draft.personIds, p.id]
                            : draft.personIds.filter((id) => id !== p.id),
                        })
                      }
                    />
                    <span>
                      {fullName(p)}
                      <small>
                        {(
                          {
                            member: "Membro",
                            leader: "Líder",
                            volunteer: "Voluntário",
                            congregant: "Congregado",
                            new_believer: "Novo convertido",
                            visitor: "Visitante",
                          } as Record<string, string>
                        )[p.memberStatus || ""] || "Pessoa cadastrada"}
                      </small>
                    </span>
                  </label>
                ))}
                {!candidates.length && (
                  <p>
                    Nenhuma pessoa encontrada. Cadastre-a em Pessoas antes de
                    escalar.
                  </p>
                )}
              </div>
              <p className="serving-helper">
                Ao salvar, a escala aparece para a conta vinculada do membro e o
                sistema tenta avisar o aparelho habilitado. O WhatsApp é uma
                ação separada, com situação visível na lista.
              </p>
              <div className="serving-toolbar">
                <Link href="/members">Cadastrar uma pessoa</Link>
                <button
                  type="button"
                  className="serving-button"
                  onClick={() => openArea()}
                >
                  Cadastrar outra área
                </button>
                <button
                  type="submit"
                  disabled={!draft.personIds.length}
                  className="serving-button primary"
                >
                  {busy
                    ? "Salvando e preparando avisos…"
                    : "Salvar escala e avisar no app"}
                </button>
              </div>
            </fieldset>
          </form>
          {formError && (
            <p role="alert" className="serving-error">
              {formError}
            </p>
          )}
        </Dialog>
      )}
    </section>
  );
}

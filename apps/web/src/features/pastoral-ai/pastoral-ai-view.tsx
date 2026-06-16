"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  History,
  HeartHandshake,
  MessageCircle,
  Mic,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Waypoints
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type AssistantStatus = "online" | "review" | "paused";
type RequestStatus = "new" | "triage" | "assigned" | "resolved";
type RequestPriority = "urgent" | "important" | "normal";
type AssistantMode = "assistive" | "supervised" | "paused";
type RequestFilter = "all" | RequestStatus;

type PastoralRequest = {
  id: string;
  person: string;
  category: string;
  channel: string;
  priority: RequestPriority;
  status: RequestStatus;
  summary: string;
  owner: string;
  receivedAt: string;
};

type CellPresence = {
  id: string;
  group: string;
  leader: string;
  expected: number;
  confirmed: number;
  missing: number;
  status: string;
};

type ActivityLog = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
};

type PersistedPastoralAiState = {
  requests: PastoralRequest[];
  cellPresences: CellPresence[];
  assistantMode: AssistantMode;
  reviewSensitive: boolean;
  voiceReplies: boolean;
  activityLog: ActivityLog[];
};

const storageKey = "alvo:pastoral-ai-workspace:v1";

const assistantStatus: AssistantStatus = "online";

const initialPastoralRequests: PastoralRequest[] = [
  {
    id: "req_1",
    person: "Gabriela Fernandes",
    category: "Oração",
    channel: "WhatsApp",
    priority: "urgent",
    status: "triage",
    summary: "Pediu oração e conversa pastoral por causa de crise familiar.",
    owner: "Pr. Ricardo",
    receivedAt: "08:12"
  },
  {
    id: "req_2",
    person: "Marcos Paulo",
    category: "Cesta básica",
    channel: "WhatsApp",
    priority: "important",
    status: "assigned",
    summary: "Família recém-chegada solicitou apoio social para esta semana.",
    owner: "Ação Social",
    receivedAt: "09:34"
  },
  {
    id: "req_3",
    person: "Lívia Santos",
    category: "Integração",
    channel: "Assistente IA",
    priority: "normal",
    status: "new",
    summary: "Visitante perguntou sobre classe de integração e células próximas.",
    owner: "Recepção",
    receivedAt: "10:05"
  }
];

const initialCellPresences: CellPresence[] = [
  {
    id: "cell_1",
    group: "CG Centro",
    leader: "Rafael Lima",
    expected: 18,
    confirmed: 15,
    missing: 3,
    status: "Presença recebida pelo WhatsApp"
  },
  {
    id: "cell_2",
    group: "CG Famílias Norte",
    leader: "Patrícia Costa",
    expected: 22,
    confirmed: 12,
    missing: 10,
    status: "Aguardando confirmação do líder"
  },
  {
    id: "cell_3",
    group: "CG Jovens",
    leader: "Lucas Andrade",
    expected: 26,
    confirmed: 24,
    missing: 2,
    status: "Mensagem de incentivo enviada"
  }
];

const automations = [
  "Boas-vindas para visitantes cadastrados na recepção",
  "Lembrete de presença para líderes de células",
  "Triagem de pedidos de oração com revisão humana",
  "Encaminhamento de cesta básica para Ação Social"
];

const priorityLabel: Record<RequestPriority, string> = {
  urgent: "Urgente",
  important: "Importante",
  normal: "Normal"
};

const statusLabel: Record<RequestStatus, string> = {
  new: "Nova",
  triage: "Triagem",
  assigned: "Encaminhada",
  resolved: "Resolvida"
};

const filterLabel: Record<RequestFilter, string> = {
  all: "Todas",
  new: "Novas",
  triage: "Triagem",
  assigned: "Encaminhadas",
  resolved: "Resolvidas"
};

export function PastoralAiView() {
  const [requests, setRequests] = useState<PastoralRequest[]>(initialPastoralRequests);
  const [cellPresences, setCellPresences] = useState<CellPresence[]>(initialCellPresences);
  const [selectedRequestId, setSelectedRequestId] = useState(initialPastoralRequests[0]?.id ?? "");
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("all");
  const [draftRequest, setDraftRequest] = useState({
    person: "",
    category: "Oração",
    priority: "normal" as RequestPriority,
    summary: "",
    owner: "Recepção"
  });
  const [assistantMode, setAssistantMode] = useState<AssistantMode>("supervised");
  const [reviewSensitive, setReviewSensitive] = useState(true);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([
    {
      id: "log_initial",
      title: "Fila inicial carregada",
      detail: "Solicitações simuladas prontas para revisão pastoral.",
      createdAt: "Agora"
    }
  ]);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? requests[0];
  const filteredRequests = requests.filter((request) =>
    requestFilter === "all" ? true : request.status === requestFilter
  );

  useEffect(() => {
    try {
      const rawState = window.localStorage.getItem(storageKey);
      if (!rawState) {
        setHasLoadedLocalState(true);
        return;
      }

      const parsedState = JSON.parse(rawState) as Partial<PersistedPastoralAiState>;
      if (Array.isArray(parsedState.requests) && parsedState.requests.length > 0) {
        setRequests(parsedState.requests);
        setSelectedRequestId(parsedState.requests[0].id);
      }
      if (Array.isArray(parsedState.cellPresences) && parsedState.cellPresences.length > 0) {
        setCellPresences(parsedState.cellPresences);
      }
      if (parsedState.assistantMode) setAssistantMode(parsedState.assistantMode);
      if (typeof parsedState.reviewSensitive === "boolean") setReviewSensitive(parsedState.reviewSensitive);
      if (typeof parsedState.voiceReplies === "boolean") setVoiceReplies(parsedState.voiceReplies);
      if (Array.isArray(parsedState.activityLog) && parsedState.activityLog.length > 0) {
        setActivityLog(parsedState.activityLog);
      }
    } catch {
      // Invalid local workspace state should not block the pastoral queue.
    } finally {
      setHasLoadedLocalState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalState) return;

    const stateToPersist: PersistedPastoralAiState = {
      requests,
      cellPresences,
      assistantMode,
      reviewSensitive,
      voiceReplies,
      activityLog
    };

    window.localStorage.setItem(storageKey, JSON.stringify(stateToPersist));
  }, [activityLog, assistantMode, cellPresences, hasLoadedLocalState, requests, reviewSensitive, voiceReplies]);

  const metrics = useMemo(() => {
    const urgent = requests.filter((request) => request.priority === "urgent").length;
    const open = requests.filter((request) => request.status !== "resolved").length;
    const confirmed = cellPresences.reduce((sum, cell) => sum + cell.confirmed, 0);
    const expected = cellPresences.reduce((sum, cell) => sum + cell.expected, 0);

    return {
      urgent,
      open,
      presenceRate: Math.round((confirmed / Math.max(expected, 1)) * 100),
      automations: automations.length
    };
  }, [cellPresences, requests]);

  const addActivity = (title: string, detail: string) => {
    setActivityLog((current) => [
      {
        id: `log_${Date.now()}`,
        title,
        detail,
        createdAt: new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date())
      },
      ...current
    ].slice(0, 5));
  };

  const updateSelectedRequest = (status: RequestStatus, owner?: string) => {
    if (!selectedRequest) return;

    setRequests((current) =>
      current.map((request) =>
        request.id === selectedRequest.id
          ? {
              ...request,
              status,
              owner: owner ?? request.owner
            }
          : request
      )
    );
  };

  const handleCreateTask = () => {
    if (!selectedRequest) return;
    updateSelectedRequest("assigned", selectedRequest.owner);
    addActivity(
      "Tarefa pastoral criada",
      `${selectedRequest.person} foi encaminhado para ${selectedRequest.owner}.`
    );
  };

  const handleSendWhatsApp = () => {
    if (!selectedRequest) return;
    updateSelectedRequest(selectedRequest.status === "new" ? "triage" : selectedRequest.status);
    addActivity(
      "Mensagem preparada para WhatsApp",
      `Resposta supervisionada enviada para ${selectedRequest.person}.`
    );
  };

  const handleResolveRequest = () => {
    if (!selectedRequest) return;
    updateSelectedRequest("resolved");
    addActivity("Solicitação resolvida", `${selectedRequest.person} saiu da fila aberta.`);
  };

  const handleCellReminder = (cellId: string) => {
    setCellPresences((current) =>
      current.map((cell) =>
        cell.id === cellId
          ? {
              ...cell,
              status: "Lembrete enviado ao líder pelo WhatsApp"
            }
          : cell
      )
    );

    const cell = cellPresences.find((item) => item.id === cellId);
    if (cell) {
      addActivity("Lembrete de presença enviado", `${cell.leader} recebeu lembrete para ${cell.group}.`);
    }
  };

  const handleCreateRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const person = draftRequest.person.trim();
    const summary = draftRequest.summary.trim();

    if (!person || !summary) {
      addActivity("Cadastro incompleto", "Informe nome e resumo para criar uma solicitação pastoral.");
      return;
    }

    const createdAt = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());
    const nextRequest: PastoralRequest = {
      id: `req_${Date.now()}`,
      person,
      category: draftRequest.category,
      channel: "Manual",
      priority: draftRequest.priority,
      status: "new",
      summary,
      owner: draftRequest.owner || "Recepção",
      receivedAt: createdAt
    };

    setRequests((current) => [nextRequest, ...current]);
    setSelectedRequestId(nextRequest.id);
    setRequestFilter("all");
    setDraftRequest({
      person: "",
      category: "Oração",
      priority: "normal",
      summary: "",
      owner: "Recepção"
    });
    addActivity("Solicitação criada manualmente", `${person} entrou na fila de cuidado.`);
  };

  const handleResetDemo = () => {
    setRequests(initialPastoralRequests);
    setCellPresences(initialCellPresences);
    setSelectedRequestId(initialPastoralRequests[0]?.id ?? "");
    setRequestFilter("all");
    setAssistantMode("supervised");
    setReviewSensitive(true);
    setVoiceReplies(true);
    setActivityLog([
      {
        id: `log_reset_${Date.now()}`,
        title: "Ambiente restaurado",
        detail: "Dados de demonstração da IA Pastoral foram recarregados.",
        createdAt: new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date())
      }
    ]);
  };

  return (
    <main className="form-page pastoral-ai-page animate-entrance">
      <header className="pastoral-ai-hero">
        <div>
          <span className="eyebrow-premium">
            <Sparkles size={16} />
            WhatsApp + IA Pastoral
          </span>
          <h1>Central de Atendimento Inteligente</h1>
          <p>
            Organize conversas, pedidos de oração, solicitações sociais e presença de células em um único painel de cuidado.
          </p>
        </div>
        <div className="assistant-status-card">
          <span className={`assistant-dot ${assistantStatus}`} />
          <div>
            <strong>Assistente Alvo ativo</strong>
            <p>WhatsApp Business conectado, respostas em texto e áudio aguardando revisão pastoral.</p>
            <button type="button" onClick={handleResetDemo}>
              <RotateCcw size={16} />
              Restaurar demo
            </button>
          </div>
        </div>
      </header>

      <section className="pastoral-ai-kpi-grid">
        <article>
          <MessageCircle size={22} />
          <span>Solicitações abertas</span>
          <strong>{metrics.open}</strong>
          <small>entradas vindas do WhatsApp e recepção</small>
        </article>
        <article>
          <AlertTriangle size={22} />
          <span>Prioridade alta</span>
          <strong>{metrics.urgent}</strong>
          <small>precisam de validação humana</small>
        </article>
        <article>
          <Waypoints size={22} />
          <span>Presença em células</span>
          <strong>{metrics.presenceRate}%</strong>
          <small>confirmada por líderes no WhatsApp</small>
        </article>
        <article>
          <Bot size={22} />
          <span>Automações ativas</span>
          <strong>{metrics.automations}</strong>
          <small>com limites e revisão pastoral</small>
        </article>
      </section>

      <section className="pastoral-ai-workbench">
        <article className="pastoral-ai-panel request-queue">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Fila de cuidado</span>
              <h2>Solicitações recebidas</h2>
            </div>
            <button type="button">
              <ShieldCheck size={17} />
              Revisar regras
            </button>
          </div>

          <form className="quick-request-form" onSubmit={handleCreateRequest}>
            <div className="quick-form-row">
              <label>
                <span>Nome</span>
                <input
                  value={draftRequest.person}
                  onChange={(event) => setDraftRequest((current) => ({ ...current, person: event.target.value }))}
                  placeholder="Ex: Ana Souza"
                />
              </label>
              <label>
                <span>Categoria</span>
                <select
                  value={draftRequest.category}
                  onChange={(event) => setDraftRequest((current) => ({ ...current, category: event.target.value }))}
                >
                  <option>Oração</option>
                  <option>Cesta básica</option>
                  <option>Integração</option>
                  <option>Aconselhamento</option>
                  <option>Célula</option>
                </select>
              </label>
            </div>

            <label>
              <span>Resumo</span>
              <textarea
                value={draftRequest.summary}
                onChange={(event) => setDraftRequest((current) => ({ ...current, summary: event.target.value }))}
                placeholder="Descreva o pedido de forma breve."
                rows={3}
              />
            </label>

            <div className="quick-form-row">
              <label>
                <span>Prioridade</span>
                <select
                  value={draftRequest.priority}
                  onChange={(event) =>
                    setDraftRequest((current) => ({
                      ...current,
                      priority: event.target.value as RequestPriority
                    }))
                  }
                >
                  <option value="normal">Normal</option>
                  <option value="important">Importante</option>
                  <option value="urgent">Urgente</option>
                </select>
              </label>
              <label>
                <span>Responsável</span>
                <input
                  value={draftRequest.owner}
                  onChange={(event) => setDraftRequest((current) => ({ ...current, owner: event.target.value }))}
                  placeholder="Equipe ou líder"
                />
              </label>
            </div>

            <button type="submit">
              <Plus size={17} />
              Criar solicitação
            </button>
          </form>

          <div className="request-filter-bar" aria-label="Filtros da fila pastoral">
            {(Object.keys(filterLabel) as RequestFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                className={requestFilter === filter ? "is-active" : ""}
                onClick={() => setRequestFilter(filter)}
              >
                {filterLabel[filter]}
              </button>
            ))}
          </div>

          <div className="request-list">
            {filteredRequests.length > 0 ? filteredRequests.map((request) => (
              <button
                type="button"
                key={request.id}
                className={request.id === selectedRequest.id ? "request-row is-active" : "request-row"}
                onClick={() => setSelectedRequestId(request.id)}
              >
                <div>
                  <strong>{request.person}</strong>
                  <span>{request.category} · {request.channel}</span>
                </div>
                <small className={`priority-pill ${request.priority}`}>
                  {priorityLabel[request.priority]}
                </small>
              </button>
            )) : (
              <div className="empty-request-list">
                <strong>Nenhuma solicitação neste filtro</strong>
                <span>Troque o filtro ou cadastre uma nova entrada pastoral.</span>
              </div>
            )}
          </div>
        </article>

        <article className="pastoral-ai-panel request-detail">
          <span className="eyebrow">Resumo sugerido pela IA</span>
          <h2>{selectedRequest.person}</h2>
          <p>{selectedRequest.summary}</p>

          <div className="detail-grid">
            <div>
              <span>Status</span>
              <strong>{statusLabel[selectedRequest.status]}</strong>
            </div>
            <div>
              <span>Responsável</span>
              <strong>{selectedRequest.owner}</strong>
            </div>
            <div>
              <span>Entrada</span>
              <strong>{selectedRequest.receivedAt}</strong>
            </div>
          </div>

          <div className="suggested-response">
            <div>
              <Mic size={18} />
              <strong>Resposta sugerida</strong>
            </div>
            <p>
              Olá, {selectedRequest.person.split(" ")[0]}. Recebemos sua mensagem e vamos caminhar com você. Já encaminhei seu pedido para a equipe responsável.
            </p>
          </div>

          <div className="detail-actions">
            <button type="button" className="secondary-action" onClick={handleResolveRequest}>
              <CheckCircle2 size={17} />
              Resolver
            </button>
            <button type="button" className="secondary-action" onClick={handleCreateTask}>
              Criar tarefa pastoral
            </button>
            <button type="button" className="primary-action" onClick={handleSendWhatsApp}>
              <Send size={17} />
              Enviar no WhatsApp
            </button>
          </div>
        </article>
      </section>

      <section className="pastoral-ai-lower-grid">
        <article className="pastoral-ai-panel">
          <div className="panel-heading compact">
            <div>
              <span className="eyebrow">Células e CGs</span>
              <h2>Presença por WhatsApp</h2>
            </div>
            <UsersRound size={22} />
          </div>

          <div className="cell-list">
            {cellPresences.map((cell) => (
              <div key={cell.id} className="cell-row">
                <div>
                  <strong>{cell.group}</strong>
                  <span>{cell.leader}</span>
                  <p>{cell.status}</p>
                </div>
                <div className="presence-meter" aria-label={`${cell.confirmed} de ${cell.expected} confirmados`}>
                  <span style={{ width: `${Math.round((cell.confirmed / cell.expected) * 100)}%` }} />
                </div>
                <small>{cell.confirmed}/{cell.expected}</small>
                <button type="button" onClick={() => handleCellReminder(cell.id)}>
                  Lembrar
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="pastoral-ai-panel">
          <div className="panel-heading compact">
            <div>
              <span className="eyebrow">Governança</span>
              <h2>Automações com supervisão</h2>
            </div>
            <Settings2 size={22} />
          </div>

          <div className="assistant-config">
            <label>
              <span>Modo do assistente</span>
              <select value={assistantMode} onChange={(event) => setAssistantMode(event.target.value as AssistantMode)}>
                <option value="assistive">Assistivo</option>
                <option value="supervised">Supervisionado</option>
                <option value="paused">Pausado</option>
              </select>
            </label>

            <label className="toggle-row">
              <input
                checked={reviewSensitive}
                onChange={(event) => setReviewSensitive(event.target.checked)}
                type="checkbox"
              />
              <span>Revisar pedidos sensíveis antes do envio</span>
            </label>

            <label className="toggle-row">
              <input
                checked={voiceReplies}
                onChange={(event) => setVoiceReplies(event.target.checked)}
                type="checkbox"
              />
              <span>Permitir respostas em áudio</span>
            </label>
          </div>

          <div className="automation-list">
            {automations.map((automation) => (
              <div key={automation}>
                <CheckCircle2 size={18} />
                <span>{automation}</span>
              </div>
            ))}
          </div>

          <div className="guardrail-note">
            <HeartHandshake size={19} />
            <p>Pedidos sensíveis entram como sugestão. A decisão e o contato final continuam com a liderança autorizada.</p>
          </div>
        </article>
      </section>

      <section className="pastoral-ai-panel activity-panel">
        <div className="panel-heading compact">
          <div>
            <span className="eyebrow">Rastro operacional</span>
            <h2>Últimas ações</h2>
          </div>
          <History size={22} />
        </div>

        <div className="activity-list">
          {activityLog.map((activity) => (
            <div key={activity.id}>
              <time>{activity.createdAt}</time>
              <strong>{activity.title}</strong>
              <span>{activity.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

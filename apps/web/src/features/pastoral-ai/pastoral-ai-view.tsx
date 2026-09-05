"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  History,
  MessageCircle,
  Mic,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Waypoints
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAppAuth } from "../../../app/providers";
import {
  fetchPrayerRequests,
  addPrayerRequest,
  updatePrayerRequestStatus,
  isFirebaseWebRuntimeConfigured
} from "@alvo/firebase";
import type { PrayerRequest } from "@alvo/types";

type AssistantStatus = "online" | "review" | "paused";
type RequestStatus = "new" | "triage" | "assigned" | "resolved";
type RequestPriority = "urgent" | "important" | "normal";
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
  phone?: string;
};

type ActivityLog = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
};

const assistantStatus: AssistantStatus = "online";

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

// A fila contém somente documentos persistidos.
const isRealRequest = (id: string) => Boolean(id);

function formatHm(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

// prayerRequests (fonte real, unificada com o Radar Pastoral) → shape da fila.
function prayerToRequest(p: PrayerRequest): PastoralRequest {
  const statusMap: Record<PrayerRequest["status"], RequestStatus> = {
    open: "new",
    in_progress: "assigned",
    resolved: "resolved"
  };
  const channelMap: Record<PrayerRequest["source"], string> = {
    public_form: "Formulário público",
    app: "App",
    reception: "Recepção"
  };
  return {
    id: p.id,
    person: p.personName,
    category: p.category ?? "Cuidado",
    channel: channelMap[p.source] ?? "—",
    priority: p.priority ?? "normal",
    status: statusMap[p.status] ?? "new",
    summary: p.message,
    owner: p.careOwner ?? (p.assignedToUserId ? "Equipe pastoral" : "—"),
    receivedAt: formatHm(p.createdAt),
    phone: p.phone
  };
}

export function PastoralAiView() {
  const { user, organizationId, firebaseConfig } = useAppAuth();
  const configured = isFirebaseWebRuntimeConfigured(firebaseConfig);
  const [requests, setRequests] = useState<PastoralRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("all");
  const [draftRequest, setDraftRequest] = useState({
    person: "",
    category: "Oração",
    priority: "normal" as RequestPriority,
    summary: "",
    owner: "Recepção",
    phone: ""
  });
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([
    {
      id: "log_initial",
      title: "Fila carregada",
      detail: "Pedidos de cuidado prontos para acompanhamento pastoral.",
      createdAt: "Agora"
    }
  ]);
  const [responseDraft, setResponseDraft] = useState("");
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? requests[0];
  const filteredRequests = requests.filter((request) =>
    requestFilter === "all" ? true : request.status === requestFilter
  );
  const selectedPhoneDigits = selectedRequest?.phone?.replace(/\D/g, "") ?? "";
  const whatsappNumber = selectedPhoneDigits
    ? (selectedPhoneDigits.startsWith("55") ? selectedPhoneDigits : `55${selectedPhoneDigits}`)
    : "";
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(responseDraft)}`
    : "";

  // Carrega os pedidos reais (prayerRequests, unificados com o Radar Pastoral).
  // Uma fila vazia permanece vazia.
  const reloadPrayers = useCallback(async () => {
    if (!configured) return;
    try {
      const list = await fetchPrayerRequests(firebaseConfig, { organizationId }, 200);

      const mapped = list.map(prayerToRequest);
      setRequests(mapped);
      setSelectedRequestId((prev) => (mapped.some((r) => r.id === prev) ? prev : mapped[0]?.id ?? ""));
    } catch (e) {
      setRequests([]); addActivity("Falha ao carregar", "Atualize a fila para tentar novamente.");
    }
  }, [configured, firebaseConfig, organizationId]);

  useEffect(() => { void reloadPrayers(); }, [reloadPrayers]);

  // Resposta sugerida: gera com IA de verdade (task care_reply via /api/ai,
  // DeepSeek→Groq em cascata). Enquanto carrega, mostra um rascunho base; se a
  // IA falhar ou não estiver configurada, o rascunho base permanece.
  useEffect(() => {
    if (!selectedRequest) return;
    const first = selectedRequest.person.split(" ")[0];
    setResponseDraft(
      `Olá, ${first}. Recebemos sua mensagem e vamos caminhar com você. Podemos combinar o melhor horário para conversar?`
    );
    if (!configured || !user) return;

    let cancelled = false;
    const requestId = selectedRequest.id;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            task: "care_reply",
            organizationId,
            input: {
              personName: selectedRequest.person,
              request: selectedRequest.summary,
              category: selectedRequest.category
            }
          })
        });
        const data = (await res.json()) as { ok?: boolean; content?: string };
        // Só aplica se ainda for o mesmo pedido selecionado.
        if (!cancelled && res.ok && data.content && requestId === selectedRequest.id) {
          setResponseDraft(data.content.trim());
        }
      } catch {
        // Mantém o rascunho base em caso de erro/limite de cota.
      }
    })();
    return () => { cancelled = true; };
  }, [selectedRequest?.id, configured, user, organizationId]);

  const metrics = useMemo(() => {
    const urgent = requests.filter((request) => request.priority === "urgent").length;
    const open = requests.filter((request) => request.status !== "resolved").length;
    const inProgress = requests.filter((request) => request.status === "triage" || request.status === "assigned").length;
    const withPhone = requests.filter((request) => !!request.phone).length;
    return { urgent, open, inProgress, withPhone };
  }, [requests]);

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

  const handleCreateTask = async () => {
    if (!selectedRequest) return;
    if (!configured || !user) return;
    try {
      await updatePrayerRequestStatus(firebaseConfig, { organizationId }, { requestId: selectedRequest.id, status: "in_progress", respondedByUserId: user.uid });
      await reloadPrayers(); addActivity("Encaminhamento registrado", `${selectedRequest.person} foi encaminhado para acompanhamento.`);
    } catch { addActivity("Não salvo", "Não foi possível encaminhar. Tente novamente."); }

  };

  const handleSendWhatsApp = () => {
    if (!selectedRequest) return;

    addActivity(
      "Mensagem preparada para WhatsApp",
      `Rascunho aberto para revisão e envio manual a ${selectedRequest.person}.`
    );
  };

  const handleCopyResponse = async () => {
    if (!selectedRequest) return;

    try {
      await navigator.clipboard.writeText(responseDraft);
      addActivity("Resposta copiada", `Texto de WhatsApp copiado para ${selectedRequest.person}.`);
    } catch {
      addActivity("Cópia indisponível", "O navegador não permitiu copiar a resposta automaticamente.");
    }
  };

  const handleResolveRequest = async () => {
    if (!selectedRequest) return;
    if (configured && isRealRequest(selectedRequest.id)) {
      try {
        await updatePrayerRequestStatus(firebaseConfig, { organizationId }, {
          requestId: selectedRequest.id,
          status: "resolved",
          respondedByUserId: user?.uid
        });
        await reloadPrayers();
      } catch (e) {
        addActivity("Não salvo", "Não foi possível resolver a solicitação."); return;
      }
    } else { return; }
    addActivity("Solicitação resolvida", `${selectedRequest.person} saiu da fila aberta.`);
  };


  const resetDraft = () =>
    setDraftRequest({ person: "", category: "Oração", priority: "normal", summary: "", owner: "Recepção", phone: "" });

  const handleCreateRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const person = draftRequest.person.trim();
    const summary = draftRequest.summary.trim();

    if (!person || !summary) {
      addActivity("Cadastro incompleto", "Informe nome e resumo para criar uma solicitação pastoral.");
      return;
    }

    if (configured) {
      try {
        await addPrayerRequest(firebaseConfig, { organizationId }, {
          personName: person,
          phone: draftRequest.phone.trim() || undefined,
          message: summary,
          category: draftRequest.category || undefined,
          priority: draftRequest.priority,
          careOwner: draftRequest.owner || undefined,
          source: "reception"
        });
        await reloadPrayers();
        setRequestFilter("all");
        resetDraft();
        addActivity("Solicitação registrada", `${person} entrou na fila de cuidado.`);
        return;
      } catch (e) {
        console.error("Falha ao registrar solicitação:", e);
        addActivity("Erro ao registrar", "Não foi possível salvar. Tente novamente.");
        return;
      }
    }

    addActivity("Não salvo", "Entre na sua conta e conecte-se para registrar a solicitação.");
  };

  const handleRefresh = () => {
    if (configured) {
      void reloadPrayers();
    } else {
      setRequests([]);
      setSelectedRequestId("");
    }
    setRequestFilter("all");
    addActivity("Fila atualizada", "Pedidos de cuidado recarregados.");
  };

  return (
    <main className="form-page pastoral-ai-page animate-entrance">
      <header className="pastoral-ai-hero">
        <div>
          <span className="eyebrow-premium">
            <Sparkles size={16} />
            Cuidado inteligente
          </span>
          <h1>Cuidado Pastoral</h1>
          <p>
            Transforme recepção, WhatsApp, pedidos de oração e presença de células em uma fila clara de acompanhamento pastoral.
          </p>
          <div className="pastoral-ai-hero-actions">
            <Link href="/app" className="pastoral-ai-nav-action">
              Dashboard
            </Link>
            <Link href="/reception" className="pastoral-ai-nav-action is-active">
              Recepção
            </Link>
            <button type="button" onClick={handleRefresh}>
              <RotateCcw size={16} />
              Atualizar
            </button>
          </div>
        </div>
        <div className="assistant-status-card">
          <span className={`assistant-dot ${assistantStatus}`} />
          <div>
            <small>Serviço supervisionado</small>
            <strong>Assistente Esdras ativo</strong>
            <p>Respostas sugeridas, áudio e encaminhamentos ficam aguardando revisão da liderança autorizada.</p>
          </div>
        </div>
      </header>

      <section className="pastoral-ai-kpi-grid">
        <article className="tone-blue">
          <MessageCircle size={22} />
          <span>Solicitações abertas</span>
          <strong>{metrics.open}</strong>
          <small>entradas vindas do WhatsApp e recepção</small>
        </article>
        <article className="tone-orange">
          <AlertTriangle size={22} />
          <span>Prioridade alta</span>
          <strong>{metrics.urgent}</strong>
          <small>precisam de validação humana</small>
        </article>
        <article className="tone-green">
          <Waypoints size={22} />
          <span>Em atendimento</span>
          <strong>{metrics.inProgress}</strong>
          <small>em triagem ou encaminhadas</small>
        </article>
        <article className="tone-purple">
          <MessageCircle size={22} />
          <span>Com WhatsApp</span>
          <strong>{metrics.withPhone}</strong>
          <small>têm contato para resposta</small>
        </article>
      </section>

      <section className="pastoral-ai-workbench">
        <article className="pastoral-ai-panel request-queue">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Fila de cuidado</span>
              <h2>Solicitações recebidas</h2>
            </div>
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
                <span>WhatsApp</span>
                <input
                  value={draftRequest.phone}
                  onChange={(event) => setDraftRequest((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="Ex: 11999999999"
                />
              </label>
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
            </div>

            <div className="quick-form-row">
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
          <span className="eyebrow">Pedido de cuidado</span>
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
            <div>
              <span>WhatsApp</span>
              <strong>{selectedRequest.phone ?? "Não informado"}</strong>
            </div>
          </div>

          <div className="suggested-response">
            <div>
              <Mic size={18} />
              <strong>Resposta sugerida</strong>
            </div>
            <textarea
              value={responseDraft}
              onChange={(event) => setResponseDraft(event.target.value)}
              rows={4}
            />
          </div>

          <div className="detail-actions">
            <button type="button" className="secondary-action" onClick={handleResolveRequest}>
              <CheckCircle2 size={17} />
              Resolver
            </button>
            <button type="button" className="secondary-action" onClick={handleCopyResponse}>
              <Copy size={17} />
              Copiar resposta
            </button>
            <button type="button" className="secondary-action" onClick={handleCreateTask}>
              Criar tarefa pastoral
            </button>
            <a
              className={whatsappUrl ? "primary-action" : "primary-action is-disabled"}
              href={whatsappUrl || undefined}
              onClick={(event) => {
                if (!whatsappUrl) {
                  event.preventDefault();
                  addActivity("WhatsApp ausente", "Informe um telefone para abrir a conversa.");
                  return;
                }
                handleSendWhatsApp();
              }}
              rel="noreferrer"
              target="_blank"
            >
              <Send size={17} />
              Abrir WhatsApp
            </a>
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

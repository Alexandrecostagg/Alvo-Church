"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Map as MapIcon,
  MessageSquareText,
  UserCheck,
  UsersRound,
  Waypoints
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  assignPersonToGroup,
  createFirebaseWebRuntimeConfigFromEnv,
  createJourneyFollowUpTask,
  fetchFollowUpTasks,
  fetchGroupMembers,
  fetchGroups,
  fetchPeople,
  fetchVisitorJourneys,
  isFirebaseWebRuntimeConfigured,
  updateFollowUpTaskStatus,
  updatePersonMemberStatus,
  updateVisitorJourneyStage
} from "@alvo/firebase";
import type { FollowUpTask, Group, GroupMember, Person, VisitorJourney } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

const journeyLanes = [
  {
    key: "visitor",
    title: "Visitantes",
    description: "Chegaram pela portaria e precisam de primeiro contato.",
    icon: ClipboardList
  },
  {
    key: "congregant",
    title: "Aspirantes",
    description: "Ja retornaram ou demonstraram interesse em caminhar.",
    icon: MessageSquareText
  },
  {
    key: "member",
    title: "Membros",
    description: "Efetivados, com ficha completa e cuidado recorrente.",
    icon: UserCheck
  },
  {
    key: "cell",
    title: "Celula",
    description: "Conectados a pequenos grupos, presenca e vida comunitaria.",
    icon: Waypoints
  }
] as const;

const memberStatusOptions: Array<{
  label: string;
  value: Person["memberStatus"];
}> = [
  { label: "Visitante", value: "visitor" },
  { label: "Congregado / aspirante", value: "congregant" },
  { label: "Novo convertido", value: "new_believer" },
  { label: "Membro", value: "member" },
  { label: "Lider", value: "leader" },
  { label: "Voluntario", value: "volunteer" }
];

const taskTemplates: Array<{
  label: string;
  title: string;
  type: FollowUpTask["type"];
}> = [
  {
    label: "Boas-vindas",
    title: "Enviar mensagem de boas-vindas",
    type: "welcome_message"
  },
  {
    label: "Primeiro contato",
    title: "Fazer primeiro contato pastoral",
    type: "first_contact"
  },
  {
    label: "Convidar para celula",
    title: "Convidar para uma celula",
    type: "invite_to_group"
  },
  {
    label: "Classe de integracao",
    title: "Convidar para classe de integracao",
    type: "invite_to_class"
  },
  {
    label: "Contato pastoral",
    title: "Agendar contato pastoral",
    type: "pastoral_contact"
  }
];

const journeyFilters = [
  { label: "Todos", value: "all" },
  { label: "Precisa contato", value: "needs_contact" },
  { label: "Sem celula", value: "without_group" },
  { label: "Pronto para membresia", value: "ready_membership" },
  { label: "Com tarefas abertas", value: "open_tasks" }
] as const;

type JourneyFilter = (typeof journeyFilters)[number]["value"];

type TaskTemplate = (typeof taskTemplates)[number];

type JourneyRecommendation =
  | {
      actionLabel: string;
      detail: string;
      kind: "task";
      template: TaskTemplate;
      title: string;
    }
  | {
      actionLabel: string;
      detail: string;
      kind: "advance";
      title: string;
    }
  | {
      actionLabel: string;
      detail: string;
      group: Group;
      kind: "group";
      title: string;
    }
  | {
      actionLabel: string;
      detail: string;
      kind: "status";
      status: Person["memberStatus"];
      title: string;
    }
  | {
      actionLabel: string;
      detail: string;
      href: string;
      kind: "link";
      title: string;
    }
  | {
      actionLabel: string;
      detail: string;
      kind: "observe";
      title: string;
    };

type CarePlanStep =
  | {
      actionKind: "task";
      actionLabel: string;
      detail: string;
      template: TaskTemplate;
      title: string;
    }
  | {
      actionKind: "group";
      actionLabel: string;
      detail: string;
      group: Group;
      title: string;
    }
  | {
      actionKind: "advance";
      actionLabel: string;
      detail: string;
      title: string;
    }
  | {
      actionKind: "status";
      actionLabel: string;
      detail: string;
      status: Person["memberStatus"];
      title: string;
    }
  | {
      actionKind: "link";
      actionLabel: string;
      detail: string;
      href: string;
      title: string;
    }
  | {
      actionKind: "none";
      actionLabel: string;
      detail: string;
      title: string;
    };

type CareSignalLevel = "urgent" | "attention" | "stable";

export function JourneysView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [journeys, setJourneys] = useState<VisitorJourney[]>([]);
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [status, setStatus] = useState("Carregando jornada operacional...");
  const [query, setQuery] = useState("");
  const [focusFilter, setFocusFilter] = useState<JourneyFilter>("all");
  const [copiedScriptForPersonId, setCopiedScriptForPersonId] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Entre no Firebase para carregar jornadas reais.");
      return;
    }

    let cancelled = false;

    async function loadJourneyCenter() {
      setStatus("Sincronizando pessoas, jornadas, tarefas e celulas...");

      try {
        const [nextPeople, nextJourneys, nextTasks, nextGroups] = await Promise.all([
          fetchPeople(firebaseConfig, { organizationId }, 120),
          fetchVisitorJourneys(firebaseConfig, { organizationId }, 80),
          fetchFollowUpTasks(firebaseConfig, { organizationId }, 120),
          fetchGroups(firebaseConfig, { organizationId }, 40)
        ]);
        const nextGroupMembers = nextGroups.length
          ? await fetchGroupMembers(firebaseConfig, { organizationId }, nextGroups)
          : [];

        if (cancelled) {
          return;
        }

        setPeople(nextPeople);
        setJourneys(nextJourneys);
        setTasks(nextTasks);
        setGroups(nextGroups);
        setGroupMembers(nextGroupMembers);
        setSelectedPersonId((currentId) => currentId ?? nextPeople[0]?.id ?? null);
        setStatus(
          `${nextPeople.length} pessoa(s), ${nextJourneys.length} jornada(s), ${nextTasks.length} tarefa(s) e ${nextGroups.length} celula(s).`
        );
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Nao foi possivel carregar jornadas.");
        }
      }
    }

    void loadJourneyCenter();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? null;
  const selectedJourney = selectedPerson
    ? journeys.find((journey) => journey.personId === selectedPerson.id) ?? null
    : null;
  const selectedTasks = selectedPerson
    ? tasks.filter((task) => task.personId === selectedPerson.id)
    : [];
  const selectedGroupMember = selectedPerson
    ? groupMembers.find((member) => member.personId === selectedPerson.id) ?? null
    : null;
  const selectedGroup = selectedGroupMember
    ? groups.find((group) => group.id === selectedGroupMember.groupId) ?? null
    : null;
  const openTasks = tasks.filter((task) => task.status !== "completed");
  const priorityTasks = [...openTasks]
    .sort((firstTask, secondTask) => getTaskDueRank(firstTask) - getTaskDueRank(secondTask))
    .slice(0, 4);
  const visitorsWithoutContact = people.filter(
    (person) =>
      person.memberStatus === "visitor" &&
      !tasks.some(
        (task) =>
          task.personId === person.id &&
          ["welcome_message", "first_contact"].includes(task.type)
      )
  );
  const aspirantsWithoutCell = people.filter(
    (person) =>
      ["visitor", "congregant", "new_believer"].includes(person.memberStatus) &&
      !groupMembers.some((member) => member.personId === person.id)
  );
  const membersWithoutCell = people.filter(
    (person) =>
      ["member", "leader", "volunteer"].includes(person.memberStatus) &&
      !groupMembers.some((member) => member.personId === person.id)
  );
  const readyForMembership = journeys.filter(
    (journey) => journey.currentStage === "ready_for_membership"
  );
  const peopleWithOpenTasks = people.filter((person) =>
    openTasks.some((task) => task.personId === person.id)
  );
  const normalizedQuery = normalizeSearch(query);
  const filteredPeople = people.filter((person) => {
    const matchesQuery = normalizedQuery
      ? normalizeSearch(
          `${getFullName(person)} ${person.email ?? ""} ${person.mobilePhone ?? ""} ${person.whatsappPhone ?? ""}`
        ).includes(normalizedQuery)
      : true;

    if (!matchesQuery) {
      return false;
    }

    return matchesJourneyFilter(focusFilter, person, {
      groupMembers,
      journeys,
      tasks
    });
  });
  const lanes = journeyLanes.map((lane) => ({
    ...lane,
    people: filteredPeople
      .filter((person) => getLaneKey(person, groupMembers) === lane.key)
      .sort((firstPerson, secondPerson) => {
        const firstSignal = getCareSignal(firstPerson, { groupMembers, journeys, tasks });
        const secondSignal = getCareSignal(secondPerson, { groupMembers, journeys, tasks });

        return (
          secondSignal.score - firstSignal.score ||
          getFullName(firstPerson).localeCompare(getFullName(secondPerson))
        );
      })
  }));
  const suggestedGroup =
    groups.find((group) => group.type === "cell" && group.status === "active") ?? groups[0] ?? null;
  const selectedOpenTasks = selectedTasks.filter((task) => task.status !== "completed");
  const selectedRecommendation = selectedPerson
    ? getJourneyRecommendation({
        group: selectedGroup,
        journey: selectedJourney,
        person: selectedPerson,
        suggestedGroup,
        tasks: selectedTasks
      })
    : null;
  const selectedTimeline = selectedPerson
    ? getJourneyTimeline({
        group: selectedGroup,
        journey: selectedJourney,
        person: selectedPerson,
        tasks: selectedTasks
      })
    : [];
  const selectedCareScript = selectedPerson
    ? getCareScript({
        group: selectedGroup ?? suggestedGroup,
        journey: selectedJourney,
        person: selectedPerson,
        recommendation: selectedRecommendation
      })
    : null;
  const selectedWhatsappHref = selectedPerson
    ? getWhatsappHref(selectedPerson, selectedCareScript ?? "")
    : null;
  const selectedReadiness = selectedPerson
    ? getMembershipReadiness({
        group: selectedGroup,
        journey: selectedJourney,
        person: selectedPerson,
        tasks: selectedTasks
      })
    : null;
  const selectedCarePlan = selectedPerson
    ? getCarePlan({
        group: selectedGroup,
        journey: selectedJourney,
        person: selectedPerson,
        readiness: selectedReadiness,
        suggestedGroup,
        tasks: selectedTasks
      })
    : [];
  const selectedCareSignal = selectedPerson
    ? getCareSignal(selectedPerson, { groupMembers, journeys, tasks })
    : null;

  async function handleStatusChange(person: Person, memberStatus: Person["memberStatus"]) {
    setPeople((currentPeople) =>
      currentPeople.map((item) => (item.id === person.id ? { ...item, memberStatus } : item))
    );
    setStatus(`${getFullName(person)} movido para ${getMemberStatusLabel(memberStatus)}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Status alterado localmente. Conecte o Firebase para persistir.");
      return;
    }

    try {
      await updatePersonMemberStatus(firebaseConfig, { organizationId }, {
        memberStatus,
        personId: person.id,
        updatedByUserId: user.uid
      });
      setStatus("Status pastoral salvo no Firestore.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel salvar o status.");
    }
  }

  async function handleCreateTask(person: Person, template: TaskTemplate) {
    const localTask: FollowUpTask = {
      id: `followup_local_${Date.now()}`,
      organizationId,
      personId: person.id,
      visitorJourneyId: selectedJourney?.id ?? "",
      assignedToUserId: user?.uid,
      title: template.title,
      type: template.type,
      status: "open",
      dueAt: new Date().toISOString()
    };
    setTasks((currentTasks) => [localTask, ...currentTasks]);
    setStatus(`${template.label} criado para ${getFullName(person)}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Tarefa criada localmente. Conecte o Firebase para persistir.");
      return;
    }

    try {
      const savedTask = await createJourneyFollowUpTask(firebaseConfig, { organizationId }, {
        assignedToUserId: user.uid,
        dueAt: localTask.dueAt,
        personId: person.id,
        title: template.title,
        type: template.type,
        visitorJourneyId: selectedJourney?.id
      });
      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === localTask.id ? savedTask : task))
      );
      setStatus("Tarefa de jornada salva no Firestore.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel criar a tarefa.");
    }
  }

  async function handleAdvanceJourney() {
    if (!selectedJourney) {
      setStatus("Esta pessoa ainda nao tem jornada de visitante vinculada.");
      return;
    }

    const nextStage = getNextJourneyStage(selectedJourney.currentStage);
    setJourneys((currentJourneys) =>
      currentJourneys.map((journey) =>
        journey.id === selectedJourney.id
          ? { ...journey, currentStage: nextStage, status: nextStage === "completed" ? "completed" : "active" }
          : journey
      )
    );
    setStatus(`Jornada avancada para ${getJourneyStageLabel(nextStage)}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Jornada avancada localmente. Conecte o Firebase para persistir.");
      return;
    }

    try {
      await updateVisitorJourneyStage(firebaseConfig, { organizationId }, {
        journeyId: selectedJourney.id,
        stage: nextStage,
        status: nextStage === "completed" ? "completed" : "active",
        updatedByUserId: user.uid
      });
      setStatus("Jornada salva no Firestore.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel avancar a jornada.");
    }
  }

  async function handleAssignGroup(person: Person, group: Group) {
    const localMember: GroupMember = {
      id: `${group.id}_${person.id}`,
      organizationId,
      groupId: group.id,
      personId: person.id,
      roleInGroup: person.memberStatus === "visitor" ? "visitor" : "member",
      joinedAt: new Date().toISOString()
    };
    setGroupMembers((currentMembers) => [
      localMember,
      ...currentMembers.filter((member) => member.id !== localMember.id)
    ]);
    setStatus(`${getFullName(person)} vinculado a ${group.name}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Vinculo com celula criado localmente. Conecte o Firebase para persistir.");
      return;
    }

    try {
      const savedMember = await assignPersonToGroup(firebaseConfig, { organizationId }, {
        assignedByUserId: user.uid,
        groupId: group.id,
        personId: person.id,
        roleInGroup: person.memberStatus === "visitor" ? "visitor" : "member"
      });
      setGroupMembers((currentMembers) =>
        currentMembers.map((member) => (member.id === localMember.id ? savedMember : member))
      );
      setStatus("Vinculo com celula salvo no Firestore.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel vincular a celula.");
    }
  }

  async function handleTaskStatusChange(task: FollowUpTask, nextStatus: FollowUpTask["status"]) {
    setTasks((currentTasks) =>
      currentTasks.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item))
    );
    setStatus(`${task.title} marcado como ${getTaskStatusLabel(nextStatus)}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Tarefa atualizada localmente. Conecte o Firebase para persistir.");
      return;
    }

    try {
      await updateFollowUpTaskStatus(firebaseConfig, { organizationId }, {
        completedByUserId: user.uid,
        status: nextStatus,
        taskId: task.id
      });
      setStatus("Tarefa atualizada no Firestore.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel atualizar a tarefa.");
    }
  }

  async function handleRecommendationAction() {
    if (!selectedPerson || !selectedRecommendation) {
      return;
    }

    switch (selectedRecommendation.kind) {
      case "task":
        await handleCreateTask(selectedPerson, selectedRecommendation.template);
        break;
      case "advance":
        await handleAdvanceJourney();
        break;
      case "group":
        await handleAssignGroup(selectedPerson, selectedRecommendation.group);
        break;
      case "status":
        await handleStatusChange(selectedPerson, selectedRecommendation.status);
        break;
      case "link":
      case "observe":
        break;
    }
  }

  async function handleCarePlanAction(step: CarePlanStep) {
    if (!selectedPerson) {
      return;
    }

    switch (step.actionKind) {
      case "task":
        await handleCreateTask(selectedPerson, step.template);
        break;
      case "group":
        await handleAssignGroup(selectedPerson, step.group);
        break;
      case "advance":
        await handleAdvanceJourney();
        break;
      case "status":
        await handleStatusChange(selectedPerson, step.status);
        break;
      case "link":
      case "none":
        break;
    }
  }

  async function handleCopyCareScript() {
    if (!selectedPerson || !selectedCareScript) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedCareScript);
      setCopiedScriptForPersonId(selectedPerson.id);
      setStatus(`Roteiro de cuidado copiado para ${getFullName(selectedPerson)}.`);
    } catch {
      setStatus("Nao foi possivel copiar automaticamente. Selecione o texto e copie manualmente.");
    }
  }

  return (
    <main className="form-page journeys-page animate-entrance">
      <section className="journeys-hero">
        <div>
          <Link className="back-link" href="/">
            Voltar ao painel
          </Link>
          <p className="eyebrow">Centro de jornadas</p>
          <h1>Do convidado ao membro ativo</h1>
          <p>
            Um funil vivo para acompanhar quem chegou, quem precisa de contato, quem
            esta pronto para membresia e quem ainda precisa entrar numa celula.
          </p>
        </div>
        <aside className="journey-health-card antigravity-float">
          <AlertTriangle size={22} />
          <strong>{visitorsWithoutContact.length + aspirantsWithoutCell.length + membersWithoutCell.length}</strong>
          <span>gargalos ativos</span>
          <p>{status}</p>
        </aside>
      </section>

      <section className="journey-bottleneck-grid">
        <BottleneckCard
          label="Sem primeiro contato"
          value={visitorsWithoutContact.length}
          detail="visitantes sem boas-vindas ou primeiro contato"
        />
        <BottleneckCard
          label="Aspirantes sem celula"
          value={aspirantsWithoutCell.length}
          detail="pessoas em transicao ainda sem grupo"
        />
        <BottleneckCard
          label="Membros sem celula"
          value={membersWithoutCell.length}
          detail="membros ativos sem pequena comunidade"
        />
        <BottleneckCard
          label="Prontos para membresia"
          value={readyForMembership.length}
          detail="jornadas pedindo decisao da lideranca"
        />
      </section>

      <section className="journey-focus-strip">
        <div>
          <p className="eyebrow">Fila de cuidado</p>
          <h2>{openTasks.length} cuidado(s) abertos agora</h2>
          <p>
            Comece por estas pessoas para manter o funil vivo: acolher, convidar,
            integrar e acompanhar ate a membresia.
          </p>
        </div>
        <div className="journey-focus-list">
          {priorityTasks.length ? (
            priorityTasks.map((task) => {
              const taskPerson = people.find((person) => person.id === task.personId);

              return (
                <button
                  className="journey-focus-item"
                  key={task.id}
                  onClick={() => setSelectedPersonId(task.personId)}
                  type="button"
                >
                  <span>{getTaskTypeLabel(task.type)}</span>
                  <strong>{taskPerson ? getFullName(taskPerson) : "Pessoa nao localizada"}</strong>
                  <p>{task.title}</p>
                </button>
              );
            })
          ) : (
            <div className="empty-state">
              <strong>Nenhuma acao aberta</strong>
              <p>A fila fica limpa quando todos os cuidados foram concluidos.</p>
            </div>
          )}
        </div>
      </section>

      <section className="journey-command-panel">
        <div className="journey-filter-bar">
          {journeyFilters.map((filter) => (
            <button
              className={focusFilter === filter.value ? "journey-filter-chip is-active" : "journey-filter-chip"}
              key={filter.value}
              onClick={() => setFocusFilter(filter.value)}
              type="button"
            >
              <span>{filter.label}</span>
              <strong>
                {getFilterCount(filter.value, {
                  aspirantsWithoutCell,
                  membersWithoutCell,
                  people,
                  peopleWithOpenTasks,
                  readyForMembership,
                  visitorsWithoutContact
                })}
              </strong>
            </button>
          ))}
        </div>

        <div className="directory-toolbar">
          <label>
            Buscar pessoa
            <input
              aria-label="Buscar pessoa em jornadas"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, email ou telefone..."
              value={query}
            />
          </label>
          <label>
            Sugestao de celula
            <select
              aria-label="Celula sugerida"
              onChange={() => undefined}
              value={suggestedGroup?.id ?? ""}
            >
              {suggestedGroup ? (
                <option value={suggestedGroup.id}>{suggestedGroup.name}</option>
              ) : (
                <option value="">Nenhuma celula cadastrada</option>
              )}
            </select>
          </label>
          <label>
            Status geral
            <input readOnly value={status} />
          </label>
        </div>

        <div className="journey-lanes">
          {lanes.map((lane) => (
            <article className="journey-lane" key={lane.key}>
              <div className="journey-lane-heading">
                <lane.icon size={18} />
                <div>
                  <strong>{lane.title}</strong>
                  <p>{lane.description}</p>
                </div>
                <span>{lane.people.length}</span>
              </div>
              <div className="journey-person-list">
                {lane.people.length ? (
                  lane.people.map((person) => {
                    const isSelected = selectedPersonId === person.id;
                    const personOpenTasks = tasks.filter(
                      (task) => task.personId === person.id && task.status !== "completed"
                    );
                    const groupMember = groupMembers.find((member) => member.personId === person.id);
                    const group = groupMember
                      ? groups.find((item) => item.id === groupMember.groupId)
                      : null;
                    const signal = getCareSignal(person, { groupMembers, journeys, tasks });

                    return (
                      <button
                        className={isSelected ? "journey-person-card is-selected" : "journey-person-card"}
                        key={person.id}
                        onClick={() => setSelectedPersonId(person.id)}
                        type="button"
                      >
                        <div className="avatar">{getInitials(getFullName(person))}</div>
                        <div>
                          <span className={`care-signal-chip is-${signal.level}`}>
                            {signal.label}
                          </span>
                          <strong>{getFullName(person)}</strong>
                          <p>{getMemberStatusLabel(person.memberStatus)}</p>
                          <small>
                            {personOpenTasks.length} tarefa(s) aberta(s)
                            {group ? ` - ${group.name}` : " - sem celula"}
                          </small>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="empty-state">
                    <strong>Nenhuma pessoa</strong>
                    <p>Quando o fluxo chegar aqui, a coluna ganha vida automaticamente.</p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="journey-detail-grid">
        <article className="journey-detail-card span-2">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Pessoa selecionada</p>
              <h2>{selectedPerson ? getFullName(selectedPerson) : "Selecione alguem"}</h2>
            </div>
            {selectedPerson ? (
              <Link className="soft-pill" href={`/members/${selectedPerson.id}`}>
                Abrir ficha
              </Link>
            ) : null}
          </div>

          {selectedPerson ? (
            <>
              {selectedRecommendation ? (
                <div className="next-best-action-card">
                  <div>
                    <p className="eyebrow">Proxima melhor acao</p>
                    <h3>{selectedRecommendation.title}</h3>
                    <p>{selectedRecommendation.detail}</p>
                  </div>
                  {selectedRecommendation.kind === "link" ? (
                    <Link className="primary-button" href={selectedRecommendation.href}>
                      {selectedRecommendation.actionLabel}
                    </Link>
                  ) : selectedRecommendation.kind === "observe" ? (
                    <span className="soft-pill">{selectedRecommendation.actionLabel}</span>
                  ) : (
                    <button
                      className="primary-button"
                      onClick={() => void handleRecommendationAction()}
                      type="button"
                    >
                      {selectedRecommendation.actionLabel}
                    </button>
                  )}
                </div>
              ) : null}

              {selectedCareSignal ? (
                <div className={`care-signal-panel is-${selectedCareSignal.level}`}>
                  <div>
                    <p className="eyebrow">Prioridade pastoral</p>
                    <h3>{selectedCareSignal.label}</h3>
                    <p>{selectedCareSignal.summary}</p>
                  </div>
                  <span>{selectedCareSignal.score} pts</span>
                </div>
              ) : null}

              <div className="journey-timeline-card">
                <p className="eyebrow">Linha do tempo</p>
                <div className="journey-timeline">
                  {selectedTimeline.map((step) => (
                    <div className={`timeline-step is-${step.state}`} key={step.label}>
                      <span />
                      <strong>{step.label}</strong>
                      <p>{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedCareScript ? (
                <div className="journey-script-card">
                  <div className="journey-script-heading">
                    <div>
                      <p className="eyebrow">Mensagem sugerida</p>
                      <h3>Roteiro para proximo contato</h3>
                    </div>
                    <span>{selectedPerson.whatsappPhone || selectedPerson.mobilePhone || "sem telefone"}</span>
                  </div>
                  <p className="script-preview">{selectedCareScript}</p>
                  <div className="script-actions">
                    <button className="ghost-button" onClick={() => void handleCopyCareScript()} type="button">
                      {copiedScriptForPersonId === selectedPerson.id ? "Copiado" : "Copiar texto"}
                    </button>
                    {selectedWhatsappHref ? (
                      <a className="primary-button compact-button" href={selectedWhatsappHref} rel="noreferrer" target="_blank">
                        Abrir WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {selectedReadiness ? (
                <div className="journey-readiness-card">
                  <div className="journey-readiness-heading">
                    <div>
                      <p className="eyebrow">Prontidao para membresia</p>
                      <h3>{selectedReadiness.completed}/{selectedReadiness.total} criterios completos</h3>
                    </div>
                    <Link className="soft-pill" href={`/members/${selectedPerson.id}`}>
                      Completar ficha
                    </Link>
                  </div>
                  <div className="readiness-meter" aria-label={`${selectedReadiness.percent}% completo`}>
                    <span style={{ width: `${selectedReadiness.percent}%` }} />
                  </div>
                  <div className="readiness-checklist">
                    {selectedReadiness.items.map((item) => (
                      <div className={item.done ? "readiness-item is-done" : "readiness-item"} key={item.label}>
                        <CheckCircle2 size={16} />
                        <span>
                          <strong>{item.label}</strong>
                          <small>{item.detail}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="care-plan-card">
                <div className="care-plan-heading">
                  <div>
                    <p className="eyebrow">Plano recomendado</p>
                    <h3>Proximos passos da pessoa</h3>
                  </div>
                  <span>{selectedCarePlan.length} passo(s)</span>
                </div>
                <div className="care-plan-list">
                  {selectedCarePlan.map((step, index) => (
                    <div className="care-plan-step" key={`${step.title}-${index}`}>
                      <b>{index + 1}</b>
                      <span>
                        <strong>{step.title}</strong>
                        <small>{step.detail}</small>
                      </span>
                      {step.actionKind === "link" ? (
                        <Link className="ghost-button" href={step.href}>
                          {step.actionLabel}
                        </Link>
                      ) : step.actionKind === "none" ? (
                        <em>{step.actionLabel}</em>
                      ) : (
                        <button
                          className="ghost-button"
                          onClick={() => void handleCarePlanAction(step)}
                          type="button"
                        >
                          {step.actionLabel}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="journey-action-grid">
                <div className="journey-action-block">
                <strong>Mudar etapa pastoral</strong>
                <p>Move a pessoa no funil: visitante, aspirante, membro, lider ou voluntario.</p>
                <select
                  aria-label="Mudar status pastoral"
                  onChange={(event) =>
                    void handleStatusChange(
                      selectedPerson,
                      event.target.value as Person["memberStatus"]
                    )
                  }
                  value={selectedPerson.memberStatus}
                >
                  {memberStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                </div>

                <div className="journey-action-block">
                <strong>Avancar jornada</strong>
                <p>
                  {selectedJourney
                    ? `Etapa atual: ${getJourneyStageLabel(selectedJourney.currentStage)}`
                    : "Nenhuma jornada de visitante vinculada."}
                </p>
                <button className="primary-button" onClick={() => void handleAdvanceJourney()} type="button">
                  <MapIcon size={16} />
                  Avancar etapa
                </button>
                </div>

                <div className="journey-action-block">
                <strong>Criar proxima acao</strong>
                <p>Transforma o cuidado em tarefa para a equipe acompanhar.</p>
                <div className="task-template-grid">
                  {taskTemplates.map((template) => (
                    <button
                      className="ghost-button"
                      key={template.type}
                      onClick={() => void handleCreateTask(selectedPerson, template)}
                      type="button"
                    >
                      <CheckCircle2 size={15} />
                      {template.label}
                    </button>
                  ))}
                </div>
                </div>

                <div className="journey-action-block">
                <strong>Conectar a celula</strong>
                <p>
                  {selectedGroup
                    ? `Ja vinculado a ${selectedGroup.name}.`
                    : "Use uma celula ativa para fechar a integracao comunitaria."}
                </p>
                {groups.length ? (
                  <div className="group-suggestion-grid">
                    {groups.slice(0, 3).map((group) => (
                      <button
                        className="group-suggestion"
                        key={group.id}
                        onClick={() => void handleAssignGroup(selectedPerson, group)}
                        type="button"
                      >
                        <Waypoints size={16} />
                        <span>
                          <strong>{group.name}</strong>
                          <small>
                            {group.meetingTime ?? "horario a definir"} - {group.city ?? "cidade nao informada"}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <strong>Nenhuma celula cadastrada</strong>
                    <p>Cadastre grupos para ativar a sugestao de integracao.</p>
                  </div>
                )}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <UsersRound size={20} />
              <strong>Nenhuma pessoa selecionada</strong>
              <p>Escolha alguem no funil para ver as acoes de jornada.</p>
            </div>
          )}
        </article>

        <aside className="journey-detail-card">
          <p className="eyebrow">Tarefas abertas</p>
          <h2>{selectedOpenTasks.length}</h2>
          <div className="journey-task-list">
            {selectedOpenTasks.length ? (
              selectedOpenTasks.map((task) => (
                <div className="journey-task-item" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <p>
                      {getTaskTypeLabel(task.type)} - {getTaskStatusLabel(task.status)}
                    </p>
                  </div>
                  <div className="task-row-actions">
                    {task.status === "open" ? (
                      <button
                        className="ghost-button"
                        onClick={() => void handleTaskStatusChange(task, "in_progress")}
                        type="button"
                      >
                        Iniciar
                      </button>
                    ) : null}
                    <button
                      className="primary-button compact-button"
                      onClick={() => void handleTaskStatusChange(task, "completed")}
                      type="button"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <strong>Sem tarefas</strong>
                <p>Crie a proxima acao para nao deixar esta pessoa solta no caminho.</p>
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function BottleneckCard({
  detail,
  label,
  value
}: {
  detail: string;
  label: string;
  value: number;
}) {
  return (
    <article className={value ? "bottleneck-card has-risk" : "bottleneck-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function getLaneKey(person: Person, groupMembers: readonly GroupMember[]) {
  const isInGroup = groupMembers.some((member) => member.personId === person.id);

  if (isInGroup) {
    return "cell";
  }

  if (person.memberStatus === "visitor") {
    return "visitor";
  }

  if (["congregant", "new_believer"].includes(person.memberStatus)) {
    return "congregant";
  }

  return "member";
}

function matchesJourneyFilter(
  filter: JourneyFilter,
  person: Person,
  context: {
    groupMembers: readonly GroupMember[];
    journeys: readonly VisitorJourney[];
    tasks: readonly FollowUpTask[];
  }
) {
  const personTasks = context.tasks.filter((task) => task.personId === person.id);
  const hasOpenTask = personTasks.some((task) => task.status !== "completed");
  const hasFirstContact = personTasks.some((task) =>
    ["welcome_message", "first_contact"].includes(task.type)
  );
  const hasGroup = context.groupMembers.some((member) => member.personId === person.id);
  const journey = context.journeys.find((item) => item.personId === person.id);

  switch (filter) {
    case "all":
      return true;
    case "needs_contact":
      return person.memberStatus === "visitor" && !hasFirstContact;
    case "without_group":
      return !hasGroup;
    case "ready_membership":
      return journey?.currentStage === "ready_for_membership";
    case "open_tasks":
      return hasOpenTask;
  }
}

function getFilterCount(
  filter: JourneyFilter,
  counts: {
    aspirantsWithoutCell: readonly Person[];
    membersWithoutCell: readonly Person[];
    people: readonly Person[];
    peopleWithOpenTasks: readonly Person[];
    readyForMembership: readonly VisitorJourney[];
    visitorsWithoutContact: readonly Person[];
  }
) {
  switch (filter) {
    case "all":
      return counts.people.length;
    case "needs_contact":
      return counts.visitorsWithoutContact.length;
    case "without_group":
      return counts.aspirantsWithoutCell.length + counts.membersWithoutCell.length;
    case "ready_membership":
      return counts.readyForMembership.length;
    case "open_tasks":
      return counts.peopleWithOpenTasks.length;
  }
}

function getTaskDueRank(task: FollowUpTask) {
  if (!task.dueAt) {
    return Number.MAX_SAFE_INTEGER;
  }

  const dueTime = new Date(task.dueAt).getTime();

  return Number.isNaN(dueTime) ? Number.MAX_SAFE_INTEGER : dueTime;
}

function getCareSignal(
  person: Person,
  context: {
    groupMembers: readonly GroupMember[];
    journeys: readonly VisitorJourney[];
    tasks: readonly FollowUpTask[];
  }
): {
  label: string;
  level: CareSignalLevel;
  score: number;
  summary: string;
} {
  const personTasks = context.tasks.filter((task) => task.personId === person.id);
  const openTasks = personTasks.filter((task) => task.status !== "completed");
  const hasOverdueTask = openTasks.some((task) => {
    if (!task.dueAt) {
      return false;
    }

    const dueTime = new Date(task.dueAt).getTime();

    return !Number.isNaN(dueTime) && dueTime < Date.now();
  });
  const hasFirstContact = personTasks.some((task) =>
    ["welcome_message", "first_contact"].includes(task.type)
  );
  const hasGroup = context.groupMembers.some((member) => member.personId === person.id);
  const journey = context.journeys.find((item) => item.personId === person.id);
  const reasons: string[] = [];
  let score = 0;

  if (hasOverdueTask) {
    score += 80;
    reasons.push("tarefa vencida");
  }

  if (person.memberStatus === "visitor" && !hasFirstContact) {
    score += 65;
    reasons.push("sem primeiro contato");
  }

  if (journey?.currentStage === "ready_for_membership") {
    score += 55;
    reasons.push("decisao de membresia pendente");
  }

  if (!hasGroup) {
    score += ["member", "leader", "volunteer"].includes(person.memberStatus) ? 35 : 28;
    reasons.push("sem celula");
  }

  if (openTasks.length) {
    score += Math.min(openTasks.length * 12, 36);
    reasons.push(`${openTasks.length} cuidado(s) aberto(s)`);
  }

  if (score >= 85) {
    return {
      label: "Urgente",
      level: "urgent",
      score,
      summary: reasons.join(", ")
    };
  }

  if (score >= 35) {
    return {
      label: "Acompanhar",
      level: "attention",
      score,
      summary: reasons.join(", ")
    };
  }

  return {
    label: "Estavel",
    level: "stable",
    score,
    summary: reasons.length ? reasons.join(", ") : "sem gargalo critico agora"
  };
}

function getJourneyRecommendation({
  group,
  journey,
  person,
  suggestedGroup,
  tasks
}: {
  group: Group | null;
  journey: VisitorJourney | null;
  person: Person;
  suggestedGroup: Group | null;
  tasks: readonly FollowUpTask[];
}): JourneyRecommendation {
  const hasWelcome = tasks.some((task) =>
    ["welcome_message", "first_contact"].includes(task.type)
  );
  const hasGroupInvite = tasks.some((task) => task.type === "invite_to_group");
  const hasClassInvite = tasks.some((task) => task.type === "invite_to_class");

  if (!journey && person.memberStatus === "visitor") {
    return {
      actionLabel: "Abrir portaria",
      detail: "Essa pessoa parece visitante, mas ainda nao tem uma jornada de recepcao vinculada. O melhor caminho e registrar a chegada pela portaria.",
      href: "/reception",
      kind: "link",
      title: "Registrar chegada antes de cuidar"
    };
  }

  if (!hasWelcome) {
    return {
      actionLabel: "Criar boas-vindas",
      detail: "Primeiro contato reduz perda no funil. Crie uma tarefa simples para WhatsApp ou ligacao ainda hoje.",
      kind: "task",
      template: taskTemplates[0],
      title: "Comecar com acolhimento"
    };
  }

  if (journey && getJourneyStageRank(journey.currentStage) < getJourneyStageRank("invited_to_group")) {
    return {
      actionLabel: "Avancar etapa",
      detail: "A pessoa ja recebeu cuidado inicial. Agora vale registrar o convite para celula ou proximo encontro.",
      kind: "advance",
      title: "Mover para integracao"
    };
  }

  if (!group && suggestedGroup) {
    return {
      actionLabel: `Vincular a ${suggestedGroup.name}`,
      detail: "Sem pequena comunidade, a jornada fica solta. Vincule a uma celula para criar pertencimento e acompanhamento.",
      group: suggestedGroup,
      kind: "group",
      title: "Conectar a uma celula"
    };
  }

  if (!hasGroupInvite && !group) {
    return {
      actionLabel: "Criar convite",
      detail: "Ainda nao existe convite para celula registrado. Transforme esse proximo passo em tarefa para a equipe.",
      kind: "task",
      template: taskTemplates[2],
      title: "Preparar convite para comunidade"
    };
  }

  if (!hasClassInvite && ["visitor", "congregant", "new_believer"].includes(person.memberStatus)) {
    return {
      actionLabel: "Criar convite para classe",
      detail: "A classe de integracao ajuda a explicar visao, cultura e proximos passos antes da membresia.",
      kind: "task",
      template: taskTemplates[3],
      title: "Levar para classe de integracao"
    };
  }

  if (
    journey?.currentStage === "ready_for_membership" &&
    ["visitor", "congregant", "new_believer"].includes(person.memberStatus)
  ) {
    const readiness = getMembershipReadiness({ group, journey, person, tasks });

    if (readiness.percent < 100) {
      return {
        actionLabel: "Abrir ficha",
        detail: "A jornada esta pronta para decisao, mas ainda faltam dados ou vinculos antes de efetivar com seguranca.",
        href: `/members/${person.id}`,
        kind: "link",
        title: "Completar ficha antes da membresia"
      };
    }

    return {
      actionLabel: "Efetivar como membro",
      detail: "A jornada indica prontidao. Se a lideranca concordar, atualize o status pastoral para membro.",
      kind: "status",
      status: "member",
      title: "Decidir membresia"
    };
  }

  return {
    actionLabel: "Acompanhar",
    detail: group
      ? `Pessoa conectada a ${group.name}. Mantenha presenca, cuidado pastoral e proximas oportunidades de servico.`
      : "Nenhum gargalo critico apareceu agora. Continue acompanhando presenca e relacionamento.",
    kind: "observe",
    title: "Fluxo em acompanhamento"
  };
}

function getJourneyTimeline({
  group,
  journey,
  person,
  tasks
}: {
  group: Group | null;
  journey: VisitorJourney | null;
  person: Person;
  tasks: readonly FollowUpTask[];
}) {
  const hasWelcome = tasks.some((task) =>
    ["welcome_message", "first_contact"].includes(task.type)
  );
  const invitedToGroup =
    Boolean(group) ||
    tasks.some((task) => task.type === "invite_to_group") ||
    (journey ? getJourneyStageRank(journey.currentStage) >= getJourneyStageRank("invited_to_group") : false);
  const inClass =
    tasks.some((task) => task.type === "invite_to_class") ||
    (journey ? getJourneyStageRank(journey.currentStage) >= getJourneyStageRank("attending_class") : false);
  const isMember = ["member", "leader", "volunteer"].includes(person.memberStatus);

  return [
    {
      detail: journey ? getJourneyStageLabel(journey.currentStage) : "sem registro de portaria",
      label: "Chegada",
      state: journey ? "done" : "active"
    },
    {
      detail: hasWelcome ? "boas-vindas registradas" : "aguardando primeiro contato",
      label: "Contato",
      state: hasWelcome ? "done" : "active"
    },
    {
      detail: invitedToGroup ? group?.name ?? "convite para celula" : "sem celula ou convite",
      label: "Comunidade",
      state: invitedToGroup ? "done" : hasWelcome ? "active" : "pending"
    },
    {
      detail: inClass ? "classe ou preparo iniciado" : "aguardando integracao",
      label: "Integracao",
      state: inClass ? "done" : invitedToGroup ? "active" : "pending"
    },
    {
      detail: isMember ? getMemberStatusLabel(person.memberStatus) : "ainda nao efetivado",
      label: "Membresia",
      state: isMember ? "done" : inClass ? "active" : "pending"
    }
  ] as const;
}

function getJourneyStageRank(stage: VisitorJourney["currentStage"]) {
  const order: Record<VisitorJourney["currentStage"], number> = {
    new_visitor: 1,
    welcomed: 2,
    invited_to_group: 3,
    attending_class: 4,
    ready_for_membership: 5,
    completed: 6
  };

  return order[stage];
}

function getMembershipReadiness({
  group,
  journey,
  person,
  tasks
}: {
  group: Group | null;
  journey: VisitorJourney | null;
  person: Person;
  tasks: readonly FollowUpTask[];
}) {
  const hasPhone = Boolean(person.whatsappPhone || person.mobilePhone);
  const hasAddress = Boolean(
    person.address?.street &&
      person.address?.number &&
      person.address?.city &&
      person.address?.state
  );
  const hasFamily = Boolean(person.primaryFamilyId);
  const hasConsent = Boolean(person.consentLgpdAt);
  const hasFirstCare = tasks.some((task) =>
    ["welcome_message", "first_contact", "pastoral_contact"].includes(task.type)
  );
  const journeyReady = Boolean(
    journey &&
      getJourneyStageRank(journey.currentStage) >= getJourneyStageRank("welcomed")
  );

  const items = [
    {
      detail: hasPhone ? "telefone ou WhatsApp cadastrado" : "adicione telefone ou WhatsApp",
      done: hasPhone,
      label: "Contato"
    },
    {
      detail: hasAddress ? "endereco completo registrado" : "complete rua, numero, cidade e estado",
      done: hasAddress,
      label: "Endereco"
    },
    {
      detail: hasFamily ? "vinculo familiar ativo" : "vincule a um grupo familiar",
      done: hasFamily,
      label: "Familia"
    },
    {
      detail: hasConsent ? "consentimento registrado" : "registre consentimento LGPD",
      done: hasConsent,
      label: "LGPD"
    },
    {
      detail: group ? `conectado a ${group.name}` : "conecte a uma celula ou grupo",
      done: Boolean(group),
      label: "Comunidade"
    },
    {
      detail: hasFirstCare && journeyReady ? "acolhimento iniciado" : "registre acolhimento e etapa inicial",
      done: hasFirstCare && journeyReady,
      label: "Cuidado inicial"
    }
  ];
  const completed = items.filter((item) => item.done).length;

  return {
    completed,
    items,
    percent: Math.round((completed / items.length) * 100),
    total: items.length
  };
}

function getCarePlan({
  group,
  journey,
  person,
  readiness,
  suggestedGroup,
  tasks
}: {
  group: Group | null;
  journey: VisitorJourney | null;
  person: Person;
  readiness: ReturnType<typeof getMembershipReadiness> | null;
  suggestedGroup: Group | null;
  tasks: readonly FollowUpTask[];
}): CarePlanStep[] {
  const steps: CarePlanStep[] = [];
  const hasWelcome = tasks.some((task) =>
    ["welcome_message", "first_contact"].includes(task.type)
  );
  const hasClassInvite = tasks.some((task) => task.type === "invite_to_class");
  const hasPastoralContact = tasks.some((task) => task.type === "pastoral_contact");
  const isMember = ["member", "leader", "volunteer"].includes(person.memberStatus);
  const hasProfileGaps = Boolean(readiness?.items.some((item) => !item.done));

  if (!journey && person.memberStatus === "visitor") {
    steps.push({
      actionKind: "link",
      actionLabel: "Abrir portaria",
      detail: "Crie a jornada pela recepcao para registrar origem, chegada e cuidado inicial.",
      href: "/reception",
      title: "Registrar chegada"
    });
  }

  if (!hasWelcome) {
    steps.push({
      actionKind: "task",
      actionLabel: "Criar tarefa",
      detail: "Garanta que alguem envie boas-vindas ou faca o primeiro contato.",
      template: taskTemplates[0],
      title: "Primeiro acolhimento"
    });
  }

  if (journey && getJourneyStageRank(journey.currentStage) < getJourneyStageRank("invited_to_group")) {
    steps.push({
      actionKind: "advance",
      actionLabel: "Avancar etapa",
      detail: "Depois do primeiro cuidado, registre que a pessoa foi movida para integracao.",
      title: "Atualizar etapa da jornada"
    });
  }

  if (!group && suggestedGroup) {
    steps.push({
      actionKind: "group",
      actionLabel: "Vincular",
      detail: `Sugestao: conectar com ${suggestedGroup.name}.`,
      group: suggestedGroup,
      title: "Conectar a comunidade"
    });
  }

  if (!hasClassInvite && ["visitor", "congregant", "new_believer"].includes(person.memberStatus)) {
    steps.push({
      actionKind: "task",
      actionLabel: "Criar convite",
      detail: "Convide para classe de integracao antes de uma decisao formal de membresia.",
      template: taskTemplates[3],
      title: "Classe de integracao"
    });
  }

  if (!hasPastoralContact && journey?.currentStage === "ready_for_membership") {
    steps.push({
      actionKind: "task",
      actionLabel: "Agendar",
      detail: "Antes da efetivacao, vale registrar uma conversa pastoral ou de integracao.",
      template: taskTemplates[4],
      title: "Conversa pastoral"
    });
  }

  if (hasProfileGaps && !isMember) {
    steps.push({
      actionKind: "link",
      actionLabel: "Completar ficha",
      detail: "Feche dados essenciais de contato, familia, LGPD, endereco e comunidade.",
      href: `/members/${person.id}`,
      title: "Completar dados obrigatorios"
    });
  }

  if (!isMember && readiness?.percent === 100 && journey?.currentStage === "ready_for_membership") {
    steps.push({
      actionKind: "status",
      actionLabel: "Efetivar",
      detail: "Com a ficha completa e a jornada pronta, a lideranca pode confirmar a membresia.",
      status: "member",
      title: "Confirmar membresia"
    });
  }

  if (!steps.length) {
    steps.push({
      actionKind: "none",
      actionLabel: "Sem pendencias",
      detail: group
        ? `Continue acompanhando presenca e cuidado em ${group.name}.`
        : "Acompanhe proximas presencas, relacionamento e oportunidades de servico.",
      title: "Manter acompanhamento"
    });
  }

  return steps.slice(0, 5);
}

function getCareScript({
  group,
  journey,
  person,
  recommendation
}: {
  group: Group | null;
  journey: VisitorJourney | null;
  person: Person;
  recommendation: JourneyRecommendation | null;
}) {
  const firstName = person.preferredName || person.firstName || "tudo bem";
  const groupLine = group
    ? `Temos uma celula chamada ${group.name}${group.meetingTime ? `, que se encontra as ${group.meetingTime}` : ""}.`
    : "Queremos te ajudar a encontrar uma celula ou grupo de cuidado perto de voce.";

  if (recommendation?.kind === "group") {
    return `Ola, ${firstName}! Passando para dizer que foi muito bom ter voce caminhando com a gente. ${groupLine} Posso te mandar mais detalhes e te conectar com a lideranca?`;
  }

  if (recommendation?.kind === "status") {
    return `Ola, ${firstName}! Estamos felizes com sua caminhada na Getro Church. A lideranca quer conversar with voce sobre os proximos passos de membresia e participacao. Podemos combinar um melhor horario?`;
  }

  if (recommendation?.kind === "advance" || journey?.currentStage === "welcomed") {
    return `Ola, ${firstName}! Que alegria seguir perto de voce. Queremos te convidar para um proximo passo de integracao na Getro Church. ${groupLine}`;
  }

  if (recommendation?.kind === "task" && recommendation.template.type === "invite_to_class") {
    return `Ola, ${firstName}! Temos uma classe de integracao para apresentar melhor a visao da Getro Church e os proximos passos para quem deseja caminhar conosco. Posso te passar as informacoes?`;
  }

  return `Ola, ${firstName}! Que bom ter voce com a gente na Getro Church. Queremos saber como voce esta e te ajudar nos proximos passos. Posso te enviar um convite para uma celula ou momento de integracao?`;
}

function getWhatsappHref(person: Person, message: string) {
  const rawPhone = person.whatsappPhone || person.mobilePhone;

  if (!rawPhone) {
    return null;
  }

  const digits = rawPhone.replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function getFullName(person: Person) {
  return `${person.preferredName || person.firstName} ${person.lastName}`.trim();
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getMemberStatusLabel(status: Person["memberStatus"]) {
  switch (status) {
    case "visitor":
      return "Visitante";
    case "congregant":
      return "Congregado / aspirante";
    case "new_believer":
      return "Novo convertido";
    case "member":
      return "Membro";
    case "leader":
      return "Lider";
    case "volunteer":
      return "Voluntario";
  }
}

function getJourneyStageLabel(stage: VisitorJourney["currentStage"]) {
  switch (stage) {
    case "new_visitor":
      return "Novo visitante";
    case "welcomed":
      return "Recebido";
    case "invited_to_group":
      return "Convidado para celula";
    case "attending_class":
      return "Classe de integracao";
    case "ready_for_membership":
      return "Pronto para membresia";
    case "completed":
      return "Jornada concluida";
  }
}

function getNextJourneyStage(stage: VisitorJourney["currentStage"]): VisitorJourney["currentStage"] {
  switch (stage) {
    case "new_visitor":
      return "welcomed";
    case "welcomed":
      return "invited_to_group";
    case "invited_to_group":
      return "attending_class";
    case "attending_class":
      return "ready_for_membership";
    case "ready_for_membership":
    case "completed":
      return "completed";
  }
}

function getTaskTypeLabel(type: FollowUpTask["type"]) {
  switch (type) {
    case "welcome_message":
      return "Boas-vindas";
    case "first_contact":
      return "Primeiro contato";
    case "invite_to_group":
      return "Convite para celula";
    case "invite_to_class":
      return "Convite para classe";
    case "pastoral_contact":
      return "Contato pastoral";
  }
}

function getTaskStatusLabel(status: FollowUpTask["status"]) {
  switch (status) {
    case "open":
      return "Aberta";
    case "in_progress":
      return "Em andamento";
    case "completed":
      return "Concluida";
    case "cancelled":
      return "Cancelada";
  }
}

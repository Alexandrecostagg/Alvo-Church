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
  Waypoints,
  Flame,
  Check,
  Send,
  Plus,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  RefreshCw
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
import { recentPeople, activeJourneys, followUps, activeGroups, latestAttendance } from "../../lib/mock-data";

const journeyLanes = [
  {
    key: "visitor",
    title: "Visitantes",
    description: "Recém-chegados precisando de acolhimento inicial.",
    icon: ClipboardList,
    color: "#3b82f6"
  },
  {
    key: "congregant",
    title: "Aspirantes",
    description: "Frequentadores em transição para aliança pastoral.",
    icon: MessageSquareText,
    color: "#f59e0b"
  },
  {
    key: "member",
    title: "Membros",
    description: "Aliançados ativos precisando de acompanhamento.",
    icon: UserCheck,
    color: "#10b981"
  },
  {
    key: "cell",
    title: "Em Célula",
    description: "Engajados e ativos em pequenos grupos semanais.",
    icon: Waypoints,
    color: "#8b5cf6"
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
  { label: "Líder", value: "leader" },
  { label: "Voluntário", value: "volunteer" }
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
    label: "Convidar para célula",
    title: "Convidar para uma célula",
    type: "invite_to_group"
  },
  {
    label: "Classe de integração",
    title: "Convidar para classe de integração",
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
  { label: "Sem célula", value: "without_group" },
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
  const [status, setStatus] = useState("Sincronizando jornadas contínuas...");
  const [query, setQuery] = useState("");
  const [focusFilter, setFocusFilter] = useState<JourneyFilter>("all");
  const [copiedScriptForPersonId, setCopiedScriptForPersonId] = useState<string | null>(null);

  // Copiloto de WhatsApp: Mensagem ativa editável
  const [whatsappMessageDraft, setWhatsappMessageDraft] = useState("");
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);

  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Exibindo jornadas simuladas de acolhimento.");
      // Se não houver firebase, carrega mock data
      setPeople(recentPeople as unknown as Person[]);
      setJourneys(activeJourneys as unknown as VisitorJourney[]);
      setTasks(followUps as unknown as FollowUpTask[]);
      setGroups(activeGroups as unknown as Group[]);
      setGroupMembers(latestAttendance.map(a => ({
        id: `member_${a.id}`,
        organizationId: "org_default",
        groupId: a.groupId,
        personId: a.personId,
        roleInGroup: "member",
        joinedAt: new Date().toISOString()
      })) as unknown as GroupMember[]);
      setSelectedPersonId(recentPeople[0]?.id ?? null);
      return;
    }

    let cancelled = false;

    async function loadJourneyCenter() {
      setStatus("Sincronizando pessoas, jornadas, tarefas e células...");

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

        if (cancelled) return;

        const finalPeople = nextPeople.length > 0 ? nextPeople : (recentPeople as unknown as Person[]);
        const finalJourneys = nextJourneys.length > 0 ? nextJourneys : (activeJourneys as unknown as VisitorJourney[]);
        const finalTasks = nextTasks.length > 0 ? nextTasks : (followUps as unknown as FollowUpTask[]);
        const finalGroups = nextGroups.length > 0 ? nextGroups : (activeGroups as unknown as Group[]);
        const finalGroupMembers = nextGroupMembers.length > 0 ? nextGroupMembers : (latestAttendance.map(a => ({
          id: `member_${a.id}`,
          organizationId,
          groupId: a.groupId,
          personId: a.personId,
          roleInGroup: "member",
          joinedAt: new Date().toISOString()
        })) as unknown as GroupMember[]);

        setPeople(finalPeople);
        setJourneys(finalJourneys);
        setTasks(finalTasks);
        setGroups(finalGroups);
        setGroupMembers(finalGroupMembers);
        setSelectedPersonId((currentId) => currentId ?? finalPeople[0]?.id ?? null);
        setStatus(
          `${nextPeople.length} pessoa(s) sincronizada(s) no Firestore.`
        );
      } catch (error) {
        if (!cancelled) {
          setStatus("Exibindo jornadas simuladas para segurança operacional.");
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

    if (!matchesQuery) return false;

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

  // Lista de templates reativos para o Copiloto de Mensagens
  const messageTemplates = useMemo(() => {
    if (!selectedPerson) return [];
    const firstName = selectedPerson.preferredName || selectedPerson.firstName || "amigo(a)";
    const cellName = selectedGroup?.name ?? suggestedGroup?.name ?? "nossa célula";

    return [
      {
        title: "Acolhimento Inicial",
        body: `Olá, ${firstName}! Que alegria enorme ter você conosco na celebração do Alvo Church! Queríamos te saudar de forma bem especial e saber se você se sentiu bem acolhido(a). Algum pedido de oração especial em que possamos te apoiar?`
      },
      {
        title: "Convite para Célula",
        body: `Oi, ${firstName}! Vendo sua caminhada, queríamos te fazer um convite super especial: participar de um encontro na célula ${cellName} esta semana. É um ambiente perfeito para criar laços e comunhão! O que acha de fazermos uma visita juntos?`
      },
      {
        title: "Acompanhamento de Líder",
        body: `Olá, ${firstName}! Tudo bem? Passando para saber como foi sua semana. Estamos preparando nossos próximos passos e reuniões da equipe, e sua presença é fundamental para o fortalecimento da nossa igreja. Deus te abençoe!`
      }
    ];
  }, [selectedPerson, selectedGroup, suggestedGroup]);

  // Atualiza o rascunho de WhatsApp quando o membro ou o template é selecionado
  useEffect(() => {
    if (messageTemplates.length > 0) {
      setWhatsappMessageDraft(messageTemplates[selectedTemplateIndex]?.body ?? "");
    }
  }, [selectedPerson, selectedTemplateIndex, messageTemplates]);

  // Link final gerado para o WhatsApp Web
  const selectedWhatsappHref = useMemo(() => {
    if (!selectedPerson || !whatsappMessageDraft) return null;
    const rawPhone = selectedPerson.whatsappPhone || selectedPerson.mobilePhone;
    if (!rawPhone) return null;

    const digits = rawPhone.replace(/\D/g, "");
    const phone = digits.startsWith("55") ? digits : `55${digits}`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessageDraft)}`;
  }, [selectedPerson, whatsappMessageDraft]);

  async function handleStatusChange(person: Person, memberStatus: Person["memberStatus"]) {
    setPeople((currentPeople) =>
      currentPeople.map((item) => (item.id === person.id ? { ...item, memberStatus } : item))
    );
    setStatus(`${getFullName(person)} movido para ${getMemberStatusLabel(memberStatus)}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) return;

    try {
      await updatePersonMemberStatus(firebaseConfig, { organizationId }, {
        memberStatus,
        personId: person.id,
        updatedByUserId: user.uid
      });
      setStatus("Status pastoral atualizado no Firestore.");
    } catch (error) {
      setStatus("Erro ao persistir o status no Firebase.");
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

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) return;

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
      setStatus("Tarefa gravada com sucesso no Firestore.");
    } catch (error) {
      setStatus("Erro ao persistir tarefa de cuidado.");
    }
  }

  async function handleAdvanceJourney() {
    if (!selectedJourney) {
      setStatus("Visitante sem jornada pastoral cadastrada.");
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
    setStatus(`Jornada avançada para ${getJourneyStageLabel(nextStage)}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) return;

    try {
      await updateVisitorJourneyStage(firebaseConfig, { organizationId }, {
        journeyId: selectedJourney.id,
        stage: nextStage,
        status: nextStage === "completed" ? "completed" : "active",
        updatedByUserId: user.uid
      });
      setStatus("Etapa da jornada atualizada no Firestore.");
    } catch (error) {
      setStatus("Erro ao salvar progresso da jornada.");
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
    setStatus(`${getFullName(person)} conectado à célula ${group.name}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) return;

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
      setStatus("Membro da célula vinculado no Firestore.");
    } catch (error) {
      setStatus("Erro ao persistir vínculo da célula.");
    }
  }

  async function handleTaskStatusChange(task: FollowUpTask, nextStatus: FollowUpTask["status"]) {
    setTasks((currentTasks) =>
      currentTasks.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item))
    );
    setStatus(`${task.title} marcado como ${getTaskStatusLabel(nextStatus)}.`);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) return;

    try {
      await updateFollowUpTaskStatus(firebaseConfig, { organizationId }, {
        completedByUserId: user.uid,
        status: nextStatus,
        taskId: task.id
      });
      setStatus("Status da tarefa gravado no Firestore.");
    } catch (error) {
      setStatus("Erro ao atualizar status da tarefa.");
    }
  }

  async function handleRecommendationAction() {
    if (!selectedPerson || !selectedRecommendation) return;

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
    if (!selectedPerson) return;

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
    if (!selectedPerson || !whatsappMessageDraft) return;

    try {
      await navigator.clipboard.writeText(whatsappMessageDraft);
      setCopiedScriptForPersonId(selectedPerson.id);
      setStatus(`Mensagem copiada com sucesso!`);
    } catch {
      setStatus("Selecione e copie a mensagem manualmente.");
    }
  }

  return (
    <main className="form-page journeys-page animate-entrance" style={{ maxWidth: 1440, padding: "2rem" }}>
      
      {/* Hero Central de Acolhimento */}
      <section className="journeys-hero" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "2rem" }}>
        <div>
          <Link className="back-link" href="/" style={{ color: "#f97316" }}>
            Voltar ao painel
          </Link>
          <p className="eyebrow" style={{ color: "#f97316" }}>Painel de Integração</p>
          <h1>Jornadas de Integração & Triagem Pastoral</h1>
          <p>
            Raciocínio profundo para o cuidado de almas: gerencie gargalos ativos, acompanhe a evolução de visitantes
            para a aliança de membresia e monitore a inserção em células.
          </p>
        </div>
        <aside className="journey-health-card antigravity-float" style={{ backgroundColor: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "1.5rem" }}>
          <AlertTriangle size={24} style={{ color: "#f59e0b" }} />
          <strong style={{ fontSize: "2rem", display: "block", color: "white", marginTop: 8 }}>
            {visitorsWithoutContact.length + aspirantsWithoutCell.length + membersWithoutCell.length}
          </strong>
          <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Gargalos de cuidado ativos</span>
          <p style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 8 }}>{status}</p>
        </aside>
      </section>

      {/* Cartões de Alerta de Triagem (Gargalos) */}
      <section className="journey-bottleneck-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginTop: "2rem" }}>
        <BottleneckCard
          label="Sem Primeiro Contato"
          value={visitorsWithoutContact.length}
          detail="Novos visitantes sem boas-vindas"
          color="#3b82f6"
        />
        <BottleneckCard
          label="Aspirantes sem Célula"
          value={aspirantsWithoutCell.length}
          detail="Frequentadores fora de células"
          color="#f59e0b"
        />
        <BottleneckCard
          label="Membros sem Célula"
          value={membersWithoutCell.length}
          detail="Aliançados sem grupo comunitário"
          color="#8b5cf6"
        />
        <BottleneckCard
          label="Decisões de Membresia"
          value={readyForMembership.length}
          detail="Jornadas completas para efetivar"
          color="#10b981"
        />
      </section>

      {/* Triagem Pastoral Kanban Swimlanes */}
      <section className="journey-command-panel" style={{ marginTop: "3rem" }}>
        
        {/* Chips de Filtro Rápido */}
        <div className="journey-filter-bar" style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem" }}>
          {journeyFilters.map((filter) => (
            <button
              className={focusFilter === filter.value ? "journey-filter-chip is-active" : "journey-filter-chip"}
              key={filter.value}
              onClick={() => setFocusFilter(filter.value)}
              type="button"
              style={{
                backgroundColor: focusFilter === filter.value ? "#f97316" : "rgba(30, 41, 59, 0.3)",
                border: focusFilter === filter.value ? "1px solid #ea580c" : "1px solid rgba(255,255,255,0.05)",
                padding: "8px 16px",
                borderRadius: 12,
                color: "white",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              <span style={{ marginRight: 8 }}>{filter.label}</span>
              <strong style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: 8, fontSize: "0.8rem" }}>
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

        {/* Toolbar de Busca */}
        <div className="directory-toolbar" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", backgroundColor: "rgba(30, 41, 59, 0.2)", padding: "1.25rem", borderRadius: 20, border: "1px solid rgba(255,255,255,0.05)" }}>
          <label style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
            Buscar Pessoa
            <input
              aria-label="Buscar pessoa em jornadas"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, e-mail ou telefone..."
              value={query}
              style={{ width: "100%", padding: "10px", backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "white", marginTop: 6 }}
            />
          </label>
          <label style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
            Célula Sugerida
            <select
              aria-label="Célula sugerida"
              onChange={() => undefined}
              value={suggestedGroup?.id ?? ""}
              style={{ width: "100%", padding: "10px", backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "white", marginTop: 6 }}
            >
              {suggestedGroup ? (
                <option value={suggestedGroup.id}>{suggestedGroup.name}</option>
              ) : (
                <option value="">Nenhuma célula</option>
              )}
            </select>
          </label>
          <label style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
            Status de Sincronia
            <input 
              readOnly 
              value={status} 
              style={{ width: "100%", padding: "10px", backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, color: "#94a3b8", marginTop: 6 }} 
            />
          </label>
        </div>

        {/* Kanban Board columns */}
        <div className="journey-lanes" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem", marginTop: "2rem" }}>
          {lanes.map((lane) => (
            <article 
              className="journey-lane" 
              key={lane.key} 
              style={{ 
                backgroundColor: "rgba(30, 41, 59, 0.25)", 
                border: "1px solid rgba(255,255,255,0.04)", 
                borderRadius: 24, 
                padding: "1.25rem",
                borderTop: `4px solid ${lane.color}`
              }}
            >
              <div className="journey-lane-heading" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
                <div style={{ color: lane.color }}><lane.icon size={20} /></div>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: "white", display: "block", fontSize: "1rem" }}>{lane.title}</strong>
                  <span style={{ color: "#64748b", fontSize: "0.7rem", display: "block", lineHeight: "0.9rem", marginTop: 2 }}>{lane.description}</span>
                </div>
                <span style={{ background: "rgba(255,255,255,0.08)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 700 }}>
                  {lane.people.length}
                </span>
              </div>

              <div className="journey-person-list" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minHeight: 180 }}>
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
                        onClick={() => {
                          setSelectedPersonId(person.id);
                          setSelectedTemplateIndex(0); // Reseta para o primeiro template
                        }}
                        type="button"
                        style={{
                          width: "100%",
                          textAlign: "left",
                          backgroundColor: isSelected ? "rgba(249, 115, 22, 0.12)" : "rgba(30, 41, 59, 0.4)",
                          border: isSelected ? "1px solid #f97316" : "1px solid rgba(255,255,255,0.05)",
                          borderRadius: 16,
                          padding: "1rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          display: "flex",
                          gap: 12
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: lane.color, display: "flex", alignItems: "center", color: "white", fontWeight: 700, fontSize: "0.85rem", justifyContent: "center" }}>
                          {getInitials(getFullName(person))}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span 
                            style={{ 
                              fontSize: "0.6rem", 
                              fontWeight: 800, 
                              textTransform: "uppercase", 
                              color: signal.level === "urgent" ? "#ef4444" : signal.level === "attention" ? "#f59e0b" : "#10b981",
                              backgroundColor: signal.level === "urgent" ? "rgba(239,68,68,0.1)" : signal.level === "attention" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                              padding: "2px 6px",
                              borderRadius: 6,
                              display: "inline-block",
                              marginBottom: 4
                            }}
                          >
                            {signal.label}
                          </span>
                          <strong style={{ color: "white", display: "block", fontSize: "0.85rem" }}>{getFullName(person)}</strong>
                          <small style={{ color: "#64748b", fontSize: "0.7rem", display: "block", marginTop: 4 }}>
                            {personOpenTasks.length} tarefa(s) · {group ? group.name : "sem célula"}
                          </small>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div style={{ textAlign: "center", padding: "2rem", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: 16 }}>
                    <span style={{ color: "#64748b", fontSize: "0.75rem" }}>Fila vazia</span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Painel Detalhado de Cuidado e Copiloto de WhatsApp */}
      <section className="journey-detail-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem", marginTop: "3rem" }}>
        
        {/* Painel Central do Membro Selecionado */}
        <article className="journey-detail-card" style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 24, padding: "2rem" }}>
          
          {selectedPerson ? (
            <>
              {/* Header do Membro */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#f97316", textTransform: "uppercase", fontWeight: 800 }}>Membro em Foco</span>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: 900, color: "white", marginTop: 4 }}>
                    {getFullName(selectedPerson)}
                  </h2>
                </div>
                <Link className="soft-pill" href={`/members/${selectedPerson.id}`} style={{ backgroundColor: "rgba(249,115,22,0.15)", color: "#f97316", padding: "8px 16px", borderRadius: 12, fontWeight: 700, fontSize: "0.85rem" }}>
                  Abrir Ficha Completa
                </Link>
              </div>

              {/* Termômetro de Engajamento Pastoral */}
              {selectedCareSignal && (
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  backgroundColor: selectedCareSignal.level === "urgent" ? "rgba(239,68,68,0.08)" : selectedCareSignal.level === "attention" ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)",
                  border: selectedCareSignal.level === "urgent" ? "1px solid rgba(239,68,68,0.2)" : selectedCareSignal.level === "attention" ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(16,185,129,0.2)",
                  padding: "1.25rem",
                  borderRadius: 20,
                  marginBottom: "2rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 10, 
                      backgroundColor: selectedCareSignal.level === "urgent" ? "#ef4444" : selectedCareSignal.level === "attention" ? "#f59e0b" : "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white"
                    }}>
                      <Flame size={20} />
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Termômetro Pastoral (Urgência)</span>
                      <h4 style={{ color: "white", fontWeight: 800, fontSize: "1rem", marginTop: 2 }}>
                        Status: {selectedCareSignal.label} · <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: "0.85rem" }}>{selectedCareSignal.summary}</span>
                      </h4>
                    </div>
                  </div>
                  <strong style={{ fontSize: "1.25rem", color: "white", fontFamily: "monospace" }}>{selectedCareSignal.score} pts</strong>
                </div>
              )}

              {/* 💬 COPILOTO DE WHATSAPP (Live Script Editor) */}
              <div style={{ backgroundColor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 20, padding: "1.5rem", marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "#f97316", textTransform: "uppercase", fontWeight: 800 }}>Copiloto de Mensagens</span>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "white", marginTop: 2 }}>Disparar Acolhimento Reativo</h3>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    WhatsApp: <strong>{selectedPerson.whatsappPhone || selectedPerson.mobilePhone || "Não informado"}</strong>
                  </span>
                </div>

                {/* Seleção de Templates */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                  {messageTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTemplateIndex(idx)}
                      style={{
                        backgroundColor: selectedTemplateIndex === idx ? "#f97316" : "rgba(255,255,255,0.05)",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 12px",
                        color: "white",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {template.title}
                    </button>
                  ))}
                </div>

                {/* Editor reativo da mensagem */}
                <textarea
                  value={whatsappMessageDraft}
                  onChange={(e) => setWhatsappMessageDraft(e.target.value)}
                  style={{
                    width: "100%",
                    height: 90,
                    backgroundColor: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    color: "white",
                    padding: "10px",
                    fontSize: "0.85rem",
                    lineHeight: "1.25rem",
                    resize: "none",
                    outline: "none"
                  }}
                  placeholder="Escreva a mensagem de acolhimento aqui..."
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                  <button 
                    onClick={handleCopyCareScript}
                    style={{
                      background: "none",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      padding: "8px 16px",
                      color: "white",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {copiedScriptForPersonId === selectedPerson.id ? "Copiado!" : "Copiar Roteiro"}
                  </button>
                  {selectedWhatsappHref ? (
                    <a
                      href={selectedWhatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        backgroundColor: "#10b981",
                        color: "white",
                        borderRadius: 10,
                        padding: "8px 16px",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <Send size={14} />
                      Disparar WhatsApp
                    </a>
                  ) : (
                    <button disabled style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#64748b", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: "0.8rem" }}>
                      Sem Telefone Cadastrado
                    </button>
                  )}
                </div>
              </div>

              {/* Linha do Tempo e Prontidão de Membresia */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2.5rem" }}>
                
                {/* Linha do Tempo */}
                <div style={{ backgroundColor: "rgba(30,41,59,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: "1.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#f97316", textTransform: "uppercase", fontWeight: 800 }}>Evolução de Estágio</span>
                  <h4 style={{ color: "white", fontWeight: 800, fontSize: "1rem", marginTop: 4, marginBottom: "1rem" }}>Passos Concluídos</h4>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {selectedTimeline.map((step, idx) => (
                      <div key={step.label} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: "0.8rem" }}>
                        <div style={{ 
                          width: 18, 
                          height: 18, 
                          borderRadius: "50%", 
                          backgroundColor: step.state === "done" ? "#10b981" : step.state === "active" ? "#f97316" : "#1e293b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "0.65rem",
                          fontWeight: 800
                        }}>
                          {step.state === "done" ? "✓" : idx + 1}
                        </div>
                        <span style={{ color: step.state === "done" ? "white" : "#94a3b8", fontWeight: step.state === "done" ? 700 : 400 }}>
                          {step.label} · <small style={{ color: "#64748b" }}>{step.detail}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prontidão para Membresia Checklist */}
                {selectedReadiness && (
                  <div style={{ 
                    backgroundColor: selectedReadiness.percent === 100 ? "rgba(16,185,129,0.05)" : "rgba(30,41,59,0.2)", 
                    border: selectedReadiness.percent === 100 ? "1.5px solid #10b981" : "1px solid rgba(255,255,255,0.05)", 
                    borderRadius: 20, 
                    padding: "1.5rem" 
                  }}>
                    <span style={{ fontSize: "0.75rem", color: selectedReadiness.percent === 100 ? "#10b981" : "#f97316", textTransform: "uppercase", fontWeight: 800 }}>Prontidão de Membresia</span>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <h4 style={{ color: "white", fontWeight: 800, fontSize: "1rem" }}>Cópia da Ficha</h4>
                      <strong style={{ color: selectedReadiness.percent === 100 ? "#10b981" : "#f97316" }}>{selectedReadiness.percent}%</strong>
                    </div>
                    {/* Meter */}
                    <div style={{ width: "100%", height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginTop: 10, marginBottom: 12 }}>
                      <div style={{ width: `${selectedReadiness.percent}%`, height: "100%", backgroundColor: selectedReadiness.percent === 100 ? "#10b981" : "#f97316" }} />
                    </div>

                    <div style={{ maxHeight: 90, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                      {selectedReadiness.items.map((item) => (
                        <div key={item.label} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.7rem", color: item.done ? "#cbd5e1" : "#64748b" }}>
                          <CheckCircle2 size={12} style={{ color: item.done ? "#10b981" : "#1e293b" }} />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Plano Recomendado & Próximos Passos */}
              <div style={{ backgroundColor: "rgba(30,41,59,0.15)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 20, padding: "1.5rem", marginBottom: "2.5rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#f97316", textTransform: "uppercase", fontWeight: 800 }}>Ações Sugeridas</span>
                <h4 style={{ color: "white", fontWeight: 800, fontSize: "1rem", marginTop: 4, marginBottom: "1rem" }}>Próximas Intervenções Recomendadas</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {selectedCarePlan.map((step, idx) => (
                    <div 
                      key={`${step.title}-${idx}`} 
                      style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        backgroundColor: "rgba(30,41,59,0.4)", 
                        padding: "10px 16px", 
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.03)"
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, justifyContent: "center" }}>
                          {idx + 1}
                        </span>
                        <div>
                          <strong style={{ color: "white", fontSize: "0.85rem", display: "block" }}>{step.title}</strong>
                          <span style={{ color: "#64748b", fontSize: "0.75rem" }}>{step.detail}</span>
                        </div>
                      </div>

                      {step.actionKind === "link" ? (
                        <Link className="ghost-button compact" href={step.href} style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: 8 }}>
                          {step.actionLabel}
                        </Link>
                      ) : step.actionKind === "none" ? (
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{step.actionLabel}</span>
                      ) : (
                        <button
                          onClick={() => void handleCarePlanAction(step)}
                          style={{
                            backgroundColor: "rgba(249,115,22,0.1)",
                            border: "1px solid rgba(249,115,22,0.2)",
                            color: "#f97316",
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          {step.actionLabel}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões Operacionais de Integração Direta */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem" }}>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <strong style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Mudar Status</strong>
                  <select
                    aria-label="Mudar status pastoral"
                    onChange={(event) =>
                      void handleStatusChange(
                        selectedPerson,
                        event.target.value as Person["memberStatus"]
                      )
                    }
                    value={selectedPerson.memberStatus}
                    style={{ padding: "8px", backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white", fontSize: "0.75rem" }}
                  >
                    {memberStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <strong style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Avançar Jornada</strong>
                  <button 
                    onClick={() => void handleAdvanceJourney()} 
                    style={{ 
                      backgroundColor: "#f97316", 
                      color: "white", 
                      border: "none", 
                      borderRadius: 8, 
                      padding: "8px 12px", 
                      fontSize: "0.75rem", 
                      fontWeight: 700, 
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      justifyContent: "center"
                    }}
                  >
                    <MapIcon size={12} />
                    Avançar Etapa
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <strong style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Lançar Cuidado Rápido</strong>
                  <button 
                    onClick={() => void handleCreateTask(selectedPerson, taskTemplates[4])}
                    style={{ 
                      backgroundColor: "rgba(255,255,255,0.05)", 
                      color: "white", 
                      border: "1px solid rgba(255,255,255,0.1)", 
                      borderRadius: 8, 
                      padding: "8px 12px", 
                      fontSize: "0.75rem", 
                      fontWeight: 700, 
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      justifyContent: "center"
                    }}
                  >
                    <Plus size={12} />
                    Agendar Reunião
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <strong style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Vincular a Célula</strong>
                  {suggestedGroup ? (
                    <button 
                      onClick={() => void handleAssignGroup(selectedPerson, suggestedGroup)}
                      style={{ 
                        backgroundColor: "rgba(16,185,129,0.1)", 
                        color: "#10b981", 
                        border: "1px solid rgba(16,185,129,0.2)", 
                        borderRadius: 8, 
                        padding: "8px 12px", 
                        fontSize: "0.75rem", 
                        fontWeight: 700, 
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        justifyContent: "center"
                      }}
                    >
                      <Waypoints size={12} />
                      Célula {suggestedGroup.name.slice(0, 8)}...
                    </button>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Sem Células</span>
                  )}
                </div>

              </div>

            </>
          ) : (
            <div style={{ textAlign: "center", padding: "4rem" }}>
              <UsersRound size={40} style={{ color: "#64748b", margin: "0 auto 1rem" }} />
              <strong style={{ color: "white" }}>Nenhum Membro Selecionado</strong>
              <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 8 }}>
                Escolha qualquer pessoa no funil Kanban acima para iniciar a triagem pastoral.
              </p>
            </div>
          )}

        </article>

        {/* LADO DIREITO: TAREFAS DE JORNADA ABERTAS */}
        <aside style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: 24, padding: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "#f97316", textTransform: "uppercase", fontWeight: 800 }}>Pendências</span>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "white", marginTop: 2 }}>Tarefas de Acompanhamento</h3>
            </div>
            <span style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 700 }}>
              {selectedOpenTasks.length}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {selectedOpenTasks.length ? (
              selectedOpenTasks.map((task) => (
                <div 
                  key={task.id} 
                  style={{ 
                    backgroundColor: "rgba(30, 41, 59, 0.4)", 
                    padding: "1rem", 
                    borderRadius: 16, 
                    border: "1px solid rgba(255,255,255,0.03)" 
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <strong style={{ color: "white", fontSize: "0.85rem", display: "block" }}>{task.title}</strong>
                      <span style={{ color: "#64748b", fontSize: "0.7rem", marginTop: 2, display: "block" }}>
                        Canal: {getTaskTypeLabel(task.type)}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: "0.65rem", 
                      backgroundColor: "rgba(249,115,22,0.1)", 
                      color: "#f97316", 
                      padding: "2px 6px", 
                      borderRadius: 6,
                      fontWeight: 700 
                    }}>
                      Aguardando
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {task.status === "open" ? (
                      <button
                        onClick={() => void handleTaskStatusChange(task, "in_progress")}
                        style={{
                          flex: 1,
                          backgroundColor: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                          color: "white",
                          padding: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Iniciar
                      </button>
                    ) : null}
                    <button
                      onClick={() => void handleTaskStatusChange(task, "completed")}
                      style={{
                        flex: 1,
                        backgroundColor: "#10b981",
                        border: "none",
                        borderRadius: 8,
                        color: "white",
                        padding: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      ✓ Concluir
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "3rem", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: 16 }}>
                <Clock size={24} style={{ color: "#64748b", margin: "0 auto 10px" }} />
                <strong style={{ color: "white", fontSize: "0.8rem", display: "block" }}>Tudo em Dia!</strong>
                <p style={{ color: "#64748b", fontSize: "0.7rem", marginTop: 4 }}>
                  Nenhum follow-up pendente para esta pessoa no momento.
                </p>
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
  value,
  color
}: {
  detail: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <article 
      style={{ 
        backgroundColor: "rgba(30, 41, 59, 0.25)", 
        border: "1px solid rgba(255,255,255,0.05)", 
        borderRadius: 20, 
        padding: "1.25rem",
        borderLeft: `4px solid ${color}`
      }}
    >
      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{label}</span>
      <strong style={{ display: "block", fontSize: "2rem", color: "white", marginTop: 4 }}>{value}</strong>
      <p style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 4 }}>{detail}</p>
    </article>
  );
}

function getLaneKey(person: Person, groupMembers: readonly GroupMember[]) {
  const isInGroup = groupMembers.some((member) => member.personId === person.id);

  if (isInGroup) return "cell";
  if (person.memberStatus === "visitor") return "visitor";
  if (["congregant", "new_believer"].includes(person.memberStatus)) return "congregant";

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
  if (!task.dueAt) return Number.MAX_SAFE_INTEGER;
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
    if (!task.dueAt) return false;
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
    reasons.push("Tarefa vencida");
  }

  if (person.memberStatus === "visitor" && !hasFirstContact) {
    score += 65;
    reasons.push("Sem contato inicial");
  }

  if (journey?.currentStage === "ready_for_membership") {
    score += 55;
    reasons.push("Decisão de membresia");
  }

  if (!hasGroup) {
    score += ["member", "leader", "volunteer"].includes(person.memberStatus) ? 35 : 28;
    reasons.push("Fora de célula");
  }

  if (openTasks.length) {
    score += Math.min(openTasks.length * 12, 36);
    reasons.push(`${openTasks.length} tarefa(s) em aberto`);
  }

  if (score >= 80) {
    return {
      label: "Frio / Crítico",
      level: "urgent",
      score,
      summary: reasons.join(", ")
    };
  }

  if (score >= 35) {
    return {
      label: "Morno / Acompanhar",
      level: "attention",
      score,
      summary: reasons.join(", ")
    };
  }

  return {
    label: "Aquecido / Estável",
    level: "stable",
    score,
    summary: reasons.length ? reasons.join(", ") : "Sem gargalo crítico"
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
      detail: "Essa pessoa parece visitante, mas ainda não tem uma jornada de recepção vinculada.",
      href: "/reception",
      kind: "link",
      title: "Registrar chegada antes de cuidar"
    };
  }

  if (!hasWelcome) {
    return {
      actionLabel: "Criar boas-vindas",
      detail: "Primeiro contato reduz perda no funil. Crie uma tarefa simples para WhatsApp.",
      kind: "task",
      template: taskTemplates[0],
      title: "Começar com acolhimento"
    };
  }

  if (journey && getJourneyStageRank(journey.currentStage) < getJourneyStageRank("invited_to_group")) {
    return {
      actionLabel: "Avançar etapa",
      detail: "A pessoa já recebeu cuidado inicial. Agora vale registrar o convite para célula.",
      kind: "advance",
      title: "Mover para integração"
    };
  }

  if (!group && suggestedGroup) {
    return {
      actionLabel: `Vincular a ${suggestedGroup.name}`,
      detail: "Sem pequena comunidade, a jornada fica solta. Vincule a uma célula para criar pertencimento.",
      group: suggestedGroup,
      kind: "group",
      title: "Conectar a uma célula"
    };
  }

  if (!hasGroupInvite && !group) {
    return {
      actionLabel: "Criar convite",
      detail: "Ainda não existe convite para célula registrado.",
      kind: "task",
      template: taskTemplates[2],
      title: "Preparar convite para comunidade"
    };
  }

  if (!hasClassInvite && ["visitor", "congregant", "new_believer"].includes(person.memberStatus)) {
    return {
      actionLabel: "Criar convite para classe",
      detail: "A classe de integração ajuda a explicar a visão antes da membresia.",
      kind: "task",
      template: taskTemplates[3],
      title: "Levar para classe de integração"
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
        detail: "A jornada está pronta, mas ainda faltam dados no cadastro.",
        href: `/members/${person.id}`,
        kind: "link",
        title: "Completar ficha antes da membresia"
      };
    }

    return {
      actionLabel: "Efetivar como membro",
      detail: "A jornada indica prontidão para confirmar a membresia formal.",
      kind: "status",
      status: "member",
      title: "Decidir membresia"
    };
  }

  return {
    actionLabel: "Acompanhar",
    detail: "Nenhum gargalo crítico apareceu agora. Continue acompanhando relacionamento.",
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
      detail: journey ? getJourneyStageLabel(journey.currentStage) : "Sem registro",
      label: "Chegada",
      state: journey ? "done" : "active"
    },
    {
      detail: hasWelcome ? "Contato feito" : "Pendente",
      label: "Contato",
      state: hasWelcome ? "done" : "active"
    },
    {
      detail: invitedToGroup ? group?.name ?? "Convidado" : "Pendente",
      label: "Comunidade",
      state: invitedToGroup ? "done" : hasWelcome ? "active" : "pending"
    },
    {
      detail: inClass ? "Classe iniciada" : "Pendente",
      label: "Integração",
      state: inClass ? "done" : invitedToGroup ? "active" : "pending"
    },
    {
      detail: isMember ? "Efetivado" : "Pendente",
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
      detail: hasPhone ? "Telefone ok" : "Falta telefone",
      done: hasPhone,
      label: "Contato"
    },
    {
      detail: hasAddress ? "Endereço ok" : "Falta endereço",
      done: hasAddress,
      label: "Endereço"
    },
    {
      detail: hasFamily ? "Família vinculada" : "Sem família",
      done: hasFamily,
      label: "Família"
    },
    {
      detail: hasConsent ? "Termo assinado" : "Sem LGPD",
      done: hasConsent,
      label: "LGPD"
    },
    {
      detail: group ? `Conectado` : "Sem célula",
      done: Boolean(group),
      label: "Comunidade"
    },
    {
      detail: hasFirstCare && journeyReady ? "Cuidado feito" : "Cuidado pendente",
      done: hasFirstCare && journeyReady,
      label: "Cuidado Inicial"
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
      actionLabel: "Abrir Portaria",
      detail: "Crie a jornada registrando a chegada na recepção.",
      href: "/reception",
      title: "Registrar Chegada"
    });
  }

  if (!hasWelcome) {
    steps.push({
      actionKind: "task",
      actionLabel: "Criar Tarefa",
      detail: "Garanta que a equipe faça o primeiro contato pastoral.",
      template: taskTemplates[0],
      title: "Primeiro Acolhimento"
    });
  }

  if (journey && getJourneyStageRank(journey.currentStage) < getJourneyStageRank("invited_to_group")) {
    steps.push({
      actionKind: "advance",
      actionLabel: "Avançar Etapa",
      detail: "Após o contato inicial, mova para etapa de integração.",
      title: "Atualizar Etapa da Jornada"
    });
  }

  if (!group && suggestedGroup) {
    steps.push({
      actionKind: "group",
      actionLabel: "Vincular Célula",
      detail: `Sugestão: Conectar à célula ${suggestedGroup.name}.`,
      group: suggestedGroup,
      title: "Conectar à Célula"
    });
  }

  if (!hasClassInvite && ["visitor", "congregant", "new_believer"].includes(person.memberStatus)) {
    steps.push({
      actionKind: "task",
      actionLabel: "Criar Convite",
      detail: "Convide para classe de integração Alvo Academy.",
      template: taskTemplates[3],
      title: "Classe de Integração"
    });
  }

  if (!hasPastoralContact && journey?.currentStage === "ready_for_membership") {
    steps.push({
      actionKind: "task",
      actionLabel: "Agendar",
      detail: "Agende uma conversa pastoral de aliança antes da membresia.",
      template: taskTemplates[4],
      title: "Conversa Pastoral"
    });
  }

  if (hasProfileGaps && !isMember) {
    steps.push({
      actionKind: "link",
      actionLabel: "Completar Ficha",
      detail: "Feche os dados pendentes no cadastro sensível.",
      href: `/members/${person.id}`,
      title: "Completar Cadastro"
    });
  }

  if (!isMember && readiness?.percent === 100 && journey?.currentStage === "ready_for_membership") {
    steps.push({
      actionKind: "status",
      actionLabel: "Efetivar Membro",
      detail: "Ficha concluída e jornada completa. Efetivar como membro formal.",
      status: "member",
      title: "Efetivar Membro"
    });
  }

  if (!steps.length) {
    steps.push({
      actionKind: "none",
      actionLabel: "Tudo Completo",
      detail: group
        ? `Acompanhe frequência e comunhão na célula ${group.name}.`
        : "Manter acompanhamento de presença e cuidado regular.",
      title: "Manter Relacionamento"
    });
  }

  return steps.slice(0, 5);
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
      return "Líder";
    case "volunteer":
      return "Voluntário";
  }
}

function getJourneyStageLabel(stage: VisitorJourney["currentStage"]) {
  switch (stage) {
    case "new_visitor":
      return "Novo visitante";
    case "welcomed":
      return "Recebido";
    case "invited_to_group":
      return "Convidado para célula";
    case "attending_class":
      return "Classe de integração";
    case "ready_for_membership":
      return "Pronto para membresia";
    case "completed":
      return "Jornada concluída";
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
      return "Convite para célula";
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
      return "Concluída";
    case "cancelled":
      return "Cancelada";
  }
}

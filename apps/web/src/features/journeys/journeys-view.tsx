"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
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
import { loadLocalMemberStore } from "../../lib/local-member-store";
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
      const localStore = loadLocalMemberStore();
      setStatus("Exibindo jornadas simuladas de acolhimento.");
      // Se não houver firebase, carrega mock data
      setPeople(mergeById(recentPeople as unknown as Person[], localStore.people));
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
      setSelectedPersonId(localStore.people[0]?.id ?? recentPeople[0]?.id ?? null);
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

        const localStore = loadLocalMemberStore();
        const finalPeople = mergeById(
          nextPeople.length > 0 ? nextPeople : (recentPeople as unknown as Person[]),
          localStore.people
        );
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
          `${nextPeople.length} pessoa(s) sincronizada(s) no Firestore. ${localStore.people.length} cadastro(s) local(is) disponível(is).`
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
    <main 
      className="form-page journeys-page animate-entrance" 
      style={{ 
        maxWidth: 1440, 
        padding: "2rem",
        ["--alvo-accent" as string]: "#2563eb",
        ["--alvo-accent-soft" as string]: "rgba(37, 99, 235, 0.08)",
        ["--alvo-accent-dark" as string]: "#1e3a8a",
        ["--alvo-blue" as string]: "#2563eb",
        ["--alvo-blue-soft" as string]: "rgba(37, 99, 235, 0.08)",
        ["--alvo-green" as string]: "#10b981",
        ["--alvo-green-soft" as string]: "rgba(16, 185, 129, 0.08)"
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .journeys-page {
          max-width: 1480px !important;
          padding: 32px !important;
          color: var(--alvo-ink) !important;
        }
        .journeys-page .journeys-hero {
          background: linear-gradient(135deg, rgba(255,255,255,0.94), rgba(239,246,255,0.88)) !important;
          border: 1px solid var(--alvo-line) !important;
          border-radius: 28px !important;
          padding: 28px !important;
          box-shadow: var(--alvo-shadow-soft) !important;
        }
        .journeys-page .journeys-hero h1 {
          color: var(--alvo-ink) !important;
          font-size: clamp(42px, 5vw, 74px) !important;
          line-height: 0.96 !important;
          max-width: 920px !important;
        }
        .journeys-page .journeys-hero p {
          color: var(--alvo-ink-soft) !important;
        }
        .journeys-page .back-link {
          background: #ffffff !important;
          border: 1px solid var(--alvo-line) !important;
          color: var(--alvo-ink) !important;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05) !important;
        }
        .journeys-page .active-bottleneck-card {
          background: #ffffff !important;
          border: 1px solid rgba(245, 158, 11, 0.28) !important;
          box-shadow: 0 18px 38px rgba(245, 158, 11, 0.12) !important;
        }
        .journeys-page .active-bottleneck-card strong {
          color: var(--alvo-ink) !important;
        }
        .journeys-page .active-bottleneck-card span {
          color: var(--alvo-ink-soft) !important;
        }
        .journeys-page .active-bottleneck-card > div:last-child {
          background: #f8fafc !important;
          border: 1px solid var(--alvo-line) !important;
        }
        .journeys-page .journey-bottleneck-grid article {
          min-height: 150px !important;
        }
        .journeys-page .journey-command-panel {
          background: rgba(255,255,255,0.72) !important;
          border: 1px solid var(--alvo-line) !important;
          border-radius: 28px !important;
          padding: 22px !important;
          box-shadow: var(--alvo-shadow-soft) !important;
        }
        .journeys-page .journey-lane {
          background: #ffffff !important;
          border: 1px solid var(--alvo-line) !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03) !important;
        }
        .journeys-page .journey-person-card {
          background: #ffffff !important;
          border: 1px solid var(--alvo-line) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.01) !important;
        }
        .journeys-page .journey-person-card strong {
          color: var(--alvo-ink) !important;
        }
        .journeys-page .journey-person-card small {
          color: var(--alvo-ink-soft) !important;
        }
        .journeys-page .journey-person-card span {
          color: inherit;
        }
        .journeys-page .journey-lane-heading strong,
        .journeys-page .journey-lane-heading span {
          color: var(--alvo-ink) !important;
        }
        .journeys-page .journey-lane-heading span:not(:last-child) {
          color: var(--alvo-ink-soft) !important;
        }
        .journeys-page .journey-detail-card {
          background: #ffffff !important;
          border: 1px solid var(--alvo-line) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.03), 0 4px 6px -4px rgba(0, 0, 0, 0.03) !important;
        }
        .journeys-page .journey-detail-card h2,
        .journeys-page .journey-detail-card h3,
        .journeys-page .journey-detail-card h4,
        .journeys-page .journey-detail-card strong {
          color: var(--alvo-ink) !important;
        }
        .journeys-page .journey-detail-card span,
        .journeys-page .journey-detail-card p,
        .journeys-page .journey-detail-card small {
          color: var(--alvo-ink-soft) !important;
        }
        .journeys-page .journey-detail-card > div,
        .journeys-page .journey-detail-card article,
        .journeys-page .journey-detail-card aside {
          color: var(--alvo-ink) !important;
        }
        .journeys-page .journey-health-card {
          background: #ffffff !important;
          border: 1px solid var(--alvo-line) !important;
        }
        .journeys-page .journey-health-card strong {
          color: var(--alvo-ink) !important;
        }
        .journeys-page .journey-health-card span {
          color: var(--alvo-ink-soft) !important;
        }
        .journeys-page .directory-toolbar {
          background: #ffffff !important;
          border: 1px solid var(--alvo-line) !important;
        }
        .journeys-page .directory-toolbar label {
          color: var(--alvo-ink-soft) !important;
        }
        .journeys-page .directory-toolbar input,
        .journeys-page .directory-toolbar select {
          background: #f8fafc !important;
          border: 1px solid var(--alvo-line) !important;
          color: var(--alvo-ink) !important;
        }
        .journeys-page .task-card {
          background: #ffffff !important;
          border: 1px solid var(--alvo-line) !important;
        }
        .journeys-page .task-card strong {
          color: var(--alvo-ink) !important;
        }
        .journeys-page .task-card span {
          color: var(--alvo-ink-soft) !important;
        }
        .journeys-page textarea,
        .journeys-page input,
        .journeys-page select {
          color: var(--alvo-ink) !important;
          background: #ffffff !important;
          border-color: var(--alvo-line) !important;
        }
        .journeys-page .phone-chat-header,
        .journeys-page .phone-chat-input-bar {
          background: #f8fafc !important;
          border-color: var(--alvo-line) !important;
        }
        .journeys-page .phone-screen-frame {
          background: #ffffff !important;
        }
        .journeys-page .phone-status-bar {
          background: #ffffff !important;
          color: var(--alvo-ink-soft) !important;
        }
        .journeys-page .phone-chat-header strong {
          color: var(--alvo-ink) !important;
        }
        .journeys-page .phone-chat-body {
          background-color: #f8fafc !important;
        }
        .journeys-page .chat-bubble-received {
          background: #ffffff !important;
          color: var(--alvo-ink) !important;
          border: 1px solid var(--alvo-line) !important;
        }
        .journeys-page .phone-chat-input-field {
          background: #ffffff !important;
          color: var(--alvo-ink-soft) !important;
          border-color: var(--alvo-line) !important;
        }
        .journeys-page .whatsapp-phone-mockup {
          background: #ffffff !important;
          border: 1px solid var(--alvo-line) !important;
          box-shadow: var(--alvo-shadow-soft) !important;
        }
        @media (max-width: 1180px) {
          .journeys-page .journey-bottleneck-grid,
          .journeys-page .journey-lanes {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .journeys-page .directory-toolbar {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 720px) {
          .journeys-page {
            padding: 20px 14px 36px !important;
          }
          .journeys-page .journey-bottleneck-grid,
          .journeys-page .journey-lanes,
          .journeys-page .journey-detail-grid {
            grid-template-columns: 1fr !important;
          }
          .journeys-page .journeys-hero {
            padding: 22px !important;
          }
        }
      `}} />
      
      {/* Hero Central de Acolhimento */}
      <section className="journeys-hero" style={{ borderBottom: "1px solid var(--alvo-line)", paddingBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "2rem", flexWrap: "wrap" }}>
        <div>
          <Link className="back-link" href="/">
            <ArrowLeft size={14} style={{ marginRight: 6 }} /> Voltar ao painel
          </Link>
          <p className="eyebrow" style={{ color: "var(--alvo-accent)" }}>Painel de Integração</p>
          <h1 style={{ fontSize: "2.75rem", fontWeight: 950, color: "var(--alvo-ink)", letterSpacing: "-0.03em" }}>Jornadas de Integração & Triagem Pastoral</h1>
          <p style={{ color: "var(--alvo-ink-soft)", fontSize: "1.1rem", maxWidth: 750, lineHeight: 1.6 }}>
            Raciocínio profundo para o cuidado de almas: gerencie gargalos ativos, acompanhe a evolução de visitantes
            para a aliança de membresia e monitore a inserção em células.
          </p>
        </div>
        <aside className="journey-health-card active-bottleneck-card" style={{ backgroundColor: "rgba(30, 41, 59, 0.15)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: 24, padding: "1.5rem", minWidth: 260, boxShadow: "0 0 15px rgba(245, 158, 11, 0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={24} style={{ color: "#f59e0b", filter: "drop-shadow(0 0 5px rgba(245, 158, 11, 0.5))" }} />
            <span style={{ fontSize: "0.85rem", color: "#f59e0b", fontWeight: 800 }}>ALERTAS CRÍTICOS</span>
          </div>
          <strong style={{ fontSize: "2.5rem", display: "block", color: "white", marginTop: 8, fontWeight: 950, letterSpacing: "-0.02em" }}>
            {visitorsWithoutContact.length + aspirantsWithoutCell.length + membersWithoutCell.length}
          </strong>
          <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 700 }}>Gargalos de cuidado ativos</span>
          
          {/* Firestore Pulsing Sync Radar */}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
            <span className={`sync-pulse ${configured && firebaseReady ? 'active' : 'simulated'}`}></span>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: configured && firebaseReady ? '#10b981' : '#f59e0b', letterSpacing: "0.03em" }}>
              {configured && firebaseReady ? 'ONLINE / FIRESTORE ACTIVE' : 'MODO SIMULADO / OFFLINE'}
            </span>
          </div>
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
        <div className="journey-filter-bar" style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          {journeyFilters.map((filter) => (
            <button
              className={focusFilter === filter.value ? "journey-filter-chip is-active" : "journey-filter-chip"}
              key={filter.value}
              onClick={() => setFocusFilter(filter.value)}
              type="button"
              style={{
                backgroundColor: focusFilter === filter.value ? "var(--alvo-accent)" : "rgba(255, 255, 255, 0.35)",
                border: focusFilter === filter.value ? "1px solid var(--alvo-accent-dark)" : "1px solid var(--alvo-line)",
                padding: "10px 18px",
                borderRadius: 14,
                color: focusFilter === filter.value ? "white" : "var(--alvo-ink)",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s"
              }}
            >
              <span>{filter.label}</span>
              <strong style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 8, fontSize: "0.75rem" }}>
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
        <div className="directory-toolbar" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", backgroundColor: "rgba(30, 41, 59, 0.15)", padding: "1.25rem", borderRadius: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
          <label style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 700 }}>
            Buscar Pessoa
            <input
              aria-label="Buscar pessoa em jornadas"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, e-mail ou telefone..."
              value={query}
              style={{ width: "100%", padding: "10px 14px", backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "white", marginTop: 6, outline: "none" }}
            />
          </label>
          <label style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 700 }}>
            Célula Sugerida
            <select
              aria-label="Célula sugerida"
              onChange={() => undefined}
              value={suggestedGroup?.id ?? ""}
              style={{ width: "100%", padding: "10px 14px", backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "white", marginTop: 6, outline: "none" }}
            >
              {suggestedGroup ? (
                <option value={suggestedGroup.id}>{suggestedGroup.name}</option>
              ) : (
                <option value="">Nenhuma célula</option>
              )}
            </select>
          </label>
          <label style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 700 }}>
            Status de Sincronia
            <input 
              readOnly 
              value={status} 
              style={{ width: "100%", padding: "10px 14px", backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, color: "#94a3b8", marginTop: 6, outline: "none" }} 
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
                backgroundColor: "rgba(30, 41, 59, 0.15)", 
                border: "1px solid rgba(255,255,255,0.06)", 
                borderRadius: 24, 
                padding: "1.25rem",
                borderTop: `4px solid ${lane.color}`
              }}
            >
              <div className="journey-lane-heading" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
                <div style={{ color: lane.color }}><lane.icon size={20} /></div>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: "white", display: "block", fontSize: "1rem", fontWeight: 800 }}>{lane.title}</strong>
                  <span style={{ color: "#64748b", fontSize: "0.725rem", display: "block", lineHeight: "1rem", marginTop: 2 }}>{lane.description}</span>
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
                          backgroundColor: isSelected ? "var(--alvo-accent-soft)" : "#ffffff",
                          border: isSelected ? "1px solid var(--alvo-accent)" : "1px solid var(--alvo-line)",
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
                              fontSize: "0.65rem", 
                              fontWeight: 900, 
                              textTransform: "uppercase", 
                              color: signal.level === "urgent" ? "#ef4444" : signal.level === "attention" ? "#f59e0b" : "#10b981",
                              backgroundColor: signal.level === "urgent" ? "rgba(239,68,68,0.15)" : signal.level === "attention" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
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
        <article className="journey-detail-card" style={{ background: "var(--glass-bg)", border: "1px solid var(--alvo-line)", borderRadius: 24, padding: "2.5rem" }}>
          
          {selectedPerson ? (
            <>
              {/* Header do Membro */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--alvo-line)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--alvo-blue)", textTransform: "uppercase", fontWeight: 800 }}>Membro em Foco</span>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: 950, color: "var(--alvo-ink)", marginTop: 4, letterSpacing: "-0.03em" }}>
                    {getFullName(selectedPerson)}
                  </h2>
                </div>
                <Link className="soft-pill" href={`/members/${selectedPerson.id}`} style={{ backgroundColor: "var(--alvo-blue-soft)", color: "var(--alvo-blue)", padding: "8px 16px", borderRadius: 12, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
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
              <div style={{ background: "#f8fafc", border: "1px solid var(--alvo-line)", borderRadius: 20, padding: "1.5rem", marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "var(--alvo-blue)", textTransform: "uppercase", fontWeight: 800 }}>Copiloto de Mensagens</span>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--alvo-ink)", marginTop: 2 }}>Disparar Acolhimento Reativo</h3>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)" }}>
                    WhatsApp: <strong>{selectedPerson.whatsappPhone || selectedPerson.mobilePhone || "Não informado"}</strong>
                  </span>
                </div>

                {/* Editor reativo da mensagem */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  {messageTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTemplateIndex(idx)}
                      style={{
                        backgroundColor: selectedTemplateIndex === idx ? "var(--alvo-blue)" : "rgba(0,0,0,0.05)",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 12px",
                        color: selectedTemplateIndex === idx ? "white" : "var(--alvo-ink)",
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
                    backgroundColor: "#ffffff",
                    border: "1px solid var(--alvo-line)",
                    borderRadius: 12,
                    color: "var(--alvo-ink)",
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
                      background: "#ffffff",
                      border: "1px solid var(--alvo-line)",
                      borderRadius: 10,
                      padding: "8px 16px",
                      color: "var(--alvo-ink)",
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
                <div style={{ background: "var(--glass-bg)", border: "1px solid var(--alvo-line)", borderRadius: 20, padding: "1.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--alvo-blue)", textTransform: "uppercase", fontWeight: 800 }}>Evolução de Estágio</span>
                  <h4 style={{ color: "white", fontWeight: 800, fontSize: "1rem", marginTop: 4, marginBottom: "1rem" }}>Passos Concluídos</h4>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {selectedTimeline.map((step, idx) => (
                      <div key={step.label} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: "0.8rem" }}>
                        <div style={{ 
                          width: 18, 
                          height: 18, 
                          borderRadius: "50%", 
                          backgroundColor: step.state === "done" ? "#10b981" : step.state === "active" ? "var(--alvo-blue)" : "rgba(0,0,0,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "0.65rem",
                          fontWeight: 800
                        }}>
                          {step.state === "done" ? "✓" : idx + 1}
                        </div>
                        <span style={{ color: step.state === "done" ? "var(--alvo-ink)" : "var(--alvo-ink-soft)", fontWeight: step.state === "done" ? 700 : 400 }}>
                          {step.label} · <small style={{ color: "#64748b" }}>{step.detail}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prontidão para Membresia Checklist */}
                {selectedReadiness && (
                  <div style={{ 
                    backgroundColor: selectedReadiness.percent === 100 ? "rgba(16,185,129,0.05)" : "var(--glass-bg)", 
                    border: selectedReadiness.percent === 100 ? "1.5px solid #10b981" : "1px solid var(--alvo-line)", 
                    borderRadius: 20, 
                    padding: "1.5rem" 
                  }}>
                    <span style={{ fontSize: "0.75rem", color: selectedReadiness.percent === 100 ? "#10b981" : "var(--alvo-blue)", textTransform: "uppercase", fontWeight: 800 }}>Prontidão de Membresia</span>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <h4 style={{ color: "white", fontWeight: 800, fontSize: "1rem" }}>Cópia da Ficha</h4>
                      <strong style={{ color: selectedReadiness.percent === 100 ? "#10b981" : "var(--alvo-blue)" }}>{selectedReadiness.percent}%</strong>
                    </div>
                    {/* Meter */}
                    <div style={{ width: "100%", height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginTop: 10, marginBottom: 12 }}>
                      <div style={{ width: `${selectedReadiness.percent}%`, height: "100%", backgroundColor: selectedReadiness.percent === 100 ? "#10b981" : "var(--alvo-blue)" }} />
                    </div>

                    <div style={{ maxHeight: 90, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                      {selectedReadiness.items.map((item) => (
                        <div key={item.label} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.7rem", color: item.done ? "var(--alvo-ink)" : "var(--alvo-ink-soft)" }}>
                          <CheckCircle2 size={12} style={{ color: item.done ? "#10b981" : "var(--alvo-line)" }} />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Plano Recomendado & Próximos Passos */}
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--alvo-line)", borderRadius: 20, padding: "1.5rem", marginBottom: "2.5rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--alvo-blue)", textTransform: "uppercase", fontWeight: 800 }}>Ações Sugeridas</span>
                <h4 style={{ color: "white", fontWeight: 800, fontSize: "1rem", marginTop: 4, marginBottom: "1rem" }}>Próximas Intervenções Recomendadas</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {selectedCarePlan.map((step, idx) => (
                    <div 
                      key={`${step.title}-${idx}`} 
                      style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        backgroundColor: "#f8fafc", 
                        padding: "10px 16px", 
                        borderRadius: 12,
                        border: "1px solid var(--alvo-line)"
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
                        <Link className="ghost-button compact" href={step.href} style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: 8, textDecoration: "none", color: "var(--alvo-ink)", border: "1px solid var(--alvo-line)" }}>
                          {step.actionLabel}
                        </Link>
                      ) : step.actionKind === "none" ? (
                        <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)" }}>{step.actionLabel}</span>
                      ) : (
                        <button
                          onClick={() => void handleCarePlanAction(step)}
                          style={{
                            backgroundColor: "var(--alvo-blue-soft)",
                            border: "1px solid rgba(6, 182, 212, 0.2)",
                            color: "var(--alvo-blue)",
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
                  <strong style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)" }}>Mudar Status</strong>
                  <select
                    aria-label="Mudar status pastoral"
                    onChange={(event) =>
                      void handleStatusChange(
                        selectedPerson,
                        event.target.value as Person["memberStatus"]
                      )
                    }
                    value={selectedPerson.memberStatus}
                    style={{ padding: "8px", backgroundColor: "#ffffff", border: "1px solid var(--alvo-line)", borderRadius: 8, color: "var(--alvo-ink)", fontSize: "0.75rem", outline: "none" }}
                  >
                    {memberStatusOptions.map((option) => (
                      <option key={option.value} value={option.value} style={{ color: "var(--alvo-ink)" }}>
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
                      backgroundColor: "var(--alvo-blue)", 
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
                      justifyContent: "center",
                      transition: "all 0.2s"
                    }}
                    className="hover-glow"
                  >
                    <MapIcon size={12} />
                    Avançar Etapa
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <strong style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)" }}>Lançar Cuidado Rápido</strong>
                  <button 
                    onClick={() => void handleCreateTask(selectedPerson, taskTemplates[4])}
                    style={{ 
                      backgroundColor: "#ffffff", 
                      color: "var(--alvo-ink)", 
                      border: "1px solid var(--alvo-line)", 
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

        {/* LADO DIREITO: TAREFAS DE JORNADA ABERTAS & WHATSAPP PHONE PREVIEW */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* ACOMPANHAMENTO TASKS */}
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--alvo-line)", borderRadius: 24, padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--alvo-blue)", textTransform: "uppercase", fontWeight: 800 }}>Pendências</span>
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
                      backgroundColor: "rgba(255, 255, 255, 0.02)", 
                      padding: "1rem", 
                      borderRadius: 16, 
                      border: "1px solid var(--alvo-line)" 
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
                        backgroundColor: "var(--alvo-blue-soft)", 
                        color: "var(--alvo-blue)", 
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
          </div>

          {/* SIMULATED SMARTPHONE FOR WHATSAPP ACTIVE COPILOT INTEGRATION */}
          {selectedPerson && (
            <div className="whatsapp-phone-mockup">
              <div className="phone-notch"></div>
              <div className="phone-screen-frame">
                {/* Phone Top Status Bar */}
                <div className="phone-status-bar">
                  <span className="phone-time">12:00</span>
                  <div className="phone-icons">
                    <span>📶</span>
                    <span>🔋 100%</span>
                  </div>
                </div>
                
                {/* Chat Header */}
                <div className="phone-chat-header">
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--alvo-blue)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.75rem", fontWeight: 700 }}>
                    {getInitials(getFullName(selectedPerson))}
                  </div>
                  <div style={{ flex: 1, marginLeft: 8 }}>
                    <strong style={{ display: "block", color: "white", fontSize: "0.75rem" }}>{getFullName(selectedPerson)}</strong>
                    <span style={{ fontSize: "0.6", color: "#10b981", display: "block" }}>online</span>
                  </div>
                  <span style={{ fontSize: "0.8rem" }}>📞 ⚙️</span>
                </div>

                {/* Chat Conversation Area */}
                <div className="phone-chat-body">
                  <div className="chat-day-separator">HOJE</div>
                  <div className="chat-bubble-received">
                    Olá! Fui no culto no último domingo, gostei muito da recepção... 😊
                    <span className="chat-bubble-time">10:45</span>
                  </div>
                  {whatsappMessageDraft && (
                    <div className="chat-bubble-sent">
                      {whatsappMessageDraft}
                      <span className="chat-bubble-time">12:00 ✓✓</span>
                    </div>
                  )}
                </div>

                {/* Chat Input Bar */}
                <div className="phone-chat-input-bar">
                  <span style={{ fontSize: "0.9rem" }}>😊</span>
                  <div className="phone-chat-input-field">Mensagem...</div>
                  <span style={{ fontSize: "0.9rem" }}>📎 📷 🎤</span>
                </div>
              </div>
            </div>
          )}

        </aside>

      </section>

      <style jsx global>{`
        body, .main-content, .app-container {
          background-color: transparent !important;
        }
      `}</style>

      <style jsx>{`
        .journeys-page {
          background: transparent !important;
          color: #f8fafc !important;
          min-height: 100vh;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          margin-bottom: 2rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.75rem;
          color: #cbd5e1;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.875rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .back-link:hover {
          border-color: var(--alvo-blue);
          color: white;
          background: var(--alvo-blue-soft);
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.15);
        }

        .eyebrow {
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--alvo-blue);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .journey-filter-chip {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .journey-filter-chip:hover {
          border-color: var(--alvo-blue) !important;
          background: var(--alvo-blue-soft) !important;
        }

        .journey-person-card {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .journey-person-card:hover {
          border-color: var(--alvo-blue) !important;
          background: rgba(6, 182, 212, 0.06) !important;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .journey-person-card.is-selected {
          border-color: var(--alvo-blue) !important;
          background: rgba(6, 182, 212, 0.12) !important;
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.2);
        }

        /* Pulsing Sync Radar */
        .sync-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          position: relative;
        }

        .sync-pulse.active {
          background-color: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: pulse-green 1.5s infinite;
        }

        .sync-pulse.simulated {
          background-color: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
          animation: pulse-amber 1.5s infinite;
        }

        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        @keyframes pulse-amber {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }

        /* Simulated Smartphone Preview */
        .whatsapp-phone-mockup {
          background: #1e293b;
          border: 8px solid rgba(255,255,255,0.08);
          border-radius: 36px;
          padding: 6px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(6, 182, 212, 0.05);
          width: 100%;
          max-width: 320px;
          margin: 0 auto;
          position: relative;
          aspect-ratio: 9 / 19;
          overflow: hidden;
        }

        .phone-notch {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 110px;
          height: 18px;
          background: #0f172a;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          z-index: 10;
        }

        .phone-screen-frame {
          background: #0b0f19;
          border-radius: 28px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          position: relative;
        }

        .phone-status-bar {
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: rgba(255,255,255,0.6);
          font-weight: 700;
          background: #0b0f19;
          z-index: 5;
        }

        .phone-chat-header {
          background: #1e293b;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 8px 12px;
          display: flex;
          align-items: center;
          color: white;
          z-index: 5;
        }

        .phone-chat-body {
          flex: 1;
          padding: 12px;
          background-image: radial-gradient(rgba(6, 182, 212, 0.02) 1px, transparent 0);
          background-size: 10px 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
        }

        .chat-day-separator {
          text-align: center;
          font-size: 0.55rem;
          color: #64748b;
          font-weight: 800;
          letter-spacing: 0.05em;
          margin: 4px 0;
        }

        .chat-bubble-received {
          background: #1e293b;
          color: white;
          padding: 8px 12px;
          border-radius: 12px;
          border-top-left-radius: 4px;
          font-size: 0.725rem;
          line-height: 1.2;
          max-width: 85%;
          align-self: flex-start;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .chat-bubble-sent {
          background: #10b981;
          color: white;
          padding: 8px 12px;
          border-radius: 12px;
          border-top-right-radius: 4px;
          font-size: 0.725rem;
          line-height: 1.2;
          max-width: 85%;
          align-self: flex-end;
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
        }

        .chat-bubble-time {
          display: block;
          text-align: right;
          font-size: 0.5rem;
          color: rgba(255,255,255,0.6);
          margin-top: 3px;
        }

        .phone-chat-input-bar {
          background: #1e293b;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .phone-chat-input-field {
          flex: 1;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          padding: 4px 10px;
          font-size: 0.65rem;
          color: #94a3b8;
        }

        .hover-glow:hover {
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.4);
        }

        @media (max-width: 1024px) {
          .journey-detail-grid {
            grid-template-columns: 1fr;
          }
          .whatsapp-phone-mockup {
            max-width: 100%;
          }
        }
      `}</style>
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
        backgroundColor: "#ffffff", 
        border: "1px solid var(--alvo-line)", 
        borderRadius: 20, 
        padding: "1.25rem",
        borderLeft: `4px solid ${color}`,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.03)"
      }}
    >
      <span style={{ fontSize: "0.75rem", color: "var(--alvo-ink-soft)" }}>{label}</span>
      <strong style={{ display: "block", fontSize: "2rem", color: "var(--alvo-ink)", marginTop: 4 }}>{value}</strong>
      <p style={{ fontSize: "0.7rem", color: "var(--alvo-ink-soft)", marginTop: 4 }}>{detail}</p>
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

function mergeById<T extends { id: string }>(base: readonly T[], incoming: readonly T[]) {
  const map = new Map(base.map((item) => [item.id, item]));
  incoming.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
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

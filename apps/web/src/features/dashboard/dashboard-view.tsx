"use client";

import { registerPerson } from "../../lib/register-person";
import Link from "next/link";
import { friendlyError } from "../../lib/friendly-error";
import { OnboardingChecklist } from "./onboarding-checklist";
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Flame,
  Handshake,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  Map as MapIcon,
  Megaphone,
  MessageSquareText,
  QrCode,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Target,
  Trophy,
  UserPlus,
  UsersRound,
  Waypoints
} from "lucide-react";
import { useEffect, useMemo, useState, useRef, type CSSProperties, type FormEvent } from "react";
import {
  calculateTribeQuestionnaireResult,
  canManagePeople,
  createTribeReclassificationSnapshot,
  getBrandModeLabel,
  getEnabledModuleCount,
  getEventTypeLabel,
  getFollowUpStatusLabel,
  getGroupTypeLabel,
  getJourneyKindLabel,
  getPartnerBenefitCategoryLabel,
  getPlanTierLabel,
  getRecommendedReviewType,
  getRecommendedReviewTypeLabel,
  getRegistrationStatusLabel,
  getReviewRequestStatusLabel,
  getStrongestBehaviorSignal,
  getTribeDisplayLabel,
  getTribeValidationLabel,
  getVisitorStageLabel,
  isModuleEnabled,
  shouldRecommendTribeReview,
  tribeQuestionnaireV1
} from "@alvo/domain";
import { BrandLogo } from "../../../app/brand-logo";
import { useAppAuth } from "../../../app/providers";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  fetchEventCheckIns,
  fetchEvents,
  fetchFamilies,
  fetchFinancialTransparencyReports,
  fetchFollowUpTasks,
  fetchGroups,
  fetchPeople,
  fetchVisitorIntakes,
  fetchVisitorJourneys,
  isFirebaseWebRuntimeConfigured,
  publishFinancialTransparencyReport,
  updateFollowUpTaskStatus
} from "@alvo/firebase";
import { cachedFetchPeople, cachedFetchGroups } from "../../lib/org-data-cache";
import type {
  Family,
  Event,
  FollowUpTask,
  Group,
  OrganizationSettingsSnapshot,
  Person,
  VisitorIntake,
  VisitorJourney,
  FinancialTransparencyReport,
  EventCheckIn
} from "@alvo/types";

import { getModuleHighlights, operationalShortcuts } from "./dashboard-navigation";
import { useOrgFeatures } from "../../../contexts/OrgFeaturesContext";
import type { TribeReclassificationSnapshot as DashboardShape } from "@alvo/types";


export function DashboardView() {
  const { configured, user, organizationId, firebaseConfig, roles, tenantReady } = useAppAuth();
  const { isEnabled } = useOrgFeatures();
  const moduleHighlights = getModuleHighlights(isEnabled, roles.includes("super_admin"));
  const visitorAttempt = useRef(crypto.randomUUID());
  const visitorBusy = useRef(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [completedActionIds, setCompletedActionIds] = useState<string[]>([]);
  const [actionSyncStatus, setActionSyncStatus] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [capturedVisitors, setCapturedVisitors] = useState<any[]>([]);
  const [visitorDraft, setVisitorDraft] = useState({
    name: "",
    phone: "",
    source: "WhatsApp"
  });
  const [preparedCommunicationIds, setPreparedCommunicationIds] = useState<string[]>([]);
  const [greetedVisitorIds, setGreetedVisitorIds] = useState<string[]>([]);
  const [receptionStatus, setReceptionStatus] = useState<string | null>(null);
  const [publishedTransparencyMonth, setPublishedTransparencyMonth] = useState<string | null>(null);
  const [transparencyStatus, setTransparencyStatus] = useState<string | null>(
    null
  );

  const [realPeople, setRealPeople] = useState<Person[]>([]);
  const [realFamilies, setRealFamilies] = useState<Family[]>([]);
  const [realGroups, setRealGroups] = useState<Group[]>([]);
  const [realEvents, setRealEvents] = useState<Event[]>([]);
  const [realJourneys, setRealJourneys] = useState<VisitorJourney[]>([]);
  const [realTasks, setRealTasks] = useState<FollowUpTask[]>([]);
  const [realIntakes, setRealIntakes] = useState<VisitorIntake[]>([]);
  const [realCheckIns, setRealCheckIns] = useState<EventCheckIn[]>([]);
  const [realReports, setRealReports] = useState<FinancialTransparencyReport[]>([]);
  const [syncMessage, setSyncMessage] = useState("Iniciando conexao pastoral...");


  // Unsupported summaries stay empty until their own queries are connected.
  const dashboard: Pick<DashboardShape, "journeyProfiles" | "currentTribeProfiles" | "reviewRequests" | "behaviorSignals"> = {
    journeyProfiles: [], currentTribeProfiles: [], reviewRequests: [], behaviorSignals: [],
  };
  const familyPanorama = realFamilies.map((family) => ({
    family,
    members: realPeople.filter((person) => person.primaryFamilyId === family.id),
    neighborhood: family.address?.district ?? "Sem bairro",
    visitorLinks: realJourneys.filter((journey) => realPeople.some((person) => person.id === journey.personId && person.primaryFamilyId === family.id)),
    incomeRange: family.incomeRange ?? "not_informed",
  }));
  const neighborhoodDistribution = [...new Set(familyPanorama.map((item) => item.neighborhood))].map((label) => ({
    label, value: familyPanorama.filter((item) => item.neighborhood === label).reduce((sum, item) => sum + item.members.length, 0),
  }));
  const familyInsightMetrics = [
    { label: "Famílias mapeadas", value: realFamilies.length, detail: `${realPeople.length} pessoas com perfil pastoral` },
    { label: "Com endereço", value: realPeople.filter((p) => p.address?.district).length, detail: "base para mapa por bairro" },
    { label: "Com consentimento", value: realPeople.filter((p) => p.consentLgpdAt).length, detail: "consentimentos registrados" },
    { label: "Esdras Passe ativo", value: realPeople.filter((p) => p.partnerBenefitsEnabled).length, detail: "membros habilitados" },
  ];
  const memberPassPreview = realPeople.filter((p) => p.memberCardCode).map((p) => ({
    id: p.id, name: getPersonDisplayName(p), code: p.memberCardCode,
    active: Boolean(p.partnerBenefitsEnabled && p.consentLgpdAt), partnerScope: "Consulte a elegibilidade nos parceiros cadastrados.",
  }));
  const latestReport = realReports[0];
  const transparencySummary = latestReport ?? { month: "Sem demonstrativo", income: 0, expenses: 0, missions: 0, balance: 0 };
  const transparencyEntries = latestReport?.entries.map((entry, index) => ({ ...entry, id: String(index) })) ?? [];
  function getPersonName(id: string) {
    const person = realPeople.find((item) => item.id === id);
    return person ? getPersonDisplayName(person) : "Pessoa não encontrada";
  }

  useEffect(() => {
    if (!configured || !user || !tenantReady || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setSyncMessage("Conecte-se para carregar dados reais.");
      return;
    }

    setRealPeople([]); setRealFamilies([]); setRealGroups([]); setRealEvents([]);
    setRealJourneys([]); setRealTasks([]); setRealIntakes([]); setRealCheckIns([]); setRealReports([]);
    setCapturedVisitors([]); setCompletedActionIds([]);
    let cancelled = false;

    async function syncDashboard() {
      setSyncMessage("Sincronizando pulso da igreja...");
      try {
        const [nextPeople, nextFamilies, nextGroups, nextEvents, nextJourneys, nextTasks, nextIntakes, nextReports] = await Promise.all([
          cachedFetchPeople(firebaseConfig, { organizationId }, 100),
          fetchFamilies(firebaseConfig, { organizationId }, 50),
          cachedFetchGroups(firebaseConfig, { organizationId }, 20),
          fetchEvents(firebaseConfig, { organizationId }, 20),
          fetchVisitorJourneys(firebaseConfig, { organizationId }, 50),
          fetchFollowUpTasks(firebaseConfig, { organizationId }, 100),
          fetchVisitorIntakes(firebaseConfig, { organizationId }, 50),
          fetchFinancialTransparencyReports(firebaseConfig, { organizationId }, 12)
        ]);

        if (cancelled) return;

        setRealPeople(nextPeople);
        setRealFamilies(nextFamilies);
        setRealGroups(nextGroups);
        setRealEvents(nextEvents);
        setRealJourneys(nextJourneys);
        setRealTasks(nextTasks);
        setRealIntakes(nextIntakes);
        setRealReports(nextReports);
        setCapturedVisitors(nextIntakes);
        setSyncMessage(`Painel atualizado: ${nextPeople.length} pessoas e ${nextGroups.length} grupos.`);

        // Check-ins de eventos/cultos (presença real) — busca depois dos eventos.
        const nextCheckIns = await fetchEventCheckIns(firebaseConfig, { organizationId }, nextEvents, 50).catch(() => []);
        if (!cancelled) setRealCheckIns(nextCheckIns);
      } catch (error) {
        if (!cancelled) {
          setSyncMessage(friendlyError(error, "Erro na sincronizacao."));
        }
      }
    }

    void syncDashboard();
    return () => { cancelled = true; };
  }, [configured, firebaseConfig, organizationId, user, tenantReady]);

  // "Semana da igreja" REAL: atividade por dia da semana (entradas de visitantes
  // + check-ins de eventos/cultos), agregando os registros reais buscados.
  const weeklyMomentumReal = useMemo(() => {
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const full = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const bump = (iso?: string) => {
      if (!iso) return;
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) counts[d.getDay()] += 1;
    };
    realIntakes.forEach((i) => bump(i.createdAt));
    realCheckIns.forEach((c) => bump(c.checkedInAt));
    const total = counts.reduce((a, b) => a + b, 0);
    const max = Math.max(1, ...counts);
    const peakIndex = counts.indexOf(Math.max(...counts));
    return {
      bars: labels.map((label, i) => ({ label, value: Math.round((counts[i] / max) * 100) })),
      total,
      peakLabel: full[peakIndex],
    };
  }, [realIntakes, realCheckIns]);
  const strongestSignal = getStrongestBehaviorSignal(
    dashboard.behaviorSignals,
    dashboard.reviewRequests[0]?.personId ?? ""
  );
  const averageJourneyProgress = Math.round(
    dashboard.journeyProfiles.reduce((sum, profile) => sum + profile.progressPercent, 0) /
      Math.max(dashboard.journeyProfiles.length, 1)
  );
  const openActionFeed = [
    ...(realTasks
      .filter((task) => task.status === "open" && !completedActionIds.includes(task.id))
      .map((task) => ({
        id: task.id,
        title: task.title,
        eyebrow: getFollowUpStatusLabel(task.status),
        detail: realPeople.find((p) => p.id === task.personId)?.firstName || "Pessoa",
        icon: CheckCircle2,
        href: "/journeys"
      })) as any[])
  ].filter((item, index, self) => self.findIndex((t) => t.id === item.id) === index);
  const peopleSource = realPeople as Person[];
  const familiesSource = realFamilies;
  const groupsSource = realGroups as Group[];
  const eventsSource = realEvents as Event[];
  const journeysSource = realJourneys as VisitorJourney[];
  const tasksSource = realTasks as FollowUpTask[];
  const openTasksSource = tasksSource.filter((task) => task.status !== "completed");

  const journeyBottlenecks = [
    {
      label: "Visitantes sem contato",
      value: capturedVisitors.filter((visitor) => !preparedCommunicationIds.includes(visitor.id)).length,
      detail: "precisam de boas-vindas ou primeiro contato",
      href: "/journeys"
    },
    {
      label: "Aspirantes sem familia",
      value: peopleSource.filter(
        (person) => ["visitor", "congregant", "new_believer"].includes(person.memberStatus) && !person.primaryFamilyId
      ).length,
      detail: "ainda nao viraram panorama familiar",
      href: "/members"
    },
    {
      label: "Membros sem celula",
      value: "—",
      detail: "consulte os vínculos no módulo de células",
      href: "/journeys"
    },
    {
      label: "Prontos para decisao",
      value: dashboard.journeyProfiles.filter((profile) => profile.readinessLevel === "high").length,
      detail: "jornadas pedindo proxima decisao pastoral",
      href: "/journeys"
    }
  ];
  const selectedPerson = peopleSource.find((person) => person.id === selectedPersonId);
  const selectedJourneyProfile = dashboard.journeyProfiles.find(
    (profile) => profile.personId === selectedPersonId
  );
  const selectedTribeProfile = dashboard.currentTribeProfiles.find(
    (profile) => profile.personId === selectedPersonId
  );
  const selectedFollowUps = tasksSource.filter(
    (task) => task.personId === selectedPersonId
  );
  const selectedFamilySnapshot = selectedPerson?.primaryFamilyId
    ? familyPanorama.find((familySnapshot) => familySnapshot.family.id === selectedPerson.primaryFamilyId)
    : null;

  const dynamicKpis = [
    {
      label: "Pessoas",
      value: peopleSource.length,
      detail: `${peopleSource.filter(p => p.memberStatus === 'member').length} membros ativos`,
      icon: UsersRound,
      tone: "blue"
    },
    {
      label: "Grupos",
      value: groupsSource.length,
      detail: "celulas mapeadas",
      icon: Waypoints,
      tone: "green"
    },
    {
      label: "Cuidado",
      value: tasksSource.filter(t => t.status === "open").length,
      detail: "tarefas pendentes",
      icon: HeartHandshake,
      tone: "orange"
    },
    {
      label: "Jornadas",
      value: journeysSource.length,
      detail: "visitantes no funil",
      icon: MapIcon,
      tone: "purple"
    }
  ];
  const pendingCommunicationVisitors = capturedVisitors.filter(
    (visitor) => !preparedCommunicationIds.includes(visitor.id)
  );
  const celebrationGreetingVisitors = capturedVisitors.filter(
    (visitor) => !greetedVisitorIds.includes(visitor.id)
  );
  const searchResults = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    if (!normalizedQuery) {
      return [];
    }

    return [
      ...peopleSource
        .filter((person) =>
          normalizeSearch(
            `${person.preferredName || person.firstName} ${person.lastName}`
          ).includes(normalizedQuery)
        )
        .map((person) => ({
          id: person.id,
          type: "Pessoa",
          title: `${person.preferredName || person.firstName} ${person.lastName}`,
          detail: person.email,
          href: `/members/${person.id}`
        })),
      ...capturedVisitors.map((visitor) => ({
        id: visitor.id,
        type: "Visitante",
        title: visitor.name,
        detail: `${visitor.source} - ${visitor.nextStep}`,
        href: "/reception"
      })),
      ...groupsSource.map((group) => ({
        id: group.id,
        type: "Celula",
        title: group.name,
        detail: `${getGroupTypeLabel(group.type)} · ${group.meetingTime}`,
        href: "/groups"
      })),
      ...eventsSource.map((event) => ({
        id: event.id,
        type: "Evento",
        title: event.name,
        detail: `${getEventTypeLabel(event.type)} · ${event.capacity} vagas`,
        href: "/events"
      })),
      ...openActionFeed.map((action) => ({
        id: action.id,
        type: "Acao",
        title: action.title,
        detail: `${action.eyebrow} · ${action.detail}`,
        href: action.href
      }))
    ].filter((item) =>
      normalizeSearch(`${item.type} ${item.title} ${item.detail}`).includes(normalizedQuery)
    );
  }, [query, completedActionIds, openActionFeed, capturedVisitors, eventsSource, groupsSource, peopleSource]);
  const primaryAction = openActionFeed[0] ?? null;
  const primaryActionCompleted = primaryAction ? completedActionIds.includes(primaryAction.id) : false;
  const dynamicOperationalShortcuts = operationalShortcuts.map((shortcut) => {
    switch (shortcut.href) {
      case "/reception":
        return { ...shortcut, meta: `${capturedVisitors.length} visitante(s)` };
      case "/members":
        return { ...shortcut, meta: `${peopleSource.length} pessoa(s)` };
      case "/journeys":
        return { ...shortcut, meta: `${openTasksSource.length} tarefa(s) abertas` };
      case "/groups":
        return { ...shortcut, meta: `${groupsSource.length} grupo(s)` };
      default:
        return shortcut;
    }
  });
  const mobileContractCards = [
    {
      label: "Inicio do app",
      title: "Resumo pessoal e proximos passos",
      detail: `${openTasksSource.length} tarefa(s) de cuidado alimentam a fila mobile quando vinculadas ao usuario.`,
      href: "/journeys",
      status: openTasksSource.length > 0 ? "Fonte ativa" : "Aguardando tarefas"
    },
    {
      label: "Agenda",
      title: "Eventos e celulas",
      detail: `${eventsSource.length} evento(s) e ${groupsSource.length} grupo(s) devem aparecer no celular conforme permissao.`,
      href: "/events",
      status: eventsSource.length || groupsSource.length ? "Fonte ativa" : "Sem agenda"
    },
    {
      label: "Jornada",
      title: "Missões, badges e integração",
      detail: `${journeysSource.length} jornada(s) de visitante hoje; proximo passo e ligar perfis gamificados do app.`,
      href: "/journeys",
      status: journeysSource.length ? "Parcial" : "A estruturar"
    },
    {
      label: "Perfil",
      title: "Ficha, família, LGPD e Esdras Passe",
      detail: `${peopleSource.length} pessoa(s) e ${familiesSource.length} familia(s) formam a base segura do app.`,
      href: "/members",
      status: peopleSource.length ? "Fonte ativa" : "Sem pessoas"
    }
  ];
  const careWorkflowSteps = [
    {
      label: "Capturar",
      title: "Recepção registra a pessoa",
      description: "O visitante entra uma vez e ja nasce como pessoa, jornada e tarefa de cuidado.",
      href: "/reception",
      icon: ClipboardList,
      metric: `${capturedVisitors.length} visitantes na fila`
    },
    {
      label: "Entender",
      title: "Cadastro vira panorama familiar",
      description: "Dados sensiveis ficam protegidos, mas lideres enxergam familia, bairro e contexto.",
      href: "#families",
      icon: UsersRound,
      metric: `${familiesSource.length} familias mapeadas`
    },
    {
      label: "Cuidar",
      title: "Jornada sugere o proximo passo",
      description: "Follow-ups, missoes e sinais pastorais deixam claro quem precisa de atencao.",
      href: "/journeys",
      icon: MapIcon,
      metric: `${openActionFeed.length} acoes abertas`
    },
    {
      label: "Integrar",
      title: "Grupos e eventos fecham o ciclo",
      description: "Convites, presencas e check-ins mostram se a pessoa saiu da visita para comunidade.",
      href: "/groups",
      icon: Waypoints,
      metric: `${realCheckIns.length} presenças em eventos`
    },
    {
      label: "Fortalecer",
      title: "Servico, Esdras Passe e comunicacao ampliam valor",
      description: "Membro serve com escala clara, se identifica fora da igreja e a equipe mantem contato sem expor dados privados.",
      href: "/serving",
      icon: Handshake,
      metric: `${isEnabled("volunteers") ? "Escalas disponíveis" : "Consulte seu plano"}`
    },
    {
      label: "Prestar contas",
      title: "Gestao publica o essencial",
      description: "Demonstrativos conectam confianca, arrecadacao e destino dos recursos.",
      href: "#transparency",
      icon: ReceiptText,
      metric: transparencySummary.month
    }
  ];
  const memberLifecycleStages = [
    {
      label: "01",
      title: "Chegada do convidado",
      description:
        "A recepção registra nome, origem e telefone sem transformar a recepcao em burocracia.",
      owner: "Equipe de recepcao",
      module: "Recepção",
      href: "/reception",
      icon: ClipboardList,
      tone: "blue",
      records: ["visitorIntakes", "people", "visitorJourneys"],
      nextActions: [
        "Cumprimentar durante a celebracao",
        "Enviar mensagem de boas-vindas",
        "Identificar quem convidou"
      ]
    },
    {
      label: "02",
      title: "Primeiro cuidado",
      description:
        "O visitante vira uma jornada acompanhada, com responsavel, canal e proxima acao clara.",
      owner: "Acolhimento",
      module: "Jornadas",
      href: "/journeys",
      icon: MessageSquareText,
      tone: "green",
      records: ["followUpTasks", "visitorJourneys"],
      nextActions: [
        "Confirmar primeira visita",
        "Convidar para retorno",
        "Encaminhar para classe ou celula"
      ]
    },
    {
      label: "03",
      title: "Aspirante a membro",
      description:
        "Quando ha interesse real, o cadastro deixa de ser minimo e passa a mapear familia e contexto.",
      owner: "Secretaria pastoral",
      module: "Cadastro completo",
      href: "/members/new",
      icon: UserPlus,
      tone: "orange",
      records: ["people", "families", "family members"],
      nextActions: [
        "Coletar LGPD",
        "Vincular grupo familiar",
        "Classificar status pastoral"
      ]
    },
    {
      label: "04",
      title: "Efetivacao como membro",
      description:
        "A pessoa passa a ter ficha completa, historico de cuidado, elegibilidade e responsabilidades.",
      owner: "Lideranca",
      module: "Membros",
      href: "/members",
      icon: UsersRound,
      tone: "ink",
      records: ["people.memberStatus", "memberCardCode", "consentLgpdAt"],
      nextActions: [
        "Validar dados sensiveis",
        "Ativar Esdras Passe se fizer sentido",
        "Definir lider de acompanhamento"
      ]
    },
    {
      label: "05",
      title: "Participacao em celula",
      description:
        "A integracao ganha corpo quando ha presenca, vinculo pequeno e acompanhamento semanal.",
      owner: "Lider de celula",
      module: "Celulas",
      href: "/groups",
      icon: Waypoints,
      tone: "green",
      records: ["groups", "meetings", "attendance"],
      nextActions: [
        "Convidar para grupo adequado",
        "Registrar presenca",
        "Sinalizar cuidado pastoral"
      ]
    },
    {
      label: "06",
      title: "Membro ativo na comunidade",
      description:
        "A partir daqui o app acompanha servico, eventos, comunicacao, beneficios e transparencia.",
      owner: "Gestao da igreja",
      module: "Escalas e operacao",
      href: "/serving",
      icon: Handshake,
      tone: "gold",
      records: ["serviceTeams", "serviceAssignments", "employees"],
      nextActions: [
        "Participar de eventos",
        "Servir em ministerios",
        "Acompanhar prestacao de contas"
      ]
    }
  ];

  function openPersonProfile(personId: string) {
    setSelectedPersonId(personId);
    setActiveSection("people");
    setQuery("");
  }

  async function handleVisitorCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = visitorDraft.name.trim();
    const phone = visitorDraft.phone.trim();

    if (!name) {
      setReceptionStatus("Informe pelo menos o nome do visitante.");
      return;
    }

    const localVisitor = {
      id: `visitor_intake_${Date.now()}`,
      name,
      phone: phone || "Sem telefone informado",
      source: visitorDraft.source,
      status: "Jornada criada",
      nextStep: "Enviar boas-vindas no WhatsApp",
      greeting: "Incluir nos cumprimentos da celebracao",
      communicationChannel: "WhatsApp",
      communicationStatus: "Pendente",
      presentationStatus: "Na lista"
    };

    if (visitorBusy.current) return;
    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) { setReceptionStatus("Entre na sua conta para salvar o visitante."); return; }
    visitorBusy.current = true;
    try {
      const [firstName, ...last] = name.split(/\s+/);
      const result = await registerPerson(user, { organizationId, requestId: visitorAttempt.current, workflow: "reception", person: { firstName, lastName: last.join(" "), whatsappPhone: phone }, reception: { source: localVisitor.source } });
      setCapturedVisitors(current => [{ ...localVisitor, id: result.intakeId! }, ...current]);
      setVisitorDraft({ name: "", phone: "", source: "WhatsApp" }); visitorAttempt.current = crypto.randomUUID();
      setReceptionStatus("Visitante salvo no Firestore com jornada e follow-ups criados.");
    } catch (error) {
      setReceptionStatus(
        friendlyError(error, "Nao foi possivel salvar o visitante no Firestore.")
      );
    } finally { visitorBusy.current = false; }
  }

  function handlePrepareVisitorCommunication(visitorId: string) {
    setPreparedCommunicationIds((currentIds) =>
      currentIds.includes(visitorId) ? currentIds : [...currentIds, visitorId]
    );
    setReceptionStatus("Mensagem preparada para a equipe de acolhimento revisar.");
  }

  function handleMarkGreetingComplete(visitorId: string) {
    setGreetedVisitorIds((currentIds) =>
      currentIds.includes(visitorId) ? currentIds : [...currentIds, visitorId]
    );
    setReceptionStatus("Cumprimento marcado como realizado na celebracao.");
  }

  async function handlePublishTransparencyReport() {
    if (!latestReport) return;
    setPublishedTransparencyMonth(transparencySummary.month);

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setTransparencyStatus(
        `Demonstrativo de ${transparencySummary.month} marcado localmente. Conecte o Firebase para publicar.`
      );
      return;
    }

    try {
      await publishFinancialTransparencyReport(
        firebaseConfig,
        { organizationId },
        {
          balance: transparencySummary.balance,
          entries: transparencyEntries.map(({ amount, category, label, note }) => ({
            amount,
            category,
            label,
            note
          })),
          expenses: transparencySummary.expenses,
          income: transparencySummary.income,
          missions: transparencySummary.missions,
          month: transparencySummary.month,
          publishedByUserId: user.uid
        }
      );
      setTransparencyStatus(`Demonstrativo de ${transparencySummary.month} publicado.`);
    } catch (error) {
      setTransparencyStatus(
        friendlyError(error, "Não foi possível publicar o demonstrativo.")
      );
    }
  }

  async function handleCompleteAction(actionId: string) {
    setCompletedActionIds((currentIds) =>
      currentIds.includes(actionId) ? currentIds : [...currentIds, actionId]
    );
    setActionSyncStatus("Acao concluida nesta sessao.");

    if (!actionId.startsWith("followup_")) {
      return;
    }

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setActionSyncStatus(
        "Acao concluida localmente. Conecte o Firebase para salvar no Firestore."
      );
      return;
    }

    try {
      await updateFollowUpTaskStatus(
        firebaseConfig,
        { organizationId },
        {
          taskId: actionId,
          status: "completed",
          completedByUserId: user.uid
        }
      );
      setActionSyncStatus("Follow-up salvo no Firestore.");
    } catch (error) {
      setCompletedActionIds((currentIds) => currentIds.filter((id) => id !== actionId));
      setActionSyncStatus(
        friendlyError(error, "Nao foi possivel salvar o follow-up no Firestore.")
      );
    }
  }

  return (
    <>

      <section className="app-workspace animate-entrance" id="overview">
        <header className="dashboard-header-premium">
          <div className="header-main">
            <div className="welcome-section">
              <p className="eyebrow">Painel Operacional</p>
              <h1>Bom dia, {user?.displayName || 'Pastor(a)'}.</h1>
              <div className="sync-status">
                <Activity size={14} className={syncMessage.includes('Erro') ? 'text-red' : 'text-green'} />
                <span>{syncMessage}</span>
              </div>
            </div>

            <div className="command-center">
              <div className="global-search-container">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Pessoas, grupos ou comandos... (⌘K)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <div className="search-overlay-dropdown antigravity-float">
                    {searchResults.length > 0 ? (
                      searchResults.slice(0, 8).map(result => (
                        <Link key={`${result.type}-${result.id}`} href={result.href} className="search-result-row">
                          <span className="type-tag">{result.type}</span>
                          <div className="result-info">
                            <strong>{result.title}</strong>
                            <small>{result.detail}</small>
                          </div>
                          <ChevronRight size={14} />
                        </Link>
                      ))
                    ) : (
                      <div className="no-results">Nenhum resultado para "{query}"</div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="quick-access-tools">
                <button 
                  className="tool-button" 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  data-active={notificationsOpen}
                >
                  <Bell size={20} />
                  {dashboard.reviewRequests.length > 0 && <span className="urgent-indicator" />}
                </button>
                <Link href="/members/new" className="action-button primary">
                  <UserPlus size={18} />
                  <span>Novo Membro</span>
                </Link>
              </div>
            </div>
          </div>
          
          {notificationsOpen && (
            <div className="notifications-dropdown-panel antigravity-float animate-entrance">
              <div className="panel-header">
                <strong>Pendências Pastorais</strong>
                <span className="soft-pill">{openActionFeed.length}</span>
              </div>
              <div className="panel-content">
                {openActionFeed.map(item => (
                  <Link key={item.id} href={item.href} className="notification-item">
                    <item.icon size={16} />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </header>

        <OnboardingChecklist
          organizationId={organizationId}
          peopleCount={realPeople.length}
          groupsCount={realGroups.length}
          eventsCount={realEvents.length}
          visitorsCount={realIntakes.length}
        />

        <section className="hero-grid">
          <article className="mission-board antigravity-float">
            <div className="mission-copy">
              <p className="eyebrow">Proxima melhor acao</p>
              <h2>{primaryAction ? primaryAction.title : "Fila pastoral em dia."}</h2>
              <p>
                {primaryAction
                  ? `${primaryAction.eyebrow} · ${primaryAction.detail}`
                  : "Quando uma tarefa, visitante ou alerta pastoral aparecer, a Dashboard vira o ponto de partida para resolver."}
              </p>
              <div className="mission-actions">
                <button
                  className="primary-button"
                  disabled={!primaryAction}
                  onClick={() => {
                    if (primaryAction) void handleCompleteAction(primaryAction.id);
                  }}
                >
                  <CheckCircle2 size={18} />
                  {primaryActionCompleted
                    ? "Follow-up concluido"
                    : primaryAction
                      ? "Concluir acao"
                      : "Sem acao aberta"}
                </button>
                <Link
                  className="ghost-button"
                  href={primaryAction?.href ?? "/journeys"}
                >
                  Abrir origem
                  <ChevronRight size={17} />
                </Link>
              </div>
            </div>
            <div className="progress-stack">
              <p>Acompanhe a evolução das pessoas no módulo de jornadas.</p>
              <Link href="/journeys">Consultar jornadas</Link>
            </div>
          </article>

          <article className="momentum-card antigravity-float-delayed">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Ritmo</p>
                <h2>Semana da igreja</h2>
              </div>
              <Activity size={20} />
            </div>
            <div className="bar-chart" aria-label="Atividade semanal">
              {weeklyMomentumReal.bars.map((day) => (
                <div key={day.label} className="bar-slot">
                  <span style={{ height: `${day.value}%` }} />
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
            <p className="microcopy">
              {weeklyMomentumReal.total > 0
                ? `Pico de atividade na ${weeklyMomentumReal.peakLabel} — entradas de visitantes e check-ins de eventos.`
                : "Ainda sem entradas de visitantes ou check-ins registrados para medir o ritmo da semana."}
            </p>
          </article>
        </section>

        <section className="kpi-grid" aria-label="Indicadores principais">
          {dynamicKpis.map((kpi) => (
            <article key={kpi.label} className={`metric-card tone-${kpi.tone}`}>
              <div className="metric-icon">
                <kpi.icon size={19} />
              </div>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <p>{kpi.detail}</p>
            </article>
          ))}
        </section>

        <section className="bottleneck-strip" aria-label="Gargalos da jornada">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Gargalos do fluxo</p>
              <h2>Onde a igreja pode perder pessoas</h2>
            </div>
            <Link className="soft-pill" href="/journeys">
              Abrir jornadas
            </Link>
          </div>
          <div className="bottleneck-strip-grid">
            {journeyBottlenecks.map((item) => (
              <Link
                className={item.value ? "bottleneck-mini has-risk" : "bottleneck-mini"}
                href={item.href}
                key={item.label}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="shortcut-panel" aria-label="Atalhos operacionais">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Central do projeto</p>
              <h2>Escolha onde trabalhar agora</h2>
            </div>
            <span className="soft-pill">Paginas principais</span>
          </div>
          <div className="shortcut-grid">
            {dynamicOperationalShortcuts.map((shortcut) => (
              <Link
                className="shortcut-card"
                href={shortcut.href}
                key={shortcut.label}
                onClick={() => {
                  if (shortcut.href.startsWith("#")) {
                    setActiveSection(shortcut.href.slice(1));
                  }
                }}
              >
                <div className="shortcut-card-head">
                  <div className="shortcut-icon">
                    <shortcut.icon size={19} />
                  </div>
                  <div className="shortcut-card-headtext">
                    <span>{shortcut.label}</span>
                    <strong>{shortcut.title}</strong>
                  </div>
                </div>
                <p>{shortcut.description}</p>
                <small>{shortcut.meta}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="workflow-panel" aria-label="Mapa da jornada operacional">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Como a Esdras conecta tudo</p>
              <h2>Da primeira visita ate o cuidado continuo</h2>
            </div>
            <span className="soft-pill">Fluxo recomendado</span>
          </div>
          <div className="workflow-rail">
            {careWorkflowSteps.map((step, index) => (
              <a
                className="workflow-step"
                href={step.href}
                key={step.label}
                onClick={() => {
                  if (step.href.startsWith("#")) {
                    setActiveSection(step.href.slice(1));
                  }
                }}
              >
                <span className="workflow-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="workflow-icon">
                  <step.icon size={18} />
                </div>
                <div>
                  <small>{step.label}</small>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                  <b>{step.metric}</b>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="lifecycle-panel" aria-label="Fluxo completo do convidado ao membro ativo">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Jornada de vida</p>
              <h2>Do convidado ao membro participante</h2>
            </div>
            <span className="soft-pill">Fluxo operacional</span>
          </div>
          <div className="lifecycle-grid">
            {memberLifecycleStages.map((stage) => (
              <article className={`lifecycle-card tone-${stage.tone}`} key={stage.label}>
                <div className="lifecycle-card-header">
                  <span>{stage.label}</span>
                  <strong>{stage.title}</strong>
                  <stage.icon size={18} />
                </div>
                <p>{stage.description}</p>
                <div className="lifecycle-meta">
                  <small>{stage.owner}</small>
                  <b>{stage.module}</b>
                </div>
                <div className="lifecycle-records">
                  {stage.records.map((record) => (
                    <code key={record}>{record}</code>
                  ))}
                </div>
                <ul>
                  {stage.nextActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
                <Link
                  className="lifecycle-link"
                  href={stage.href}
                  onClick={() => {
                    if (stage.href.startsWith("#")) {
                      setActiveSection(stage.href.slice(1));
                    }
                  }}
                >
                  Abrir {stage.module}
                  <ChevronRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="workflow-panel" aria-label="Contrato entre painel web e app mobile">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Web + mobile</p>
              <h2>O que o painel alimenta no celular do membro</h2>
            </div>
            <span className="soft-pill">Contrato operacional</span>
          </div>
          <div className="shortcut-grid">
            {mobileContractCards.map((card) => (
              <Link className="shortcut-card" href={card.href} key={card.label}>
                <div className="shortcut-card-head">
                  <div className="shortcut-icon">
                    <Smartphone size={19} />
                  </div>
                  <div className="shortcut-card-headtext">
                    <span>{card.label}</span>
                    <strong>{card.title}</strong>
                  </div>
                </div>
                <p>{card.detail}</p>
                <small>{card.status}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="content-grid">
          <article className="panel span-2" id="people">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Pessoas e jornadas</p>
                <h2>Progresso pastoral</h2>
              </div>
              <div className="section-actions">
                <Link className="soft-pill" href="/members">
                  Ver base
                </Link>
                <span className="soft-pill">{roles.some((role) => ["super_admin", "church_admin", "pastor", "secretary"].includes(role)) ? "Admin" : "Leitura"}</span>
              </div>
            </div>
            <div className="journey-list" id="journeys">
              {dashboard.journeyProfiles.map((profile) => (
                <button
                  key={profile.id}
                  className={
                    selectedPersonId === profile.personId
                      ? "journey-row is-selected"
                      : "journey-row"
                  }
                  onClick={() => openPersonProfile(profile.personId)}
                  type="button"
                >
                  <div className="avatar">{getInitials(getPersonName(profile.personId))}</div>
                  <div>
                    <strong>{getPersonName(profile.personId)}</strong>
                    <p>
                      {getJourneyKindLabel(profile.currentJourneyKind)} · prontidao{" "}
                      {profile.readinessLevel}
                    </p>
                  </div>
                  <div className="row-progress" aria-label={`${profile.progressPercent}%`}>
                    <span style={{ width: `${profile.progressPercent}%` }} />
                  </div>
                  <b>{profile.progressPercent}%</b>
                </button>
              ))}
            </div>
          </article>

          <article className="panel span-3 family-panel" id="families">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Pessoas & Familias 2.0</p>
                <h2>Mapa completo de membros, casas e aspirantes</h2>
              </div>
              <span className="soft-pill">Dados sensiveis protegidos</span>
            </div>

            <div className="family-metrics">
              {familyInsightMetrics.map((metric) => (
                <div key={metric.label} className="family-metric">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
            </div>
          ))}

        </div>

            <div className="family-workbench">
              <div className="family-map-card">
                <div>
                  <strong>Panorama por bairro</strong>
                  <p>
                    Visao para lideres entenderem onde as familias estao, sem expor endereco
                    completo em relatorios abertos.
                  </p>
                </div>
                <div className="neighborhood-bars">
                  {neighborhoodDistribution.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <div>
                        <b style={{ width: `${Math.max(18, item.value * 28)}%` }} />
                      </div>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="family-list">
                {familyPanorama.map((familySnapshot) => (
                  <div key={familySnapshot.family.id} className="family-card">
                    <div>
                      <strong>{familySnapshot.family.displayName}</strong>
                      <p>
                        {familySnapshot.neighborhood} · {familySnapshot.members.length} membro(s) ·{" "}
                        {getIncomeRangeLabel(familySnapshot.incomeRange)}
                      </p>
                    </div>
                    <div className="family-tags">
                      {familySnapshot.members.map((member) => (
                        <span key={member.id}>{getPersonDisplayName(member)}</span>
                      ))}
                    </div>
                    <small>
                      {familySnapshot.visitorLinks.length} visitante(s)/aspirante(s) conectados a
                      acompanhamento.
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Acoes</p>
                <h2>Fila viva</h2>
              </div>
              <span className="soft-pill">{openActionFeed.length}</span>
            </div>
            <div className="feed-list" id="actions">
              {openActionFeed.length ? openActionFeed.map((item) => (
                <div key={item.id} className="feed-item">
                  <item.icon size={17} />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.eyebrow} · {item.detail}</p>
                  </div>
                  <button
                    aria-label={`Concluir ${item.title}`}
                    className="feed-action"
                    onClick={() => void handleCompleteAction(item.id)}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                </div>
              )) : (
                <div className="empty-state">
                  <CheckCircle2 size={20} />
                  <strong>Fila limpa</strong>
                  <p>As acoes visiveis foram concluidas nesta sessao.</p>
                </div>
              )}
            </div>
            {actionSyncStatus ? (
              <p className="action-sync-status">{actionSyncStatus}</p>
            ) : null}
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Modulos</p>
                <h2>Suite ativa</h2>
              </div>
              <span className="soft-pill">
                {(["core", "visitors", "groups", "events", "children", "youth", "volunteers", "tribes", "journeys", "communication", "marketplace", "giving", "publicForms", "finance", "ai"] as const).filter(isEnabled).length} ativos
              </span>
            </div>
            <div className="module-list">
              {moduleHighlights.map((module) => (
                <a
                  href={module.href}
                  key={module.label}
                  className="module-item"
                  onClick={() => {
                    if (module.href.startsWith("#")) {
                      setActiveSection(module.href.slice(1));
                    }
                  }}
                >
                  <module.icon size={18} />
                  <div>
                    <strong>{module.label}</strong>
                    <p>{module.description}</p>
                    <small>{module.action}</small>
                  </div>
                  <span className={module.enabled ? "status-dot on" : "status-dot"} />
                </a>
              ))}
            </div>
          </article>

          <article className="panel member-pass-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Esdras Passe</p>
                <h2>Carteira do membro</h2>
              </div>
              <QrCode size={20} />
            </div>
            <div className="member-pass-card">
              <div>
                <span>Validacao externa</span>
                <strong>QR seguro</strong>
                <p>
                  Parceiros validam beneficio ativo sem receber CPF, renda, endereco ou historico
                  pastoral.
                </p>
              </div>
              <ShieldCheck size={28} />
            </div>
            <div className="member-pass-list">
              {memberPassPreview.map((pass) => (
                <div key={pass.id}>
                  <strong>{pass.name}</strong>
                  <code>{pass.code}</code>
                  <span className={pass.active ? "pass-status on" : "pass-status"}>
                    {pass.active ? "Ativo" : "Consentimento pendente"}
                  </span>
                  <p>{pass.partnerScope}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel span-2" id="groups">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Operacao</p>
                <h2>Grupos, eventos e check-ins</h2>
              </div>
              <span className="soft-pill">Hoje</span>
            </div>
            <div className="ops-grid">
              {groupsSource.slice(0, 4).map((group) => (
                <div key={group.id} className="ops-card">
                  <Waypoints size={18} />
                  <strong>{group.name}</strong>
                  <p>{getGroupTypeLabel(group.type)} · {group.meetingTime}</p>
                </div>
              ))}
              {eventsSource.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className="ops-card"
                  id={event.id === eventsSource[0]?.id ? "events" : undefined}
                >
                  <CalendarDays size={18} />
                  <strong>{event.name}</strong>
                  <p>{getEventTypeLabel(event.type)} · {event.capacity} vagas</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel span-2 reception-panel" id="reception">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recepção inteligente</p>
                <h2>Entrada de visitantes</h2>
              </div>
              <span className="soft-pill">{capturedVisitors.length} visitantes</span>
            </div>
            <div className="reception-grid">
              <form className="visitor-form" onSubmit={handleVisitorCapture}>
                <label>
                  Nome do visitante
                  <input
                    aria-label="Nome do visitante"
                    name="visitorName"
                    onChange={(event) =>
                      setVisitorDraft((draft) => ({ ...draft, name: event.target.value }))
                    }
                    placeholder="Ex: Joao Pereira"
                    value={visitorDraft.name}
                  />
                </label>
                <label>
                  WhatsApp ou telefone
                  <input
                    aria-label="WhatsApp ou telefone"
                    name="visitorPhone"
                    onChange={(event) =>
                      setVisitorDraft((draft) => ({ ...draft, phone: event.target.value }))
                    }
                    placeholder="(00) 90000-0000"
                    value={visitorDraft.phone}
                  />
                </label>
                <label>
                  Origem
                  <select
                    aria-label="Origem do visitante"
                    name="visitorSource"
                    onChange={(event) =>
                      setVisitorDraft((draft) => ({ ...draft, source: event.target.value }))
                    }
                    value={visitorDraft.source}
                  >
                    <option>WhatsApp</option>
                    <option>Instagram</option>
                    <option>Convite de membro</option>
                    <option>Passando na rua</option>
                  </select>
                </label>
                <button className="primary-button compact" type="submit">
                  <UserPlus size={17} />
                  Criar jornada
                </button>
                {receptionStatus ? <p className="form-status">{receptionStatus}</p> : null}
              </form>

              <div className="visitor-automation">
                <div className="automation-card">
                  <QrCode size={20} />
                  <strong>Check-in rapido</strong>
                  <p>Ficha simples para portaria, QR Code ou tablet na entrada.</p>
                </div>
                <div className="automation-card">
                  <Smartphone size={20} />
                  <strong>Jornada automatica</strong>
                  <p>Boas-vindas, convite para celula e lembrete de retorno.</p>
                </div>
                <div className="automation-card">
                  <Megaphone size={20} />
                  <strong>Cumprimentos no culto</strong>
                  <p>Lista segura para apresentacao e acolhimento durante a celebracao.</p>
                </div>
              </div>
            </div>
            <div className="visitor-list">
              {capturedVisitors.slice(0, 4).map((visitor) => (
                <div className="visitor-row" key={visitor.id}>
                  <div className="avatar">{getInitials(visitor.name)}</div>
                  <div>
                    <strong>{visitor.name}</strong>
                    <p>{visitor.source} - {visitor.nextStep}</p>
                    <small>{visitor.greeting}</small>
                  </div>
                  <span>{visitor.status}</span>
                </div>
              ))}
            </div>

            <div className="reception-workbench">
              <div className="queue-panel">
                <div className="queue-heading">
                  <MessageSquareText size={18} />
                  <strong>Fila de comunicacao</strong>
                  <span>{pendingCommunicationVisitors.length}</span>
                </div>
                {capturedVisitors.slice(0, 4).map((visitor) => {
                  const prepared = preparedCommunicationIds.includes(visitor.id);

                  return (
                    <div className="queue-item" key={`communication-${visitor.id}`}>
                      <div>
                        <strong>{visitor.name}</strong>
                        <p>{visitor.communicationChannel} - {visitor.nextStep}</p>
                      </div>
                      <button
                        className={prepared ? "queue-action is-done" : "queue-action"}
                        onClick={() => handlePrepareVisitorCommunication(visitor.id)}
                        type="button"
                      >
                        <CheckCircle2 size={16} />
                        {prepared ? "Pronta" : "Preparar"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="queue-panel">
                <div className="queue-heading">
                  <Megaphone size={18} />
                  <strong>Cumprimentos</strong>
                  <span>{celebrationGreetingVisitors.length}</span>
                </div>
                {capturedVisitors.slice(0, 4).map((visitor) => {
                  const greeted = greetedVisitorIds.includes(visitor.id);

                  return (
                    <div className="queue-item" key={`greeting-${visitor.id}`}>
                      <div>
                        <strong>{visitor.name}</strong>
                        <p>{visitor.greeting}</p>
                      </div>
                      <button
                        className={greeted ? "queue-action is-done" : "queue-action"}
                        onClick={() => handleMarkGreetingComplete(visitor.id)}
                        type="button"
                      >
                        <CheckCircle2 size={16} />
                        {greeted ? "Feito" : "Marcar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>

          <article className="panel transparency-panel" id="transparency">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Prestacao de contas</p>
                <h2>Transparencia</h2>
              </div>
              <ReceiptText size={20} />
            </div>
            <div className="finance-summary">
              <span>{transparencySummary.month}</span>
              <strong>{formatCurrency(transparencySummary.income)}</strong>
              <p>Arrecadado no periodo</p>
            </div>
            <div className="finance-split">
              <div>
                <span>Saidas</span>
                <strong>{formatCurrency(transparencySummary.expenses)}</strong>
              </div>
              <div>
                <span>Missoes</span>
                <strong>{formatCurrency(transparencySummary.missions)}</strong>
              </div>
              <div>
                <span>Saldo</span>
                <strong>{formatCurrency(transparencySummary.balance)}</strong>
              </div>
            </div>
            <div className="finance-list">
              {transparencyEntries.map((entry) => (
                <div key={entry.id}>
                  <span>{entry.category}</span>
                  <strong>{entry.label}</strong>
                  <p>{entry.note}</p>
                  <b>{formatCurrency(entry.amount)}</b>
                </div>
              ))}
            </div>
            <button
              className="ghost-button full"
              onClick={() => void handlePublishTransparencyReport()}
              disabled={!latestReport}
              type="button"
            >
              <Send size={16} />
              Publicar demonstrativo
            </button>
            <p className="form-status">
              {publishedTransparencyMonth
                ? transparencyStatus
                : transparencyStatus}
            </p>
          </article>

          <article className="panel span-3 tribe-panel" id="tribes">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Tribos ministeriais</p>
                <h2>Score, encaixe e reclassificacao</h2>
              </div>
              <span className="soft-pill">
                {tribeQuestionnaireV1.questions.length} perguntas
              </span>
            </div>
            <p>Consulte as avaliações e classificações registradas no módulo de Tribos.</p>
            <Link href="/tribes">Consultar tribos</Link>
          </article>
        </section>

      </section>

      {selectedPerson ? (
        <aside className="person-drawer" aria-label="Detalhes da pessoa">
          <div className="drawer-header">
            <div className="avatar large">{getInitials(getPersonDisplayName(selectedPerson))}</div>
            <div>
              <p className="eyebrow">Perfil pastoral</p>
              <h2>{getPersonDisplayName(selectedPerson)}</h2>
              <span>{selectedPerson.email}</span>
            </div>
            <button
              aria-label="Fechar perfil pastoral"
              className="drawer-close"
              onClick={() => setSelectedPersonId(null)}
              type="button"
            >
              Fechar
            </button>
          </div>

          <div className="drawer-grid">
            <div>
              <span>Status</span>
              <strong>{getPersonStatusLabel(selectedPerson.status)}</strong>
            </div>
            <div>
              <span>Tribo</span>
              <strong>
                {selectedTribeProfile?.currentPrimaryTribeCode
                  ? getTribeDisplayLabel(selectedTribeProfile.currentPrimaryTribeCode)
                  : "Sem tribo"}
              </strong>
            </div>
            <div>
              <span>Jornada</span>
              <strong>
                {selectedJourneyProfile
                  ? getJourneyKindLabel(selectedJourneyProfile.currentJourneyKind)
                  : "Sem jornada"}
              </strong>
            </div>
            <div>
              <span>Prontidao</span>
              <strong>{selectedJourneyProfile?.readinessLevel ?? "n/a"}</strong>
            </div>
            <div>
              <span>Idade</span>
              <strong>{selectedPerson.birthDate ? `${calculateAge(selectedPerson.birthDate)} anos` : "n/a"}</strong>
            </div>
            <div>
              <span>Familia</span>
              <strong>{selectedFamilySnapshot?.family.displayName ?? "Sem grupo familiar"}</strong>
            </div>
            <div>
              <span>Bairro</span>
              <strong>{selectedPerson.address?.district ?? selectedFamilySnapshot?.neighborhood ?? "n/a"}</strong>
            </div>
            <div>
              <span>Faixa de renda</span>
              <strong>{getIncomeRangeLabel(selectedPerson.householdIncomeRange ?? selectedFamilySnapshot?.incomeRange)}</strong>
            </div>
          </div>

          <div className="drawer-section sensitive-section">
            <h3>Dados cadastrais protegidos</h3>
            <p>
              CPF {selectedPerson.cpf ? maskCpf(selectedPerson.cpf) : "nao informado"} ·{" "}
              {selectedPerson.occupation ?? "ocupacao nao informada"} ·{" "}
              {getEducationLevelLabel(selectedPerson.educationLevel)}
            </p>
            <p>
              Consentimento LGPD:{" "}
              <strong>{selectedPerson.consentLgpdAt ? "registrado" : "pendente"}</strong>
            </p>
          </div>

          <div className="drawer-section member-pass-summary">
            <h3>Esdras Passe</h3>
            <p>
              Codigo {selectedPerson.memberCardCode ?? "nao emitido"} ·{" "}
              {selectedPerson.partnerBenefitsEnabled
                ? "beneficios externos ativos"
                : "aguardando consentimento"}
            </p>
            <small>
              Parceiros devem validar apenas status do beneficio, nunca CPF, endereco, renda ou
              historico pastoral.
            </small>
          </div>

          {selectedJourneyProfile ? (
            <div className="drawer-progress">
              <div>
                <span>Progresso da jornada</span>
                <strong>{selectedJourneyProfile.progressPercent}%</strong>
              </div>
              <div className="row-progress">
                <span style={{ width: `${selectedJourneyProfile.progressPercent}%` }} />
              </div>
            </div>
          ) : null}

          <div className="drawer-section">
            <h3>Proximos passos</h3>
            {selectedFollowUps.length ? (
              selectedFollowUps.map((followUp) => (
                <button
                  key={followUp.id}
                  className={
                    completedActionIds.includes(followUp.id)
                      ? "drawer-task is-done"
                      : "drawer-task"
                  }
                  onClick={() => void handleCompleteAction(followUp.id)}
                  type="button"
                >
                  <CheckCircle2 size={17} />
                  <span>
                    <strong>{followUp.title}</strong>
                    <small>{getFollowUpStatusLabel(followUp.status)}</small>
                  </span>
                </button>
              ))
            ) : (
              <p className="drawer-empty">Nenhum follow-up aberto para esta pessoa.</p>
            )}
          </div>
        </aside>
      ) : null}
    </>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getPersonName(personId: string) {
  return personId;
}

function getPersonStatusLabel(status: string) {
  return status === "active" ? "Ativo" : status;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getPersonDisplayName(person: Person) {
  const preferredName = "preferredName" in person ? person.preferredName : undefined;

  return preferredName ?? `${person.firstName} ${"lastName" in person ? (person as any).lastName : ""}`.trim();
}

function calculateAge(birthDate: string) {
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

  return hadBirthdayThisYear ? age : age - 1;
}

function getIncomeRangeLabel(incomeRange?: string) {
  switch (incomeRange) {
    case "up_to_1_minimum_wage":
      return "ate 1 salario";
    case "one_to_3_minimum_wages":
      return "1 a 3 salarios";
    case "three_to_5_minimum_wages":
      return "3 a 5 salarios";
    case "five_to_10_minimum_wages":
      return "5 a 10 salarios";
    case "above_10_minimum_wages":
      return "acima de 10 salarios";
    default:
      return "nao informado";
  }
}

function getEducationLevelLabel(educationLevel?: string) {
  switch (educationLevel) {
    case "elementary":
      return "fundamental";
    case "high_school":
      return "ensino medio";
    case "technical":
      return "tecnico";
    case "undergraduate":
      return "superior";
    case "postgraduate":
      return "pos-graduacao";
    default:
      return "escolaridade nao informada";
  }
}

function maskCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, "");

  if (digits.length !== 11) {
    return "***.***.***-**";
  }

  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
}

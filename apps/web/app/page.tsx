"use client";

import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Flame,
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
import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
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
import { AuthPanel } from "./auth-panel";
import { AuthStatusCard } from "./auth-status";
import { BrandLogo } from "./brand-logo";
import { LiveOperations } from "./live-operations";
import { LiveTenantData } from "./live-data";
import { TenantAdminSettings } from "./tenant-admin-settings";
import { useAppAuth } from "./providers";
import {
  createVisitorIntakeWorkflow,
  createFirebaseWebRuntimeConfigFromEnv,
  isFirebaseWebRuntimeConfigured,
  publishFinancialTransparencyReport,
  updateFollowUpTaskStatus
} from "@alvo/firebase";
import type { OrganizationSettingsSnapshot } from "@alvo/types";

const organization = {
  id: "org_alvo_demo",
  name: "Getro Church",
  slug: "getro-church",
  status: "active",
  timezone: "America/Belem",
  locale: "pt-BR",
  countryCode: "BR"
} as const;

const tenantSettings: OrganizationSettingsSnapshot = {
  branding: {
    organizationId: organization.id,
    brandMode: "co_branded",
    publicProductName: "Getro Church",
    publicShortName: "Getro",
    primaryColor: "#d27836",
    secondaryColor: "#1c2433",
    accentColor: "#e8dcc7",
    surfaceColor: "#f7f3ea",
    textColor: "#1c2433",
    showPoweredByAlvo: true,
    poweredByLabel: "by Alvo"
  },
  subscription: {
    organizationId: organization.id,
    planCode: "alvo-growth",
    planTier: "growth",
    billingCycle: "monthly",
    memberRange: "101_to_300",
    seatLimit: 12,
    campusLimit: 2,
    aiQuota: 250,
    whiteLabelEnabled: false,
    coBrandingEnabled: true,
    multiCampusEnabled: false,
    denominationalModeEnabled: false,
    startedAt: "2026-03-19T00:00:00.000Z",
    renewsAt: "2026-04-19T00:00:00.000Z"
  },
  features: {
    organizationId: organization.id,
    modules: {
      core: { enabled: true, source: "plan" },
      visitors: { enabled: true, source: "plan" },
      groups: { enabled: true, source: "plan" },
      events: { enabled: true, source: "plan" },
      children: { enabled: false, source: "manual" },
      youth: { enabled: true, source: "addon" },
      volunteers: { enabled: true, source: "addon" },
      tribes: { enabled: true, source: "plan" },
      journeys: { enabled: true, source: "plan" },
      communication: { enabled: true, source: "addon" },
      finance: { enabled: true, source: "addon" },
      ai: { enabled: true, source: "trial", limits: { monthlySuggestions: 250 } }
    }
  }
};

const currentUser = {
  id: "user_admin_demo",
  organizationId: organization.id,
  email: "admin@alvochurch.app",
  roles: ["church_admin"],
  campusIds: [],
  isActive: true
} as const;

const recentPeople = [
  {
    id: "person_1",
    organizationId: organization.id,
    firstName: "Ana",
    lastName: "Silva",
    preferredName: "Ana",
    email: "ana@alvochurch.app",
    personType: "adult",
    memberStatus: "member",
    status: "active",
    primaryFamilyId: "family_1",
    tribePrimaryCode: "ASHER"
  },
  {
    id: "person_2",
    organizationId: organization.id,
    firstName: "Lucas",
    lastName: "Costa",
    email: "lucas@alvochurch.app",
    personType: "young_adult",
    memberStatus: "visitor",
    status: "active",
    tribePrimaryCode: "LEVI"
  },
  {
    id: "person_3",
    organizationId: organization.id,
    firstName: "Marina",
    lastName: "Souza",
    email: "marina@alvochurch.app",
    personType: "adult",
    memberStatus: "leader",
    status: "active",
    primaryFamilyId: "family_2",
    tribePrimaryCode: "JUDAH"
  }
] as const;

const families = [
  {
    family: {
      id: "family_1",
      organizationId: organization.id,
      familyName: "Silva",
      displayName: "Familia Silva",
      status: "active"
    },
    members: [
      {
        id: "family_member_1",
        organizationId: organization.id,
        familyId: "family_1",
        personId: "person_1",
        relationshipType: "self",
        isPrimaryContact: true,
        isFinancialResponsible: true,
        isLegalGuardian: true
      }
    ]
  },
  {
    family: {
      id: "family_2",
      organizationId: organization.id,
      familyName: "Souza",
      displayName: "Casa Souza",
      status: "active"
    },
    members: [
      {
        id: "family_member_2",
        organizationId: organization.id,
        familyId: "family_2",
        personId: "person_3",
        relationshipType: "self",
        isPrimaryContact: true,
        isFinancialResponsible: true,
        isLegalGuardian: true
      }
    ]
  }
] as const;

const activeJourneys = [
  {
    id: "journey_1",
    organizationId: organization.id,
    personId: "person_2",
    originChannel: "whatsapp",
    currentStage: "new_visitor",
    status: "active",
    assignedToUserId: currentUser.id,
    firstVisitDate: "2026-03-16",
    nextActionAt: "2026-03-18T19:00:00.000Z"
  }
] as const;

const followUps = [
  {
    id: "followup_1",
    organizationId: organization.id,
    personId: "person_2",
    visitorJourneyId: "journey_1",
    assignedToUserId: currentUser.id,
    title: "Enviar boas-vindas",
    type: "welcome_message",
    status: "open",
    dueAt: "2026-03-18T19:00:00.000Z"
  },
  {
    id: "followup_2",
    organizationId: organization.id,
    personId: "person_2",
    visitorJourneyId: "journey_1",
    assignedToUserId: currentUser.id,
    title: "Convidar para uma celula",
    type: "invite_to_group",
    status: "in_progress",
    dueAt: "2026-03-20T19:00:00.000Z"
  }
] as const;

const activeGroups = [
  {
    id: "group_1",
    organizationId: organization.id,
    name: "Celula Centro Norte",
    slug: "celula-centro-norte",
    type: "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 3,
    meetingTime: "19:30",
    city: "Belem",
    state: "PA",
    capacity: 18
  },
  {
    id: "group_2",
    organizationId: organization.id,
    name: "Classe de Integracao",
    slug: "classe-integracao",
    type: "class",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 0,
    meetingTime: "09:00",
    city: "Belem",
    state: "PA",
    capacity: 30
  }
] as const;

const upcomingMeetings = [
  {
    id: "meeting_1",
    organizationId: organization.id,
    groupId: "group_1",
    scheduledStartAt: "2026-03-18T22:30:00.000Z",
    scheduledEndAt: "2026-03-18T23:45:00.000Z",
    meetingStatus: "scheduled"
  }
] as const;

const latestAttendance = [
  {
    id: "attendance_1",
    organizationId: organization.id,
    groupId: "group_1",
    groupMeetingId: "meeting_1",
    personId: "person_1",
    attendanceStatus: "present"
  },
  {
    id: "attendance_2",
    organizationId: organization.id,
    groupId: "group_1",
    groupMeetingId: "meeting_1",
    personId: "person_2",
    attendanceStatus: "first_time_guest"
  }
] as const;

const publishedEvents = [
  {
    id: "event_1",
    organizationId: organization.id,
    name: "Classe de Integracao de Abril",
    slug: "classe-integracao-abril",
    type: "integration_class",
    status: "published",
    locationType: "onsite",
    startsAt: "2026-04-05T12:00:00.000Z",
    endsAt: "2026-04-05T14:00:00.000Z",
    capacity: 40,
    isPaid: false
  },
  {
    id: "event_2",
    organizationId: organization.id,
    name: "Conferencia de Lideranca",
    slug: "conferencia-lideranca",
    type: "conference",
    status: "published",
    locationType: "onsite",
    startsAt: "2026-05-10T12:00:00.000Z",
    endsAt: "2026-05-10T21:00:00.000Z",
    capacity: 120,
    isPaid: true
  }
] as const;

const latestRegistrations = [
  {
    id: "registration_1",
    organizationId: organization.id,
    eventId: "event_1",
    responsiblePersonId: "person_2",
    registrationCode: "ALVO-001",
    status: "confirmed",
    paymentStatus: "not_required",
    registeredAt: "2026-03-18T11:00:00.000Z"
  },
  {
    id: "registration_2",
    organizationId: organization.id,
    eventId: "event_2",
    responsiblePersonId: "person_3",
    registrationCode: "ALVO-002",
    status: "pending",
    paymentStatus: "pending",
    registeredAt: "2026-03-18T12:00:00.000Z"
  }
] as const;

const latestEventCheckIns = [
  {
    id: "event_checkin_1",
    organizationId: organization.id,
    eventId: "event_1",
    personId: "person_2",
    registrationPersonId: "registration_person_1",
    checkedInAt: "2026-03-18T12:30:00.000Z"
  }
] as const;

const journeyProfiles = [
  {
    id: "journey_profile_1",
    organizationId: organization.id,
    personId: "person_1",
    currentJourneyKind: "service",
    currentStage: "serving",
    progressPercent: 72,
    readinessLevel: "medium"
  },
  {
    id: "journey_profile_2",
    organizationId: organization.id,
    personId: "person_2",
    currentJourneyKind: "visitor",
    currentStage: "connecting",
    progressPercent: 34,
    readinessLevel: "low"
  }
] as const;

const activeMissions = [
  {
    id: "mission_1",
    organizationId: organization.id,
    journeyProfileId: "journey_profile_2",
    title: "Participar de uma celula pela primeira vez",
    kind: "suggested",
    status: "available"
  },
  {
    id: "mission_2",
    organizationId: organization.id,
    journeyProfileId: "journey_profile_1",
    title: "Concluir trilha de servico do ministerio",
    kind: "automatic",
    status: "available"
  }
] as const;

const earnedBadges = [
  {
    id: "member_badge_1",
    organizationId: organization.id,
    personId: "person_1",
    badgeId: "badge_primeiro_servico",
    awardedAt: "2026-03-10T12:00:00.000Z"
  },
  {
    id: "member_badge_2",
    organizationId: organization.id,
    personId: "person_2",
    badgeId: "badge_primeiro_passo",
    awardedAt: "2026-03-17T12:00:00.000Z"
  }
] as const;

const tribeDefinitions = [
  {
    id: "tribe_levi",
    organizationId: organization.id,
    code: "LEVI",
    name: "Levi",
    description: "Adoracao, culto e servico no ambiente espiritual.",
    ministrySummary: "Louvor, intercessao e suporte ao culto",
    isActive: true
  },
  {
    id: "tribe_judah",
    organizationId: organization.id,
    code: "JUDAH",
    name: "Juda",
    description: "Lideranca, governo e direcao ministerial.",
    ministrySummary: "Lideranca, supervisao e conducao",
    isActive: true
  },
  {
    id: "tribe_asher",
    organizationId: organization.id,
    code: "ASHER",
    name: "Aser",
    description: "Acolhimento, hospitalidade e cuidado pratico.",
    ministrySummary: "Recepcao, integracao e cuidado de familias",
    isActive: true
  }
] as const;

const latestTribeAssessments = [
  {
    id: "assessment_1",
    organizationId: organization.id,
    personId: "person_1",
    assessmentType: "initial",
    status: "validated",
    primaryTribeCode: "ASHER",
    secondaryTribeCode: "MANASSEH",
    confidenceLevel: "high",
    validationStatus: "validated",
    submittedAt: "2026-03-15T12:00:00.000Z"
  },
  {
    id: "assessment_2",
    organizationId: organization.id,
    personId: "person_2",
    assessmentType: "initial",
    status: "pending_validation",
    primaryTribeCode: "LEVI",
    secondaryTribeCode: "NAPHTALI",
    confidenceLevel: "medium",
    validationStatus: "pending",
    submittedAt: "2026-03-17T18:00:00.000Z"
  }
] as const;

const currentTribeProfiles = [
  {
    id: "tribe_profile_1",
    organizationId: organization.id,
    personId: "person_1",
    currentPrimaryTribeCode: "ASHER",
    currentSecondaryTribeCode: "MANASSEH",
    currentAssessmentId: "assessment_1",
    validationStatus: "validated",
    fitScore: 87,
    nextReviewDueAt: "2026-09-15T12:00:00.000Z"
  },
  {
    id: "tribe_profile_2",
    organizationId: organization.id,
    personId: "person_2",
    currentPrimaryTribeCode: "LEVI",
    currentSecondaryTribeCode: "NAPHTALI",
    currentAssessmentId: "assessment_2",
    validationStatus: "pending",
    fitScore: 62,
    nextReviewDueAt: "2026-09-17T12:00:00.000Z"
  }
] as const;

const reviewRequests = [
  {
    id: "review_request_1",
    organizationId: organization.id,
    personId: "person_2",
    requestedByUserId: currentUser.id,
    requestReasonType: "initial_error",
    requestStatus: "open",
    recommendedReviewType: "partial_review",
    openedAt: "2026-03-18T09:00:00.000Z",
    reviewDueAt: "2026-03-25T09:00:00.000Z"
  }
] as const;

const behaviorSignals = [
  {
    id: "signal_1",
    organizationId: organization.id,
    personId: "person_2",
    signalType: "journey_shift",
    suggestedTribeCode: "NAPHTALI",
    confidenceWeight: 0.72,
    observedAt: "2026-03-18T10:00:00.000Z"
  }
] as const;

const tribeAnswerPreview = [
  { questionCode: "q1", optionCode: "e" },
  { questionCode: "q2", optionCode: "d" },
  { questionCode: "q3", optionCode: "d" },
  { questionCode: "q4", optionCode: "e" },
  { questionCode: "q5", optionCode: "e" }
] as const;

const dashboard = createTribeReclassificationSnapshot({
  organization,
  currentUser,
  recentPeople: [...recentPeople],
  families: [...families],
  activeJourneys: [...activeJourneys],
  followUps: [...followUps],
  activeGroups: [...activeGroups],
  upcomingMeetings: [...upcomingMeetings],
  latestAttendance: [...latestAttendance],
  publishedEvents: [...publishedEvents],
  latestRegistrations: [...latestRegistrations],
  latestEventCheckIns: [...latestEventCheckIns],
  journeyProfiles: [...journeyProfiles],
  activeMissions: [...activeMissions],
  earnedBadges: [...earnedBadges],
  tribeDefinitions: [...tribeDefinitions],
  latestTribeAssessments: [...latestTribeAssessments],
  currentTribeProfiles: [...currentTribeProfiles],
  reviewRequests: [...reviewRequests],
  behaviorSignals: [...behaviorSignals]
});

const questionnaireResult = calculateTribeQuestionnaireResult(tribeAnswerPreview);

const personNames: Map<string, string> = new Map(
  recentPeople.map((person) => [
    person.id,
    getPersonDisplayName(person)
  ])
);

const weeklyMomentum = [
  { label: "Dom", value: 58 },
  { label: "Seg", value: 45 },
  { label: "Ter", value: 64 },
  { label: "Qua", value: 81 },
  { label: "Qui", value: 74 },
  { label: "Sex", value: 67 },
  { label: "Sab", value: 88 }
];

const navItems = [
  { label: "Resumo", icon: LayoutDashboard, href: "#overview" },
  { label: "Pessoas", icon: UsersRound, href: "#people" },
  { label: "Jornadas", icon: MapIcon, href: "#journeys" },
  { label: "Portaria", icon: ClipboardList, href: "#reception" },
  { label: "Celulas", icon: Waypoints, href: "#groups" },
  { label: "Eventos", icon: CalendarDays, href: "#events" },
  { label: "Comunicacao", icon: MessageSquareText, href: "#actions" },
  { label: "Transparencia", icon: Landmark, href: "#transparency" }
];

const kpis = [
  {
    label: "Pessoas acompanhadas",
    value: dashboard.recentPeople.length,
    detail: `${families.length} familias ativas`,
    tone: "blue",
    icon: UsersRound
  },
  {
    label: "Jornadas em movimento",
    value: dashboard.journeyProfiles.length,
    detail: `${dashboard.activeMissions.length} missoes sugeridas`,
    tone: "green",
    icon: Activity
  },
  {
    label: "Eventos publicados",
    value: dashboard.publishedEvents.length,
    detail: `${dashboard.latestRegistrations.length} inscricoes recentes`,
    tone: "orange",
    icon: CalendarDays
  },
  {
    label: "Alertas pastorais",
    value: dashboard.reviewRequests.length,
    detail: `${dashboard.behaviorSignals.length} sinal comportamental`,
    tone: "red",
    icon: Bell
  }
];

const moduleHighlights = [
  {
    label: "People OS",
    description: "Perfis, familias, visitantes e historico pastoral em uma linha do tempo unica.",
    icon: UsersRound,
    enabled: isModuleEnabled(tenantSettings.features, "core")
  },
  {
    label: "Engajamento",
    description: "Grupos, eventos, check-ins e follow-ups com leitura de saude da igreja.",
    icon: HeartHandshake,
    enabled:
      isModuleEnabled(tenantSettings.features, "groups") &&
      isModuleEnabled(tenantSettings.features, "events")
  },
  {
    label: "Jornadas",
    description: "Missoes, badges e progresso para transformar proximos passos em habito.",
    icon: Trophy,
    enabled: isModuleEnabled(tenantSettings.features, "journeys")
  },
  {
    label: "IA pastoral",
    description: "Sinais, reclassificacao de tribos e sugestoes de cuidado com limite controlado.",
    icon: Sparkles,
    enabled: isModuleEnabled(tenantSettings.features, "ai")
  },
  {
    label: "Portaria inteligente",
    description: "Cadastro de visitantes, jornada automatica, apresentacao e cumprimentos no culto.",
    icon: ClipboardList,
    enabled: isModuleEnabled(tenantSettings.features, "core")
  },
  {
    label: "Transparencia",
    description: "Prestacao de contas, arrecadacoes e demonstrativos publicaveis para a igreja.",
    icon: Landmark,
    enabled: isModuleEnabled(tenantSettings.features, "finance")
  }
];

type VisitorIntakeRecord = {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: string;
  nextStep: string;
  greeting: string;
};

const visitorIntakeRecords: VisitorIntakeRecord[] = [
  {
    id: "visitor_intake_1",
    name: "Rafael Lima",
    phone: "(91) 98888-1122",
    source: "Instagram",
    status: "Jornada criada",
    nextStep: "Enviar boas-vindas no WhatsApp",
    greeting: "Apresentar no final da celebracao"
  },
  {
    id: "visitor_intake_2",
    name: "Bianca Torres",
    phone: "(91) 97777-2211",
    source: "Convite de membro",
    status: "Aguardando acolhimento",
    nextStep: "Convidar para celula de jovens",
    greeting: "Cumprimentar na recepcao"
  }
];

const transparencySummary = {
  month: "Marco 2026",
  income: 42850,
  expenses: 31740,
  missions: 6200,
  balance: 11110,
  publicationStatus: "Rascunho interno"
};

const transparencyEntries = [
  {
    id: "finance_1",
    label: "Dizimos e ofertas",
    category: "Entrada",
    amount: 42850,
    note: "Cultos, Pix e envelopes"
  },
  {
    id: "finance_2",
    label: "Operacao da igreja",
    category: "Saida",
    amount: 18400,
    note: "Aluguel, energia, manutencao e equipe"
  },
  {
    id: "finance_3",
    label: "Missoes e acao social",
    category: "Destino",
    amount: 6200,
    note: "Cestas, visitas e apoio missionario"
  }
] as const;

const actionFeed = [
  ...followUps.map((task) => ({
    id: task.id,
    title: task.title,
    eyebrow: getFollowUpStatusLabel(task.status),
    detail: getPersonName(task.personId),
    icon: CheckCircle2,
    href: "#actions"
  })),
  ...dashboard.latestRegistrations.map((registration) => ({
    id: registration.id,
    title: registration.registrationCode,
    eyebrow: getRegistrationStatusLabel(registration.status),
    detail: `${registration.paymentStatus} em eventos`,
    icon: CalendarDays,
    href: "#events"
  })),
  ...dashboard.reviewRequests.map((request) => ({
    id: request.id,
    title: getPersonName(request.personId),
    eyebrow: getReviewRequestStatusLabel(request.requestStatus),
    detail: getRecommendedReviewTypeLabel(request.recommendedReviewType),
    icon: Target,
    href: "#tribes"
  }))
];

export default function HomePage() {
  const { configured, user } = useAppAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const [completedActionIds, setCompletedActionIds] = useState<string[]>([]);
  const [actionSyncStatus, setActionSyncStatus] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>("person_2");
  const [capturedVisitors, setCapturedVisitors] = useState([...visitorIntakeRecords]);
  const [visitorDraft, setVisitorDraft] = useState({
    name: "",
    phone: "",
    source: "WhatsApp"
  });
  const [receptionStatus, setReceptionStatus] = useState<string | null>(null);
  const [publishedTransparencyMonth, setPublishedTransparencyMonth] = useState<string | null>(null);
  const [transparencyStatus, setTransparencyStatus] = useState<string | null>(
    transparencySummary.publicationStatus
  );
  const firebaseConfig = useMemo(
    () =>
      createFirebaseWebRuntimeConfigFromEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      }),
    []
  );
  const strongestSignal = getStrongestBehaviorSignal(
    dashboard.behaviorSignals,
    dashboard.reviewRequests[0]?.personId ?? ""
  );
  const averageJourneyProgress = Math.round(
    dashboard.journeyProfiles.reduce((sum, profile) => sum + profile.progressPercent, 0) /
      Math.max(dashboard.journeyProfiles.length, 1)
  );
  const openActionFeed = actionFeed.filter(
    (item) => !completedActionIds.includes(item.id)
  );
  const selectedPerson = recentPeople.find((person) => person.id === selectedPersonId);
  const selectedJourneyProfile = dashboard.journeyProfiles.find(
    (profile) => profile.personId === selectedPersonId
  );
  const selectedTribeProfile = dashboard.currentTribeProfiles.find(
    (profile) => profile.personId === selectedPersonId
  );
  const selectedFollowUps = followUps.filter(
    (followUp) => followUp.personId === selectedPersonId
  );
  const searchResults = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    if (!normalizedQuery) {
      return [];
    }

    return [
      ...recentPeople.map((person) => ({
        id: person.id,
        type: "Pessoa",
        title: getPersonName(person.id),
        detail: person.email,
        href: "#people"
      })),
      ...capturedVisitors.map((visitor) => ({
        id: visitor.id,
        type: "Visitante",
        title: visitor.name,
        detail: `${visitor.source} - ${visitor.nextStep}`,
        href: "#reception"
      })),
      ...dashboard.activeGroups.map((group) => ({
        id: group.id,
        type: "Celula",
        title: group.name,
        detail: `${getGroupTypeLabel(group.type)} · ${group.meetingTime}`,
        href: "#groups"
      })),
      ...dashboard.publishedEvents.map((event) => ({
        id: event.id,
        type: "Evento",
        title: event.name,
        detail: `${getEventTypeLabel(event.type)} · ${event.capacity} vagas`,
        href: "#events"
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
  }, [query, completedActionIds, openActionFeed, capturedVisitors]);

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
      greeting: "Incluir nos cumprimentos da celebracao"
    };

    setCapturedVisitors((currentVisitors) => [
      localVisitor,
      ...currentVisitors
    ]);
    setVisitorDraft({ name: "", phone: "", source: "WhatsApp" });
    setReceptionStatus("Visitante capturado localmente. Preparando jornada e comunicacao.");

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setReceptionStatus(
        "Visitante capturado localmente. Conecte o Firebase para criar pessoa, jornada e follow-ups."
      );
      return;
    }

    try {
      await createVisitorIntakeWorkflow(
        firebaseConfig,
        { organizationId: organization.id },
        {
          capturedByUserId: user.uid,
          name,
          phone,
          source: localVisitor.source
        }
      );
      setReceptionStatus("Visitante salvo no Firestore com jornada e follow-ups criados.");
    } catch (error) {
      setReceptionStatus(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o visitante no Firestore."
      );
    }
  }

  async function handlePublishTransparencyReport() {
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
        { organizationId: organization.id },
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
      setTransparencyStatus(`Demonstrativo de ${transparencySummary.month} publicado no Firestore.`);
    } catch (error) {
      setTransparencyStatus(
        error instanceof Error
          ? error.message
          : "Nao foi possivel publicar o demonstrativo no Firestore."
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
        { organizationId: organization.id },
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
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o follow-up no Firestore."
      );
    }
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <BrandLogo compact size={42} />
        <nav className="app-nav" aria-label="Navegacao principal">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={
                activeSection === item.href.slice(1) ? "app-nav-item is-active" : "app-nav-item"
              }
              onClick={() => setActiveSection(item.href.slice(1))}
            >
              <item.icon size={18} strokeWidth={2.2} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-status">
          <ShieldCheck size={18} />
          <span>
            {getPlanTierLabel(tenantSettings.subscription.planTier)} ·{" "}
            {getBrandModeLabel(tenantSettings.branding.brandMode)}
          </span>
        </div>
      </aside>

      <section className="app-workspace" id="overview">
        <header className="topbar">
          <div>
            <p className="eyebrow">Painel operacional</p>
            <h1>Bom dia, Getro Church.</h1>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={16} />
              <input
                aria-label="Buscar pessoas, grupos e eventos"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar pessoas, grupos e eventos"
                value={query}
              />
              {query ? (
                <div className="search-results">
                  {searchResults.length ? (
                    searchResults.slice(0, 6).map((result) => (
                      <a
                        href={result.href}
                        key={`${result.type}-${result.id}`}
                        onClick={(event) => {
                          if (result.type === "Pessoa") {
                            event.preventDefault();
                            openPersonProfile(result.id);
                            return;
                          }

                          setActiveSection(result.href.slice(1));
                        }}
                      >
                        <span>{result.type}</span>
                        <strong>{result.title}</strong>
                        <small>{result.detail}</small>
                      </a>
                    ))
                  ) : (
                    <p>Nenhum resultado encontrado.</p>
                  )}
                </div>
              ) : null}
            </div>
            <button
              aria-expanded={notificationsOpen}
              className="icon-button"
              aria-label="Notificacoes"
              onClick={() => setNotificationsOpen((isOpen) => !isOpen)}
            >
              <Bell size={18} />
            </button>
            {notificationsOpen ? (
              <div className="notification-popover">
                <strong>Notificacoes</strong>
                <p>{openActionFeed.length} acao(oes) aguardando retorno pastoral.</p>
                <p>{dashboard.reviewRequests.length} revisao de tribo em aberto.</p>
              </div>
            ) : null}
          </div>
        </header>

        <section className="hero-grid">
          <article className="mission-board">
            <div className="mission-copy">
              <p className="eyebrow">Proxima melhor acao</p>
              <h2>Acompanhar Lucas antes da proxima reuniao.</h2>
              <p>
                Visitante vindo pelo WhatsApp, com convite de celula em andamento e
                sinal de reavaliacao ministerial.
              </p>
              <div className="mission-actions">
                <button
                  className="primary-button"
                  onClick={() => void handleCompleteAction("followup_1")}
                >
                  <CheckCircle2 size={18} />
                  {completedActionIds.includes("followup_1")
                    ? "Follow-up concluido"
                    : "Concluir follow-up"}
                </button>
                <a
                  className="ghost-button"
                  href="#journeys"
                  onClick={() => setActiveSection("journeys")}
                >
                  Ver jornada
                  <ChevronRight size={17} />
                </a>
              </div>
            </div>
            <div className="progress-stack" aria-label="Progresso da jornada">
              <div className="streak-badge">
                <Flame size={20} />
                <span>7 dias de cuidado ativo</span>
              </div>
              <div className="progress-ring" style={{ "--progress": "72%" } as CSSProperties}>
                <span>{averageJourneyProgress}%</span>
              </div>
              <p>Media das jornadas abertas</p>
            </div>
          </article>

          <article className="momentum-card">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Momentum</p>
                <h2>Semana da igreja</h2>
              </div>
              <Activity size={20} />
            </div>
            <div className="bar-chart" aria-label="Atividade semanal">
              {weeklyMomentum.map((day) => (
                <div key={day.label} className="bar-slot">
                  <span style={{ height: `${day.value}%` }} />
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
            <p className="microcopy">Pico de engajamento no sabado, com eventos e check-ins ativos.</p>
          </article>
        </section>

        <section className="kpi-grid" aria-label="Indicadores principais">
          {kpis.map((kpi) => (
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

        <section className="content-grid">
          <article className="panel span-2" id="people">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Pessoas e jornadas</p>
                <h2>Progresso pastoral</h2>
              </div>
              <span className="soft-pill">{canManagePeople(currentUser) ? "Admin" : "Leitura"}</span>
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
                {getEnabledModuleCount(tenantSettings.features)} ativos
              </span>
            </div>
            <div className="module-list">
              {moduleHighlights.map((module) => (
                <div key={module.label} className="module-item">
                  <module.icon size={18} />
                  <div>
                    <strong>{module.label}</strong>
                    <p>{module.description}</p>
                  </div>
                  <span className={module.enabled ? "status-dot on" : "status-dot"} />
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
              {dashboard.activeGroups.map((group) => (
                <div key={group.id} className="ops-card">
                  <Waypoints size={18} />
                  <strong>{group.name}</strong>
                  <p>{getGroupTypeLabel(group.type)} · {group.meetingTime}</p>
                </div>
              ))}
              {dashboard.publishedEvents.map((event) => (
                <div
                  key={event.id}
                  className="ops-card"
                  id={event.id === dashboard.publishedEvents[0]?.id ? "events" : undefined}
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
                <p className="eyebrow">Portaria inteligente</p>
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
            <div className="tribe-grid">
              <div className="tribe-score">
                <Target size={24} />
                <span>Tribo principal sugerida</span>
                <strong>{getTribeDisplayLabel(questionnaireResult.primaryTribeCode)}</strong>
                <p>
                  Confianca {questionnaireResult.confidenceLevel}; secundaria{" "}
                  {questionnaireResult.secondaryTribeCode
                    ? getTribeDisplayLabel(questionnaireResult.secondaryTribeCode)
                    : "sem sugestao"}.
                </p>
              </div>
              <div className="tribe-members">
                {dashboard.currentTribeProfiles.map((profile) => (
                  <div key={profile.id} className="tribe-member">
                    <div>
                      <strong>{getPersonName(profile.personId)}</strong>
                      <p>
                        {profile.currentPrimaryTribeCode
                          ? getTribeDisplayLabel(profile.currentPrimaryTribeCode)
                          : "Sem tribo"}{" "}
                        · {getTribeValidationLabel(profile.validationStatus)}
                      </p>
                    </div>
                    <span>{profile.fitScore}</span>
                    <small>
                      {shouldRecommendTribeReview(profile)
                        ? getRecommendedReviewTypeLabel(getRecommendedReviewType(profile))
                        : "estavel"}
                    </small>
                  </div>
                ))}
              </div>
              <div className="signal-card">
                <Sparkles size={20} />
                <strong>Sinal de IA</strong>
                <p>
                  {strongestSignal?.suggestedTribeCode
                    ? `Sinal forte para ${getTribeDisplayLabel(strongestSignal.suggestedTribeCode)}.`
                    : "Nenhum sinal forte detectado."}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="integration-strip" id="billing">
          <AuthStatusCard />
          <AuthPanel />
          <LiveTenantData organizationId={organization.id} />
        </section>

        <LiveOperations organizationId={organization.id} />
        <TenantAdminSettings />
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
    </main>
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
  return personNames.get(personId) ?? personId;
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

function getPersonDisplayName(person: (typeof recentPeople)[number]) {
  const preferredName = "preferredName" in person ? person.preferredName : undefined;

  return preferredName ?? `${person.firstName} ${"lastName" in person ? person.lastName : ""}`.trim();
}

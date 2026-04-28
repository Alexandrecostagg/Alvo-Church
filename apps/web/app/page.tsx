"use client";

import Link from "next/link";
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
    mobilePhone: "+5591991111111",
    whatsappPhone: "+5591991111111",
    birthDate: "1987-06-14",
    cpf: "123.456.789-10",
    occupation: "Professora",
    educationLevel: "undergraduate",
    householdIncomeRange: "three_to_5_minimum_wages",
    address: {
      postalCode: "66035-170",
      street: "Travessa Padre Eutiquio",
      number: "1220",
      district: "Batista Campos",
      city: "Belem",
      state: "PA",
      countryCode: "BR"
    },
    consentLgpdAt: "2026-03-16T10:00:00.000Z",
    memberCardCode: "GETRO-ANA-001",
    partnerBenefitsEnabled: true,
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
    primaryFamilyId: undefined,
    mobilePhone: "+5591992222222",
    whatsappPhone: "+5591992222222",
    birthDate: "2001-11-03",
    cpf: undefined,
    occupation: "Estudante",
    educationLevel: "technical",
    householdIncomeRange: "one_to_3_minimum_wages",
    address: {
      postalCode: "66033-000",
      street: "Avenida Governador Jose Malcher",
      number: "880",
      district: "Nazare",
      city: "Belem",
      state: "PA",
      countryCode: "BR"
    },
    consentLgpdAt: "2026-03-18T19:00:00.000Z",
    memberCardCode: "GETRO-LUC-002",
    partnerBenefitsEnabled: false,
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
    mobilePhone: "+5591993333333",
    whatsappPhone: "+5591993333333",
    birthDate: "1992-02-22",
    cpf: "987.654.321-00",
    occupation: "Empreendedora",
    educationLevel: "postgraduate",
    householdIncomeRange: "five_to_10_minimum_wages",
    address: {
      postalCode: "66055-260",
      street: "Rua dos Mundurucus",
      number: "2400",
      complement: "Apto 801",
      district: "Cremacao",
      city: "Belem",
      state: "PA",
      countryCode: "BR"
    },
    consentLgpdAt: "2026-03-17T14:30:00.000Z",
    memberCardCode: "GETRO-MAR-003",
    partnerBenefitsEnabled: true,
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
      status: "active",
      incomeRange: "three_to_5_minimum_wages",
      address: {
        postalCode: "66035-170",
        street: "Travessa Padre Eutiquio",
        number: "1220",
        district: "Batista Campos",
        city: "Belem",
        state: "PA",
        countryCode: "BR"
      },
      notes: "Familia com forte envolvimento em acolhimento e integracao."
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
      status: "active",
      incomeRange: "five_to_10_minimum_wages",
      address: {
        postalCode: "66055-260",
        street: "Rua dos Mundurucus",
        number: "2400",
        complement: "Apto 801",
        district: "Cremacao",
        city: "Belem",
        state: "PA",
        countryCode: "BR"
      },
      notes: "Casa com perfil de lideranca e mentoria de novos membros."
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

const familyPanorama = families.map((familySnapshot) => {
  const members = familySnapshot.members
    .map((member) => recentPeople.find((person) => person.id === member.personId))
    .filter((person): person is (typeof recentPeople)[number] => Boolean(person));
  const neighborhood = familySnapshot.family.address?.district ?? "Sem bairro";
  const visitorLinks = activeJourneys.filter((journey) => {
    const person = recentPeople.find((item) => item.id === journey.personId);

    return person?.primaryFamilyId === familySnapshot.family.id || person?.memberStatus === "visitor";
  });

  return {
    ...familySnapshot,
    members,
    neighborhood,
    visitorLinks,
    incomeRange: familySnapshot.family.incomeRange ?? "not_informed"
  };
});

const neighborhoodDistribution = familyPanorama.reduce<Array<{ label: string; value: number }>>(
  (acc, familySnapshot) => {
    const current = acc.find((item) => item.label === familySnapshot.neighborhood);

    if (current) {
      current.value += familySnapshot.members.length;
    } else {
      acc.push({ label: familySnapshot.neighborhood, value: familySnapshot.members.length });
    }

    return acc;
  },
  []
);

const familyInsightMetrics = [
  {
    label: "Familias mapeadas",
    value: familyPanorama.length,
    detail: `${recentPeople.length} pessoas com perfil pastoral`
  },
  {
    label: "Com endereco",
    value: recentPeople.filter((person) => person.address?.district).length,
    detail: "base para mapa por bairro"
  },
  {
    label: "Com consentimento",
    value: recentPeople.filter((person) => person.consentLgpdAt).length,
    detail: "LGPD antes de dados sensiveis"
  },
  {
    label: "Getro Pass ativo",
    value: recentPeople.filter((person) => person.partnerBenefitsEnabled).length,
    detail: "validacao externa sem expor CPF"
  }
];

const memberPassPreview = recentPeople
  .filter((person) => person.memberCardCode)
  .map((person) => ({
    id: person.id,
    name: getPersonDisplayName(person),
    code: person.memberCardCode ?? "",
    active: Boolean(person.partnerBenefitsEnabled && String(person.memberStatus) !== "visitor"),
    partnerScope: person.partnerBenefitsEnabled
      ? "Farmacia parceira: desconto validado por QR"
      : "Aguardando consentimento para beneficios"
  }));

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
  { label: "Pessoas", icon: UsersRound, href: "/members" },
  { label: "Familias", icon: HeartHandshake, href: "#families" },
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
    label: "Pessoas e familias",
    description: "Base unica com dados cadastrais, casas, lideres, visitantes e vinculos familiares.",
    href: "/members",
    icon: UsersRound,
    enabled: isModuleEnabled(tenantSettings.features, "core"),
    action: "Ver base"
  },
  {
    label: "Portaria",
    description: "Entrada do visitante que cria pessoa, jornada, comunicacao e roteiro de acolhimento.",
    href: "#reception",
    icon: ClipboardList,
    enabled: isModuleEnabled(tenantSettings.features, "visitors"),
    action: "Capturar visitante"
  },
  {
    label: "Jornadas",
    description: "Proximos passos, missoes e progresso para cada pessoa acompanhada.",
    href: "#journeys",
    icon: Trophy,
    enabled: isModuleEnabled(tenantSettings.features, "journeys"),
    action: "Ver progresso"
  },
  {
    label: "Celulas e eventos",
    description: "Convites, presencas, check-ins e integracao pratica na agenda da igreja.",
    href: "#groups",
    icon: Waypoints,
    enabled:
      isModuleEnabled(tenantSettings.features, "groups") &&
      isModuleEnabled(tenantSettings.features, "events"),
    action: "Organizar agenda"
  },
  {
    label: "Comunicacao",
    description: "Fila viva para WhatsApp, convites, lembretes e retorno pastoral.",
    href: "#actions",
    icon: MessageSquareText,
    enabled: isModuleEnabled(tenantSettings.features, "communication"),
    action: "Ver fila"
  },
  {
    label: "Transparencia",
    description: "Prestacao de contas, arrecadacoes e demonstrativos publicaveis para a igreja.",
    href: "#transparency",
    icon: Landmark,
    enabled: isModuleEnabled(tenantSettings.features, "finance"),
    action: "Publicar contas"
  },
  {
    label: "SaaS e contratos",
    description: "Onboarding de instituicoes contratantes com tenant, plano, marca e modulos.",
    href: "/saas/organizations/new",
    icon: Target,
    enabled: true,
    action: "Cadastrar instituicao"
  }
];

type VisitorIntakeRecord = {
  communicationChannel: string;
  communicationStatus: string;
  greeting: string;
  id: string;
  name: string;
  nextStep: string;
  phone: string;
  presentationStatus: string;
  source: string;
  status: string;
};

const visitorIntakeRecords: VisitorIntakeRecord[] = [
  {
    id: "visitor_intake_1",
    name: "Rafael Lima",
    phone: "(91) 98888-1122",
    source: "Instagram",
    status: "Jornada criada",
    nextStep: "Enviar boas-vindas no WhatsApp",
    greeting: "Apresentar no final da celebracao",
    communicationChannel: "WhatsApp",
    communicationStatus: "Pendente",
    presentationStatus: "Na lista"
  },
  {
    id: "visitor_intake_2",
    name: "Bianca Torres",
    phone: "(91) 97777-2211",
    source: "Convite de membro",
    status: "Aguardando acolhimento",
    nextStep: "Convidar para celula de jovens",
    greeting: "Cumprimentar na recepcao",
    communicationChannel: "WhatsApp",
    communicationStatus: "Pendente",
    presentationStatus: "A confirmar"
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

const partnerOrganizations = [
  {
    id: "partner_1",
    organizationId: organization.id,
    name: "Farmacia Vida Plena",
    category: "health",
    status: "active",
    contactName: "Renata Alves",
    city: "Belem",
    state: "PA"
  },
  {
    id: "partner_2",
    organizationId: organization.id,
    name: "Escola de Musica Harmonia",
    category: "education",
    status: "active",
    contactName: "Daniel Rocha",
    city: "Belem",
    state: "PA"
  }
] as const;

const partnerBenefits = [
  {
    id: "benefit_1",
    organizationId: organization.id,
    partnerId: "partner_1",
    title: "Desconto em medicamentos",
    description: "Validacao de membro ativo para desconto em itens elegiveis.",
    category: "health",
    status: "active",
    discountLabel: "8% a 15%",
    verificationMode: "qr_code",
    privacyNotes: "Parceiro recebe somente status de elegibilidade e primeiro nome."
  },
  {
    id: "benefit_2",
    organizationId: organization.id,
    partnerId: "partner_2",
    title: "Bolsa em aula experimental",
    description: "Primeira mensalidade com desconto para membros e filhos cadastrados.",
    category: "education",
    status: "active",
    discountLabel: "20%",
    verificationMode: "member_code",
    privacyNotes: "Parceiro nao acessa CPF, renda, endereco ou historico pastoral."
  }
] as const;

const memberBenefitValidations = [
  {
    id: "validation_1",
    organizationId: organization.id,
    partnerId: "partner_1",
    benefitId: "benefit_1",
    personId: "person_1",
    memberCardCode: "GETRO-ANA-001",
    validationStatus: "approved",
    validatedAt: "2026-04-20T16:24:00.000Z",
    exposedFields: ["firstName", "memberActive", "benefitEligible"]
  }
] as const;

const partnerBenefitPreview = partnerBenefits.map((benefit) => ({
  ...benefit,
  partner: partnerOrganizations.find((partner) => partner.id === benefit.partnerId),
  validations: memberBenefitValidations.filter(
    (validation) => validation.benefitId === benefit.id
  )
}));

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
  const [preparedCommunicationIds, setPreparedCommunicationIds] = useState<string[]>([]);
  const [greetedVisitorIds, setGreetedVisitorIds] = useState<string[]>([]);
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
  const selectedFamilySnapshot = selectedPerson?.primaryFamilyId
    ? familyPanorama.find((familySnapshot) => familySnapshot.family.id === selectedPerson.primaryFamilyId)
    : null;
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
  const careWorkflowSteps = [
    {
      label: "Capturar",
      title: "Portaria registra a pessoa",
      description: "O visitante entra uma vez e ja nasce como pessoa, jornada e tarefa de cuidado.",
      href: "#reception",
      icon: ClipboardList,
      metric: `${capturedVisitors.length} visitantes na fila`
    },
    {
      label: "Entender",
      title: "Cadastro vira panorama familiar",
      description: "Dados sensiveis ficam protegidos, mas lideres enxergam familia, bairro e contexto.",
      href: "#families",
      icon: UsersRound,
      metric: `${families.length} familias mapeadas`
    },
    {
      label: "Cuidar",
      title: "Jornada sugere o proximo passo",
      description: "Follow-ups, missoes e sinais pastorais deixam claro quem precisa de atencao.",
      href: "#journeys",
      icon: MapIcon,
      metric: `${openActionFeed.length} acoes abertas`
    },
    {
      label: "Integrar",
      title: "Grupos e eventos fecham o ciclo",
      description: "Convites, presencas e check-ins mostram se a pessoa saiu da visita para comunidade.",
      href: "#groups",
      icon: Waypoints,
      metric: `${latestAttendance.length} presencas recentes`
    },
    {
      label: "Fortalecer",
      title: "Getro Pass e comunicacao ampliam valor",
      description: "Membro se identifica fora da igreja e a equipe mantem contato sem expor dados privados.",
      href: "#actions",
      icon: ShieldCheck,
      metric: `${partnerBenefits.length} beneficios`
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
              onClick={() => {
                if (item.href.startsWith("#")) {
                  setActiveSection(item.href.slice(1));
                }
              }}
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

        <section className="workflow-panel" aria-label="Mapa da jornada operacional">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Como o Getro conecta tudo</p>
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
                onClick={() => setActiveSection(step.href.slice(1))}
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
                <span className="soft-pill">{canManagePeople(currentUser) ? "Admin" : "Leitura"}</span>
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
          <div className="family-metric">
            <span>Parceiros ativos</span>
            <strong>{partnerOrganizations.length}</strong>
            <p>{partnerBenefits.length} beneficios publicados no Getro Pass</p>
          </div>
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
                {getEnabledModuleCount(tenantSettings.features)} ativos
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
                <p className="eyebrow">Getro Pass</p>
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
              {partnerBenefitPreview.map((benefit) => (
                <div key={benefit.id}>
                  <strong>{benefit.title}</strong>
                  <code>{benefit.partner?.name ?? "Parceiro nao vinculado"}</code>
                  <span className="pass-status on">
                    {getPartnerBenefitCategoryLabel(benefit.category)} · {benefit.discountLabel}
                  </span>
                  <p>
                    {benefit.description} {benefit.validations.length} validacao(oes) recente(s).
                  </p>
                  <small>{benefit.privacyNotes}</small>
                </div>
              ))}
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
            <h3>Getro Pass</h3>
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

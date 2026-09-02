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
  ShoppingBag,
  Sparkles,
  Smartphone,
  Target,
  Trophy,
  UserPlus,
  UsersRound,
  Waypoints,
} from "lucide-react";
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
  tribeQuestionnaireV1,
} from "@alvo/domain";
import type {
  OrganizationSettingsSnapshot,
  TribeCode,
  PartnerOrganization,
  PartnerBenefit,
} from "@alvo/types";

function getPersonDisplayName(person: any) {
  return person.firstName + " " + person.lastName;
}
function getPersonName(personId: string) {
  return personId;
}
function normalizeSearch(query: string) {
  return query.toLowerCase();
}

export const organization = {
  id: "org_alvo_demo",
  name: "Plataforma Esdras",
  slug: "esdras-church",
  status: "active",
  timezone: "America/Belem",
  locale: "pt-BR",
  countryCode: "BR",
} as const;

export const tenantSettings: OrganizationSettingsSnapshot = {
  branding: {
    organizationId: organization.id,
    brandMode: "co_branded",
    publicProductName: "Plataforma Esdras",
    publicShortName: "Esdras",
    primaryColor: "#d27836",
    secondaryColor: "#1c2433",
    accentColor: "#e8dcc7",
    surfaceColor: "#f7f3ea",
    textColor: "#1c2433",
    showPoweredByAlvo: true,
    poweredByLabel: "by Esdras",
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
    renewsAt: "2026-04-19T00:00:00.000Z",
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
      marketplace: { enabled: true, source: "addon" },
      giving: { enabled: true, source: "addon" },
      publicForms: { enabled: true, source: "plan" },
      finance: { enabled: true, source: "addon" },
      ai: {
        enabled: true,
        source: "trial",
        limits: { monthlySuggestions: 250 },
      },
    },
  },
};

export const currentUser = {
  id: "user_admin_demo",
  organizationId: organization.id,
  email: "admin@plataformaesdras.com.br",
  roles: ["church_admin"],
  campusIds: [],
  isActive: true,
} as const;

export const recentPeople = [
  {
    id: "person_1",
    organizationId: organization.id,
    firstName: "Ana",
    lastName: "Silva",
    preferredName: "Ana",
    email: "ana@plataformaesdras.com.br",
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
      countryCode: "BR",
    },
    consentLgpdAt: "2026-03-16T10:00:00.000Z",
    memberCardCode: "GETRO-ANA-001",
    partnerBenefitsEnabled: true,
    personType: "adult",
    memberStatus: "member",
    status: "active",
    primaryFamilyId: "family_1",
    tribePrimaryCode: "ASHER",
  },
  {
    id: "person_2",
    organizationId: organization.id,
    firstName: "Lucas",
    lastName: "Costa",
    email: "lucas@plataformaesdras.com.br",
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
      countryCode: "BR",
    },
    consentLgpdAt: "2026-03-18T19:00:00.000Z",
    memberCardCode: "GETRO-LUC-002",
    partnerBenefitsEnabled: false,
    personType: "young_adult",
    memberStatus: "visitor",
    status: "active",
    tribePrimaryCode: "LEVI",
  },
  {
    id: "person_3",
    organizationId: organization.id,
    firstName: "Marina",
    lastName: "Souza",
    email: "marina@plataformaesdras.com.br",
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
      countryCode: "BR",
    },
    consentLgpdAt: "2026-03-17T14:30:00.000Z",
    memberCardCode: "GETRO-MAR-003",
    partnerBenefitsEnabled: true,
    personType: "adult",
    memberStatus: "leader",
    status: "active",
    primaryFamilyId: "family_2",
    tribePrimaryCode: "JUDAH",
  },
] as const;

export const families = [
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
        countryCode: "BR",
      },
      notes: "Familia com forte envolvimento em acolhimento e integracao.",
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
        isLegalGuardian: true,
      },
    ],
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
        countryCode: "BR",
      },
      notes: "Casa com perfil de lideranca e mentoria de novos membros.",
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
        isLegalGuardian: true,
      },
    ],
  },
] as const;

export const activeJourneys = [
  {
    id: "journey_1",
    organizationId: organization.id,
    personId: "person_2",
    originChannel: "whatsapp",
    currentStage: "new_visitor",
    status: "active",
    assignedToUserId: currentUser.id,
    firstVisitDate: "2026-03-16",
    nextActionAt: "2026-03-18T19:00:00.000Z",
  },
] as const;

export const followUps = [
  {
    id: "followup_1",
    organizationId: organization.id,
    personId: "person_2",
    visitorJourneyId: "journey_1",
    assignedToUserId: currentUser.id,
    title: "Enviar boas-vindas",
    type: "welcome_message",
    status: "open",
    dueAt: "2026-03-18T19:00:00.000Z",
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
    dueAt: "2026-03-20T19:00:00.000Z",
  },
] as const;

export const activeGroups = [
  {
    id: "group_1",
    organizationId: organization.id,
    name: "Célula Centro Norte",
    slug: "celula-centro-norte",
    type: "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 3,
    meetingTime: "19:30",
    city: "Belém",
    state: "PA",
    capacity: 18,
    tribeCode: "ASHER" as TribeCode,
  },
  {
    id: "group_2",
    organizationId: organization.id,
    name: "Classe de Integração",
    slug: "classe-integracao",
    type: "class",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 0,
    meetingTime: "09:00",
    city: "Belém",
    state: "PA",
    capacity: 30,
    tribeCode: "LEVI" as TribeCode,
  },
  {
    id: "group_3",
    organizationId: organization.id,
    name: "Célula Nazaré",
    slug: "celula-nazare",
    type: "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 5,
    meetingTime: "19:00",
    city: "Belém",
    state: "PA",
    capacity: 15,
    tribeCode: "JUDAH" as TribeCode,
  },
  {
    id: "group_4",
    organizationId: organization.id,
    name: "Célula Cremação",
    slug: "celula-cremacao",
    type: "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 2,
    meetingTime: "20:00",
    city: "Belém",
    state: "PA",
    capacity: 12,
    tribeCode: "ISSACHAR" as TribeCode,
  },
  {
    id: "group_5",
    organizationId: organization.id,
    name: "Grupo de Intercessão",
    slug: "grupo-intercessao",
    type: "small_group",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 1,
    meetingTime: "07:00",
    city: "Belém",
    state: "PA",
    capacity: 20,
    tribeCode: "LEVI" as TribeCode,
  },
  {
    id: "group_6",
    organizationId: organization.id,
    name: "Célula Tapanã",
    slug: "celula-tapana",
    type: "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 4,
    meetingTime: "19:30",
    city: "Belém",
    state: "PA",
    capacity: 14,
    tribeCode: "JOSEPH" as TribeCode,
  },
  {
    id: "group_7",
    organizationId: organization.id,
    name: "Ministério de Dança",
    slug: "ministerio-danca",
    type: "ministry_team",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 6,
    meetingTime: "09:00",
    city: "Belém",
    state: "PA",
    capacity: 25,
    tribeCode: "NAPHTALI" as TribeCode,
  },
  {
    id: "group_8",
    organizationId: organization.id,
    name: "Célula Sacramenta",
    slug: "celula-sacramenta",
    type: "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 3,
    meetingTime: "19:00",
    city: "Belém",
    state: "PA",
    capacity: 16,
    tribeCode: "ZEBULUN" as TribeCode,
  },
  {
    id: "group_9",
    organizationId: organization.id,
    name: "Equipe de Adoração",
    slug: "equipe-adoracao",
    type: "ministry_team",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 6,
    meetingTime: "14:00",
    city: "Belém",
    state: "PA",
    capacity: 30,
    tribeCode: "LEVI" as TribeCode,
  },
  {
    id: "group_10",
    organizationId: organization.id,
    name: "Célula Jurunas",
    slug: "celula-jurunas",
    type: "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 2,
    meetingTime: "19:30",
    city: "Belém",
    state: "PA",
    capacity: 12,
    tribeCode: "GAD" as TribeCode,
  },
  {
    id: "group_11",
    organizationId: organization.id,
    name: "Grupo de Negócios",
    slug: "grupo-negocios",
    type: "small_group",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 5,
    meetingTime: "07:00",
    city: "Belém",
    state: "PA",
    capacity: 20,
    tribeCode: "ZEBULUN" as TribeCode,
  },
  {
    id: "group_12",
    organizationId: organization.id,
    name: "Célula Bengui",
    slug: "celula-bengui",
    type: "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 4,
    meetingTime: "20:00",
    city: "Belém",
    state: "PA",
    capacity: 15,
    tribeCode: "MANASSEH" as TribeCode,
  },
  {
    id: "group_13",
    organizationId: organization.id,
    name: "Ministério Infantil",
    slug: "ministerio-infantil",
    type: "ministry_team",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 0,
    meetingTime: "09:00",
    city: "Belém",
    state: "PA",
    capacity: 40,
    tribeCode: "ASHER" as TribeCode,
  },
  {
    id: "group_14",
    organizationId: organization.id,
    name: "Célula Pedreira",
    slug: "celula-pedreira",
    type: "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 3,
    meetingTime: "19:30",
    city: "Belém",
    state: "PA",
    capacity: 14,
    tribeCode: "EPHRAIM" as TribeCode,
  },
  {
    id: "group_15",
    organizationId: organization.id,
    name: "Grupo de Jovens",
    slug: "grupo-jovens",
    type: "youth_group",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 6,
    meetingTime: "16:00",
    city: "Belém",
    state: "PA",
    capacity: 50,
    tribeCode: "BENJAMIN" as TribeCode,
  },
  {
    id: "group_16",
    organizationId: organization.id,
    name: "Célula Entroncamento",
    slug: "celula-entroncamento",
    type: "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 1,
    meetingTime: "19:00",
    city: "Belém",
    state: "PA",
    capacity: 12,
    tribeCode: "REUBEN" as TribeCode,
  },
  {
    id: "group_17",
    organizationId: organization.id,
    name: "Equipe de Comunicação",
    slug: "equipe-comunicacao",
    type: "ministry_team",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 4,
    meetingTime: "19:00",
    city: "Belém",
    state: "PA",
    capacity: 15,
    tribeCode: "ISSACHAR" as TribeCode,
  },
  {
    id: "group_18",
    organizationId: organization.id,
    name: "Célula Marco",
    slug: "celula-marco",
    type: "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: 2,
    meetingTime: "20:00",
    city: "Belém",
    state: "PA",
    capacity: 16,
    tribeCode: "JUDAH" as TribeCode,
  },
] as const;

export const upcomingMeetings = [
  {
    id: "meeting_1",
    organizationId: organization.id,
    groupId: "group_1",
    scheduledStartAt: "2026-03-18T22:30:00.000Z",
    scheduledEndAt: "2026-03-18T23:45:00.000Z",
    meetingStatus: "scheduled",
  },
] as const;

export const latestAttendance = [
  {
    id: "attendance_1",
    organizationId: organization.id,
    groupId: "group_1",
    groupMeetingId: "meeting_1",
    personId: "person_1",
    attendanceStatus: "present",
  },
  {
    id: "attendance_2",
    organizationId: organization.id,
    groupId: "group_1",
    groupMeetingId: "meeting_1",
    personId: "person_2",
    attendanceStatus: "first_time_guest",
  },
] as const;

export const publishedEvents = [
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
    isPaid: false,
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
    isPaid: true,
  },
] as const;

export const latestRegistrations = [
  {
    id: "registration_1",
    organizationId: organization.id,
    eventId: "event_1",
    responsiblePersonId: "person_2",
    registrationCode: "ESD-001",
    status: "confirmed",
    paymentStatus: "not_required",
    registeredAt: "2026-03-18T11:00:00.000Z",
  },
  {
    id: "registration_2",
    organizationId: organization.id,
    eventId: "event_2",
    responsiblePersonId: "person_3",
    registrationCode: "ESD-002",
    status: "pending",
    paymentStatus: "pending",
    registeredAt: "2026-03-18T12:00:00.000Z",
  },
] as const;

export const latestEventCheckIns = [
  {
    id: "event_checkin_1",
    organizationId: organization.id,
    eventId: "event_1",
    personId: "person_2",
    registrationPersonId: "registration_person_1",
    checkedInAt: "2026-03-18T12:30:00.000Z",
  },
] as const;

export const journeyProfiles = [
  {
    id: "journey_profile_1",
    organizationId: organization.id,
    personId: "person_1",
    currentJourneyKind: "service",
    currentStage: "serving",
    progressPercent: 72,
    readinessLevel: "medium",
  },
  {
    id: "journey_profile_2",
    organizationId: organization.id,
    personId: "person_2",
    currentJourneyKind: "visitor",
    currentStage: "connecting",
    progressPercent: 34,
    readinessLevel: "low",
  },
] as const;

export const activeMissions = [
  {
    id: "mission_1",
    organizationId: organization.id,
    journeyProfileId: "journey_profile_2",
    title: "Participar de uma celula pela primeira vez",
    kind: "suggested",
    status: "available",
  },
  {
    id: "mission_2",
    organizationId: organization.id,
    journeyProfileId: "journey_profile_1",
    title: "Concluir trilha de servico do ministerio",
    kind: "automatic",
    status: "available",
  },
] as const;

export const earnedBadges = [
  {
    id: "member_badge_1",
    organizationId: organization.id,
    personId: "person_1",
    badgeId: "badge_primeiro_servico",
    awardedAt: "2026-03-10T12:00:00.000Z",
  },
  {
    id: "member_badge_2",
    organizationId: organization.id,
    personId: "person_2",
    badgeId: "badge_primeiro_passo",
    awardedAt: "2026-03-17T12:00:00.000Z",
  },
] as const;

export const tribeDefinitions = [
  {
    id: "tribe_levi",
    organizationId: organization.id,
    code: "LEVI",
    name: "Levi",
    description: "Adoração, culto e serviço no ambiente espiritual.",
    ministrySummary: "Louvor, intercessão, suporte ao culto e presença de Deus",
    isActive: true,
  },
  {
    id: "tribe_judah",
    organizationId: organization.id,
    code: "JUDAH",
    name: "Judá",
    description: "Liderança, governo e direção ministerial.",
    ministrySummary: "Liderança pastoral, supervisão e condução de pessoas",
    isActive: true,
  },
  {
    id: "tribe_asher",
    organizationId: organization.id,
    code: "ASHER",
    name: "Aser",
    description: "Acolhimento, hospitalidade e cuidado prático.",
    ministrySummary: "Recepção, integração e cuidado de famílias",
    isActive: true,
  },
  {
    id: "tribe_issachar",
    organizationId: organization.id,
    code: "ISSACHAR",
    name: "Issacar",
    description: "Discernimento de tempos e estratégia pastoral.",
    ministrySummary: "Comunicação, ensino e planejamento estratégico",
    isActive: true,
  },
  {
    id: "tribe_joseph",
    organizationId: organization.id,
    code: "JOSEPH",
    name: "José",
    description: "Administração, recursos e gestão com excelência.",
    ministrySummary: "Finanças, logística e estrutura organizacional",
    isActive: true,
  },
  {
    id: "tribe_naphtali",
    organizationId: organization.id,
    code: "NAPHTALI",
    name: "Naftali",
    description: "Expressão, artes e comunicação com leveza.",
    ministrySummary: "Dança, teatro, mídias e expressão artística",
    isActive: true,
  },
  {
    id: "tribe_zebulun",
    organizationId: organization.id,
    code: "ZEBULUN",
    name: "Zebulom",
    description: "Missões, alcance e expansão do Reino.",
    ministrySummary: "Evangelismo, missões urbanas e alcance comunitário",
    isActive: true,
  },
  {
    id: "tribe_gad",
    organizationId: organization.id,
    code: "GAD",
    name: "Gade",
    description: "Proteção, intercessão e cobertura espiritual.",
    ministrySummary: "Intercession, segurança espiritual e vigílias",
    isActive: true,
  },
  {
    id: "tribe_manasseh",
    organizationId: organization.id,
    code: "MANASSEH",
    name: "Manassés",
    description: "Cura, restauração e cuidado pastoral.",
    ministrySummary: "Aconselhamento, cuidado de feridos e restauração",
    isActive: true,
  },
  {
    id: "tribe_ephraim",
    organizationId: organization.id,
    code: "EPHRAIM",
    name: "Efraim",
    description: "Ensino, discipulado e formação de líderes.",
    ministrySummary: "Escola bíblica, discipulado e formação ministerial",
    isActive: true,
  },
  {
    id: "tribe_benjamin",
    organizationId: organization.id,
    code: "BENJAMIN",
    name: "Benjamim",
    description: "Juventude, ousadia e vanguarda espiritual.",
    ministrySummary: "Ministério jovem, inovação e movimentos de renovação",
    isActive: true,
  },
  {
    id: "tribe_reuben",
    organizationId: organization.id,
    code: "REUBEN",
    name: "Rúben",
    description: "Reconciliação, cuidado familiar e restauração de vínculos.",
    ministrySummary: "Aconselhamento familiar, mediação e restauração",
    isActive: true,
  },
] as const;

export const latestTribeAssessments = [
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
    submittedAt: "2026-03-15T12:00:00.000Z",
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
    submittedAt: "2026-03-17T18:00:00.000Z",
  },
] as const;

export const currentTribeProfiles = [
  {
    id: "tribe_profile_1",
    organizationId: organization.id,
    personId: "person_1",
    currentPrimaryTribeCode: "ASHER",
    currentSecondaryTribeCode: "MANASSEH",
    currentAssessmentId: "assessment_1",
    validationStatus: "validated",
    fitScore: 87,
    nextReviewDueAt: "2026-09-15T12:00:00.000Z",
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
    nextReviewDueAt: "2026-09-17T12:00:00.000Z",
  },
] as const;

export const reviewRequests = [
  {
    id: "review_request_1",
    organizationId: organization.id,
    personId: "person_2",
    requestedByUserId: currentUser.id,
    requestReasonType: "initial_error",
    requestStatus: "open",
    recommendedReviewType: "partial_review",
    openedAt: "2026-03-18T09:00:00.000Z",
    reviewDueAt: "2026-03-25T09:00:00.000Z",
  },
] as const;

export const behaviorSignals = [
  {
    id: "signal_1",
    organizationId: organization.id,
    personId: "person_2",
    signalType: "journey_shift",
    suggestedTribeCode: "NAPHTALI",
    confidenceWeight: 0.72,
    observedAt: "2026-03-18T10:00:00.000Z",
  },
] as const;

export const tribeAnswerPreview = [
  { questionCode: "q1", optionCode: "e" },
  { questionCode: "q2", optionCode: "d" },
  { questionCode: "q3", optionCode: "d" },
  { questionCode: "q4", optionCode: "e" },
  { questionCode: "q5", optionCode: "e" },
] as const;

export const dashboard = createTribeReclassificationSnapshot({
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
  behaviorSignals: [...behaviorSignals],
});

export const questionnaireResult =
  calculateTribeQuestionnaireResult(tribeAnswerPreview);

export const personNames: Map<string, string> = new Map(
  recentPeople.map((person) => [person.id, getPersonDisplayName(person)]),
);

export const familyPanorama = families.map((familySnapshot) => {
  const members = familySnapshot.members
    .map((member) =>
      recentPeople.find((person) => person.id === member.personId),
    )
    .filter((person): person is (typeof recentPeople)[number] =>
      Boolean(person),
    );
  const neighborhood = familySnapshot.family.address?.district ?? "Sem bairro";
  const visitorLinks = activeJourneys.filter((journey) => {
    const person = recentPeople.find((item) => item.id === journey.personId);

    return (
      person?.primaryFamilyId === familySnapshot.family.id ||
      person?.memberStatus === "visitor"
    );
  });

  return {
    ...familySnapshot,
    members,
    neighborhood,
    visitorLinks,
    incomeRange: familySnapshot.family.incomeRange ?? "not_informed",
  };
});

export const neighborhoodDistribution = familyPanorama.reduce<
  Array<{ label: string; value: number }>
>((acc, familySnapshot) => {
  const current = acc.find(
    (item) => item.label === familySnapshot.neighborhood,
  );

  if (current) {
    current.value += familySnapshot.members.length;
  } else {
    acc.push({
      label: familySnapshot.neighborhood,
      value: familySnapshot.members.length,
    });
  }

  return acc;
}, []);

export const familyInsightMetrics = [
  {
    label: "Familias mapeadas",
    value: familyPanorama.length,
    detail: `${recentPeople.length} pessoas com perfil pastoral`,
  },
  {
    label: "Com endereco",
    value: recentPeople.filter((person) => person.address?.district).length,
    detail: "base para mapa por bairro",
  },
  {
    label: "Com consentimento",
    value: recentPeople.filter((person) => person.consentLgpdAt).length,
    detail: "LGPD antes de dados sensiveis",
  },
  {
    label: "Esdras Passe ativo",
    value: recentPeople.filter((person) => person.partnerBenefitsEnabled)
      .length,
    detail: "validacao externa sem expor CPF",
  },
];

export const memberPassPreview = recentPeople
  .filter((person) => person.memberCardCode)
  .map((person) => ({
    id: person.id,
    name: getPersonDisplayName(person),
    code: person.memberCardCode ?? "",
    active: Boolean(
      person.partnerBenefitsEnabled &&
      String(person.memberStatus) !== "visitor",
    ),
    partnerScope: person.partnerBenefitsEnabled
      ? "Farmacia parceira: desconto validado por QR"
      : "Aguardando consentimento para beneficios",
  }));

export const weeklyMomentum = [
  { label: "Dom", value: 58 },
  { label: "Seg", value: 45 },
  { label: "Ter", value: 64 },
  { label: "Qua", value: 81 },
  { label: "Qui", value: 74 },
  { label: "Sex", value: 67 },
  { label: "Sab", value: 88 },
];

export const navItems = [
  { label: "Resumo", icon: LayoutDashboard, href: "#overview" },
  { label: "Pessoas", icon: UsersRound, href: "/members" },
  { label: "Familias", icon: HeartHandshake, href: "#families" },
  { label: "Jornadas", icon: MapIcon, href: "/journeys" },
  { label: "Recepção", icon: ClipboardList, href: "/reception" },
  { label: "Celulas", icon: Waypoints, href: "/groups" },
  { label: "Escalas", icon: Handshake, href: "/serving" },
  { label: "Eventos", icon: CalendarDays, href: "#events" },
  { label: "Marketplace", icon: ShoppingBag, href: "/marketplace-community" },
  { label: "Comunicacao", icon: MessageSquareText, href: "#actions" },
  { label: "Transparencia", icon: Landmark, href: "#transparency" },
];

export const kpis = [
  {
    label: "Pessoas acompanhadas",
    value: dashboard.recentPeople.length,
    detail: `${families.length} familias ativas`,
    tone: "blue",
    icon: UsersRound,
  },
  {
    label: "Jornadas em movimento",
    value: dashboard.journeyProfiles.length,
    detail: `${dashboard.activeMissions.length} missoes sugeridas`,
    tone: "green",
    icon: Activity,
  },
  {
    label: "Eventos publicados",
    value: dashboard.publishedEvents.length,
    detail: `${dashboard.latestRegistrations.length} inscricoes recentes`,
    tone: "orange",
    icon: CalendarDays,
  },
  {
    label: "Alertas pastorais",
    value: dashboard.reviewRequests.length,
    detail: `${dashboard.behaviorSignals.length} sinal comportamental`,
    tone: "red",
    icon: Bell,
  },
];

export const moduleHighlights = [
  {
    label: "Pessoas e familias",
    description:
      "Base unica com dados cadastrais, casas, lideres, visitantes e vinculos familiares.",
    href: "/members",
    icon: UsersRound,
    enabled: isModuleEnabled(tenantSettings.features.modules, "core"),
    action: "Ver base",
  },
  {
    label: "Recepção",
    description:
      "Entrada do visitante que cria pessoa, jornada, comunicacao e roteiro de acolhimento.",
    href: "/reception",
    icon: ClipboardList,
    enabled: isModuleEnabled(tenantSettings.features.modules, "visitors"),
    action: "Capturar visitante",
  },
  {
    label: "Jornadas",
    description:
      "Proximos passos, missoes e progresso para cada pessoa acompanhada.",
    href: "/journeys",
    icon: Trophy,
    enabled: isModuleEnabled(tenantSettings.features.modules, "journeys"),
    action: "Ver progresso",
  },
  {
    label: "Celulas e eventos",
    description:
      "Convites, presencas, check-ins e integracao pratica na agenda da igreja.",
    href: "/groups",
    icon: Waypoints,
    enabled:
      isModuleEnabled(tenantSettings.features.modules, "groups") &&
      isModuleEnabled(tenantSettings.features.modules, "events"),
    action: "Organizar agenda",
  },
  {
    label: "Escalas e equipes",
    description:
      "Voluntarios, ministerios, confirmacoes, justificativas e funcionarios contratados.",
    href: "/serving",
    icon: Handshake,
    enabled: isModuleEnabled(tenantSettings.features.modules, "volunteers"),
    action: "Montar escala",
  },
  {
    label: "Comunicacao",
    description:
      "Fila viva para WhatsApp, convites, lembretes e retorno pastoral.",
    href: "#actions",
    icon: MessageSquareText,
    enabled: isModuleEnabled(tenantSettings.features.modules, "communication"),
    action: "Ver fila",
  },
  {
    label: "Transparencia",
    description:
      "Prestacao de contas, arrecadacoes e demonstrativos publicaveis para a igreja.",
    href: "#transparency",
    icon: Landmark,
    enabled: isModuleEnabled(tenantSettings.features.modules, "finance"),
    action: "Publicar contas",
  },
  {
    label: "SaaS e contratos",
    description:
      "Onboarding de instituicoes contratantes com tenant, plano, marca e modulos.",
    href: "/saas/organizations/new",
    icon: Target,
    enabled: true,
    action: "Cadastrar instituicao",
  },
];

export const operationalShortcuts = [
  {
    label: "Painel geral",
    title: "Visao completa",
    description:
      "Volte para o resumo executivo com indicadores, filas e modulos.",
    href: "#overview",
    icon: LayoutDashboard,
    meta: "Home do projeto",
  },
  {
    label: "Recepção",
    title: "Recepcao dedicada",
    description:
      "Tela rapida para tablet ou notebook na entrada da celebracao.",
    href: "/reception",
    icon: ClipboardList,
    meta: "Modulo dedicado",
  },
  {
    label: "Membros",
    title: "Base pastoral",
    description: "Lista de pessoas, familias, filtros e fichas completas.",
    href: "/members",
    icon: UsersRound,
    meta: `${recentPeople.length} perfis demo`,
  },
  {
    label: "Jornadas",
    title: "Funil vivo",
    description:
      "Acompanhe convidado, aspirante, membro e integracao em celula.",
    href: "/journeys",
    icon: MapIcon,
    meta: "Fluxo completo",
  },
  {
    label: "Celulas",
    title: "Comunidade pequena",
    description:
      "Veja grupos, participantes, presencas e pessoas ainda sem celula.",
    href: "/groups",
    icon: Waypoints,
    meta: `${activeGroups.length} grupos ativos`,
  },
  {
    label: "Escalas",
    title: "Servidores e equipes",
    description:
      "Monte escalas, confirme presencas e acompanhe justificativas.",
    href: "/serving",
    icon: Handshake,
    meta: "Voluntarios",
  },
  {
    label: "Novo cadastro",
    title: "Cadastrar membro",
    description: "Crie pessoa, familia, LGPD e Esdras Passe em uma ficha.",
    href: "/members/new",
    icon: UserPlus,
    meta: "Secretaria",
  },
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

export const visitorIntakeRecords: VisitorIntakeRecord[] = [
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
    presentationStatus: "Na lista",
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
    presentationStatus: "A confirmar",
  },
];

export const transparencySummary = {
  month: "Marco 2026",
  income: 42850,
  expenses: 31740,
  missions: 6200,
  balance: 11110,
  publicationStatus: "Rascunho interno",
};

export const transparencyEntries = [
  {
    id: "finance_1",
    label: "Dizimos e ofertas",
    category: "Entrada",
    amount: 42850,
    note: "Cultos, Pix e envelopes",
  },
  {
    id: "finance_2",
    label: "Operacao da igreja",
    category: "Saida",
    amount: 18400,
    note: "Aluguel, energia, manutencao e equipe",
  },
  {
    id: "finance_3",
    label: "Missoes e acao social",
    category: "Destino",
    amount: 6200,
    note: "Cestas, visitas e apoio missionario",
  },
] as const;

export const partnerOrganizations: PartnerOrganization[] = [
  {
    id: "partner_1",
    organizationId: organization.id,
    name: "Farmacia Vida Plena",
    category: "health",
    status: "active",
    contactName: "Renata Alves",
    isMemberBusiness: false,
    address: {
      street: "Av. Gentil Bittencourt",
      number: "123",
      district: "Nazare",
      city: "Belem",
      state: "PA",
      postalCode: "66035-000",
    },
  },
  {
    id: "partner_2",
    organizationId: organization.id,
    name: "Escola de Musica Harmonia",
    category: "education",
    status: "active",
    contactName: "Daniel Rocha",
    isMemberBusiness: false,
    address: {
      street: "Rua Dos Mundurucus",
      number: "456",
      district: "Batista Campos",
      city: "Belem",
      state: "PA",
      postalCode: "66033-000",
    },
  },
  {
    id: "business_1",
    organizationId: organization.id,
    name: "Pão da Vida",
    category: "food",
    status: "active",
    contactName: "Ana Silva",
    isMemberBusiness: true,
    ownerPersonId: "person_1",
    logoUrl:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=200&auto=format&fit=crop",
    instagram: "@paodavida_esdras",
    address: {
      street: "Travessa Mauriti",
      number: "1020",
      district: "Marco",
      city: "Belem",
      state: "PA",
      postalCode: "66093-000",
      lat: -1.4367,
      lng: -48.4578,
    },
  },
  {
    id: "business_2",
    organizationId: organization.id,
    name: "Conecta Tech",
    category: "services",
    status: "active",
    contactName: "Lucas Costa",
    isMemberBusiness: true,
    ownerPersonId: "person_2",
    logoUrl:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=200&auto=format&fit=crop",
    website: "https://conectatech.esdras.app",
    address: {
      street: "Avenida Visconde de Souza Franco",
      number: "500",
      district: "Reduto",
      city: "Belem",
      state: "PA",
      postalCode: "66053-000",
      lat: -1.4485,
      lng: -48.4892,
    },
  },
];

export const partnerBenefits = [
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
    privacyNotes:
      "Parceiro recebe somente status de elegibilidade e primeiro nome.",
  },
  {
    id: "benefit_2",
    organizationId: organization.id,
    partnerId: "partner_2",
    title: "Bolsa em aula experimental",
    description:
      "Primeira mensalidade com desconto para membros e filhos cadastrados.",
    category: "education",
    status: "active",
    discountLabel: "20%",
    verificationMode: "member_code",
    privacyNotes:
      "Parceiro nao acessa CPF, renda, endereco ou historico pastoral.",
  },
  {
    id: "benefit_3",
    organizationId: organization.id,
    partnerId: "business_1",
    title: "Café da Manhã do Reino",
    description:
      "15% de desconto em qualquer combo de café da manhã apresentando o Esdras Passe.",
    category: "food",
    status: "active",
    discountLabel: "15%",
    verificationMode: "qr_code",
    privacyNotes: "Apenas para membros ativos.",
  },
  {
    id: "benefit_4",
    organizationId: organization.id,
    partnerId: "business_2",
    title: "Consultoria Gratuita",
    description:
      "Primeira consultoria de segurança digital gratuita para empresas de membros.",
    category: "services",
    status: "active",
    discountLabel: "FREE",
    verificationMode: "member_code",
    privacyNotes: "Sujeito a disponibilidade de agenda.",
  },
] as const;

export const memberBenefitValidations = [
  {
    id: "validation_1",
    organizationId: organization.id,
    partnerId: "partner_1",
    benefitId: "benefit_1",
    personId: "person_1",
    memberCardCode: "GETRO-ANA-001",
    validationStatus: "approved",
    validatedAt: "2026-04-20T16:24:00.000Z",
    exposedFields: ["firstName", "memberActive", "benefitEligible"],
  },
] as const;

export const partnerBenefitPreview = partnerBenefits.map((benefit) => ({
  ...benefit,
  partner: partnerOrganizations.find(
    (partner) => partner.id === benefit.partnerId,
  ),
  validations: memberBenefitValidations.filter(
    (validation) => validation.benefitId === benefit.id,
  ),
}));

export const actionFeed = [
  ...followUps.map((task) => ({
    id: task.id,
    title: task.title,
    eyebrow: getFollowUpStatusLabel(task.status),
    detail: getPersonName(task.personId),
    icon: CheckCircle2,
    href: "#actions",
  })),
  ...dashboard.latestRegistrations.map((registration) => ({
    id: registration.id,
    title: registration.registrationCode,
    eyebrow: getRegistrationStatusLabel(registration.status),
    detail: `${registration.paymentStatus} em eventos`,
    icon: CalendarDays,
    href: "#events",
  })),
  ...dashboard.reviewRequests.map((request) => ({
    id: request.id,
    title: getPersonName(request.personId),
    eyebrow: getReviewRequestStatusLabel(request.requestStatus),
    detail: getRecommendedReviewTypeLabel(request.recommendedReviewType),
    icon: Target,
    href: "#tribes",
  })),
];

// --- MOCK DATA FOR WORSHIP MODULE ---
export const MOCK_WORSHIP_SONGS = [
  {
    id: "song_1",
    organizationId: organization.id,
    title: "Porque Ele Vive",
    artist: "Harpa Cristã",
    originalKey: "G",
    tempoBpm: 74,
    spotifyUrl: "https://open.spotify.com/track/1",
    youtubeUrl: "https://youtube.com/watch?v=1",
    chordsLyrics: `[Intro]
[G] [C] [G] [D]

[Verso 1]
Deus en[G]viou Seu Filho a[C]mado
Para mor[G]rer em meu lu[D]gar
Na cruz so[G]freu por meus pe[C]cados
Mas o túmulo va[G]zio está
[D]Porque Ele vi[G]ve

[Refrão]
Porque Ele vi[G]ve, eu posso crer no ama[C]nhã
Porque Ele vi[G]ve, temor não [D]há
Mas eu bem [G]sei, eu sei, que a minha vi[C]da
Está nas [G]mãos do meu Se[D]nhor, que vivo es[G]tá`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "song_2",
    organizationId: organization.id,
    title: "O Quão Lindo Esse Nome É",
    artist: "Hillsong Worship",
    originalKey: "D",
    tempoBpm: 68,
    spotifyUrl: "https://open.spotify.com/track/2",
    youtubeUrl: "https://youtube.com/watch?v=2",
    chordsLyrics: `[Intro]
[D] [G] [Bm] [A]

[Verso 1]
No prin[D]cípio era o Verbo
Com o [G]Altíssimo Senhor
O mis[Bm]tério da cri[A]ação
Em Ti, [Bm]Cristo, se re[A]velou

[Refrão]
O quão [D]lindo esse nome é
O quão [A]lindo esse nome é
O nome de [Bm]Jesus, meu [A]Rei, Se[G]nhor
O quão [D/F#]lindo esse nome é
Maior que [A]tudo ele é
O quão [Bm]lindo esse nome [A]é, o nome de Je[G]sus`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "song_3",
    organizationId: organization.id,
    title: "A Casa É Sua",
    artist: "Casa Worship",
    originalKey: "A",
    tempoBpm: 72,
    spotifyUrl: "https://open.spotify.com/track/3",
    youtubeUrl: "https://youtube.com/watch?v=3",
    chordsLyrics: `[Intro]
[F#m7] [D] [A] [E]

[Verso]
Você é [F#m7]bem-vindo aqui
A casa é [D]Sua, pode entrar
Me esva[A]zio de mim
Me esva[E]zio de mim

[Refrão]
[F#m7]Sopra em nós o Teu vento
[D]Queremos ouvir Teu sussurro
[A]Essa casa é Sua casa
[E]Nós deixamos ela pra Você, Jesus`,
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_WORSHIP_SETLISTS = [
  {
    id: "setlist_1",
    organizationId: organization.id,
    eventId: "event_1", // Vinculado ao culto
    songs: [
      { songId: "song_2", selectedKey: "D", sortOrder: 1 },
      { songId: "song_3", selectedKey: "B", sortOrder: 2 }, // Transposto de A para B (+2 semitons)
      { songId: "song_1", selectedKey: "G", sortOrder: 3 },
    ],
    updatedAt: new Date().toISOString(),
  },
];

// --- MOCK DATA FOR ESDRAS CANVAS ---
export const MOCK_GROUP_BANNERS = [
  {
    id: "banner_group_1",
    organizationId: organization.id,
    groupId: "group_1",
    themeColor: "#d27836",
    titleText: "Célula Centro Norte",
    subtitleText: "Viver em Família e Comunhão",
    bannerFormat: "feed",
    showLeaderPhoto: true,
    customAddress: "Travessa Padre Eutiquio, 1220",
    updatedAt: new Date().toISOString(),
  },
];

// --- ESCOPO DE CAPACITAÇÃO (fonte) ---
// Estes 12 "cursos" são o catálogo que a PLATAFORMA ESDRAS vende às igrejas na
// Loja de Capacitação (TrainingProgram). São a FONTE de MOCK_TRAINING_PROGRAMS/
// MOCK_TRAINING_LESSONS logo abaixo. NÃO são semeados na Escola EAD da igreja —
// a EAD interna começa vazia para cada igreja criar os próprios cursos.
const SOURCE_COURSES = [
  {
    id: "course_1",
    organizationId: organization.id,
    title: "DNA da Liderança - Escola de Líderes",
    description:
      "Curso oficial de formação de líderes de célula do Plataforma Esdras. Aprenda a pastorear, liderar e multiplicar seu grupo com excelência e profundidade espiritual.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_lider_capacitado",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "course_2",
    organizationId: organization.id,
    title: "Passos da Integração: Nova Vida",
    description:
      "Ideal para novos convertidos e novos membros. Descubra os fundamentos da fé cristã, a importância da comunhão em células e a visão teológica da nossa igreja.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1504052434569-70ad58565b90?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_primeiro_passo",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "course_3",
    organizationId: organization.id,
    title: "Da Porta ao Altar: Jornada de Integração do Novo Membro",
    description:
      "Um caminho estruturado para transformar visitantes em membros comprometidos, com foco em vínculo, pertencimento e compromisso em cada etapa da jornada.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_jornada_completa",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "course_4",
    organizationId: organization.id,
    title: "Multiplica: Formando Líderes que Formam Líderes",
    description:
      "Formação em cascata para quem quer acolher, formar e enviar novos líderes, multiplicando grupos com saúde e profundidade.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1504052434569-70ad58565b90?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_multiplicador_lideres",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "course_5",
    organizationId: organization.id,
    title: "Igreja Viva: O Papel do Membro no Corpo de Cristo",
    description:
      "Curso para todo novo membro sobre as atitudes que fortalecem a igreja: unidade, presença, generosidade e serviço no dia a dia.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_igreja_viva",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "course_6",
    organizationId: organization.id,
    title: "Liderar é Servir: Fundamentos para Líderes de Ministério",
    description:
      "Fundamentos de liderança cristã para líderes de ministério: influência, inteligência emocional, comunicação de visão e decisão sob pressão.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1504052434569-70ad58565b90?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_lider_servo",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "course_7",
    organizationId: organization.id,
    title: "Igreja em Movimento: Fundamentos para Plantação e Expansão",
    description:
      "Para líderes com chamado de plantação: teologia da cidade, formação de time fundador e os primeiros 90 dias de uma nova igreja.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_igreja_em_movimento",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "course_8",
    organizationId: organization.id,
    title: "Raio-X da Igreja: Diagnóstico e Saúde Congregacional",
    description:
      "Um diagnóstico prático dos pontos fortes e pontos de atenção que fazem uma igreja crescer com saúde: liderança, dons, espiritualidade, estrutura e evangelismo.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1504052434569-70ad58565b90?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_raiox_igreja",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "course_9",
    organizationId: organization.id,
    title: "Pontes de Fé: Evangelismo no Dia a Dia",
    description:
      "Como criar espaços de conversa genuína, hospitalidade e um ciclo de encontros introdutórios para quem está distante da fé.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_pontes_de_fe",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "course_10",
    organizationId: organization.id,
    title: "Anfitrião de Célula: do Convite à Liderança",
    description:
      "Do primeiro convite à liderança: como preparar encontros de impacto, receber coaching contínuo e cuidar da própria saúde emocional como líder.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1504052434569-70ad58565b90?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_anfitriao_celula",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "course_11",
    organizationId: organization.id,
    title: "Casas que Multiplicam: Células como Base da Igreja",
    description:
      "Por que células multiplicam mais que cultos: oração e cuidado em pequenos grupos, e como planejar uma multiplicação saudável sem perder gente.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_casas_que_multiplicam",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "course_12",
    organizationId: organization.id,
    title: "Rede que Cuida: Mentoria e Conexão entre Igrejas",
    description:
      "Como estruturar trilhas de mentoria (incluindo discipulado de homens) e eventos anuais que conectam e retêm líderes de toda a rede de igrejas.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1504052434569-70ad58565b90?q=80&w=400&auto=format&fit=crop",
    badgeUnlockedId: "badge_rede_que_cuida",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const SOURCE_MODULES = [
  {
    id: "mod_1",
    organizationId: organization.id,
    courseId: "course_1",
    title: "Módulo 1: O Coração do Líder",
    sortOrder: 1,
  },
  {
    id: "mod_2",
    organizationId: organization.id,
    courseId: "course_1",
    title: "Módulo 2: Estratégias de Multiplicação",
    sortOrder: 2,
  },
  {
    id: "mod_3",
    organizationId: organization.id,
    courseId: "course_2",
    title: "Módulo 1: Primeiros Passos com Jesus",
    sortOrder: 1,
  },
  // Curso 3 - Sistema de Assimilação
  {
    id: "mod_4",
    organizationId: organization.id,
    courseId: "course_3",
    title: "Módulo 1: Do Primeiro Contato ao Vínculo",
    sortOrder: 1,
  },
  {
    id: "mod_5",
    organizationId: organization.id,
    courseId: "course_3",
    title: "Módulo 2: Do Vínculo ao Compromisso",
    sortOrder: 2,
  },
  // Curso 4 - Visão dos Doze
  {
    id: "mod_6",
    organizationId: organization.id,
    courseId: "course_4",
    title: "Módulo 1: Acolher e Consolidar",
    sortOrder: 1,
  },
  {
    id: "mod_7",
    organizationId: organization.id,
    courseId: "course_4",
    title: "Módulo 2: Formar e Enviar",
    sortOrder: 2,
  },
  // Curso 5 - Sou um Membro Saudável
  {
    id: "mod_8",
    organizationId: organization.id,
    courseId: "course_5",
    title: "Módulo 1: Atitudes de um Membro Comprometido",
    sortOrder: 1,
  },
  {
    id: "mod_9",
    organizationId: organization.id,
    courseId: "course_5",
    title: "Módulo 2: Presença que Faz Diferença",
    sortOrder: 2,
  },
  // Curso 6 - Liderança com Propósito
  {
    id: "mod_10",
    organizationId: organization.id,
    courseId: "course_6",
    title: "Módulo 1: Fundamentos da Liderança Cristã",
    sortOrder: 1,
  },
  {
    id: "mod_11",
    organizationId: organization.id,
    courseId: "course_6",
    title: "Módulo 2: Liderando Equipes e Visão",
    sortOrder: 2,
  },
  // Curso 7 - Plantando Igrejas em Contextos Urbanos
  {
    id: "mod_12",
    organizationId: organization.id,
    courseId: "course_7",
    title: "Módulo 1: Entendendo a Cidade",
    sortOrder: 1,
  },
  {
    id: "mod_13",
    organizationId: organization.id,
    courseId: "course_7",
    title: "Módulo 2: Do Núcleo ao Lançamento",
    sortOrder: 2,
  },
  // Curso 8 - As 8 Características de uma Igreja Saudável
  {
    id: "mod_14",
    organizationId: organization.id,
    courseId: "course_8",
    title: "Módulo 1: Diagnóstico e Liderança",
    sortOrder: 1,
  },
  {
    id: "mod_15",
    organizationId: organization.id,
    courseId: "course_8",
    title: "Módulo 2: Estrutura e Espiritualidade",
    sortOrder: 2,
  },
  // Curso 9 - Convidando para a Fé
  {
    id: "mod_16",
    organizationId: organization.id,
    courseId: "course_9",
    title: "Módulo 1: Criando Espaços de Conversa",
    sortOrder: 1,
  },
  {
    id: "mod_17",
    organizationId: organization.id,
    courseId: "course_9",
    title: "Módulo 2: Conduzindo um Ciclo de Encontros",
    sortOrder: 2,
  },
  // Curso 10 - Formação de Líderes de Célula
  {
    id: "mod_18",
    organizationId: organization.id,
    courseId: "course_10",
    title: "Módulo 1: O Chamado do Líder de Célula",
    sortOrder: 1,
  },
  {
    id: "mod_19",
    organizationId: organization.id,
    courseId: "course_10",
    title: "Módulo 2: Coaching Contínuo",
    sortOrder: 2,
  },
  // Curso 11 - Multiplicação Celular
  {
    id: "mod_20",
    organizationId: organization.id,
    courseId: "course_11",
    title: "Módulo 1: Células como Base da Igreja",
    sortOrder: 1,
  },
  {
    id: "mod_21",
    organizationId: organization.id,
    courseId: "course_11",
    title: "Módulo 2: Multiplicando com Saúde",
    sortOrder: 2,
  },
  // Curso 12 - Mentoria e Cuidado Pastoral em Rede
  {
    id: "mod_22",
    organizationId: organization.id,
    courseId: "course_12",
    title: "Módulo 1: Mentoria que Retém",
    sortOrder: 1,
  },
  {
    id: "mod_23",
    organizationId: organization.id,
    courseId: "course_12",
    title: "Módulo 2: Eventos que Conectam a Rede",
    sortOrder: 2,
  },
];

const SOURCE_LESSONS = [
  // Curso 1 - Modulo 1
  {
    id: "les_1",
    organizationId: organization.id,
    courseId: "course_1",
    moduleId: "mod_1",
    title: "Aula 1: A Vocação Pastoral de Todo Crente",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 18,
    sortOrder: 1,
  },
  {
    id: "les_2",
    organizationId: organization.id,
    courseId: "course_1",
    moduleId: "mod_1",
    title: "Aula 2: Caráter e Espiritualidade do Líder",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 22,
    sortOrder: 2,
  },
  // Curso 1 - Modulo 2
  {
    id: "les_3",
    organizationId: organization.id,
    courseId: "course_1",
    moduleId: "mod_2",
    title: "Aula 1: Planejando o Dia da Multiplicação",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 15,
    sortOrder: 1,
  },
  {
    id: "les_4",
    organizationId: organization.id,
    courseId: "course_1",
    moduleId: "mod_2",
    title: "Aula 2: Resolução de Conflitos na Célula",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 25,
    sortOrder: 2,
  },
  // Curso 2 - Modulo 1
  {
    id: "les_5",
    organizationId: organization.id,
    courseId: "course_2",
    moduleId: "mod_3",
    title: "Aula 1: O que é a Salvação e o Batismo?",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 12,
    sortOrder: 1,
  },
  {
    id: "les_6",
    organizationId: organization.id,
    courseId: "course_2",
    moduleId: "mod_3",
    title: "Aula 2: A Importância Devocional Diária",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 14,
    sortOrder: 2,
  },

  // Curso 3 - Sistema de Assimilação - Modulo 1
  {
    id: "les_7",
    organizationId: organization.id,
    courseId: "course_3",
    moduleId: "mod_4",
    title: "Aula 1: Fazendo a Pessoa Voltar na Segunda Vez",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 16,
    sortOrder: 1,
  },
  {
    id: "les_8",
    organizationId: organization.id,
    courseId: "course_3",
    moduleId: "mod_4",
    title: "Aula 2: Construindo Pontes de Pertencimento",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 19,
    sortOrder: 2,
  },
  // Curso 3 - Modulo 2
  {
    id: "les_9",
    organizationId: organization.id,
    courseId: "course_3",
    moduleId: "mod_5",
    title: "Aula 1: O Caminho até o Compromisso de Membro",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 17,
    sortOrder: 1,
  },
  {
    id: "les_10",
    organizationId: organization.id,
    courseId: "course_3",
    moduleId: "mod_5",
    title: "Aula 2: Alertas de Cuidado — Agindo Antes que a Pessoa Se Afaste",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 14,
    sortOrder: 2,
  },

  // Curso 4 - Visão dos Doze - Modulo 1
  {
    id: "les_11",
    organizationId: organization.id,
    courseId: "course_4",
    moduleId: "mod_6",
    title: "Aula 1: Os Quatro Passos da Multiplicação de Discípulos",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 20,
    sortOrder: 1,
  },
  {
    id: "les_12",
    organizationId: organization.id,
    courseId: "course_4",
    moduleId: "mod_6",
    title: "Aula 2: Consolidando o Novo Convertido nos Primeiros 40 Dias",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 18,
    sortOrder: 2,
  },
  // Curso 4 - Modulo 2
  {
    id: "les_13",
    organizationId: organization.id,
    courseId: "course_4",
    moduleId: "mod_7",
    title: "Aula 1: Formando seu Primeiro Grupo de Multiplicadores",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 21,
    sortOrder: 1,
  },
  {
    id: "les_14",
    organizationId: organization.id,
    courseId: "course_4",
    moduleId: "mod_7",
    title: "Aula 2: O Dia da Multiplicação",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 16,
    sortOrder: 2,
  },

  // Curso 5 - Sou um Membro Saudável - Modulo 1
  {
    id: "les_15",
    organizationId: organization.id,
    courseId: "course_5",
    moduleId: "mod_8",
    title: "Aula 1: Sou Membro para Servir, não para Ser Servido",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 13,
    sortOrder: 1,
  },
  {
    id: "les_16",
    organizationId: organization.id,
    courseId: "course_5",
    moduleId: "mod_8",
    title: "Aula 2: Unidade — Protegendo a Igreja da Divisão",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 15,
    sortOrder: 2,
  },
  // Curso 5 - Modulo 2
  {
    id: "les_17",
    organizationId: organization.id,
    courseId: "course_5",
    moduleId: "mod_9",
    title: "Aula 1: A Importância da Presença Regular",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 12,
    sortOrder: 1,
  },
  {
    id: "les_18",
    organizationId: organization.id,
    courseId: "course_5",
    moduleId: "mod_9",
    title: "Aula 2: Generosidade e Evangelismo no Dia a Dia",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 17,
    sortOrder: 2,
  },

  // Curso 6 - Liderança com Propósito - Modulo 1
  {
    id: "les_19",
    organizationId: organization.id,
    courseId: "course_6",
    moduleId: "mod_10",
    title: "Aula 1: Liderança é Influência, Não Posição",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 19,
    sortOrder: 1,
  },
  {
    id: "les_20",
    organizationId: organization.id,
    courseId: "course_6",
    moduleId: "mod_10",
    title: "Aula 2: Autoconhecimento e Inteligência Emocional do Líder",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 22,
    sortOrder: 2,
  },
  // Curso 6 - Modulo 2
  {
    id: "les_21",
    organizationId: organization.id,
    courseId: "course_6",
    moduleId: "mod_11",
    title: "Aula 1: Comunicando Visão de Forma Inspiradora",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 18,
    sortOrder: 1,
  },
  {
    id: "les_22",
    organizationId: organization.id,
    courseId: "course_6",
    moduleId: "mod_11",
    title: "Aula 2: Tomada de Decisão sob Pressão",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 20,
    sortOrder: 2,
  },

  // Curso 7 - Plantando Igrejas em Contextos Urbanos - Modulo 1
  {
    id: "les_23",
    organizationId: organization.id,
    courseId: "course_7",
    moduleId: "mod_12",
    title: "Aula 1: Teologia da Cidade e Contextualização do Evangelho",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 24,
    sortOrder: 1,
  },
  {
    id: "les_24",
    organizationId: organization.id,
    courseId: "course_7",
    moduleId: "mod_12",
    title: "Aula 2: Mapeando Necessidades e Oportunidades Locais",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 20,
    sortOrder: 2,
  },
  // Curso 7 - Modulo 2
  {
    id: "les_25",
    organizationId: organization.id,
    courseId: "course_7",
    moduleId: "mod_13",
    title: "Aula 1: Formando o Time Fundador",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 19,
    sortOrder: 1,
  },
  {
    id: "les_26",
    organizationId: organization.id,
    courseId: "course_7",
    moduleId: "mod_13",
    title: "Aula 2: Primeiros 90 Dias de uma Igreja Plantada",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 17,
    sortOrder: 2,
  },

  // Curso 8 - As 8 Características de uma Igreja Saudável - Modulo 1
  {
    id: "les_27",
    organizationId: organization.id,
    courseId: "course_8",
    moduleId: "mod_14",
    title: "Aula 1: Como Aplicar o Diagnóstico de Saúde da Igreja",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 21,
    sortOrder: 1,
  },
  {
    id: "les_28",
    organizationId: organization.id,
    courseId: "course_8",
    moduleId: "mod_14",
    title: "Aula 2: Liderança que Capacita e Descoberta de Dons Espirituais",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 18,
    sortOrder: 2,
  },
  // Curso 8 - Modulo 2
  {
    id: "les_29",
    organizationId: organization.id,
    courseId: "course_8",
    moduleId: "mod_15",
    title: "Aula 1: Pequenos Grupos que Cuidam da Pessoa Inteira",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 16,
    sortOrder: 1,
  },
  {
    id: "les_30",
    organizationId: organization.id,
    courseId: "course_8",
    moduleId: "mod_15",
    title: "Aula 2: Evangelismo que Parte da Necessidade do Outro",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 15,
    sortOrder: 2,
  },

  // Curso 9 - Convidando para a Fé - Modulo 1
  {
    id: "les_31",
    organizationId: organization.id,
    courseId: "course_9",
    moduleId: "mod_16",
    title: "Aula 1: Perguntas que Abrem Portas para o Evangelho",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 14,
    sortOrder: 1,
  },
  {
    id: "les_32",
    organizationId: organization.id,
    courseId: "course_9",
    moduleId: "mod_16",
    title: "Aula 2: Hospitalidade como Ferramenta de Evangelismo",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 13,
    sortOrder: 2,
  },
  // Curso 9 - Modulo 2
  {
    id: "les_33",
    organizationId: organization.id,
    courseId: "course_9",
    moduleId: "mod_17",
    title: "Aula 1: Estrutura de um Curso Introdutório à Fé",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 19,
    sortOrder: 1,
  },
  {
    id: "les_34",
    organizationId: organization.id,
    courseId: "course_9",
    moduleId: "mod_17",
    title: "Aula 2: Acompanhando Quem Decide Seguir Jesus",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 17,
    sortOrder: 2,
  },

  // Curso 10 - Formação de Líderes de Célula - Modulo 1
  {
    id: "les_35",
    organizationId: organization.id,
    courseId: "course_10",
    moduleId: "mod_18",
    title: "Aula 1: Do Membro ao Anfitrião: Primeiros Passos",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 15,
    sortOrder: 1,
  },
  {
    id: "les_36",
    organizationId: organization.id,
    courseId: "course_10",
    moduleId: "mod_18",
    title: "Aula 2: Preparando um Encontro de Célula de Impacto",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 18,
    sortOrder: 2,
  },
  // Curso 10 - Modulo 2
  {
    id: "les_37",
    organizationId: organization.id,
    courseId: "course_10",
    moduleId: "mod_19",
    title: "Aula 1: Recebendo e Dando Feedback como Líder",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 16,
    sortOrder: 1,
  },
  {
    id: "les_38",
    organizationId: organization.id,
    courseId: "course_10",
    moduleId: "mod_19",
    title: "Aula 2: Cuidando de Quem Cuida — Saúde Emocional do Líder",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 20,
    sortOrder: 2,
  },

  // Curso 11 - Multiplicação Celular - Modulo 1
  {
    id: "les_39",
    organizationId: organization.id,
    courseId: "course_11",
    moduleId: "mod_20",
    title: "Aula 1: Por que Células Multiplicam Mais que Cultos",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 17,
    sortOrder: 1,
  },
  {
    id: "les_40",
    organizationId: organization.id,
    courseId: "course_11",
    moduleId: "mod_20",
    title: "Aula 2: Oração e Cuidado Pastoral em Pequenos Grupos",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 19,
    sortOrder: 2,
  },
  // Curso 11 - Modulo 2
  {
    id: "les_41",
    organizationId: organization.id,
    courseId: "course_11",
    moduleId: "mod_21",
    title: "Aula 1: Identificando o Próximo Líder Dentro da Célula",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 18,
    sortOrder: 1,
  },
  {
    id: "les_42",
    organizationId: organization.id,
    courseId: "course_11",
    moduleId: "mod_21",
    title: "Aula 2: Planejando a Multiplicação sem Perder Gente",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 16,
    sortOrder: 2,
  },

  // Curso 12 - Mentoria e Cuidado Pastoral em Rede - Modulo 1
  {
    id: "les_43",
    organizationId: organization.id,
    courseId: "course_12",
    moduleId: "mod_22",
    title: "Aula 1: A Diferença entre Discipulado e Mentoria",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 15,
    sortOrder: 1,
  },
  {
    id: "les_44",
    organizationId: organization.id,
    courseId: "course_12",
    moduleId: "mod_22",
    title: "Aula 2: Construindo uma Trilha de Mentoria para Homens",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 18,
    sortOrder: 2,
  },
  // Curso 12 - Modulo 2
  {
    id: "les_45",
    organizationId: organization.id,
    courseId: "course_12",
    moduleId: "mod_23",
    title: "Aula 1: Planejando um Encontro Anual de Líderes",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 14,
    sortOrder: 1,
  },
  {
    id: "les_46",
    organizationId: organization.id,
    courseId: "course_12",
    moduleId: "mod_23",
    title: "Aula 2: Sustentando o Vínculo entre Igrejas Parceiras",
    videoUrl: "https://player.vimeo.com/video/769798718",
    durationMinutes: 16,
    sortOrder: 2,
  },
];

// ─── LOJA DE CAPACITAÇÃO (catálogo global da Plataforma Esdras) ──────────────
// Os 12 cursos-fonte viram TrainingProgram vendáveis (R$ 147, publicados). ids
// com prefixo `tp_` para não colidir com cursos internos da EAD na subcoleção
// de progresso. As aulas viram TrainingLesson planas, com o TÍTULO do módulo
// preservado em moduleId (a loja lista aulas em sequência).
const PROGRAM_PRICE_BRL = 147;

export const MOCK_TRAINING_PROGRAMS = SOURCE_COURSES.map((c) => ({
  id: c.id.replace("course_", "tp_seed_"),
  title: c.title,
  description: c.description,
  thumbnailUrl: c.thumbnailUrl,
  priceBRL: PROGRAM_PRICE_BRL,
  isPublished: true,
  badgeUnlockedId: c.badgeUnlockedId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

export const MOCK_TRAINING_LESSONS = SOURCE_LESSONS.map((l) => ({
  id: l.id.replace("les_", "tl_seed_"),
  programId: l.courseId.replace("course_", "tp_seed_"),
  moduleId:
    SOURCE_MODULES.find((m) => m.id === l.moduleId)?.title ?? l.moduleId,
  title: l.title,
  videoUrl: l.videoUrl,
  durationMinutes: l.durationMinutes,
  sortOrder: l.sortOrder,
}));

// --- ESCOLA EAD (interna, org-scoped) ---
// Seed VAZIO de propósito: cada igreja cria os próprios cursos para seus
// servidores em "Gerenciar Cursos". (Antes semeávamos os 12 acima aqui, mas eles
// pertencem à Loja de Capacitação da plataforma, não à EAD da igreja.)
export const MOCK_COURSES: typeof SOURCE_COURSES = [];
export const MOCK_COURSE_MODULES: typeof SOURCE_MODULES = [];
export const MOCK_LESSONS: typeof SOURCE_LESSONS = [];
export const MOCK_MEMBER_COURSE_PROGRESS: {
  id: string;
  organizationId: string;
  memberId: string;
  courseId: string;
  completedLessons: string[];
  isCompleted: boolean;
  updatedAt: string;
}[] = [];

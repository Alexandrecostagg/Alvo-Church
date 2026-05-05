import { Activity, Bell, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Flame, Handshake, HeartHandshake, Landmark, LayoutDashboard, Map as MapIcon, Megaphone, MessageSquareText, QrCode, ReceiptText, Search, Send, ShieldCheck, Sparkles, Smartphone, Target, Trophy, UserPlus, UsersRound, Waypoints } from "lucide-react";
import { calculateTribeQuestionnaireResult, canManagePeople, createTribeReclassificationSnapshot, getBrandModeLabel, getEnabledModuleCount, getEventTypeLabel, getFollowUpStatusLabel, getGroupTypeLabel, getJourneyKindLabel, getPartnerBenefitCategoryLabel, getPlanTierLabel, getRecommendedReviewType, getRecommendedReviewTypeLabel, getRegistrationStatusLabel, getReviewRequestStatusLabel, getStrongestBehaviorSignal, getTribeDisplayLabel, getTribeValidationLabel, getVisitorStageLabel, isModuleEnabled, shouldRecommendTribeReview, tribeQuestionnaireV1 } from "@alvo/domain";
import type { OrganizationSettingsSnapshot, TribeCode } from "@alvo/types";

function getPersonDisplayName(person: any) { return person.firstName + " " + person.lastName; }
function getPersonName(personId: string) { return personId; }
function normalizeSearch(query: string) { return query.toLowerCase(); }

export const organization = {
  id: "org_alvo_demo",
  name: "Getro Church",
  slug: "getro-church",
  status: "active",
  timezone: "America/Belem",
  locale: "pt-BR",
  countryCode: "BR"
} as const;

export const tenantSettings: OrganizationSettingsSnapshot = {
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

export const currentUser = {
  id: "user_admin_demo",
  organizationId: organization.id,
  email: "admin@alvochurch.app",
  roles: ["church_admin"],
  campusIds: [],
  isActive: true
} as const;

export const recentPeople = [
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
    nextActionAt: "2026-03-18T19:00:00.000Z"
  }
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

export const activeGroups = [
  { id: "group_1", organizationId: organization.id, name: "Célula Centro Norte", slug: "celula-centro-norte", type: "cell", status: "active", visibility: "internal", meetingDayOfWeek: 3, meetingTime: "19:30", city: "Belém", state: "PA", capacity: 18, tribeCode: "ASHER" as TribeCode },
  { id: "group_2", organizationId: organization.id, name: "Classe de Integração", slug: "classe-integracao", type: "class", status: "active", visibility: "internal", meetingDayOfWeek: 0, meetingTime: "09:00", city: "Belém", state: "PA", capacity: 30, tribeCode: "LEVI" as TribeCode },
  { id: "group_3", organizationId: organization.id, name: "Célula Nazaré", slug: "celula-nazare", type: "cell", status: "active", visibility: "internal", meetingDayOfWeek: 5, meetingTime: "19:00", city: "Belém", state: "PA", capacity: 15, tribeCode: "JUDAH" as TribeCode },
  { id: "group_4", organizationId: organization.id, name: "Célula Cremação", slug: "celula-cremacao", type: "cell", status: "active", visibility: "internal", meetingDayOfWeek: 2, meetingTime: "20:00", city: "Belém", state: "PA", capacity: 12, tribeCode: "ISSACHAR" as TribeCode },
  { id: "group_5", organizationId: organization.id, name: "Grupo de Intercessão", slug: "grupo-intercessao", type: "small_group", status: "active", visibility: "internal", meetingDayOfWeek: 1, meetingTime: "07:00", city: "Belém", state: "PA", capacity: 20, tribeCode: "LEVI" as TribeCode },
  { id: "group_6", organizationId: organization.id, name: "Célula Tapanã", slug: "celula-tapana", type: "cell", status: "active", visibility: "internal", meetingDayOfWeek: 4, meetingTime: "19:30", city: "Belém", state: "PA", capacity: 14, tribeCode: "JOSEPH" as TribeCode },
  { id: "group_7", organizationId: organization.id, name: "Ministério de Dança", slug: "ministerio-danca", type: "ministry_team", status: "active", visibility: "internal", meetingDayOfWeek: 6, meetingTime: "09:00", city: "Belém", state: "PA", capacity: 25, tribeCode: "NAPHTALI" as TribeCode },
  { id: "group_8", organizationId: organization.id, name: "Célula Sacramenta", slug: "celula-sacramenta", type: "cell", status: "active", visibility: "internal", meetingDayOfWeek: 3, meetingTime: "19:00", city: "Belém", state: "PA", capacity: 16, tribeCode: "ZEBULUN" as TribeCode },
  { id: "group_9", organizationId: organization.id, name: "Equipe de Adoração", slug: "equipe-adoracao", type: "ministry_team", status: "active", visibility: "internal", meetingDayOfWeek: 6, meetingTime: "14:00", city: "Belém", state: "PA", capacity: 30, tribeCode: "LEVI" as TribeCode },
  { id: "group_10", organizationId: organization.id, name: "Célula Jurunas", slug: "celula-jurunas", type: "cell", status: "active", visibility: "internal", meetingDayOfWeek: 2, meetingTime: "19:30", city: "Belém", state: "PA", capacity: 12, tribeCode: "GAD" as TribeCode },
  { id: "group_11", organizationId: organization.id, name: "Grupo de Negócios", slug: "grupo-negocios", type: "small_group", status: "active", visibility: "internal", meetingDayOfWeek: 5, meetingTime: "07:00", city: "Belém", state: "PA", capacity: 20, tribeCode: "ZEBULUN" as TribeCode },
  { id: "group_12", organizationId: organization.id, name: "Célula Bengui", slug: "celula-bengui", type: "cell", status: "active", visibility: "internal", meetingDayOfWeek: 4, meetingTime: "20:00", city: "Belém", state: "PA", capacity: 15, tribeCode: "MANASSEH" as TribeCode },
  { id: "group_13", organizationId: organization.id, name: "Ministério Infantil", slug: "ministerio-infantil", type: "ministry_team", status: "active", visibility: "internal", meetingDayOfWeek: 0, meetingTime: "09:00", city: "Belém", state: "PA", capacity: 40, tribeCode: "ASHER" as TribeCode },
  { id: "group_14", organizationId: organization.id, name: "Célula Pedreira", slug: "celula-pedreira", type: "cell", status: "active", visibility: "internal", meetingDayOfWeek: 3, meetingTime: "19:30", city: "Belém", state: "PA", capacity: 14, tribeCode: "EPHRAIM" as TribeCode },
  { id: "group_15", organizationId: organization.id, name: "Grupo de Jovens", slug: "grupo-jovens", type: "youth_group", status: "active", visibility: "internal", meetingDayOfWeek: 6, meetingTime: "16:00", city: "Belém", state: "PA", capacity: 50, tribeCode: "BENJAMIN" as TribeCode },
  { id: "group_16", organizationId: organization.id, name: "Célula Entroncamento", slug: "celula-entroncamento", type: "cell", status: "active", visibility: "internal", meetingDayOfWeek: 1, meetingTime: "19:00", city: "Belém", state: "PA", capacity: 12, tribeCode: "REUBEN" as TribeCode },
  { id: "group_17", organizationId: organization.id, name: "Equipe de Comunicação", slug: "equipe-comunicacao", type: "ministry_team", status: "active", visibility: "internal", meetingDayOfWeek: 4, meetingTime: "19:00", city: "Belém", state: "PA", capacity: 15, tribeCode: "ISSACHAR" as TribeCode },
  { id: "group_18", organizationId: organization.id, name: "Célula Marco", slug: "celula-marco", type: "cell", status: "active", visibility: "internal", meetingDayOfWeek: 2, meetingTime: "20:00", city: "Belém", state: "PA", capacity: 16, tribeCode: "JUDAH" as TribeCode }
] as const;

export const upcomingMeetings = [
  {
    id: "meeting_1",
    organizationId: organization.id,
    groupId: "group_1",
    scheduledStartAt: "2026-03-18T22:30:00.000Z",
    scheduledEndAt: "2026-03-18T23:45:00.000Z",
    meetingStatus: "scheduled"
  }
] as const;

export const latestAttendance = [
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

export const latestRegistrations = [
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

export const latestEventCheckIns = [
  {
    id: "event_checkin_1",
    organizationId: organization.id,
    eventId: "event_1",
    personId: "person_2",
    registrationPersonId: "registration_person_1",
    checkedInAt: "2026-03-18T12:30:00.000Z"
  }
] as const;

export const journeyProfiles = [
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

export const activeMissions = [
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

export const earnedBadges = [
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

export const tribeDefinitions = [
  { id: "tribe_levi", organizationId: organization.id, code: "LEVI", name: "Levi", description: "Adoração, culto e serviço no ambiente espiritual.", ministrySummary: "Louvor, intercessão, suporte ao culto e presença de Deus", isActive: true },
  { id: "tribe_judah", organizationId: organization.id, code: "JUDAH", name: "Judá", description: "Liderança, governo e direção ministerial.", ministrySummary: "Liderança pastoral, supervisão e condução de pessoas", isActive: true },
  { id: "tribe_asher", organizationId: organization.id, code: "ASHER", name: "Aser", description: "Acolhimento, hospitalidade e cuidado prático.", ministrySummary: "Recepção, integração e cuidado de famílias", isActive: true },
  { id: "tribe_issachar", organizationId: organization.id, code: "ISSACHAR", name: "Issacar", description: "Discernimento de tempos e estratégia pastoral.", ministrySummary: "Comunicação, ensino e planejamento estratégico", isActive: true },
  { id: "tribe_joseph", organizationId: organization.id, code: "JOSEPH", name: "José", description: "Administração, recursos e gestão com excelência.", ministrySummary: "Finanças, logística e estrutura organizacional", isActive: true },
  { id: "tribe_naphtali", organizationId: organization.id, code: "NAPHTALI", name: "Naftali", description: "Expressão, artes e comunicação com leveza.", ministrySummary: "Dança, teatro, mídias e expressão artística", isActive: true },
  { id: "tribe_zebulun", organizationId: organization.id, code: "ZEBULUN", name: "Zebulom", description: "Missões, alcance e expansão do Reino.", ministrySummary: "Evangelismo, missões urbanas e alcance comunitário", isActive: true },
  { id: "tribe_gad", organizationId: organization.id, code: "GAD", name: "Gade", description: "Proteção, intercessão e cobertura espiritual.", ministrySummary: "Intercession, segurança espiritual e vigílias", isActive: true },
  { id: "tribe_manasseh", organizationId: organization.id, code: "MANASSEH", name: "Manassés", description: "Cura, restauração e cuidado pastoral.", ministrySummary: "Aconselhamento, cuidado de feridos e restauração", isActive: true },
  { id: "tribe_ephraim", organizationId: organization.id, code: "EPHRAIM", name: "Efraim", description: "Ensino, discipulado e formação de líderes.", ministrySummary: "Escola bíblica, discipulado e formação ministerial", isActive: true },
  { id: "tribe_benjamin", organizationId: organization.id, code: "BENJAMIN", name: "Benjamim", description: "Juventude, ousadia e vanguarda espiritual.", ministrySummary: "Ministério jovem, inovação e movimentos de renovação", isActive: true },
  { id: "tribe_reuben", organizationId: organization.id, code: "REUBEN", name: "Rúben", description: "Reconciliação, cuidado familiar e restauração de vínculos.", ministrySummary: "Aconselhamento familiar, mediação e restauração", isActive: true }
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
    reviewDueAt: "2026-03-25T09:00:00.000Z"
  }
] as const;

export const behaviorSignals = [
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

export const tribeAnswerPreview = [
  { questionCode: "q1", optionCode: "e" },
  { questionCode: "q2", optionCode: "d" },
  { questionCode: "q3", optionCode: "d" },
  { questionCode: "q4", optionCode: "e" },
  { questionCode: "q5", optionCode: "e" }
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
  behaviorSignals: [...behaviorSignals]
});

export const questionnaireResult = calculateTribeQuestionnaireResult(tribeAnswerPreview);

export const personNames: Map<string, string> = new Map(
  recentPeople.map((person) => [
    person.id,
    getPersonDisplayName(person)
  ])
);

export const familyPanorama = families.map((familySnapshot) => {
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

export const neighborhoodDistribution = familyPanorama.reduce<Array<{ label: string; value: number }>>(
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

export const familyInsightMetrics = [
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

export const memberPassPreview = recentPeople
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

export const weeklyMomentum = [
  { label: "Dom", value: 58 },
  { label: "Seg", value: 45 },
  { label: "Ter", value: 64 },
  { label: "Qua", value: 81 },
  { label: "Qui", value: 74 },
  { label: "Sex", value: 67 },
  { label: "Sab", value: 88 }
];

export const navItems = [
  { label: "Resumo", icon: LayoutDashboard, href: "#overview" },
  { label: "Pessoas", icon: UsersRound, href: "/members" },
  { label: "Familias", icon: HeartHandshake, href: "#families" },
  { label: "Jornadas", icon: MapIcon, href: "/journeys" },
  { label: "Portaria", icon: ClipboardList, href: "/reception" },
  { label: "Celulas", icon: Waypoints, href: "/groups" },
  { label: "Escalas", icon: Handshake, href: "/serving" },
  { label: "Eventos", icon: CalendarDays, href: "#events" },
  { label: "Comunicacao", icon: MessageSquareText, href: "#actions" },
  { label: "Transparencia", icon: Landmark, href: "#transparency" }
];

export const kpis = [
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

export const moduleHighlights = [
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
    href: "/reception",
    icon: ClipboardList,
    enabled: isModuleEnabled(tenantSettings.features, "visitors"),
    action: "Capturar visitante"
  },
  {
    label: "Jornadas",
    description: "Proximos passos, missoes e progresso para cada pessoa acompanhada.",
    href: "/journeys",
    icon: Trophy,
    enabled: isModuleEnabled(tenantSettings.features, "journeys"),
    action: "Ver progresso"
  },
  {
    label: "Celulas e eventos",
    description: "Convites, presencas, check-ins e integracao pratica na agenda da igreja.",
    href: "/groups",
    icon: Waypoints,
    enabled:
      isModuleEnabled(tenantSettings.features, "groups") &&
      isModuleEnabled(tenantSettings.features, "events"),
    action: "Organizar agenda"
  },
  {
    label: "Escalas e equipes",
    description: "Voluntarios, ministerios, confirmacoes, justificativas e funcionarios contratados.",
    href: "/serving",
    icon: Handshake,
    enabled: isModuleEnabled(tenantSettings.features, "volunteers"),
    action: "Montar escala"
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

export const operationalShortcuts = [
  {
    label: "Painel geral",
    title: "Visao completa",
    description: "Volte para o resumo executivo com indicadores, filas e modulos.",
    href: "#overview",
    icon: LayoutDashboard,
    meta: "Home do projeto"
  },
  {
    label: "Portaria",
    title: "Recepcao dedicada",
    description: "Tela rapida para tablet ou notebook na entrada da celebracao.",
    href: "/reception",
    icon: ClipboardList,
    meta: "Modulo dedicado"
  },
  {
    label: "Membros",
    title: "Base pastoral",
    description: "Lista de pessoas, familias, filtros e fichas completas.",
    href: "/members",
    icon: UsersRound,
    meta: `${recentPeople.length} perfis demo`
  },
  {
    label: "Jornadas",
    title: "Funil vivo",
    description: "Acompanhe convidado, aspirante, membro e integracao em celula.",
    href: "/journeys",
    icon: MapIcon,
    meta: "Fluxo completo"
  },
  {
    label: "Celulas",
    title: "Comunidade pequena",
    description: "Veja grupos, participantes, presencas e pessoas ainda sem celula.",
    href: "/groups",
    icon: Waypoints,
    meta: `${activeGroups.length} grupos ativos`
  },
  {
    label: "Escalas",
    title: "Servidores e equipes",
    description: "Monte escalas, confirme presencas e acompanhe justificativas.",
    href: "/serving",
    icon: Handshake,
    meta: "Voluntarios"
  },
  {
    label: "Novo cadastro",
    title: "Cadastrar membro",
    description: "Crie pessoa, familia, LGPD e Getro Pass em uma ficha.",
    href: "/members/new",
    icon: UserPlus,
    meta: "Secretaria"
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

export const transparencySummary = {
  month: "Marco 2026",
  income: 42850,
  expenses: 31740,
  missions: 6200,
  balance: 11110,
  publicationStatus: "Rascunho interno"
};

export const transparencyEntries = [
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

export const partnerOrganizations = [
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
    exposedFields: ["firstName", "memberActive", "benefitEligible"]
  }
] as const;

export const partnerBenefitPreview = partnerBenefits.map((benefit) => ({
  ...benefit,
  partner: partnerOrganizations.find((partner) => partner.id === benefit.partnerId),
  validations: memberBenefitValidations.filter(
    (validation) => validation.benefitId === benefit.id
  )
}));

export const actionFeed = [
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

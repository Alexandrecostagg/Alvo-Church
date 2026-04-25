import type {
  Event,
  EventCheckIn,
  EventRegistration,
  Family,
  FamilyMember,
  FinancialTransparencyReport,
  FollowUpTask,
  Group,
  GroupAttendance,
  GroupMeeting,
  Organization,
  OrganizationBrandingSettings,
  OrganizationFeaturesSettings,
  OrganizationSubscriptionSettings,
  Person,
  VisitorIntake,
  VisitorJourney
} from "@alvo/types";

export const seedOrganization: Organization = {
  id: "org_alvo_demo",
  name: "Getro Church",
  legalName: "Getro Church Tecnologia para Igrejas Ltda.",
  publicName: "Getro Church",
  displayName: "Getro Church",
  slug: "getro-church",
  status: "active",
  timezone: "America/Belem",
  locale: "pt-BR",
  countryCode: "BR",
  organizationType: "church"
};

export const seedOrganizationBranding: OrganizationBrandingSettings = {
  organizationId: seedOrganization.id,
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
};

export const seedOrganizationSubscription: OrganizationSubscriptionSettings = {
  organizationId: seedOrganization.id,
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
};

export const seedOrganizationFeatures: OrganizationFeaturesSettings = {
  organizationId: seedOrganization.id,
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
};

export const seedPeople: Person[] = [
  {
    id: "person_1",
    organizationId: seedOrganization.id,
    primaryFamilyId: "family_1",
    firstName: "Ana",
    lastName: "Silva",
    preferredName: "Ana",
    email: "ana@alvochurch.app",
    mobilePhone: "+5591991111111",
    whatsappPhone: "+5591991111111",
    personType: "adult",
    memberStatus: "member",
    status: "active",
    tribePrimaryCode: "ASHER",
    tribeSecondaryCode: "MANASSEH"
  },
  {
    id: "person_2",
    organizationId: seedOrganization.id,
    firstName: "Lucas",
    lastName: "Costa",
    email: "lucas@alvochurch.app",
    mobilePhone: "+5591992222222",
    whatsappPhone: "+5591992222222",
    personType: "young_adult",
    memberStatus: "visitor",
    status: "active",
    tribePrimaryCode: "LEVI",
    tribeSecondaryCode: "NAPHTALI"
  },
  {
    id: "person_3",
    organizationId: seedOrganization.id,
    primaryFamilyId: "family_2",
    firstName: "Marina",
    lastName: "Souza",
    email: "marina@alvochurch.app",
    mobilePhone: "+5591993333333",
    whatsappPhone: "+5591993333333",
    personType: "adult",
    memberStatus: "leader",
    status: "active",
    tribePrimaryCode: "JUDAH",
    tribeSecondaryCode: "ISSACHAR"
  }
];

export const seedFamilies: Family[] = [
  {
    id: "family_1",
    organizationId: seedOrganization.id,
    familyName: "Silva",
    displayName: "Familia Silva",
    status: "active"
  },
  {
    id: "family_2",
    organizationId: seedOrganization.id,
    familyName: "Souza",
    displayName: "Casa Souza",
    status: "active"
  }
];

export const seedFamilyMembers: FamilyMember[] = [
  {
    id: "family_member_1",
    organizationId: seedOrganization.id,
    familyId: "family_1",
    personId: "person_1",
    relationshipType: "self",
    isPrimaryContact: true,
    isFinancialResponsible: true,
    isLegalGuardian: true
  },
  {
    id: "family_member_2",
    organizationId: seedOrganization.id,
    familyId: "family_2",
    personId: "person_3",
    relationshipType: "self",
    isPrimaryContact: true,
    isFinancialResponsible: true,
    isLegalGuardian: true
  }
];

export const seedVisitorJourneys: VisitorJourney[] = [
  {
    id: "journey_1",
    organizationId: seedOrganization.id,
    personId: "person_2",
    originChannel: "whatsapp",
    currentStage: "new_visitor",
    status: "active",
    assignedToUserId: "user_admin_demo",
    firstVisitDate: "2026-03-16",
    nextActionAt: "2026-03-18T19:00:00.000Z"
  }
];

export const seedFollowUpTasks: FollowUpTask[] = [
  {
    id: "followup_1",
    organizationId: seedOrganization.id,
    personId: "person_2",
    visitorJourneyId: "journey_1",
    assignedToUserId: "user_admin_demo",
    title: "Enviar mensagem de boas-vindas",
    type: "welcome_message",
    status: "open",
    dueAt: "2026-03-18T19:00:00.000Z"
  },
  {
    id: "followup_2",
    organizationId: seedOrganization.id,
    personId: "person_2",
    visitorJourneyId: "journey_1",
    assignedToUserId: "user_admin_demo",
    title: "Convidar para uma celula",
    type: "invite_to_group",
    status: "in_progress",
    dueAt: "2026-03-20T19:00:00.000Z"
  }
];

export const seedVisitorIntakes: VisitorIntake[] = [
  {
    id: "visitor_intake_1",
    organizationId: seedOrganization.id,
    personId: "person_2",
    journeyId: "journey_1",
    name: "Lucas Costa",
    phone: "+5591992222222",
    source: "WhatsApp",
    status: "journey_created",
    greeting: "Cumprimentar na recepcao e convidar para a celula Centro Norte",
    capturedByUserId: "user_admin_demo",
    createdAt: "2026-03-16T18:20:00.000Z"
  },
  {
    id: "visitor_intake_2",
    organizationId: seedOrganization.id,
    name: "Bianca Torres",
    phone: "+5591977772211",
    source: "Convite de membro",
    status: "captured",
    greeting: "Incluir nos cumprimentos da celebracao",
    capturedByUserId: "user_admin_demo",
    createdAt: "2026-03-18T13:10:00.000Z"
  }
];

export const seedFinancialTransparencyReports: FinancialTransparencyReport[] = [
  {
    id: "marco-2026",
    organizationId: seedOrganization.id,
    month: "Marco 2026",
    income: 42850,
    expenses: 31740,
    missions: 6200,
    balance: 11110,
    status: "published",
    publishedAt: "2026-03-31T21:00:00.000Z",
    publishedByUserId: "user_admin_demo",
    entries: [
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
    ]
  }
];

export const seedGroups: Group[] = [
  {
    id: "group_1",
    organizationId: seedOrganization.id,
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
    organizationId: seedOrganization.id,
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
];

export const seedGroupMeetings: GroupMeeting[] = [
  {
    id: "meeting_1",
    organizationId: seedOrganization.id,
    groupId: "group_1",
    scheduledStartAt: "2026-03-18T22:30:00.000Z",
    scheduledEndAt: "2026-03-18T23:45:00.000Z",
    meetingStatus: "scheduled"
  }
];

export const seedGroupAttendance: GroupAttendance[] = [
  {
    id: "attendance_1",
    organizationId: seedOrganization.id,
    groupId: "group_1",
    groupMeetingId: "meeting_1",
    personId: "person_1",
    attendanceStatus: "present"
  },
  {
    id: "attendance_2",
    organizationId: seedOrganization.id,
    groupId: "group_1",
    groupMeetingId: "meeting_1",
    personId: "person_2",
    attendanceStatus: "first_time_guest"
  }
];

export const seedEvents: Event[] = [
  {
    id: "event_1",
    organizationId: seedOrganization.id,
    name: "Encontro de Boas-vindas",
    slug: "encontro-boas-vindas",
    description: "Apresentacao da visao e da cultura da igreja.",
    type: "integration_class",
    status: "published",
    locationType: "onsite",
    startsAt: "2026-03-23T22:00:00.000Z",
    endsAt: "2026-03-24T00:00:00.000Z",
    capacity: 60,
    isPaid: false
  },
  {
    id: "event_2",
    organizationId: seedOrganization.id,
    name: "Treinamento de Lideres",
    slug: "treinamento-lideres",
    description: "Capacitacao para lideranca e supervisao.",
    type: "training",
    status: "published",
    locationType: "hybrid",
    startsAt: "2026-03-29T13:00:00.000Z",
    endsAt: "2026-03-29T16:00:00.000Z",
    capacity: 40,
    isPaid: false
  }
];

export const seedEventRegistrations: EventRegistration[] = [
  {
    id: "registration_1",
    organizationId: seedOrganization.id,
    eventId: "event_1",
    responsiblePersonId: "person_2",
    registrationCode: "ALVO-CHK-001",
    status: "confirmed",
    paymentStatus: "not_required",
    registeredAt: "2026-03-17T15:00:00.000Z"
  },
  {
    id: "registration_2",
    organizationId: seedOrganization.id,
    eventId: "event_2",
    responsiblePersonId: "person_3",
    registrationCode: "ALVO-LID-002",
    status: "pending",
    paymentStatus: "not_required",
    registeredAt: "2026-03-18T13:00:00.000Z"
  }
];

export const seedEventCheckIns: EventCheckIn[] = [
  {
    id: "checkin_1",
    organizationId: seedOrganization.id,
    eventId: "event_1",
    personId: "person_2",
    registrationPersonId: "registration_1_person_1",
    checkedInAt: "2026-03-17T18:55:00.000Z"
  }
];

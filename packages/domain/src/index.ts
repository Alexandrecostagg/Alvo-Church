import type {
  AppRole,
  AuthUser,
  DashboardSnapshot,
  Event,
  EventCheckIn,
  EventRegistration,
  Family,
  FamilyMember,
  FirestorePathMap,
  FollowUpTask,
  Group,
  GroupAttendance,
  GroupMeeting,
  JourneyMission,
  JourneyStage,
  JourneysDashboardSnapshot,
  MemberBadge,
  MemberJourneyProfile,
  MemberTribeProfile,
  Organization,
  OrganizationBrandingSettings,
  OrganizationFeaturesSettings,
  OrganizationSettingsSnapshot,
  OrganizationSubscriptionSettings,
  PeopleDashboardSnapshot,
  PeopleListItem,
  Person,
  TenantContext,
  TribeAnswer,
  TribeAssessment,
  TribeAssessmentScore,
  TribeBehaviorSignal,
  TribeDefinition,
  TribeCode,
  TribeQuestion,
  TribeQuestionnaire,
  TribeQuestionnaireResult,
  TribeReclassificationSnapshot,
  TribeRecommendedReviewType,
  TribeReviewRequest,
  TribesDashboardSnapshot,
  EventsDashboardSnapshot,
  GroupsDashboardSnapshot,
  VisitorDashboardSnapshot,
  VisitorJourney
} from "@alvo/types";

export function getDefaultJourneyStage(): JourneyStage {
  return "exploring";
}

export function getSuggestedTribeLabel(tribe: TribeCode) {
  return tribe;
}

export function hasRole(user: AuthUser, role: AppRole) {
  return user.roles.includes(role);
}

export function canManagePeople(user: AuthUser) {
  return (
    hasRole(user, "super_admin") ||
    hasRole(user, "church_admin") ||
    hasRole(user, "pastor") ||
    hasRole(user, "secretary")
  );
}

export function getTenantPaths(context: TenantContext): FirestorePathMap {
  const base = `organizations/${context.organizationId}`;
  const settingsBase = `${base}/settings`;

  return {
    organizations: "organizations",
    campuses: `${base}/campuses`,
    users: `${base}/users`,
    people: `${base}/people`,
    families: `${base}/families`,
    visitorIntakes: `${base}/visitorIntakes`,
    groups: `${base}/groups`,
    events: `${base}/events`,
    tribes: `${base}/tribes`,
    financeReports: `${base}/financeReports`,
    settings: settingsBase,
    branding: `${settingsBase}/branding`,
    subscription: `${settingsBase}/subscription`,
    features: `${settingsBase}/features`
  };
}

export function getOrganizationDisplayName(organization: Organization) {
  return organization.displayName || organization.publicName || organization.name;
}

export function isModuleEnabled(
  features: OrganizationFeaturesSettings,
  moduleKey: keyof OrganizationFeaturesSettings["modules"]
) {
  return features.modules[moduleKey].enabled;
}

export function getEnabledModuleCount(features: OrganizationFeaturesSettings) {
  return Object.values(features.modules).filter((module) => module.enabled).length;
}

export function getBrandModeLabel(brandMode: OrganizationBrandingSettings["brandMode"]) {
  switch (brandMode) {
    case "alvo_managed":
      return "Marca Alvo";
    case "co_branded":
      return "Co-branded";
    case "white_label":
      return "White-label";
  }
}

export function getPlanTierLabel(planTier: OrganizationSubscriptionSettings["planTier"]) {
  switch (planTier) {
    case "base":
      return "Base";
    case "growth":
      return "Growth";
    case "advanced":
      return "Advanced";
    case "enterprise":
      return "Enterprise";
  }
}

export function createOrganizationSettingsSnapshot(params: {
  branding: OrganizationBrandingSettings;
  subscription: OrganizationSubscriptionSettings;
  features: OrganizationFeaturesSettings;
}): OrganizationSettingsSnapshot {
  return {
    branding: params.branding,
    subscription: params.subscription,
    features: params.features
  };
}

export function createDashboardSnapshot(params: {
  organization: Organization;
  currentUser: AuthUser;
}): DashboardSnapshot {
  return {
    organization: params.organization,
    currentUser: params.currentUser,
    totals: {
      people: 0,
      families: 0,
      visitors: 0,
      groups: 0
    }
  };
}

export function getPersonFullName(person: Pick<Person, "firstName" | "lastName" | "preferredName">) {
  if (person.preferredName) {
    return person.preferredName;
  }

  return `${person.firstName} ${person.lastName}`.trim();
}

export function toPeopleListItem(person: Person): PeopleListItem {
  return {
    id: person.id,
    fullName: getPersonFullName(person),
    memberStatus: person.memberStatus,
    personType: person.personType,
    campusId: person.campusId,
    primaryFamilyId: person.primaryFamilyId,
    tribePrimaryCode: person.tribePrimaryCode
  };
}

export function createFamilyDisplayName(family: Pick<Family, "displayName" | "familyName">) {
  return family.displayName || family.familyName;
}

export function countGuardians(members: readonly FamilyMember[]) {
  return members.filter((member) => member.isLegalGuardian).length;
}

export function createPeopleDashboardSnapshot(params: {
  organization: Organization;
  currentUser: AuthUser;
  recentPeople: Person[];
  families: Array<{
    family: Family;
    members: readonly FamilyMember[];
  }>;
}): PeopleDashboardSnapshot {
  const base = createDashboardSnapshot({
    organization: params.organization,
    currentUser: params.currentUser
  });

  return {
    ...base,
    totals: {
      ...base.totals,
      people: params.recentPeople.length,
      families: params.families.length,
      visitors: params.recentPeople.filter((person) => person.memberStatus === "visitor").length
    },
    recentPeople: params.recentPeople.map(toPeopleListItem),
    activeFamilies: params.families
  };
}

export function getVisitorStageLabel(stage: VisitorJourney["currentStage"]) {
  switch (stage) {
    case "new_visitor":
      return "Novo visitante";
    case "welcomed":
      return "Recebido";
    case "invited_to_group":
      return "Convidado para grupo";
    case "attending_class":
      return "Em integracao";
    case "ready_for_membership":
      return "Pronto para membresia";
    case "completed":
      return "Concluido";
  }
}

export function getFollowUpStatusLabel(status: FollowUpTask["status"]) {
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

export function getOpenFollowUps(tasks: readonly FollowUpTask[]) {
  return tasks.filter((task) => task.status === "open" || task.status === "in_progress");
}

export function createVisitorDashboardSnapshot(params: {
  organization: Organization;
  currentUser: AuthUser;
  recentPeople: Person[];
  families: Array<{
    family: Family;
    members: readonly FamilyMember[];
  }>;
  activeJourneys: VisitorJourney[];
  followUps: FollowUpTask[];
}): VisitorDashboardSnapshot {
  const peopleSnapshot = createPeopleDashboardSnapshot({
    organization: params.organization,
    currentUser: params.currentUser,
    recentPeople: params.recentPeople,
    families: params.families
  });

  return {
    ...peopleSnapshot,
    activeJourneys: params.activeJourneys,
    openFollowUps: getOpenFollowUps(params.followUps)
  };
}

export function getGroupTypeLabel(type: Group["type"]) {
  switch (type) {
    case "cell":
      return "Celula";
    case "small_group":
      return "Pequeno grupo";
    case "class":
      return "Classe";
    case "youth_group":
      return "Grupo de jovens";
    case "ministry_team":
      return "Time ministerial";
  }
}

export function getAttendanceStatusLabel(status: GroupAttendance["attendanceStatus"]) {
  switch (status) {
    case "present":
      return "Presente";
    case "absent":
      return "Ausente";
    case "justified":
      return "Justificado";
    case "first_time_guest":
      return "Visitante pela primeira vez";
  }
}

export function createGroupsDashboardSnapshot(params: {
  organization: Organization;
  currentUser: AuthUser;
  recentPeople: Person[];
  families: Array<{
    family: Family;
    members: readonly FamilyMember[];
  }>;
  activeJourneys: VisitorJourney[];
  followUps: FollowUpTask[];
  activeGroups: Group[];
  upcomingMeetings: GroupMeeting[];
  latestAttendance: GroupAttendance[];
}): GroupsDashboardSnapshot {
  const visitorSnapshot = createVisitorDashboardSnapshot({
    organization: params.organization,
    currentUser: params.currentUser,
    recentPeople: params.recentPeople,
    families: params.families,
    activeJourneys: params.activeJourneys,
    followUps: params.followUps
  });

  return {
    ...visitorSnapshot,
    totals: {
      ...visitorSnapshot.totals,
      groups: params.activeGroups.length
    },
    activeGroups: params.activeGroups,
    upcomingMeetings: params.upcomingMeetings,
    latestAttendance: params.latestAttendance
  };
}

export function getEventTypeLabel(type: Event["type"]) {
  switch (type) {
    case "service":
      return "Culto";
    case "conference":
      return "Conferencia";
    case "retreat":
      return "Retiro";
    case "training":
      return "Treinamento";
    case "integration_class":
      return "Classe de integracao";
    case "kids_event":
      return "Evento infantil";
  }
}

export function getRegistrationStatusLabel(status: EventRegistration["status"]) {
  switch (status) {
    case "confirmed":
      return "Confirmada";
    case "pending":
      return "Pendente";
    case "cancelled":
      return "Cancelada";
  }
}

export function createEventsDashboardSnapshot(params: {
  organization: Organization;
  currentUser: AuthUser;
  recentPeople: Person[];
  families: Array<{
    family: Family;
    members: readonly FamilyMember[];
  }>;
  activeJourneys: VisitorJourney[];
  followUps: FollowUpTask[];
  activeGroups: Group[];
  upcomingMeetings: GroupMeeting[];
  latestAttendance: GroupAttendance[];
  publishedEvents: Event[];
  latestRegistrations: EventRegistration[];
  latestEventCheckIns: EventCheckIn[];
}): EventsDashboardSnapshot {
  const groupsSnapshot = createGroupsDashboardSnapshot({
    organization: params.organization,
    currentUser: params.currentUser,
    recentPeople: params.recentPeople,
    families: params.families,
    activeJourneys: params.activeJourneys,
    followUps: params.followUps,
    activeGroups: params.activeGroups,
    upcomingMeetings: params.upcomingMeetings,
    latestAttendance: params.latestAttendance
  });

  return {
    ...groupsSnapshot,
    publishedEvents: params.publishedEvents,
    latestRegistrations: params.latestRegistrations,
    latestEventCheckIns: params.latestEventCheckIns
  };
}

export function getJourneyKindLabel(kind: MemberJourneyProfile["currentJourneyKind"]) {
  switch (kind) {
    case "visitor":
      return "Visitante";
    case "belonging":
      return "Pertencimento";
    case "service":
      return "Servico";
    case "development":
      return "Desenvolvimento";
    case "leadership":
      return "Lideranca";
    case "care":
      return "Cuidado";
  }
}

export function getMissionStatusLabel(status: JourneyMission["status"]) {
  switch (status) {
    case "locked":
      return "Bloqueada";
    case "available":
      return "Disponivel";
    case "completed":
      return "Concluida";
    case "skipped":
      return "Ignorada";
  }
}

export function createJourneysDashboardSnapshot(params: {
  organization: Organization;
  currentUser: AuthUser;
  recentPeople: Person[];
  families: Array<{
    family: Family;
    members: readonly FamilyMember[];
  }>;
  activeJourneys: VisitorJourney[];
  followUps: FollowUpTask[];
  activeGroups: Group[];
  upcomingMeetings: GroupMeeting[];
  latestAttendance: GroupAttendance[];
  publishedEvents: Event[];
  latestRegistrations: EventRegistration[];
  latestEventCheckIns: EventCheckIn[];
  journeyProfiles: MemberJourneyProfile[];
  activeMissions: JourneyMission[];
  earnedBadges: MemberBadge[];
}): JourneysDashboardSnapshot {
  const eventsSnapshot = createEventsDashboardSnapshot({
    organization: params.organization,
    currentUser: params.currentUser,
    recentPeople: params.recentPeople,
    families: params.families,
    activeJourneys: params.activeJourneys,
    followUps: params.followUps,
    activeGroups: params.activeGroups,
    upcomingMeetings: params.upcomingMeetings,
    latestAttendance: params.latestAttendance,
    publishedEvents: params.publishedEvents,
    latestRegistrations: params.latestRegistrations,
    latestEventCheckIns: params.latestEventCheckIns
  });

  return {
    ...eventsSnapshot,
    journeyProfiles: params.journeyProfiles,
    activeMissions: params.activeMissions,
    earnedBadges: params.earnedBadges
  };
}

export function getTribeDisplayLabel(tribeCode: TribeCode) {
  switch (tribeCode) {
    case "LEVI":
      return "Levi";
    case "JUDAH":
      return "Juda";
    case "ISSACHAR":
      return "Issacar";
    case "JOSEPH":
      return "Jose";
    case "ASHER":
      return "Aser";
    case "NAPHTALI":
      return "Naftali";
    case "ZEBULUN":
      return "Zebulom";
    case "GAD":
      return "Gade";
    case "MANASSEH":
      return "Manasses";
    case "EPHRAIM":
      return "Efraim";
    case "BENJAMIN":
      return "Benjamim";
    case "REUBEN":
      return "Ruben";
  }
}

export function getTribeValidationLabel(status: MemberTribeProfile["validationStatus"]) {
  switch (status) {
    case "not_required":
      return "Nao exige validacao";
    case "pending":
      return "Pendente";
    case "validated":
      return "Validada";
    case "adjusted":
      return "Ajustada";
  }
}

export function rankTribeScores(scores: readonly TribeAssessmentScore[]) {
  return [...scores].sort((left, right) => left.rankPosition - right.rankPosition);
}

export function createTribesDashboardSnapshot(params: {
  organization: Organization;
  currentUser: AuthUser;
  recentPeople: Person[];
  families: Array<{
    family: Family;
    members: readonly FamilyMember[];
  }>;
  activeJourneys: VisitorJourney[];
  followUps: FollowUpTask[];
  activeGroups: Group[];
  upcomingMeetings: GroupMeeting[];
  latestAttendance: GroupAttendance[];
  publishedEvents: Event[];
  latestRegistrations: EventRegistration[];
  latestEventCheckIns: EventCheckIn[];
  journeyProfiles: MemberJourneyProfile[];
  activeMissions: JourneyMission[];
  earnedBadges: MemberBadge[];
  tribeDefinitions: TribeDefinition[];
  latestTribeAssessments: TribeAssessment[];
  currentTribeProfiles: MemberTribeProfile[];
}): TribesDashboardSnapshot {
  const journeysSnapshot = createJourneysDashboardSnapshot({
    organization: params.organization,
    currentUser: params.currentUser,
    recentPeople: params.recentPeople,
    families: params.families,
    activeJourneys: params.activeJourneys,
    followUps: params.followUps,
    activeGroups: params.activeGroups,
    upcomingMeetings: params.upcomingMeetings,
    latestAttendance: params.latestAttendance,
    publishedEvents: params.publishedEvents,
    latestRegistrations: params.latestRegistrations,
    latestEventCheckIns: params.latestEventCheckIns,
    journeyProfiles: params.journeyProfiles,
    activeMissions: params.activeMissions,
    earnedBadges: params.earnedBadges
  });

  return {
    ...journeysSnapshot,
    tribeDefinitions: params.tribeDefinitions,
    latestTribeAssessments: params.latestTribeAssessments,
    currentTribeProfiles: params.currentTribeProfiles
  };
}

export const tribeQuestionnaireV1: TribeQuestionnaire = {
  version: "v1",
  questions: [
    {
      code: "q1",
      prompt: "Quando voce pensa em servir na igreja, o que mais te anima?",
      options: [
        {
          code: "a",
          label: "Conduzir pessoas em adoracao e criar ambiente espiritual forte",
          weights: [{ tribeCode: "LEVI", value: 3 }]
        },
        {
          code: "b",
          label: "Liderar pessoas e assumir responsabilidade",
          weights: [{ tribeCode: "JUDAH", value: 3 }]
        },
        {
          code: "c",
          label: "Entender a direcao certa e ajudar no planejamento",
          weights: [{ tribeCode: "ISSACHAR", value: 3 }]
        },
        {
          code: "d",
          label: "Organizar bastidores para tudo funcionar bem",
          weights: [{ tribeCode: "JOSEPH", value: 3 }]
        },
        {
          code: "e",
          label: "Acolher e cuidar bem das pessoas",
          weights: [{ tribeCode: "ASHER", value: 3 }]
        }
      ]
    },
    {
      code: "q2",
      prompt: "Qual destas areas mais desperta seu coracao?",
      options: [
        {
          code: "a",
          label: "Comunicacao, criatividade e expressao",
          weights: [{ tribeCode: "NAPHTALI", value: 3 }]
        },
        {
          code: "b",
          label: "Missoes, mobilizacao e projetos externos",
          weights: [{ tribeCode: "ZEBULUN", value: 3 }]
        },
        {
          code: "c",
          label: "Evangelismo de rua, acao pratica e resposta rapida",
          weights: [
            { tribeCode: "GAD", value: 2 },
            { tribeCode: "BENJAMIN", value: 1 }
          ]
        },
        {
          code: "d",
          label: "Restauracao e cuidado profundo",
          weights: [{ tribeCode: "MANASSEH", value: 3 }]
        },
        {
          code: "e",
          label: "Multiplicacao, crescimento e abertura de novas frentes",
          weights: [{ tribeCode: "EPHRAIM", value: 3 }]
        }
      ]
    },
    {
      code: "q3",
      prompt: "Qual dessas frases mais te representa?",
      options: [
        {
          code: "a",
          label: "Eu gosto de comecar coisas novas",
          weights: [{ tribeCode: "REUBEN", value: 3 }]
        },
        {
          code: "b",
          label: "Eu gosto de ver pessoas e ministerios crescerem",
          weights: [{ tribeCode: "EPHRAIM", value: 3 }]
        },
        {
          code: "c",
          label: "Eu gosto de manter tudo em ordem e funcionando",
          weights: [
            { tribeCode: "JOSEPH", value: 2 },
            { tribeCode: "ISSACHAR", value: 1 }
          ]
        },
        {
          code: "d",
          label: "Eu gosto de ajudar pessoas a se reconstruirem",
          weights: [{ tribeCode: "MANASSEH", value: 3 }]
        },
        {
          code: "e",
          label: "Eu gosto de estar pronto para agir quando necessario",
          weights: [
            { tribeCode: "BENJAMIN", value: 2 },
            { tribeCode: "GAD", value: 1 }
          ]
        }
      ]
    },
    {
      code: "q4",
      prompt: "Se voce fosse ajudar em um grande evento da igreja, qual area escolheria primeiro?",
      options: [
        {
          code: "a",
          label: "Louvor, palco, oracao ou ambiente",
          weights: [{ tribeCode: "LEVI", value: 3 }]
        },
        {
          code: "b",
          label: "Coordenacao geral e lideranca",
          weights: [{ tribeCode: "JUDAH", value: 3 }]
        },
        {
          code: "c",
          label: "Conteudo, direcao ou estrategia",
          weights: [
            { tribeCode: "ISSACHAR", value: 2 },
            { tribeCode: "NAPHTALI", value: 1 }
          ]
        },
        {
          code: "d",
          label: "Operacao, secretaria, credenciamento ou financas",
          weights: [
            { tribeCode: "JOSEPH", value: 2 },
            { tribeCode: "BENJAMIN", value: 1 }
          ]
        },
        {
          code: "e",
          label: "Recepcao, suporte as pessoas e cuidado",
          weights: [
            { tribeCode: "ASHER", value: 2 },
            { tribeCode: "MANASSEH", value: 1 }
          ]
        }
      ]
    },
    {
      code: "q5",
      prompt: "Em relacao ao seu momento ministerial hoje, qual opcao se aproxima mais de voce?",
      options: [
        {
          code: "a",
          label: "Estou descobrindo onde posso florescer",
          weights: [{ tribeCode: "REUBEN", value: 3 }]
        },
        {
          code: "b",
          label: "Ja me vejo conduzindo pessoas",
          weights: [
            { tribeCode: "JUDAH", value: 2 },
            { tribeCode: "EPHRAIM", value: 1 }
          ]
        },
        {
          code: "c",
          label: "Contribuo melhor com entendimento e direcao",
          weights: [{ tribeCode: "ISSACHAR", value: 3 }]
        },
        {
          code: "d",
          label: "Vejo meu valor em sustentar e organizar a obra",
          weights: [{ tribeCode: "JOSEPH", value: 3 }]
        },
        {
          code: "e",
          label: "Sinto forte chamado para cuidar de pessoas",
          weights: [
            { tribeCode: "MANASSEH", value: 2 },
            { tribeCode: "ASHER", value: 1 }
          ]
        }
      ]
    }
  ]
};

export function getQuestionByCode(questionCode: string, questionnaire = tribeQuestionnaireV1) {
  return questionnaire.questions.find((question) => question.code === questionCode);
}

export function getQuestionOption(question: TribeQuestion, optionCode: string) {
  return question.options.find((option) => option.code === optionCode);
}

export function calculateTribeQuestionnaireResult(
  answers: readonly TribeAnswer[],
  questionnaire = tribeQuestionnaireV1
): TribeQuestionnaireResult {
  const scoreMap = new Map<TribeCode, number>();

  for (const answer of answers) {
    const question = getQuestionByCode(answer.questionCode, questionnaire);
    if (!question) {
      continue;
    }

    const option = getQuestionOption(question, answer.optionCode);
    if (!option) {
      continue;
    }

    for (const weight of option.weights) {
      scoreMap.set(weight.tribeCode, (scoreMap.get(weight.tribeCode) ?? 0) + weight.value);
    }
  }

  const rankedScores = Array.from(scoreMap.entries())
    .map(([tribeCode, scoreRaw]) => ({
      id: `${tribeCode.toLowerCase()}_score`,
      organizationId: "local",
      tribeAssessmentId: "preview",
      tribeCode,
      scoreRaw,
      rankPosition: 0
    }))
    .sort((left, right) => right.scoreRaw - left.scoreRaw)
    .map((score, index) => ({
      ...score,
      rankPosition: index + 1
    }));

  const primary = rankedScores[0];
  const secondary = rankedScores[1];

  if (!primary) {
    return {
      primaryTribeCode: "REUBEN",
      scores: [],
      confidenceLevel: "low"
    };
  }

  const difference = primary.scoreRaw - (secondary?.scoreRaw ?? 0);
  const confidenceLevel =
    difference >= 3 ? "high" : difference >= 1 ? "medium" : "low";

  return {
    primaryTribeCode: primary.tribeCode,
    secondaryTribeCode: secondary?.tribeCode,
    scores: rankedScores,
    confidenceLevel
  };
}

export function getReviewRequestStatusLabel(status: TribeReviewRequest["requestStatus"]) {
  switch (status) {
    case "open":
      return "Aberta";
    case "approved":
      return "Aprovada";
    case "denied":
      return "Negada";
    case "in_progress":
      return "Em andamento";
    case "completed":
      return "Concluida";
    case "cancelled":
      return "Cancelada";
  }
}

export function getRecommendedReviewTypeLabel(type: TribeRecommendedReviewType) {
  switch (type) {
    case "revalidation":
      return "Revalidacao";
    case "partial_review":
      return "Revisao parcial";
    case "full_reclassification":
      return "Reclassificacao completa";
  }
}

export function shouldRecommendTribeReview(profile: MemberTribeProfile) {
  if (profile.validationStatus === "pending") {
    return true;
  }

  if (profile.fitScore < 65) {
    return true;
  }

  return false;
}

export function getRecommendedReviewType(profile: MemberTribeProfile): TribeRecommendedReviewType {
  if (profile.fitScore < 50) {
    return "full_reclassification";
  }

  if (profile.fitScore < 70) {
    return "partial_review";
  }

  return "revalidation";
}

export function getStrongestBehaviorSignal(
  signals: readonly TribeBehaviorSignal[],
  personId: string
) {
  return [...signals]
    .filter((signal) => signal.personId === personId)
    .sort((left, right) => right.confidenceWeight - left.confidenceWeight)[0];
}

export function createTribeReclassificationSnapshot(params: {
  organization: Organization;
  currentUser: AuthUser;
  recentPeople: Person[];
  families: Array<{
    family: Family;
    members: readonly FamilyMember[];
  }>;
  activeJourneys: VisitorJourney[];
  followUps: FollowUpTask[];
  activeGroups: Group[];
  upcomingMeetings: GroupMeeting[];
  latestAttendance: GroupAttendance[];
  publishedEvents: Event[];
  latestRegistrations: EventRegistration[];
  latestEventCheckIns: EventCheckIn[];
  journeyProfiles: MemberJourneyProfile[];
  activeMissions: JourneyMission[];
  earnedBadges: MemberBadge[];
  tribeDefinitions: TribeDefinition[];
  latestTribeAssessments: TribeAssessment[];
  currentTribeProfiles: MemberTribeProfile[];
  reviewRequests: TribeReviewRequest[];
  behaviorSignals: TribeBehaviorSignal[];
}): TribeReclassificationSnapshot {
  const tribesSnapshot = createTribesDashboardSnapshot({
    organization: params.organization,
    currentUser: params.currentUser,
    recentPeople: params.recentPeople,
    families: params.families,
    activeJourneys: params.activeJourneys,
    followUps: params.followUps,
    activeGroups: params.activeGroups,
    upcomingMeetings: params.upcomingMeetings,
    latestAttendance: params.latestAttendance,
    publishedEvents: params.publishedEvents,
    latestRegistrations: params.latestRegistrations,
    latestEventCheckIns: params.latestEventCheckIns,
    journeyProfiles: params.journeyProfiles,
    activeMissions: params.activeMissions,
    earnedBadges: params.earnedBadges,
    tribeDefinitions: params.tribeDefinitions,
    latestTribeAssessments: params.latestTribeAssessments,
    currentTribeProfiles: params.currentTribeProfiles
  });

  return {
    ...tribesSnapshot,
    reviewRequests: params.reviewRequests,
    behaviorSignals: params.behaviorSignals
  };
}

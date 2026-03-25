import { AuthStatusCard } from "./auth-status";
import { AuthPanel } from "./auth-panel";
import { BrandLogo } from "./brand-logo";
import { LiveTenantData } from "./live-data";
import { LiveOperations } from "./live-operations";
import { TenantAdminSettings } from "./tenant-admin-settings";
import {
  calculateTribeQuestionnaireResult,
  canManagePeople,
  countGuardians,
  createEventsDashboardSnapshot,
  createJourneysDashboardSnapshot,
  createTribeReclassificationSnapshot,
  createTribesDashboardSnapshot,
  createGroupsDashboardSnapshot,
  createFamilyDisplayName,
  getBrandModeLabel,
  getEnabledModuleCount,
  getFollowUpStatusLabel,
  getAttendanceStatusLabel,
  getEventTypeLabel,
  getGroupTypeLabel,
  getJourneyKindLabel,
  getMissionStatusLabel,
  getPlanTierLabel,
  getRecommendedReviewType,
  getRecommendedReviewTypeLabel,
  getRegistrationStatusLabel,
  getReviewRequestStatusLabel,
  getStrongestBehaviorSignal,
  isModuleEnabled,
  shouldRecommendTribeReview,
  getTenantPaths,
  getTribeDisplayLabel,
  getTribeValidationLabel,
  tribeQuestionnaireV1,
  getVisitorStageLabel
} from "@alvo/domain";
import {
  getBadgesCollectionPath,
  createFirebaseEnvironment,
  getEventCheckInsCollectionPath,
  getEventRegistrationsCollectionPath,
  getEventsCollectionPath,
  getFamiliesCollectionPath,
  getFamilyMembersCollectionPath,
  getFollowUpTasksCollectionPath,
  getGroupAttendanceCollectionPath,
  getGroupMeetingsCollectionPath,
  getGroupsCollectionPath,
  getJourneyMissionsCollectionPath,
  getJourneyProfilesCollectionPath,
  getMemberBadgesCollectionPath,
  getMemberTribeHistoryCollectionPath,
  getMemberTribeProfilesCollectionPath,
  getPeopleCollectionPath,
  getTribeAssessmentScoresCollectionPath,
  getTribeAssessmentsCollectionPath,
  getTribeBehaviorSignalsCollectionPath,
  getTribeReviewRequestsCollectionPath,
  getTribesCollectionPath,
  getVisitorJourneysCollectionPath
} from "@alvo/firebase";
import type { OrganizationSettingsSnapshot } from "@alvo/types";

const organization = {
  id: "org_alvo_demo",
  name: "Alvo Church",
  slug: "alvo-church",
  status: "active",
  timezone: "America/Belem",
  locale: "pt-BR",
  countryCode: "BR"
} as const;

const tenantSettings: OrganizationSettingsSnapshot = {
  branding: {
    organizationId: organization.id,
    brandMode: "co_branded",
    publicProductName: "Alvo Church",
    publicShortName: "Alvo",
    primaryColor: "#d27836",
    secondaryColor: "#1c2433",
    accentColor: "#e8dcc7",
    surfaceColor: "#f7f3ea",
    textColor: "#1c2433",
    showPoweredByAlvo: true,
    poweredByLabel: "Powered by Alvo"
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
      finance: { enabled: false, source: "manual" },
      ai: { enabled: true, source: "trial", limits: { monthlySuggestions: 250 } }
    }
  }
};

const highlights = [
  isModuleEnabled(tenantSettings.features, "core")
    ? "Pessoas, familias e visitantes"
    : null,
  isModuleEnabled(tenantSettings.features, "groups")
    ? "Celulas, eventos e jornadas"
    : null,
  isModuleEnabled(tenantSettings.features, "tribes")
    ? "Tribos, badges e progresso"
    : null,
  isModuleEnabled(tenantSettings.features, "ai")
    ? "Base pronta para IA e app mobile"
    : "Base pronta para app mobile"
].filter(Boolean) as string[];

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
    title: "Enviar mensagem de boas-vindas",
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
    ministrySummary: "Lideranca, supervisao e condução",
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
  currentUser
  ,
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

const tenantPaths = getTenantPaths({
  organizationId: organization.id,
  userId: currentUser.id
});

const firebase = createFirebaseEnvironment("alvo-church");
const peoplePath = getPeopleCollectionPath({ organizationId: organization.id });
const familiesPath = getFamiliesCollectionPath({ organizationId: organization.id });
const visitorJourneysPath = getVisitorJourneysCollectionPath({
  organizationId: organization.id
});
const followUpTasksPath = getFollowUpTasksCollectionPath({
  organizationId: organization.id
});
const groupsPath = getGroupsCollectionPath({ organizationId: organization.id });
const eventsPath = getEventsCollectionPath({ organizationId: organization.id });
const journeyProfilesPath = getJourneyProfilesCollectionPath({
  organizationId: organization.id
});
const badgesPath = getBadgesCollectionPath({ organizationId: organization.id });
const tribesPath = getTribesCollectionPath({ organizationId: organization.id });
const tribeAssessmentsPath = getTribeAssessmentsCollectionPath({
  organizationId: organization.id
});
const memberTribeProfilesPath = getMemberTribeProfilesCollectionPath({
  organizationId: organization.id
});
const tribeReviewRequestsPath = getTribeReviewRequestsCollectionPath({
  organizationId: organization.id
});
const tribeBehaviorSignalsPath = getTribeBehaviorSignalsCollectionPath({
  organizationId: organization.id
});

export default function HomePage() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-panel">
        <BrandLogo />
        <h1 className="dashboard-title">Sistema completo para a jornada da igreja.</h1>
        <p className="dashboard-copy">
          Base inicial do painel web do Alvo Church, preparada para administrar
          a operacao da igreja e conectar pessoas, ministerios, jornadas e
          tribos em uma unica experiencia.
        </p>
        <div className="dashboard-grid dashboard-section">
          <AuthStatusCard />
          <AuthPanel />
          <LiveTenantData organizationId={organization.id} />
          <article className="dashboard-card">
            <strong>Contexto ativo</strong>
            <p style={{ margin: "10px 0 0", lineHeight: 1.5 }}>
              {dashboard.organization.name} em {dashboard.organization.timezone}
            </p>
          </article>
          <article className="dashboard-card">
            <strong>Papel inicial</strong>
            <p style={{ margin: "10px 0 0", lineHeight: 1.5 }}>
              {currentUser.roles[0]}{" "}
              {canManagePeople(currentUser) ? "com acesso ao nucleo de pessoas" : ""}
            </p>
          </article>
          <article className="dashboard-card">
            <strong>Firebase alvo</strong>
            <p style={{ margin: "10px 0 0", lineHeight: 1.5 }}>{firebase.projectId}</p>
          </article>
          <article className="dashboard-card">
            <strong>Plano do tenant</strong>
            <p style={{ margin: "10px 0 0", lineHeight: 1.5 }}>
              {getPlanTierLabel(tenantSettings.subscription.planTier)} ·{" "}
              {getBrandModeLabel(tenantSettings.branding.brandMode)}
            </p>
          </article>
          <article className="dashboard-card">
            <strong>Modulos ativos</strong>
            <p style={{ margin: "10px 0 0", lineHeight: 1.5 }}>
              {getEnabledModuleCount(tenantSettings.features)} modulo(s) liberado(s)
            </p>
          </article>
        </div>
        <div className="dashboard-pill-grid dashboard-section">
          {highlights.map((item) => (
            <article key={item} className="dashboard-pill">
              {item}
            </article>
          ))}
        </div>
        <section
          style={{
            marginTop: 28,
            padding: 24,
            borderRadius: 24,
            background: "rgba(247, 240, 227, 0.84)",
            border: "1px solid var(--alvo-line)"
          }}
        >
          <strong style={{ display: "block", marginBottom: 12 }}>
            Paths iniciais do tenant
          </strong>
          <pre
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap"
            }}
          >
            {JSON.stringify(tenantPaths, null, 2)}
          </pre>
        </section>
        <LiveOperations organizationId={organization.id} />
        <TenantAdminSettings />
        {isModuleEnabled(tenantSettings.features, "core") ? (
          <section
            style={{
              marginTop: 28,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}
          >
            <article
              style={{
                padding: 24,
                borderRadius: 24,
                background: "#fffdf8",
                border: "1px solid var(--alvo-line)"
              }}
            >
              <strong>Nucleo de pessoas</strong>
              <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
                {dashboard.totals.people} pessoas mapeadas para o tenant inicial.
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                Collection: <code>{peoplePath}</code>
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {dashboard.recentPeople.map((person) => (
                  <div
                    key={person.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{person.fullName}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      {person.memberStatus} · {person.personType}
                      {person.tribePrimaryCode ? ` · ${person.tribePrimaryCode}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </article>
            <article
              style={{
                padding: 24,
                borderRadius: 24,
                background: "#fffdf8",
                border: "1px solid var(--alvo-line)"
              }}
            >
              <strong>Nucleo de familias</strong>
              <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
                {dashboard.totals.families} familias ativas prontas para jornadas,
                criancas e vinculos.
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                Collection: <code>{familiesPath}</code>
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {dashboard.activeFamilies.map(({ family, members }) => (
                  <div
                    key={family.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{createFamilyDisplayName(family)}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      {members.length} membro(s) · {countGuardians(members)} responsavel(is)
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6 }}>
                      <code>
                        {getFamilyMembersCollectionPath(
                          { organizationId: organization.id },
                          family.id
                        )}
                      </code>
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}
        {isModuleEnabled(tenantSettings.features, "visitors") ? (
          <section
            style={{
              marginTop: 28,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}
          >
            <article
              style={{
                padding: 24,
                borderRadius: 24,
                background: "#fffdf8",
                border: "1px solid var(--alvo-line)"
              }}
            >
              <strong>Visitantes em jornada</strong>
              <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
                {dashboard.activeJourneys.length} jornada(s) ativa(s) de acolhimento.
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                Collection: <code>{visitorJourneysPath}</code>
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {dashboard.activeJourneys.map((journey) => (
                  <div
                    key={journey.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{journey.personId}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      {getVisitorStageLabel(journey.currentStage)} · {journey.originChannel}
                    </p>
                  </div>
                ))}
              </div>
            </article>
            <article
              style={{
                padding: 24,
                borderRadius: 24,
                background: "#fffdf8",
                border: "1px solid var(--alvo-line)"
              }}
            >
              <strong>Follow-up em aberto</strong>
              <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
                {dashboard.openFollowUps.length} tarefa(s) em aberto ou em andamento.
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                Collection: <code>{followUpTasksPath}</code>
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {dashboard.openFollowUps.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{task.title}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      {getFollowUpStatusLabel(task.status)} · {task.type}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}
        {isModuleEnabled(tenantSettings.features, "groups") ? (
          <section
            style={{
              marginTop: 28,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}
          >
            <article
              style={{
                padding: 24,
                borderRadius: 24,
                background: "#fffdf8",
                border: "1px solid var(--alvo-line)"
              }}
            >
              <strong>Grupos ativos</strong>
              <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
                {dashboard.activeGroups.length} grupo(s) organizados no tenant inicial.
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                Collection: <code>{groupsPath}</code>
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {dashboard.activeGroups.map((group) => (
                  <div
                    key={group.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{group.name}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      {getGroupTypeLabel(group.type)} · {group.meetingTime ?? "sem horario"}
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6 }}>
                      <code>
                        {getGroupMeetingsCollectionPath(
                          { organizationId: organization.id },
                          group.id
                        )}
                      </code>
                    </p>
                  </div>
                ))}
              </div>
            </article>
            <article
              style={{
                padding: 24,
                borderRadius: 24,
                background: "#fffdf8",
                border: "1px solid var(--alvo-line)"
              }}
            >
              <strong>Presenca e encontros</strong>
              <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
                {dashboard.upcomingMeetings.length} encontro(s) futuro(s) e{" "}
                {dashboard.latestAttendance.length} registro(s) de presenca recente.
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {dashboard.latestAttendance.map((attendance) => (
                  <div
                    key={attendance.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{attendance.personId}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      {getAttendanceStatusLabel(attendance.attendanceStatus)}
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6 }}>
                      <code>
                        {getGroupAttendanceCollectionPath(
                          { organizationId: organization.id },
                          attendance.groupId,
                          attendance.groupMeetingId
                        )}
                      </code>
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}
        {isModuleEnabled(tenantSettings.features, "events") ? (
          <section
            style={{
              marginTop: 28,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}
          >
            <article
              style={{
                padding: 24,
                borderRadius: 24,
                background: "#fffdf8",
                border: "1px solid var(--alvo-line)"
              }}
            >
              <strong>Eventos publicados</strong>
              <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
                {dashboard.publishedEvents.length} evento(s) pronto(s) para inscricao.
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                Collection: <code>{eventsPath}</code>
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {dashboard.publishedEvents.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{event.name}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      {getEventTypeLabel(event.type)} · {event.locationType}
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6 }}>
                      <code>
                        {getEventRegistrationsCollectionPath(
                          { organizationId: organization.id },
                          event.id
                        )}
                      </code>
                    </p>
                  </div>
                ))}
              </div>
            </article>
            <article
              style={{
                padding: 24,
                borderRadius: 24,
                background: "#fffdf8",
                border: "1px solid var(--alvo-line)"
              }}
            >
              <strong>Inscricoes e check-ins</strong>
              <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
                {dashboard.latestRegistrations.length} inscricao(oes) recente(s) e{" "}
                {dashboard.latestEventCheckIns.length} check-in(s) registrado(s).
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {dashboard.latestRegistrations.map((registration) => (
                  <div
                    key={registration.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{registration.registrationCode}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      {getRegistrationStatusLabel(registration.status)} ·{" "}
                      {registration.paymentStatus}
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6 }}>
                      <code>
                        {getEventCheckInsCollectionPath(
                          { organizationId: organization.id },
                          registration.eventId
                        )}
                      </code>
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}
        {isModuleEnabled(tenantSettings.features, "journeys") ? (
          <section
            style={{
              marginTop: 28,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}
          >
            <article
              style={{
                padding: 24,
                borderRadius: 24,
                background: "#fffdf8",
                border: "1px solid var(--alvo-line)"
              }}
            >
              <strong>Jornadas ativas</strong>
              <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
                {dashboard.journeyProfiles.length} perfil(is) de jornada acompanhados.
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                Collection: <code>{journeyProfilesPath}</code>
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {dashboard.journeyProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{profile.personId}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      {getJourneyKindLabel(profile.currentJourneyKind)} · {profile.progressPercent}%
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12 }}>
                      prontidao {profile.readinessLevel}
                    </p>
                  </div>
                ))}
              </div>
            </article>
            <article
              style={{
                padding: 24,
                borderRadius: 24,
                background: "#fffdf8",
                border: "1px solid var(--alvo-line)"
              }}
            >
              <strong>Missoes e badges</strong>
              <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
                {dashboard.activeMissions.length} missao(oes) ativa(s) e{" "}
                {dashboard.earnedBadges.length} badge(s) conquistado(s).
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                Badges: <code>{badgesPath}</code>
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {dashboard.activeMissions.map((mission) => (
                  <div
                    key={mission.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{mission.title}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      {getMissionStatusLabel(mission.status)} · {mission.kind}
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6 }}>
                      <code>
                        {getJourneyMissionsCollectionPath(
                          { organizationId: organization.id },
                          mission.journeyProfileId
                        )}
                      </code>
                    </p>
                  </div>
                ))}
                {dashboard.earnedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{badge.badgeId}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      pessoa {badge.personId}
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6 }}>
                      <code>
                        {getMemberBadgesCollectionPath(
                          { organizationId: organization.id },
                          badge.personId
                        )}
                      </code>
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}
        {isModuleEnabled(tenantSettings.features, "tribes") ? (
          <section
            style={{
              marginTop: 28,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}
          >
          <article
            style={{
              padding: 24,
              borderRadius: 24,
              background: "#fffdf8",
              border: "1px solid var(--alvo-line)"
            }}
          >
            <strong>Catalogo de tribos</strong>
            <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
              {dashboard.tribeDefinitions.length} tribo(s) inicial(is) configurada(s).
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
              Collection: <code>{tribesPath}</code>
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {dashboard.tribeDefinitions.map((tribe) => (
                <div
                  key={tribe.id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: "#f7f0e3"
                  }}
                >
                  <strong>{tribe.name}</strong>
                  <p style={{ margin: "6px 0 0", fontSize: 14 }}>{tribe.ministrySummary}</p>
                </div>
              ))}
            </div>
          </article>
          <article
            style={{
              padding: 24,
              borderRadius: 24,
              background: "#fffdf8",
              border: "1px solid var(--alvo-line)"
            }}
          >
            <strong>Assessments e perfis</strong>
            <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
              {dashboard.latestTribeAssessments.length} assessment(s) recente(s) e{" "}
              {dashboard.currentTribeProfiles.length} perfil(is) atual(is).
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
              Assessments: <code>{tribeAssessmentsPath}</code>
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.7 }}>
              Perfis: <code>{memberTribeProfilesPath}</code>
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {dashboard.currentTribeProfiles.map((profile) => (
                <div
                  key={profile.id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: "#f7f0e3"
                  }}
                >
                  <strong>{profile.personId}</strong>
                  <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                    {profile.currentPrimaryTribeCode
                      ? getTribeDisplayLabel(profile.currentPrimaryTribeCode)
                      : "Sem tribo"}{" "}
                    · {getTribeValidationLabel(profile.validationStatus)}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6 }}>
                    <code>
                      {profile.currentAssessmentId
                        ? getTribeAssessmentScoresCollectionPath(
                            { organizationId: organization.id },
                            profile.currentAssessmentId
                          )
                        : getMemberTribeHistoryCollectionPath(
                            { organizationId: organization.id },
                            profile.personId
                          )}
                    </code>
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
        ) : null}
        {isModuleEnabled(tenantSettings.features, "tribes") ? (
          <section
            style={{
              marginTop: 28,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}
          >
          <article
            style={{
              padding: 24,
              borderRadius: 24,
              background: "#fffdf8",
              border: "1px solid var(--alvo-line)"
            }}
          >
            <strong>Questionario de tribos</strong>
            <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
              Versao {tribeQuestionnaireV1.version} com {tribeQuestionnaireV1.questions.length} pergunta(s)
              base para classificacao inicial.
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {tribeQuestionnaireV1.questions.map((question) => (
                <div
                  key={question.code}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: "#f7f0e3"
                  }}
                >
                  <strong>{question.code.toUpperCase()}</strong>
                  <p style={{ margin: "6px 0 0", fontSize: 14 }}>{question.prompt}</p>
                </div>
              ))}
            </div>
          </article>
          <article
            style={{
              padding: 24,
              borderRadius: 24,
              background: "#fffdf8",
              border: "1px solid var(--alvo-line)"
            }}
          >
            <strong>Resultado do motor de score</strong>
            <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
              Tribo principal: {getTribeDisplayLabel(questionnaireResult.primaryTribeCode)}
              {questionnaireResult.secondaryTribeCode
                ? ` · secundaria ${getTribeDisplayLabel(questionnaireResult.secondaryTribeCode)}`
                : ""}
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 14 }}>
              Confianca {questionnaireResult.confidenceLevel}
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {questionnaireResult.scores.map((score) => (
                <div
                  key={score.id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: "#f7f0e3"
                  }}
                >
                  <strong>{getTribeDisplayLabel(score.tribeCode)}</strong>
                  <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                    score {score.scoreRaw} · posicao {score.rankPosition}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
        ) : null}
        {isModuleEnabled(tenantSettings.features, "tribes") ? (
          <section
            style={{
              marginTop: 28,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}
          >
          <article
            style={{
              padding: 24,
              borderRadius: 24,
              background: "#fffdf8",
              border: "1px solid var(--alvo-line)"
            }}
          >
            <strong>Revisao e reclassificacao</strong>
            <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
              {dashboard.reviewRequests.length} pedido(s) de revisao ativo(s).
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
              Requests: <code>{tribeReviewRequestsPath}</code>
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {dashboard.currentTribeProfiles.map((profile) => (
                <div
                  key={profile.id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: "#f7f0e3"
                  }}
                >
                  <strong>{profile.personId}</strong>
                  <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                    fit {profile.fitScore} ·{" "}
                    {shouldRecommendTribeReview(profile)
                      ? getRecommendedReviewTypeLabel(getRecommendedReviewType(profile))
                      : "sem revisao sugerida"}
                  </p>
                </div>
              ))}
            </div>
          </article>
          <article
            style={{
              padding: 24,
              borderRadius: 24,
              background: "#fffdf8",
              border: "1px solid var(--alvo-line)"
            }}
          >
            <strong>Sinais comportamentais</strong>
            <p style={{ margin: "10px 0 14px", lineHeight: 1.6 }}>
              {dashboard.behaviorSignals.length} sinal(is) observados para reavaliacao.
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
              Signals: <code>{tribeBehaviorSignalsPath}</code>
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {dashboard.reviewRequests.map((request) => {
                const strongestSignal = getStrongestBehaviorSignal(
                  dashboard.behaviorSignals,
                  request.personId
                );

                return (
                  <div
                    key={request.id}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      background: "#f7f0e3"
                    }}
                  >
                    <strong>{request.personId}</strong>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                      {getReviewRequestStatusLabel(request.requestStatus)} ·{" "}
                      {getRecommendedReviewTypeLabel(request.recommendedReviewType)}
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 12 }}>
                      {strongestSignal?.suggestedTribeCode
                        ? `sinal forte para ${getTribeDisplayLabel(strongestSignal.suggestedTribeCode)}`
                        : "sem sinal forte"}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
        ) : null}
      </section>
    </main>
  );
}

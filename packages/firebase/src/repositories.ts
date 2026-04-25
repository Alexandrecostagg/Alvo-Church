import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  updateDoc,
  type DocumentData,
  type Firestore
} from "firebase/firestore";
import type {
  AppRole,
  Event,
  EventCheckIn,
  EventRegistration,
  Family,
  FinancialTransparencyReport,
  FollowUpTask,
  Group,
  GroupAttendance,
  GroupMeeting,
  Organization,
  OrganizationBrandingSettings,
  OrganizationFeaturesSettings,
  OrganizationSettingsSnapshot,
  OrganizationSubscriptionSettings,
  Person,
  TenantRuntimeSnapshot,
  TenantContext,
  VisitorIntake,
  VisitorJourney
} from "@alvo/types";
import { getFirebaseWebApp, type FirebaseWebRuntimeConfig } from "./client";
import {
  getOrganizationBrandingDocumentPath,
  getOrganizationFeaturesDocumentPath,
  getOrganizationSubscriptionDocumentPath,
  getTenantUserDocumentPath,
  getEventCheckInsCollectionPath,
  getEventRegistrationsCollectionPath,
  getEventsCollectionPath,
  getFamiliesCollectionPath,
  getFollowUpTasksCollectionPath,
  getFinanceReportsCollectionPath,
  getGroupAttendanceCollectionPath,
  getGroupMeetingsCollectionPath,
  getGroupsCollectionPath,
  getPeopleCollectionPath,
  getUsersCollectionPath,
  getVisitorIntakesCollectionPath,
  getVisitorJourneysCollectionPath
} from "./index";

function getFirebaseFirestore(config: FirebaseWebRuntimeConfig): Firestore {
  return getFirestore(getFirebaseWebApp(config));
}

function toOrganization(documentId: string, data: DocumentData): Organization {
  return {
    id: documentId,
    name: String(data.name ?? ""),
    slug: String(data.slug ?? documentId),
    status: (data.status as Organization["status"]) ?? "active",
    timezone: String(data.timezone ?? "America/Belem"),
    locale: String(data.locale ?? "pt-BR"),
    countryCode: String(data.countryCode ?? "BR"),
    legalName: data.legalName ? String(data.legalName) : undefined,
    publicName: data.publicName ? String(data.publicName) : undefined,
    displayName: data.displayName ? String(data.displayName) : undefined,
    organizationType: data.organizationType as Organization["organizationType"]
  };
}

function toOrganizationBrandingSettings(
  data: DocumentData,
  organizationId: string
): OrganizationBrandingSettings {
  return {
    organizationId,
    brandMode:
      (data.brandMode as OrganizationBrandingSettings["brandMode"]) ?? "alvo_managed",
    publicProductName: String(data.publicProductName ?? "Alvo Church"),
    publicShortName: String(data.publicShortName ?? "Alvo"),
    logoLightUrl: data.logoLightUrl ? String(data.logoLightUrl) : undefined,
    logoDarkUrl: data.logoDarkUrl ? String(data.logoDarkUrl) : undefined,
    iconUrl: data.iconUrl ? String(data.iconUrl) : undefined,
    faviconUrl: data.faviconUrl ? String(data.faviconUrl) : undefined,
    primaryColor: String(data.primaryColor ?? "#d27836"),
    secondaryColor: data.secondaryColor ? String(data.secondaryColor) : undefined,
    accentColor: data.accentColor ? String(data.accentColor) : undefined,
    surfaceColor: data.surfaceColor ? String(data.surfaceColor) : undefined,
    textColor: data.textColor ? String(data.textColor) : undefined,
    fontHeading: data.fontHeading ? String(data.fontHeading) : undefined,
    fontBody: data.fontBody ? String(data.fontBody) : undefined,
    showPoweredByAlvo: Boolean(data.showPoweredByAlvo),
    poweredByLabel: data.poweredByLabel ? String(data.poweredByLabel) : undefined
  };
}

function toOrganizationSubscriptionSettings(
  data: DocumentData,
  organizationId: string
): OrganizationSubscriptionSettings {
  return {
    organizationId,
    planCode: String(data.planCode ?? "alvo-growth"),
    planTier: (data.planTier as OrganizationSubscriptionSettings["planTier"]) ?? "growth",
    billingCycle:
      (data.billingCycle as OrganizationSubscriptionSettings["billingCycle"]) ?? "monthly",
    memberRange:
      (data.memberRange as OrganizationSubscriptionSettings["memberRange"]) ??
      "101_to_300",
    seatLimit: typeof data.seatLimit === "number" ? data.seatLimit : undefined,
    campusLimit: typeof data.campusLimit === "number" ? data.campusLimit : undefined,
    aiQuota: typeof data.aiQuota === "number" ? data.aiQuota : undefined,
    whiteLabelEnabled: Boolean(data.whiteLabelEnabled),
    coBrandingEnabled: Boolean(data.coBrandingEnabled),
    multiCampusEnabled: Boolean(data.multiCampusEnabled),
    denominationalModeEnabled: Boolean(data.denominationalModeEnabled),
    startedAt: String(data.startedAt ?? ""),
    renewsAt: data.renewsAt ? String(data.renewsAt) : undefined,
    trialEndsAt: data.trialEndsAt ? String(data.trialEndsAt) : undefined
  };
}

function toOrganizationFeaturesSettings(
  data: DocumentData,
  organizationId: string
): OrganizationFeaturesSettings {
  return {
    organizationId,
    modules: {
      core: data.modules?.core ?? { enabled: true, source: "plan" },
      visitors: data.modules?.visitors ?? { enabled: true, source: "plan" },
      groups: data.modules?.groups ?? { enabled: true, source: "plan" },
      events: data.modules?.events ?? { enabled: true, source: "plan" },
      children: data.modules?.children ?? { enabled: false, source: "manual" },
      youth: data.modules?.youth ?? { enabled: false, source: "manual" },
      volunteers: data.modules?.volunteers ?? { enabled: false, source: "manual" },
      tribes: data.modules?.tribes ?? { enabled: false, source: "manual" },
      journeys: data.modules?.journeys ?? { enabled: true, source: "plan" },
      communication: data.modules?.communication ?? { enabled: false, source: "manual" },
      finance: data.modules?.finance ?? { enabled: false, source: "manual" },
      ai: data.modules?.ai ?? { enabled: false, source: "manual" }
    }
  };
}

function toPerson(documentId: string, data: DocumentData): Person {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    campusId: data.campusId ? String(data.campusId) : undefined,
    primaryFamilyId: data.primaryFamilyId ? String(data.primaryFamilyId) : undefined,
    firstName: String(data.firstName ?? ""),
    lastName: String(data.lastName ?? ""),
    preferredName: data.preferredName ? String(data.preferredName) : undefined,
    email: data.email ? String(data.email) : undefined,
    mobilePhone: data.mobilePhone ? String(data.mobilePhone) : undefined,
    whatsappPhone: data.whatsappPhone ? String(data.whatsappPhone) : undefined,
    birthDate: data.birthDate ? String(data.birthDate) : undefined,
    personType: (data.personType as Person["personType"]) ?? "adult",
    memberStatus: (data.memberStatus as Person["memberStatus"]) ?? "visitor",
    status: (data.status as Person["status"]) ?? "active",
    tribePrimaryCode: data.tribePrimaryCode as Person["tribePrimaryCode"],
    tribeSecondaryCode: data.tribeSecondaryCode as Person["tribeSecondaryCode"]
  };
}

function toFamily(documentId: string, data: DocumentData): Family {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    campusId: data.campusId ? String(data.campusId) : undefined,
    familyName: String(data.familyName ?? ""),
    displayName: String(data.displayName ?? ""),
    status: (data.status as Family["status"]) ?? "active"
  };
}

function toVisitorJourney(documentId: string, data: DocumentData): VisitorJourney {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    personId: String(data.personId ?? ""),
    originChannel: (data.originChannel as VisitorJourney["originChannel"]) ?? "form",
    currentStage:
      (data.currentStage as VisitorJourney["currentStage"]) ?? "new_visitor",
    status: (data.status as VisitorJourney["status"]) ?? "active",
    assignedToUserId: data.assignedToUserId ? String(data.assignedToUserId) : undefined,
    firstVisitDate: String(data.firstVisitDate ?? ""),
    nextActionAt: data.nextActionAt ? String(data.nextActionAt) : undefined
  };
}

function toVisitorIntake(documentId: string, data: DocumentData): VisitorIntake {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    personId: data.personId ? String(data.personId) : undefined,
    journeyId: data.journeyId ? String(data.journeyId) : undefined,
    name: String(data.name ?? ""),
    phone: data.phone ? String(data.phone) : undefined,
    source: String(data.source ?? ""),
    status: (data.status as VisitorIntake["status"]) ?? "captured",
    greeting: data.greeting ? String(data.greeting) : undefined,
    capturedByUserId: data.capturedByUserId ? String(data.capturedByUserId) : undefined,
    createdAt: String(data.createdAt ?? "")
  };
}

function toFollowUpTask(documentId: string, data: DocumentData): FollowUpTask {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    personId: String(data.personId ?? ""),
    visitorJourneyId: String(data.visitorJourneyId ?? ""),
    assignedToUserId: data.assignedToUserId ? String(data.assignedToUserId) : undefined,
    title: String(data.title ?? ""),
    type: (data.type as FollowUpTask["type"]) ?? "first_contact",
    status: (data.status as FollowUpTask["status"]) ?? "open",
    dueAt: data.dueAt ? String(data.dueAt) : undefined
  };
}

function toFinancialTransparencyReport(
  documentId: string,
  data: DocumentData
): FinancialTransparencyReport {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    month: String(data.month ?? ""),
    income: Number(data.income ?? 0),
    expenses: Number(data.expenses ?? 0),
    missions: Number(data.missions ?? 0),
    balance: Number(data.balance ?? 0),
    entries: Array.isArray(data.entries)
      ? data.entries.map((entry, index) => ({
          id: String(entry.id ?? `entry_${index + 1}`),
          amount: Number(entry.amount ?? 0),
          category: String(entry.category ?? ""),
          label: String(entry.label ?? ""),
          note: String(entry.note ?? "")
        }))
      : [],
    status: (data.status as FinancialTransparencyReport["status"]) ?? "draft",
    publishedAt: data.publishedAt ? String(data.publishedAt) : undefined,
    publishedByUserId: data.publishedByUserId
      ? String(data.publishedByUserId)
      : undefined
  };
}

function toGroup(documentId: string, data: DocumentData): Group {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    campusId: data.campusId ? String(data.campusId) : undefined,
    ministryId: data.ministryId ? String(data.ministryId) : undefined,
    name: String(data.name ?? ""),
    slug: String(data.slug ?? documentId),
    type: (data.type as Group["type"]) ?? "cell",
    status: (data.status as Group["status"]) ?? "active",
    visibility: (data.visibility as Group["visibility"]) ?? "internal",
    meetingDayOfWeek:
      typeof data.meetingDayOfWeek === "number" ? data.meetingDayOfWeek : undefined,
    meetingTime: data.meetingTime ? String(data.meetingTime) : undefined,
    city: data.city ? String(data.city) : undefined,
    state: data.state ? String(data.state) : undefined,
    capacity: typeof data.capacity === "number" ? data.capacity : undefined
  };
}

function toGroupMeeting(documentId: string, data: DocumentData): GroupMeeting {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    groupId: String(data.groupId ?? ""),
    scheduledStartAt: String(data.scheduledStartAt ?? ""),
    scheduledEndAt: data.scheduledEndAt ? String(data.scheduledEndAt) : undefined,
    meetingStatus: (data.meetingStatus as GroupMeeting["meetingStatus"]) ?? "scheduled"
  };
}

function toGroupAttendance(documentId: string, data: DocumentData): GroupAttendance {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    groupId: String(data.groupId ?? ""),
    groupMeetingId: String(data.groupMeetingId ?? ""),
    personId: String(data.personId ?? ""),
    attendanceStatus:
      (data.attendanceStatus as GroupAttendance["attendanceStatus"]) ?? "present"
  };
}

function toEvent(documentId: string, data: DocumentData): Event {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    campusId: data.campusId ? String(data.campusId) : undefined,
    ministryId: data.ministryId ? String(data.ministryId) : undefined,
    name: String(data.name ?? ""),
    slug: String(data.slug ?? documentId),
    description: data.description ? String(data.description) : undefined,
    type: (data.type as Event["type"]) ?? "service",
    status: (data.status as Event["status"]) ?? "draft",
    locationType: (data.locationType as Event["locationType"]) ?? "onsite",
    startsAt: String(data.startsAt ?? ""),
    endsAt: data.endsAt ? String(data.endsAt) : undefined,
    capacity: typeof data.capacity === "number" ? data.capacity : undefined,
    isPaid: Boolean(data.isPaid)
  };
}

function toEventRegistration(
  documentId: string,
  data: DocumentData
): EventRegistration {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    eventId: String(data.eventId ?? ""),
    responsiblePersonId: String(data.responsiblePersonId ?? ""),
    registrationCode: String(data.registrationCode ?? ""),
    status: (data.status as EventRegistration["status"]) ?? "pending",
    paymentStatus:
      (data.paymentStatus as EventRegistration["paymentStatus"]) ?? "pending",
    registeredAt: String(data.registeredAt ?? "")
  };
}

function toEventCheckIn(documentId: string, data: DocumentData): EventCheckIn {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    eventId: String(data.eventId ?? ""),
    personId: String(data.personId ?? ""),
    registrationPersonId: String(data.registrationPersonId ?? ""),
    checkedInAt: String(data.checkedInAt ?? "")
  };
}

export async function fetchOrganizationById(
  config: FirebaseWebRuntimeConfig,
  organizationId: string
) {
  const firestore = getFirebaseFirestore(config);
  const snapshot = await getDoc(doc(firestore, "organizations", organizationId));

  if (!snapshot.exists()) {
    return null;
  }

  return toOrganization(snapshot.id, snapshot.data());
}

export async function fetchOrganizationBrandingSettings(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
) {
  const firestore = getFirebaseFirestore(config);
  const snapshot = await getDoc(doc(firestore, getOrganizationBrandingDocumentPath(context)));

  if (!snapshot.exists()) {
    return null;
  }

  return toOrganizationBrandingSettings(snapshot.data(), context.organizationId);
}

export async function fetchOrganizationSubscriptionSettings(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
) {
  const firestore = getFirebaseFirestore(config);
  const snapshot = await getDoc(
    doc(firestore, getOrganizationSubscriptionDocumentPath(context))
  );

  if (!snapshot.exists()) {
    return null;
  }

  return toOrganizationSubscriptionSettings(snapshot.data(), context.organizationId);
}

export async function fetchOrganizationFeaturesSettings(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
) {
  const firestore = getFirebaseFirestore(config);
  const snapshot = await getDoc(doc(firestore, getOrganizationFeaturesDocumentPath(context)));

  if (!snapshot.exists()) {
    return null;
  }

  return toOrganizationFeaturesSettings(snapshot.data(), context.organizationId);
}

export async function fetchOrganizationSettingsSnapshot(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<OrganizationSettingsSnapshot | null> {
  const [branding, subscription, features] = await Promise.all([
    fetchOrganizationBrandingSettings(config, context),
    fetchOrganizationSubscriptionSettings(config, context),
    fetchOrganizationFeaturesSettings(config, context)
  ]);

  if (!branding || !subscription || !features) {
    return null;
  }

  return {
    branding,
    subscription,
    features
  };
}

export async function fetchTenantRuntimeSnapshot(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<TenantRuntimeSnapshot | null> {
  const [organization, settings] = await Promise.all([
    fetchOrganizationById(config, context.organizationId),
    fetchOrganizationSettingsSnapshot(config, context)
  ]);

  if (!organization) {
    return null;
  }

  return {
    organization,
    settings
  };
}

export async function ensureTenantUserAccess(
  config: FirebaseWebRuntimeConfig,
  params: {
    organizationId: string;
    userId: string;
    email: string;
    roles?: readonly AppRole[];
  }
) {
  const firestore = getFirebaseFirestore(config);

  await setDoc(
    doc(
      firestore,
      getTenantUserDocumentPath({ organizationId: params.organizationId }, params.userId)
    ),
    {
      organizationId: params.organizationId,
      email: params.email,
      roles: params.roles ?? ["church_admin"],
      isActive: true,
      createdAt: new Date().toISOString()
    },
    { merge: true }
  );
}

export async function saveOrganizationBrandingSettings(
  config: FirebaseWebRuntimeConfig,
  settings: OrganizationBrandingSettings
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getOrganizationBrandingDocumentPath({ organizationId: settings.organizationId })),
    settings,
    { merge: true }
  );
}

export async function saveOrganizationSubscriptionSettings(
  config: FirebaseWebRuntimeConfig,
  settings: OrganizationSubscriptionSettings
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(
      firestore,
      getOrganizationSubscriptionDocumentPath({ organizationId: settings.organizationId })
    ),
    settings,
    { merge: true }
  );
}

export async function saveOrganizationFeaturesSettings(
  config: FirebaseWebRuntimeConfig,
  settings: OrganizationFeaturesSettings
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getOrganizationFeaturesDocumentPath({ organizationId: settings.organizationId })),
    settings,
    { merge: true }
  );
}

export async function fetchPeople(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 8
) {
  const firestore = getFirebaseFirestore(config);
  const peopleQuery = query(
    collection(firestore, getPeopleCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(peopleQuery);

  return snapshot.docs.map((item) => toPerson(item.id, item.data()));
}

export async function fetchFamilies(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 6
) {
  const firestore = getFirebaseFirestore(config);
  const familiesQuery = query(
    collection(firestore, getFamiliesCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(familiesQuery);

  return snapshot.docs.map((item) => toFamily(item.id, item.data()));
}

export async function fetchVisitorJourneys(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 8
) {
  const firestore = getFirebaseFirestore(config);
  const journeysQuery = query(
    collection(firestore, getVisitorJourneysCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(journeysQuery);

  return snapshot.docs.map((item) => toVisitorJourney(item.id, item.data()));
}

export async function fetchVisitorIntakes(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 8
) {
  const firestore = getFirebaseFirestore(config);
  const intakesQuery = query(
    collection(firestore, getVisitorIntakesCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(intakesQuery);

  return snapshot.docs.map((item) => toVisitorIntake(item.id, item.data()));
}

export async function fetchFollowUpTasks(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 8
) {
  const firestore = getFirebaseFirestore(config);
  const tasksQuery = query(
    collection(firestore, getFollowUpTasksCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(tasksQuery);

  return snapshot.docs.map((item) => toFollowUpTask(item.id, item.data()));
}

export async function createVisitorIntakeWorkflow(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    capturedByUserId?: string;
    name: string;
    phone?: string;
    source: string;
  }
) {
  const firestore = getFirebaseFirestore(config);
  const createdAt = new Date().toISOString();
  const baseId = `${Date.now()}`;
  const personId = `person_${baseId}`;
  const journeyId = `journey_${baseId}`;
  const welcomeTaskId = `followup_${baseId}_welcome`;
  const groupTaskId = `followup_${baseId}_group`;
  const intakeId = `visitor_intake_${baseId}`;
  const [firstName, ...lastNameParts] = params.name.trim().split(/\s+/);
  const lastName = lastNameParts.join(" ");

  await Promise.all([
    setDoc(doc(firestore, `${getPeopleCollectionPath(context)}/${personId}`), {
      id: personId,
      organizationId: context.organizationId,
      firstName: firstName || params.name.trim(),
      lastName,
      preferredName: firstName || params.name.trim(),
      whatsappPhone: params.phone ?? null,
      personType: "adult",
      memberStatus: "visitor",
      status: "active",
      createdAt,
      createdByUserId: params.capturedByUserId ?? null
    }),
    setDoc(doc(firestore, `${getVisitorJourneysCollectionPath(context)}/${journeyId}`), {
      id: journeyId,
      organizationId: context.organizationId,
      personId,
      originChannel: mapVisitorSourceToOriginChannel(params.source),
      currentStage: "new_visitor",
      status: "active",
      assignedToUserId: params.capturedByUserId ?? null,
      firstVisitDate: createdAt,
      nextActionAt: createdAt,
      createdAt
    }),
    setDoc(doc(firestore, `${getFollowUpTasksCollectionPath(context)}/${welcomeTaskId}`), {
      id: welcomeTaskId,
      organizationId: context.organizationId,
      personId,
      visitorJourneyId: journeyId,
      assignedToUserId: params.capturedByUserId ?? null,
      title: "Enviar boas-vindas no WhatsApp",
      type: "welcome_message",
      status: "open",
      dueAt: createdAt,
      createdAt
    }),
    setDoc(doc(firestore, `${getFollowUpTasksCollectionPath(context)}/${groupTaskId}`), {
      id: groupTaskId,
      organizationId: context.organizationId,
      personId,
      visitorJourneyId: journeyId,
      assignedToUserId: params.capturedByUserId ?? null,
      title: "Convidar para uma celula",
      type: "invite_to_group",
      status: "open",
      createdAt
    }),
    setDoc(doc(firestore, `${getVisitorIntakesCollectionPath(context)}/${intakeId}`), {
      id: intakeId,
      organizationId: context.organizationId,
      personId,
      journeyId,
      name: params.name,
      phone: params.phone ?? null,
      source: params.source,
      status: "journey_created",
      greeting: "Incluir nos cumprimentos da celebracao",
      capturedByUserId: params.capturedByUserId ?? null,
      createdAt
    })
  ]);

  return { groupTaskId, intakeId, journeyId, personId, welcomeTaskId };
}

export async function updateFollowUpTaskStatus(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    completedByUserId?: string;
    status: FollowUpTask["status"];
    taskId: string;
  }
) {
  const firestore = getFirebaseFirestore(config);

  await updateDoc(
    doc(firestore, `${getFollowUpTasksCollectionPath(context)}/${params.taskId}`),
    {
      status: params.status,
      completedAt: params.status === "completed" ? new Date().toISOString() : null,
      completedByUserId: params.completedByUserId ?? null,
      updatedAt: new Date().toISOString()
    }
  );
}

export async function publishFinancialTransparencyReport(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    balance: number;
    entries: Array<{
      amount: number;
      category: string;
      label: string;
      note: string;
    }>;
    expenses: number;
    income: number;
    missions: number;
    month: string;
    publishedByUserId?: string;
  }
) {
  const firestore = getFirebaseFirestore(config);
  const reportId = params.month
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  await setDoc(doc(firestore, `${getFinanceReportsCollectionPath(context)}/${reportId}`), {
    ...params,
    organizationId: context.organizationId,
    publishedAt: new Date().toISOString(),
    publishedByUserId: params.publishedByUserId ?? null,
    status: "published"
  });

  return { reportId };
}

export async function fetchFinancialTransparencyReports(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 6
) {
  const firestore = getFirebaseFirestore(config);
  const reportsQuery = query(
    collection(firestore, getFinanceReportsCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(reportsQuery);

  return snapshot.docs.map((item) =>
    toFinancialTransparencyReport(item.id, item.data())
  );
}

function mapVisitorSourceToOriginChannel(source: string): VisitorJourney["originChannel"] {
  const normalizedSource = source.toLowerCase();

  if (normalizedSource.includes("whatsapp")) {
    return "whatsapp";
  }

  if (normalizedSource.includes("instagram")) {
    return "app";
  }

  if (normalizedSource.includes("rua")) {
    return "secretary";
  }

  return "form";
}

export async function fetchGroups(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 8
) {
  const firestore = getFirebaseFirestore(config);
  const groupsQuery = query(
    collection(firestore, getGroupsCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(groupsQuery);

  return snapshot.docs.map((item) => toGroup(item.id, item.data()));
}

export async function fetchGroupMeetings(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  groups: readonly Group[],
  maxItemsPerGroup = 4
) {
  const firestore = getFirebaseFirestore(config);
  const snapshots = await Promise.all(
    groups.map(async (group) => {
      const meetingsQuery = query(
        collection(firestore, getGroupMeetingsCollectionPath(context, group.id)),
        limit(maxItemsPerGroup)
      );
      const snapshot = await getDocs(meetingsQuery);

      return snapshot.docs.map((item) => toGroupMeeting(item.id, item.data()));
    })
  );

  return snapshots.flat();
}

export async function fetchGroupAttendance(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  meetings: readonly GroupMeeting[],
  maxItemsPerMeeting = 6
) {
  const firestore = getFirebaseFirestore(config);
  const snapshots = await Promise.all(
    meetings.map(async (meeting) => {
      const attendanceQuery = query(
        collection(
          firestore,
          getGroupAttendanceCollectionPath(context, meeting.groupId, meeting.id)
        ),
        limit(maxItemsPerMeeting)
      );
      const snapshot = await getDocs(attendanceQuery);

      return snapshot.docs.map((item) => toGroupAttendance(item.id, item.data()));
    })
  );

  return snapshots.flat();
}

export async function fetchEvents(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 8
) {
  const firestore = getFirebaseFirestore(config);
  const eventsQuery = query(
    collection(firestore, getEventsCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(eventsQuery);

  return snapshot.docs.map((item) => toEvent(item.id, item.data()));
}

export async function fetchEventRegistrations(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  events: readonly Event[],
  maxItemsPerEvent = 6
) {
  const firestore = getFirebaseFirestore(config);
  const snapshots = await Promise.all(
    events.map(async (event) => {
      const registrationsQuery = query(
        collection(firestore, getEventRegistrationsCollectionPath(context, event.id)),
        limit(maxItemsPerEvent)
      );
      const snapshot = await getDocs(registrationsQuery);

      return snapshot.docs.map((item) => toEventRegistration(item.id, item.data()));
    })
  );

  return snapshots.flat();
}

export async function fetchEventCheckIns(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  events: readonly Event[],
  maxItemsPerEvent = 6
) {
  const firestore = getFirebaseFirestore(config);
  const snapshots = await Promise.all(
    events.map(async (event) => {
      const checkInsQuery = query(
        collection(firestore, getEventCheckInsCollectionPath(context, event.id)),
        limit(maxItemsPerEvent)
      );
      const snapshot = await getDocs(checkInsQuery);

      return snapshot.docs.map((item) => toEventCheckIn(item.id, item.data()));
    })
  );

  return snapshots.flat();
}

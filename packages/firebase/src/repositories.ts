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
  FamilyMember,
  FinancialTransparencyReport,
  FollowUpTask,
  Group,
  GroupAttendance,
  GroupMember,
  GroupMeeting,
  Organization,
  OrganizationBrandingSettings,
  OrganizationFeaturesSettings,
  OrganizationSettingsSnapshot,
  OrganizationSubscriptionSettings,
  PartnerBenefit,
  PartnerOrganization,
  MemberBenefitValidation,
  Person,
  ServiceAssignment,
  ServiceTeam,
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
  getFamilyMembersCollectionPath,
  getFollowUpTasksCollectionPath,
  getFinanceReportsCollectionPath,
  getGroupAttendanceCollectionPath,
  getGroupMembersCollectionPath,
  getGroupMeetingsCollectionPath,
  getGroupsCollectionPath,
  getMemberBenefitValidationsCollectionPath,
  getPartnerBenefitsCollectionPath,
  getPartnersCollectionPath,
  getPeopleCollectionPath,
  getServiceAssignmentsCollectionPath,
  getServiceTeamsCollectionPath,
  getUsersCollectionPath,
  getVisitorIntakesCollectionPath,
  getVisitorJourneysCollectionPath
} from "./index";

function getFirebaseFirestore(config: FirebaseWebRuntimeConfig): Firestore {
  return getFirestore(getFirebaseWebApp(config));
}

function cleanFirestoreData<T>(value: T): DocumentData {
  return removeUndefinedFields(value) as DocumentData;
}

function removeUndefinedFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefinedFields(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, removeUndefinedFields(entryValue)])
    );
  }

  return value;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
    cpf: data.cpf ? String(data.cpf) : undefined,
    address: data.address ? toPostalAddress(data.address as DocumentData) : undefined,
    occupation: data.occupation ? String(data.occupation) : undefined,
    educationLevel: data.educationLevel as Person["educationLevel"],
    householdIncomeRange: data.householdIncomeRange as Person["householdIncomeRange"],
    consentLgpdAt: data.consentLgpdAt ? String(data.consentLgpdAt) : undefined,
    memberCardCode: data.memberCardCode ? String(data.memberCardCode) : undefined,
    partnerBenefitsEnabled: Boolean(data.partnerBenefitsEnabled),
    personType: (data.personType as Person["personType"]) ?? "adult",
    memberStatus: (data.memberStatus as Person["memberStatus"]) ?? "visitor",
    status: (data.status as Person["status"]) ?? "active",
    tribePrimaryCode: data.tribePrimaryCode as Person["tribePrimaryCode"],
    tribeSecondaryCode: data.tribeSecondaryCode as Person["tribeSecondaryCode"]
  };
}

function toServiceTeam(documentId: string, data: DocumentData): ServiceTeam {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    campusId: data.campusId ? String(data.campusId) : undefined,
    code: String(data.code ?? documentId),
    name: String(data.name ?? ""),
    summary: data.summary ? String(data.summary) : undefined,
    targetVolunteers: typeof data.targetVolunteers === "number" ? data.targetVolunteers : undefined,
    status: (data.status as ServiceTeam["status"]) ?? "active"
  };
}

function toServiceAssignment(documentId: string, data: DocumentData): ServiceAssignment {
  const now = new Date().toISOString();

  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    campusId: data.campusId ? String(data.campusId) : undefined,
    serviceTeamId: String(data.serviceTeamId ?? data.ministryCode ?? ""),
    ministryCode: String(data.ministryCode ?? data.serviceTeamId ?? ""),
    personId: String(data.personId ?? ""),
    role: String(data.role ?? "Apoio"),
    serviceDate: String(data.serviceDate ?? now),
    status: (data.status as ServiceAssignment["status"]) ?? "pending",
    responseNote: data.responseNote ? String(data.responseNote) : undefined,
    confirmedAt: data.confirmedAt ? String(data.confirmedAt) : undefined,
    declinedAt: data.declinedAt ? String(data.declinedAt) : undefined,
    checkedInAt: data.checkedInAt ? String(data.checkedInAt) : undefined,
    absentAt: data.absentAt ? String(data.absentAt) : undefined,
    createdAt: String(data.createdAt ?? now),
    updatedAt: String(data.updatedAt ?? now)
  };
}

function toFamily(documentId: string, data: DocumentData): Family {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    campusId: data.campusId ? String(data.campusId) : undefined,
    familyName: String(data.familyName ?? ""),
    displayName: String(data.displayName ?? ""),
    status: (data.status as Family["status"]) ?? "active",
    address: data.address ? toPostalAddress(data.address as DocumentData) : undefined,
    incomeRange: data.incomeRange as Family["incomeRange"],
    notes: data.notes ? String(data.notes) : undefined
  };
}

function toFamilyMember(documentId: string, data: DocumentData): FamilyMember {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    familyId: String(data.familyId ?? ""),
    personId: String(data.personId ?? ""),
    relationshipType:
      (data.relationshipType as FamilyMember["relationshipType"]) ?? "other",
    isPrimaryContact: Boolean(data.isPrimaryContact),
    isFinancialResponsible: Boolean(data.isFinancialResponsible),
    isLegalGuardian: Boolean(data.isLegalGuardian)
  };
}

function toPartnerOrganization(documentId: string, data: DocumentData): PartnerOrganization {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    name: String(data.name ?? ""),
    category: (data.category as PartnerOrganization["category"]) ?? "community",
    status: (data.status as PartnerOrganization["status"]) ?? "inactive",
    contactName: data.contactName ? String(data.contactName) : undefined,
    contactPhone: data.contactPhone ? String(data.contactPhone) : undefined,
    city: data.city ? String(data.city) : undefined,
    state: data.state ? String(data.state) : undefined
  };
}

function toPartnerBenefit(documentId: string, data: DocumentData): PartnerBenefit {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    partnerId: String(data.partnerId ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    category: (data.category as PartnerBenefit["category"]) ?? "community",
    status: (data.status as PartnerBenefit["status"]) ?? "paused",
    discountLabel: String(data.discountLabel ?? ""),
    verificationMode: (data.verificationMode as PartnerBenefit["verificationMode"]) ?? "manual",
    validUntil: data.validUntil ? String(data.validUntil) : undefined,
    privacyNotes: String(data.privacyNotes ?? "")
  };
}

function toMemberBenefitValidation(
  documentId: string,
  data: DocumentData
): MemberBenefitValidation {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    partnerId: String(data.partnerId ?? ""),
    benefitId: String(data.benefitId ?? ""),
    personId: String(data.personId ?? ""),
    memberCardCode: String(data.memberCardCode ?? ""),
    validationStatus:
      (data.validationStatus as MemberBenefitValidation["validationStatus"]) ?? "denied",
    validatedAt: String(data.validatedAt ?? ""),
    exposedFields: Array.isArray(data.exposedFields)
      ? data.exposedFields.map(String)
      : []
  };
}

function toPostalAddress(data: DocumentData) {
  return {
    postalCode: data.postalCode ? String(data.postalCode) : undefined,
    street: data.street ? String(data.street) : undefined,
    number: data.number ? String(data.number) : undefined,
    complement: data.complement ? String(data.complement) : undefined,
    district: data.district ? String(data.district) : undefined,
    city: data.city ? String(data.city) : undefined,
    state: data.state ? String(data.state) : undefined,
    countryCode: data.countryCode ? String(data.countryCode) : undefined,
    geohash: data.geohash ? String(data.geohash) : undefined
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

function toGroupMember(documentId: string, data: DocumentData): GroupMember {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    groupId: String(data.groupId ?? ""),
    personId: String(data.personId ?? ""),
    roleInGroup: (data.roleInGroup as GroupMember["roleInGroup"]) ?? "member",
    joinedAt: String(data.joinedAt ?? "")
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

export async function saveOrganizationProfile(
  config: FirebaseWebRuntimeConfig,
  organization: Organization
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(doc(firestore, "organizations", organization.id), cleanFirestoreData(organization), {
    merge: true
  });
}

export async function saveOrganizationBrandingSettings(
  config: FirebaseWebRuntimeConfig,
  settings: OrganizationBrandingSettings
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getOrganizationBrandingDocumentPath({ organizationId: settings.organizationId })),
    cleanFirestoreData(settings),
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
    cleanFirestoreData(settings),
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
    cleanFirestoreData(settings),
    { merge: true }
  );
}

export async function savePersonProfile(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  person: Person
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(doc(firestore, getPeopleCollectionPath(context), person.id), cleanFirestoreData(person), {
    merge: true
  });
}

export async function updatePersonMemberStatus(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    memberStatus: Person["memberStatus"];
    personId: string;
    updatedByUserId?: string;
  }
) {
  const firestore = getFirebaseFirestore(config);
  await updateDoc(doc(firestore, getPeopleCollectionPath(context), params.personId), {
    memberStatus: params.memberStatus,
    memberStatusUpdatedAt: new Date().toISOString(),
    memberStatusUpdatedByUserId: params.updatedByUserId ?? null
  });
}

export async function saveFamilyProfile(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  family: Family
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(doc(firestore, getFamiliesCollectionPath(context), family.id), cleanFirestoreData(family), {
    merge: true
  });
}

export async function saveFamilyMemberProfile(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  member: FamilyMember
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getFamilyMembersCollectionPath(context, member.familyId), member.id),
    cleanFirestoreData(member),
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

export async function fetchPersonById(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  personId: string
) {
  const firestore = getFirebaseFirestore(config);
  const snapshot = await getDoc(doc(firestore, getPeopleCollectionPath(context), personId));

  if (!snapshot.exists()) {
    return null;
  }

  return toPerson(snapshot.id, snapshot.data());
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

export async function fetchFamilyById(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  familyId: string
) {
  const firestore = getFirebaseFirestore(config);
  const snapshot = await getDoc(doc(firestore, getFamiliesCollectionPath(context), familyId));

  if (!snapshot.exists()) {
    return null;
  }

  return toFamily(snapshot.id, snapshot.data());
}

export async function fetchFamilyMembers(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  familyId: string,
  maxItems = 20
) {
  const firestore = getFirebaseFirestore(config);
  const membersQuery = query(
    collection(firestore, getFamilyMembersCollectionPath(context, familyId)),
    limit(maxItems)
  );
  const snapshot = await getDocs(membersQuery);

  return snapshot.docs.map((item) => toFamilyMember(item.id, item.data()));
}

export async function fetchPartnerOrganizations(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 8
) {
  const firestore = getFirebaseFirestore(config);
  const partnersQuery = query(
    collection(firestore, getPartnersCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(partnersQuery);

  return snapshot.docs.map((item) => toPartnerOrganization(item.id, item.data()));
}

export async function fetchPartnerBenefits(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 8
) {
  const firestore = getFirebaseFirestore(config);
  const benefitsQuery = query(
    collection(firestore, getPartnerBenefitsCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(benefitsQuery);

  return snapshot.docs.map((item) => toPartnerBenefit(item.id, item.data()));
}

export async function fetchMemberBenefitValidations(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 8
) {
  const firestore = getFirebaseFirestore(config);
  const validationsQuery = query(
    collection(firestore, getMemberBenefitValidationsCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(validationsQuery);

  return snapshot.docs.map((item) => toMemberBenefitValidation(item.id, item.data()));
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

export async function createJourneyFollowUpTask(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    assignedToUserId?: string;
    dueAt?: string;
    personId: string;
    title: string;
    type: FollowUpTask["type"];
    visitorJourneyId?: string;
  }
) {
  const firestore = getFirebaseFirestore(config);
  const taskId = `followup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const task: FollowUpTask = {
    id: taskId,
    organizationId: context.organizationId,
    personId: params.personId,
    visitorJourneyId: params.visitorJourneyId ?? "",
    assignedToUserId: params.assignedToUserId,
    title: params.title,
    type: params.type,
    status: "open",
    dueAt: params.dueAt
  };

  await setDoc(
    doc(firestore, `${getFollowUpTasksCollectionPath(context)}/${taskId}`),
    cleanFirestoreData({
      ...task,
      createdAt: new Date().toISOString()
    }),
    { merge: true }
  );

  return task;
}

export async function updateVisitorJourneyStage(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    journeyId: string;
    stage: VisitorJourney["currentStage"];
    status?: VisitorJourney["status"];
    updatedByUserId?: string;
  }
) {
  const firestore = getFirebaseFirestore(config);
  await updateDoc(doc(firestore, `${getVisitorJourneysCollectionPath(context)}/${params.journeyId}`), {
    currentStage: params.stage,
    status: params.status ?? "active",
    updatedAt: new Date().toISOString(),
    updatedByUserId: params.updatedByUserId ?? null
  });
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

export async function createGroup(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    capacity?: number;
    city?: string;
    createdByUserId?: string;
    meetingDayOfWeek?: number;
    meetingTime?: string;
    name: string;
    state?: string;
    type?: Group["type"];
  }
) {
  const firestore = getFirebaseFirestore(config);
  const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const group: Group = {
    id: groupId,
    organizationId: context.organizationId,
    name: params.name,
    slug: slugify(params.name),
    type: params.type ?? "cell",
    status: "active",
    visibility: "internal",
    meetingDayOfWeek: params.meetingDayOfWeek,
    meetingTime: params.meetingTime,
    city: params.city,
    state: params.state,
    capacity: params.capacity
  };

  await setDoc(
    doc(firestore, getGroupsCollectionPath(context), groupId),
    cleanFirestoreData({
      ...group,
      createdAt: new Date().toISOString(),
      createdByUserId: params.createdByUserId
    }),
    { merge: true }
  );

  return group;
}

export async function fetchGroupMembers(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  groups: readonly Group[],
  maxItemsPerGroup = 20
) {
  const firestore = getFirebaseFirestore(config);
  const snapshots = await Promise.all(
    groups.map(async (group) => {
      const membersQuery = query(
        collection(firestore, getGroupMembersCollectionPath(context, group.id)),
        limit(maxItemsPerGroup)
      );
      const snapshot = await getDocs(membersQuery);

      return snapshot.docs.map((item) => toGroupMember(item.id, item.data()));
    })
  );

  return snapshots.flat();
}

export async function assignPersonToGroup(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    assignedByUserId?: string;
    groupId: string;
    personId: string;
    roleInGroup?: GroupMember["roleInGroup"];
  }
) {
  const firestore = getFirebaseFirestore(config);
  const memberId = `${params.groupId}_${params.personId}`;
  const member: GroupMember = {
    id: memberId,
    organizationId: context.organizationId,
    groupId: params.groupId,
    personId: params.personId,
    roleInGroup: params.roleInGroup ?? "visitor",
    joinedAt: new Date().toISOString()
  };

  await setDoc(
    doc(firestore, getGroupMembersCollectionPath(context, params.groupId), memberId),
    cleanFirestoreData({
      ...member,
      assignedByUserId: params.assignedByUserId
    }),
    { merge: true }
  );

  return member;
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

export async function createGroupMeeting(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    createdByUserId?: string;
    groupId: string;
    scheduledStartAt?: string;
  }
) {
  const firestore = getFirebaseFirestore(config);
  const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const meeting: GroupMeeting = {
    id: meetingId,
    organizationId: context.organizationId,
    groupId: params.groupId,
    scheduledStartAt: params.scheduledStartAt ?? new Date().toISOString(),
    meetingStatus: "scheduled"
  };

  await setDoc(
    doc(firestore, getGroupMeetingsCollectionPath(context, params.groupId), meetingId),
    cleanFirestoreData({
      ...meeting,
      createdAt: new Date().toISOString(),
      createdByUserId: params.createdByUserId
    }),
    { merge: true }
  );

  return meeting;
}

export async function updateGroupMeetingStatus(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    groupId: string;
    meetingId: string;
    status: GroupMeeting["meetingStatus"];
    updatedByUserId?: string;
  }
) {
  const firestore = getFirebaseFirestore(config);

  await updateDoc(
    doc(firestore, getGroupMeetingsCollectionPath(context, params.groupId), params.meetingId),
    {
      completedAt: params.status === "completed" ? new Date().toISOString() : null,
      meetingStatus: params.status,
      updatedAt: new Date().toISOString(),
      updatedByUserId: params.updatedByUserId ?? null
    }
  );
}

export async function recordGroupAttendance(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    groupId: string;
    groupMeetingId: string;
    personId: string;
    recordedByUserId?: string;
    status: GroupAttendance["attendanceStatus"];
  }
) {
  const firestore = getFirebaseFirestore(config);
  const attendanceId = `${params.groupMeetingId}_${params.personId}`;
  const attendance: GroupAttendance = {
    id: attendanceId,
    organizationId: context.organizationId,
    groupId: params.groupId,
    groupMeetingId: params.groupMeetingId,
    personId: params.personId,
    attendanceStatus: params.status
  };

  await setDoc(
    doc(
      firestore,
      getGroupAttendanceCollectionPath(context, params.groupId, params.groupMeetingId),
      attendanceId
    ),
    cleanFirestoreData({
      ...attendance,
      recordedAt: new Date().toISOString(),
      recordedByUserId: params.recordedByUserId
    }),
    { merge: true }
  );

  return attendance;
}

export async function fetchServiceTeams(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 20
) {
  const firestore = getFirebaseFirestore(config);
  const teamsQuery = query(
    collection(firestore, getServiceTeamsCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(teamsQuery);

  return snapshot.docs.map((item) => toServiceTeam(item.id, item.data()));
}

export async function saveServiceTeam(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  team: ServiceTeam
) {
  const firestore = getFirebaseFirestore(config);

  await setDoc(
    doc(firestore, getServiceTeamsCollectionPath(context), team.id),
    cleanFirestoreData({
      ...team,
      organizationId: context.organizationId,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );

  return team;
}

export async function fetchServiceAssignments(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 120
) {
  const firestore = getFirebaseFirestore(config);
  const assignmentsQuery = query(
    collection(firestore, getServiceAssignmentsCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(assignmentsQuery);

  return snapshot.docs.map((item) => toServiceAssignment(item.id, item.data()));
}

export async function saveServiceAssignment(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  assignment: ServiceAssignment
) {
  const firestore = getFirebaseFirestore(config);

  await setDoc(
    doc(firestore, getServiceAssignmentsCollectionPath(context), assignment.id),
    cleanFirestoreData({
      ...assignment,
      organizationId: context.organizationId,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );

  return assignment;
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

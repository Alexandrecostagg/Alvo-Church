import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore
} from "firebase/firestore";
import type { PlanId } from "./plans";
import { PLAN_LIMITS, currentAiMonth, planTierToPlanId, resolveBillingStatus } from "./plans";
import type {
  WeeklyTheme,
  AppRole,
  Event,
  EventCheckIn,
  EventRegistration,
  Family,
  FamilyMember,
  FinancialTransparencyReport,
  FinancialTransaction,
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
  CommunityStore,
  CommunityOffer,
  CommunityStoreModerationLog,
  MarketplacePromotion,
  CommunicationLogEntry,
  CommunicationTemplate,
  Person,
  ServiceAssignment,
  ServiceTeam,
  TenantRuntimeSnapshot,
  TenantContext,
  VisitorIntake,
  VisitorJourney,
  TribeAssessment,
  TribeAssessmentScore,
  MemberTribeHistoryEntry,
  LeaderEmotionalPulse,
  WellBeingResource,
  MentoringSession,
  EmergencySOS,
  WorshipSong,
  WorshipSetlist,
  GroupBannerConfig,
  Course,
  CourseModule,
  Lesson,
  MemberCourseProgress,
  TrainingProgram,
  TrainingProgramModule,
  TrainingLesson,
  ProgramEntitlement,
  ScheduleSwapRequest,
  MemberJourneyProfile,
  JourneyMission,
  Badge,
  MemberBadge,
  NetworkAffiliate,
  NetworkSnapshot,
  KidsCheckIn,
  OrganizationKidsSettings,
  GivingIntent,
  GivingCampaign,
  GivingReceipt,
  MemberContribution,
  ChurchAttendance,
  PrayerRequest,
  PrayerRequestStatus
} from "@alvo/types";
import { getFirebaseWebApp, getFirebaseFirestore, type FirebaseWebRuntimeConfig } from "./client";
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
  getFinancialTransactionsCollectionPath,
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
  getVisitorJourneysCollectionPath,
  getTribeAssessmentsCollectionPath,
  getTribeAssessmentScoresCollectionPath,
  getLeaderEmotionalPulseCollectionPath,
  getWellBeingResourcesCollectionPath,
  getMentoringSessionsCollectionPath,
  getEmergencySOSCollectionPath,
  getCommunityStoresCollectionPath,
  getCommunityOffersCollectionPath,
  getCommunityStoreModerationLogsCollectionPath,
  getMarketplacePromotionsCollectionPath,
  getCommunicationLogCollectionPath,
  getCommunicationTemplatesCollectionPath,
  getWorshipSongsCollectionPath,
  getWorshipSetlistsCollectionPath,
  getGroupBannersCollectionPath,
  getCoursesCollectionPath,
  getCourseModulesCollectionPath,
  getLessonsCollectionPath,
  getMemberCourseProgressCollectionPath,
  getPlatformProgramsCollectionPath,
  getPlatformProgramModulesCollectionPath,
  getPlatformProgramLessonsCollectionPath,
  getProgramEntitlementsCollectionPath,
  getKidsCheckInsCollectionPath,
  getOrganizationKidsSettingsDocumentPath,
  getGivingIntentsCollectionPath,
  getGivingCampaignsCollectionPath,
  getGivingReceiptsCollectionPath,
  getScheduleSwapRequestsCollectionPath,
  getJourneyProfilesCollectionPath,
  getJourneyMissionsCollectionPath,
  getBadgesCollectionPath,
  getMemberBadgesCollectionPath,
  getWeeklyThemesCollectionPath,
  getMemberContributionsCollectionPath,
  getContributionReceiptsCollectionPath,
  getMemberTribeHistoryCollectionPath,
  getChurchAttendanceCollectionPath,
  getPrayerRequestsCollectionPath
} from "./paths";



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
    publicProductName: String(data.publicProductName ?? "Plataforma Esdras"),
    publicShortName: String(data.publicShortName ?? "Esdras"),
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
    trialEndsAt: data.trialEndsAt ? String(data.trialEndsAt) : undefined,
    asaasCustomerId: data.asaasCustomerId ? String(data.asaasCustomerId) : undefined,
    asaasSubscriptionId: data.asaasSubscriptionId ? String(data.asaasSubscriptionId) : undefined,
    asaasStatus: data.asaasStatus ? String(data.asaasStatus) : undefined,
    billingStatus: (data.billingStatus as OrganizationSubscriptionSettings["billingStatus"]) ?? "active",
    overdueSince: data.overdueSince ? String(data.overdueSince) : undefined
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
      marketplace: data.modules?.marketplace ?? { enabled: false, source: "manual" },
      giving: data.modules?.giving ?? { enabled: false, source: "manual" },
      publicForms: data.modules?.publicForms ?? { enabled: false, source: "manual" },
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
    ownerPersonId: data.ownerPersonId ? String(data.ownerPersonId) : undefined,
    isMemberBusiness: Boolean(data.isMemberBusiness),
    logoUrl: data.logoUrl ? String(data.logoUrl) : undefined,
    website: data.website ? String(data.website) : undefined,
    instagram: data.instagram ? String(data.instagram) : undefined,
    address: data.address ? {
      street: String(data.address.street ?? ""),
      number: String(data.address.number ?? ""),
      district: String(data.address.district ?? ""),
      city: String(data.address.city ?? ""),
      state: String(data.address.state ?? ""),
      postalCode: String(data.address.postalCode ?? ""),
      lat: data.address.lat ? Number(data.address.lat) : undefined,
      lng: data.address.lng ? Number(data.address.lng) : undefined
    } : undefined
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

export async function fetchAllOrganizations(
  config: FirebaseWebRuntimeConfig
): Promise<import("@alvo/types").Organization[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, "organizations"));
  return snap.docs.map((d) => toOrganization(d.id, d.data()));
}

export async function isPlatformAdmin(
  config: FirebaseWebRuntimeConfig,
  uid: string
): Promise<boolean> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDoc(doc(firestore, "platformAdmins", uid));
  return snap.exists();
}

export interface PlatformOrgSummary {
  id: string;
  displayName: string;
  plan: PlanId;
  planTier?: string;
  memberCount: number;
  aiUsed: number;
  aiLimit: number;
  createdAt?: string;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;
}

// Painel do admin da plataforma (não confundir com "super_admin", que é só
// o topo da hierarquia DENTRO de uma organização). Agrega dados de TODAS as
// organizações — só funciona para quem está em platformAdmins/{uid}.
export async function fetchPlatformOverview(
  config: FirebaseWebRuntimeConfig
): Promise<PlatformOrgSummary[]> {
  const orgs = await fetchAllOrganizations(config);

  const summaries = await Promise.all(
    orgs.map(async (org): Promise<PlatformOrgSummary> => {
      const ctx = { organizationId: org.id };
      const [subscription, memberCount, aiQuota, recentAttendance] = await Promise.all([
        fetchOrganizationSubscriptionSettings(config, ctx).catch(() => null),
        countOrgMembers(config, ctx).catch(() => 0),
        getAiQuotaStatus(config, ctx).catch(() => null),
        fetchChurchAttendance(config, ctx, 1).catch(() => [])
      ]);

      const lastActivityAt = recentAttendance[0]?.serviceDate ?? subscription?.startedAt ?? null;
      const daysSinceActivity = lastActivityAt
        ? Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / (24 * 60 * 60 * 1000))
        : null;

      return {
        id: org.id,
        displayName: org.displayName ?? org.name,
        plan: aiQuota?.plan ?? "free",
        planTier: subscription?.planTier,
        memberCount,
        aiUsed: aiQuota?.used ?? 0,
        aiLimit: aiQuota?.limit ?? 0,
        createdAt: subscription?.startedAt,
        lastActivityAt,
        daysSinceActivity
      };
    })
  );

  return summaries.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function fetchOrganizationBySlug(
  config: FirebaseWebRuntimeConfig,
  slug: string
) {
  const firestore = getFirebaseFirestore(config);
  const q = query(collection(firestore, "organizations"), where("slug", "==", slug), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const first = snapshot.docs[0];
  return toOrganization(first.id, first.data());
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

export async function fetchTenantUser(
  config: FirebaseWebRuntimeConfig,
  params: { organizationId: string; userId: string }
): Promise<{
  roles: AppRole[];
  email: string;
  isActive: boolean;
  ministerialInterests?: string[];
  servingProfile?: string;
  availability?: string[];
  occupation?: string;
  educationLevel?: string;
  householdIncomeRange?: string;
} | null> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDoc(
    doc(firestore, getTenantUserDocumentPath({ organizationId: params.organizationId }, params.userId))
  );
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    roles: (data.roles ?? ["church_admin"]) as AppRole[],
    email: data.email ?? "",
    isActive: data.isActive ?? true,
    ministerialInterests: data.ministerialInterests,
    servingProfile: data.servingProfile,
    availability: data.availability,
    occupation: data.occupation,
    educationLevel: data.educationLevel,
    householdIncomeRange: data.householdIncomeRange,
  };
}

export async function fetchTenantUsers(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<{ id: string; email: string; roles: AppRole[]; isActive: boolean; createdAt?: string }[]> {
  const firestore = getFirebaseFirestore(config);
  const colPath = `organizations/${context.organizationId}/users`;
  const snap = await getDocs(collection(firestore, colPath));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      email: data.email ?? "",
      roles: (data.roles ?? ["member"]) as AppRole[],
      isActive: data.isActive ?? true,
      createdAt: data.createdAt,
    };
  });
}

export async function saveMemberProfile(
  config: FirebaseWebRuntimeConfig,
  params: { organizationId: string; userId: string },
  profile: {
    ministerialInterests?: string[];
    servingProfile?: string;
    availability?: string[];
    occupation?: string;
    educationLevel?: string;
    householdIncomeRange?: string;
  }
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getTenantUserDocumentPath({ organizationId: params.organizationId }, params.userId)),
    profile,
    { merge: true }
  );
}

export async function updateTenantUserRoles(
  config: FirebaseWebRuntimeConfig,
  params: { organizationId: string; userId: string; roles: AppRole[] }
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getTenantUserDocumentPath({ organizationId: params.organizationId }, params.userId)),
    { roles: params.roles },
    { merge: true }
  );
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

// ─── Self-serve signup ─────────────────────────────────────────────────────

// Provisiona uma organização nova a partir da LP pública: cria o doc da
// organização, o acesso de admin do dono, e settings de branding/assinatura/
// módulos com defaults do plano gratuito. A ordem importa — ver comentário
// em organization-new-view.tsx sobre a dependência das Firestore rules.
export async function provisionSelfServeOrganization(
  config: FirebaseWebRuntimeConfig,
  params: {
    organizationId: string;
    churchName: string;
    ownerUid: string;
    ownerEmail: string;
    taxId?: string;
    addressCity?: string;
    addressState?: string;
  }
): Promise<void> {
  const { organizationId, churchName, ownerUid, ownerEmail, taxId, addressCity, addressState } = params;
  const now = new Date().toISOString();

  const organization: Organization = {
    id: organizationId,
    name: churchName,
    displayName: churchName,
    publicName: churchName,
    slug: organizationId.replace(/^org_/, ""),
    status: "active",
    timezone: "America/Sao_Paulo",
    locale: "pt-BR",
    countryCode: "BR",
    organizationType: "church",
    organizationTier: "solo",
    ownerUid,
    taxId,
    addressCity,
    addressState
  };

  await saveOrganizationProfile(config, organization);

  await ensureTenantUserAccess(config, {
    organizationId,
    userId: ownerUid,
    email: ownerEmail,
    roles: ["church_admin"]
  });

  const branding: OrganizationBrandingSettings = {
    organizationId,
    brandMode: "co_branded",
    publicProductName: "Plataforma Esdras",
    publicShortName: "Esdras",
    primaryColor: "#f97316",
    secondaryColor: "#1c2433",
    showPoweredByAlvo: true
  };

  const subscription: OrganizationSubscriptionSettings = {
    organizationId,
    planCode: "gratuito",
    planTier: "base",
    billingCycle: "monthly",
    memberRange: "up_to_100",
    seatLimit: 4,
    campusLimit: 1,
    aiQuota: 50,
    whiteLabelEnabled: false,
    coBrandingEnabled: true,
    multiCampusEnabled: false,
    denominationalModeEnabled: false,
    startedAt: now
  };

  const mod = (enabled: boolean, source: "plan" | "addon" | "trial" | "manual") => ({ enabled, source });
  const features: OrganizationFeaturesSettings = {
    organizationId,
    modules: {
      core: mod(true, "plan"),
      visitors: mod(true, "plan"),
      groups: mod(true, "plan"),
      events: mod(true, "plan"),
      children: mod(true, "manual"),
      youth: mod(false, "addon"),
      volunteers: mod(true, "addon"),
      tribes: mod(true, "plan"),
      journeys: mod(true, "plan"),
      communication: mod(false, "addon"),
      marketplace: mod(false, "addon"),
      giving: mod(true, "addon"),
      publicForms: mod(true, "plan"),
      finance: mod(true, "addon"),
      ai: mod(true, "trial")
    }
  };

  await Promise.all([
    saveOrganizationBrandingSettings(config, branding),
    saveOrganizationSubscriptionSettings(config, subscription),
    saveOrganizationFeaturesSettings(config, features),
    // Grava o campo `plan` explicitamente — é o que fetchOrgPlan/PlanGuard
    // realmente leem para liberar Tribos/Finanças/IA Pastoral. Sem isso a
    // organização fica presa no tier "free" mesmo cadastrada no plano certo.
    setOrgPlan(config, { organizationId }, "free")
  ]);
}

// Reivindica um slug público (org_slugs/{slug}) para a organização recém-
// criada, usado pelo formulário público de visitantes. Só funciona uma vez
// por slug — Firestore rejeita create se o doc já existir, e as regras só
// permitem que o dono da organização faça essa reivindicação.
export async function claimOrganizationSlug(
  config: FirebaseWebRuntimeConfig,
  params: { slug: string; organizationId: string; displayName: string }
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  await setDoc(doc(firestore, "org_slugs", params.slug), {
    organizationId: params.organizationId,
    displayName: params.displayName
  });
}

export async function savePersonProfile(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  person: Person
) {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(firestore, getPeopleCollectionPath(context), person.id);

  // Precisa saber se é criação (não update) ANTES de escrever, pra só
  // incrementar o contador de membros — usado pela regra do Firestore que
  // barra o cadastro acima do limite do plano — quando é um cadastro novo.
  const existing = await getDoc(ref);
  await setDoc(ref, cleanFirestoreData(person), { merge: true });

  if (!existing.exists()) {
    await updateDoc(doc(firestore, "organizations", context.organizationId), {
      memberCount: increment(1)
    }).catch(() => {
      // Contador é auxiliar (só alimenta o limite de plano); se falhar,
      // não deve derrubar o cadastro que já foi salvo.
    });
  }
}

export async function deletePersonProfile(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  personId: string
) {
  const firestore = getFirebaseFirestore(config);
  await deleteDoc(doc(firestore, getPeopleCollectionPath(context), personId));
  await updateDoc(doc(firestore, "organizations", context.organizationId), {
    memberCount: increment(-1)
  }).catch(() => {});
}

// ─── Histórico de tribo do membro ───────────────────────────────────────────
// Cada mudança de tribo (classificação inicial da IA ou ajuste manual do admin)
// vira um registro imutável em people/{personId}/tribeHistory — auditoria.
export async function addMemberTribeHistory(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  personId: string,
  entry: Omit<MemberTribeHistoryEntry, "id" | "organizationId" | "personId" | "effectiveFrom"> & { effectiveFrom?: string }
): Promise<string> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(collection(firestore, getMemberTribeHistoryCollectionPath(context, personId)));
  await setDoc(ref, cleanFirestoreData({
    id: ref.id,
    organizationId: context.organizationId,
    personId,
    ...entry,
    effectiveFrom: entry.effectiveFrom ?? new Date().toISOString(),
  }));
  return ref.id;
}

export async function fetchMemberTribeHistory(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  personId: string,
  maxItems = 50
): Promise<MemberTribeHistoryEntry[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(
    query(collection(firestore, getMemberTribeHistoryCollectionPath(context, personId)), limit(maxItems))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MemberTribeHistoryEntry))
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
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

export async function updateVisitorIntakeStatus(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    intakeId: string;
    status: VisitorIntake["status"];
    updatedByUserId?: string;
  }
) {
  const firestore = getFirebaseFirestore(config);
  await updateDoc(doc(firestore, `${getVisitorIntakesCollectionPath(context)}/${params.intakeId}`), {
    status: params.status,
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
    note?: string;
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
      greeting: params.note || "Incluir nos cumprimentos da celebracao",
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
    tribeCode?: string;
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
    capacity: params.capacity,
    tribeCode: params.tribeCode as any
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

export async function updateGroup(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  groupId: string,
  patch: Partial<Pick<Group, "name" | "type" | "meetingDayOfWeek" | "meetingTime" | "city" | "state" | "capacity" | "status">>
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getGroupsCollectionPath(context), groupId),
    cleanFirestoreData({ ...patch, updatedAt: new Date().toISOString() }),
    { merge: true }
  );
}

export async function deleteGroup(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  groupId: string
) {
  const firestore = getFirebaseFirestore(config);
  await deleteDoc(doc(firestore, getGroupsCollectionPath(context), groupId));
}

export async function removeGroupMember(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  groupId: string,
  personId: string
) {
  const firestore = getFirebaseFirestore(config);
  const memberId = `${groupId}_${personId}`;
  await deleteDoc(doc(firestore, getGroupMembersCollectionPath(context, groupId), memberId));
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

export async function deleteServiceAssignment(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  assignmentId: string
) {
  const firestore = getFirebaseFirestore(config);
  await deleteDoc(
    doc(firestore, getServiceAssignmentsCollectionPath(context), assignmentId)
  );
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
export async function fetchTribeAssessments(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 10
) {
  const firestore = getFirebaseFirestore(config);
  const assessmentsQuery = query(
    collection(firestore, getTribeAssessmentsCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(assessmentsQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  } as TribeAssessment));
}

export async function saveTribeAssessment(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  assessment: TribeAssessment,
  scores: TribeAssessmentScore[]
) {
  const firestore = getFirebaseFirestore(config);

  // Assessment + scores num único writeBatch: atômico (ou grava tudo, ou
  // nada) e um único round-trip em vez de 1 + N escritas individuais.
  const batch = writeBatch(firestore);

  batch.set(
    doc(firestore, getTribeAssessmentsCollectionPath(context), assessment.id),
    cleanFirestoreData({
      ...assessment,
      organizationId: context.organizationId,
      submittedAt: new Date().toISOString()
    }),
    { merge: true }
  );

  for (const score of scores) {
    batch.set(
      doc(firestore, getTribeAssessmentScoresCollectionPath(context, assessment.id), score.id),
      cleanFirestoreData({
        ...score,
        organizationId: context.organizationId,
        tribeAssessmentId: assessment.id
      }),
      { merge: true }
    );
  }

  await batch.commit();

  return assessment;
}

export async function fetchLeaderEmotionalPulses(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  leaderId: string,
  maxItems = 30
) {
  const firestore = getFirebaseFirestore(config);
  // Filtro no servidor: antes o limit(maxItems) era aplicado ANTES do filtro
  // por leaderId — se os primeiros 30 docs fossem de outros líderes, o
  // resultado vinha vazio mesmo havendo dados (além de baixar docs à toa).
  const pulsesQuery = query(
    collection(firestore, getLeaderEmotionalPulseCollectionPath(context)),
    where("leaderId", "==", leaderId),
    limit(maxItems)
  );
  const snapshot = await getDocs(pulsesQuery);

  return snapshot.docs
    .map((doc) => toLeaderEmotionalPulse(doc.id, doc.data()))
    .sort((a, b) => b.notedAt.localeCompare(a.notedAt));
}

export async function saveLeaderEmotionalPulse(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  pulse: Omit<LeaderEmotionalPulse, "id">
) {
  const firestore = getFirebaseFirestore(config);
  const id = doc(collection(firestore, getLeaderEmotionalPulseCollectionPath(context))).id;
  
  const docRef = doc(firestore, getLeaderEmotionalPulseCollectionPath(context), id);
  await setDoc(docRef, cleanFirestoreData({
    ...pulse,
    id
  }));

  return { ...pulse, id };
}

export async function fetchWellBeingResources(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  category?: WellBeingResource["category"]
) {
  const firestore = getFirebaseFirestore(config);
  // Quando há categoria, filtra no servidor em vez de baixar a coleção
  // inteira e filtrar em JS.
  const resourcesQuery = category
    ? query(
        collection(firestore, getWellBeingResourcesCollectionPath(context)),
        where("category", "==", category)
      )
    : query(collection(firestore, getWellBeingResourcesCollectionPath(context)));
  const snapshot = await getDocs(resourcesQuery);

  return snapshot.docs.map((doc) => toWellBeingResource(doc.id, doc.data()));
}

export async function fetchMentoringSessions(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  leaderId: string
) {
  const firestore = getFirebaseFirestore(config);
  // Filtro por líder no servidor — antes baixava as sessões de TODOS os
  // líderes da organização para filtrar em JS.
  const sessionsQuery = query(
    collection(firestore, getMentoringSessionsCollectionPath(context)),
    where("leaderId", "==", leaderId)
  );
  const snapshot = await getDocs(sessionsQuery);

  return snapshot.docs
    .map((doc) => toMentoringSession(doc.id, doc.data()))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function triggerEmergencySOS(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  leaderId: string,
  reason?: string
) {
  const firestore = getFirebaseFirestore(config);
  const id = doc(collection(firestore, getEmergencySOSCollectionPath(context))).id;
  
  const sos: EmergencySOS = {
    id,
    organizationId: context.organizationId,
    leaderId,
    triggeredAt: new Date().toISOString(),
    reason: reason || "Motivo não especificado",
    status: "active"
  };

  await setDoc(
    doc(firestore, getEmergencySOSCollectionPath(context), id),
    cleanFirestoreData(sos)
  );

  return sos;
}

export async function fetchPartnerOrganizations(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 50
) {
  const firestore = getFirebaseFirestore(config);
  const partnersQuery = query(
    collection(firestore, getPartnersCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(partnersQuery);

  return snapshot.docs.map((item) => toPartnerOrganization(item.id, item.data()));
}

export async function savePartnerOrganization(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  partner: PartnerOrganization
) {
  const firestore = getFirebaseFirestore(config);

  await setDoc(
    doc(firestore, getPartnersCollectionPath(context), partner.id),
    cleanFirestoreData({
      ...partner,
      organizationId: context.organizationId,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );

  return partner;
}

export async function fetchPartnerBenefits(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 100
) {
  const firestore = getFirebaseFirestore(config);
  const benefitsQuery = query(
    collection(firestore, getPartnerBenefitsCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(benefitsQuery);

  return snapshot.docs.map((item) => toPartnerBenefit(item.id, item.data()));
}

export async function savePartnerBenefit(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  benefit: PartnerBenefit
) {
  const firestore = getFirebaseFirestore(config);

  await setDoc(
    doc(firestore, getPartnerBenefitsCollectionPath(context), benefit.id),
    cleanFirestoreData({
      ...benefit,
      organizationId: context.organizationId,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );

  return benefit;
}

export async function saveMemberBenefitValidation(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  validation: MemberBenefitValidation
) {
  const firestore = getFirebaseFirestore(config);

  await setDoc(
    doc(firestore, getMemberBenefitValidationsCollectionPath(context), validation.id),
    cleanFirestoreData({
      ...validation,
      organizationId: context.organizationId,
      createdAt: new Date().toISOString()
    }),
    { merge: true }
  );

  return validation;
}

// Community Stores Repositories
export async function fetchCommunityStores(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 100
) {
  const firestore = getFirebaseFirestore(config);
  const storesQuery = query(
    collection(firestore, getCommunityStoresCollectionPath(context)),
    limit(maxItems)
  );
  const snapshot = await getDocs(storesQuery);

  return snapshot.docs.map((item) => toCommunityStore(item.id, item.data()));
}

export async function fetchCommunityStoreById(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  storeId: string
) {
  const firestore = getFirebaseFirestore(config);
  const docRef = doc(firestore, getCommunityStoresCollectionPath(context), storeId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Store ${storeId} not found`);
  }

  return toCommunityStore(docSnap.id, docSnap.data());
}

export async function saveCommunityStore(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  store: CommunityStore
) {
  const firestore = getFirebaseFirestore(config);

  await setDoc(
    doc(firestore, getCommunityStoresCollectionPath(context), store.id),
    cleanFirestoreData({
      ...store,
      organizationId: context.organizationId,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );

  return store;
}

export async function fetchCommunityOffers(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  storeId: string,
  maxItems = 50
) {
  const firestore = getFirebaseFirestore(config);
  const offersQuery = query(
    collection(firestore, getCommunityOffersCollectionPath(context, storeId)),
    limit(maxItems)
  );
  const snapshot = await getDocs(offersQuery);

  return snapshot.docs.map((item) => toCommunityOffer(item.id, item.data()));
}

export async function saveCommunityOffer(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  storeId: string,
  offer: CommunityOffer
) {
  const firestore = getFirebaseFirestore(config);

  await setDoc(
    doc(firestore, getCommunityOffersCollectionPath(context, storeId), offer.id),
    cleanFirestoreData({
      ...offer,
      organizationId: context.organizationId,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );

  return offer;
}

// Publica uma promoção do marketplace (nível flat da org) — o app lê daqui pro
// feed/badge de notificação in-app.
export async function saveMarketplacePromotion(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  promotion: Omit<MarketplacePromotion, "id" | "createdAt" | "organizationId"> & { id?: string; createdAt?: string }
): Promise<string> {
  const firestore = getFirebaseFirestore(config);
  const ref = promotion.id
    ? doc(firestore, getMarketplacePromotionsCollectionPath(context), promotion.id)
    : doc(collection(firestore, getMarketplacePromotionsCollectionPath(context)));
  await setDoc(ref, cleanFirestoreData({
    organizationId: context.organizationId,
    storeId: promotion.storeId,
    storeName: promotion.storeName,
    title: promotion.title,
    description: promotion.description,
    validUntil: promotion.validUntil,
    status: promotion.status ?? "active",
    createdBy: promotion.createdBy,
    createdAt: promotion.createdAt ?? new Date().toISOString(),
  }), { merge: true });
  return ref.id;
}

// Lê as promoções ativas da org, mais recentes primeiro (feed do app / web).
export async function fetchMarketplacePromotions(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  take = 50
): Promise<MarketplacePromotion[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(query(
    collection(firestore, getMarketplacePromotionsCollectionPath(context)),
    orderBy("createdAt", "desc"),
    limit(take)
  ));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MarketplacePromotion))
    .filter((p) => p.status === "active");
}

// ── Comunicação: histórico de envios + templates ────────────────────────────
export async function addCommunicationLogEntry(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  entry: Omit<CommunicationLogEntry, "id" | "createdAt" | "organizationId"> & { createdAt?: string }
): Promise<string> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(collection(firestore, getCommunicationLogCollectionPath(context)));
  await setDoc(ref, cleanFirestoreData({
    organizationId: context.organizationId,
    channel: entry.channel,
    message: entry.message,
    recipientCount: entry.recipientCount,
    sentCount: entry.sentCount,
    failedCount: entry.failedCount,
    sentByUserId: entry.sentByUserId,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  }));
  return ref.id;
}

export async function fetchCommunicationLog(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  take = 30
): Promise<CommunicationLogEntry[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(query(
    collection(firestore, getCommunicationLogCollectionPath(context)),
    orderBy("createdAt", "desc"),
    limit(take)
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunicationLogEntry));
}

export async function saveCommunicationTemplate(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  template: Omit<CommunicationTemplate, "id" | "createdAt" | "organizationId"> & { id?: string; createdAt?: string }
): Promise<string> {
  const firestore = getFirebaseFirestore(config);
  const ref = template.id
    ? doc(firestore, getCommunicationTemplatesCollectionPath(context), template.id)
    : doc(collection(firestore, getCommunicationTemplatesCollectionPath(context)));
  await setDoc(ref, cleanFirestoreData({
    organizationId: context.organizationId,
    title: template.title,
    message: template.message,
    createdByUserId: template.createdByUserId,
    createdAt: template.createdAt ?? new Date().toISOString(),
  }), { merge: true });
  return ref.id;
}

export async function fetchCommunicationTemplates(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  take = 30
): Promise<CommunicationTemplate[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(query(
    collection(firestore, getCommunicationTemplatesCollectionPath(context)),
    orderBy("createdAt", "desc"),
    limit(take)
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunicationTemplate));
}

export async function deleteCommunicationTemplate(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  templateId: string
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  await deleteDoc(doc(firestore, getCommunicationTemplatesCollectionPath(context), templateId));
}

export async function fetchCommunityStoreModerationLogs(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  storeId?: string,
  maxItems = 100
) {
  const firestore = getFirebaseFirestore(config);
  // Quando há storeId, filtra no servidor — antes o limit(100) global podia
  // deixar de fora logs da loja pedida (e baixava logs de outras lojas).
  const logsQuery = storeId
    ? query(
        collection(firestore, getCommunityStoreModerationLogsCollectionPath(context)),
        where("storeId", "==", storeId),
        limit(maxItems)
      )
    : query(
        collection(firestore, getCommunityStoreModerationLogsCollectionPath(context)),
        limit(maxItems)
      );
  const snapshot = await getDocs(logsQuery);

  return snapshot.docs.map((item) => toCommunityStoreModerationLog(item.id, item.data()));
}

export async function saveCommunityStoreModerationLog(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  log: CommunityStoreModerationLog
) {
  const firestore = getFirebaseFirestore(config);

  await setDoc(
    doc(firestore, getCommunityStoreModerationLogsCollectionPath(context), log.id),
    cleanFirestoreData({
      ...log,
      organizationId: context.organizationId
    }),
    { merge: true }
  );

  return log;
}

// Conversion functions
function toCommunityStore(documentId: string, data: DocumentData): CommunityStore {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    ownerId: String(data.ownerId ?? ""),
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    category: (data.category as CommunityStore["category"]) ?? "community",
    status: (data.status as CommunityStore["status"]) ?? "pending",
    images: Array.isArray(data.images) ? data.images.map(String) : [],
    bannerImageUrl: data.bannerImageUrl ? String(data.bannerImageUrl) : undefined,
    contact: {
      phone: data.contact?.phone ? String(data.contact.phone) : undefined,
      email: data.contact?.email ? String(data.contact.email) : undefined,
      address: data.contact?.address ? {
        postalCode: data.contact.address.postalCode ? String(data.contact.address.postalCode) : undefined,
        street: data.contact.address.street ? String(data.contact.address.street) : undefined,
        number: data.contact.address.number ? String(data.contact.address.number) : undefined,
        complement: data.contact.address.complement ? String(data.contact.address.complement) : undefined,
        district: data.contact.address.district ? String(data.contact.address.district) : undefined,
        city: data.contact.address.city ? String(data.contact.address.city) : undefined,
        state: data.contact.address.state ? String(data.contact.address.state) : undefined,
        countryCode: data.contact.address.countryCode ? String(data.contact.address.countryCode) : undefined,
        geohash: data.contact.address.geohash ? String(data.contact.address.geohash) : undefined
      } : undefined
    },
    socialLinks: data.socialLinks ? {
      instagram: data.socialLinks.instagram ? String(data.socialLinks.instagram) : undefined,
      whatsapp: data.socialLinks.whatsapp ? String(data.socialLinks.whatsapp) : undefined,
      website: data.socialLinks.website ? String(data.socialLinks.website) : undefined,
      facebook: data.socialLinks.facebook ? String(data.socialLinks.facebook) : undefined
    } : undefined,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
    approvedAt: data.approvedAt ? String(data.approvedAt) : undefined,
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : undefined,
    suspensionReason: data.suspensionReason ? String(data.suspensionReason) : undefined,
    moderatedBy: data.moderatedBy ? String(data.moderatedBy) : undefined
  };
}

function toCommunityOffer(documentId: string, data: DocumentData): CommunityOffer {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    storeId: String(data.storeId ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    type: (data.type as CommunityOffer["type"]) ?? "promotion",
    discountPercentage: data.discountPercentage ? Number(data.discountPercentage) : undefined,
    discountAmount: data.discountAmount ? Number(data.discountAmount) : undefined,
    images: Array.isArray(data.images) ? data.images.map(String) : [],
    validFrom: String(data.validFrom ?? ""),
    validUntil: String(data.validUntil ?? ""),
    status: (data.status as CommunityOffer["status"]) ?? "active",
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
    createdBy: String(data.createdBy ?? "")
  };
}

function toCommunityStoreModerationLog(documentId: string, data: DocumentData): CommunityStoreModerationLog {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    storeId: String(data.storeId ?? ""),
    action: (data.action as CommunityStoreModerationLog["action"]) ?? "created",
    moderatedBy: String(data.moderatedBy ?? ""),
    reason: data.reason ? String(data.reason) : undefined,
    previousStatus: data.previousStatus as CommunityStoreModerationLog["previousStatus"],
    newStatus: data.newStatus as CommunityStoreModerationLog["newStatus"],
    timestamp: String(data.timestamp ?? ""),
    notes: data.notes ? String(data.notes) : undefined
  };
}

function toLeaderEmotionalPulse(documentId: string, data: DocumentData): LeaderEmotionalPulse {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    leaderId: String(data.leaderId ?? ""),
    mood: data.mood,
    energyLevel: Number(data.energyLevel ?? 5),
    stressLevel: Number(data.stressLevel ?? 5),
    notedAt: String(data.notedAt ?? data.timestamp ?? ""),
    notes: data.notes ? String(data.notes) : undefined
  };
}

function toWellBeingResource(documentId: string, data: DocumentData): WellBeingResource {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    category: data.category,
    contentUrl: String(data.contentUrl ?? data.url ?? ""),
    thumbnailUrl: data.thumbnailUrl ? String(data.thumbnailUrl) : undefined,
    durationMinutes: typeof data.durationMinutes === "number" ? data.durationMinutes : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : []
  };
}

function toMentoringSession(documentId: string, data: DocumentData): MentoringSession {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    leaderId: String(data.leaderId ?? ""),
    mentorName: String(data.mentorName ?? ""),
    scheduledAt: String(data.scheduledAt ?? ""),
    durationMinutes: Number(data.durationMinutes ?? 60),
    status: data.status,
    summaryNotes: data.summaryNotes ? String(data.summaryNotes) : undefined,
    meetingLink: data.meetingLink ? String(data.meetingLink) : undefined
  };
}

function toEmergencySOS(documentId: string, data: DocumentData): EmergencySOS {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    leaderId: String(data.leaderId ?? ""),
    triggeredAt: String(data.triggeredAt ?? ""),
    reason: String(data.reason ?? ""),
    status: data.status,
    resolvedAt: data.resolvedAt ? String(data.resolvedAt) : undefined,
    resolvedByUserId: data.resolvedByUserId ? String(data.resolvedByUserId) : undefined
  };
}

// worship setlists mappers
function toWorshipSong(documentId: string, data: DocumentData): WorshipSong {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    title: String(data.title ?? ""),
    artist: String(data.artist ?? ""),
    originalKey: String(data.originalKey ?? "C"),
    tempoBpm: data.tempoBpm ? Number(data.tempoBpm) : undefined,
    spotifyUrl: data.spotifyUrl ? String(data.spotifyUrl) : undefined,
    youtubeUrl: data.youtubeUrl ? String(data.youtubeUrl) : undefined,
    chordsLyrics: data.chordsLyrics ? String(data.chordsLyrics) : undefined,
    createdAt: String(data.createdAt ?? "")
  };
}

function toWorshipSetlist(documentId: string, data: DocumentData): WorshipSetlist {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    eventId: String(data.eventId ?? ""),
    songs: Array.isArray(data.songs)
      ? data.songs.map((s) => ({
          songId: String(s.songId),
          selectedKey: String(s.selectedKey),
          sortOrder: Number(s.sortOrder ?? 0)
        }))
      : [],
    updatedAt: String(data.updatedAt ?? "")
  };
}

// Esdras Canvas mapper
function toGroupBannerConfig(documentId: string, data: DocumentData): GroupBannerConfig {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    groupId: String(data.groupId ?? ""),
    themeColor: String(data.themeColor ?? "#d27836"),
    titleText: String(data.titleText ?? "Culto de Célula"),
    subtitleText: data.subtitleText ? String(data.subtitleText) : undefined,
    bannerFormat: (data.bannerFormat as GroupBannerConfig["bannerFormat"]) ?? "feed",
    showLeaderPhoto: Boolean(data.showLeaderPhoto),
    customAddress: data.customAddress ? String(data.customAddress) : undefined,
    updatedAt: String(data.updatedAt ?? "")
  };
}

// LMS / EAD mappers
function toCourse(documentId: string, data: DocumentData): Course {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    thumbnailUrl: data.thumbnailUrl ? String(data.thumbnailUrl) : undefined,
    instructorName: data.instructorName ? String(data.instructorName) : undefined,
    instructorTitle: data.instructorTitle ? String(data.instructorTitle) : undefined,
    badgeUnlockedId: data.badgeUnlockedId ? String(data.badgeUnlockedId) : undefined,
    isActive: Boolean(data.isActive),
    createdAt: String(data.createdAt ?? "")
  };
}

function toCourseModule(documentId: string, data: DocumentData): CourseModule {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    courseId: String(data.courseId ?? ""),
    title: String(data.title ?? ""),
    sortOrder: Number(data.sortOrder ?? 0)
  };
}

function toLesson(documentId: string, data: DocumentData): Lesson {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    courseId: String(data.courseId ?? ""),
    moduleId: String(data.moduleId ?? ""),
    title: String(data.title ?? ""),
    videoUrl: String(data.videoUrl ?? ""),
    durationMinutes: Number(data.durationMinutes ?? 0),
    sortOrder: Number(data.sortOrder ?? 0)
  };
}

function toMemberCourseProgress(documentId: string, data: DocumentData): MemberCourseProgress {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    memberId: String(data.memberId ?? ""),
    courseId: String(data.courseId ?? ""),
    completedLessons: Array.isArray(data.completedLessons) ? data.completedLessons.map(String) : [],
    isCompleted: Boolean(data.isCompleted),
    completedAt: data.completedAt ? String(data.completedAt) : undefined,
    updatedAt: String(data.updatedAt ?? "")
  };
}


// --- WORSHIP REPOSITORY METHODS ---

export async function fetchWorshipSongs(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<WorshipSong[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getWorshipSongsCollectionPath(context)));
  return snap.docs.map((d) => toWorshipSong(d.id, d.data()));
}

export async function saveWorshipSong(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  song: WorshipSong
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getWorshipSongsCollectionPath(context), song.id),
    cleanFirestoreData(song),
    { merge: true }
  );
}

export async function fetchWorshipSetlistByEventId(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  eventId: string
): Promise<WorshipSetlist | null> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDoc(doc(firestore, getWorshipSetlistsCollectionPath(context), eventId));
  if (!snap.exists()) return null;
  return toWorshipSetlist(snap.id, snap.data());
}

export async function saveWorshipSetlist(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  setlist: WorshipSetlist
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getWorshipSetlistsCollectionPath(context), setlist.id),
    cleanFirestoreData(setlist),
    { merge: true }
  );
}


// --- ALVO CANVAS REPOSITORY METHODS ---

export async function fetchGroupBannerConfig(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  groupId: string
): Promise<GroupBannerConfig | null> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDoc(doc(firestore, getGroupBannersCollectionPath(context), groupId));
  if (!snap.exists()) return null;
  return toGroupBannerConfig(snap.id, snap.data());
}

export async function saveGroupBannerConfig(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  banner: GroupBannerConfig
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getGroupBannersCollectionPath(context), banner.groupId),
    cleanFirestoreData(banner),
    { merge: true }
  );
}


// --- LMS / EAD REPOSITORY METHODS ---

export async function fetchCourses(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<Course[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getCoursesCollectionPath(context)));
  return snap.docs.map((d) => toCourse(d.id, d.data()));
}

export async function fetchCourseModules(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  courseId: string
): Promise<CourseModule[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getCourseModulesCollectionPath(context, courseId)));
  return snap.docs.map((d) => toCourseModule(d.id, d.data())).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchCourseLessons(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  courseId: string
): Promise<Lesson[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getLessonsCollectionPath(context, courseId)));
  return snap.docs.map((d) => toLesson(d.id, d.data())).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchMemberCourseProgress(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  memberId: string,
  courseId: string
): Promise<MemberCourseProgress | null> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDoc(
    doc(firestore, getMemberCourseProgressCollectionPath(context, memberId), courseId)
  );
  if (!snap.exists()) return null;
  return toMemberCourseProgress(snap.id, snap.data());
}

export async function saveMemberCourseProgress(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  progress: MemberCourseProgress
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getMemberCourseProgressCollectionPath(context, progress.memberId), progress.courseId),
    cleanFirestoreData(progress),
    { merge: true }
  );
}

export async function saveCourse(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  course: Course
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getCoursesCollectionPath(context), course.id),
    cleanFirestoreData(course),
    { merge: true }
  );
}

export async function saveCourseModule(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  module: CourseModule
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getCourseModulesCollectionPath(context, module.courseId), module.id),
    cleanFirestoreData(module),
    { merge: true }
  );
}

export async function saveLesson(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  lesson: Lesson
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getLessonsCollectionPath(context, lesson.courseId), lesson.id),
    cleanFirestoreData(lesson),
    { merge: true }
  );
}

export async function deleteCourse(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  courseId: string
) {
  const firestore = getFirebaseFirestore(config);
  await deleteDoc(doc(firestore, getCoursesCollectionPath(context), courseId));
}

export async function deleteCourseModule(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  courseId: string,
  moduleId: string
) {
  const firestore = getFirebaseFirestore(config);
  await deleteDoc(doc(firestore, getCourseModulesCollectionPath(context, courseId), moduleId));
}

export async function deleteLesson(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  courseId: string,
  lessonId: string
) {
  const firestore = getFirebaseFirestore(config);
  await deleteDoc(doc(firestore, getLessonsCollectionPath(context, courseId), lessonId));
}

// ─── Loja de Capacitação (catálogo global + entitlements por org) ──────────────

function toTrainingProgram(documentId: string, data: DocumentData): TrainingProgram {
  return {
    id: documentId,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    thumbnailUrl: data.thumbnailUrl ? String(data.thumbnailUrl) : undefined,
    priceBRL: Number(data.priceBRL ?? 0),
    isPublished: Boolean(data.isPublished),
    instructorName: data.instructorName ? String(data.instructorName) : undefined,
    instructorTitle: data.instructorTitle ? String(data.instructorTitle) : undefined,
    badgeUnlockedId: data.badgeUnlockedId ? String(data.badgeUnlockedId) : undefined,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? "")
  };
}

function toTrainingProgramModule(documentId: string, data: DocumentData): TrainingProgramModule {
  return {
    id: documentId,
    programId: String(data.programId ?? ""),
    title: String(data.title ?? ""),
    sortOrder: Number(data.sortOrder ?? 0)
  };
}

function toTrainingLesson(documentId: string, data: DocumentData): TrainingLesson {
  return {
    id: documentId,
    programId: String(data.programId ?? ""),
    moduleId: data.moduleId ? String(data.moduleId) : undefined,
    title: String(data.title ?? ""),
    videoUrl: String(data.videoUrl ?? ""),
    durationMinutes: Number(data.durationMinutes ?? 0),
    sortOrder: Number(data.sortOrder ?? 0)
  };
}

function toProgramEntitlement(documentId: string, data: DocumentData): ProgramEntitlement {
  return {
    id: documentId,
    programId: String(data.programId ?? documentId),
    status: (data.status as ProgramEntitlement["status"]) ?? "active",
    purchasedAt: String(data.purchasedAt ?? ""),
    asaasPaymentId: String(data.asaasPaymentId ?? ""),
    asaasStatus: data.asaasStatus ? String(data.asaasStatus) : undefined
  };
}

// Leitura do catálogo. publishedOnly=true é o caso da loja (igrejas);
// o platform-admin passa false para ver rascunhos.
export async function fetchTrainingPrograms(
  config: FirebaseWebRuntimeConfig,
  publishedOnly = true
): Promise<TrainingProgram[]> {
  const firestore = getFirebaseFirestore(config);
  const col = collection(firestore, getPlatformProgramsCollectionPath());
  const snap = publishedOnly
    ? await getDocs(query(col, where("isPublished", "==", true)))
    : await getDocs(col);
  return snap.docs.map((d) => toTrainingProgram(d.id, d.data()));
}

export async function fetchTrainingProgramById(
  config: FirebaseWebRuntimeConfig,
  programId: string
): Promise<TrainingProgram | null> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDoc(doc(firestore, getPlatformProgramsCollectionPath(), programId));
  if (!snap.exists()) return null;
  return toTrainingProgram(snap.id, snap.data());
}

export async function fetchTrainingProgramModules(
  config: FirebaseWebRuntimeConfig,
  programId: string
): Promise<TrainingProgramModule[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getPlatformProgramModulesCollectionPath(programId)));
  return snap.docs.map((d) => toTrainingProgramModule(d.id, d.data())).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchTrainingLessons(
  config: FirebaseWebRuntimeConfig,
  programId: string
): Promise<TrainingLesson[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getPlatformProgramLessonsCollectionPath(programId)));
  return snap.docs.map((d) => toTrainingLesson(d.id, d.data())).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchProgramEntitlements(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<ProgramEntitlement[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getProgramEntitlementsCollectionPath(context)));
  return snap.docs.map((d) => toProgramEntitlement(d.id, d.data()));
}

// Escritas do catálogo — só platform admin (rules gated por isPlatformAdmin).
export async function saveTrainingProgram(
  config: FirebaseWebRuntimeConfig,
  program: TrainingProgram
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getPlatformProgramsCollectionPath(), program.id),
    cleanFirestoreData(program),
    { merge: true }
  );
}

export async function saveTrainingProgramModule(
  config: FirebaseWebRuntimeConfig,
  module: TrainingProgramModule
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getPlatformProgramModulesCollectionPath(module.programId), module.id),
    cleanFirestoreData(module),
    { merge: true }
  );
}

export async function saveTrainingLesson(
  config: FirebaseWebRuntimeConfig,
  lesson: TrainingLesson
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getPlatformProgramLessonsCollectionPath(lesson.programId), lesson.id),
    cleanFirestoreData(lesson),
    { merge: true }
  );
}

export async function deleteTrainingLesson(
  config: FirebaseWebRuntimeConfig,
  programId: string,
  lessonId: string
) {
  const firestore = getFirebaseFirestore(config);
  await deleteDoc(doc(firestore, getPlatformProgramLessonsCollectionPath(programId), lessonId));
}

// ─── Ledger financeiro (lançamentos individuais) ──────────────────────────────

function toFinancialTransaction(documentId: string, data: DocumentData): FinancialTransaction {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    kind: (data.kind as FinancialTransaction["kind"]) ?? "expense",
    label: String(data.label ?? ""),
    amount: Number(data.amount ?? 0),
    note: data.note ? String(data.note) : undefined,
    date: String(data.date ?? ""),
    createdByUserId: data.createdByUserId ? String(data.createdByUserId) : undefined,
    createdAt: String(data.createdAt ?? "")
  };
}

export async function addFinancialTransaction(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  tx: Omit<FinancialTransaction, "id" | "organizationId" | "createdAt">
): Promise<string> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(collection(firestore, getFinancialTransactionsCollectionPath(context)));
  const record: FinancialTransaction = {
    ...tx,
    id: ref.id,
    organizationId: context.organizationId,
    createdAt: new Date().toISOString()
  };
  await setDoc(ref, cleanFirestoreData(record));
  return ref.id;
}

export async function fetchFinancialTransactions(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 500
): Promise<FinancialTransaction[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(
    query(collection(firestore, getFinancialTransactionsCollectionPath(context)), orderBy("date", "desc"), limit(maxItems))
  );
  return snap.docs.map((d) => toFinancialTransaction(d.id, d.data()));
}

export async function deleteFinancialTransaction(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  transactionId: string
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  await deleteDoc(doc(firestore, getFinancialTransactionsCollectionPath(context), transactionId));
}

// ─── Doação pública sem-app (leads/intenções) ─────────────────────────────────

function toGivingIntent(documentId: string, data: DocumentData): GivingIntent {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    name: String(data.name ?? ""),
    whatsapp: String(data.whatsapp ?? ""),
    amount: Number(data.amount ?? 0),
    source: "public_give",
    status: "captured",
    orgSlug: data.orgSlug ? String(data.orgSlug) : undefined,
    consentContact: Boolean(data.consentContact),
    createdAt: String(data.createdAt ?? "")
  };
}

// Create PÚBLICO (não autenticado) — a rule valida o shape estrito. Só os
// campos permitidos vão no doc (nada de undefined, p/ casar com keys().hasOnly).
export async function saveGivingIntent(
  config: FirebaseWebRuntimeConfig,
  intent: Omit<GivingIntent, "id">
): Promise<string> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(collection(firestore, getGivingIntentsCollectionPath({ organizationId: intent.organizationId })));
  const data: Record<string, string | number | boolean> = {
    organizationId: intent.organizationId,
    name: intent.name,
    whatsapp: intent.whatsapp,
    amount: intent.amount,
    source: "public_give",
    status: "captured",
    consentContact: intent.consentContact,
    createdAt: intent.createdAt
  };
  if (intent.orgSlug) data.orgSlug = intent.orgSlug;
  if (intent.campaignId) data.campaignId = intent.campaignId;
  await setDoc(ref, data);
  return ref.id;
}

// "Já paguei" no link público: cria o comprovante (create público, shape estrito
// pela rule). Só os campos permitidos, sem undefined.
export async function saveGivingReceipt(
  config: FirebaseWebRuntimeConfig,
  receipt: { organizationId: string; intentId: string; imageBase64?: string; createdAt?: string }
): Promise<string> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(collection(firestore, getGivingReceiptsCollectionPath({ organizationId: receipt.organizationId })));
  const data: Record<string, string> = {
    organizationId: receipt.organizationId,
    intentId: receipt.intentId,
    createdAt: receipt.createdAt ?? new Date().toISOString(),
  };
  if (receipt.imageBase64) data.imageBase64 = receipt.imageBase64;
  await setDoc(ref, data);
  return ref.id;
}

export async function fetchGivingReceipts(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 200
): Promise<GivingReceipt[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(query(collection(firestore, getGivingReceiptsCollectionPath(context)), limit(maxItems)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GivingReceipt));
}

export async function fetchGivingIntents(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 200
): Promise<GivingIntent[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(query(collection(firestore, getGivingIntentsCollectionPath(context)), limit(maxItems)));
  return snap.docs
    .map((d) => toGivingIntent(d.id, d.data()))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ─── Campanhas de oferta ─────────────────────────────────────────────────────
export async function saveGivingCampaign(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  campaign: Omit<GivingCampaign, "id" | "createdAt" | "updatedAt" | "organizationId"> & { id?: string; createdAt?: string }
): Promise<string> {
  const firestore = getFirebaseFirestore(config);
  const ref = campaign.id
    ? doc(firestore, getGivingCampaignsCollectionPath(context), campaign.id)
    : doc(collection(firestore, getGivingCampaignsCollectionPath(context)));
  const now = new Date().toISOString();
  await setDoc(ref, cleanFirestoreData({
    organizationId: context.organizationId,
    title: campaign.title,
    description: campaign.description,
    category: campaign.category,
    goalAmount: campaign.goalAmount,
    raisedAmount: campaign.raisedAmount,
    status: campaign.status,
    createdByUserId: campaign.createdByUserId,
    createdAt: campaign.createdAt ?? now,
    updatedAt: now,
  }), { merge: true });
  return ref.id;
}

export async function fetchGivingCampaigns(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 100
): Promise<GivingCampaign[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(query(collection(firestore, getGivingCampaignsCollectionPath(context)), limit(maxItems)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as GivingCampaign))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteGivingCampaign(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  campaignId: string
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  await deleteDoc(doc(firestore, getGivingCampaignsCollectionPath(context), campaignId));
}

// ─── Segurança Kids (check-in/out + settings) ─────────────────────────────────

function toKidsCheckIn(documentId: string, data: DocumentData): KidsCheckIn {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    campusId: data.campusId ? String(data.campusId) : undefined,
    childId: String(data.childId ?? ""),
    parentId: String(data.parentId ?? ""),
    authorizedPickUpIds: Array.isArray(data.authorizedPickUpIds) ? data.authorizedPickUpIds.map(String) : [],
    checkedInAt: String(data.checkedInAt ?? ""),
    checkedOutAt: data.checkedOutAt ? String(data.checkedOutAt) : undefined,
    checkedOutByParentId: data.checkedOutByParentId ? String(data.checkedOutByParentId) : undefined,
    checkedInByUserId: data.checkedInByUserId ? String(data.checkedInByUserId) : undefined,
    status: (data.status as KidsCheckIn["status"]) ?? "checked_in",
    roomCode: data.roomCode ? String(data.roomCode) : undefined,
    serviceTeamId: data.serviceTeamId ? String(data.serviceTeamId) : undefined,
    securityToken: String(data.securityToken ?? ""),
    childName: data.childName ? String(data.childName) : undefined,
    guardianName: data.guardianName ? String(data.guardianName) : undefined,
    allergies: data.allergies ? String(data.allergies) : undefined,
    securityRestrictions: data.securityRestrictions ? String(data.securityRestrictions) : undefined,
    photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
    photoConsentAt: data.photoConsentAt ? String(data.photoConsentAt) : undefined,
    notes: data.notes ? String(data.notes) : undefined
  };
}

function toKidsSettings(data: DocumentData): OrganizationKidsSettings {
  return {
    qrGeneratorRoles: Array.isArray(data.qrGeneratorRoles) ? (data.qrGeneratorRoles as OrganizationKidsSettings["qrGeneratorRoles"]) : [],
    kidsTeamIds: Array.isArray(data.kidsTeamIds) ? data.kidsTeamIds.map(String) : [],
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined
  };
}

export async function saveKidsCheckIn(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  checkIn: KidsCheckIn
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getKidsCheckInsCollectionPath(context), checkIn.id),
    cleanFirestoreData(checkIn),
    { merge: true }
  );
}

// Check-ins ativos (crianças presentes) da organização.
export async function fetchActiveKidsCheckIns(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<KidsCheckIn[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(
    query(collection(firestore, getKidsCheckInsCollectionPath(context)), where("status", "==", "checked_in"))
  );
  return snap.docs.map((d) => toKidsCheckIn(d.id, d.data()));
}

// Resolve um check-in pelo token do QR (usado na retirada).
export async function fetchKidsCheckInByToken(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  token: string
): Promise<KidsCheckIn | null> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(
    query(collection(firestore, getKidsCheckInsCollectionPath(context)), where("securityToken", "==", token), limit(1))
  );
  const d = snap.docs[0];
  return d ? toKidsCheckIn(d.id, d.data()) : null;
}

// Retirada: marca checked_out registrando quem retirou.
export async function checkoutKidsCheckIn(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  checkInId: string,
  byParentId: string
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getKidsCheckInsCollectionPath(context), checkInId),
    cleanFirestoreData({
      status: "checked_out",
      checkedOutAt: new Date().toISOString(),
      checkedOutByParentId: byParentId
    }),
    { merge: true }
  );
}

export async function fetchKidsSettings(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<OrganizationKidsSettings | null> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDoc(doc(firestore, getOrganizationKidsSettingsDocumentPath(context)));
  if (!snap.exists()) return null;
  return toKidsSettings(snap.data());
}

export async function saveKidsSettings(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  settings: OrganizationKidsSettings
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getOrganizationKidsSettingsDocumentPath(context)),
    cleanFirestoreData({ ...settings, updatedAt: new Date().toISOString() }),
    { merge: true }
  );
}

// --- NEW MAPPERS ---

function toScheduleSwapRequest(documentId: string, data: DocumentData): ScheduleSwapRequest {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    campusId: data.campusId ? String(data.campusId) : undefined,
    assignmentId: String(data.assignmentId ?? ""),
    requestorPersonId: String(data.requestorPersonId ?? ""),
    targetPersonId: data.targetPersonId ? String(data.targetPersonId) : undefined,
    proposedReplacementPersonId: data.proposedReplacementPersonId ? String(data.proposedReplacementPersonId) : undefined,
    status: (data.status as ScheduleSwapRequest["status"]) ?? "pending",
    note: data.note ? String(data.note) : undefined,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? "")
  };
}

function toMemberJourneyProfile(documentId: string, data: DocumentData): MemberJourneyProfile {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    personId: String(data.personId ?? ""),
    currentJourneyKind: (data.currentJourneyKind as MemberJourneyProfile["currentJourneyKind"]) ?? "belonging",
    currentStage: (data.currentStage as MemberJourneyProfile["currentStage"]) ?? "exploring",
    progressPercent: Number(data.progressPercent ?? 0),
    readinessLevel: (data.readinessLevel as MemberJourneyProfile["readinessLevel"]) ?? "medium"
  };
}

function toJourneyMission(documentId: string, data: DocumentData): JourneyMission {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    journeyProfileId: String(data.journeyProfileId ?? ""),
    title: String(data.title ?? ""),
    description: data.description ? String(data.description) : undefined,
    kind: (data.kind as JourneyMission["kind"]) ?? "automatic",
    status: (data.status as JourneyMission["status"]) ?? "locked",
    dueAt: data.dueAt ? String(data.dueAt) : undefined
  };
}

function toBadge(documentId: string, data: DocumentData): Badge {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    code: String(data.code ?? ""),
    name: String(data.name ?? ""),
    category: (data.category as Badge["category"]) ?? "journey",
    description: data.description ? String(data.description) : undefined
  };
}

function toMemberBadge(documentId: string, data: DocumentData): MemberBadge {
  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    personId: String(data.personId ?? ""),
    badgeId: String(data.badgeId ?? ""),
    awardedAt: String(data.awardedAt ?? "")
  };
}

// --- NEW REPOSITORY METHODS ---

// Módulo 2: Troca de Escalas (Swaps)
export async function fetchScheduleSwapRequests(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<ScheduleSwapRequest[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getScheduleSwapRequestsCollectionPath(context)));
  return snap.docs.map((d) => toScheduleSwapRequest(d.id, d.data()));
}

export async function saveScheduleSwapRequest(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  request: ScheduleSwapRequest
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getScheduleSwapRequestsCollectionPath(context), request.id),
    cleanFirestoreData(request),
    { merge: true }
  );
}

// Módulo 3: Jornadas, Missões e Badges
export async function fetchMemberJourneyProfile(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  personId: string
): Promise<MemberJourneyProfile | null> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDoc(doc(firestore, getJourneyProfilesCollectionPath(context), personId));
  if (!snap.exists()) return null;
  return toMemberJourneyProfile(snap.id, snap.data());
}

export async function saveMemberJourneyProfile(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  profile: MemberJourneyProfile
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getJourneyProfilesCollectionPath(context), profile.id),
    cleanFirestoreData(profile),
    { merge: true }
  );
}

export async function fetchJourneyMissions(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  journeyProfileId: string
): Promise<JourneyMission[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getJourneyMissionsCollectionPath(context, journeyProfileId)));
  return snap.docs.map((d) => toJourneyMission(d.id, d.data()));
}

export async function saveJourneyMission(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  mission: JourneyMission
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getJourneyMissionsCollectionPath(context, mission.journeyProfileId), mission.id),
    cleanFirestoreData(mission),
    { merge: true }
  );
}

export async function fetchBadges(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<Badge[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getBadgesCollectionPath(context)));
  return snap.docs.map((d) => toBadge(d.id, d.data()));
}

export async function saveBadge(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  badge: Badge
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getBadgesCollectionPath(context), badge.id),
    cleanFirestoreData(badge),
    { merge: true }
  );
}

export async function fetchMemberBadges(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  personId: string
): Promise<MemberBadge[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getMemberBadgesCollectionPath(context, personId)));
  return snap.docs.map((d) => toMemberBadge(d.id, d.data()));
}

export async function saveMemberBadge(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  memberBadge: MemberBadge
) {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getMemberBadgesCollectionPath(context, memberBadge.personId), memberBadge.id),
    cleanFirestoreData(memberBadge),
    { merge: true }
  );
}

/* ── Network / Rede de Igrejas ─────────────────────────────────────────── */

function getNetworkAffiliatesPath(parentOrgId: string) {
  return `organizations/${parentOrgId}/affiliates`;
}

function getNetworkSnapshotPath(childOrgId: string, date: string) {
  return `organizations/${childOrgId}/networkSnapshots/${date}`;
}

function getNetworkSnapshotsPath(childOrgId: string) {
  return `organizations/${childOrgId}/networkSnapshots`;
}

export async function fetchNetworkAffiliates(
  config: FirebaseWebRuntimeConfig,
  parentOrganizationId: string
): Promise<NetworkAffiliate[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(collection(firestore, getNetworkAffiliatesPath(parentOrganizationId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as NetworkAffiliate));
}

export async function saveNetworkAffiliate(
  config: FirebaseWebRuntimeConfig,
  affiliate: NetworkAffiliate
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(firestore, getNetworkAffiliatesPath(affiliate.parentOrganizationId), affiliate.id);
  const existing = await getDoc(ref);
  await setDoc(ref, cleanFirestoreData(affiliate), { merge: true });

  if (!existing.exists()) {
    await updateDoc(doc(firestore, "organizations", affiliate.parentOrganizationId), {
      affiliateCount: increment(1)
    }).catch(() => {});
  }
}

export async function fetchNetworkAffiliateByInviteCode(
  config: FirebaseWebRuntimeConfig,
  parentOrganizationId: string,
  inviteCode: string
): Promise<NetworkAffiliate | null> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(
    query(
      collection(firestore, getNetworkAffiliatesPath(parentOrganizationId)),
      where("inviteCode", "==", inviteCode)
    )
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as NetworkAffiliate;
}

export async function saveNetworkSnapshot(
  config: FirebaseWebRuntimeConfig,
  snapshot: NetworkSnapshot
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  await setDoc(
    doc(firestore, getNetworkSnapshotPath(snapshot.organizationId, snapshot.date)),
    cleanFirestoreData(snapshot),
    { merge: true }
  );
}

export async function fetchLatestNetworkSnapshot(
  config: FirebaseWebRuntimeConfig,
  childOrganizationId: string
): Promise<NetworkSnapshot | null> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(
    query(
      collection(firestore, getNetworkSnapshotsPath(childOrganizationId)),
      orderBy("date", "desc"),
      limit(1)
    )
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as NetworkSnapshot;
}

export async function fetchNetworkSnapshotsHistory(
  config: FirebaseWebRuntimeConfig,
  childOrganizationId: string,
  months = 6
): Promise<NetworkSnapshot[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(
    query(
      collection(firestore, getNetworkSnapshotsPath(childOrganizationId)),
      orderBy("date", "desc"),
      limit(months)
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as NetworkSnapshot));
}

// ── WeeklyTheme ────────────────────────────────────────────────────────────

export async function saveWeeklyTheme(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  theme: WeeklyTheme
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(firestore, getWeeklyThemesCollectionPath(context), theme.id);
  await setDoc(ref, cleanFirestoreData(theme));
}

export async function fetchWeeklyThemesForWeek(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  weekStartDate: string
): Promise<WeeklyTheme[]> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDocs(
    query(
      collection(firestore, getWeeklyThemesCollectionPath(context)),
      where("weekStartDate", "==", weekStartDate)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WeeklyTheme));
}

export async function fetchActiveWeeklyThemeForGroup(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  groupId: string,
  weekStartDate: string
): Promise<WeeklyTheme | null> {
  const themes = await fetchWeeklyThemesForWeek(config, context, weekStartDate);
  // specific assignment takes priority over "all"
  const specific = themes.find(
    (t) => t.scope === "specific" && t.groupIds.includes(groupId)
  );
  if (specific) return specific;
  const global = themes.find((t) => t.scope === "all");
  return global ?? null;
}

export async function deleteWeeklyTheme(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  themeId: string
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(firestore, getWeeklyThemesCollectionPath(context), themeId);
  await deleteDoc(ref);
}

// ── Plan management ─────────────────────────────────────────────────────────

export async function fetchOrgPlan(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<PlanId> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(firestore, `organizations/${context.organizationId}/settings/subscription`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return "free";
  const data = snap.data();
  // `plan` é o campo canônico lido pelo PlanGuard. Organizações provisionadas
  // via organization-new-view.tsx / signup só gravam `planTier` — deriva
  // PlanId a partir dele em vez de cair silenciosamente em "free".
  return (data?.plan as PlanId) ?? planTierToPlanId(data?.planTier);
}

export async function setOrgPlan(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  plan: PlanId
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(firestore, `organizations/${context.organizationId}/settings/subscription`);
  await setDoc(ref, { plan }, { merge: true });
}

// Grava os IDs do Asaas assim que o checkout é criado — não depende do
// webhook (que só confirma quando o pagador de fato paga) pra já sabermos
// qual assinatura consultar no histórico de faturas.
export async function linkAsaasSubscription(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  ids: { asaasCustomerId: string; asaasSubscriptionId: string }
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(firestore, `organizations/${context.organizationId}/settings/subscription`);
  await setDoc(ref, ids, { merge: true });
}

export interface OrgBillingInfo {
  plan: PlanId;
  billingStatus: "active" | "overdue" | "suspended";
  overdueSince?: string;
  asaasSubscriptionId?: string;
}

export async function fetchOrgBillingInfo(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<OrgBillingInfo> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(firestore, `organizations/${context.organizationId}/settings/subscription`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { plan: "free", billingStatus: "active" };
  const data = snap.data();
  const plan = (data?.plan as PlanId) ?? planTierToPlanId(data?.planTier);
  const rawStatus = (data?.billingStatus as "active" | "overdue" | "suspended") ?? "active";
  const overdueSince = data?.overdueSince ? String(data.overdueSince) : undefined;
  return {
    plan,
    billingStatus: resolveBillingStatus(rawStatus, overdueSince),
    overdueSince,
    asaasSubscriptionId: data?.asaasSubscriptionId ? String(data.asaasSubscriptionId) : undefined
  };
}

export async function countOrgMembers(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<number> {
  const firestore = getFirebaseFirestore(config);
  // Agregação no servidor: conta sem baixar os documentos (antes esta função
  // transferia a coleção `people` inteira só para ler o `.size`).
  const snap = await getCountFromServer(collection(firestore, getPeopleCollectionPath(context)));
  return snap.data().count;
}

// ── AI quota ────────────────────────────────────────────────────────────────

export interface AiQuotaStatus {
  plan: PlanId;
  used: number;
  limit: number;
  allowed: boolean;
  month: string;
}

export async function getAiQuotaStatus(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<AiQuotaStatus> {
  const month = currentAiMonth();
  const firestore = getFirebaseFirestore(config);
  const ref = doc(firestore, `organizations/${context.organizationId}/aiUsage/${month}`);
  // Plano e uso do mês são leituras independentes — em paralelo.
  const [plan, snap] = await Promise.all([fetchOrgPlan(config, context), getDoc(ref)]);
  const used: number = snap.exists() ? (snap.data()?.count ?? 0) : 0;
  const monthLimit = PLAN_LIMITS[plan].aiQueriesPerMonth;
  return { plan, used, limit: monthLimit, allowed: used < monthLimit, month };
}

export async function incrementAiUsage(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext
): Promise<void> {
  const month = currentAiMonth();
  const firestore = getFirebaseFirestore(config);
  const ref = doc(firestore, `organizations/${context.organizationId}/aiUsage/${month}`);
  await setDoc(ref, { count: increment(1), updatedAt: new Date().toISOString() }, { merge: true });
}

// ─── Member Contributions ─────────────────────────────────────────────────────

export async function fetchMemberContributions(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  userId: string
): Promise<MemberContribution[]> {
  const firestore = getFirebaseFirestore(config);
  const q = query(
    collection(firestore, getMemberContributionsCollectionPath(context)),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MemberContribution));
}

export async function fetchMemberContributionsByPersonId(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  personId: string
): Promise<MemberContribution[]> {
  const firestore = getFirebaseFirestore(config);
  const q = query(
    collection(firestore, getMemberContributionsCollectionPath(context)),
    where("personId", "==", personId),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MemberContribution))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function addMemberContribution(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  contribution: Omit<MemberContribution, "id">
): Promise<string> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(collection(firestore, getMemberContributionsCollectionPath(context)));
  await setDoc(ref, cleanFirestoreData(contribution));
  return ref.id;
}

// Salva o comprovante como imagem base64 num doc separado (não usa Storage, que
// não está provisionado no projeto). Retorna o id do doc pra referenciar na
// contribuição. Doc separado evita bloatar a query de contributions.
// Falha aqui não deve bloquear o registro do valor (chamador ignora o erro).
export async function saveContributionReceipt(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  receipt: { organizationId: string; imageBase64: string; contentType?: string; createdByUserId: string }
): Promise<string> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(collection(firestore, getContributionReceiptsCollectionPath(context)));
  await setDoc(ref, cleanFirestoreData({
    organizationId: receipt.organizationId,
    imageBase64: receipt.imageBase64,
    contentType: receipt.contentType ?? "image/jpeg",
    createdByUserId: receipt.createdByUserId,
    createdAt: new Date().toISOString(),
  }));
  return ref.id;
}

// Lê o comprovante (admin, ao conferir). Retorna data URI pronto p/ <img src>.
export async function fetchContributionReceipt(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  receiptId: string
): Promise<{ dataUri: string } | null> {
  const firestore = getFirebaseFirestore(config);
  const snap = await getDoc(doc(firestore, getContributionReceiptsCollectionPath(context), receiptId));
  if (!snap.exists()) return null;
  const data = snap.data() as { imageBase64?: string; contentType?: string };
  if (!data.imageBase64) return null;
  return { dataUri: `data:${data.contentType ?? "image/jpeg"};base64,${data.imageBase64}` };
}

// Visão de admin: todas as contribuições da organização (não só as de um
// membro), usado pelo painel de Finanças. As Firestore rules já permitem
// isso (isTenantAdmin lê qualquer contribuição) — só falha se quem chamar
// não for admin, o que é o comportamento esperado.
export async function fetchAllContributions(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  take = 200
): Promise<MemberContribution[]> {
  const firestore = getFirebaseFirestore(config);
  const q = query(
    collection(firestore, getMemberContributionsCollectionPath(context)),
    orderBy("date", "desc"),
    limit(take)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MemberContribution));
}

// Confirma uma contribuição autodeclarada pelo membro (status "pending",
// criada via PIX no app) depois da liderança conferir o comprovante/extrato.
export async function confirmMemberContribution(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  contributionId: string,
  confirmedByUid: string
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(firestore, getMemberContributionsCollectionPath(context), contributionId);
  await updateDoc(ref, {
    status: "confirmed",
    confirmedBy: confirmedByUid,
    confirmedAt: new Date().toISOString()
  });
}

// ─── Radar Pastoral: presença em culto ─────────────────────────────────────

export async function fetchChurchAttendance(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 1500
): Promise<ChurchAttendance[]> {
  const firestore = getFirebaseFirestore(config);
  const q = query(
    collection(firestore, getChurchAttendanceCollectionPath(context)),
    orderBy("serviceDate", "desc"),
    limit(maxItems)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChurchAttendance));
}

export async function recordChurchAttendance(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    personIds: readonly string[];
    serviceDate: string;
    serviceLabel?: string;
    registeredByUserId?: string;
  }
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  const now = new Date().toISOString();

  // writeBatch em fatias de 450 (limite do Firestore é 500 writes/batch):
  // um check-in de culto com centenas de pessoas vira poucos round-trips
  // atômicos em vez de centenas de setDocs individuais.
  const BATCH_LIMIT = 450;
  for (let start = 0; start < params.personIds.length; start += BATCH_LIMIT) {
    const slice = params.personIds.slice(start, start + BATCH_LIMIT);
    const batch = writeBatch(firestore);
    for (const personId of slice) {
      const id = `${params.serviceDate}_${personId}`;
      const record: ChurchAttendance = {
        id,
        organizationId: context.organizationId,
        personId,
        serviceDate: params.serviceDate,
        serviceLabel: params.serviceLabel,
        registeredByUserId: params.registeredByUserId,
        createdAt: now
      };
      batch.set(
        doc(firestore, getChurchAttendanceCollectionPath(context), id),
        cleanFirestoreData(record),
        { merge: true }
      );
    }
    await batch.commit();
  }
}

// ─── Radar Pastoral: pedidos de oração ─────────────────────────────────────

export async function fetchPrayerRequests(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 300
): Promise<PrayerRequest[]> {
  const firestore = getFirebaseFirestore(config);
  const q = query(
    collection(firestore, getPrayerRequestsCollectionPath(context)),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PrayerRequest));
}

// Mural de oração: pedidos que o próprio autor optou por tornar públicos.
// Membros comuns não têm permissão de leitura em prayerRequests em geral,
// só nos que satisfazem isPublic == true (ver firestore.rules).
export async function fetchPublicPrayerWall(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  maxItems = 100
): Promise<PrayerRequest[]> {
  const firestore = getFirebaseFirestore(config);
  const q = query(
    collection(firestore, getPrayerRequestsCollectionPath(context)),
    where("isPublic", "==", true),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PrayerRequest));
}

export async function addPrayerRequest(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  request: Omit<PrayerRequest, "id" | "organizationId" | "createdAt" | "status" | "prayerCount" | "isPublic"> & {
    isPublic?: boolean;
  }
): Promise<string> {
  const firestore = getFirebaseFirestore(config);
  const ref = doc(collection(firestore, getPrayerRequestsCollectionPath(context)));
  const record: PrayerRequest = {
    ...request,
    isPublic: request.isPublic ?? false,
    prayerCount: 0,
    id: ref.id,
    organizationId: context.organizationId,
    status: "open",
    createdAt: new Date().toISOString()
  };
  await setDoc(ref, cleanFirestoreData(record));
  return ref.id;
}

export async function incrementPrayerCount(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  requestId: string
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  await updateDoc(doc(firestore, getPrayerRequestsCollectionPath(context), requestId), {
    prayerCount: increment(1)
  });
}

export async function updatePrayerRequestStatus(
  config: FirebaseWebRuntimeConfig,
  context: TenantContext,
  params: {
    requestId: string;
    status: PrayerRequestStatus;
    respondedByUserId?: string;
  }
): Promise<void> {
  const firestore = getFirebaseFirestore(config);
  await updateDoc(doc(firestore, getPrayerRequestsCollectionPath(context), params.requestId), {
    status: params.status,
    respondedAt: new Date().toISOString(),
    respondedByUserId: params.respondedByUserId ?? null
  });
}

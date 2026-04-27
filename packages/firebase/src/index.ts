export * from "./client";
export * from "./repositories";

import type { TenantContext } from "@alvo/types";

export interface FirebaseAppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface FirebaseEnvironment {
  projectId: string;
  authDomain: string;
  storageBucket: string;
}

export function createFirebaseConfig(projectId: string): FirebaseAppConfig {
  return {
    apiKey: "",
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: `${projectId}.firebasestorage.app`
  };
}

export function createFirebaseEnvironment(projectId = "alvo-church"): FirebaseEnvironment {
  return {
    projectId,
    authDomain: `${projectId}.firebaseapp.com`,
    storageBucket: `${projectId}.firebasestorage.app`
  };
}

export function getTenantScopedDocumentPath(
  context: TenantContext,
  collection: string,
  documentId: string
) {
  return `organizations/${context.organizationId}/${collection}/${documentId}`;
}

export function getPeopleCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/people`;
}

export function getUsersCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/users`;
}

export function getTenantUserDocumentPath(context: TenantContext, userId: string) {
  return `${getUsersCollectionPath(context)}/${userId}`;
}

export function getOrganizationSettingsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/settings`;
}

export function getOrganizationBrandingDocumentPath(context: TenantContext) {
  return `${getOrganizationSettingsCollectionPath(context)}/branding`;
}

export function getOrganizationSubscriptionDocumentPath(context: TenantContext) {
  return `${getOrganizationSettingsCollectionPath(context)}/subscription`;
}

export function getOrganizationFeaturesDocumentPath(context: TenantContext) {
  return `${getOrganizationSettingsCollectionPath(context)}/features`;
}

export function getOrganizationBrandAssetPath(
  context: TenantContext,
  assetKind: "logoLight" | "logoDark" | "icon" | "favicon",
  fileName: string
) {
  return `organizations/${context.organizationId}/branding/${assetKind}/${fileName}`;
}

export function getFamiliesCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/families`;
}

export function getFamilyMembersCollectionPath(context: TenantContext, familyId: string) {
  return `organizations/${context.organizationId}/families/${familyId}/members`;
}

export function getPartnersCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/partners`;
}

export function getPartnerBenefitsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/partnerBenefits`;
}

export function getMemberBenefitValidationsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/memberBenefitValidations`;
}

export function getVisitorJourneysCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/visitorJourneys`;
}

export function getVisitorIntakesCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/visitorIntakes`;
}

export function getFollowUpTasksCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/followUpTasks`;
}

export function getFinanceReportsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/financeReports`;
}

export function getGroupsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/groups`;
}

export function getGroupMeetingsCollectionPath(context: TenantContext, groupId: string) {
  return `organizations/${context.organizationId}/groups/${groupId}/meetings`;
}

export function getGroupAttendanceCollectionPath(
  context: TenantContext,
  groupId: string,
  meetingId: string
) {
  return `organizations/${context.organizationId}/groups/${groupId}/meetings/${meetingId}/attendance`;
}

export function getEventsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/events`;
}

export function getEventTicketsCollectionPath(context: TenantContext, eventId: string) {
  return `organizations/${context.organizationId}/events/${eventId}/tickets`;
}

export function getEventRegistrationsCollectionPath(context: TenantContext, eventId: string) {
  return `organizations/${context.organizationId}/events/${eventId}/registrations`;
}

export function getEventCheckInsCollectionPath(context: TenantContext, eventId: string) {
  return `organizations/${context.organizationId}/events/${eventId}/checkIns`;
}

export function getJourneyProfilesCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/journeyProfiles`;
}

export function getJourneyMissionsCollectionPath(
  context: TenantContext,
  journeyProfileId: string
) {
  return `organizations/${context.organizationId}/journeyProfiles/${journeyProfileId}/missions`;
}

export function getBadgesCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/badges`;
}

export function getMemberBadgesCollectionPath(context: TenantContext, personId: string) {
  return `organizations/${context.organizationId}/people/${personId}/badges`;
}

export function getTribesCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/tribes`;
}

export function getTribeAssessmentsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/tribeAssessments`;
}

export function getTribeAssessmentScoresCollectionPath(
  context: TenantContext,
  assessmentId: string
) {
  return `organizations/${context.organizationId}/tribeAssessments/${assessmentId}/scores`;
}

export function getMemberTribeProfilesCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/memberTribeProfiles`;
}

export function getMemberTribeHistoryCollectionPath(context: TenantContext, personId: string) {
  return `organizations/${context.organizationId}/people/${personId}/tribeHistory`;
}

export function getTribeReviewRequestsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/tribeReviewRequests`;
}

export function getTribeBehaviorSignalsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/tribeBehaviorSignals`;
}

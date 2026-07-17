import type { TenantContext } from "@alvo/types";

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

export function getOrganizationGivingDocumentPath(context: TenantContext) {
  return `${getOrganizationSettingsCollectionPath(context)}/giving`;
}

export function getOrganizationFeaturesDocumentPath(context: TenantContext) {
  return `${getOrganizationSettingsCollectionPath(context)}/features`;
}

export function getOrganizationKidsSettingsDocumentPath(context: TenantContext) {
  return `${getOrganizationSettingsCollectionPath(context)}/kids`;
}

// Segurança Kids: registros de check-in/out das crianças.
export function getKidsCheckInsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/kidsCheckIns`;
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

export function getCommunityStoresCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/communityStores`;
}

export function getCommunityOffersCollectionPath(context: TenantContext, storeId: string) {
  return `organizations/${context.organizationId}/communityStores/${storeId}/offers`;
}

export function getCommunityStoreModerationLogsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/communityStoreModerationLogs`;
}

// Promoções do marketplace (nível flat da org) — alimenta a notificação in-app.
export function getMarketplacePromotionsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/marketplacePromotions`;
}

export function getVisitorJourneysCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/visitorJourneys`;
}

export function getVisitorIntakesCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/visitorIntakes`;
}

// Doação pública sem-app: leads/intenções captadas no /p/{slug}/give.
export function getGivingIntentsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/givingIntents`;
}

export function getFollowUpTasksCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/followUpTasks`;
}

export function getFinanceReportsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/financeReports`;
}

// Ledger financeiro: lançamentos individuais (entradas/saídas/missões).
export function getFinancialTransactionsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/financialTransactions`;
}

export function getGroupsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/groups`;
}

export function getGroupMembersCollectionPath(context: TenantContext, groupId: string) {
  return `organizations/${context.organizationId}/groups/${groupId}/members`;
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

export function getServiceTeamsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/serviceTeams`;
}

export function getServiceAssignmentsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/serviceAssignments`;
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

export function getLeaderEmotionalPulseCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/leaderEmotionalPulse`;
}

export function getWellBeingResourcesCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/wellBeingResources`;
}

export function getMentoringSessionsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/mentoringSessions`;
}

export function getEmergencySOSCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/emergencySOS`;
}

export function getWorshipSongsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/worshipSongs`;
}

export function getWorshipSetlistsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/worshipSetlists`;
}

export function getGroupBannersCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/groupBanners`;
}

export function getCoursesCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/courses`;
}

// ─── Loja de Capacitação ───────────────────────────────────────────────────────
// Catálogo GLOBAL da Plataforma Esdras (top-level, fora de organizations/).
export function getPlatformProgramsCollectionPath() {
  return `platformPrograms`;
}

export function getPlatformProgramModulesCollectionPath(programId: string) {
  return `platformPrograms/${programId}/modules`;
}

export function getPlatformProgramLessonsCollectionPath(programId: string) {
  return `platformPrograms/${programId}/lessons`;
}

// Entitlements por org (o que a igreja comprou).
export function getProgramEntitlementsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/programEntitlements`;
}

export function getCourseModulesCollectionPath(context: TenantContext, courseId: string) {
  return `organizations/${context.organizationId}/courses/${courseId}/modules`;
}

export function getLessonsCollectionPath(context: TenantContext, courseId: string) {
  return `organizations/${context.organizationId}/courses/${courseId}/lessons`;
}

export function getMemberCourseProgressCollectionPath(context: TenantContext, memberId: string) {
  return `organizations/${context.organizationId}/people/${memberId}/courseProgress`;
}

export function getScheduleSwapRequestsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/scheduleSwapRequests`;
}

export function getWeeklyThemesCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/weeklyThemes`;
}

export function getMemberContributionsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/contributions`;
}

// Comprovantes de contribuição: imagem base64 em doc separado (não bloata a
// query de contributions). Membro cria o próprio; admin lê ao conferir.
export function getContributionReceiptsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/contributionReceipts`;
}

export function getChurchAttendanceCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/churchAttendance`;
}

export function getPrayerRequestsCollectionPath(context: TenantContext) {
  return `organizations/${context.organizationId}/prayerRequests`;
}

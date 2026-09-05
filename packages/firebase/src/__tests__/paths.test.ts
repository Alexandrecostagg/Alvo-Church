import { describe, expect, it } from "vitest";
import * as paths from "../paths";
import type { TenantContext } from "@alvo/types";

describe("Firebase Paths Builder", () => {
  const context: TenantContext = {
    organizationId: "org-123",
    campusId: "campus-456",
    userId: "user-789",
  };

  it("generates correct path for getTenantScopedDocumentPath", () => {
    const result = paths.getTenantScopedDocumentPath(
      context,
      "test-collection",
      "test-documentId",
    );
    expect(result).toBe(
      "organizations/org-123/test-collection/test-documentId",
    );
  });

  it("generates correct path for getPeopleCollectionPath", () => {
    const result = paths.getPeopleCollectionPath(context);
    expect(result).toBe("organizations/org-123/people");
  });

  it("generates correct path for getUsersCollectionPath", () => {
    const result = paths.getUsersCollectionPath(context);
    expect(result).toBe("organizations/org-123/users");
  });

  it("generates correct path for getTenantUserDocumentPath", () => {
    const result = paths.getTenantUserDocumentPath(context, "test-userId");
    expect(result).toBe("organizations/org-123/users/test-userId");
  });

  it("generates correct path for getOrganizationSettingsCollectionPath", () => {
    const result = paths.getOrganizationSettingsCollectionPath(context);
    expect(result).toBe("organizations/org-123/settings");
  });

  it("generates correct path for getOrganizationBrandingDocumentPath", () => {
    const result = paths.getOrganizationBrandingDocumentPath(context);
    expect(result).toBe("organizations/org-123/settings/branding");
  });

  it("generates correct path for getOrganizationSubscriptionDocumentPath", () => {
    const result = paths.getOrganizationSubscriptionDocumentPath(context);
    expect(result).toBe("organizations/org-123/settings/subscription");
  });

  it("generates correct path for getOrganizationGivingDocumentPath", () => {
    const result = paths.getOrganizationGivingDocumentPath(context);
    expect(result).toBe("organizations/org-123/settings/giving");
  });

  it("generates correct path for getOrganizationFeaturesDocumentPath", () => {
    const result = paths.getOrganizationFeaturesDocumentPath(context);
    expect(result).toBe("organizations/org-123/settings/features");
  });

  it("generates correct path for getOrganizationKidsSettingsDocumentPath", () => {
    const result = paths.getOrganizationKidsSettingsDocumentPath(context);
    expect(result).toBe("organizations/org-123/settings/kids");
  });

  it("generates correct path for getKidsCheckInsCollectionPath", () => {
    const result = paths.getKidsCheckInsCollectionPath(context);
    expect(result).toBe("organizations/org-123/kidsCheckIns");
  });

  it("generates correct path for getBannerHistoryCollectionPath", () => {
    const result = paths.getBannerHistoryCollectionPath(context);
    expect(result).toBe("organizations/org-123/bannerHistory");
  });

  it("generates correct path for getOrganizationBrandAssetPath", () => {
    const result = paths.getOrganizationBrandAssetPath(
      context,
      "logoLight",
      "test-fileName",
    );
    expect(result).toBe(
      "organizations/org-123/branding/logoLight/test-fileName",
    );
  });

  it("generates correct path for getFamiliesCollectionPath", () => {
    const result = paths.getFamiliesCollectionPath(context);
    expect(result).toBe("organizations/org-123/families");
  });

  it("generates correct path for getFamilyMembersCollectionPath", () => {
    const result = paths.getFamilyMembersCollectionPath(
      context,
      "test-familyId",
    );
    expect(result).toBe("organizations/org-123/families/test-familyId/members");
  });

  it("generates correct path for getPartnersCollectionPath", () => {
    const result = paths.getPartnersCollectionPath(context);
    expect(result).toBe("organizations/org-123/partners");
  });

  it("generates correct path for getPartnerBenefitsCollectionPath", () => {
    const result = paths.getPartnerBenefitsCollectionPath(context);
    expect(result).toBe("organizations/org-123/partnerBenefits");
  });

  it("generates correct path for getMemberBenefitValidationsCollectionPath", () => {
    const result = paths.getMemberBenefitValidationsCollectionPath(context);
    expect(result).toBe("organizations/org-123/memberBenefitValidations");
  });

  it("generates correct path for getCommunityStoresCollectionPath", () => {
    const result = paths.getCommunityStoresCollectionPath(context);
    expect(result).toBe("organizations/org-123/communityStores");
  });

  it("generates correct path for getCommunityOffersCollectionPath", () => {
    const result = paths.getCommunityOffersCollectionPath(
      context,
      "test-storeId",
    );
    expect(result).toBe(
      "organizations/org-123/communityStores/test-storeId/offers",
    );
  });

  it("generates correct path for getCommunityStoreModerationLogsCollectionPath", () => {
    const result = paths.getCommunityStoreModerationLogsCollectionPath(context);
    expect(result).toBe("organizations/org-123/communityStoreModerationLogs");
  });

  it("generates correct path for getMarketplacePromotionsCollectionPath", () => {
    const result = paths.getMarketplacePromotionsCollectionPath(context);
    expect(result).toBe("organizations/org-123/marketplacePromotions");
  });

  it("generates correct path for getCommunicationLogCollectionPath", () => {
    const result = paths.getCommunicationLogCollectionPath(context);
    expect(result).toBe("organizations/org-123/communicationLog");
  });

  it("generates correct path for getCommunicationTemplatesCollectionPath", () => {
    const result = paths.getCommunicationTemplatesCollectionPath(context);
    expect(result).toBe("organizations/org-123/communicationTemplates");
  });

  it("generates correct path for getVisitorJourneysCollectionPath", () => {
    const result = paths.getVisitorJourneysCollectionPath(context);
    expect(result).toBe("organizations/org-123/visitorJourneys");
  });

  it("generates correct path for getVisitorIntakesCollectionPath", () => {
    const result = paths.getVisitorIntakesCollectionPath(context);
    expect(result).toBe("organizations/org-123/visitorIntakes");
  });

  it("generates correct path for getGivingCampaignsCollectionPath", () => {
    const result = paths.getGivingCampaignsCollectionPath(context);
    expect(result).toBe("organizations/org-123/givingCampaigns");
  });

  it("generates correct path for getGivingReceiptsCollectionPath", () => {
    const result = paths.getGivingReceiptsCollectionPath(context);
    expect(result).toBe("organizations/org-123/givingReceipts");
  });

  it("generates correct path for getGivingIntentsCollectionPath", () => {
    const result = paths.getGivingIntentsCollectionPath(context);
    expect(result).toBe("organizations/org-123/givingIntents");
  });

  it("generates correct path for getFollowUpTasksCollectionPath", () => {
    const result = paths.getFollowUpTasksCollectionPath(context);
    expect(result).toBe("organizations/org-123/followUpTasks");
  });

  it("generates correct path for getFinanceReportsCollectionPath", () => {
    const result = paths.getFinanceReportsCollectionPath(context);
    expect(result).toBe("organizations/org-123/financeReports");
  });

  it("generates correct path for getFinancialTransactionsCollectionPath", () => {
    const result = paths.getFinancialTransactionsCollectionPath(context);
    expect(result).toBe("organizations/org-123/financialTransactions");
  });

  it("generates correct path for getGroupsCollectionPath", () => {
    const result = paths.getGroupsCollectionPath(context);
    expect(result).toBe("organizations/org-123/groups");
  });

  it("generates correct path for getGroupMembersCollectionPath", () => {
    const result = paths.getGroupMembersCollectionPath(context, "test-groupId");
    expect(result).toBe("organizations/org-123/groups/test-groupId/members");
  });

  it("generates correct path for getGroupMeetingsCollectionPath", () => {
    const result = paths.getGroupMeetingsCollectionPath(
      context,
      "test-groupId",
    );
    expect(result).toBe("organizations/org-123/groups/test-groupId/meetings");
  });

  it("generates correct path for getGroupAttendanceCollectionPath", () => {
    const result = paths.getGroupAttendanceCollectionPath(
      context,
      "test-groupId",
      "test-meetingId",
    );
    expect(result).toBe(
      "organizations/org-123/groups/test-groupId/meetings/test-meetingId/attendance",
    );
  });

  it("generates correct path for getServiceTeamsCollectionPath", () => {
    const result = paths.getServiceTeamsCollectionPath(context);
    expect(result).toBe("organizations/org-123/serviceTeams");
  });

  it("generates correct path for getServiceAssignmentsCollectionPath", () => {
    const result = paths.getServiceAssignmentsCollectionPath(context);
    expect(result).toBe("organizations/org-123/serviceAssignments");
  });

  it("generates correct path for getEventsCollectionPath", () => {
    const result = paths.getEventsCollectionPath(context);
    expect(result).toBe("organizations/org-123/events");
  });

  it("generates correct path for getEventTicketsCollectionPath", () => {
    const result = paths.getEventTicketsCollectionPath(context, "test-eventId");
    expect(result).toBe("organizations/org-123/events/test-eventId/tickets");
  });

  it("generates correct path for getEventRegistrationsCollectionPath", () => {
    const result = paths.getEventRegistrationsCollectionPath(
      context,
      "test-eventId",
    );
    expect(result).toBe(
      "organizations/org-123/events/test-eventId/registrations",
    );
  });

  it("generates correct path for getEventCheckInsCollectionPath", () => {
    const result = paths.getEventCheckInsCollectionPath(
      context,
      "test-eventId",
    );
    expect(result).toBe("organizations/org-123/events/test-eventId/checkIns");
  });

  it("generates correct path for getJourneyProfilesCollectionPath", () => {
    const result = paths.getJourneyProfilesCollectionPath(context);
    expect(result).toBe("organizations/org-123/journeyProfiles");
  });

  it("generates correct path for getJourneyMissionsCollectionPath", () => {
    const result = paths.getJourneyMissionsCollectionPath(
      context,
      "test-journeyProfileId",
    );
    expect(result).toBe(
      "organizations/org-123/journeyProfiles/test-journeyProfileId/missions",
    );
  });

  it("generates correct path for getBadgesCollectionPath", () => {
    const result = paths.getBadgesCollectionPath(context);
    expect(result).toBe("organizations/org-123/badges");
  });

  it("generates correct path for getMemberBadgesCollectionPath", () => {
    const result = paths.getMemberBadgesCollectionPath(
      context,
      "test-personId",
    );
    expect(result).toBe("organizations/org-123/people/test-personId/badges");
  });

  it("generates correct path for getTribesCollectionPath", () => {
    const result = paths.getTribesCollectionPath(context);
    expect(result).toBe("organizations/org-123/tribes");
  });

  it("generates correct path for getTribeAssessmentsCollectionPath", () => {
    const result = paths.getTribeAssessmentsCollectionPath(context);
    expect(result).toBe("organizations/org-123/tribeAssessments");
  });

  it("generates correct path for getTribeAssessmentScoresCollectionPath", () => {
    const result = paths.getTribeAssessmentScoresCollectionPath(
      context,
      "test-assessmentId",
    );
    expect(result).toBe(
      "organizations/org-123/tribeAssessments/test-assessmentId/scores",
    );
  });

  it("generates correct path for getMemberTribeProfilesCollectionPath", () => {
    const result = paths.getMemberTribeProfilesCollectionPath(context);
    expect(result).toBe("organizations/org-123/memberTribeProfiles");
  });

  it("generates correct path for getMemberTribeHistoryCollectionPath", () => {
    const result = paths.getMemberTribeHistoryCollectionPath(
      context,
      "test-personId",
    );
    expect(result).toBe(
      "organizations/org-123/people/test-personId/tribeHistory",
    );
  });

  it("generates correct path for getTribeReviewRequestsCollectionPath", () => {
    const result = paths.getTribeReviewRequestsCollectionPath(context);
    expect(result).toBe("organizations/org-123/tribeReviewRequests");
  });

  it("generates correct path for getTribeBehaviorSignalsCollectionPath", () => {
    const result = paths.getTribeBehaviorSignalsCollectionPath(context);
    expect(result).toBe("organizations/org-123/tribeBehaviorSignals");
  });

  it("generates correct path for getLeaderEmotionalPulseCollectionPath", () => {
    const result = paths.getLeaderEmotionalPulseCollectionPath(context);
    expect(result).toBe("organizations/org-123/leaderEmotionalPulse");
  });

  it("generates correct path for getWellBeingResourcesCollectionPath", () => {
    const result = paths.getWellBeingResourcesCollectionPath(context);
    expect(result).toBe("organizations/org-123/wellBeingResources");
  });

  it("generates correct path for getMentoringSessionsCollectionPath", () => {
    const result = paths.getMentoringSessionsCollectionPath(context);
    expect(result).toBe("organizations/org-123/mentoringSessions");
  });

  it("generates correct path for getEmergencySOSCollectionPath", () => {
    const result = paths.getEmergencySOSCollectionPath(context);
    expect(result).toBe("organizations/org-123/emergencySOS");
  });

  it("generates correct path for getWorshipSongsCollectionPath", () => {
    const result = paths.getWorshipSongsCollectionPath(context);
    expect(result).toBe("organizations/org-123/worshipSongs");
  });

  it("generates correct path for getWorshipSetlistsCollectionPath", () => {
    const result = paths.getWorshipSetlistsCollectionPath(context);
    expect(result).toBe("organizations/org-123/worshipSetlists");
  });

  it("generates correct path for getGroupBannersCollectionPath", () => {
    const result = paths.getGroupBannersCollectionPath(context);
    expect(result).toBe("organizations/org-123/groupBanners");
  });

  it("generates correct path for getCoursesCollectionPath", () => {
    const result = paths.getCoursesCollectionPath(context);
    expect(result).toBe("organizations/org-123/courses");
  });

  it("generates correct path for getPlatformProgramsCollectionPath", () => {
    const result = paths.getPlatformProgramsCollectionPath();
    expect(result).toBe("platformPrograms");
  });

  it("generates correct path for getPlatformProgramModulesCollectionPath", () => {
    const result =
      paths.getPlatformProgramModulesCollectionPath("test-programId");
    expect(result).toBe("platformPrograms/test-programId/modules");
  });

  it("generates correct path for getPlatformProgramLessonsCollectionPath", () => {
    const result =
      paths.getPlatformProgramLessonsCollectionPath("test-programId");
    expect(result).toBe("platformPrograms/test-programId/lessons");
  });

  it("generates correct path for getProgramEntitlementsCollectionPath", () => {
    const result = paths.getProgramEntitlementsCollectionPath(context);
    expect(result).toBe("organizations/org-123/programEntitlements");
  });

  it("generates correct path for getCourseModulesCollectionPath", () => {
    const result = paths.getCourseModulesCollectionPath(
      context,
      "test-courseId",
    );
    expect(result).toBe("organizations/org-123/courses/test-courseId/modules");
  });

  it("generates correct path for getLessonsCollectionPath", () => {
    const result = paths.getLessonsCollectionPath(context, "test-courseId");
    expect(result).toBe("organizations/org-123/courses/test-courseId/lessons");
  });

  it("generates correct path for getMemberCourseProgressCollectionPath", () => {
    const result = paths.getMemberCourseProgressCollectionPath(
      context,
      "test-memberId",
    );
    expect(result).toBe(
      "organizations/org-123/people/test-memberId/courseProgress",
    );
  });

  it("generates correct path for getScheduleSwapRequestsCollectionPath", () => {
    const result = paths.getScheduleSwapRequestsCollectionPath(context);
    expect(result).toBe("organizations/org-123/scheduleSwapRequests");
  });

  it("generates correct path for getWeeklyThemesCollectionPath", () => {
    const result = paths.getWeeklyThemesCollectionPath(context);
    expect(result).toBe("organizations/org-123/weeklyThemes");
  });

  it("generates correct path for getMemberContributionsCollectionPath", () => {
    const result = paths.getMemberContributionsCollectionPath(context);
    expect(result).toBe("organizations/org-123/contributions");
  });

  it("generates correct path for getContributionReceiptsCollectionPath", () => {
    const result = paths.getContributionReceiptsCollectionPath(context);
    expect(result).toBe("organizations/org-123/contributionReceipts");
  });

  it("generates correct path for getChurchAttendanceCollectionPath", () => {
    const result = paths.getChurchAttendanceCollectionPath(context);
    expect(result).toBe("organizations/org-123/churchAttendance");
  });

  it("generates correct path for getPrayerRequestsCollectionPath", () => {
    const result = paths.getPrayerRequestsCollectionPath(context);
    expect(result).toBe("organizations/org-123/prayerRequests");
  });
});

export type JourneyStage =
  | "exploring"
  | "connecting"
  | "grounding"
  | "serving"
  | "developing"
  | "leading";

export type AppRole =
  | "super_admin"
  | "church_admin"
  | "pastor"
  | "secretary"
  | "group_leader"
  | "ministry_leader"
  | "member";

export type PersonType = "adult" | "child" | "teen" | "young_adult";

export type MemberStatus =
  | "visitor"
  | "congregant"
  | "new_believer"
  | "member"
  | "leader"
  | "volunteer";

export type OrganizationStatus = "active" | "inactive" | "suspended";
export type CampusStatus = "active" | "inactive";
export type PersonStatus = "active" | "inactive" | "archived";
export type OrganizationBrandMode = "alvo_managed" | "co_branded" | "white_label";
export type SubscriptionPlanTier = "base" | "growth" | "advanced" | "enterprise";
export type BillingCycle = "monthly" | "yearly" | "custom";
export type MemberRange = "up_to_100" | "101_to_300" | "301_to_800" | "801_plus";
export type BrandAssetKind = "logoLight" | "logoDark" | "icon" | "favicon";

export type TribeCode =
  | "LEVI"
  | "JUDAH"
  | "ISSACHAR"
  | "JOSEPH"
  | "ASHER"
  | "NAPHTALI"
  | "ZEBULUN"
  | "GAD"
  | "MANASSEH"
  | "EPHRAIM"
  | "BENJAMIN"
  | "REUBEN";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  timezone: string;
  locale: string;
  countryCode: string;
  legalName?: string;
  publicName?: string;
  displayName?: string;
  organizationType?: "church" | "network" | "denomination" | "institution";
}

export interface OrganizationBrandingSettings {
  organizationId: string;
  brandMode: OrganizationBrandMode;
  publicProductName: string;
  publicShortName: string;
  logoLightUrl?: string;
  logoDarkUrl?: string;
  iconUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  surfaceColor?: string;
  textColor?: string;
  fontHeading?: string;
  fontBody?: string;
  showPoweredByAlvo: boolean;
  poweredByLabel?: string;
}

export interface OrganizationSubscriptionSettings {
  organizationId: string;
  planCode: string;
  planTier: SubscriptionPlanTier;
  billingCycle: BillingCycle;
  memberRange: MemberRange;
  seatLimit?: number;
  campusLimit?: number;
  aiQuota?: number;
  whiteLabelEnabled: boolean;
  coBrandingEnabled: boolean;
  multiCampusEnabled: boolean;
  denominationalModeEnabled: boolean;
  startedAt: string;
  renewsAt?: string;
  trialEndsAt?: string;
}

export interface OrganizationFeatureModule {
  enabled: boolean;
  source: "plan" | "addon" | "trial" | "manual";
  beta?: boolean;
  limits?: Record<string, number | string | boolean>;
}

export interface OrganizationFeaturesSettings {
  organizationId: string;
  modules: {
    core: OrganizationFeatureModule;
    visitors: OrganizationFeatureModule;
    groups: OrganizationFeatureModule;
    events: OrganizationFeatureModule;
    children: OrganizationFeatureModule;
    youth: OrganizationFeatureModule;
    volunteers: OrganizationFeatureModule;
    tribes: OrganizationFeatureModule;
    journeys: OrganizationFeatureModule;
    communication: OrganizationFeatureModule;
    finance: OrganizationFeatureModule;
    ai: OrganizationFeatureModule;
  };
}

export interface OrganizationSettingsSnapshot {
  branding: OrganizationBrandingSettings;
  subscription: OrganizationSubscriptionSettings;
  features: OrganizationFeaturesSettings;
}

export interface TenantRuntimeSnapshot {
  organization: Organization;
  settings: OrganizationSettingsSnapshot | null;
}

export interface TenantBrandAssetUploadResponse {
  success: boolean;
  assetKind: BrandAssetKind;
  fileName: string;
  objectKey: string;
  publicUrl: string;
}

export interface Campus {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: CampusStatus;
  city?: string;
  state?: string;
  countryCode: string;
}

export interface AuthUser {
  id: string;
  organizationId: string;
  personId?: string;
  email: string;
  roles: readonly AppRole[];
  campusIds: readonly string[];
  isActive: boolean;
}

export interface Family {
  id: string;
  organizationId: string;
  campusId?: string;
  familyName: string;
  displayName: string;
  status: "active" | "inactive";
}

export interface FamilyMember {
  id: string;
  organizationId: string;
  familyId: string;
  personId: string;
  relationshipType:
    | "self"
    | "spouse"
    | "child"
    | "parent"
    | "sibling"
    | "other";
  isPrimaryContact: boolean;
  isFinancialResponsible: boolean;
  isLegalGuardian: boolean;
}

export interface Person {
  id: string;
  organizationId: string;
  campusId?: string;
  primaryFamilyId?: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email?: string;
  mobilePhone?: string;
  whatsappPhone?: string;
  birthDate?: string;
  personType: PersonType;
  memberStatus: MemberStatus;
  status: PersonStatus;
  tribePrimaryCode?: TribeCode;
  tribeSecondaryCode?: TribeCode;
}

export interface PeopleListItem {
  id: string;
  fullName: string;
  memberStatus: MemberStatus;
  personType: PersonType;
  campusId?: string;
  primaryFamilyId?: string;
  tribePrimaryCode?: TribeCode;
}

export interface FamilySnapshot {
  family: Family;
  members: readonly FamilyMember[];
}

export interface TenantContext {
  organizationId: string;
  campusId?: string;
  userId?: string;
}

export interface FirestorePathMap {
  organizations: string;
  campuses: string;
  users: string;
  people: string;
  families: string;
  groups: string;
  events: string;
  tribes: string;
  settings: string;
  branding: string;
  subscription: string;
  features: string;
}

export interface DashboardSnapshot {
  organization: Organization;
  currentUser: AuthUser;
  totals: {
    people: number;
    families: number;
    visitors: number;
    groups: number;
  };
}

export interface PeopleDashboardSnapshot extends DashboardSnapshot {
  recentPeople: PeopleListItem[];
  activeFamilies: FamilySnapshot[];
}

export type VisitorOriginChannel =
  | "form"
  | "qr_code"
  | "checkin"
  | "secretary"
  | "app"
  | "whatsapp";

export type VisitorJourneyStage =
  | "new_visitor"
  | "welcomed"
  | "invited_to_group"
  | "attending_class"
  | "ready_for_membership"
  | "completed";

export type VisitorJourneyStatus = "active" | "completed" | "archived";

export type FollowUpTaskType =
  | "welcome_message"
  | "first_contact"
  | "invite_to_group"
  | "invite_to_class"
  | "pastoral_contact";

export type FollowUpTaskStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface VisitorJourney {
  id: string;
  organizationId: string;
  personId: string;
  originChannel: VisitorOriginChannel;
  currentStage: VisitorJourneyStage;
  status: VisitorJourneyStatus;
  assignedToUserId?: string;
  firstVisitDate: string;
  nextActionAt?: string;
}

export interface FollowUpTask {
  id: string;
  organizationId: string;
  personId: string;
  visitorJourneyId: string;
  assignedToUserId?: string;
  title: string;
  type: FollowUpTaskType;
  status: FollowUpTaskStatus;
  dueAt?: string;
}

export interface VisitorDashboardSnapshot extends PeopleDashboardSnapshot {
  activeJourneys: VisitorJourney[];
  openFollowUps: FollowUpTask[];
}

export type GroupType =
  | "cell"
  | "small_group"
  | "class"
  | "youth_group"
  | "ministry_team";

export type GroupStatus = "active" | "inactive" | "archived";
export type GroupVisibility = "private" | "internal" | "public";

export type GroupRoleInGroup =
  | "member"
  | "visitor"
  | "leader"
  | "co_leader"
  | "host"
  | "supervisor";

export type GroupAttendanceStatus =
  | "present"
  | "absent"
  | "justified"
  | "first_time_guest";

export interface Group {
  id: string;
  organizationId: string;
  campusId?: string;
  ministryId?: string;
  name: string;
  slug: string;
  type: GroupType;
  status: GroupStatus;
  visibility: GroupVisibility;
  meetingDayOfWeek?: number;
  meetingTime?: string;
  city?: string;
  state?: string;
  capacity?: number;
}

export interface GroupMember {
  id: string;
  organizationId: string;
  groupId: string;
  personId: string;
  roleInGroup: GroupRoleInGroup;
  joinedAt: string;
}

export interface GroupMeeting {
  id: string;
  organizationId: string;
  groupId: string;
  scheduledStartAt: string;
  scheduledEndAt?: string;
  meetingStatus: "scheduled" | "completed" | "cancelled";
}

export interface GroupAttendance {
  id: string;
  organizationId: string;
  groupId: string;
  groupMeetingId: string;
  personId: string;
  attendanceStatus: GroupAttendanceStatus;
}

export interface GroupsDashboardSnapshot extends VisitorDashboardSnapshot {
  activeGroups: Group[];
  upcomingMeetings: GroupMeeting[];
  latestAttendance: GroupAttendance[];
}

export type EventType =
  | "service"
  | "conference"
  | "retreat"
  | "training"
  | "integration_class"
  | "kids_event";

export type EventStatus = "draft" | "published" | "closed" | "cancelled";
export type EventLocationType = "onsite" | "online" | "hybrid";
export type RegistrationStatus = "confirmed" | "pending" | "cancelled";
export type EventCheckInStatus = "not_checked_in" | "checked_in";

export interface Event {
  id: string;
  organizationId: string;
  campusId?: string;
  ministryId?: string;
  name: string;
  slug: string;
  description?: string;
  type: EventType;
  status: EventStatus;
  locationType: EventLocationType;
  startsAt: string;
  endsAt?: string;
  capacity?: number;
  isPaid: boolean;
}

export interface EventTicket {
  id: string;
  organizationId: string;
  eventId: string;
  name: string;
  priceAmount: number;
  currency: string;
  quantityAvailable?: number;
}

export interface EventRegistration {
  id: string;
  organizationId: string;
  eventId: string;
  responsiblePersonId: string;
  registrationCode: string;
  status: RegistrationStatus;
  paymentStatus: "not_required" | "pending" | "paid";
  registeredAt: string;
}

export interface EventRegistrationPerson {
  id: string;
  organizationId: string;
  eventRegistrationId: string;
  personId: string;
  eventTicketId?: string;
  checkInStatus: EventCheckInStatus;
}

export interface EventCheckIn {
  id: string;
  organizationId: string;
  eventId: string;
  personId: string;
  registrationPersonId: string;
  checkedInAt: string;
}

export interface EventsDashboardSnapshot extends GroupsDashboardSnapshot {
  publishedEvents: Event[];
  latestRegistrations: EventRegistration[];
  latestEventCheckIns: EventCheckIn[];
}

export type JourneyKind =
  | "visitor"
  | "belonging"
  | "service"
  | "development"
  | "leadership"
  | "care";

export type JourneyMissionKind = "automatic" | "suggested" | "pastoral";
export type JourneyMissionStatus = "locked" | "available" | "completed" | "skipped";
export type BadgeCategory = "journey" | "consistency" | "training" | "impact";

export interface MemberJourneyProfile {
  id: string;
  organizationId: string;
  personId: string;
  currentJourneyKind: JourneyKind;
  currentStage: JourneyStage;
  progressPercent: number;
  readinessLevel: "low" | "medium" | "high";
}

export interface JourneyMission {
  id: string;
  organizationId: string;
  journeyProfileId: string;
  title: string;
  description?: string;
  kind: JourneyMissionKind;
  status: JourneyMissionStatus;
  dueAt?: string;
}

export interface Badge {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  category: BadgeCategory;
  description?: string;
}

export interface MemberBadge {
  id: string;
  organizationId: string;
  personId: string;
  badgeId: string;
  awardedAt: string;
}

export interface JourneysDashboardSnapshot extends EventsDashboardSnapshot {
  journeyProfiles: MemberJourneyProfile[];
  activeMissions: JourneyMission[];
  earnedBadges: MemberBadge[];
}

export type TribeAssessmentType =
  | "initial"
  | "revalidation"
  | "partial_review"
  | "full_reclassification";

export type TribeAssessmentStatus =
  | "draft"
  | "submitted"
  | "scored"
  | "pending_validation"
  | "validated"
  | "superseded";

export type TribeValidationStatus = "not_required" | "pending" | "validated" | "adjusted";

export interface TribeDefinition {
  id: string;
  organizationId: string;
  code: TribeCode;
  name: string;
  description: string;
  ministrySummary: string;
  isActive: boolean;
}

export interface TribeAssessment {
  id: string;
  organizationId: string;
  personId: string;
  assessmentType: TribeAssessmentType;
  status: TribeAssessmentStatus;
  primaryTribeCode?: TribeCode;
  secondaryTribeCode?: TribeCode;
  confidenceLevel: "low" | "medium" | "high";
  validationStatus: TribeValidationStatus;
  submittedAt?: string;
}

export interface TribeAssessmentScore {
  id: string;
  organizationId: string;
  tribeAssessmentId: string;
  tribeCode: TribeCode;
  scoreRaw: number;
  rankPosition: number;
}

export interface MemberTribeProfile {
  id: string;
  organizationId: string;
  personId: string;
  currentPrimaryTribeCode?: TribeCode;
  currentSecondaryTribeCode?: TribeCode;
  currentAssessmentId?: string;
  validationStatus: TribeValidationStatus;
  fitScore: number;
  nextReviewDueAt?: string;
}

export interface MemberTribeHistoryEntry {
  id: string;
  organizationId: string;
  personId: string;
  oldPrimaryTribeCode?: TribeCode;
  newPrimaryTribeCode?: TribeCode;
  oldSecondaryTribeCode?: TribeCode;
  newSecondaryTribeCode?: TribeCode;
  changeType:
    | "initial_assignment"
    | "manual_adjustment"
    | "scheduled_revalidation"
    | "partial_reclassification"
    | "full_reclassification";
  effectiveFrom: string;
}

export interface TribesDashboardSnapshot extends JourneysDashboardSnapshot {
  tribeDefinitions: TribeDefinition[];
  latestTribeAssessments: TribeAssessment[];
  currentTribeProfiles: MemberTribeProfile[];
}

export interface TribeQuestionOptionWeight {
  tribeCode: TribeCode;
  value: number;
}

export interface TribeQuestionOption {
  code: string;
  label: string;
  weights: readonly TribeQuestionOptionWeight[];
}

export interface TribeQuestion {
  code: string;
  prompt: string;
  options: readonly TribeQuestionOption[];
}

export interface TribeQuestionnaire {
  version: string;
  questions: readonly TribeQuestion[];
}

export interface TribeAnswer {
  questionCode: string;
  optionCode: string;
}

export interface TribeQuestionnaireResult {
  primaryTribeCode: TribeCode;
  secondaryTribeCode?: TribeCode;
  scores: readonly TribeAssessmentScore[];
  confidenceLevel: "low" | "medium" | "high";
}

export type TribeReviewReasonType =
  | "self_perception_change"
  | "phase_change"
  | "ministry_change"
  | "behavior_divergence"
  | "initial_error"
  | "pastoral_discernment"
  | "annual_review";

export type TribeReviewRequestStatus =
  | "open"
  | "approved"
  | "denied"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TribeRecommendedReviewType =
  | "revalidation"
  | "partial_review"
  | "full_reclassification";

export interface TribeReviewRequest {
  id: string;
  organizationId: string;
  personId: string;
  requestedByUserId?: string;
  requestReasonType: TribeReviewReasonType;
  requestStatus: TribeReviewRequestStatus;
  recommendedReviewType: TribeRecommendedReviewType;
  openedAt: string;
  reviewDueAt?: string;
}

export interface TribeBehaviorSignal {
  id: string;
  organizationId: string;
  personId: string;
  signalType:
    | "ministry_participation"
    | "leadership_assignment"
    | "journey_shift"
    | "manual_feedback";
  suggestedTribeCode?: TribeCode;
  confidenceWeight: number;
  observedAt: string;
}

export interface TribeReclassificationSnapshot extends TribesDashboardSnapshot {
  reviewRequests: TribeReviewRequest[];
  behaviorSignals: TribeBehaviorSignal[];
}

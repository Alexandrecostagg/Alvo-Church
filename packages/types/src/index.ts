export type OrganizationRef = {
  id: string;
  name?: string;
};

export type ID = string;
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
  organizationTier?: "solo" | "campus" | "network" | "denomination";
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
  pixKey?: string;
  pixReceiverName?: string;
  groupsModuleLabel?: string;
  groupsModelType?: "cell" | "gc" | "leadership" | "generic";
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
    marketplace: OrganizationFeatureModule;
    giving: OrganizationFeatureModule;
    publicForms: OrganizationFeatureModule;
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

/* ── Network / Rede de Igrejas ─────────────────────────────────────────── */

export interface NetworkAffiliate {
  id: string;
  parentOrganizationId: string;
  childOrganizationId: string;
  childName: string;
  childCity?: string;
  childState?: string;
  status: "pending" | "active" | "inactive";
  inviteCode?: string;
  joinedAt?: string;
  lastSnapshotAt?: string;
}

export interface NetworkSnapshot {
  id: string;
  organizationId: string;
  date: string;                    // "YYYY-MM-DD"
  month: string;                   // "YYYY-MM"
  // Membros
  totalMembers: number;
  newMembersThisMonth: number;
  activeMembers: number;
  visitors: number;
  // Grupos
  totalGroups: number;
  activeGroups: number;
  avgGroupAttendance: number;
  // Eventos
  eventsThisMonth: number;
  totalEventAttendance: number;
  // Financeiro
  givingThisMonth: number;
  givingLastMonth: number;
  // Engajamento
  serviceAttendanceRate: number;   // 0–100
  // Meta
  createdAt: string;
}

export interface NetworkDashboardSnapshot {
  affiliates: NetworkAffiliate[];
  snapshots: Record<string, NetworkSnapshot>;  // keyed by childOrganizationId
  totals: {
    churches: number;
    members: number;
    visitors: number;
    groups: number;
    giving: number;
  };
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

export type HouseholdIncomeRange =
  | "up_to_1_minimum_wage"
  | "one_to_3_minimum_wages"
  | "three_to_5_minimum_wages"
  | "five_to_10_minimum_wages"
  | "above_10_minimum_wages"
  | "not_informed";

export type EducationLevel =
  | "elementary"
  | "high_school"
  | "technical"
  | "undergraduate"
  | "postgraduate"
  | "not_informed";

export interface PostalAddress {
  postalCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  countryCode?: string;
  geohash?: string;
}

export interface Family {
  id: string;
  organizationId: string;
  campusId?: string;
  familyName: string;
  displayName: string;
  status: "active" | "inactive";
  address?: PostalAddress;
  incomeRange?: HouseholdIncomeRange;
  notes?: string;
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
  cpf?: string;
  address?: PostalAddress;
  occupation?: string;
  educationLevel?: EducationLevel;
  householdIncomeRange?: HouseholdIncomeRange;
  consentLgpdAt?: string;
  memberCardCode?: string;
  partnerBenefitsEnabled?: boolean;
  personType: PersonType;
  memberStatus: MemberStatus;
  status: PersonStatus;
  tribePrimaryCode?: TribeCode;
  tribeSecondaryCode?: TribeCode;
  ministerialInterests?: string[];
  servingProfile?: "leading" | "teaching" | "creating" | "caring" | "organizing" | "interceding";
  availability?: string[];
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

export type PartnerBenefitCategory =
  | "health"
  | "education"
  | "food"
  | "services"
  | "community";

export type PartnerBenefitStatus = "active" | "paused" | "expired";

export interface PartnerOrganization {
  id: string;
  organizationId: string;
  name: string;
  category: PartnerBenefitCategory;
  status: "active" | "inactive";
  contactName?: string;
  contactPhone?: string;
  ownerPersonId?: string;
  isMemberBusiness: boolean;
  logoUrl?: string;
  website?: string;
  instagram?: string;
  address?: {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    postalCode: string;
    lat?: number;
    lng?: number;
  };
}

export interface PartnerBenefit {
  id: string;
  organizationId: string;
  partnerId: string;
  title: string;
  description: string;
  category: PartnerBenefitCategory;
  status: PartnerBenefitStatus;
  discountLabel: string;
  verificationMode: "qr_code" | "member_code" | "manual";
  validUntil?: string;
  privacyNotes: string;
}

export interface MemberBenefitValidation {
  id: string;
  organizationId: string;
  partnerId: string;
  benefitId: string;
  personId: string;
  memberCardCode: string;
  validationStatus: "approved" | "denied" | "expired";
  validatedAt: string;
  exposedFields: readonly string[];
}

export type CommunityStoreStatus = "pending" | "approved" | "rejected" | "suspended";
export type CommunityOfferStatus = "active" | "expired" | "suspended";
export type CommunityOfferType = "percentage" | "fixed_amount" | "freebie" | "promotion";

export interface CommunityStore {
  id: string;
  organizationId: string;
  ownerId: string; // PersonId - Proprietário/Comerciante
  name: string;
  description: string;
  category: PartnerBenefitCategory;
  status: CommunityStoreStatus;
  images: string[]; // URLs de banners/imagens
  bannerImageUrl?: string;
  contact: {
    phone?: string;
    email?: string;
    address?: PostalAddress;
  };
  socialLinks?: {
    instagram?: string;
    whatsapp?: string;
    website?: string;
    facebook?: string;
  };
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  suspensionReason?: string;
  moderatedBy?: string; // UserId do admin que moderou
}

export interface CommunityOffer {
  id: string;
  organizationId: string;
  storeId: string;
  title: string;
  description: string;
  type: CommunityOfferType;
  discountPercentage?: number; // Se type == 'percentage'
  discountAmount?: number; // Se type == 'fixed_amount'
  images: string[]; // URLs de imagens do cupom/promoção
  validFrom: string;
  validUntil: string;
  status: CommunityOfferStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // PersonId do criador
}

export interface CommunityStoreModerationLog {
  id: string;
  organizationId: string;
  storeId: string;
  action: "created" | "approved" | "rejected" | "suspended" | "reactivated" | "updated";
  moderatedBy: string; // UserId
  reason?: string;
  previousStatus?: CommunityStoreStatus;
  newStatus?: CommunityStoreStatus;
  timestamp: string;
  notes?: string;
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
  partners: string;
  partnerBenefits: string;
  memberBenefitValidations: string;
  visitorIntakes: string;
  groups: string;
  serviceAssignments: string;
  serviceTeams: string;
  events: string;
  tribes: string;
  financeReports: string;
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

export type VisitorIntakeStatus =
  | "captured"
  | "journey_created"
  | "greeting_scheduled"
  | "archived";

export interface VisitorIntake {
  id: string;
  organizationId: string;
  personId?: string;
  journeyId?: string;
  name: string;
  phone?: string;
  source: string;
  status: VisitorIntakeStatus;
  greeting?: string;
  capturedByUserId?: string;
  createdAt: string;
}

export interface VisitorDashboardSnapshot extends PeopleDashboardSnapshot {
  activeJourneys: VisitorJourney[];
  openFollowUps: FollowUpTask[];
}

export type FinancialTransparencyReportStatus = "draft" | "published" | "archived";

export interface FinancialTransparencyEntry {
  id: string;
  amount: number;
  category: string;
  label: string;
  note: string;
}

export interface FinancialTransparencyReport {
  id: string;
  organizationId: string;
  month: string;
  income: number;
  expenses: number;
  missions: number;
  balance: number;
  entries: FinancialTransparencyEntry[];
  status: FinancialTransparencyReportStatus;
  publishedAt?: string;
  publishedByUserId?: string;
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
  tribeCode?: TribeCode;
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

export type ServiceAssignmentStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "present"
  | "absent";

export interface ServiceTeam {
  id: string;
  organizationId: string;
  campusId?: string;
  code: string;
  name: string;
  summary?: string;
  targetVolunteers?: number;
  status: "active" | "inactive";
}

export interface ServiceAssignment {
  id: string;
  organizationId: string;
  campusId?: string;
  serviceTeamId: string;
  ministryCode: string;
  personId: string;
  role: string;
  serviceDate: string;
  status: ServiceAssignmentStatus;
  responseNote?: string;
  confirmedAt?: string;
  declinedAt?: string;
  checkedInAt?: string;
  absentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleSwapRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export interface ScheduleSwapRequest {
  id: string;
  organizationId: string;
  campusId?: string;
  assignmentId: string;
  requestorPersonId: string;
  targetPersonId?: string;
  proposedReplacementPersonId?: string;
  status: ScheduleSwapRequestStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
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

export type KidsCheckInStatus = "checked_in" | "checked_out" | "cancelled";

export interface KidsCheckIn { 
  id: string; 
  organizationId: string; 
  campusId?: string; 
  childId: string; 
  parentId: string; 
  authorizedPickUpIds: string[]; 
  checkedInAt: string; 
  checkedOutAt?: string; 
  checkedOutByParentId?: string; 
  status: KidsCheckInStatus; 
  roomCode?: string; 
  securityToken: string; 
  notes?: string; 
}

export interface KidsSecuritySession { 
  id: string; 
  organizationId: string; 
  parentId: string; 
  token: string; 
  expiresAt: string; 
  status: "active" | "used" | "expired"; 
}

// Leader Wellness Types
export type EmotionalMood = "tired" | "anxious" | "neutral" | "happy" | "energetic";

export interface LeaderEmotionalPulse {
  id: string;
  organizationId: string;
  leaderId: string;
  mood: EmotionalMood;
  energyLevel: number; // 1-10
  stressLevel: number; // 1-10
  notedAt: string;
  notes?: string;
}

export interface WellBeingResource {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  category: "mental" | "physical" | "spiritual" | "relational";
  contentUrl: string;
  thumbnailUrl?: string;
  durationMinutes?: number;
  tags: string[];
}

export interface MentoringSession {
  id: string;
  organizationId: string;
  leaderId: string;
  mentorName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "scheduled" | "completed" | "cancelled";
  meetingLink?: string;
  summaryNotes?: string;
}

export interface EmergencySOS {
  id: string;
  organizationId: string;
  leaderId: string;
  triggeredAt: string;
  reason: string;
  status: "active" | "resolved" | "dismissed";
  resolvedAt?: string;
  resolvedByUserId?: string;
}

// Worship Setlists (Louvor e Repertório)
export interface WorshipSong {
  id: string;
  organizationId: string;
  title: string;
  artist: string;
  originalKey: string;
  tempoBpm?: number;
  spotifyUrl?: string;
  youtubeUrl?: string;
  chordsLyrics?: string; // Cifras dinâmicas em Markdown: [C] [G] [Am] [F]
  createdAt: string;
}

export interface WorshipSetlist {
  id: string;
  organizationId: string;
  eventId: string; // Culto ou evento vinculado
  songs: Array<{
    songId: string;
    selectedKey: string; // Tom transposto para o cantor
    sortOrder: number;
  }>;
  updatedAt: string;
}

// Alvo Canvas (Banners de Células)
export interface GroupBannerConfig {
  id: string;
  organizationId: string;
  groupId: string;
  themeColor: string; // Paleta de cor selecionada
  titleText: string;
  subtitleText?: string;
  bannerFormat: "feed" | "story"; // Formatos solicitados
  showLeaderPhoto: boolean;
  customAddress?: string;
  updatedAt: string;
}

// EAD / LMS de Discipulado
export interface Course {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  badgeUnlockedId?: string; // Destrava Badge do Alvo Journeys ao concluir
  isActive: boolean;
  createdAt: string;
}

export interface CourseModule {
  id: string;
  organizationId: string;
  courseId: string;
  title: string;
  sortOrder: number;
}

export interface Lesson {
  id: string;
  organizationId: string;
  courseId: string;
  moduleId: string;
  title: string;
  videoUrl: string; // Vimeo, YouTube ou Cloudflare Stream
  durationMinutes: number;
  sortOrder: number;
}

export interface MemberCourseProgress {
  id: string;
  organizationId: string;
  memberId: string;
  courseId: string;
  completedLessons: string[]; // IDs de aulas concluídas
  isCompleted: boolean;
  completedAt?: string;
  updatedAt: string;
}

// ─── Tema Semanal de Células ──────────────────────────────────────────────────

export type WeeklyThemeScope =
  | "all"        // todas as células da organização
  | "specific"   // apenas as células listadas em groupIds
  | "open";      // líder decide o próprio tema livremente

export interface WeeklyTheme {
  id: string;
  organizationId: string;
  title: string;               // tema da semana
  bibleVerse?: string;         // passagem bíblica sugerida
  description?: string;        // orientação extra do pastor
  scope: WeeklyThemeScope;
  groupIds: string[];          // vazio = todas as células (quando scope = "all")
  weekStartDate: string;       // ISO date da segunda-feira da semana (YYYY-MM-DD)
  createdBy: string;           // userId do pastor/admin
  createdAt: string;
}


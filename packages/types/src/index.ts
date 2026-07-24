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
export type BrandAssetKind = "logoLight" | "logoDark" | "icon" | "favicon" | "kidsPhoto";

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
  // uid do Firebase Auth de quem provisionou a organização — usado pelas
  // Firestore rules para permitir o bootstrap do primeiro admin (self-serve).
  // Ausente em organizações antigas/provisionadas manualmente.
  ownerUid?: string;
  // CNPJ (se tiver) ou CPF do responsável — coletado já no cadastro pra
  // não ficar "solto"; reaproveitado como sugestão no checkout de upgrade.
  taxId?: string;
  addressCity?: string;
  addressState?: string;
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
  givingWhatsappNumber?: string;   // WhatsApp da igreja p/ o link wa.me na doação pública (só dígitos, com DDI)
  groupsModuleLabel?: string;
  groupsModelType?: "cell" | "gc" | "leadership" | "generic";
}

// Doação pública (funil sem-app): terceiro não-membro doa via /p/{slug}/give
// usando o PIX da própria igreja. Registramos só a intenção/lead (o dinheiro
// nunca passa pela plataforma) — base do CRM de doadores do tenant.
export interface GivingIntent {
  id: string;
  organizationId: string;
  name: string;
  whatsapp: string;
  amount: number;
  source: "public_give";
  status: "captured";
  orgSlug?: string;
  campaignId?: string; // vincula a doação a uma campanha de oferta
  consentContact: boolean;
  createdAt: string;
}

// Comprovante de doação pública: o doador clica "Já paguei" no link público e
// (opcionalmente) anexa a foto. Doc separado (imagem base64) linkado à intenção.
export interface GivingReceipt {
  id: string;
  organizationId: string;
  intentId: string;
  imageBase64?: string;
  createdAt: string;
}

// Campanha de oferta: arrecadação com meta pra um projeto/causa (ex: reforma,
// missões). raisedAmount é atualizado pela liderança conforme o PIX entra
// (a plataforma nunca custodia dinheiro).
export interface GivingCampaign {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  category?: string;
  goalAmount: number;
  raisedAmount: number;
  status: "active" | "closed";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
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
  // Gateway de pagamento (Asaas) — preenchidos após o primeiro checkout.
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
  asaasStatus?: string;
  // Situação de cobrança — "overdue" começa quando o Asaas avisa fatura
  // vencida (via webhook), "suspended" quando o prazo de carência estoura.
  billingStatus?: "active" | "overdue" | "suspended";
  overdueSince?: string;
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
  photoUrl?: string;            // foto de perfil (ex.: capturada no check-in kids)
  personType: PersonType;
  memberStatus: MemberStatus;
  status: PersonStatus;
  tribePrimaryCode?: TribeCode;
  tribeSecondaryCode?: TribeCode;
  tribeClassificationReason?: string;          // "porquê" da classificação (IA ou motivo do admin)
  tribeClassificationSource?: "ai" | "manual"; // quem definiu a tribo atual
  tribeClassifiedAt?: string;                  // ISO — quando a tribo foi definida/ajustada
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

// Promoção do marketplace num nível flat da org (fácil de listar no feed do
// app e notificar). Separada de CommunityOffer (que é por-loja) de propósito,
// pra alimentar a notificação in-app sem collectionGroup.
export interface MarketplacePromotion {
  id: string;
  organizationId: string;
  storeId: string;
  storeName: string;
  title: string;
  description: string;
  validUntil?: string; // ISO date
  status: "active" | "expired";
  createdBy: string; // userId de quem publicou
  createdAt: string; // ISO datetime
}

// Comunicação: registro de cada envio (histórico persistido) e templates reutilizáveis.
export interface CommunicationLogEntry {
  id: string;
  organizationId: string;
  channel: "whatsapp";
  message: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentByUserId: string;
  createdAt: string; // ISO
}

export interface CommunicationTemplate {
  id: string;
  organizationId: string;
  title: string;
  message: string;
  createdByUserId: string;
  createdAt: string; // ISO
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

// Lançamento financeiro individual (ledger real da tela de Finanças). Entradas
// e saídas persistidas; o income também soma as MemberContribution confirmadas.
export type FinancialTransactionKind = "income" | "expense" | "missions";

export interface FinancialTransaction {
  id: string;
  organizationId: string;
  kind: FinancialTransactionKind;
  label: string;
  amount: number;              // sempre positivo; o kind define o sinal
  note?: string;
  date: string;                // ISO — data do lançamento
  createdByUserId?: string;
  createdAt: string;
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
  locationName?: string; // nome do local exibido (ex.: "Auditório Principal") — Event não tinha rótulo de local
  priceAmount?: number;  // preço do ingresso em R$ (modelo simples de 1 preço; distinto de EventTicket)
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
  personName?: string;  // nome do inscrito denormalizado no ato (p/ a plataforma exibir sem lookup)
  personEmail?: string; // email denormalizado no ato
  checkedInAt?: string; // ISO do check-in (presença confirmada na entrada); ausente = ainda não entrou
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
  source?: "ai" | "manual";     // origem da mudança (IA classificou ou admin ajustou)
  reason?: string;              // motivo registrado (frase da IA ou justificativa do admin)
  changedByUserId?: string;     // admin que fez o ajuste manual
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
  childId: string;                 // Person(personType child).id, ou "quick_" + token p/ cadastro rápido
  parentId: string;                // responsável que fez o check-in
  authorizedPickUpIds: string[];   // responsáveis legais autorizados a retirar (FamilyMember.isLegalGuardian)
  checkedInAt: string;
  checkedOutAt?: string;
  checkedOutByParentId?: string;
  checkedInByUserId?: string;      // voluntário/uid que operou a entrada
  status: KidsCheckInStatus;
  roomCode?: string;
  serviceTeamId?: string;          // sala kids (ServiceTeam) onde a criança está
  securityToken: string;           // payload do QR de retirada
  // Denormalizado p/ exibição (essencial quando a criança é cadastro rápido, sem Person):
  childName?: string;
  guardianName?: string;
  allergies?: string;
  securityRestrictions?: string;
  photoUrl?: string;               // foto tirada na hora
  photoConsentAt?: string;         // consentimento LGPD do responsável (timestamp)
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

// Config da Segurança Kids por organização (settings/kids). O admin define
// quais papéis podem gerar/operar o QR e quais ServiceTeams são "salas kids".
export interface OrganizationKidsSettings {
  qrGeneratorRoles: AppRole[];     // papéis autorizados a gerar/operar o check-in por QR
  kidsTeamIds: string[];           // ServiceTeam.id que representam salas kids
  updatedAt?: string;
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

// Esdras Canvas (Banners de Células)
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
  instructorName?: string;  // Nome do ministrador/professor — impresso no certificado
  instructorTitle?: string; // Cargo opcional (ex.: "Pastor", "Professora") exibido antes do nome
  badgeUnlockedId?: string; // Destrava Badge do Esdras Journeys ao concluir
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
  materialUrl?: string; // link opcional de material de apoio (PDF/slide) anexado à aula
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

// ─── Loja de Capacitação (catálogo global da Plataforma Esdras) ────────────────
// Trilhas/programas autorados pela Esdras e vendidos como produto avulso às
// igrejas. Vivem em coleções TOP-LEVEL (fora de organizations/) — o catálogo é
// global. Distinto dos Course/Lesson acima, que são o EAD interno org-scoped.

export interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  priceBRL: number;             // preço em REAIS (não centavos) — convenção do Asaas/repo
  isPublished: boolean;         // rascunho x visível no catálogo
  instructorName?: string;      // Nome do ministrador/professor — impresso no certificado
  instructorTitle?: string;     // Cargo opcional (ex.: "Pastor", "Professora")
  badgeUnlockedId?: string;     // destrava badge/certificado ao concluir (reusa mecanismo do EAD)
  createdAt: string;
  updatedAt: string;
}

export interface TrainingProgramModule {
  id: string;
  programId: string;
  title: string;
  sortOrder: number;
}

export interface TrainingLesson {
  id: string;
  programId: string;
  moduleId?: string;
  title: string;
  videoUrl: string;
  durationMinutes: number;
  sortOrder: number;
  materialUrl?: string; // link opcional de material de apoio (PDF/slide/apostila) da aula
  content?: string;     // apostila/conteúdo da aula em markdown — lido no app abaixo do vídeo
}

// Entitlement por org: gravado SOMENTE pelo webhook de pagamento (service
// account). Cliente só lê. "revogar" = flip de status, nunca delete.
export interface ProgramEntitlement {
  id: string;                   // = programId
  programId: string;
  status: "active" | "revoked";
  purchasedAt: string;
  asaasPaymentId: string;
  asaasStatus?: string;
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

export type ContributionType = "dizimo" | "oferta" | "campanha" | "missao" | "outro";

export type ContributionStatus = "pending" | "confirmed";
export type ContributionMethod = "pix" | "manual" | "cash" | "card";

export interface MemberContribution {
  id: string;
  organizationId: string;
  userId: string;           // Firebase Auth UID do membro
  personId?: string;        // Link para Person record
  contributorName?: string; // Nome do membro (denormalizado no ato) p/ a secretaria identificar quem pagou
  amount: number;           // valor em R$ (float)
  type: ContributionType;
  date: string;             // ISO date YYYY-MM-DD
  description?: string;     // ex: "Oferta de Missões Junho"
  culto?: string;           // ex: "Culto Domingo Noite"
  receiptNumber?: string;
  registeredBy: string;     // userId de quem registrou (staff/admin, ou o próprio membro quando pending)
  registeredAt: string;     // ISO datetime
  // Auto-declarado pelo app (mobile/web) via PIX: o membro registra que pagou,
  // fica "pending" até a liderança conferir e confirmar (recibo bate com o extrato).
  // Registros lançados manualmente por staff continuam sem `status` (tratados como
  // confirmados, mesmo comportamento de antes).
  status?: ContributionStatus;
  method?: ContributionMethod;
  receiptId?: string;       // id do doc de comprovante (imagem base64 em contributionReceipts)
  receiptUrl?: string;      // (futuro) URL do comprovante quando migrar p/ Storage
  confirmedBy?: string;     // userId do admin que confirmou o pending
  confirmedAt?: string;     // ISO datetime da confirmação
}

// ─── Radar Pastoral: presença em culto ──────────────────────────────────────

export interface ChurchAttendance {
  id: string;
  organizationId: string;
  personId: string;
  serviceDate: string;         // ISO date YYYY-MM-DD
  serviceLabel?: string;       // ex: "Culto Domingo Manhã"
  registeredByUserId?: string;
  createdAt: string;
}

// ─── Radar Pastoral: pedidos de oração ──────────────────────────────────────

export type PrayerRequestStatus = "open" | "in_progress" | "resolved";

export interface PrayerRequest {
  id: string;
  organizationId: string;
  personId?: string;
  personName: string;
  phone?: string;
  message: string;
  status: PrayerRequestStatus;
  assignedToUserId?: string;
  // Triagem de cuidado (usado pela tela de Cuidado Pastoral): categoria do
  // pedido, prioridade e equipe/responsável (rótulo livre).
  category?: string;
  priority?: "urgent" | "important" | "normal";
  careOwner?: string;
  source: "public_form" | "app" | "reception";
  createdAt: string;
  respondedAt?: string;
  respondedByUserId?: string;
  // Mural de oração: quando true, o pedido fica visível para outros membros
  // orarem junto (sem exigir acompanhamento pastoral). Padrão é privado.
  isPublic: boolean;
  prayerCount: number;
}


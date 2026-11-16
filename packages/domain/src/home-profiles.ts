export const HOME_PROFILES = [
  "pastoral",
  "administration",
  "cell_leader",
  "member",
  "network",
] as const;
export type HomeProfile = (typeof HOME_PROFILES)[number];
export const HOME_PROFILE_LABELS: Record<HomeProfile, string> = {
  pastoral: "Cuidado pastoral",
  administration: "Administração da igreja",
  cell_leader: "Liderança de células",
  member: "Minha participação",
  network: "Liderança da rede",
};
export interface HomeMetric {
  key: string;
  label: string;
  value: number | null;
  href?: string;
}
export interface HomeAction {
  key: string;
  title: string;
  detail: string;
  href: string;
}
export interface HomeGroupDetail {
  group: { id: string; name: string };
  timezone: string;
  meetingId: string | null;
  meetings: Array<{ id: string; startsAt: string }>;
  people: Array<{
    id: string;
    name: string;
    role: string;
    status: string | null;
  }>;
}
export interface RoleHomeSnapshot {
  profile: HomeProfile;
  profiles: HomeProfile[];
  organizationId: string;
  organizationName: string;
  timezone: string;
  groupsLabel: string;
  scopeLabel: string;
  asOf: string;
  linked: boolean;
  metrics: HomeMetric[];
  actions: HomeAction[];
  warnings: string[];
  events: Array<{
    id: string;
    name: string;
    startsAt: string;
    location: string;
  }>;
  groups: Array<{ id: string; name: string; meetingTime?: string }>;
  birthdays: Array<{
    id: string;
    name: string;
    date: string;
    groupId?: string;
  }>;
  integrationEnabled?: boolean;
  tasks: Array<{
    id: string;
    title: string;
    dueAt?: string;
    personId?: string;
    personName?: string;
    status?: string;
    revision?: number;
  }>;
  absences: Array<{
    id: string;
    personId: string;
    name: string;
    date: string;
    groupId: string | null;
    note: string;
  }>;
  churches: Array<{
    id: string;
    name: string;
    date: string | null;
    members: number | null;
    groups: number | null;
  }>;
}
export function isChurchStaff(roles: readonly string[]) {
  return roles.some((r) =>
    ["super_admin", "church_admin", "pastor", "secretary"].includes(r),
  );
}
export function homeProfiles(
  roles: readonly string[],
  tier = "solo",
  networkPlan = false,
): HomeProfile[] {
  if (!roles.length) return [];
  const profiles: HomeProfile[] = [];
  if (
    ["network", "denomination"].includes(tier) &&
    networkPlan &&
    roles.some((r) => ["super_admin", "church_admin"].includes(r))
  )
    profiles.push("network");
  if (roles.includes("pastor")) profiles.push("pastoral");
  if (
    roles.some((r) => ["super_admin", "church_admin", "secretary"].includes(r))
  )
    profiles.push("administration");
  if (roles.includes("group_leader")) profiles.push("cell_leader");
  profiles.push("member");
  return profiles;
}
export function homeRouteAllowed(
  roles: readonly string[],
  href: string,
  tier = "solo",
  networkPlan = false,
) {
  const path = href.split(/[?#]/)[0];
  if (!roles.length) return false;
  if (path.startsWith("/network"))
    return homeProfiles(roles, tier, networkPlan).includes("network");
  if (path === "/journeys" || path.startsWith("/journeys/"))
    return isChurchStaff(roles) || roles.includes("group_leader");
  if (
    [
      "/members",
      "/reception",
      "/finance",
      "/communication",
      "/reports",
      "/notifications",
      "/settings",
      "/saas",
      "/operations",
      "/tribes",
      "/media",
      "/learning/manage",
      "/kids/scan",
    ].some((p) => path === p || path.startsWith(p + "/"))
  )
    return isChurchStaff(roles);
  if (
    path === "/groups" ||
    path.startsWith("/groups/") ||
    path === "/weekly-theme"
  )
    return isChurchStaff(roles);
  if (path.startsWith("/pastoral-ai") || path.startsWith("/care-radar"))
    return isChurchStaff(roles);
  return true;
}
export function birthdayInPeriod(
  birthDate: string | undefined,
  today: string,
  period: "today" | "week" | "month",
) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  const parsed = new Date(birthDate + "T12:00:00Z");
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== birthDate
  )
    return false;
  const md = birthDate.slice(5);
  if (period === "month") return md.slice(0, 2) === today.slice(5, 7);
  for (let i = 0; i < (period === "week" ? 7 : 1); i++) {
    const date = new Date(today + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + i);
    if (date.toISOString().slice(5, 10) === md) return true;
  }
  return false;
}

export interface HomeEvolution {
  weeks: Array<{
    start: string;
    meetings: number;
    recorded: number;
    present: number;
    absent: number;
    justified: number;
  }>;
  groups: Array<{
    id: string;
    name: string;
    meetings: number;
    missing: number;
    present: number;
  }>;
  partial: boolean;
  timezone: string;
  from: string;
  to: string;
}

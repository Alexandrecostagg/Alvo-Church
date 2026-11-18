/** Legacy groups without a type were cells; explicit classes are not cells. */
export const isCellGroup = (g: { type?: string | null }) =>
  !g.type || g.type === "cell" || g.type === "small_group";
export const isActiveGroupMembership = (
  m: { status?: string | null; leftAt?: unknown } | null | undefined,
) => !!m && (!m.status || m.status === "active") && !m.leftAt;
export const isGroupLeader = (m: { roleInGroup?: string } | null | undefined) =>
  !!m && ["leader", "co_leader", "supervisor"].includes(m.roleInGroup || "");
export function groupWeek(now: number, timezone: string) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function attendanceSummary(
  records: Array<{ personId: string; attendanceStatus: string }>,
  expectedIds: string[],
) {
  const unique = [...new Map(records.map((r) => [r.personId, r])).values()];
  return {
    present: unique.filter((r) =>
      ["present", "first_time_guest"].includes(r.attendanceStatus),
    ).length,
    absent: unique.filter((r) => r.attendanceStatus === "absent").length,
    justified: unique.filter((r) => r.attendanceStatus === "justified").length,
    recorded: unique.length,
    expected: new Set(expectedIds).size,
    pending: [...new Set(expectedIds)].filter(
      (id) => !unique.some((r) => r.personId === id),
    ).length,
  };
}

/** Same three-hour self-check-in window for the member app and leadership. */
export function currentGroupMeeting<
  T extends { scheduledStartAt: string; meetingStatus: string },
>(meetings: T[], now = Date.now()): T | undefined {
  return meetings
    .filter(
      (m) =>
        m.meetingStatus === "scheduled" &&
        Math.abs(Date.parse(m.scheduledStartAt) - now) <= 3 * 3600000,
    )
    .sort(
      (a, b) =>
        Math.abs(Date.parse(a.scheduledStartAt) - now) -
          Math.abs(Date.parse(b.scheduledStartAt) - now) ||
        b.scheduledStartAt.localeCompare(a.scheduledStartAt),
    )[0];
}

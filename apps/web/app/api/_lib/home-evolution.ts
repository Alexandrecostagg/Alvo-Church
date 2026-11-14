import type { AccountTransaction } from "./member-account-store";
import type { HomeEvolution } from "@alvo/domain";
/** Eight calendar weeks in the institution timezone; missing calls are not absences. */
export async function homeEvolution(
  tx: AccountTransaction,
  root: string,
  org: string,
  groups: Array<{ id: string; name: string }>,
  timezone: string,
  now: number,
): Promise<HomeEvolution> {
  const day = (n: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(n);
  const today = day(now),
    monday = new Date(today + "T12:00:00Z");
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) - 49);
  const start = monday.toISOString().slice(0, 10);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return {
      start: d.toISOString().slice(0, 10),
      meetings: 0,
      recorded: 0,
      present: 0,
      absent: 0,
      justified: 0,
    };
  });
  const result: HomeEvolution = {
    weeks,
    groups: [],
    partial: false,
    timezone,
    from: start,
    to: today,
  };
  let inspected = 0;
  for (const g of groups.slice(0, 30)) {
    if (inspected >= 120) {
      result.partial = true;
      break;
    }
    const all = await tx.query(
      `${root}/groups/${g.id}`,
      "meetings",
      "scheduledStartAt",
      start,
      "GREATER_THAN_OR_EQUAL",
      101,
    );
    if (all.length > 100) result.partial = true;
    const rows = all
      .slice(0, 100)
      .filter(
        (m) =>
          m.organizationId === org &&
          m.groupId === g.id &&
          m.meetingStatus !== "cancelled" &&
          Date.parse(m.scheduledStartAt) <= now &&
          day(Date.parse(m.scheduledStartAt)) >= start,
      );
    let missing = 0,
      present = 0;
    let measured = 0;
    for (const m of rows) {
      if (inspected >= 120) {
        result.partial = true;
        break;
      }
      inspected++;
      measured++;
      const local = day(Date.parse(m.scheduledStartAt));
      const w = [...weeks].reverse().find((w) => w.start <= local)!;
      const records = await tx.query(
        `${root}/groups/${g.id}/meetings/${m.id}`,
        "attendance",
        undefined,
        undefined,
        "EQUAL",
        501,
      );
      if (records.length > 500) result.partial = true;
      const valid = records
        .slice(0, 500)
        .filter(
          (a) =>
            a.organizationId === org &&
            a.groupId === g.id &&
            a.groupMeetingId === m.id &&
            ["present", "first_time_guest", "absent", "justified"].includes(
              a.attendanceStatus,
            ),
        );
      w.meetings++;
      if (valid.length) w.recorded++;
      else missing++;
      for (const a of valid) {
        if (["present", "first_time_guest"].includes(a.attendanceStatus)) {
          w.present++;
          present++;
        } else if (a.attendanceStatus === "absent") w.absent++;
        else w.justified++;
      }
    }
    result.groups.push({
      id: g.id,
      name: g.name,
      meetings: measured,
      missing,
      present,
    });
  }
  if (groups.length > 30) result.partial = true;
  return result;
}

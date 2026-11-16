import { describe, it, expect } from "vitest";
import {
  isCellGroup,
  isActiveGroupMembership,
  groupWeek,
  attendanceSummary,
  currentGroupMeeting,
} from "./groups";
describe("shared cell semantics", () => {
  it("chooses the same nearby scheduled meeting independently of query order", () => {
    const now = Date.parse("2026-11-16T12:00Z");
    const rows = [
      {
        id: "old",
        scheduledStartAt: "2026-11-16T08:00Z",
        meetingStatus: "scheduled",
      },
      {
        id: "near",
        scheduledStartAt: "2026-11-16T12:30Z",
        meetingStatus: "scheduled",
      },
      {
        id: "closed",
        scheduledStartAt: "2026-11-16T12:00Z",
        meetingStatus: "completed",
      },
      {
        id: "far",
        scheduledStartAt: "2026-11-16T14:30Z",
        meetingStatus: "scheduled",
      },
    ];
    expect(currentGroupMeeting(rows, now)?.id).toBe("near");
    expect(currentGroupMeeting([...rows].reverse(), now)?.id).toBe("near");
    expect(currentGroupMeeting(rows, now + 24 * 3600000)).toBeUndefined();
  });

  it("separates classes and inactive memberships, retaining legacy links", () => {
    expect(
      [{}, { type: "cell" }, { type: "small_group" }].every(isCellGroup),
    ).toBe(true);
    expect(isCellGroup({ type: "class" })).toBe(false);
    expect(isActiveGroupMembership({})).toBe(true);
    for (const m of [
      { status: "inactive" },
      { status: "archived" },
      { status: "pending" },
      { leftAt: "2026-11-16" },
    ])
      expect(isActiveGroupMembership(m)).toBe(false);
  });
  it("uses church week at UTC boundary", () => {
    expect(groupWeek(Date.parse("2026-11-16T01:00:00Z"), "America/Belem")).toBe(
      "2026-11-09",
    );
    expect(groupWeek(Date.parse("2026-11-16T04:00:00Z"), "America/Belem")).toBe(
      "2026-11-16",
    );
  });
  it("counts visitors as present, preserves historic records, never invents absences", () => {
    expect(
      attendanceSummary(
        [
          { personId: "a", attendanceStatus: "present" },
          { personId: "a", attendanceStatus: "absent" },
          { personId: "b", attendanceStatus: "justified" },
          { personId: "old", attendanceStatus: "first_time_guest" },
        ],
        ["a", "b", "c", "c"],
      ),
    ).toEqual({
      present: 1,
      absent: 1,
      justified: 1,
      recorded: 3,
      expected: 3,
      pending: 1,
    });
  });
});

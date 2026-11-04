import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAggregationBody,
  collectOrganizationSnapshotMetrics,
  encodeSnapshotFields,
  mapWithConcurrency,
  networkMonthWindow,
} from "./network-snapshot";

afterEach(() => vi.unstubAllGlobals());

describe("network snapshot aggregation", () => {
  it("builds UTC month boundaries across the year change", () => {
    expect(networkMonthWindow(new Date("2026-01-18T15:00:00-03:00"))).toEqual({
      month: "2026-01",
      currentStart: "2026-01-01T00:00:00.000Z",
      previousStart: "2025-12-01T00:00:00.000Z",
      nextStart: "2026-02-01T00:00:00.000Z",
    });
  });

  it("builds descendant sum queries without document projections", () => {
    const body = buildAggregationBody({
      collectionId: "attendance",
      allDescendants: true,
      aggregation: { kind: "sum", alias: "s", field: "amount" },
    });
    expect(body).toEqual({
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId: "attendance", allDescendants: true }] },
        aggregations: [{ sum: { field: { fieldPath: "amount" } }, alias: "s" }],
      },
    });
  });

  it("preserves cent values as Firestore doubles in the persisted snapshot", () => {
    expect(encodeSnapshotFields({ givingThisMonth: 1250.5, members: 90, month: "2026-09" })).toEqual({
      givingThisMonth: { doubleValue: 1250.5 },
      members: { integerValue: "90" },
      month: { stringValue: "2026-09" },
    });
  });

  it("collects real finance, event, and group metrics using aggregate-only requests", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as any;
      const aggregate = body.structuredAggregationQuery;
      const collectionId = aggregate.structuredQuery.from[0].collectionId as string;
      const where = JSON.stringify(aggregate.structuredQuery.where ?? {});
      const alias = aggregate.aggregations[0].alias as "c" | "s";
      let value = 0;
      if (collectionId === "people") {
        value = !where.includes("fieldFilter") ? 100
          : where.includes("visitor") ? 10
            : where.includes("volunteer") ? 70
              : 5;
      } else if (collectionId === "groups") {
        value = where.includes("active") ? 6 : 8;
      } else if (collectionId === "financialTransactions") {
        const current = where.includes("2026-09-01") && where.includes("2026-10-01");
        value = where.includes("voided") ? (current ? 49.5 : 0) : (current ? 1300 : 900);
      } else if (collectionId === "events") value = 3;
      else if (collectionId === "meetings") value = 4;
      else if (collectionId === "attendance") value = 37;
      else if (collectionId === "registrations") value = 22;
      return new Response(JSON.stringify([{
        result: { aggregateFields: { [alias]: alias === "s" ? { doubleValue: value } : { integerValue: String(value) } } },
      }]), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const metrics = await collectOrganizationSnapshotMetrics({
      projectId: "project",
      token: "token",
      organizationId: "org_child",
      now: new Date("2026-09-08T17:00:00.000Z"),
    });

    expect(metrics).toEqual({
      month: "2026-09",
      totalMembers: 90,
      newMembersThisMonth: 5,
      activeMembers: 70,
      visitors: 10,
      totalGroups: 8,
      activeGroups: 6,
      avgGroupAttendance: 9,
      eventsThisMonth: 3,
      totalEventAttendance: 22,
      givingThisMonth: 1250.5,
      givingLastMonth: 900,
      serviceAttendanceRate: 78,
    });
    expect(fetchMock).toHaveBeenCalledTimes(14);
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).toContain(":runAggregationQuery");
      const body = JSON.parse(String(call[1]?.body)) as any;
      if (body.structuredAggregationQuery.structuredQuery.from[0].allDescendants) {
        expect(JSON.stringify(body.structuredAggregationQuery.structuredQuery.where)).toContain("org_child");
      }
    }
  });

  it("keeps result order while respecting the concurrency ceiling", async () => {
    let running = 0;
    let peak = 0;
    const result = await mapWithConcurrency([4, 3, 2, 1], 2, async (value) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, value));
      running -= 1;
      return value * 2;
    });
    expect(result).toEqual([8, 6, 4, 2]);
    expect(peak).toBe(2);
  });
});

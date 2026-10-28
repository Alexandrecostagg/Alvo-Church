import { it, expect } from "vitest";
import {
  mobileServingSlots,
  pendingServingCount,
  servingNotificationMatches,
} from "./serving-notifications";
it("opens only a serving notification for the current organization", () => {
  expect(
    servingNotificationMatches(
      {
        type: "serving_assignment",
        organizationId: "own",
        assignmentId: "test",
      },
      "own",
    ),
  ).toBe(true);
  expect(
    servingNotificationMatches(
      {
        type: "serving_assignment",
        organizationId: "other",
        assignmentId: "test",
      },
      "own",
    ),
  ).toBe(false);
  expect(
    servingNotificationMatches(
      { type: "arbitrary", organizationId: "own", assignmentId: "test" },
      "own",
    ),
  ).toBe(false);
});
it("shows real area, event and church-local time, hiding cancelled and obsolete assignments", () => {
  const rows = [
    {
      id: "own",
      role: "Apoio",
      areaName: "Acolhimento",
      serviceName: "Encontro",
      serviceDate: "2030-11-09T22:45:00Z",
      status: "pending",
      timezone: "America/Belem",
    },
    {
      id: "cancelled",
      role: "Apoio",
      serviceDate: "2030-11-09T22:45:00Z",
      status: "cancelled",
    },
    { id: "old", role: "Apoio", serviceDate: "2020-01-01", status: "pending" },
  ];
  expect(pendingServingCount(rows, Date.parse("2030-11-08"))).toBe(1);
  expect(mobileServingSlots(rows, Date.parse("2030-11-08"))).toMatchObject([
    {
      id: "own",
      service: "Acolhimento · Encontro",
      time: "19:45",
      status: "pendente",
    },
  ]);
});

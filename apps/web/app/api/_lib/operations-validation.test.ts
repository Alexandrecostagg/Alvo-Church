import { describe, it, expect } from "vitest";
import { sessionInput } from "./kids-sessions";
import { validateVisitor } from "./visitor-intake";
import { validateRegistration } from "./member-registration";
const session = () => ({
  organizationId: "qa",
  sessionId: "session",
  serviceTeamId: "room",
  eventId: "service",
  capacity: 20,
  expectedVersion: 0,
  operatorIds: ["user"],
  startsAt: "2026-09-05T08:00:00.000Z",
  endsAt: "2026-09-05T11:00:00.000Z",
});
const visitor = () => ({
  orgSlug: "qa-church",
  name: "Ana QA",
  phone: "(91) 99999-9999",
  firstVisit: true,
  consent: false,
});
describe("Kids session boundaries", () => {
  it.each([0, -1, 101, 2.5, "20", null])("rejects capacity %s", (capacity) =>
    expect(() => sessionInput({ ...session(), capacity })).toThrow(),
  );
  it.each(
    [[], Array(21).fill("user"), ["../../users/other"], "user"].map(
      (operatorIds) => ({ operatorIds }),
    ),
  )("rejects invalid operator list", ({ operatorIds }) =>
    expect(() => sessionInput({ ...session(), operatorIds })).toThrow(),
  );
  it.each(["invalid", "2026-09-05T07:00:00Z", "2026-09-07T11:00:00Z"])(
    "rejects session window %s",
    (endsAt) => expect(() => sessionInput({ ...session(), endsAt })).toThrow(),
  );
  it("normalizes duplicate assignments", () =>
    expect(
      sessionInput({ ...session(), operatorIds: ["user", "user"] }).operatorIds,
    ).toEqual(["user"]));
});
describe("public intake validation", () => {
  it("preserves declined marketing and normalizes phone", () =>
    expect(validateVisitor(visitor())).toMatchObject({
      consentMarketing: false,
      phone: "91999999999",
    }));
  it.each([
    { name: {} },
    { phone: [] },
    { orgSlug: "../qa" },
    { consent: "false" },
    { firstVisit: "yes" },
    { phone: "123" },
    { name: "A" },
    { email: "bad" },
    { birthDate: "2001-02-29" },
    { name: "a".repeat(121) },
  ])("rejects malformed inputs %j", (input) =>
    expect(() => validateVisitor({ ...visitor(), ...input })).toThrow(),
  );
});
describe("central legacy workflows", () => {
  const input = {
    organizationId: "qa",
    requestId: "3b8f0f62-df84-4a28-9ec9-3c50d66e79b2",
    person: { firstName: "Ana" },
  };
  it("accepts single-name visitor and enforces status", () =>
    expect(
      validateRegistration({
        ...input,
        workflow: "reception",
        reception: { source: "Recepção" },
      }).person,
    ).toMatchObject({
      firstName: "Ana",
      lastName: "",
      memberStatus: "visitor",
    }));
  it("rejects malformed intake reference", () =>
    expect(() =>
      validateRegistration({
        ...input,
        workflow: "reception",
        reception: { source: "Recepção", intakeId: "../foreign" },
      }),
    ).toThrow());
  it("rejects incomplete serving registration", () =>
    expect(() =>
      validateRegistration({
        ...input,
        workflow: "serving",
        serving: { role: "Apoio" },
      }),
    ).toThrow());
});

import { describe, expect, it } from "vitest";
import { publicEventProjection } from "./event-management";

describe("public event projection", () => {
  it("returns only public operational fields", () => {
    const event = publicEventProjection({ id: "event", organizationId: "secret", status: "published", name: "Culto", startsAt: "2026-09-10T22:00:00.000Z", isPaid: false, internalNote: "private" });
    expect(event).toMatchObject({ id: "event", name: "Culto", isPaid: false });
    expect(event).not.toHaveProperty("organizationId");
    expect(event).not.toHaveProperty("internalNote");
  });

  it("hides drafts and invalid dates", () => {
    expect(publicEventProjection({ status: "draft", startsAt: "2026-09-10T22:00:00.000Z" })).toBeNull();
    expect(publicEventProjection({ status: "published", startsAt: "invalid" })).toBeNull();
  });
});

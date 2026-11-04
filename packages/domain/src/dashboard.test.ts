import { describe, it, expect } from "vitest";
import { createDashboardSnapshot } from "./index";
import type { Organization, AuthUser } from "@alvo/types";

describe("createDashboardSnapshot", () => {
  it("creates a snapshot with zero totals", () => {
    const mockOrg: Organization = {
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      status: "active",
      timezone: "America/Belem",
      locale: "pt-BR",
      countryCode: "BR",
    };

    const mockUser: AuthUser = {
      id: "user-1",
      organizationId: "org-1",
      campusIds: [],
      email: "test@example.com",
      roles: ["church_admin"],
      isActive: true,
    };

    const result = createDashboardSnapshot({
      organization: mockOrg,
      currentUser: mockUser,
    });

    expect(result).toEqual({
      organization: mockOrg,
      currentUser: mockUser,
      totals: {
        people: 0,
        families: 0,
        visitors: 0,
        groups: 0,
      },
    });
  });
});

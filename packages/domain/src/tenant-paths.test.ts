import { describe, it, expect } from "vitest";
import { getTenantPaths } from "./index";
import type { TenantContext } from "@alvo/types";

describe("getTenantPaths", () => {
  it("should generate correct Firestore paths based on organizationId", () => {
    const context: TenantContext = { organizationId: "test-org-123" };
    const paths = getTenantPaths(context);

    expect(paths).toEqual({
      organizations: "organizations",
      campuses: "organizations/test-org-123/campuses",
      users: "organizations/test-org-123/users",
      people: "organizations/test-org-123/people",
      families: "organizations/test-org-123/families",
      partners: "organizations/test-org-123/partners",
      partnerBenefits: "organizations/test-org-123/partnerBenefits",
      memberBenefitValidations:
        "organizations/test-org-123/memberBenefitValidations",
      visitorIntakes: "organizations/test-org-123/visitorIntakes",
      groups: "organizations/test-org-123/groups",
      serviceAssignments: "organizations/test-org-123/serviceAssignments",
      serviceTeams: "organizations/test-org-123/serviceTeams",
      events: "organizations/test-org-123/events",
      tribes: "organizations/test-org-123/tribes",
      financeReports: "organizations/test-org-123/financeReports",
      settings: "organizations/test-org-123/settings",
      branding: "organizations/test-org-123/settings/branding",
      subscription: "organizations/test-org-123/settings/subscription",
      features: "organizations/test-org-123/settings/features",
    });
  });

  it("should ignore other properties in TenantContext for path generation", () => {
    const context: TenantContext = {
      organizationId: "org-abc",
      campusId: "campus-1",
      userId: "user-1",
    };

    const paths = getTenantPaths(context);

    expect(paths.campuses).toBe("organizations/org-abc/campuses");
    expect(paths.users).toBe("organizations/org-abc/users");
    expect(paths.settings).toBe("organizations/org-abc/settings");
  });
});

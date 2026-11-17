import { describe, it, expect } from "vitest";
import {
  validateOwnProfile,
  normalizeOwnProfile,
  ACCOUNT_ROLE_LABELS,
} from "./own-profile";
const fields = {
  occupation: " Professora ",
  educationLevel: "technical",
  householdIncomeRange: "five_to_10_minimum_wages",
  ministerialInterests: ["ensino", "ensino"],
  servingProfile: "teaching",
  availability: ["seg"],
};
describe("own profile", () => {
  it("preserves all supported school and income options", () =>
    expect(validateOwnProfile(fields)).toEqual({
      ...fields,
      occupation: "Professora",
      ministerialInterests: ["ensino"],
    }));
  it.each([
    "roles",
    "personId",
    "status",
    "tribePrimaryCode",
    "partnerBenefitsEnabled",
  ])("rejects protected %s", (key) =>
    expect(() => validateOwnProfile({ ...fields, [key]: "forged" })).toThrow(),
  );
  it.each([
    { availability: ["invalid"] },
    { ministerialInterests: ["invalid"] },
    { educationLevel: "toString" },
    { occupation: "a".repeat(121) },
  ])("rejects invalid profile %j", (invalid) =>
    expect(() => validateOwnProfile({ ...fields, ...invalid })).toThrow(),
  );
  it("allows explicitly clearing optional answers", () =>
    expect(
      validateOwnProfile({
        ...fields,
        occupation: "",
        servingProfile: "",
        availability: [],
        ministerialInterests: [],
      }),
    ).toMatchObject({
      occupation: "",
      servingProfile: "",
      availability: [],
      ministerialInterests: [],
    }));
  it("labels secretary and ministry leader truthfully", () => {
    expect(ACCOUNT_ROLE_LABELS.secretary).toBe("Secretaria");
    expect(ACCOUNT_ROLE_LABELS.ministry_leader).toBe("Líder de ministério");
  });
});

it("normalizes malformed legacy answers without crashing the form", () => {
  expect(
    normalizeOwnProfile({
      availability: {},
      ministerialInterests: ["ensino", null, "unknown"],
      occupation: 4,
      educationLevel: "unknown",
    }),
  ).toMatchObject({
    availability: [],
    ministerialInterests: ["ensino"],
    occupation: "",
    educationLevel: "not_informed",
  });
});

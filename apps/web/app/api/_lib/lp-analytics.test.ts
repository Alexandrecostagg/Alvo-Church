import { describe, expect, it } from "vitest";
import { validateLpEvent } from "./lp-analytics";

const valid = {
  event: "primary_cta_click",
  placement: "pricing-pastoral",
  target: "signup",
  sessionId: "2f98e850-bc8e-4c6e-a1fd-6b33eaf16e22",
};

describe("LP analytics validation", () => {
  it("accepts the allow-listed conversion payload without personal data", () => {
    expect(validateLpEvent(valid)).toEqual(valid);
  });

  it.each([
    { ...valid, event: "email_collected" },
    { ...valid, placement: "../../private" },
    { ...valid, target: "person@example.test" },
    { ...valid, sessionId: "visitor-1" },
  ])("rejects unsupported or identifying-shaped fields", (payload) => {
    expect(() => validateLpEvent(payload)).toThrow();
  });
});

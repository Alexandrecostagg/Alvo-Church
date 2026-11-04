import { describe, it, expect } from "vitest";
import { toSlug } from "./index";

describe("toSlug", () => {
  it("converts a normal string to a slug", () => {
    expect(toSlug("Hello World")).toBe("hello-world");
  });

  it("trims spaces at the ends", () => {
    expect(toSlug("  Hello World  ")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(toSlug("Hello @World!")).toBe("hello-world");
  });

  it("handles multiple spaces", () => {
    expect(toSlug("Hello   World")).toBe("hello-world");
  });

  it("handles empty string", () => {
    expect(toSlug("")).toBe("");
  });

  it("handles string with only special characters", () => {
    expect(toSlug("@#$!%")).toBe("");
  });

  it("handles string with numbers", () => {
    expect(toSlug("Hello World 123")).toBe("hello-world-123");
  });

  it("handles string with mixed case and numbers", () => {
    expect(toSlug("Some Title 2024!")).toBe("some-title-2024");
  });
});

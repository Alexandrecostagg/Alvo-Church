import { describe, expect, it } from "vitest";
import { publicPortalSlug } from "./public-portal";

describe("public portal slug", () => {
  it("normalizes a valid slug", () => expect(publicPortalSlug(" Igreja-QA ")).toBe("igreja-qa"));
  it.each(["a", "-igreja", "igreja_qa", "../igreja", ""])("rejects %s", (slug) => expect(() => publicPortalSlug(slug)).toThrow());
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSecureCode } from "./secure-code";

afterEach(() => vi.unstubAllGlobals());

describe("generateSecureCode", () => {
  it("produces readable codes at the requested length", () => {
    expect(generateSecureCode(4)).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    expect(generateSecureCode(6)).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("uses bytes from Web Crypto to generate the code", () => {
    const getRandomValues = vi
      .fn()
      .mockImplementation((bytes: Uint8Array) => bytes.fill(255));
    vi.stubGlobal("crypto", { getRandomValues });
    expect(generateSecureCode(4)).toBe("9999");
    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });

  it.each([0, -1, 1.5, 65, NaN])("rejects invalid length %s", (length) => {
    expect(() => generateSecureCode(length)).toThrow(RangeError);
  });
});

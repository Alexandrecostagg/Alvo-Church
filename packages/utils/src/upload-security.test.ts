import { describe, it, expect } from "vitest";
import { boundedBody, rasterImageType } from "./upload-security";
describe("uploads", () => {
  it("rejects HTML disguised as PNG and active SVG", () => {
    for (const type of ["image/png", "image/svg+xml"]) expect(() => rasterImageType(new TextEncoder().encode('<svg onload="alert(1)"/>'), type)).toThrow();
  });
  it("accepts PNG and rejects an appended active payload", () => {
    const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII="), (character) => character.charCodeAt(0));
    expect(rasterImageType(png, "image/png")).toBe("image/png");
    expect(() => rasterImageType(new Uint8Array([...png, ...new TextEncoder().encode('<script>')]), "image/png")).toThrow();
    expect(() => rasterImageType(png, "image/jpeg")).toThrow();
  });
  it("bounds actual streamed bytes even with no content length", async () => {
    const request = new Request("https://example.test", { method: "POST", body: "123456" });
    await expect(boundedBody(request, 5)).rejects.toMatchObject({ status: 413 });
    expect(await boundedBody(new Request("https://example.test", { method: "POST", body: "123" }), 5)).toHaveLength(3);
  });
});

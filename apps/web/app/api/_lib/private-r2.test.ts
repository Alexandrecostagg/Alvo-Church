import { describe, it, expect, vi } from "vitest";
import { privateImages, PRIVATE_IMAGE_LIMIT, type PrivateBucket } from "./private-r2";
const key = "kids-private/org/checkin/image";
function bucket() {
  return { put: vi.fn(async () => undefined), get: vi.fn(async () => ({ size: 3, httpMetadata: { contentType: "image/png" }, arrayBuffer: async () => new Uint8Array([1,2,3]).buffer })), delete: vi.fn(async () => undefined) };
}
describe("private R2 images", () => {
  it("stores private metadata and reads bytes without a download URL", async () => {
    const b = bucket(), images = privateImages(b);
    const bytes = new Uint8Array([1,2,3]);
    await images.put(key, bytes, "image/png");
    expect(b.put).toHaveBeenCalledWith(key, bytes, { httpMetadata: { contentType: "image/png", cacheControl: "private, no-store" } });
    expect(await images.get(key)).toEqual({ bytes, contentType: "image/png" });
    await images.remove(key); expect(b.delete).toHaveBeenCalledWith(key);
  });
  it("refuses public prefixes and traversal before any bucket operation", async () => {
    const b = bucket(), images = privateImages(b);
    for (const bad of ["events/org/file", "kids-private/org/../file", "kids-private/org/checkin/image/extra", "https://example.test/image"]) {
      await expect(images.put(bad, new Uint8Array([1]), "image/png")).rejects.toThrow();
      await expect(images.get(bad)).rejects.toThrow();
      await expect(images.remove(bad)).rejects.toThrow();
    }
    expect(b.put).not.toHaveBeenCalled(); expect(b.get).not.toHaveBeenCalled(); expect(b.delete).not.toHaveBeenCalled();
  });
  it("limits uploads and refuses active content", async () => {
    const b = bucket(), images = privateImages(b);
    await expect(images.put(key, new Uint8Array(PRIVATE_IMAGE_LIMIT + 1), "image/png")).rejects.toThrow();
    await expect(images.put(key, new Uint8Array(), "image/png")).rejects.toThrow();
    await expect(images.put(key, new Uint8Array([1]), "image/svg+xml")).rejects.toThrow();
    expect(b.put).not.toHaveBeenCalled();
    await images.put("finance-private/org/contribution/receipt", new Uint8Array([1]), "image/jpeg");
    expect(b.put).toHaveBeenCalledTimes(1);
  });
  it("refuses oversized objects before reading the body and handles missing objects", async () => {
    const read = vi.fn(async () => new ArrayBuffer(1));
    const b: PrivateBucket = { ...bucket(), get: vi.fn(async () => ({ size: PRIVATE_IMAGE_LIMIT + 1, arrayBuffer: read })) };
    await expect(privateImages(b).get(key)).rejects.toThrow(); expect(read).not.toHaveBeenCalled();
    b.get = vi.fn(async () => null); await expect(privateImages(b).get(key)).rejects.toThrow();
  });
});

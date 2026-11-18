import { describe, expect, it } from "vitest";
import { courseVideoEmbedUrl } from "./course-video";
describe("course video embeds", () => {
  it.each(["https://youtu.be/abcdefghijk", "https://www.youtube.com/watch?v=abcdefghijk&t=10", "https://youtube.com/shorts/abcdefghijk", "https://www.youtube-nocookie.com/embed/abcdefghijk"])("normalizes %s", raw => {
    expect(courseVideoEmbedUrl(raw)).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk");
  });
  it("preserves Vimeo's private link hash", () => expect(courseVideoEmbedUrl("https://player.vimeo.com/video/123?h=secret")).toBe("https://player.vimeo.com/video/123?h=secret"));
  it("preserves Vimeo private share links", () => expect(courseVideoEmbedUrl("https://vimeo.com/123/abc123")).toBe("https://player.vimeo.com/video/123?h=abc123"));
  it("normalizes Cloudflare embeds", () => expect(courseVideoEmbedUrl("https://customer.cloudflarestream.com/abc/watch")).toBe("https://customer.cloudflarestream.com/abc/iframe"));
  it.each(["javascript:alert(1)", "https://youtube.com.evil.test/watch?v=abcdefghijk", "http://youtube.com/watch?v=abcdefghijk", "https://youtube.com/watch?v=bad", "", "https://example.com/video.mp4"])("rejects %s", raw => expect(courseVideoEmbedUrl(raw)).toBeNull());
});

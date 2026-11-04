import { describe, expect, it } from "vitest";
import { isSupportedCourseVideoUrl } from "./course-management";

describe("course management boundaries", () => {
  it.each([
    "https://youtube.com/watch?v=abc",
    "https://youtu.be/abc",
    "https://player.vimeo.com/video/123",
    "https://customer.cloudflarestream.com/video",
    "https://videodelivery.net/abc",
  ])("accepts supported video %s", (url) => expect(isSupportedCourseVideoUrl(url)).toBe(true));

  it.each([
    "http://youtube.com/watch?v=abc",
    "https://youtube.com.evil.test/watch?v=abc",
    "javascript:alert(1)",
    "https://example.test/video",
    "",
  ])("rejects unsupported video %s", (url) => expect(isSupportedCourseVideoUrl(url)).toBe(false));
});

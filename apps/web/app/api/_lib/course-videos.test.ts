import { describe, expect, it } from "vitest";
import { videoRange, validateMp4 } from "./course-videos";
describe("private course video ranges", () => {
  it("serves full videos and byte ranges for seeking", () => {
    expect(videoRange(null, 100)).toEqual({ offset: 0, length: 100, partial: false });
    expect(videoRange("bytes=10-19", 100)).toEqual({ offset: 10, length: 10, partial: true });
    expect(videoRange("bytes=90-", 100)).toEqual({ offset: 90, length: 10, partial: true });
    expect(videoRange("bytes=-10", 100)).toEqual({ offset: 90, length: 10, partial: true });
    expect(videoRange("bytes=0-999", 100)).toEqual({ offset: 0, length: 100, partial: true });
  });
  it.each(["bytes=100-", "bytes=-0", "bytes=20-10", "bytes=0-1,4-5", "bytes=-", "items=0-1", "bytes=9007199254740999-"])("rejects %s", range => expect(() => videoRange(range, 100)).toThrow());
  it("rejects a renamed HTML file", () => expect(() => validateMp4(new TextEncoder().encode("<!doctype html><html>not a video</html>"))).toThrow());
});

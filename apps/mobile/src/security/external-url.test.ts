import { expect, it } from "vitest";
import { trustedExternalUrl } from "./external-url";
it.each(["javascript:alert(1)", "intent://open", "file:///secret", "http://example.com", "https://u:p@example.com", "invalid"])("rejects unsafe links %s", value => expect(trustedExternalUrl(value)).toBeNull());
it("permits HTTPS lessons", () => expect(trustedExternalUrl("https://youtu.be/example")).toBe("https://youtu.be/example"));

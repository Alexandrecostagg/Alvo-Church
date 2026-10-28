import { afterEach, describe, expect, it, vi } from "vitest";
import { startAuthSession } from "./auth-bootstrap";
import { readBrowserStorage, writeBrowserStorage } from "./browser-storage";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("browser storage restrictions", () => {
  it("continues when access to localStorage itself is denied", () => {
    vi.stubGlobal("window", Object.defineProperty({}, "localStorage", {
      get() { throw new DOMException("Storage blocked", "SecurityError"); },
    }));
    expect(readBrowserStorage("org")).toBeNull();
    expect(() => writeBrowserStorage("org", "synthetic-org")).not.toThrow();
    expect(() => writeBrowserStorage("org", null)).not.toThrow();
  });

  it("continues when storage runs out of quota", () => {
    vi.stubGlobal("window", { localStorage: {
      getItem: () => "synthetic-org",
      setItem: () => { throw new DOMException("Full", "QuotaExceededError"); },
      removeItem: () => { throw new Error("Denied"); },
    } });
    expect(readBrowserStorage("org")).toBe("synthetic-org");
    expect(() => writeBrowserStorage("org", "other-org")).not.toThrow();
    expect(() => writeBrowserStorage("org", null)).not.toThrow();
  });
});

describe("auth startup recovery", () => {
  const config = { apiKey: "fake", authDomain: "fake.invalid", projectId: "demo-test", storageBucket: "fake" };

  it("reports SDK download and synchronous initialization failures", async () => {
    for (const loadSdk of [
      async () => { throw new Error("Chunk download failed"); },
      async () => ({ subscribeToFirebaseAuthState: () => { throw new Error("Auth unavailable"); } }),
    ]) {
      const onUnavailable = vi.fn();
      const stop = startAuthSession({ config, loadSdk, onUser: vi.fn(), onUnavailable });
      await vi.waitFor(() => expect(onUnavailable).toHaveBeenCalledOnce());
      stop();
    }
  });

  it("offers recovery after a stalled auth callback and accepts a late successful session", async () => {
    vi.useFakeTimers();
    let notify!: (user: null) => void;
    const unsubscribe = vi.fn(), onUser = vi.fn(), onUnavailable = vi.fn();
    const stop = startAuthSession({ config, onUser, onUnavailable,
      loadSdk: async () => ({ subscribeToFirebaseAuthState: (_config, callback) => { notify = callback; return unsubscribe; } }),
    });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(onUnavailable).toHaveBeenCalledOnce();
    notify(null);
    expect(onUser).toHaveBeenCalledWith(null);
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
    notify(null);
    expect(onUser).toHaveBeenCalledOnce();
  });

  it("ignores SDK imports completing after navigation or retry", async () => {
    vi.useFakeTimers();
    const subscribe = vi.fn(), onUser = vi.fn(), onUnavailable = vi.fn();
    let complete!: (sdk: { subscribeToFirebaseAuthState: typeof subscribe }) => void;
    const stop = startAuthSession({ config, onUser, onUnavailable, loadSdk: () => new Promise(resolve => { complete = resolve; }) });
    stop();
    complete({ subscribeToFirebaseAuthState: subscribe });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(subscribe).not.toHaveBeenCalled();
    expect(onUnavailable).not.toHaveBeenCalled();
  });
});

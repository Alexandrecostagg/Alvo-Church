import { afterEach, describe, expect, it, vi } from "vitest";
import { createAccessMonitor } from "./access-monitor";

afterEach(() => { vi.useRealTimers(); });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

describe("mobile access lifecycle", () => {
  it("rechecks on resume and removes revoked access while open", async () => {
    vi.useFakeTimers();
    const check = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValue(true);
    const emit = vi.fn(); const monitor = createAccessMonitor(check, emit);
    monitor.setForeground(true); await flush(); expect(emit).toHaveBeenLastCalledWith("active");
    await vi.advanceTimersByTimeAsync(60000); expect(emit).toHaveBeenLastCalledWith("blocked");
    monitor.setForeground(false); await vi.advanceTimersByTimeAsync(120000); expect(check).toHaveBeenCalledTimes(2);
    monitor.setForeground(true); await flush(); expect(emit).toHaveBeenLastCalledWith("active"); monitor.dispose();
  });
  it("does not interrupt the visible screen during a successful periodic check", async () => {
    vi.useFakeTimers(); const emit = vi.fn();
    const monitor = createAccessMonitor(async () => true, emit);
    monitor.setForeground(true); await flush(); emit.mockClear();
    await vi.advanceTimersByTimeAsync(60000);
    expect(emit.mock.calls).toEqual([["active"]]); monitor.dispose();
  });
  it("ignores an old successful request after suspension and revocation", async () => {
    let resolve!: (value: boolean) => void;
    const check = vi.fn().mockImplementationOnce(() => new Promise<boolean>(r => { resolve = r; })).mockResolvedValue(false);
    const emit = vi.fn(); const monitor = createAccessMonitor(check, emit);
    monitor.setForeground(true); monitor.setForeground(false); monitor.setForeground(true);
    await flush(); resolve(true); await flush(); expect(emit).toHaveBeenLastCalledWith("blocked"); monitor.dispose();
  });
  it("times out a stalled request and never restores its late success", async () => {
    vi.useFakeTimers(); let resolve!: (value: boolean) => void;
    const emit = vi.fn(); const monitor = createAccessMonitor(() => new Promise(r => { resolve = r; }), emit);
    monitor.setForeground(true); await vi.advanceTimersByTimeAsync(12000);
    expect(emit).toHaveBeenLastCalledWith("error"); resolve(true); await flush();
    expect(emit).toHaveBeenLastCalledWith("error"); monitor.dispose();
  });
  it("allows retry after a network error", async () => {
    const check = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(true);
    const emit = vi.fn(); const monitor = createAccessMonitor(check, emit);
    monitor.setForeground(true); await flush(); expect(emit).toHaveBeenLastCalledWith("error");
    await monitor.refresh(); expect(emit).toHaveBeenLastCalledWith("active"); monitor.dispose();
  });
  it("drops all results and timers after identity unmount", async () => {
    vi.useFakeTimers(); let resolve!: (value: boolean) => void;
    const emit = vi.fn(); const monitor = createAccessMonitor(() => new Promise(r => { resolve = r; }), emit);
    monitor.setForeground(true); monitor.dispose(); emit.mockClear(); resolve(true);
    await vi.advanceTimersByTimeAsync(120000); expect(emit).not.toHaveBeenCalled();
  });
});

export type AccessState = "checking" | "active" | "blocked" | "error";

/** Invalidates late responses after suspension, timeout, retry or disposal. */
export function createAccessMonitor(check: () => Promise<boolean>, emit: (state: AccessState) => void) {
  let generation = 0;
  let foreground = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  let pending = false;
  function invalidate() { generation++; pending = false; clearTimeout(timer); }
  async function refresh(showLoading = true) {
    if (disposed || !foreground || (!showLoading && pending)) return;
    invalidate();
    const request = generation;
    pending = true;
    if (showLoading) emit("checking");
    timer = setTimeout(() => {
      if (disposed || request !== generation) return;
      invalidate(); emit("error");
    }, 12000);
    try {
      const allowed = await check();
      if (!disposed && foreground && request === generation) emit(allowed ? "active" : "blocked");
    } catch {
      if (!disposed && foreground && request === generation) emit("error");
    } finally {
      if (request === generation) { pending = false; clearTimeout(timer); }
    }
  }
  return {
    refresh: () => refresh(),
    setForeground(active: boolean) {
      if (disposed) return;
      foreground = active; invalidate(); clearInterval(poll); emit("checking");
      if (active) { void refresh(); poll = setInterval(() => void refresh(false), 60000); }
    },
    dispose() { disposed = true; invalidate(); clearInterval(poll); },
  };
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  navigateToSafeRoute,
  planCrashRecovery,
  recordRecoveryAttempt,
  resetCrashRecoveryCounters,
} from "@/lib/crash-recovery";
import { MAX_RECOVERY_ATTEMPTS } from "@/lib/recovery-limit";

describe("crash-recovery", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
    resetCrashRecoveryCounters();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("escalates remount → navigate then manual at MAX_RECOVERY_ATTEMPTS", () => {
    expect(planCrashRecovery("ChildForm")).toBe("remount");
    recordRecoveryAttempt("remount");
    expect(planCrashRecovery("ChildForm")).toBe("remount");
    recordRecoveryAttempt("remount");
    expect(planCrashRecovery("ChildForm")).toBe("navigate");
    recordRecoveryAttempt("navigate");
    expect(planCrashRecovery("ChildForm")).toBe("manual");
  });

  it("stops automatic recovery after MAX_RECOVERY_ATTEMPTS", () => {
    for (let i = 0; i < MAX_RECOVERY_ATTEMPTS; i++) {
      recordRecoveryAttempt("remount");
    }
    expect(planCrashRecovery("Dashboard")).toBe("manual");
  });

  it("does not reload dashboard when recovery limit exceeded", () => {
    const assign = vi.fn();
    const reload = vi.fn();
    vi.stubGlobal("location", {
      pathname: "/dashboard",
      assign,
      reload,
    });

    for (let i = 0; i < MAX_RECOVERY_ATTEMPTS; i++) {
      recordRecoveryAttempt("remount");
    }

    const acted = navigateToSafeRoute();
    expect(acted).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });

  it("navigates away from crashing route when under limit", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      pathname: "/children/abc/edit",
      assign,
    });

    const acted = navigateToSafeRoute();
    expect(acted).toBe(true);
    expect(assign).toHaveBeenCalledWith("/dashboard");
  });
});

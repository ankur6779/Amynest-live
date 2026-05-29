import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkDeployVersionMismatch } from "@/lib/pwa-cache-sync";
import {
  getStartupState,
  inferBootTimeoutRootCause,
  initStartupOrchestrator,
  markReactRendered,
  registerStartupWait,
  resetStartupStateForTests,
  waitForAppCoreReady,
  waitWithTimeout,
} from "@/lib/startup-orchestrator";

describe("startup-orchestrator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStartupStateForTests();
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
    vi.stubGlobal("localStorage", {
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
    vi.stubGlobal("window", {
      ...globalThis.window,
      __amynestStartupState: undefined,
      __amynestAppCoreReady: false,
      __amynestMark: vi.fn(),
      __amynestDiag: vi.fn(() => ({ phases: [] })),
      location: { pathname: "/pricing", search: "", href: "https://www.amynest.in/pricing" },
      navigator: { userAgent: "Mozilla/5.0" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("Phase 1: markReactRendered sets reactRendered before background work", () => {
    initStartupOrchestrator();
    markReactRendered();
    const s = getStartupState();
    expect(s.reactRendered).toBe(true);
    expect(s.phase).toBe("react_rendered");
  });

  it("detects bootstrap→AppCore deadlock when waiting before react render", async () => {
    initStartupOrchestrator();
    const ready = await waitForAppCoreReady({ timeoutMs: 100 });
    expect(ready).toBe(false);
    expect(getStartupState().lastDeadlock?.chain.length).toBeGreaterThan(0);
  });

  it("waitWithTimeout returns fallback when task exceeds timeout", async () => {
    initStartupOrchestrator();
    markReactRendered();
    const p = waitWithTimeout({
      label: "slow_task",
      waitingFor: "network",
      timeoutMs: 50,
      fn: () => new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 500)),
      fallback: "fallback",
    });
    await vi.advanceTimersByTimeAsync(60);
    await expect(p).resolves.toBe("fallback");
  });

  it("stale deploy version detected without blocking (sync check only)", () => {
    sessionStorage.setItem("amynest:deploy-version", "build-old"); // DEPLOY_VERSION_SESSION_KEY
    vi.stubGlobal("document", {
      querySelector: () => ({ getAttribute: () => "build-new" }),
    });
    const check = checkDeployVersionMismatch();
    expect(check.mismatch).toBe(true);
    expect(check.previous).toBe("build-old");
    expect(check.current).toBe("build-new");
  });

  it("first install has no version mismatch", () => {
    const check = checkDeployVersionMismatch();
    expect(check.mismatch).toBe(false);
  });

  it("inferBootTimeoutRootCause when bundle never loaded", () => {
    initStartupOrchestrator();
    const cause = inferBootTimeoutRootCause();
    expect(cause.rootCause).toBe("main_bundle_not_executed");
    expect(cause.recoveryPath).toBe("cache_clear_reload");
  });

  it("inferBootTimeoutRootCause after react render is not a hard failure", () => {
    initStartupOrchestrator();
    markReactRendered();
    const cause = inferBootTimeoutRootCause();
    expect(cause.rootCause).toBe("watchdog_false_positive");
  });

  it("registerStartupWait records active dependency edges", () => {
    initStartupOrchestrator();
    registerStartupWait("task_a", "service_worker");
    expect(getStartupState().activeWaits.some((w) => w.waiter === "task_a")).toBe(true);
  });
});

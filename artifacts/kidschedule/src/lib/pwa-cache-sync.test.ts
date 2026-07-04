import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEPLOY_VERSION_SESSION_KEY } from "@/lib/deploy-version";
import {
  checkDeployVersionMismatch,
  runPwaCacheSyncBackground,
} from "@/lib/pwa-cache-sync";
import { getStartupState, markReactRendered, resetStartupStateForTests } from "@/lib/startup-orchestrator";

vi.mock("@/lib/refresh-orchestrator", () => ({
  hasCompletedRefreshCycle: vi.fn(() => false),
  clearRefreshCompleteFlag: vi.fn(),
  runRefreshCycle: vi.fn(() => Promise.resolve("scheduled")),
}));

describe("pwa-cache-sync (background)", () => {
  beforeEach(() => {
    resetStartupStateForTests();
    vi.stubGlobal("sessionStorage", {
      store: { [DEPLOY_VERSION_SESSION_KEY]: "v1" } as Record<string, string>,
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
    vi.stubGlobal("document", {
      querySelector: () => ({ getAttribute: () => "v2" }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("upgrade install: mismatch clears cache and reloads without AppCore wait", async () => {
    markReactRendered();
    const mismatch = checkDeployVersionMismatch();
    expect(mismatch.mismatch).toBe(true);

    const { runRefreshCycle } = await import("@/lib/refresh-orchestrator");

    await runPwaCacheSyncBackground();

    expect(getStartupState().deployReloadScheduled).toBe(true);
    expect(getStartupState().versionMismatch).toBe(true);
    expect(runRefreshCycle).toHaveBeenCalled();
  });

  it("does not reload again when deploy-reload-done is already set", async () => {
    sessionStorage.setItem("amynest:deploy-reload-done", "v2");
    const { runRefreshCycle } = await import("@/lib/refresh-orchestrator");

    await runPwaCacheSyncBackground();

    expect(runRefreshCycle).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(DEPLOY_VERSION_SESSION_KEY)).toBe("v2");
  });

  it("cache clear failure still completes version check state", async () => {
    const { runRefreshCycle } = await import("@/lib/refresh-orchestrator");
    vi.mocked(runRefreshCycle).mockRejectedValueOnce(new Error("cache blocked"));

    sessionStorage.removeItem(DEPLOY_VERSION_SESSION_KEY);
    vi.stubGlobal("document", {
      querySelector: () => ({ getAttribute: () => "v2" }),
    });

    await runPwaCacheSyncBackground();
    expect(getStartupState().versionCheckComplete).toBe(true);
  });
});

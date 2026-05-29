import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEPLOY_VERSION_SESSION_KEY } from "@/lib/deploy-version";
import {
  checkDeployVersionMismatch,
  runPwaCacheSyncBackground,
} from "@/lib/pwa-cache-sync";
import { getStartupState, markReactRendered, resetStartupStateForTests } from "@/lib/startup-orchestrator";

vi.mock("@/lib/force-clear-caches", () => ({
  forceClearAllCaches: vi.fn(() => Promise.resolve()),
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
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("upgrade install: mismatch clears cache and reloads without AppCore wait", async () => {
    markReactRendered();
    const mismatch = checkDeployVersionMismatch();
    expect(mismatch.mismatch).toBe(true);

    await runPwaCacheSyncBackground();

    expect(getStartupState().deployReloadScheduled).toBe(true);
    expect(getStartupState().versionMismatch).toBe(true);
    expect(location.reload).toHaveBeenCalled();
  });

  it("cache clear failure still completes version check state", async () => {
    const { forceClearAllCaches } = await import("@/lib/force-clear-caches");
    vi.mocked(forceClearAllCaches).mockRejectedValueOnce(new Error("cache blocked"));

    sessionStorage.removeItem(DEPLOY_VERSION_SESSION_KEY);
    vi.stubGlobal("document", {
      querySelector: () => ({ getAttribute: () => "v2" }),
    });

    await runPwaCacheSyncBackground();
    expect(getStartupState().versionCheckComplete).toBe(true);
  });
});

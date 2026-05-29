import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncPwaCacheAndVersion } from "@/lib/pwa-cache-sync";
import { initStartupOrchestrator, resetStartupStateForTests } from "@/lib/startup-orchestrator";

vi.mock("@/lib/force-clear-caches", () => ({
  forceClearAllCaches: vi.fn(() => Promise.resolve()),
}));

describe("startup-api-guard", () => {
  beforeEach(() => {
    resetStartupStateForTests();
    vi.stubGlobal("location", { reload: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws syncPwaCacheAndVersion before react render in DEV", async () => {
    initStartupOrchestrator();
    await expect(syncPwaCacheAndVersion()).rejects.toThrow(/before React render/);
    expect(location.reload).not.toHaveBeenCalled();
  });
});

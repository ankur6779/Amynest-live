import { beforeEach, describe, expect, it } from "vitest";
import { persistDashboardSummary, readCachedDashboardSummary } from "@/lib/dashboard-data-cache";
import {
  clearUserScopedClientCaches,
  persistOnboardingCache,
  readOnboardingCache,
} from "@/lib/setup-status";
import {
  clearPtmPrepLocalCache,
  STORAGE_KEY_CLIENT_UPDATED_AT,
  STORAGE_KEY_DRAFT,
  STORAGE_KEY_HISTORY,
} from "@workspace/ptm-prep";

describe("clearUserScopedClientCaches", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("clears onboarding, dashboard, and PTM prep data for the next account", () => {
    persistOnboardingCache({ onboardingComplete: true, profileComplete: true });
    persistDashboardSummary({
      totalChildren: 2,
      totalRoutines: 1,
      positiveBehaviorsToday: 0,
      negativeBehaviorsToday: 0,
      routinesGeneratedThisWeek: 0,
    });
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify({ id: "draft-1" }));
    localStorage.setItem(STORAGE_KEY_HISTORY, "[]");
    localStorage.setItem(STORAGE_KEY_CLIENT_UPDATED_AT, "999");

    clearUserScopedClientCaches();

    expect(readOnboardingCache().onboardingComplete).toBe(false);
    expect(readCachedDashboardSummary()).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEY_DRAFT)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_HISTORY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_CLIENT_UPDATED_AT)).toBeNull();
  });

  it("clearPtmPrepLocalCache removes stale PTM keys only", () => {
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify({ id: "draft-1" }));
    localStorage.setItem("unrelated", "keep");

    clearPtmPrepLocalCache();

    expect(localStorage.getItem(STORAGE_KEY_DRAFT)).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });
});

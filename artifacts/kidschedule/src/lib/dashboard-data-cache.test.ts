import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDashboardDataCache,
  EMPTY_DASHBOARD_SUMMARY,
  fetchDashboardSummaryResilient,
  formatDashboardSyncLabel,
  hasDashboardStaleCache,
  persistDashboardSummary,
  readCachedDashboardSummary,
  readDashboardSyncTimestamp,
  touchDashboardSyncTimestamp,
} from "@/lib/dashboard-data-cache";

describe("dashboard-data-cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("persists and reads dashboard summary", () => {
    const before = Date.now();
    persistDashboardSummary({
      totalChildren: 2,
      totalRoutines: 5,
      positiveBehaviorsToday: 1,
      negativeBehaviorsToday: 0,
      routinesGeneratedThisWeek: 3,
    });
    expect(readCachedDashboardSummary()?.totalChildren).toBe(2);
    expect(hasDashboardStaleCache()).toBe(true);
    const syncedAt = readDashboardSyncTimestamp();
    expect(syncedAt).toBeGreaterThanOrEqual(before);
  });

  it("formatDashboardSyncLabel uses just-now vs updated phrasing", () => {
    const now = 1_700_000_000_000;
    expect(formatDashboardSyncLabel(now - 30_000, now)).toBe("Last synced just now");
    expect(formatDashboardSyncLabel(now - 2 * 60_000, now)).toBe("Updated 2 min ago");
    expect(formatDashboardSyncLabel(now - 3 * 60 * 60_000, now)).toBe("Updated 3 hr ago");
  });

  it("touchDashboardSyncTimestamp stores explicit time", () => {
    touchDashboardSyncTimestamp(42);
    expect(readDashboardSyncTimestamp()).toBe(42);
  });

  it("clearDashboardDataCache removes all persisted dashboard keys", () => {
    persistDashboardSummary({
      totalChildren: 1,
      totalRoutines: 1,
      positiveBehaviorsToday: 0,
      negativeBehaviorsToday: 0,
      routinesGeneratedThisWeek: 0,
    });
    expect(hasDashboardStaleCache()).toBe(true);
    clearDashboardDataCache();
    expect(hasDashboardStaleCache()).toBe(false);
    expect(readDashboardSyncTimestamp()).toBeUndefined();
  });

  it("fetchDashboardSummaryResilient returns cache then empty fallback", async () => {
    persistDashboardSummary({
      totalChildren: 1,
      totalRoutines: 1,
      positiveBehaviorsToday: 0,
      negativeBehaviorsToday: 0,
      routinesGeneratedThisWeek: 0,
    });

    const authFetch = vi.fn().mockRejectedValue(new Error("offline"));
    const first = await fetchDashboardSummaryResilient(authFetch);
    expect(first.totalChildren).toBe(1);

    localStorage.clear();
    const second = await fetchDashboardSummaryResilient(authFetch);
    expect(second).toEqual(EMPTY_DASHBOARD_SUMMARY);
  });
});

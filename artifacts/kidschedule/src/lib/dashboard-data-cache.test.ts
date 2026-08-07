import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_DASHBOARD_SUMMARY,
  fetchDashboardSummaryResilient,
  fetchSubscriptionResilient,
  formatDashboardSyncLabel,
  hasDashboardStaleCache,
  persistDashboardSummary,
  persistSubscription,
  readCachedDashboardSummary,
  readCachedSubscription,
  readDashboardSyncTimestamp,
  readPersistedSubscription,
  touchDashboardSyncTimestamp,
} from "@/lib/dashboard-data-cache";
import type { SubscriptionResponse } from "@/hooks/use-subscription";
import { EMPTY_SUBSCRIPTION_RESPONSE } from "@/lib/subscription-defaults";

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

  it("scopes subscription cache by user and never returns cached premium as authoritative", () => {
    const premium: SubscriptionResponse = {
      ...EMPTY_SUBSCRIPTION_RESPONSE,
      entitlements: {
        ...EMPTY_SUBSCRIPTION_RESPONSE.entitlements,
        plan: "yearly",
        status: "active",
        isPremium: true,
        currentPeriodEnd: "2099-01-01T00:00:00.000Z",
        provider: "revenuecat",
      },
    };

    persistSubscription(premium, "user_a");
    expect(readCachedSubscription("user_b")).toBeUndefined();
    const cached = readCachedSubscription("user_a");
    expect(cached?.entitlements.isPremium).toBe(false);
    expect(cached?.entitlements.plan).toBe("free");
    expect(cached?.entitlements.provider).toBe("none");
    // Raw persist keeps premium for offline resilient fallback.
    expect(readPersistedSubscription("user_a")?.entitlements.isPremium).toBe(true);
  });

  it("fetchSubscriptionResilient preserves last-known premium on fetch failure", async () => {
    const premium: SubscriptionResponse = {
      ...EMPTY_SUBSCRIPTION_RESPONSE,
      entitlements: {
        ...EMPTY_SUBSCRIPTION_RESPONSE.entitlements,
        plan: "yearly",
        status: "active",
        isPremium: true,
        isPremiumSubscriber: true,
        currentPeriodEnd: "2099-01-01T00:00:00.000Z",
        provider: "revenuecat",
      },
    };
    persistSubscription(premium, "user_premium");

    const authFetch = vi.fn().mockRejectedValue(new Error("offline"));
    const result = await fetchSubscriptionResilient(authFetch, "user_premium");
    expect(result.entitlements.isPremium).toBe(true);
    expect(result.entitlements.plan).toBe("yearly");
    expect(result.entitlements.provider).toBe("revenuecat");
  });
});

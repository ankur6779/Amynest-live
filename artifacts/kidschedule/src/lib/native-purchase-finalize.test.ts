import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { SubscriptionResponse } from "@/hooks/use-subscription";
import { finalizeNativePurchase } from "@/lib/native-purchase-finalize";

const trialOnlyPremium: SubscriptionResponse = {
  entitlements: {
    ageMonths: 48,
    isInfant: false,
    plan: "monthly",
    status: "trialing",
    isPremium: true,
    isPremiumSubscriber: false,
    isTrialActive: true,
    trialDaysRemaining: 2,
    allPremiumAccess: true,
    isTrialing: true,
    trialEndsAt: new Date(Date.now() + 86400000).toISOString(),
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canAccessLearningHub: true,
    canAccessActivitiesHub: true,
    canAccessSpeechCoach: true,
    canAccessNutritionHub: true,
    canAccessHealthLab: true,
    canAccessDownloads: true,
    canDownloadPhonicsWorkbook: false,
    babyExpertDailyLimit: 3,
    canAccessSleepCoach: true,
    canAccessFeedingRoadmap: true,
    canAccessWeeklyReports: true,
    provider: "none",
    limits: {
      aiQueriesPerDay: 10,
      childrenMax: 1,
      devicesMax: 1,
      routinesMax: 2,
      hubArticlesMax: 5,
      trialDays: 3,
    },
    usage: {
      aiQueriesToday: 0,
      aiQueriesRemaining: null,
    },
  },
  plans: [],
};

const paidSubscriber: SubscriptionResponse = {
  ...trialOnlyPremium,
  entitlements: {
    ...trialOnlyPremium.entitlements,
    status: "active",
    isPremium: true,
    isPremiumSubscriber: true,
    isTrialing: false,
    isTrialActive: false,
    provider: "razorpay",
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    canDownloadPhonicsWorkbook: true,
  },
};

describe("finalizeNativePurchase", () => {
  it("does not treat internal trial isPremium as checkout success", async () => {
    vi.useFakeTimers();
    const qc = new QueryClient();
    qc.setQueryData(["subscription", "user-1"], trialOnlyPremium);

    const authFetch = vi.fn();
    const promise = finalizeNativePurchase(authFetch, qc);

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(result.isPremiumSubscriber).toBe(false);
    vi.useRealTimers();
  });

  it("returns ok when isPremiumSubscriber becomes true during polling", async () => {
    vi.useFakeTimers();
    const qc = new QueryClient();
    qc.setQueryData(["subscription", "user-1"], trialOnlyPremium);

    let polls = 0;
    const originalInvalidate = qc.invalidateQueries.bind(qc);
    qc.invalidateQueries = vi.fn(async (...args) => {
      polls += 1;
      if (polls >= 2) {
        qc.setQueryData(["subscription", "user-1"], paidSubscriber);
      }
      return originalInvalidate(...args);
    }) as typeof qc.invalidateQueries;

    const authFetch = vi.fn();
    const promise = finalizeNativePurchase(authFetch, qc);

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(result.isPremiumSubscriber).toBe(true);
    vi.useRealTimers();
  });
});

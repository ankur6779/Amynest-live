import { describe, expect, it } from "vitest";
import type { Entitlements } from "@/hooks/use-subscription";
import {
  isExpiredInternalTrial,
  isInternalTrial,
  pricingCheckoutHref,
} from "@/lib/internal-trial";

const base: Entitlements = {
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
    infantAiQueriesPerDay: 3,
    childrenMax: 1,
    devicesMax: 1,
    routinesMax: 2,
    hubArticlesMax: 5,
    trialDays: 3,
  },
  usage: {
    aiQueriesToday: 0,
    aiQueriesRemaining: null,
    infantAiQueriesToday: 0,
    infantAiQueriesRemaining: null,
  },
};

describe("internal-trial", () => {
  it("detects internal trial", () => {
    expect(isInternalTrial(base)).toBe(true);
    expect(isInternalTrial({ ...base, provider: "revenuecat" })).toBe(false);
  });

  it("detects expired internal trial from server flag", () => {
    expect(
      isExpiredInternalTrial({
        ...base,
        status: "free",
        isPremium: false,
        isTrialing: false,
        internalTrialExpired: true,
      }),
    ).toBe(true);
  });

  it("builds pricing deep links", () => {
    expect(pricingCheckoutHref("trial_banner")).toBe(
      "/pricing?plan=yearly&source=trial_banner",
    );
  });
});

import {
  FREE_LIMITS,
  PLAN_PRICES,
  formatPlanPrice,
  type EntitlementSummary,
  type Plan,
} from "../services/subscriptionService.js";
import { buildPlanCardsForApi } from "@workspace/subscription-marketing";

/** Free-tier entitlements when DB / RC / subscription handler fails. */
export function buildFreeEntitlements(): EntitlementSummary {
  return {
    ageMonths: null,
    isInfant: false,
    plan: "free",
    status: "free",
    isPremium: false,
    isPremiumSubscriber: false,
    isTrialActive: false,
    trialDaysRemaining: 0,
    allPremiumAccess: false,
    isTrialing: false,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canAccessLearningHub: false,
    canAccessActivitiesHub: false,
    canAccessSpeechCoach: false,
    canAccessNutritionHub: false,
    canAccessHealthLab: false,
    canAccessDownloads: false,
    canDownloadPhonicsWorkbook: false,
    babyExpertDailyLimit: FREE_LIMITS.infantAiQueriesPerDay,
    canAccessSleepCoach: false,
    canAccessFeedingRoadmap: false,
    canAccessWeeklyReports: false,
    provider: "none",
    limits: FREE_LIMITS,
    usage: {
      aiQueriesToday: 0,
      aiQueriesRemaining: FREE_LIMITS.aiQueriesPerDay,
      infantAiQueriesToday: 0,
      infantAiQueriesRemaining: FREE_LIMITS.infantAiQueriesPerDay,
      features: {} as EntitlementSummary["usage"]["features"],
    },
  };
}

function planCard(
  id: Exclude<Plan, "free">,
  savingsPercent?: number,
) {
  const marketing = buildPlanCardsForApi().find((m) => m.id === id)!;
  const p = PLAN_PRICES[id];
  return {
    id,
    title: marketing.title,
    tagline: marketing.tagline,
    description: marketing.description,
    price: p.amount,
    currency: p.currency,
    period: p.period,
    formattedPrice: formatPlanPrice(p.amount, p.currency),
    badge: marketing.badge,
    features: marketing.features,
    ...(savingsPercent != null ? { savingsPercent } : {}),
  };
}

export function buildSubscriptionFallbackResponse() {
  return {
    entitlements: buildFreeEntitlements(),
    plans: [
      planCard("yearly", 33),
      planCard("six_month", 17),
      planCard("monthly"),
    ],
    fallback: true,
  };
}

export const DASHBOARD_SUMMARY_FALLBACK = {
  totalChildren: 0,
  totalRoutines: 0,
  positiveBehaviorsToday: 0,
  negativeBehaviorsToday: 0,
  routinesGeneratedThisWeek: 0,
  fallback: true as const,
};

export const DASHBOARD_RECENT_ROUTINES_FALLBACK: unknown[] = [];

export const DASHBOARD_BEHAVIOR_STATS_FALLBACK: unknown[] = [];

export const PARENT_PROFILE_FALLBACK = {
  name: "",
  role: "mother",
  workType: "work_from_home",
  region: "global",
  country: "US",
  foodStyle: "mixed",
  subCuisine: null,
  mobileNumber: null,
  allergies: null,
  freeSlots: [] as unknown[],
  fallback: true as const,
};

/** When onboarding_profiles save fails due to schema/DB errors. */
export const ONBOARDING_SAVE_FALLBACK = {
  success: false as const,
  fallback: true as const,
  onboardingComplete: false,
};

/** When GET /onboarding cannot read DB — client treats as fresh onboarding. */
export const ONBOARDING_STATUS_FALLBACK = {
  onboardingComplete: false,
  profileComplete: false,
  children: [] as unknown[],
  parent: {},
  priorityGoal: null,
  fallback: true as const,
};

/** When POST /children fails during onboarding wizard. */
export const ONBOARDING_CHILD_SAVE_FALLBACK = {
  success: false as const,
  fallback: true as const,
};

/** When PUT /parent-profile fails during onboarding wizard. */
export const ONBOARDING_PARENT_SAVE_FALLBACK = {
  ...PARENT_PROFILE_FALLBACK,
  success: false as const,
};

import { buildInsightsFallback } from "../services/insightsService.js";

const DASHBOARD_INSIGHTS_FALLBACK = buildInsightsFallback("week");

/** Static fallback when a repeated request loop has no cached response. */
export function getDashboardFallbackForPath(path: string): unknown {
  if (path.includes("/dashboard/summary")) return DASHBOARD_SUMMARY_FALLBACK;
  if (path.includes("/dashboard/recent-routines")) return DASHBOARD_RECENT_ROUTINES_FALLBACK;
  if (path.includes("/dashboard/behavior-stats")) return DASHBOARD_BEHAVIOR_STATS_FALLBACK;
  if (path.includes("/dashboard/insights")) return DASHBOARD_INSIGHTS_FALLBACK;
  return DASHBOARD_SUMMARY_FALLBACK;
}

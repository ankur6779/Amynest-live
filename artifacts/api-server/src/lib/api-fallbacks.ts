import {
  FREE_LIMITS,
  PLAN_PRICES,
  type EntitlementSummary,
  type Plan,
} from "../services/subscriptionService.js";

/** Free-tier entitlements when DB / RC / subscription handler fails. */
export function buildFreeEntitlements(): EntitlementSummary {
  return {
    plan: "free",
    status: "free",
    isPremium: false,
    isTrialing: false,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    provider: "none",
    limits: FREE_LIMITS,
    usage: {
      aiQueriesToday: 0,
      aiQueriesRemaining: FREE_LIMITS.aiQueriesPerDay,
      features: {} as EntitlementSummary["usage"]["features"],
    },
  };
}

function planCard(
  id: Exclude<Plan, "free">,
  title: string,
  badge: string | null,
  savingsPercent?: number,
) {
  const p = PLAN_PRICES[id];
  return {
    id,
    title,
    price: p.amount,
    currency: "INR",
    period: p.period,
    formattedPrice: `₹${p.amount}`,
    badge,
    ...(savingsPercent != null ? { savingsPercent } : {}),
    features:
      id === "monthly"
        ? [
            "Unlimited Amy AI",
            "Personalized Amy Coach",
            "Unlimited routines & children",
            "Full Parenting Hub",
          ]
        : id === "six_month"
          ? ["Everything in Monthly", "Behavior insights & trends", "Save vs monthly billing"]
          : ["Everything in 6 Months", "Adaptive learning", "Priority support"],
  };
}

export function buildSubscriptionFallbackResponse() {
  return {
    entitlements: buildFreeEntitlements(),
    plans: [
      planCard("monthly", "Monthly", null),
      planCard("six_month", "6 Months", "Most Popular", 16),
      planCard("yearly", "Yearly", "Best Value", 37),
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
  region: "pan_indian",
  country: "IN",
  foodStyle: "mixed",
  subCuisine: null,
  mobileNumber: null,
  allergies: null,
  freeSlots: [] as unknown[],
  fallback: true as const,
};

const DASHBOARD_INSIGHTS_FALLBACK = { insights: [], fallback: true as const };

/** Static fallback when rate-limited / memory pressure and no cache. */
export function getDashboardFallbackForPath(path: string): unknown {
  if (path.includes("/dashboard/summary")) return DASHBOARD_SUMMARY_FALLBACK;
  if (path.includes("/dashboard/recent-routines")) return DASHBOARD_RECENT_ROUTINES_FALLBACK;
  if (path.includes("/dashboard/behavior-stats")) return DASHBOARD_BEHAVIOR_STATS_FALLBACK;
  if (path.includes("/dashboard/insights")) return DASHBOARD_INSIGHTS_FALLBACK;
  return DASHBOARD_SUMMARY_FALLBACK;
}

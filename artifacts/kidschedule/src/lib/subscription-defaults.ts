import type { Entitlements, SubscriptionResponse } from "@/hooks/use-subscription";

/** Safe fallback when /api/subscription fails in production — never throw. */
export const FREE_ENTITLEMENTS: Entitlements = {
  plan: "free",
  status: "free",
  isPremium: false,
  isTrialing: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  provider: "none",
  limits: {
    aiQueriesPerDay: 10,
    childrenMax: 3,
    routinesMax: 3,
    hubArticlesMax: 5,
    trialDays: 0,
  },
  usage: {
    aiQueriesToday: 0,
    aiQueriesRemaining: 10,
    features: undefined,
  },
};

export const EMPTY_SUBSCRIPTION_RESPONSE: SubscriptionResponse = {
  entitlements: FREE_ENTITLEMENTS,
  plans: [],
};

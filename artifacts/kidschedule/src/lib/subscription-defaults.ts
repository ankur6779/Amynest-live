import type { Entitlements, SubscriptionResponse } from "@/hooks/use-subscription";

/** Env-configurable infant Baby Expert daily limit. Server: INFANT_AI_DAILY_LIMIT (default 3). */
function resolveInfantAiDailyLimit(): number {
  const raw = import.meta.env.VITE_INFANT_AI_DAILY_LIMIT;
  if (raw === undefined || raw === "") return 3;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

const INFANT_AI_DAILY_LIMIT = resolveInfantAiDailyLimit();

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
    infantAiQueriesPerDay: INFANT_AI_DAILY_LIMIT,
    childrenMax: 1,
    devicesMax: 1,
    routinesMax: 2,
    hubArticlesMax: 5,
    trialDays: 0,
  },
  usage: {
    aiQueriesToday: 0,
    aiQueriesRemaining: 10,
    infantAiQueriesToday: 0,
    infantAiQueriesRemaining: INFANT_AI_DAILY_LIMIT,
    features: undefined,
  },
};

export const EMPTY_SUBSCRIPTION_RESPONSE: SubscriptionResponse = {
  entitlements: FREE_ENTITLEMENTS,
  plans: [],
};

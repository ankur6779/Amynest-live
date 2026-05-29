/** Anti-repetition windows (days). */
export const EXACT_BODY_WINDOW_DAYS = 30;
export const RECOMMENDATION_WINDOW_DAYS = 14;
export const TOPIC_WINDOW_DAYS = 7;

/** Minimum composite business impact score (0–100) to dispatch. */
export const BUSINESS_IMPACT_THRESHOLD = 42;

/** @deprecated Use BUSINESS_IMPACT_THRESHOLD — kept for backward compat. */
export const QUALITY_THRESHOLD = BUSINESS_IMPACT_THRESHOLD;

/** Fatigue tiers: consecutive unopened sends. */
export const FATIGUE_TIER_1 = 7;
export const FATIGUE_TIER_2 = 14;
export const FATIGUE_TIER_3 = 30;

export const FATIGUE_MULTIPLIER_TIER_1 = 0.8;
export const FATIGUE_MULTIPLIER_TIER_2 = 0.6;
export const FATIGUE_MULTIPLIER_TIER_3 = 0.4;

/** Business impact score weights — optimize for outcomes, not clicks. */
export const WEIGHT_ROUTINE_PROB = 0.25;
export const WEIGHT_LEARNING_PROB = 0.25;
export const WEIGHT_RETENTION_PROB = 0.2;
export const WEIGHT_SUBSCRIPTION_PROB = 0.15;
export const WEIGHT_ENGAGEMENT_PROB = 0.15;

/** Legacy quality weights — diagnostic logging only. */
export const WEIGHT_NOVELTY = 0.35;
export const WEIGHT_RELEVANCE = 0.3;
export const WEIGHT_RECENCY = 0.15;
export const WEIGHT_ENGAGEMENT = 0.2;

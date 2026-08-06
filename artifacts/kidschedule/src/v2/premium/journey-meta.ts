/**
 * Stable Premium V2 journey identity (Sprint 3B review).
 * Metadata only — no behavior / entitlement effects.
 */

export const PREMIUM_JOURNEY_ID = "premium_v2_purchase" as const;

/** Bump only when journey contract changes. */
export const PREMIUM_JOURNEY_VERSION = 1 as const;

export type PremiumJourneyMetadata = {
  /** Entitlement authority — always RevenueCat / server sync. */
  readonly entitlementSource: "revenuecat";
  readonly surface: "v2_premium";
  readonly analytics: "none";
};

export const PREMIUM_JOURNEY_METADATA: PremiumJourneyMetadata = {
  entitlementSource: "revenuecat",
  surface: "v2_premium",
  analytics: "none",
};

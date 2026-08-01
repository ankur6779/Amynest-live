/**
 * Feature Registry (Sprint 0 · S0-T03).
 * Catalog metadata only — no UI, no AppCore mounts, no Tool Registry (S0-T04).
 */

export {
  V2_FEATURE_REGISTRY,
  getFeatureEntry,
  listFeaturesByDiscoveryStage,
  listWedgeEligibleFeatures,
} from "./catalog";
export {
  assertFeatureRegistryValid,
  validateFeatureRegistry,
  type FeatureRegistryValidationIssue,
} from "./validate";
export {
  isHeroEligible,
  type AskAmyHandoffPolicy,
  type DiscoveryStage,
  type FeatureCategory,
  type FeatureNavOwner,
  type FeatureRegistryEntry,
  type PremiumRole,
} from "./types";

/**
 * Feature Registry types (Phase 10 Task 5 · Phase 12 S0-T03).
 */

export type FeatureCategory =
  | "talk_speech"
  | "calm_days"
  | "learn"
  | "play"
  | "care"
  | "parent_support"
  | "keepsakes"
  | "shell";

/** Phase 9 migration buckets (naming amendment: treasury = For [Child]). */
export type DiscoveryStage = "hero" | "discoverable" | "hidden" | "archived";

export type FeatureNavOwner =
  | "today"
  | "ask_amy"
  | "for_child"
  | "account"
  | "none";

export type AskAmyHandoffPolicy =
  | "none"
  | "allowed"
  | "speech_only_v2"
  | "post_pmf";

export type PremiumRole = "free" | "soft_gate" | "hard_gate" | "n_a";

export type FeatureRegistryEntry = {
  id: string;
  purpose: string;
  category: FeatureCategory;
  discoveryStage: DiscoveryStage;
  navOwner: FeatureNavOwner;
  askAmyHandoff: AskAmyHandoffPolicy;
  premiumRole: PremiumRole;
  analyticsOwner: string;
  /** Canonical route path(s). */
  routeOwner: readonly string[];
  /**
   * Can be Front Door hero when `v2_wedge_id` selects it.
   * Phase 12 AC alias: heroEligible === wedgeEligible.
   */
  wedgeEligible: boolean;
};

/** Phase 12 acceptance alias for wedgeEligible. */
export function isHeroEligible(entry: FeatureRegistryEntry): boolean {
  return entry.wedgeEligible;
}

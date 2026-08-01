/**
 * AmyNest V2 feature flags (Phase 11 / Phase 12 S0-T01).
 * Prod-like defaults are always off until an explicit env override.
 */

/** Boolean kill switches for independently rollable V2 slices. */
export const V2_BOOLEAN_FLAG_KEYS = [
  "new_front_door",
  "guest_mode_v2",
  "today_v2",
  "mission_engine_v2",
  "ask_amy_v2",
  "for_child_v2",
  "speech_hero",
  "new_navigation",
  "migration_mode",
  "legacy_hidden",
  "legacy_onboarding_bridge",
  "deprecate_explore_free",
  "progressive_reveal",
  "premium_v2",
  "analytics_v2_core",
] as const;

export type V2BooleanFlagKey = (typeof V2_BOOLEAN_FLAG_KEYS)[number];

/** Current Front Door hero wedge id (Hero ≠ Permanent). */
export type V2WedgeId = "speech";

export type V2FlagSnapshot = Record<V2BooleanFlagKey, boolean> & {
  /** 0–100 percent cohort; default 0 = nobody. */
  v2_rollout_cohort: number;
  /** Active hero wedge; MVP freeze = speech. */
  v2_wedge_id: V2WedgeId;
};

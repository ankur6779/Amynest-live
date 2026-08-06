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
  /** Amy Decision Engine — OFF until shell bind sprint. Pure engine may still be unit-tested. */
  "amy_decision_engine_v2",
  /** Decision Stability Engine — OFF until shell bind. Pure engine may still be unit-tested. */
  "amy_decision_stability_v2",
  /** Decision History Engine — OFF until shell bind. Pure engine may still be unit-tested. */
  "amy_decision_history_v2",
  /** Decision Cooldown Engine — OFF until shell bind. Pure engine may still be unit-tested. */
  "amy_decision_cooldown_v2",
  /** Attention Budget Engine — OFF until shell bind. Pure engine may still be unit-tested. */
  "amy_attention_budget_v2",
  /** Registry Adapter Layer — OFF until Brain bind. Pure adapters may still be unit-tested. */
  "amy_registry_adapters_v2",
  /** Decision Bridge — OFF until shell bind. Pure resolver may still be unit-tested. */
  "amy_decision_bridge_v2",
  /** Amy Brain Shadow Validation — OFF until shell bind. Pure compare may still be unit-tested. */
  "amy_brain_shadow_validation_v2",
  /** Today Brain Adapter (shadow read) — OFF until bind. Pure observer may still be unit-tested. */
  "amy_today_brain_adapter_v2",
  /** Today Recommendation Adapter — OFF until bind. Pure normalize may still be unit-tested. */
  "amy_today_recommendation_adapter_v2",
  /** Today Recommendation Resolver — OFF until bind. Pure ID map may still be unit-tested. */
  "amy_today_recommendation_resolver_v2",
  /** Today Brain Hero Activation (Mission only) — OFF until bind. Pure gate may still be unit-tested. */
  "amy_today_brain_hero_v2",
  /** Shared Experience Resolver — OFF until surface bind. Pure resolve may still be unit-tested. */
  "amy_experience_resolver_v2",
  /** Speech Experience Pack — OFF until surface bind. Pure pack may still be unit-tested. */
  "amy_speech_experience_pack_v2",
  /** Experience Template Engine — OFF until surface bind. Pure factory may still be unit-tested. */
  "amy_experience_template_engine_v2",
  /** Sleep Experience Pack — OFF until surface bind. Pure definition may still be unit-tested. */
  "amy_sleep_experience_pack_v2",
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

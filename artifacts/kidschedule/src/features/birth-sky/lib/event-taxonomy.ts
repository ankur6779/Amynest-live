/**
 * Birth Sky analytics event name registry (placeholder until @workspace/analytics-taxonomy).
 *
 * IM-0: names are frozen here so IM-1+ must not rename events — only add.
 * Source of truth for string literals: Pack 1 §9, Pack 2 Part 13, Pack 3 Part 11, etc.
 */

/** Events emitted or reserved; do not rename — additive only. */
export const BIRTH_SKY_EVENT_NAMES = [
  // Pack 1 / Foundation
  "birth_sky.module_open",
  "birth_sky.module_closed",
  "birth_sky.error_recovery",
  // Pack 2 Setup
  "birth_sky.welcome_viewed",
  "birth_sky.setup_started",
  "birth_sky.setup_step_viewed",
  "birth_sky.date_completed",
  "birth_sky.time_completed",
  "birth_sky.unknown_time_selected",
  "birth_sky.place_completed",
  "birth_sky.consent_accepted",
  "birth_sky.setup_saved_for_later",
  "birth_sky.review_edit_tapped",
  "birth_sky.setup_completed",
  // Pack 3 Ceremony
  "birth_sky.formation_started",
  "birth_sky.formation_stage_changed",
  "birth_sky.formation_completed",
  "birth_sky.formation_failed",
  "birth_sky.reveal_viewed",
  "birth_sky.day_sky_revealed",
  "birth_sky.full_sky_revealed",
  "birth_sky.dashboard_entered",
  "birth_sky.transition_completed",
  "birth_sky.dashboard_viewed",
  // Pack 2 AI
  "birth_sky.first_ai_insight_used",
  "birth_sky.premium_paywall_viewed",
  "birth_sky.premium_purchase_started",
  "birth_sky.premium_purchase_completed",
  "birth_sky.premium_paywall_dismissed",
  "birth_sky.pending_ai_intent_cleared",
  // Pack 4+
  "birth_sky.dashboard_loaded",
  "birth_sky.hero_rendered",
  "birth_sky.hero_collapsed",
  "birth_sky.hero_expanded",
  "birth_sky.sky_segment_viewed",
  "birth_sky.astronomy_segment_viewed",
  "birth_sky.segment_switched",
  "birth_sky.snapshot_loaded",
  "birth_sky.snapshot_refreshed",
  "birth_sky.snapshot_regenerated",
  "birth_sky.day_sky_banner_viewed",
  "birth_sky.edit_birth_details_started",
  "birth_sky.edit_birth_details_completed",
  // Pack 5
  "birth_sky.traditional_segment_viewed",
  "birth_sky.traditional_card_opened",
  "birth_sky.tradition_intro_accepted",
  "birth_sky.tradition_intro_dismissed_astronomy_only",
  "birth_sky.reflection_segment_viewed",
  "birth_sky.reflection_prompt_viewed",
  "birth_sky.journal_entry_started",
  "birth_sky.journal_entry_saved",
  "birth_sky.timeline_link_opened",
  // Pack 6
  "birth_sky.conversation_started",
  "birth_sky.conversation_stream_started",
  "birth_sky.conversation_stream_completed",
  "birth_sky.conversation_stream_failed",
  "birth_sky.conversation_cancelled",
  "birth_sky.conversation_resumed",
  "birth_sky.conversation_expired",
  "birth_sky.message_rendered",
  "birth_sky.message_copied",
  "birth_sky.safety_fallback_shown",
  "birth_sky.moderation_blocked",
  // Pack 7
  "birth_sky.settings_opened",
  "birth_sky.birth_details_edit_started",
  "birth_sky.birth_details_saved",
  "birth_sky.birth_details_cancelled",
  "birth_sky.regeneration_started",
  "birth_sky.regeneration_completed",
  "birth_sky.regeneration_failed",
  "birth_sky.privacy_settings_opened",
  "birth_sky.export_started",
  "birth_sky.export_completed",
  "birth_sky.delete_started",
  "birth_sky.delete_completed",
  "birth_sky.sync_started",
  "birth_sky.sync_completed",
  "birth_sky.sync_failed",
  // Pack 9–10 Lens Platform (foundation lifecycle; Pack 1 birth_sky.* namespace)
  "birth_sky.lens_registered",
  "birth_sky.lens_loaded",
  "birth_sky.lens_failed",
  "birth_sky.lens_unloaded",
] as const;

export type BirthSkyAnalyticsEvent = (typeof BIRTH_SKY_EVENT_NAMES)[number];

/** Events Birth Sky may emit before taxonomy package wiring (IM-0 subset). */
export const BIRTH_SKY_IM0_EMITTED_EVENTS = [
  "birth_sky.module_open",
  "birth_sky.module_closed",
  "birth_sky.welcome_viewed",
  "birth_sky.setup_started",
  "birth_sky.setup_step_viewed",
  "birth_sky.error_recovery",
] as const satisfies readonly BirthSkyAnalyticsEvent[];

export type BirthSkyIm0EmittedEvent = (typeof BIRTH_SKY_IM0_EMITTED_EVENTS)[number];

export function isBirthSkyEventName(name: string): name is BirthSkyAnalyticsEvent {
  return (BIRTH_SKY_EVENT_NAMES as readonly string[]).includes(name);
}

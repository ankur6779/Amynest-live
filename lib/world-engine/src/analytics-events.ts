import type { WorldId } from "./types.js";

/** Platform-wide analytics events (client logs). Animal World keeps its existing `animal_world:*` events. */
export const DISCOVERY_WORLDS_ANALYTICS_EVENTS = [
  "world_opened",
  "world_item_opened",
  "world_sound_played",
  "world_mode_changed",
  "world_category_opened",
  "world_quiz_completed",
  "world_hear_find_started",
  "world_hear_find_completed",
  "world_hear_find_accuracy",
  "world_discovery_slide",
  "world_discovery_session_complete",
  "world_achievement_unlocked",
  "world_sticker_earned",
  "world_favorite_added",
  "world_favorite_removed",
  "world_session_duration",
  "world_offline_cache_warmed",
  "world_collection_xp",
] as const;

export type DiscoveryWorldsAnalyticsEvent =
  (typeof DISCOVERY_WORLDS_ANALYTICS_EVENTS)[number];

export function formatDiscoveryWorldsLogMessage(
  worldId: WorldId,
  event: DiscoveryWorldsAnalyticsEvent,
): string {
  return `discovery_worlds:${worldId}:${event}`;
}

export function buildDiscoveryWorldsAnalyticsMeta(
  worldId: WorldId,
  event: DiscoveryWorldsAnalyticsEvent,
  detail: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    event,
    module: "discovery_worlds",
    worldId,
    ...detail,
  };
}

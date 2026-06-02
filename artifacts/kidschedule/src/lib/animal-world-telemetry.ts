import { queueClientLog } from "@/lib/client-logs";

export type AnimalWorldAnalyticsEvent =
  | "animal_opened"
  | "sound_played"
  | "quiz_completed"
  | "favorite_added"
  | "favorite_removed"
  | "session_duration"
  | "mode_changed"
  | "category_opened"
  | "discovery_slide"
  | "hear_find_started"
  | "hear_find_completed"
  | "hear_find_accuracy"
  | "achievement_unlocked"
  | "sticker_earned"
  | "collection_xp"
  | "discovery_session_complete"
  | "offline_cache_warmed";

export function trackAnimalWorldEvent(
  event: AnimalWorldAnalyticsEvent,
  detail: Record<string, unknown> = {},
): void {
  queueClientLog({
    type: "info",
    message: `animal_world:${event}`,
    meta: { event, module: "animal_world", ...detail },
  });
}

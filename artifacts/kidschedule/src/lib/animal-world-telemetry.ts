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
  | "discovery_slide";

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

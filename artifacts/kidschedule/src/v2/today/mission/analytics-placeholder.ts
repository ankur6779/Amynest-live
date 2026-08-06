/**
 * @deprecated Sprint 3C-4 — use @/lib/analytics/v2-product emitters.
 * Kept as a thin shim so older imports do not bypass Analytics Core.
 */

import {
  emitV2MissionCompleted,
  emitV2MissionStarted,
} from "@/lib/analytics/v2-product";

export type TodayAnalyticsPlaceholderEvent =
  | "today_mission_started"
  | "today_mission_completed";

/** Routes legacy placeholder calls into Analytics Core product emitters. */
export function trackTodayPlaceholder(
  event: TodayAnalyticsPlaceholderEvent,
  payload?: Record<string, string>,
): void {
  const missionId = payload?.missionId ?? payload?.mission_id;
  if (!missionId) return;
  if (event === "today_mission_started") {
    emitV2MissionStarted({ missionId });
    return;
  }
  emitV2MissionCompleted({
    missionId,
    evaluateNorthStars: true,
  });
}

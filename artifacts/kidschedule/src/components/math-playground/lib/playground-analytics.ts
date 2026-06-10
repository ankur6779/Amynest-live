/**
 * Math Playground analytics — session/mode/voice events only. No child speech content.
 */

import { queueClientLog } from "@/lib/client-logs";

export type PlaygroundAnalyticsEvent =
  | "playground_session_start"
  | "playground_session_complete"
  | "playground_mode_selected"
  | "voice_round_start"
  | "voice_round_correct"
  | "voice_round_incorrect"
  | "voice_fallback_touch"
  | "mini_game_start"
  | "mini_game_complete"
  | "amy_reaction_triggered"
  | "object_delight_tap"
  | "parent_snapshot_generated"
  | "engagement_idle_reengage";

function emit(
  event: PlaygroundAnalyticsEvent,
  meta: Record<string, string | number | boolean | undefined>,
): void {
  queueClientLog({
    type: "info",
    message: `[math-playground] ${event}`,
    meta: { feature: "math_playground", event, ...meta },
  });
}

export function trackPlaygroundEvent(
  event: PlaygroundAnalyticsEvent,
  childId: number,
  meta?: Record<string, string | number | boolean | undefined>,
): void {
  emit(event, { childId, ...meta });
}

export function trackPlaygroundSessionStart(
  childId: number,
  activityId: string,
  playMode: "touch" | "voice" = "touch",
): void {
  trackPlaygroundEvent("playground_session_start", childId, { activityId, playMode });
}

export function trackPlaygroundSessionComplete(
  childId: number,
  meta: {
    activityId: string;
    playMode?: "touch" | "voice";
    tierUsed?: string;
    hintsUsed?: number;
    durationMs?: number;
    starsEarned?: number;
  },
): void {
  trackPlaygroundEvent("playground_session_complete", childId, meta);
}

export function trackParentSnapshotGenerated(
  childId: number,
  meta: {
    confidenceStars: number;
    recommendedActivityId: string;
    trend: string;
  },
): void {
  trackPlaygroundEvent("parent_snapshot_generated", childId, meta);
}

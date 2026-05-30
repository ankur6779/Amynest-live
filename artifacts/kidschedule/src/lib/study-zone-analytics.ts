import { queueClientLog } from "@/lib/client-logs";

export type StudyZoneAnalyticsEvent =
  | "study_zone_session_start"
  | "study_zone_session_end"
  | "study_zone_scroll_depth"
  | "study_zone_milestone_view"
  | "study_zone_achievement_view"
  | "study_zone_streak_view"
  | "study_zone_growth_dashboard_view"
  | "study_zone_future_reward_view"
  | "study_zone_success_projection_view"
  | "study_zone_reengagement_view"
  | "study_zone_reengagement_continue"
  | "study_zone_universe_map_view"
  | "study_zone_universe_map_node"
  | "study_zone_future_world_preview"
  | "study_zone_personalized_world_view"
  | "study_zone_curriculum_explorer_open"
  | "study_zone_world_preview_open";

const sessionStarts = new Map<number, number>();
const scrollDepthSent = new Map<number, number>();

export function trackStudyZoneEvent(
  event: StudyZoneAnalyticsEvent,
  childId: number,
  meta?: Record<string, string | number | boolean>,
): void {
  queueClientLog({
    type: "info",
    message: `study_zone:${event}`,
    context: "smart_study_zone",
    meta: { event, childId, ...meta },
  });
}

export function trackStudyZoneSessionStart(childId: number, mode: string): void {
  sessionStarts.set(childId, Date.now());
  trackStudyZoneEvent("study_zone_session_start", childId, { mode });
}

export function trackStudyZoneSessionEnd(childId: number, mode: string): void {
  const start = sessionStarts.get(childId);
  const durationMs = start ? Date.now() - start : 0;
  sessionStarts.delete(childId);
  trackStudyZoneEvent("study_zone_session_end", childId, {
    mode,
    durationMs,
    durationSec: Math.round(durationMs / 1000),
  });
}

/** Emit once per session at 25/50/75/100 scroll depth through retention sections. */
export function trackStudyZoneScrollDepth(childId: number, depthPct: number): void {
  const bucket = depthPct >= 100 ? 100 : depthPct >= 75 ? 75 : depthPct >= 50 ? 50 : depthPct >= 25 ? 25 : 0;
  if (bucket === 0) return;
  const prev = scrollDepthSent.get(childId) ?? 0;
  if (bucket <= prev) return;
  scrollDepthSent.set(childId, bucket);
  trackStudyZoneEvent("study_zone_scroll_depth", childId, { depthPct: bucket });
}

export function resetStudyZoneScrollTracking(childId: number): void {
  scrollDepthSent.delete(childId);
}

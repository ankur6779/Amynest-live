/**
 * Amy Health Lab™ analytics — session/quest/badge events. No medical claims in payloads.
 */

import { queueClientLog } from "@/lib/client-logs";

export type HealthLabAnalyticsEvent =
  | "health_lab_session_start"
  | "health_lab_session_complete"
  | "health_lab_session_abandon"
  | "health_lab_quest_complete"
  | "health_lab_badge_unlock"
  | "health_lab_master_badge_unlock"
  | "health_lab_level_up"
  | "health_lab_prestige_unlock"
  | "health_lab_streak_milestone"
  | "health_lab_cheat_detected"
  | "health_lab_dashboard_view"
  | "health_lab_shop_purchase"
  | "health_lab_avatar_equip"
  | "health_lab_treasure_open"
  | "health_lab_daily_surprise"
  | "health_lab_weekly_challenge_complete"
  | "health_lab_permission_denied"
  | "health_lab_simulation_mode"
  | "health_lab_sync_success"
  | "health_lab_sync_failure";

function emit(
  event: HealthLabAnalyticsEvent,
  meta: Record<string, string | number | boolean | undefined>,
): void {
  queueClientLog({
    type: "info",
    message: `[health-lab] ${event}`,
    meta: { feature: "health_lab", event, ...meta },
  });
}

export function trackHealthLabEvent(
  event: HealthLabAnalyticsEvent,
  childId: number,
  meta?: Record<string, string | number | boolean | undefined>,
): void {
  emit(event, { childId, ...meta });
}

export function trackSessionStart(childId: number, gameId: string): void {
  trackHealthLabEvent("health_lab_session_start", childId, { gameId });
}

export function trackSessionComplete(
  childId: number,
  meta: {
    gameId: string;
    score: number;
    xpEarned: number;
    durationMs: number;
    simulated?: boolean;
    cheatFlags?: string;
  },
): void {
  trackHealthLabEvent("health_lab_session_complete", childId, meta);
}

export function trackCheatDetected(
  childId: number,
  gameId: string,
  flags: string[],
): void {
  trackHealthLabEvent("health_lab_cheat_detected", childId, {
    gameId,
    cheatFlags: flags.join(","),
  });
}

export function trackSessionAbandon(childId: number, gameId: string): void {
  trackHealthLabEvent("health_lab_session_abandon", childId, { gameId });
}

export function trackPermissionDenied(childId: number, context: string): void {
  trackHealthLabEvent("health_lab_permission_denied", childId, { context });
}

export function trackPrestigeUnlock(childId: number, prestige: number): void {
  trackHealthLabEvent("health_lab_prestige_unlock", childId, { prestige });
}

export function trackMasterBadgeUnlock(childId: number, badgeId: string): void {
  trackHealthLabEvent("health_lab_master_badge_unlock", childId, { badgeId });
}

export function trackWeeklyChallengeComplete(childId: number, weekKey: string): void {
  trackHealthLabEvent("health_lab_weekly_challenge_complete", childId, { weekKey });
}

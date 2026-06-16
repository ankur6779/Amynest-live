import type { ProgressAnalyticsEvent } from "./types";

export const PROGRESS_ANALYTICS_EVENTS: ProgressAnalyticsEvent[] = [
  "journey_completed",
  "skill_unlocked",
  "daily_return",
  "next_session_opened",
  "worksheet_completed",
  "speech_improved",
  "phonics_mastered",
  "story_completion",
  "retention_day_1",
  "retention_day_7",
  "retention_day_30",
  "session_completed",
  "level_up",
  "comeback_started",
  "streak_recovered",
  "unlock_conversion",
  "session_quality_high",
  "fresh_lesson_assigned",
  "fresh_lesson_reopened",
  "fresh_lesson_advanced",
  "fresh_lesson_completed",
];

export interface AnalyticsPayload {
  event: ProgressAnalyticsEvent;
  childId: number;
  userId?: string;
  metadata?: Record<string, string | number | boolean>;
  ts?: string;
}

/** Shape sent to client analytics / server log ingest. */
export function buildAnalyticsEvent(
  event: ProgressAnalyticsEvent,
  childId: number,
  metadata?: Record<string, string | number | boolean>,
): AnalyticsPayload {
  return {
    event,
    childId,
    metadata,
    ts: new Date().toISOString(),
  };
}

export function retentionEventForDay(daysSinceSignup: number): ProgressAnalyticsEvent | null {
  if (daysSinceSignup === 1) return "retention_day_1";
  if (daysSinceSignup === 7) return "retention_day_7";
  if (daysSinceSignup === 30) return "retention_day_30";
  return null;
}

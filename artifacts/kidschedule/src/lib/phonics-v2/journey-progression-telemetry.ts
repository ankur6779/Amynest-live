/**
 * Reading Journey progression analytics.
 */
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import type { JourneyStageStatus } from "./journey-progression";
import type { PhonicsV2StageId } from "./content/journey-stages";

export type JourneyProgressionTelemetryEvent =
  | "journey_stage_opened"
  | "journey_stage_review"
  | "journey_stage_continue"
  | "journey_recommended_level_shown"
  | "journey_progression_migrated";

export function recordJourneyProgressionEvent(
  event: JourneyProgressionTelemetryEvent,
  payload: Record<string, string | number | boolean | null | undefined>,
): void {
  logAmyVoiceDiag(event, {
    module: "reading_journey",
    ...payload,
  });
}

export function trackJourneyStageSelect(
  stageId: PhonicsV2StageId,
  status: JourneyStageStatus,
  childId: number,
): void {
  const event: JourneyProgressionTelemetryEvent =
    status === "current_target"
      ? "journey_stage_continue"
      : status === "mastered" || status === "available_for_review"
        ? "journey_stage_review"
        : "journey_stage_opened";

  recordJourneyProgressionEvent(event, {
    stageId,
    status,
    childId,
  });
}

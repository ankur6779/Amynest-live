/**
 * Lightweight cost telemetry for infant-domain AI jobs.
 */
import { logger } from "../lib/logger.js";

export type InfantAiJobKind =
  | "infant_sleep_weekly_report"
  | "infant_feeding_plan"
  | "infant_assistant"
  | "infant_sleep_coach";

export type InfantAiCostEvent = {
  job: InfantAiJobKind;
  userId: string;
  childId?: number;
  model?: string;
  /** Rough token estimate (prompt + completion). */
  estimatedTokens: number;
  cached?: boolean;
  durationMs?: number;
};

export function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function logInfantAiCost(event: InfantAiCostEvent): void {
  logger.info(
    {
      evt: "infant_ai_cost",
      namespace: "[infant-ai-cost]",
      ...event,
    },
    "[infant-ai-cost] infant AI job completed",
  );
}

/**
 * Phase 7 — Recommendation quality scoring.
 *
 * Pure scoring of recommendation outcomes so we can answer "are Amy's
 * suggestions actually helping?". The host stores raw outcome events; we
 * derive an aggregate quality score on demand.
 */

export type RecommendationOutcomeKind =
  | "shown"
  | "accepted"
  | "completed"
  | "ignored"
  | "dismissed";

export interface RecommendationOutcomeEvent {
  recommendationId: string;
  kind: RecommendationOutcomeKind;
  /** ISO timestamp. */
  at: string;
}

export interface RecommendationQualityScore {
  shown: number;
  accepted: number;
  completed: number;
  ignored: number;
  dismissed: number;
  /** 0..1 — fraction of shown that were accepted. */
  acceptanceRate: number;
  /** 0..1 — fraction of accepted that completed. */
  completionRate: number;
  /** -1..1 — overall quality signal (positive = useful). */
  effectiveness: number;
  /** True when the learner is ignoring repeatedly — call sites should pause. */
  fatigueRisk: boolean;
}

export function scoreRecommendationOutcomes(
  events: RecommendationOutcomeEvent[],
): RecommendationQualityScore {
  let shown = 0;
  let accepted = 0;
  let completed = 0;
  let ignored = 0;
  let dismissed = 0;
  for (const e of events) {
    switch (e.kind) {
      case "shown":
        shown += 1;
        break;
      case "accepted":
        accepted += 1;
        break;
      case "completed":
        completed += 1;
        break;
      case "ignored":
        ignored += 1;
        break;
      case "dismissed":
        dismissed += 1;
        break;
    }
  }
  const acceptanceRate = shown > 0 ? accepted / shown : 0;
  const completionRate = accepted > 0 ? completed / accepted : 0;
  const negative = (ignored + dismissed) / Math.max(1, shown);
  const positive = acceptanceRate * 0.5 + completionRate * 0.5;
  const effectiveness = Math.max(-1, Math.min(1, positive - negative));

  // Fatigue heuristic: 4+ ignores AND acceptance below 25%.
  const fatigueRisk = ignored >= 4 && acceptanceRate < 0.25;

  return {
    shown,
    accepted,
    completed,
    ignored,
    dismissed,
    acceptanceRate,
    completionRate,
    effectiveness,
    fatigueRisk,
  };
}

/** Human-readable label for dashboards / debug surfaces. */
export function qualityLabel(score: RecommendationQualityScore): string {
  if (score.shown === 0) return "no signal yet";
  if (score.effectiveness >= 0.5) return "helpful";
  if (score.effectiveness >= 0.2) return "useful";
  if (score.effectiveness >= -0.1) return "neutral";
  return "noisy";
}

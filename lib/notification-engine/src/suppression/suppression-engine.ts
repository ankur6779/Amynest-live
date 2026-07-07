import type { Decision } from "../decision/decision-engine.js";
import type { QualityEvaluation } from "../quality/quality-ai.js";
import type { DiversityAssessment } from "../diversity/diversity-engine.js";

export type SuppressionReason =
  | "user_active_now"
  | "recently_completed_task"
  | "duplicate_exists"
  | "fatigue_high"
  | "conversion_probability_low"
  | "sleep_hours"
  | "seen_elsewhere"
  | "quality_below_threshold"
  | "content_repetitive"
  | "negative_expected_value";

export interface SuppressionInput {
  /** Result of the expected-value decision engine (required). */
  decision: Decision;
  /** Copy quality evaluation (optional — skipped if not provided). */
  quality?: QualityEvaluation | null;
  /** Content diversity assessment (optional). */
  diversity?: DiversityAssessment | null;
  /** User is interacting with the app right now. */
  userActiveNow?: boolean;
  /** User completed the exact task this notification would prompt. */
  recentlyCompletedTask?: boolean;
  /** An equivalent notification is already queued/sent (dedup). */
  duplicateExists?: boolean;
  /** Local time falls within the user's sleep window. */
  inSleepHours?: boolean;
  /** The same message was surfaced on another channel (email/in-app). */
  seenElsewhere?: boolean;
  /** Conversion candidate whose modeled probability is extremely low. */
  conversionProbability?: number | null;
}

export interface SuppressionVerdict {
  suppress: boolean;
  /** The single decisive reason (first hard match), or null when allowed. */
  reason: SuppressionReason | null;
  /** Every reason that matched — logged for analytics. */
  reasons: SuppressionReason[];
}

const CONVERSION_PROBABILITY_FLOOR = 0.05;

/**
 * Single, auditable suppression decision that composes every soft/hard signal.
 * Ordered by severity so the returned `reason` is the most decisive one. Pure
 * and side-effect free — the caller is responsible for logging the verdict.
 */
export function evaluateSuppression(input: SuppressionInput): SuppressionVerdict {
  const reasons: SuppressionReason[] = [];

  // Hard contextual blocks first.
  if (input.inSleepHours) reasons.push("sleep_hours");
  if (input.userActiveNow) reasons.push("user_active_now");
  if (input.duplicateExists) reasons.push("duplicate_exists");
  if (input.seenElsewhere) reasons.push("seen_elsewhere");
  if (input.recentlyCompletedTask) reasons.push("recently_completed_task");

  // Quality / diversity gates.
  if (input.quality && !input.quality.passed) reasons.push("quality_below_threshold");
  if (input.diversity && input.diversity.repetitive) reasons.push("content_repetitive");

  // Fatigue + expected value from the decision engine.
  if (input.decision.reason === "fatigue_critical") reasons.push("fatigue_high");
  if (!input.decision.send) reasons.push("negative_expected_value");

  // Extremely low conversion probability (monetization only).
  if (
    input.conversionProbability != null &&
    input.conversionProbability < CONVERSION_PROBABILITY_FLOOR
  ) {
    reasons.push("conversion_probability_low");
  }

  // De-dup while preserving severity order.
  const ordered = dedupePreserveOrder(reasons);
  return {
    suppress: ordered.length > 0,
    reason: ordered[0] ?? null,
    reasons: ordered,
  };
}

function dedupePreserveOrder(items: SuppressionReason[]): SuppressionReason[] {
  const seen = new Set<SuppressionReason>();
  const out: SuppressionReason[] = [];
  for (const i of items) {
    if (!seen.has(i)) {
      seen.add(i);
      out.push(i);
    }
  }
  return out;
}

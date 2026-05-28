/**
 * Continuous Optimization — Human review snapshots.
 *
 * Builds small, structured snapshots of *emotional surfaces* (AI tutor
 * outputs, recommendation copy, reward pacing, comeback messages,
 * onboarding) for internal QA. The snapshots are designed to be reviewed
 * by a human reviewer or attached to a Slack/email digest.
 *
 * No new state — this composes existing engine outputs into a review
 * payload, applies guardrails, and flags samples that need eyes.
 */

import { applyAiGuardrails, type GuardrailViolation } from "./ai-guardrails";

export type ReviewSurface =
  | "ai_tutor"
  | "recommendations"
  | "emotional_copy"
  | "comeback_messages"
  | "reward_pacing"
  | "onboarding"
  | "premium_prompt";

export interface ReviewSample {
  surface: ReviewSurface;
  /** Short stable id so reviewers can cross-reference. */
  id: string;
  text: string;
  /** Optional context — never PII. */
  context?: Record<string, string | number | boolean>;
}

export interface ReviewedSample extends ReviewSample {
  violations: GuardrailViolation[];
  needsReview: boolean;
  /** Reviewer note hint — what to look for. */
  reviewPrompt: string;
}

export interface HumanReviewSnapshot {
  generatedAt: string;
  samples: ReviewedSample[];
  /** Count of samples that triggered guardrails. */
  flaggedCount: number;
}

function reviewPromptFor(surface: ReviewSurface): string {
  switch (surface) {
    case "ai_tutor":
      return "Does Amy sound warm, age-appropriate, and free of clinical / urgent language?";
    case "recommendations":
      return "Is the why-string short, human, and free of algorithmic jargon?";
    case "emotional_copy":
      return "Does this read warm and parent-safe, with no comparison or guilt?";
    case "comeback_messages":
      return "Does this welcome the family back without making them feel they failed?";
    case "reward_pacing":
      return "Is the celebration proportional to the moment — not overwhelming?";
    case "onboarding":
      return "Does this lower anxiety in the first 60 seconds?";
    case "premium_prompt":
      return "Does this frame premium as a deepening, not a loss?";
  }
}

/**
 * Run guardrails on a set of samples and decide which ones need a human
 * to look at them. A sample is flagged whenever guardrails strip
 * anything, or when the text exceeds a soft length budget for the
 * surface.
 */
export function buildHumanReviewSnapshot(samples: ReviewSample[]): HumanReviewSnapshot {
  const reviewed: ReviewedSample[] = samples.map((s) => {
    const guard = applyAiGuardrails(s.text);
    const tooLong = s.text.length > softLengthBudget(s.surface);
    const needsReview = guard.violations.length > 0 || tooLong;
    return {
      ...s,
      violations: guard.violations,
      needsReview,
      reviewPrompt: reviewPromptFor(s.surface),
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    samples: reviewed,
    flaggedCount: reviewed.filter((r) => r.needsReview).length,
  };
}

function softLengthBudget(surface: ReviewSurface): number {
  switch (surface) {
    case "ai_tutor":
      return 800;
    case "recommendations":
      return 140;
    case "emotional_copy":
      return 220;
    case "comeback_messages":
      return 200;
    case "reward_pacing":
      return 120;
    case "onboarding":
      return 200;
    case "premium_prompt":
      return 220;
  }
}

/**
 * Convenience: format a snapshot into a short, human-friendly digest
 * suitable for an email/slack message. Pure function — no I/O.
 */
export function formatReviewDigest(snapshot: HumanReviewSnapshot): string {
  const lines: string[] = [];
  lines.push(`Human review · ${snapshot.generatedAt}`);
  lines.push(`Flagged: ${snapshot.flaggedCount} / ${snapshot.samples.length}`);
  for (const s of snapshot.samples) {
    if (!s.needsReview) continue;
    lines.push("");
    lines.push(`• ${s.surface} · ${s.id}`);
    lines.push(`  ${truncate(s.text, 120)}`);
    if (s.violations.length > 0) {
      lines.push(`  flags: ${s.violations.map((v) => v.category).join(", ")}`);
    }
    lines.push(`  review: ${s.reviewPrompt}`);
  }
  return lines.join("\n");
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

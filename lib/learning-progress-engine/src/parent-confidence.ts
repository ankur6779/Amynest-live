/**
 * Continuous Optimization — Parent confidence engine.
 *
 * Generates short, warm reassurance lines for parents. Reads existing
 * profile + memory; never invents claims about a child's development.
 *
 * Rules:
 *  - No diagnostic / medical language (already enforced by ai-guardrails).
 *  - Never compares children to peers.
 *  - Always frames consistency, not perfection, as the win.
 *  - One line at a time — return the most relevant.
 */

import type { LearningProgressProfile } from "./types";
import type { LearningMemory } from "./learning-memory";

export type ParentConfidenceTone =
  | "reassurance"
  | "acknowledgment"
  | "consistency_praise"
  | "calm_encouragement"
  | "tiny_progress";

export interface ParentConfidenceLine {
  tone: ParentConfidenceTone;
  text: string;
  /** Optional rationale — for debug/observability only, never rendered. */
  reason: string;
}

export interface ParentConfidenceInput {
  profile: LearningProgressProfile;
  memory: LearningMemory;
  /** Optional parent-facing childName for personalization. */
  childName?: string;
  /** Optional: surface where this line will appear. Keeps phrasing short on small surfaces. */
  surface?: "dashboard" | "session_complete" | "comeback" | "notification";
}

const NAME = (n?: string) => (n && n.trim() ? n : "your child");

/**
 * Returns the most relevant reassurance for the current moment, or `null`
 * when we don't have enough signal to say something meaningful.
 */
export function buildParentConfidenceLine(
  input: ParentConfidenceInput,
): ParentConfidenceLine | null {
  const name = NAME(input.childName);
  const p = input.profile;
  const m = input.memory;
  const short = input.surface === "notification" || input.surface === "comeback";

  // ── Tiny progress is the most undervalued signal — surface it first. ──
  if (p.streakDays >= 1 && p.completedActivities.length <= 5) {
    return {
      tone: "tiny_progress",
      reason: "early_journey_first_steps",
      text: short
        ? "Small starts count."
        : `Small starts count — ${name}'s rhythm is already forming.`,
    };
  }

  // ── Long quiet consistency. ──
  if (p.streakDays >= 14) {
    return {
      tone: "consistency_praise",
      reason: "long_streak",
      text: short
        ? "Quiet consistency is real progress."
        : `Two weeks of quiet rhythm — this is the kind of consistency that builds confidence.`,
    };
  }
  if (p.streakDays >= 7) {
    return {
      tone: "consistency_praise",
      reason: "week_streak",
      text: short
        ? "A full week of rhythm — beautiful."
        : `A full week of rhythm. The quiet kind of progress is the strongest.`,
    };
  }

  // ── Recent mastery jump. ──
  if (m.masteredSkills.length >= 3) {
    return {
      tone: "acknowledgment",
      reason: "mastered_skills",
      text: short
        ? `${name} is steadily building skills.`
        : `${name} is steadily mastering new skills — what you're doing is working.`,
    };
  }

  // ── Returning learner. ──
  if (p.streakDays >= 1 && m.sessionStreakDays === 0) {
    return {
      tone: "reassurance",
      reason: "warm_return",
      text: short
        ? `${name} came back — that's a win.`
        : `${name} came back — that quietly takes courage. You're doing it right.`,
    };
  }

  // ── Calm encouragement when nothing else applies. ──
  if (p.streakDays >= 3) {
    return {
      tone: "calm_encouragement",
      reason: "early_rhythm",
      text: short
        ? "Steady is winning."
        : `Steady, small, daily — that's the rhythm that lasts.`,
    };
  }

  if (p.completedActivities.length === 0) return null;

  return {
    tone: "reassurance",
    reason: "default_warmth",
    text: short
      ? "Showing up is the win."
      : `Showing up — that's the part that matters most.`,
  };
}

/**
 * A small set of safe fall-back lines for hosts that need a constant
 * supply (e.g. notification rotation). Never includes guilt, urgency,
 * or comparison.
 */
export const PARENT_CONFIDENCE_FALLBACKS: readonly string[] = [
  "Small consistent sessions are helping.",
  "Your child's learning rhythm is growing steadily.",
  "Confidence improves quietly over time.",
  "Calm consistency is the strongest kind of progress.",
  "You're shaping a gentle learning rhythm — that's the win.",
];

/**
 * Parent Cognition Insights (Phase 8) — framework-agnostic.
 *
 * Translates a session's learning events into warm, cognition-focused
 * statements a parent actually cares about — understanding, strategy use and
 * confidence growth — never "screen time" or "engagement" vanity metrics.
 */

import type { MathStrategy } from "./visual-engine.js";

export interface LearningSessionEvent {
  trickId: string;
  title?: string;
  operation: string;
  strategy?: MathStrategy;
  /** The child watched / built the concept visually to the end. */
  solvedVisually: boolean;
  /** The child asked to see the reasoning again. */
  usedThinkingReplay: boolean;
  /** Abstraction level in play (0 concrete … 1 symbolic). */
  abstractionLevel: number;
  /** Quiz outcome, if a check was attempted. */
  correct?: boolean;
  at: number;
}

export interface ParentInsight {
  id: string;
  text: string;
  tone: "growth" | "mastery" | "encouragement";
}

const STRATEGY_LABEL: Record<MathStrategy, string> = {
  count_all: "counting all",
  count_on: "counting on",
  doubling: "the Doubles strategy",
  double_then_add_one: "the Near-Double strategy",
  take_away: "take-away subtraction",
  equal_groups: "equal-groups multiplication",
  equal_sharing: "equal sharing",
};

function name(childName?: string): string {
  const n = (childName ?? "").trim();
  return n || "Your child";
}

/**
 * Build up to four cognition insights from this session's events. Ordered by
 * importance: independent strategy use → concrete→abstract transition →
 * visual solving volume → reasoning revisits.
 */
export function buildParentInsights(
  events: LearningSessionEvent[],
  childName?: string,
): ParentInsight[] {
  const who = name(childName);
  const out: ParentInsight[] = [];
  if (events.length === 0) return out;

  // 1) Independent strategy use (first-try correct on a strategy trick).
  const independentStrategies = new Set<MathStrategy>();
  for (const e of events) {
    if (e.strategy && e.correct && e.solvedVisually) independentStrategies.add(e.strategy);
  }
  for (const strat of independentStrategies) {
    out.push({
      id: `strategy:${strat}`,
      text: `${who} independently used ${STRATEGY_LABEL[strat]}.`,
      tone: "mastery",
    });
  }

  // 2) Concrete → abstract transition.
  const abstractionVals = events.map((e) => e.abstractionLevel).filter((n) => Number.isFinite(n));
  if (abstractionVals.length >= 2) {
    const first = abstractionVals.slice(0, Math.ceil(abstractionVals.length / 2));
    const last = abstractionVals.slice(Math.floor(abstractionVals.length / 2));
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    if (avg(last) - avg(first) >= 0.12) {
      out.push({
        id: "transition",
        text: `${who} is moving from concrete counting toward mental shortcuts.`,
        tone: "growth",
      });
    } else if (avg(abstractionVals) >= 0.7) {
      out.push({
        id: "abstract",
        text: `${who} is comfortable working with numbers symbolically.`,
        tone: "mastery",
      });
    }
  }

  // 3) Visual solving volume.
  const visualSolves = events.filter((e) => e.solvedVisually).length;
  if (visualSolves >= 3) {
    out.push({
      id: "visual-volume",
      text: `${who} worked through ${visualSolves} problems visually today.`,
      tone: "growth",
    });
  }

  // 4) Revisiting reasoning is a healthy learning behaviour.
  if (events.some((e) => e.usedThinkingReplay)) {
    out.push({
      id: "reasoning",
      text: `${who} chose to revisit the reasoning — a sign of deep, careful thinking.`,
      tone: "encouragement",
    });
  }

  // Gentle fallback so the card is never empty when there was activity.
  if (out.length === 0 && visualSolves > 0) {
    out.push({
      id: "explore",
      text: `${who} explored math visually and is building number sense.`,
      tone: "encouragement",
    });
  }

  return out.slice(0, 4);
}

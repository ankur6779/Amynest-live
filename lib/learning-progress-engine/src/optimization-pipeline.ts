/**
 * Continuous Optimization — Master pipeline.
 *
 * Composes the existing optimization signals into a single, structured
 * report so the host can:
 *   - track real-world quality over time
 *   - decide which experiments / flags to enable
 *   - know whether to ship a behavior change at all
 *
 * Pure derivation. No new persistent state. No new dashboards — hosts
 * may render this in the existing internal debug surface.
 */

import type { RecommendationQualityScore } from "./recommendation-quality";
import type { LearningEffectivenessReport } from "./learning-effectiveness";
import type { PlatformHealthScore } from "./platform-health";
import type { OptimizedBehavior } from "./behavior-optimizer";

export type OptimizationVerdict = "ship" | "watch" | "hold";

export interface OptimizationSignals {
  /** D7 retention 0..1. */
  d7Retention?: number;
  /** D30 retention 0..1. */
  d30Retention?: number;
  /** 0..1 — fraction of onboarding starts that completed all steps. */
  onboardingCompletion?: number;
  /** 0..1 — premium conversion within the trial window. */
  premiumConversion?: number;
  /** 0..1 — fraction of sessions completed (not abandoned). */
  sessionCompletion?: number;
  /** 0..1 — fraction of children returning after a 3+ day gap. */
  comebackSuccess?: number;
  /** Count of burnout signals raised. */
  burnoutSignals?: number;
  /** Optional pre-computed sub-scores. */
  recommendation?: RecommendationQualityScore;
  effectiveness?: LearningEffectivenessReport;
  health?: PlatformHealthScore;
  /** Current behavior optimizer output, if available. */
  behavior?: OptimizedBehavior;
}

export interface OptimizationReport {
  verdict: OptimizationVerdict;
  /** 0..100 — composite quality score. */
  score: number;
  /** Sub-scores. */
  scores: {
    onboarding: number;
    conversion: number;
    sessions: number;
    comeback: number;
    recommendation: number;
    effectiveness: number;
    health: number;
    safety: number;
  };
  /** Short, parent-team-friendly notes. */
  notes: string[];
  /** Top 3 concrete suggestions for the next iteration. */
  suggestions: string[];
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function ratioScore(value: number | undefined, base: number): number {
  if (value == null) return base;
  return clamp(value * 100);
}

function effectivenessScore(r?: LearningEffectivenessReport): number {
  if (!r) return 60;
  if (r.label === "no_signal") return 50;
  // Weighted: retention + trend + stability.
  const base =
    r.retentionRate * 50 +
    Math.max(0, r.confidenceTrend) * 30 +
    r.masteryStability * 20;
  return clamp(base);
}

function recommendationScore(r?: RecommendationQualityScore): number {
  if (!r || r.shown === 0) return 60;
  return clamp(((r.effectiveness + 1) / 2) * 100);
}

function safetyScore(signals: OptimizationSignals): number {
  const bs = signals.burnoutSignals ?? 0;
  if (bs > 50) return 10;
  if (bs > 20) return 40;
  if (bs > 5) return 70;
  return 100;
}

export function buildOptimizationReport(signals: OptimizationSignals): OptimizationReport {
  const onboarding = ratioScore(signals.onboardingCompletion, 60);
  const conversion = ratioScore(signals.premiumConversion, 35);
  const sessions = ratioScore(signals.sessionCompletion, 70);
  const comeback = ratioScore(signals.comebackSuccess, 50);
  const recommendation = recommendationScore(signals.recommendation);
  const effectiveness = effectivenessScore(signals.effectiveness);
  const health = signals.health?.score ?? 70;
  const safety = safetyScore(signals);

  // Composite — safety + effectiveness weight heaviest, conversion is small.
  const score = clamp(
    safety * 0.2 +
      effectiveness * 0.2 +
      sessions * 0.15 +
      health * 0.15 +
      onboarding * 0.1 +
      comeback * 0.1 +
      recommendation * 0.05 +
      conversion * 0.05,
  );

  const notes: string[] = [];
  const suggestions: string[] = [];

  // ── Safety always speaks first. ──
  if (safety < 70) {
    notes.push("Burnout signals are elevated — slow celebrations and reduce recommendation cadence.");
    suggestions.push("Enable `celebration_intensity_low` flag for affected cohorts.");
  }

  // ── Effectiveness. ──
  if (signals.effectiveness?.label === "watch") {
    notes.push("Real learning effectiveness is dipping — review forgotten-skill recovery.");
    suggestions.push("Increase reinforcement-focused recommendations for one week.");
  }
  if (signals.effectiveness?.label === "growing") {
    notes.push("Effectiveness is improving — current pacing is working.");
  }

  // ── Recommendations. ──
  if (signals.recommendation?.fatigueRisk) {
    notes.push("Recommendation fatigue detected — pause optional cards for 24h.");
    suggestions.push("Cap recommendation surface to 2 cards while fatigue is active.");
  }

  // ── Conversion (low-priority — never the main driver). ──
  if (conversion < 25) {
    suggestions.push("Tune `premium-conversion` prompts to milestone-aligned moments only.");
  }

  // ── Onboarding. ──
  if (onboarding < 55) {
    notes.push("Onboarding completion is below target — consider `quick_start` mode.");
    suggestions.push("Promote `adaptive-onboarding` `quick_start` for low-time parents.");
  }

  // ── Comeback. ──
  if (comeback < 35) {
    notes.push("Comeback success is low — soften re-entry sessions further.");
    suggestions.push("Pair `first-session-flow` with comeback path for inactive learners.");
  }

  // ── Verdict ──
  let verdict: OptimizationVerdict = "ship";
  if (safety < 60 || effectiveness < 40 || score < 55) verdict = "hold";
  else if (score < 70) verdict = "watch";

  // Tail: cap to 3 concrete suggestions.
  return {
    verdict,
    score: Math.round(score),
    scores: {
      onboarding: Math.round(onboarding),
      conversion: Math.round(conversion),
      sessions: Math.round(sessions),
      comeback: Math.round(comeback),
      recommendation: Math.round(recommendation),
      effectiveness: Math.round(effectiveness),
      health: Math.round(health),
      safety: Math.round(safety),
    },
    notes,
    suggestions: suggestions.slice(0, 3),
  };
}

/**
 * A small human label for the verdict — useful in the debug page header.
 */
export function verdictLabel(report: OptimizationReport): string {
  switch (report.verdict) {
    case "ship":
      return "Quality is healthy — safe to continue tuning.";
    case "watch":
      return "Watch closely — pause aggressive rollouts.";
    case "hold":
      return "Hold — fix safety / effectiveness before iterating.";
  }
}

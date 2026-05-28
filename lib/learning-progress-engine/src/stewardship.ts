/**
 * Stewardship Era — Final platform principles, expressed as code.
 *
 * This file is deliberately small. It does NOT add an engine, a dashboard,
 * or a parallel system. It encodes AmyNest's product principles as a
 * single, pure reviewer that any proposed feature / flag / copy /
 * animation can be put through before it ships.
 *
 * USE:
 *   - In review tooling, scripts, or the internal `/debug/learning` page.
 *   - In tests guarding new code paths.
 *   - In PR bots, when introduced.
 *
 * The principles are the same ones encoded in ARCHITECTURE.md. This file
 * exists so contributors (human or AI) can ask, in code, "does this
 * respect the platform?".
 */

import { applyAiGuardrails } from "./ai-guardrails";

/** The thirteen Stewardship principles, in declared order. */
export const STEWARDSHIP_PRINCIPLES = [
  "protect_simplicity",
  "preserve_one_coherent_system",
  "optimize_for_trust",
  "amy_human_calm_not_dependent",
  "respect_quietness",
  "long_term_growth",
  "feature_discipline_depth_over_breadth",
  "emotional_safety",
  "explainability",
  "performance_as_a_feature",
  "philosophy_protection",
  "measure_what_matters",
  "true_product_identity",
] as const;

export type StewardshipPrinciple = (typeof STEWARDSHIP_PRINCIPLES)[number];

export type StewardshipVerdict = "ship" | "revise" | "reject";

export type ProposalSurface =
  | "feature"
  | "flag"
  | "experiment"
  | "ui_component"
  | "copy"
  | "animation"
  | "notification"
  | "metric"
  | "engine"
  | "dashboard"
  | "personalization";

export interface StewardshipProposal {
  /** Short kebab-case name, e.g. `daily_streak_pressure_card`. */
  name: string;
  /** What surface this proposal affects. */
  surface: ProposalSurface;
  /** One-sentence description in the contributor's own words. */
  description: string;
  /** Optional copy snippet — runs through guardrails. */
  copy?: string;
  /** When true, the proposal adds a wholly new engine / dashboard / system. */
  addsNewSystem?: boolean;
  /** When true, the proposal introduces local unlock / reward / motion / personalization logic. */
  introducesLocalLogic?: boolean;
  /** When true, the proposal is gated on a feature flag. */
  behindFeatureFlag?: boolean;
  /** When true, the proposal goes through the existing reward bus / sync engine / experience system. */
  usesSharedSystems?: boolean;
  /** When true, the proposal can be silent — celebrates only when meaningful. */
  respectsQuietness?: boolean;
  /** When true, every behavior the proposal triggers can be explained in one human sentence. */
  isExplainable?: boolean;
  /** When true, the proposal degrades gracefully on low-end devices / reduced motion. */
  respectsPerformance?: boolean;
  /** When true, the proposal optimizes for engagement spikes / streak pressure / urgency. */
  optimizesForCompulsion?: boolean;
}

export interface StewardshipFlag {
  principle: StewardshipPrinciple;
  message: string;
  severity: "block" | "revise" | "watch";
}

export interface StewardshipReview {
  verdict: StewardshipVerdict;
  flags: StewardshipFlag[];
  /** Suggestions to take the proposal from `revise`/`reject` back to `ship`. */
  suggestions: string[];
}

/** Copy patterns that violate emotional safety / quietness. */
const COMPULSION_PATTERNS = [
  /\bdon'?t lose\b/i,
  /\bact now\b/i,
  /\bhurry\b/i,
  /\blast chance\b/i,
  /\bstreak (broken|expires|lost)\b/i,
  /\bmissed (your|the)\b/i,
  /\bcompared? to (other|peers)\b/i,
  /\bahead of\b/i,
  /\bbehind (your|the|other)\b/i,
];

/** Words that suggest opaque / algorithmic copy. */
const OPACITY_PATTERNS = [
  /\balgorithm\b/i,
  /\bmodel says\b/i,
  /\bscore of \d+\.\d+\b/i,
  /\bbayesian\b/i,
];

/**
 * Run the stewardship review for a proposal. Pure, deterministic, and
 * never throws — even on malformed input.
 */
export function reviewStewardship(proposal: StewardshipProposal): StewardshipReview {
  const flags: StewardshipFlag[] = [];
  const suggestions: string[] = [];

  // ── 1) Protect simplicity ──
  if (proposal.surface === "engine" || proposal.addsNewSystem) {
    flags.push({
      principle: "preserve_one_coherent_system",
      severity: "block",
      message:
        "Adds a new engine / system. The platform already has progression, experience, sync, reward bus, optimizer, and guardrails.",
    });
    suggestions.push(
      "Derive the new behavior from existing state (profile + memory + skillGraph + phase3) instead of a new system.",
    );
  }
  if (proposal.surface === "dashboard") {
    flags.push({
      principle: "feature_discipline_depth_over_breadth",
      severity: "block",
      message:
        "Adds a new dashboard. Render inside the existing /debug/learning surface or extend parent-growth instead.",
    });
    suggestions.push(
      "Compose the new view inside existing surfaces (/debug/learning or parent-growth).",
    );
  }
  if (proposal.surface === "personalization" && !proposal.usesSharedSystems) {
    flags.push({
      principle: "preserve_one_coherent_system",
      severity: "block",
      message:
        "Personalization must go through behavior-optimizer / developmental-pacing / adaptive-routing.",
    });
    suggestions.push("Route through the existing personalization path; do not add a parallel one.");
  }

  // ── 2) No local logic for unlocks/rewards/motion/personalization ──
  if (proposal.introducesLocalLogic) {
    flags.push({
      principle: "preserve_one_coherent_system",
      severity: "block",
      message:
        "Introduces local unlock / reward / motion / personalization logic. Use the shared platform.",
    });
    suggestions.push(
      "Replace local logic with getUnlocks(), the reward bus, the experience system, or adaptive-routing.",
    );
  }
  if (proposal.usesSharedSystems === false && proposal.surface !== "copy") {
    flags.push({
      principle: "preserve_one_coherent_system",
      severity: "revise",
      message:
        "Does not declare itself to use shared systems (experience-system / sync engine / reward bus).",
    });
    suggestions.push("Mark `usesSharedSystems: true` once wired through the platform.");
  }

  // ── 3) Optimize for trust — no compulsion mechanics ──
  if (proposal.optimizesForCompulsion) {
    flags.push({
      principle: "long_term_growth",
      severity: "block",
      message:
        "Optimizes for compulsion / urgency / streak pressure. Optimize for calm consistency instead.",
    });
    suggestions.push("Re-frame around calm rhythm; never around fear of loss.");
  }

  // ── 4) Behind a flag (rule 17 in ARCHITECTURE.md) ──
  if (
    !proposal.behindFeatureFlag &&
    ["feature", "experiment", "personalization", "animation"].includes(proposal.surface)
  ) {
    flags.push({
      principle: "philosophy_protection",
      severity: "revise",
      message: "Behavioral changes must ship behind a feature flag.",
    });
    suggestions.push("Wrap the rollout in a `feature-flags.ts` rule with staged percentage.");
  }

  // ── 5) Quietness ──
  if (proposal.respectsQuietness === false) {
    flags.push({
      principle: "respect_quietness",
      severity: "revise",
      message:
        "Does not respect quietness — silence is part of premium UX. Not every moment needs copy/glow/sound.",
    });
    suggestions.push(
      "Use rewardIntensity() / living-companion to decide when staying silent is the right answer.",
    );
  }

  // ── 6) Explainability ──
  if (proposal.isExplainable === false) {
    flags.push({
      principle: "explainability",
      severity: "block",
      message:
        "Not explainable in one human sentence. Behavioral systems must be reviewable and auditable.",
    });
    suggestions.push(
      "Provide a parent-readable reason via recommendation-explanations or emotional-copy.",
    );
  }

  // ── 7) Performance ──
  if (proposal.respectsPerformance === false) {
    flags.push({
      principle: "performance_as_a_feature",
      severity: "revise",
      message:
        "Does not degrade gracefully on low-end devices / reduced motion.",
    });
    suggestions.push(
      "Consult visualBudget() / tierTransition() and respect useReducedMotion().",
    );
  }

  // ── 8) Copy review — emotional safety + opacity + guardrails ──
  if (proposal.copy && proposal.copy.trim().length > 0) {
    const guard = applyAiGuardrails(proposal.copy);
    if (!guard.safe) {
      flags.push({
        principle: "emotional_safety",
        severity: "block",
        message: `Copy violates guardrails (${guard.violations.map((v) => v.category).join(", ")}).`,
      });
      suggestions.push(`Rewrite copy to: "${guard.text}".`);
    }
    for (const re of COMPULSION_PATTERNS) {
      if (re.test(proposal.copy)) {
        flags.push({
          principle: "emotional_safety",
          severity: "block",
          message: "Copy contains compulsion / urgency / comparison language.",
        });
        suggestions.push(
          "Re-write without `act now` / `don't lose` / streak-pressure / peer comparisons.",
        );
        break;
      }
    }
    for (const re of OPACITY_PATTERNS) {
      if (re.test(proposal.copy)) {
        flags.push({
          principle: "explainability",
          severity: "revise",
          message: "Copy uses algorithmic / opaque language.",
        });
        suggestions.push(
          "Replace technical phrasing with one warm, human sentence the parent can read.",
        );
        break;
      }
    }
  }

  // ── Verdict ──
  const hasBlock = flags.some((f) => f.severity === "block");
  const hasRevise = flags.some((f) => f.severity === "revise");
  const verdict: StewardshipVerdict = hasBlock ? "reject" : hasRevise ? "revise" : "ship";

  return {
    verdict,
    flags,
    suggestions: Array.from(new Set(suggestions)),
  };
}

/**
 * Convenience predicate: short-circuit when the proposal is clearly safe.
 * Useful in CI tooling that wants a single boolean.
 */
export function passesStewardship(proposal: StewardshipProposal): boolean {
  return reviewStewardship(proposal).verdict === "ship";
}

/**
 * Format a review into a digest string for PR comments / Slack messages.
 * Pure function — no I/O.
 */
export function formatStewardshipDigest(
  proposal: StewardshipProposal,
  review: StewardshipReview,
): string {
  const lines: string[] = [];
  lines.push(`Stewardship review · ${proposal.name} · ${review.verdict.toUpperCase()}`);
  lines.push(`Surface: ${proposal.surface}`);
  lines.push(`Description: ${proposal.description}`);
  if (review.flags.length === 0) {
    lines.push("");
    lines.push("No flags — this proposal respects the platform.");
  } else {
    lines.push("");
    lines.push("Flags:");
    for (const f of review.flags) {
      lines.push(`  · [${f.severity}] ${f.principle} — ${f.message}`);
    }
  }
  if (review.suggestions.length > 0) {
    lines.push("");
    lines.push("Suggestions:");
    for (const s of review.suggestions) {
      lines.push(`  - ${s}`);
    }
  }
  return lines.join("\n");
}

/**
 * The Stewardship Era doctrine, available in code so tooling and docs
 * stay in sync. Each principle maps to a single, immutable sentence.
 */
export const STEWARDSHIP_DOCTRINE: Readonly<Record<StewardshipPrinciple, string>> = {
  protect_simplicity:
    "As intelligence grows, simplicity must increase. If a change reduces clarity, do not ship it.",
  preserve_one_coherent_system:
    "No local unlock / reward / motion / emotional / personalization / onboarding logic — everything derives from the shared platform.",
  optimize_for_trust:
    "Reliability, honesty, explainability, calmness, restraint, safety, and consistency always over engagement spikes.",
  amy_human_calm_not_dependent:
    "Amy is warm, observant, supportive — not needy, guilt-inducing, dependency-forming, or overly humanized.",
  respect_quietness:
    "Silence is part of premium UX. Not every session, milestone, return, or recommendation needs copy, glow, or sound.",
  long_term_growth:
    "Never optimize for daily addiction or compulsive streaks. Optimize for sustainable, multi-year family growth.",
  feature_discipline_depth_over_breadth:
    "Depth beats breadth. Prefer refinement, polish, recommendation quality, and onboarding quality over new modules.",
  emotional_safety:
    "Never ship guilt copy, fear copy, shame loops, comparison pressure, or developmental labeling language.",
  explainability:
    "Every recommendation and behavior remains understandable, reviewable, debuggable, and auditable. No black boxes.",
  performance_as_a_feature:
    "Smoothness is part of trust — protect battery, low-end Android, reduced motion, accessibility, and sync resilience.",
  philosophy_protection:
    "The product philosophy is part of the architecture. A feature that conflicts with the philosophy is wrong.",
  measure_what_matters:
    "Measure parent confidence, healthy retention, skill stability, recommendation usefulness, and family trust — not compulsive engagement.",
  true_product_identity:
    "AmyNest is a calm, adaptive, emotionally intelligent developmental companion for families — not a worksheet app, gamified app, content platform, or AI chatbot.",
};

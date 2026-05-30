/**
 * Phase 5 — global Experience System.
 *
 * Single source of truth for motion, spacing, card hierarchy, loading, sound,
 * and emotional pacing across AmyNest. Every learning surface should consume
 * these tokens instead of defining its own. Do NOT add progression logic here.
 */

import type { Transition, Variants } from "framer-motion";
import { performanceTier, visualBudget, type PerformanceTier } from "./performance-tier";

// ─── Motion timing ──────────────────────────────────────────────────────────

/** Warm cubic ease — used for fade-up, card entry, soft slides. */
export const EASE_WARM: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Subtle ease for hover/touch feedback. */
export const EASE_SOFT: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const DURATION = {
  micro: 0.12,
  short: 0.22,
  base: 0.36,
  long: 0.52,
  reward: 1.4,
  celebration: 1.6,
} as const;

export const TRANSITION = {
  warm: { duration: DURATION.base, ease: EASE_WARM } satisfies Transition,
  warmLong: { duration: DURATION.long, ease: EASE_WARM } satisfies Transition,
  micro: { duration: DURATION.micro, ease: EASE_SOFT } satisfies Transition,
  spring: { type: "spring", stiffness: 320, damping: 28 } satisfies Transition,
  springGentle: { type: "spring", stiffness: 220, damping: 26 } satisfies Transition,
} as const;

// ─── Stagger helpers ─────────────────────────────────────────────────────────

export const STAGGER_STEP = 0.06;

export function staggerDelay(index: number, base = 0): number {
  return base + index * STAGGER_STEP;
}

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const softScale: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

/** Route-level page transition: gentle fade + slight lift. */
export const pageEnter: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

// ─── Spacing rhythm ─────────────────────────────────────────────────────────
//
// Use these constants in Tailwind class lookups so every screen breathes the
// same way. They map to existing Tailwind spacing scale so they compose with
// existing utility classes.

export const SCREEN_SPACING = {
  /** Outer page wrapper (top padding under header). */
  pageTop: "pt-4 md:pt-6",
  pageBottom: "pb-16",
  pageX: "px-4 md:px-6",
  /** Gap between stacked content cards. */
  stack: "space-y-4 md:space-y-5",
  stackTight: "space-y-3",
  /** Section header → content. */
  sectionGap: "mt-2",
} as const;

// ─── Card hierarchy ─────────────────────────────────────────────────────────
//
// Three tiers of cards. Use the smallest tier that still communicates the
// intent — restraint is what makes the app feel premium.

export type CardTier = "flat" | "premium" | "glow";

export const CARD_BASE =
  "rounded-2xl border backdrop-blur-sm transition-shadow duration-300";

export const CARD_VARIANTS: Record<CardTier, string> = {
  flat: "border-border/60 bg-card",
  premium:
    "border-white/30 dark:border-white/10 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-[0_8px_32px_-12px_rgba(99,102,241,0.18)]",
  glow:
    "border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.06] shadow-[0_0_40px_-8px_rgba(168,85,247,0.25)] ring-1 ring-primary/15",
};

/** Touch/press feedback applied to interactive cards or pill buttons. */
export const TOUCH_FEEDBACK =
  "active:scale-[0.985] hover:border-primary/25 transition-all duration-200";

// ─── Loading patterns ──────────────────────────────────────────────────────

export const SKELETON_BASE =
  "rounded-xl bg-gradient-to-r from-muted/60 via-muted/35 to-muted/60 animate-pulse";

// ─── Emotional pacing ──────────────────────────────────────────────────────
//
// Decides how loud a celebration should be. Small wins should never get the
// same treatment as level-ups — the absence of celebration is part of the
// emotional rhythm.

export type RewardIntensity = "subtle" | "card" | "full";

export function rewardIntensity(input: {
  rewardEventCount: number;
  hasLevelUp: boolean;
  sessionComplete: boolean;
}): RewardIntensity {
  if (input.hasLevelUp || input.sessionComplete) return "full";
  if (input.rewardEventCount > 0) return "card";
  return "subtle";
}

/** Suggested delay before a reward modal appears, so the screen settles first. */
export const REWARD_REVEAL_DELAY_MS = 350;

// ─── Performance-aware tuning (Phase 7) ─────────────────────────────────────
//
// Lower-tier devices receive simpler motion, fewer particles, no blur.

/**
 * Returns a motion `Transition` scaled by the current device tier. Use this
 * in components that need a tier-aware duration without re-deriving it.
 */
export function tierTransition(tier?: PerformanceTier): Transition {
  const t = tier ?? performanceTier();
  if (t === "low") {
    return { duration: DURATION.short, ease: EASE_SOFT };
  }
  return TRANSITION.warm;
}

/** Particle count appropriate for the current device tier. */
export function tierParticleCount(tier?: PerformanceTier): number {
  return visualBudget(tier).particles;
}

/** Returns a celebration intensity adjusted for the device tier. */
export function clampForTier<T extends RewardIntensity>(intensity: T, tier?: PerformanceTier): T | "subtle" | "card" {
  const t = tier ?? performanceTier();
  if (t === "low" && intensity === "full") return "card";
  if (t === "low" && intensity === "card") return "subtle";
  return intensity;
}

// ─── Sound family ───────────────────────────────────────────────────────────
//
// One unified sound family. Mapping to the underlying study-fx tones is the
// only place that should know about audio implementation.

export type SoundCue = "tap" | "unlock" | "complete" | "reward";

export const SOUND_CUE_MAP: Record<SoundCue, "tap" | "correct" | "complete" | "reward"> = {
  tap: "tap",
  unlock: "tap",
  complete: "complete",
  reward: "reward",
};

// ─── Typography rhythm ─────────────────────────────────────────────────────

export const TYPE = {
  pageTitle: "font-quicksand text-2xl font-bold tracking-tight",
  sectionTitle: "font-quicksand text-base font-semibold",
  cardTitle: "font-quicksand text-sm font-semibold",
  body: "text-sm leading-relaxed",
  micro: "text-xs text-muted-foreground leading-relaxed",
  pill: "text-xs font-medium",
} as const;

// ─── Design QA checklist (developer reference) ─────────────────────────────
//
// Every learning surface should be able to answer "yes" to each question.
// Used at review time, not at runtime.

export const DESIGN_QA = [
  "Does this surface use cards from the experience system?",
  "Does it consume TRANSITION.warm or TRANSITION.spring (no custom timings)?",
  "Is the reward intensity proportional to the moment?",
  "Does it use SCREEN_SPACING.pageTop / stack on the outer wrapper?",
  "Are empty states warm and encouraging (not generic)?",
  "Is Amy's presence felt without interrupting?",
  "Could a tired parent feel calm reading this screen?",
] as const;

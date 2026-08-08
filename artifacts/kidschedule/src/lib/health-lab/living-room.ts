/**
 * Health Lab Phase 2 — living room hierarchy helpers.
 * Presentation only. No health logic / medical content / API / DB changes.
 *
 * Emotional target: another Care room in the AmyNest home —
 * never galaxy UI, XP marketplace, gamification theatre, or science-app desk.
 */

import { resolvePortfolioLivingFlag } from "@/lib/amynest-living-universe";

import type { HealthGameId } from "@/features/health-lab/types";

export type HealthLabRecommend = {
  gameId: HealthGameId;
  label: string;
  title: string;
  purpose: string;
};

export type HealthLabQuietPath = {
  gameId: HealthGameId;
  title: string;
  purpose: string;
};

export type HealthLabLivingOpen = {
  eyebrow: string;
  title: string;
  purpose: string;
  companionship: string;
};

/** Primary quiet wellness paths — Care-room opening (calm language). */
export const HEALTH_LAB_QUIET_PATHS: readonly HealthLabQuietPath[] = [
  {
    gameId: "breath-control",
    title: "Breath & focus",
    purpose: "Settle the body gently",
  },
  {
    gameId: "flamingo-balance",
    title: "Balance",
    purpose: "Steady for a quiet minute",
  },
  {
    gameId: "freeze-statue",
    title: "Stillness",
    purpose: "Pause and hold calm",
  },
  {
    gameId: "reaction-time",
    title: "Attention",
    purpose: "Wake focus without pressure",
  },
  {
    gameId: "finger-stability",
    title: "Steady hands",
    purpose: "Gentle control practice",
  },
] as const;

/**
 * One recommended Care wellness act.
 * Prefers the engine-picked next game when provided; never invents new scoring.
 */
export function recommendHealthLabAction(
  recommendedGameId?: HealthGameId | null,
): HealthLabRecommend {
  const match =
    HEALTH_LAB_QUIET_PATHS.find((p) => p.gameId === recommendedGameId) ??
    HEALTH_LAB_QUIET_PATHS[0]!;
  return {
    gameId: match.gameId,
    label: "Start here",
    title: match.title,
    purpose: match.purpose,
  };
}

/** Companionship open — same house as Nutrition / Moments. */
export function healthLabLivingOpen(childName = "your child"): HealthLabLivingOpen {
  return {
    eyebrow: "Today's Care",
    title: `How can we care for ${childName}'s body today?`,
    purpose: "One calm wellness step — no pressure.",
    companionship: `I'm here with you and ${childName}.`,
  };
}

/** Soft completion language — never XP / quest / level theatre. */
export function livingSessionCompleteTitle(personalBest: boolean): string {
  return personalBest ? "A quiet best together" : "A calm practice complete";
}

export function livingCelebrationTitle(
  type: "level-up" | "streak" | "badge" | "quest" | "treasure" | "surprise",
): string {
  switch (type) {
    case "level-up":
      return "Growing steadier";
    case "streak":
      return "Showing up again";
    case "badge":
      return "A quiet moment noted";
    case "quest":
      return "Today's care continuing";
    case "treasure":
      return "A soft surprise";
    case "surprise":
      return "A gentle gift";
    default:
      return "Well done";
  }
}

export function livingCelebrationSubtitle(): string {
  return "Keep going gently — no rush.";
}

/** Flag — Health Lab living room manufacturing. Default ON. */
export function isHealthLabLivingV1Enabled(): boolean {
  return resolvePortfolioLivingFlag(import.meta.env.VITE_FF_HEALTH_LAB_LIVING_V1);
}

/** Calm deep-practice materials — same house as Speech deep / Care FE. */
export const HEALTH_LAB_LIVING_DEEP_PALETTE = {
  sand: "rgba(232,212,184,0.95)",
  sandMid: "rgba(232,212,184,0.45)",
  sandDim: "rgba(232,212,184,0.16)",
  sandBorder: "rgba(232,212,184,0.28)",
  textBright: "rgba(255,252,248,0.96)",
  textMid: "rgba(255,252,248,0.92)",
  textDim: "rgba(232,212,184,0.78)",
  night: "#120e18",
  panelBg:
    "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(232,212,184,0.1) 0%, transparent 55%), rgba(8,6,12,0.72)",
  holdFlash: "rgba(232,212,184,0.22)",
} as const;

/** Practice briefing — never Mission / Adventure / Reward theatre. */
export function livingPracticeBriefingEyebrow(): string {
  return "Today's care practice";
}

export function livingPracticeStartCta(): string {
  return "Begin gently";
}

export function livingPracticeHoldLabel(): string {
  return "Hold gently";
}

export function livingPracticeReadyCta(): string {
  return "I'm ready";
}

export function livingPracticeVictoryTitle(): string {
  return "We did this";
}

export function livingPracticeVictoryCta(): string {
  return "Continue";
}

export function livingPracticeProgressLabel(): string {
  return "Practice steps";
}

export function livingProgressPageTitle(): string {
  return "How we've been practicing";
}

export function livingProgressEffortLabel(): string {
  return "Practice notes";
}

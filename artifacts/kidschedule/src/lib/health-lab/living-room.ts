/**
 * Health Lab Phase 2 — living room hierarchy helpers.
 * Presentation only. No health logic / medical content / API / DB changes.
 *
 * Emotional target: another Care room in the AmyNest home —
 * never galaxy UI, XP marketplace, gamification theatre, or science-app desk.
 */

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
  const raw = import.meta.env.VITE_FF_HEALTH_LAB_LIVING_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}

/**
 * Health Lab Phase 2 — living room hierarchy helpers.
 * Presentation only. No health logic / medical content / API / DB changes.
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

/** Flag — Health Lab living room manufacturing. Default ON. */
export function isHealthLabLivingV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_HEALTH_LAB_LIVING_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}

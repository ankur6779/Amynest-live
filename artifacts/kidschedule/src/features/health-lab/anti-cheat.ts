/** Amy Health Lab™ — session integrity validation (pure functions for tests). */

export interface BreathCheatInput {
  holdSeconds: number;
  touchMoves: number[];
  pointerCount: number;
}

export interface FlamingoCheatInput {
  durationSeconds: number;
  avgStability: number;
  variance: number;
  simulated: boolean;
  minDurationSeconds: number;
}

export interface FingerCheatInput {
  touchMoves: number[];
  maxDrift: number;
  pointerCount: number;
  durationSeconds: number;
}

export interface ReactionCheatInput {
  reactionMs: number;
  falseStarts: number;
}

export type CheatFlag =
  | "zero_movement"
  | "taped_finger"
  | "multi_touch"
  | "flat_surface"
  | "unrealistic_stability"
  | "too_short"
  | "simulated_motion"
  | "impossible_reaction"
  | "excessive_false_starts";

export interface CheatVerdict {
  valid: boolean;
  flags: CheatFlag[];
  scoreMultiplier: number;
  eligibleForBadges: boolean;
  eligibleForXp: boolean;
}

const CLEAN: CheatVerdict = {
  valid: true,
  flags: [],
  scoreMultiplier: 1,
  eligibleForBadges: true,
  eligibleForXp: true,
};

function verdict(flags: CheatFlag[], multiplier = 0.5): CheatVerdict {
  const hardBlock = flags.some((f) =>
    ["zero_movement", "taped_finger", "multi_touch", "flat_surface", "simulated_motion", "impossible_reaction"].includes(f),
  );
  return {
    valid: !hardBlock,
    flags,
    scoreMultiplier: hardBlock ? 0 : multiplier,
    eligibleForBadges: !hardBlock,
    eligibleForXp: !hardBlock,
  };
}

/** Breath: require micro-movement; reject tape (zero variance) and multi-touch. */
export function validateBreathSession(input: BreathCheatInput): CheatVerdict {
  const flags: CheatFlag[] = [];
  if (input.pointerCount > 1) flags.push("multi_touch");

  const moves = input.touchMoves.filter((m) => m > 0);
  const totalMovement = input.touchMoves.reduce((a, b) => a + b, 0);

  if (input.holdSeconds >= 3 && moves.length === 0) flags.push("zero_movement");
  if (input.holdSeconds >= 5 && totalMovement < 0.5) flags.push("taped_finger");
  if (input.holdSeconds >= 3 && moves.length > 0 && totalMovement / moves.length < 0.02 && input.holdSeconds >= 8) {
    flags.push("taped_finger");
  }

  if (flags.length === 0) return CLEAN;
  return verdict(flags);
}

/** Flamingo: reject flat phone; require minimum duration. */
export function validateFlamingoSession(input: FlamingoCheatInput): CheatVerdict {
  const flags: CheatFlag[] = [];
  if (input.simulated) flags.push("simulated_motion");
  if (input.durationSeconds < input.minDurationSeconds) flags.push("too_short");
  if (input.variance < 0.003 && input.avgStability > 92) flags.push("flat_surface");
  if (input.avgStability > 98 && input.durationSeconds < 20) flags.push("unrealistic_stability");

  if (flags.includes("simulated_motion")) {
    return {
      valid: true,
      flags,
      scoreMultiplier: 0.6,
      eligibleForBadges: false,
      eligibleForXp: true,
    };
  }
  if (flags.length === 0) return CLEAN;
  return verdict(flags);
}

/** Freeze: simulated motion ineligible for badges. */
export function validateFreezeSession(simulated: boolean, peakVarianceDuringFreeze: number): CheatVerdict {
  if (simulated) {
    return {
      valid: true,
      flags: ["simulated_motion"],
      scoreMultiplier: 0.6,
      eligibleForBadges: false,
      eligibleForXp: true,
    };
  }
  if (peakVarianceDuringFreeze < 0.002) {
    return verdict(["flat_surface"]);
  }
  return CLEAN;
}

/** Finger stability: micro-movement required. */
export function validateFingerSession(input: FingerCheatInput): CheatVerdict {
  const flags: CheatFlag[] = [];
  if (input.pointerCount > 1) flags.push("multi_touch");
  const moves = input.touchMoves.filter((m) => m > 0);
  const totalMovement = input.touchMoves.reduce((a, b) => a + b, 0);
  if (input.durationSeconds >= 5 && moves.length === 0) flags.push("zero_movement");
  if (input.durationSeconds >= 8 && totalMovement < 1 && input.maxDrift < 3) flags.push("taped_finger");
  if (flags.length === 0) return CLEAN;
  return verdict(flags);
}

/** Reaction: reject sub-human times; penalize false starts. */
export function validateReactionRound(input: ReactionCheatInput): CheatVerdict {
  const flags: CheatFlag[] = [];
  if (input.reactionMs < 50) flags.push("impossible_reaction");
  if (input.falseStarts >= 3) flags.push("excessive_false_starts");
  if (flags.includes("impossible_reaction")) return verdict(flags, 0);
  if (flags.includes("excessive_false_starts")) {
    return { valid: true, flags, scoreMultiplier: 0.7, eligibleForBadges: true, eligibleForXp: true };
  }
  return CLEAN;
}

export function applyCheatMultiplier(score: number, verdict: CheatVerdict): number {
  return Math.round(score * verdict.scoreMultiplier);
}

export function distinctGamesToday(
  games: string[],
  exclude: string = "calmness-meter",
): number {
  return new Set(games.filter((g) => g !== exclude)).size;
}

export function canRewardCalmnessSnapshot(
  gamesCompletedToday: string[],
  calmnessRewardedToday: boolean,
): boolean {
  if (calmnessRewardedToday) return false;
  return distinctGamesToday(gamesCompletedToday) >= 3;
}

import type { AmyReactionDef, AmyReactionKind } from "./types";

const REACTIONS: Record<string, AmyReactionDef[]> = {
  success_mild: [
    { kind: "clap", mood: "celebrating", durationMs: 1200, weight: 3 },
    { kind: "smile", mood: "celebrating", durationMs: 1000, weight: 4 },
    { kind: "sway", mood: "celebrating", durationMs: 1400, weight: 2 },
  ],
  success_hot: [
    { kind: "dance", mood: "celebrating", durationMs: 2000, particle: "confetti", weight: 3 },
    { kind: "throw_stars", mood: "celebrating", durationMs: 1800, particle: "stars", weight: 4 },
    { kind: "jump", mood: "celebrating", durationMs: 1500, weight: 3 },
    { kind: "spin", mood: "celebrating", durationMs: 1600, particle: "sparkle", weight: 2 },
  ],
  struggle_gentle: [
    { kind: "point", mood: "encouraging", durationMs: 1400, cueKey: "amy_try_together", weight: 3 },
    { kind: "wave", mood: "encouraging", durationMs: 1200, weight: 4 },
    { kind: "encourage", mood: "encouraging", durationMs: 1500, cueKey: "amy_keep_going", weight: 3 },
  ],
  struggle_support: [
    { kind: "demonstrate", mood: "encouraging", durationMs: 2000, cueKey: "amy_try_together", weight: 4 },
    { kind: "encourage", mood: "encouraging", durationMs: 1800, weight: 3 },
  ],
  idle_reengage: [
    { kind: "look_around", mood: "idle", durationMs: 2000, weight: 3 },
    { kind: "wave", mood: "idle", durationMs: 1500, weight: 2 },
    { kind: "blink", mood: "idle", durationMs: 800, weight: 4 },
  ],
  idle_ambient: [
    { kind: "blink", mood: "idle", durationMs: 600, weight: 5 },
    { kind: "sway", mood: "idle", durationMs: 2000, weight: 3 },
    { kind: "smile", mood: "idle", durationMs: 1000, weight: 2 },
  ],
};

function pickWeighted(pool: AmyReactionDef[], seed: number): AmyReactionDef {
  const total = pool.reduce((sum, r) => sum + r.weight, 0);
  let roll = seed % total;
  for (const reaction of pool) {
    roll -= reaction.weight;
    if (roll < 0) return reaction;
  }
  return pool[0]!;
}

export function pickAmyReaction(
  poolKey: keyof typeof REACTIONS,
  seed: number = Date.now(),
): AmyReactionDef {
  const pool = REACTIONS[poolKey] ?? REACTIONS.idle_ambient;
  return pickWeighted(pool, Math.abs(seed));
}

export function reactionPoolForOutcome(input: {
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  justSucceeded?: boolean;
  justFailed?: boolean;
  idleMs: number;
}): keyof typeof REACTIONS {
  if (input.idleMs >= 8_000) return "idle_reengage";
  if (input.justFailed || input.consecutiveFailures >= 3) {
    return input.consecutiveFailures >= 3 ? "struggle_support" : "struggle_gentle";
  }
  if (input.justSucceeded || input.consecutiveSuccesses >= 1) {
    return input.consecutiveSuccesses >= 3 ? "success_hot" : "success_mild";
  }
  return "idle_ambient";
}

export function getReactionByKind(kind: AmyReactionKind): AmyReactionDef | null {
  for (const pool of Object.values(REACTIONS)) {
    const found = pool.find((r) => r.kind === kind);
    if (found) return found;
  }
  return null;
}

import type { AgeBand } from "../types.js";
import type { RealtimeDecision, RealtimeSessionState } from "../realtime/types.js";
import { nbaActionToRealtimeDecision } from "./actionMapper.js";
import type { ModelPrediction, NbaAction } from "./types.js";

export type SafetyContext = {
  ageBand: AgeBand;
};

const MAX_LEVEL_BY_BAND: Record<AgeBand, number> = {
  "0_24": 2,
  "24_36": 3,
  "36_48": 4,
  "48_72": 5,
};

const DIFFICULTY_PENALTY = 0.35;

/**
 * Soft penalties on action scores instead of hard blocks (bounded exploration).
 */
export function applySafetyScorePenalties(
  prediction: ModelPrediction,
  state: RealtimeSessionState,
  ctx: SafetyContext,
): ModelPrediction {
  const penalties: Partial<Record<NbaAction, number>> = {};
  const maxLevel = MAX_LEVEL_BY_BAND[ctx.ageBand] ?? 4;

  if (state.liveDifficulty.liveLevel >= maxLevel) {
    penalties.INCREASE_DIFFICULTY = DIFFICULTY_PENALTY;
  }

  if (state.sessionPlan.length < 2) {
    penalties.SWAP_CONTENT = DIFFICULTY_PENALTY * 0.8;
  }

  const fatigue = state.attention?.fatigueLevel ?? 0;
  if (fatigue > 0.75) {
    penalties.INCREASE_DIFFICULTY = (penalties.INCREASE_DIFFICULTY ?? 0) + 0.15;
  }

  const adjusted = { ...prediction.probabilities };
  let total = 0;
  for (const action of Object.keys(adjusted) as NbaAction[]) {
    const p = Math.max(0, (adjusted[action] ?? 0) - (penalties[action] ?? 0));
    adjusted[action] = p;
    total += p;
  }
  if (total > 0) {
    for (const action of Object.keys(adjusted) as NbaAction[]) {
      adjusted[action] = (adjusted[action] ?? 0) / total;
    }
  }

  let best: NbaAction = prediction.action;
  let bestP = adjusted[best] ?? 0;
  for (const [action, p] of Object.entries(adjusted) as [NbaAction, number][]) {
    if (p > bestP) {
      bestP = p;
      best = action;
    }
  }

  return {
    action: best,
    confidence: bestP,
    probabilities: adjusted,
    rewardEstimate: prediction.rewardEstimate,
  };
}

/**
 * Structural safety: empty sessions still hard-blocked.
 */
export function safetyGuard(
  action: NbaAction,
  state: RealtimeSessionState,
  ctx: SafetyContext,
): RealtimeDecision {
  if (state.sessionPlan.length === 0) {
    return { action: "NOOP", payload: {}, reason: "safety_empty_session" };
  }

  const decision = nbaActionToRealtimeDecision(action);
  return validateRealtimeDecision(decision, state, ctx);
}

export function validateRealtimeDecision(
  decision: RealtimeDecision,
  state: RealtimeSessionState,
  ctx: SafetyContext,
): RealtimeDecision {
  if (state.sessionPlan.length === 0) {
    return { action: "NOOP", payload: {}, reason: "safety_empty_session" };
  }

  if (decision.action === "SWAP_CONTENT" && state.sessionPlan.length < 2) {
    return { action: "NOOP", payload: {}, reason: "safety_min_content" };
  }

  return decision;
}

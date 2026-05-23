import type { RealtimeSessionState } from "../realtime/types.js";
import type { ModelPrediction, NbaAction } from "./types.js";
import type { PersonalityProfile } from "./types-personality.js";

const ACTION_BOOST = 0.12;
const ACTION_PENALTY = 0.15;

function boost(
  probs: Record<NbaAction, number>,
  action: NbaAction,
  amount: number,
): void {
  probs[action] = Math.min(1, (probs[action] ?? 0) + amount);
}

function penalize(
  probs: Record<NbaAction, number>,
  action: NbaAction,
  amount: number,
): void {
  probs[action] = Math.max(0, (probs[action] ?? 0) - amount);
}

function renormalize(probs: Record<NbaAction, number>): Record<NbaAction, number> {
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  if (total <= 0) return probs;
  const out = { ...probs };
  for (const k of Object.keys(out) as NbaAction[]) {
    out[k] = (out[k] ?? 0) / total;
  }
  return out;
}

/**
 * Personality guides NBA scores; combined with real-time signals, not a full override.
 */
export function applyPersonalityToPrediction(
  prediction: ModelPrediction,
  personality: PersonalityProfile | undefined,
  _state: RealtimeSessionState,
): ModelPrediction {
  if (!personality) return prediction;

  const t = personality.traits;
  const probs = { ...prediction.probabilities };

  if (t.curiosity > 0.6) {
    boost(probs, "INTRODUCE_EXPLORATION", ACTION_BOOST * (t.curiosity - 0.5));
    boost(probs, "SWAP_CONTENT", ACTION_BOOST * 0.6);
  }

  if (t.persistence < 0.4) {
    penalize(probs, "INCREASE_DIFFICULTY", ACTION_PENALTY);
    boost(probs, "DECREASE_DIFFICULTY", ACTION_BOOST * 0.5);
  }

  if (t.challengeSeeking > 0.65) {
    boost(probs, "INCREASE_DIFFICULTY", ACTION_BOOST * (t.challengeSeeking - 0.5));
  }

  if (t.distractibility > 0.6) {
    boost(probs, "INJECT_REWARD", ACTION_BOOST * (t.distractibility - 0.5));
    boost(probs, "SWAP_CONTENT", ACTION_BOOST * 0.4);
    boost(probs, "KEEP_AS_IS", ACTION_BOOST * 0.25);
  }

  if (t.rewardSensitivity > 0.7) {
    boost(probs, "INJECT_REWARD", ACTION_BOOST * 0.35);
  }

  const adjusted = renormalize(probs);
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

export function personalityExplorationBoost(
  personality: PersonalityProfile | undefined,
): number {
  if (!personality) return 0;
  return Math.max(0, (personality.traits.curiosity - 0.5) * 0.15);
}

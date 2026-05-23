import { NBA_ACTIONS, type MlExperimentFlags, type NbaAction, type ModelPrediction } from "./types.js";

export type BanditArmStats = {
  pulls: number;
  totalReward: number;
};

export type BanditState = {
  arms: Record<NbaAction, BanditArmStats>;
  totalPulls: number;
};

export function createBanditState(): BanditState {
  const arms = {} as Record<NbaAction, BanditArmStats>;
  for (const action of NBA_ACTIONS) {
    arms[action] = { pulls: 0, totalReward: 0 };
  }
  return { arms, totalPulls: 0 };
}

export type BanditSelection = {
  action: NbaAction;
  explore: boolean;
  confidence: number;
};

export function weightedSelection<T extends string>(
  candidates: { action: T; weight: number }[],
  rng = Math.random(),
): T {
  const weights = candidates.map((c) => Math.max(0, c.weight));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return candidates[0]!.action;

  let r = rng * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return candidates[i]!.action;
  }
  return candidates[candidates.length - 1]!.action;
}

function pickExploratoryAction(
  prediction: ModelPrediction,
  state: BanditState,
): NbaAction {
  const unexplored = NBA_ACTIONS.find((a) => state.arms[a]!.pulls === 0);
  if (unexplored) return unexplored;

  const sorted = [...NBA_ACTIONS].sort(
    (a, b) => (prediction.probabilities[b] ?? 0) - (prediction.probabilities[a] ?? 0),
  );
  const alt = sorted.find((a) => a !== prediction.action);
  return alt ?? "INTRODUCE_EXPLORATION";
}

/**
 * Guided exploration: ML action vs exploratory candidate (weighted, not full override).
 */
export function guidedExplorationSelect(
  prediction: ModelPrediction,
  state: BanditState,
  explorationScore: number,
  explorationBoost = 0,
  rng = Math.random(),
): BanditSelection {
  const exploratoryAction = pickExploratoryAction(prediction, state);
  const mlWeight = Math.max(0.15, prediction.confidence);
  const exploreWeight = Math.max(0.05, explorationScore + explorationBoost);

  const finalAction = weightedSelection(
    [
      { action: prediction.action, weight: mlWeight },
      { action: exploratoryAction, weight: exploreWeight },
    ],
    rng,
  );

  return {
    action: finalAction,
    explore: finalAction !== prediction.action,
    confidence:
      finalAction === prediction.action
        ? prediction.confidence
        : (prediction.probabilities[finalAction] ?? 0.3),
  };
}

/**
 * Epsilon-greedy: explore random arm with probability epsilon.
 */
export function epsilonGreedySelect(
  prediction: ModelPrediction,
  state: BanditState,
  epsilon: number,
  rng = Math.random(),
): BanditSelection {
  if (rng < epsilon) {
    const idx = Math.floor(Math.random() * NBA_ACTIONS.length);
    const action = NBA_ACTIONS[idx]!;
    return { action, explore: true, confidence: 1 / NBA_ACTIONS.length };
  }
  return {
    action: prediction.action,
    explore: false,
    confidence: prediction.confidence,
  };
}

/**
 * UCB1: balance exploration/exploitation using upper confidence bound.
 */
export function ucbSelect(
  prediction: ModelPrediction,
  state: BanditState,
  rng = Math.random(),
): BanditSelection {
  if (state.totalPulls < NBA_ACTIONS.length) {
    const unexplored = NBA_ACTIONS.find((a) => state.arms[a]!.pulls === 0);
    if (unexplored) {
      return { action: unexplored, explore: true, confidence: 0.5 };
    }
  }

  let best: NbaAction = prediction.action;
  let bestUcb = -Infinity;

  for (const action of NBA_ACTIONS) {
    const arm = state.arms[action]!;
    const mean = arm.pulls > 0 ? arm.totalReward / arm.pulls : 0.5;
    const exploration = Math.sqrt((2 * Math.log(state.totalPulls + 1)) / (arm.pulls + 1));
    const ucb = mean + exploration;
    if (ucb > bestUcb) {
      bestUcb = ucb;
      best = action;
    }
  }

  const explore = best !== prediction.action && rng < 0.1;
  return {
    action: best,
    explore,
    confidence: prediction.confidence,
  };
}

export function selectWithBandit(
  prediction: ModelPrediction,
  state: BanditState,
  flags: Pick<MlExperimentFlags, "banditEpsilon" | "banditStrategy">,
  explorationScore = 0.2,
  explorationBoost = 0,
): BanditSelection {
  if (flags.banditStrategy === "guided") {
    return guidedExplorationSelect(
      prediction,
      state,
      explorationScore,
      explorationBoost,
    );
  }
  if (flags.banditStrategy === "epsilon_greedy") {
    return epsilonGreedySelect(prediction, state, flags.banditEpsilon);
  }
  return ucbSelect(prediction, state);
}

export function recordBanditReward(
  state: BanditState,
  action: NbaAction,
  reward: number,
): void {
  const arm = state.arms[action]!;
  arm.pulls += 1;
  arm.totalReward += reward;
  state.totalPulls += 1;
}

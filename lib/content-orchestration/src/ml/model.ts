import { NBA_ACTIONS, type ModelPrediction, type NbaAction } from "./types.js";
import { FEATURE_DIM } from "./featureExtractor.js";
import type { NormalizedFeatureVector } from "./types.js";

/** Per-action linear weights (logistic multi-class). */
export type GbtModelWeights = {
  /** [actionIndex][featureIndex] */
  weights: number[][];
  biases: number[];
  version: number;
};

const ACTION_COUNT = NBA_ACTIONS.length;
const REWARD_VARIANCE_THRESHOLD = 0.35;

export type SafeOnlineUpdateOptions = {
  baseLearningRate?: number;
  decayFactor?: number;
  minBatchSize?: number;
  batchRewards?: number[];
  varianceThreshold?: number;
};

/**
 * Hand-tuned initial weights aligned with rule-based engine (bootstrap).
 * Offline trainingPipeline refines these from logged outcomes.
 */
export function createDefaultModelWeights(): GbtModelWeights {
  const w = Array.from({ length: ACTION_COUNT }, () =>
    new Array(FEATURE_DIM).fill(0),
  );
  const b = new Array(ACTION_COUNT).fill(0);

  const idx = {
    skips: 4,
    completions: 5,
    response: 6,
    accuracy: 7,
    focus: 8,
    fatigue: 9,
    boredom: 10,
    engagement: 16,
    exploration: 17,
    skipTrend: 18,
    engagementTrend: 20,
    actionChange: 21,
    curiosity: 22,
    persistence: 23,
    distractibility: 24,
    challengeSeeking: 25,
  };

  const INC = NBA_ACTIONS.indexOf("INCREASE_DIFFICULTY");
  const DEC = NBA_ACTIONS.indexOf("DECREASE_DIFFICULTY");
  const SWAP = NBA_ACTIONS.indexOf("SWAP_CONTENT");
  const REWARD = NBA_ACTIONS.indexOf("INJECT_REWARD");
  const EXPLORE = NBA_ACTIONS.indexOf("INTRODUCE_EXPLORATION");
  const KEEP = NBA_ACTIONS.indexOf("KEEP_AS_IS");

  w[INC]![idx.accuracy] = 2.2;
  w[INC]![idx.response] = 1.8;
  w[INC]![idx.completions] = 1.2;
  w[DEC]![idx.skips] = 2.5;
  w[DEC]![idx.skipTrend] = 1.2;
  w[DEC]![idx.fatigue] = 1.0;
  w[SWAP]![idx.boredom] = 2.0;
  w[SWAP]![idx.focus] = -1.2;
  w[REWARD]![idx.fatigue] = 1.8;
  w[REWARD]![idx.boredom] = 1.5;
  w[EXPLORE]![idx.exploration] = 1.2;
  w[EXPLORE]![idx.engagementTrend] = 0.8;
  w[EXPLORE]![idx.boredom] = 1.0;
  w[KEEP]![idx.engagement] = 1.5;
  w[KEEP]![idx.focus] = 1.2;
  w[KEEP]![idx.actionChange] = -1.5;
  w[KEEP]![idx.persistence] = 1.1;
  w[EXPLORE]![idx.curiosity] = 1.4;
  w[DEC]![idx.distractibility] = 1.0;
  w[INC]![idx.challengeSeeking] = 1.3;
  b[KEEP] = 0.4;

  return { weights: w, biases: b, version: 1 };
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, c) => a + c, 0);
  return exps.map((e) => e / sum);
}

export function computeRewardVariance(rewards: number[]): number {
  if (rewards.length < 2) return 0;
  const mean = rewards.reduce((a, b) => a + b, 0) / rewards.length;
  return rewards.reduce((s, r) => s + (r - mean) ** 2, 0) / rewards.length;
}

export function resolveLearningRate(
  baseRate: number,
  decayFactor: number,
  batchRewards: number[],
  varianceThreshold = REWARD_VARIANCE_THRESHOLD,
): number {
  const variance = computeRewardVariance(batchRewards);
  const varianceScale = variance > varianceThreshold ? 0.5 : 1;
  return baseRate * decayFactor * varianceScale;
}

export class GradientBoostedActionModel {
  private weights: GbtModelWeights;

  constructor(initial?: GbtModelWeights) {
    this.weights = initial ?? createDefaultModelWeights();
  }

  get version(): number {
    return this.weights.version;
  }

  predict(normalized: NormalizedFeatureVector): ModelPrediction {
    const logits = this.weights.biases.map((bias, a) => {
      let s = bias;
      const row = this.weights.weights[a]!;
      for (let f = 0; f < FEATURE_DIM; f++) {
        s += row[f]! * normalized.values[f]!;
      }
      return s;
    });

    const probs = softmax(logits);
    let bestIdx = 0;
    let bestP = probs[0]!;
    for (let i = 1; i < probs.length; i++) {
      if (probs[i]! > bestP) {
        bestP = probs[i]!;
        bestIdx = i;
      }
    }

    const probabilities = {} as Record<NbaAction, number>;
    NBA_ACTIONS.forEach((action, i) => {
      probabilities[action] = probs[i]!;
    });

    const action = NBA_ACTIONS[bestIdx]!;
    const rewardEstimate = estimateRewardFromProbs(probabilities);

    return {
      action,
      confidence: bestP,
      probabilities,
      rewardEstimate,
    };
  }

  /**
   * Safe online SGD: skips when batch too small; reduces LR on high reward variance.
   */
  safeOnlineUpdate(
    normalized: NormalizedFeatureVector,
    targetAction: NbaAction,
    reward: number,
    options: SafeOnlineUpdateOptions = {},
  ): boolean {
    const minBatch = options.minBatchSize ?? 20;
    const batchRewards = options.batchRewards ?? [reward];
    if (batchRewards.length < minBatch && minBatch > 1) {
      return false;
    }

    const baseRate = options.baseLearningRate ?? 0.05;
    const decay = options.decayFactor ?? 0.98;
    const learningRate = resolveLearningRate(
      baseRate,
      decay,
      batchRewards,
      options.varianceThreshold,
    );

    this.onlineUpdate(normalized, targetAction, reward, learningRate);
    return true;
  }

  /** Lightweight online SGD step on one labeled example. */
  onlineUpdate(
    normalized: NormalizedFeatureVector,
    targetAction: NbaAction,
    reward: number,
    learningRate = 0.05,
  ): void {
    const targetIdx = NBA_ACTIONS.indexOf(targetAction);
    const pred = this.predict(normalized);
    const error = reward - pred.rewardEstimate;

    for (let a = 0; a < ACTION_COUNT; a++) {
      const gradScale =
        (a === targetIdx ? 1 : -pred.probabilities[NBA_ACTIONS[a]!]!) *
        error *
        learningRate;
      const row = this.weights.weights[a]!;
      for (let f = 0; f < FEATURE_DIM; f++) {
        row[f]! += gradScale * normalized.values[f]!;
      }
      this.weights.biases[a]! += gradScale * 0.1;
    }
    this.weights.version += 1;
  }

  exportWeights(): GbtModelWeights {
    return structuredClone(this.weights);
  }

  loadWeights(w: GbtModelWeights): void {
    this.weights = structuredClone(w);
  }
}

function estimateRewardFromProbs(probs: Record<NbaAction, number>): number {
  const weights: Record<NbaAction, number> = {
    INCREASE_DIFFICULTY: 0.3,
    DECREASE_DIFFICULTY: 0.1,
    SWAP_CONTENT: 0.2,
    INJECT_REWARD: 0.6,
    INTRODUCE_EXPLORATION: 0.4,
    KEEP_AS_IS: 0.5,
  };
  let sum = 0;
  for (const action of NBA_ACTIONS) {
    sum += (probs[action] ?? 0) * (weights[action] ?? 0);
  }
  return Math.round(sum * 100) / 100;
}

let sharedModel: GradientBoostedActionModel | null = null;

export function getSharedActionModel(): GradientBoostedActionModel {
  if (!sharedModel) sharedModel = new GradientBoostedActionModel();
  return sharedModel;
}

export function resetSharedActionModel(): void {
  sharedModel = null;
}

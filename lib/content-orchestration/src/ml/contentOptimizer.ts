import { DEFAULT_RANKING_WEIGHTS } from "../contentEngine.js";
import type { ContentRankingWeights } from "../types-v2.js";
import { getGlobalGraph } from "./globalGraphEngine.js";
import type { TuningParameters } from "./types-meta.js";
import { getSystemPolicy } from "./policyEngine.js";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function optimizeContentRankingWeights(
  base: ContentRankingWeights = DEFAULT_RANKING_WEIGHTS,
): ContentRankingWeights {
  const graph = getGlobalGraph();
  const skills = graph.skills;
  const avgSuccess =
    skills.length > 0
      ? skills.reduce((a, s) => a + (graph.successRates[s] ?? 0.5), 0) / skills.length
      : 0.65;
  const avgEng =
    skills.length > 0
      ? skills.reduce((a, s) => a + (graph.engagementStats[s] ?? 0.5), 0) / skills.length
      : 0.6;

  let weights = { ...base };
  if (avgSuccess < 0.55) {
    weights = {
      ...weights,
      difficultyMatchWeight: weights.difficultyMatchWeight + 0.03,
      noveltyWeight: weights.noveltyWeight - 0.02,
    };
  }
  if (avgEng > 0.65) {
    weights = {
      ...weights,
      engagementWeight: weights.engagementWeight + 0.02,
      explorationWeight: weights.explorationWeight + 0.01,
    };
  }

  const sum =
    weights.noveltyWeight +
    weights.difficultyMatchWeight +
    weights.engagementWeight +
    weights.explorationWeight;
  return {
    noveltyWeight: weights.noveltyWeight / sum,
    difficultyMatchWeight: weights.difficultyMatchWeight / sum,
    engagementWeight: weights.engagementWeight / sum,
    explorationWeight: weights.explorationWeight / sum,
  };
}

export function templateVariationBias(): {
  preferSimplerTemplates: boolean;
  boostHighEngagementTemplates: boolean;
} {
  const graph = getGlobalGraph();
  const avgSuccess = clamp01(
    Object.values(graph.successRates).reduce((a, b) => a + b, 0) /
      Math.max(1, Object.keys(graph.successRates).length),
  );
  return {
    preferSimplerTemplates: avgSuccess < 0.5,
    boostHighEngagementTemplates: avgSuccess >= 0.6,
  };
}

export function applyContentOptimizerToTuning(
  tuning: TuningParameters,
): TuningParameters {
  const weights = optimizeContentRankingWeights(
    tuning.contentRankingWeights as ContentRankingWeights | undefined,
  );
  const policy = getSystemPolicy();
  const maxDelta = policy.maxTuningDeltaPerCycle;

  const clampWeight = (w: number, base: number) =>
    Math.max(base - maxDelta, Math.min(base + maxDelta, w));

  return {
    ...tuning,
    contentRankingWeights: {
      noveltyWeight: clampWeight(weights.noveltyWeight, DEFAULT_RANKING_WEIGHTS.noveltyWeight),
      difficultyMatchWeight: clampWeight(
        weights.difficultyMatchWeight,
        DEFAULT_RANKING_WEIGHTS.difficultyMatchWeight,
      ),
      engagementWeight: clampWeight(
        weights.engagementWeight,
        DEFAULT_RANKING_WEIGHTS.engagementWeight,
      ),
      explorationWeight: clampWeight(
        weights.explorationWeight,
        DEFAULT_RANKING_WEIGHTS.explorationWeight,
      ),
    },
  };
}

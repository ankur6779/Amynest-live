/**
 * Merge predictive ops into TTS strategy response for client layer weighting.
 */

import type { TtsStrategyResponse } from "./ttsIntelligenceService.js";
import { getPredictiveOpsState, MAX_PREFETCH_DEPTH } from "./predictive-ops-store.js";

export type PredictiveStrategyExtension = {
  degradedMode: boolean;
  layerWeights: {
    static: number;
    cache: number;
    api: number;
    streaming: number;
    elevenlabs: number;
  };
  apiUsageFactor: number;
  streamingWeightFactor: number;
  prefetchDepth: number;
};

export type EnrichedTtsStrategy = TtsStrategyResponse & PredictiveStrategyExtension;

export function applyPredictiveStrategyAdjustments(
  base: TtsStrategyResponse,
): EnrichedTtsStrategy {
  const predictive = getPredictiveOpsState();
  const weights = predictive.layerWeights;

  const penalties = { ...base.penalties };
  const boosts = { ...base.boosts };

  if (weights.cache > 0.4) {
    boosts.cache = (boosts.cache ?? 0) + predictive.cachePriorityBoost;
  }
  if (weights.api < 0.2 || predictive.apiUsageFactor < 1) {
    penalties.api = (penalties.api ?? 0) + 0.15 * (1 - predictive.apiUsageFactor);
  }
  if (weights.streaming < 0.12 || predictive.streamingWeightFactor < 1) {
    penalties.api = (penalties.api ?? 0) + 0.08 * (1 - predictive.streamingWeightFactor);
  }
  if (predictive.degradedMode) {
    penalties.api = Math.max(penalties.api ?? 0, 0.2);
    boosts.cache = (boosts.cache ?? 0) + 0.15;
    boosts.static = (boosts.static ?? 0) + 0.05;
  }

  const preferredLayers = [...base.preferredLayers].sort((a, b) => {
    const score = (layer: typeof a) => {
      if (layer === "static") return weights.static;
      if (layer === "cache") return weights.cache;
      if (layer === "api") return weights.api;
      if (layer === "elevenlabs") return weights.elevenlabs;
      return 0.1;
    };
    return score(b) - score(a);
  });

  return {
    ...base,
    preferredLayers,
    penalties,
    boosts,
    apiDegraded: base.apiDegraded || predictive.degradedMode,
    degradedMode: predictive.degradedMode,
    layerWeights: weights,
    apiUsageFactor: predictive.apiUsageFactor,
    streamingWeightFactor: predictive.streamingWeightFactor,
    prefetchDepth: Math.min(predictive.prefetchDepth, MAX_PREFETCH_DEPTH),
  };
}

import {
  normalizeFeatures,
  extractNbaFeatures,
  type ExtractFeaturesContext,
} from "./featureExtractor.js";
import {
  createBanditState,
  selectWithBandit,
  type BanditState,
} from "./banditEngine.js";
import { applySafetyScorePenalties, safetyGuard } from "./safetyGuard.js";
import { applyOscillationGuard } from "./oscillationGuard.js";
import { getSegmentModelRegistry } from "./segmentModels.js";
import {
  applyPersonalityToPrediction,
  personalityExplorationBoost,
} from "./personalityNba.js";
import { applyPredictionPrior } from "./predictionNba.js";
import type {
  AttentionState,
  RealtimeEvent,
  RealtimeSessionState,
} from "../realtime/types.js";
import type {
  MlExperimentFlags,
  ModelPrediction,
  NbaAction,
  NbaFeatureVector,
} from "./types.js";

export type NbaPredictResult = {
  features: NbaFeatureVector;
  prediction: ModelPrediction;
  banditAction: NbaAction;
  explore: boolean;
};

const banditByChild = new Map<string, BanditState>();

export function getBanditState(childId: string): BanditState {
  let state = banditByChild.get(childId);
  if (!state) {
    state = createBanditState();
    banditByChild.set(childId, state);
  }
  return state;
}

export function clearBanditState(childId: string): void {
  banditByChild.delete(childId);
}

/**
 * Predict next-best action: features → segment GBT → safety penalties → bandit → oscillation guard.
 */
export function predictNextBestAction(
  state: RealtimeSessionState,
  latestEvent: RealtimeEvent,
  attention: AttentionState,
  ctx: ExtractFeaturesContext,
  mlFlags: MlExperimentFlags,
): NbaPredictResult {
  const features = extractNbaFeatures(state, latestEvent, attention, ctx);
  const normalized = normalizeFeatures(features);
  const registry = getSegmentModelRegistry();
  const model = registry.getModel(features.segmentKey);
  let prediction = model.predict(normalized);
  prediction = applyPredictionPrior(prediction, ctx.behavioralPrediction);
  prediction = applyPersonalityToPrediction(prediction, ctx.personality, state);
  prediction = applySafetyScorePenalties(prediction, state, ctx);

  const stabilityPenalty = features.actionStability.stabilityPenalty;
  if (stabilityPenalty > 0 && prediction.action !== "KEEP_AS_IS") {
    const keepProb = Math.min(
      1,
      (prediction.probabilities.KEEP_AS_IS ?? 0) + stabilityPenalty,
    );
    prediction = {
      ...prediction,
      probabilities: {
        ...prediction.probabilities,
        KEEP_AS_IS: keepProb,
      },
      action:
        keepProb > prediction.confidence ? "KEEP_AS_IS" : prediction.action,
      confidence: Math.max(prediction.confidence, keepProb),
    };
  }

  const banditState = getBanditState(state.childId);
  const predictionExplore =
    ctx.behavioralPrediction && ctx.behavioralPrediction.confidence < 0.45
      ? 0.08
      : 0;
  const explorationBoost =
    registry.getExplorationWeightBoost(features.segmentKey) +
    personalityExplorationBoost(ctx.personality) +
    predictionExplore;
  const bandit = selectWithBandit(
    prediction,
    banditState,
    mlFlags,
    features.explorationRate,
    explorationBoost,
  );

  const guardedAction = applyOscillationGuard(
    bandit.action,
    state.recentNbaActions ?? [],
  );

  return {
    features,
    prediction,
    banditAction: guardedAction,
    explore: bandit.explore || guardedAction !== bandit.action,
  };
}

export function nbaToDecision(
  action: NbaAction,
  state: RealtimeSessionState,
  ctx: ExtractFeaturesContext,
) {
  return safetyGuard(action, state, ctx);
}

export { nbaActionToRealtimeDecision } from "./actionMapper.js";

export function isChildInMlTraffic(
  childId: string,
  trafficPercentage: number,
): boolean {
  if (trafficPercentage >= 1) return true;
  if (trafficPercentage <= 0) return false;
  let h = 0;
  for (let i = 0; i < childId.length; i++) {
    h = ((h << 5) - h + childId.charCodeAt(i)) | 0;
  }
  const bucket = (Math.abs(h) % 1000) / 1000;
  return bucket < trafficPercentage;
}

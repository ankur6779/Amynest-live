import type {
  AttentionState,
  RealtimeEvent,
  RealtimeSessionState,
} from "../realtime/types.js";
import {
  decisionInFallbackMode,
  evaluateRuleBasedDecision,
} from "../realtime/realtimeDecisionEngine.js";
import { validateRealtimeDecision } from "./safetyGuard.js";
import { realtimeActionToNba } from "./actionMapper.js";
import type { ExtractFeaturesContext } from "./featureExtractor.js";
import {
  isChildInMlTraffic,
  nbaToDecision,
  predictNextBestAction,
} from "./nbaEngine.js";
import { getGlobalTrainingPipeline } from "./trainingPipeline.js";
import { normalizeFeatures } from "./featureExtractor.js";
import { resolveEffectiveMlFlags } from "./deploymentSafety.js";
import { computeMlMetrics } from "./metrics.js";
import type {
  EnrichedRealtimeDecision,
  MlExperimentFlags,
  NbaAction,
} from "./types.js";
import { DEFAULT_ML_EXPERIMENTS } from "./types.js";

export type HybridDecisionOptions = {
  mlFlags?: MlExperimentFlags;
  ctx: ExtractFeaturesContext;
  logTraining?: boolean;
  env?: { mlRolloutStage?: string; mlForceFallback?: string; mlTraffic?: string };
};

function appendNbaAction(state: RealtimeSessionState, action: NbaAction): void {
  const history = [...(state.recentNbaActions ?? []), action].slice(-3);
  state.recentNbaActions = history;
}

/**
 * Hybrid layer: ML when confidence > threshold, else rules.
 * V4: deployment safety, oscillation guard, segment-aware logging.
 */
export function evaluateHybridRealtimeDecision(
  state: RealtimeSessionState,
  latestEvent: RealtimeEvent,
  attention: AttentionState,
  options: HybridDecisionOptions,
): EnrichedRealtimeDecision {
  const metrics = computeMlMetrics();
  const mlFlags = resolveEffectiveMlFlags(
    options.mlFlags ?? DEFAULT_ML_EXPERIMENTS,
    metrics,
    options.env,
  );

  const ruleDecision = evaluateRuleBasedDecision(state, latestEvent, attention);
  const ruleEnriched: EnrichedRealtimeDecision = {
    ...validateRealtimeDecision(ruleDecision, state, options.ctx),
    source: "rule",
    confidence: 1,
    rewardEstimate: 0.5,
    nbaAction: realtimeActionToNba(ruleDecision),
    mlEnabled: false,
    fallbackUsed: true,
  };

  if (
    mlFlags.forceRuleFallback ||
    !mlFlags.mlEnabled ||
    !isChildInMlTraffic(state.childId, mlFlags.mlTrafficPercentage)
  ) {
    if (ruleEnriched.nbaAction) appendNbaAction(state, ruleEnriched.nbaAction);
    return ruleEnriched;
  }

  try {
    const nba = predictNextBestAction(
      state,
      latestEvent,
      attention,
      options.ctx,
      mlFlags,
    );
    const mlConfidence = nba.prediction.confidence;
    const useMl = mlConfidence >= mlFlags.mlConfidenceThreshold;

    if (useMl) {
      const safe = nbaToDecision(nba.banditAction, state, options.ctx);
      const enriched: EnrichedRealtimeDecision = {
        ...safe,
        source: "ml",
        confidence: mlConfidence,
        rewardEstimate: nba.prediction.rewardEstimate,
        nbaAction: nba.banditAction,
        mlEnabled: true,
        fallbackUsed: false,
      };

      if (nba.banditAction) appendNbaAction(state, nba.banditAction);

      if (options.logTraining) {
        const normalized = normalizeFeatures(nba.features);
        getGlobalTrainingPipeline().logDecision({
          childId: state.childId,
          timestamp: latestEvent.timestamp,
          features: nba.features,
          normalizedFeatures: [...normalized.values],
          actionTaken: nba.banditAction,
          mappedAction: enriched.action,
          source: "ml",
          confidence: mlConfidence,
          rewardEstimate: nba.prediction.rewardEstimate,
          segmentKey: nba.features.segmentKey,
        });
      }

      return enriched;
    }

    const fallback: EnrichedRealtimeDecision = {
      ...validateRealtimeDecision(ruleDecision, state, options.ctx),
      source: "rule",
      confidence: mlConfidence,
      rewardEstimate: nba.prediction.rewardEstimate,
      nbaAction: realtimeActionToNba(ruleDecision),
      mlEnabled: true,
      fallbackUsed: true,
    };

    if (fallback.nbaAction) appendNbaAction(state, fallback.nbaAction);

    if (options.logTraining) {
      getGlobalTrainingPipeline().logDecision({
        childId: state.childId,
        timestamp: latestEvent.timestamp,
        features: nba.features,
        normalizedFeatures: [...normalizeFeatures(nba.features).values],
        actionTaken: fallback.nbaAction ?? "KEEP_AS_IS",
        mappedAction: fallback.action,
        source: "rule",
        confidence: mlConfidence,
        rewardEstimate: nba.prediction.rewardEstimate,
        segmentKey: nba.features.segmentKey,
      });
    }

    return fallback;
  } catch {
    return ruleEnriched;
  }
}

export function hybridDecisionInFallbackMode(): EnrichedRealtimeDecision {
  const d = decisionInFallbackMode();
  return {
    ...d,
    source: "rule",
    confidence: 1,
    rewardEstimate: 0,
    mlEnabled: false,
    fallbackUsed: true,
  };
}

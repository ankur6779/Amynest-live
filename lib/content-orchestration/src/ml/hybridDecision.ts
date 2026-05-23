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
import { nbaActionToRealtimeDecision, realtimeActionToNba } from "./actionMapper.js";
import type { ExtractFeaturesContext } from "./featureExtractor.js";
import {
  isChildInMlTraffic,
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
import { emitNbaDecision } from "./nbaDecisionHooks.js";

export type HybridDecisionOptions = {
  mlFlags?: MlExperimentFlags;
  ctx: ExtractFeaturesContext;
  logTraining?: boolean;
  env?: { mlRolloutStage?: string; mlForceFallback?: string; mlTraffic?: string };
  /** Simulation-only confidence shift (does not change logged raw confidence). */
  confidenceCalibrationOffset?: number;
};

/** Minimum ML participation weight in the hybrid blend (never fully rule-dominated). */
export const DEFAULT_MIN_ML_WEIGHT = 0.3;

export type HybridDecisionCandidate = {
  weight: number;
  source: "ml" | "rule";
  nbaAction: NbaAction;
};

function appendNbaAction(state: RealtimeSessionState, action: NbaAction): void {
  const history = [...(state.recentNbaActions ?? []), action].slice(-3);
  state.recentNbaActions = history;
}

function notifyNbaDecision(
  childId: string,
  enriched: EnrichedRealtimeDecision,
): void {
  emitNbaDecision({
    childId,
    used: enriched.source === "ml",
    confidence: enriched.confidence,
    action: enriched.nbaAction ?? "KEEP_AS_IS",
    source: enriched.source,
    mappedAction: enriched.action,
  });
}

/**
 * Weighted random selection between hybrid candidates.
 * Returns the full candidate (action + source), not just the action.
 */
export function weightedSelect<T extends { weight: number }>(
  candidates: T[],
  rng = Math.random(),
): T {
  const total = candidates.reduce((sum, c) => sum + Math.max(0, c.weight), 0);
  if (total <= 0 || candidates.length === 0) {
    return candidates[0]!;
  }

  const rand = rng * total;
  let cumulative = 0;
  for (const candidate of candidates) {
    cumulative += Math.max(0, candidate.weight);
    if (rand <= cumulative) return candidate;
  }
  return candidates[candidates.length - 1]!;
}

/**
 * Weighted hybrid ignores metrics-based auto-fallback so ML always participates
 * at minMlParticipationWeight. Only explicit operator/env overrides hard-block ML.
 */
function shouldHardBlockMl(
  base: MlExperimentFlags,
  env?: HybridDecisionOptions["env"],
): boolean {
  const explicitEnvForce =
    env?.mlForceFallback === "true" || env?.mlForceFallback === "1";
  return explicitEnvForce || base.forceRuleFallback === true || !base.mlEnabled;
}

/**
 * Hybrid layer: ML and rules blended by confidence-weighted selection.
 * V4: deployment safety, oscillation guard, segment-aware logging.
 */
export function evaluateHybridRealtimeDecision(
  state: RealtimeSessionState,
  latestEvent: RealtimeEvent,
  attention: AttentionState,
  options: HybridDecisionOptions,
): EnrichedRealtimeDecision {
  const metrics = computeMlMetrics();
  const baseFlags = options.mlFlags ?? DEFAULT_ML_EXPERIMENTS;
  const mlFlags = resolveEffectiveMlFlags(baseFlags, metrics, options.env);

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
    shouldHardBlockMl(baseFlags, options.env) ||
    !isChildInMlTraffic(state.childId, baseFlags.mlTrafficPercentage)
  ) {
    if (ruleEnriched.nbaAction) appendNbaAction(state, ruleEnriched.nbaAction);
    notifyNbaDecision(state.childId, ruleEnriched);
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
    const mlConfidence = Math.max(
      0,
      Math.min(
        1,
        nba.prediction.confidence + (options.confidenceCalibrationOffset ?? 0),
      ),
    );

    const minMlWeight =
      mlFlags.minMlParticipationWeight ?? DEFAULT_MIN_ML_WEIGHT;
    const mlWeight = Math.max(mlConfidence, minMlWeight);
    const ruleWeight = 1 - mlWeight;

    const mlNbaAction = nba.banditAction;
    const ruleNbaAction = realtimeActionToNba(ruleDecision);

    const selected = weightedSelect<HybridDecisionCandidate>([
      { weight: mlWeight, source: "ml", nbaAction: mlNbaAction },
      { weight: ruleWeight, source: "rule", nbaAction: ruleNbaAction },
    ]);

    const rawDecision =
      selected.source === "ml"
        ? nbaActionToRealtimeDecision(selected.nbaAction)
        : ruleDecision;

    const finalDecision = validateRealtimeDecision(rawDecision, state, options.ctx);

    const enriched: EnrichedRealtimeDecision = {
      ...finalDecision,
      source: selected.source,
      confidence: mlConfidence,
      rewardEstimate: nba.prediction.rewardEstimate,
      nbaAction: selected.nbaAction,
      mlEnabled: true,
      fallbackUsed: selected.source === "rule",
    };

    if (selected.nbaAction) appendNbaAction(state, selected.nbaAction);

    if (options.logTraining) {
      const normalized = normalizeFeatures(nba.features);
      getGlobalTrainingPipeline().logDecision({
        childId: state.childId,
        timestamp: latestEvent.timestamp,
        features: nba.features,
        normalizedFeatures: [...normalized.values],
        actionTaken: selected.nbaAction,
        mappedAction: enriched.action,
        source: selected.source,
        confidence: mlConfidence,
        rewardEstimate: nba.prediction.rewardEstimate,
        segmentKey: nba.features.segmentKey,
      });
    }

    notifyNbaDecision(state.childId, enriched);
    return enriched;
  } catch {
    notifyNbaDecision(state.childId, ruleEnriched);
    return ruleEnriched;
  }
}

export function hybridDecisionInFallbackMode(childId = "unknown"): EnrichedRealtimeDecision {
  const d = decisionInFallbackMode();
  const enriched: EnrichedRealtimeDecision = {
    ...d,
    source: "rule",
    confidence: 1,
    rewardEstimate: 0,
    nbaAction: realtimeActionToNba(d),
    mlEnabled: false,
    fallbackUsed: true,
  };
  notifyNbaDecision(childId, enriched);
  return enriched;
}

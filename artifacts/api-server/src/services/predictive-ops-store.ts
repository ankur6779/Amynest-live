/**
 * Predictive self-healing state — soft degraded mode, dynamic layer weights, pre-warnings.
 */

import { logger } from "../lib/logger.js";

export type LayerWeights = {
  static: number;
  cache: number;
  api: number;
  streaming: number;
  elevenlabs: number;
};

export type PredictedIncident = {
  type: "predicted_incident";
  cause: string;
  detectedAt: number;
  metric: string;
  value: number;
};

export type PredictiveOpsState = {
  degradedMode: boolean;
  layerWeights: LayerWeights;
  apiUsageFactor: number;
  streamingWeightFactor: number;
  cachePriorityBoost: number;
  prefetchDepth: number;
  lastUpdated: number;
};

const DEFAULT_WEIGHTS: LayerWeights = {
  static: 0.25,
  cache: 0.35,
  api: 0.25,
  streaming: 0.15,
  elevenlabs: 0.05,
};

const DEGRADED_WEIGHTS: LayerWeights = {
  static: 0.2,
  cache: 0.6,
  api: 0.1,
  streaming: 0.1,
  elevenlabs: 0.0,
};

export const MAX_PREFETCH_DEPTH = 2;
const DEGRADED_MIN_MS = Number(process.env.DEGRADED_MODE_MIN_MS ?? 120_000);

let degradedEnteredAt = 0;

function capPrefetchDepth(depth: number): number {
  return Math.max(1, Math.min(MAX_PREFETCH_DEPTH, depth));
}

let state: PredictiveOpsState = {
  degradedMode: false,
  layerWeights: { ...DEFAULT_WEIGHTS },
  apiUsageFactor: 1,
  streamingWeightFactor: 1,
  cachePriorityBoost: 0,
  prefetchDepth: 1,
  lastUpdated: Date.now(),
};

const predictedIncidents: PredictedIncident[] = [];
const MAX_INCIDENTS = 15;

export function getPredictiveOpsState(): PredictiveOpsState {
  return {
    ...state,
    layerWeights: { ...state.layerWeights },
    prefetchDepth: capPrefetchDepth(state.prefetchDepth),
  };
}

export function canExitDegradedMode(now = Date.now()): boolean {
  if (!state.degradedMode) return true;
  return now - degradedEnteredAt >= DEGRADED_MIN_MS;
}

export function getDegradedEnteredAt(): number {
  return degradedEnteredAt;
}

export function getDefaultLayerWeights(): LayerWeights {
  return { ...DEFAULT_WEIGHTS };
}

export function getPredictedIncidents(): PredictedIncident[] {
  return [...predictedIncidents];
}

export function isDegradedModeActive(): boolean {
  return state.degradedMode;
}

function normalizeWeights(weights: LayerWeights): LayerWeights {
  const sum =
    weights.static +
    weights.cache +
    weights.api +
    weights.streaming +
    weights.elevenlabs;
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  return {
    static: weights.static / sum,
    cache: weights.cache / sum,
    api: weights.api / sum,
    streaming: weights.streaming / sum,
    elevenlabs: weights.elevenlabs / sum,
  };
}

export function setLayerWeights(weights: Partial<LayerWeights>): void {
  state.layerWeights = normalizeWeights({ ...state.layerWeights, ...weights });
  state.lastUpdated = Date.now();
}

export function enableDegradedMode(): void {
  if (state.degradedMode) return;
  state.degradedMode = true;
  degradedEnteredAt = Date.now();
  state.layerWeights = normalizeWeights({ ...DEGRADED_WEIGHTS });
  state.apiUsageFactor = 0.5;
  state.streamingWeightFactor = 0.5;
  state.cachePriorityBoost = 0.25;
  state.prefetchDepth = capPrefetchDepth(2);
  state.lastUpdated = Date.now();
  logger.warn({ evt: "predictive.degraded_mode_enabled" }, "predictive: degraded mode enabled");
}

export function disableDegradedMode(): void {
  if (!state.degradedMode) return;
  state.degradedMode = false;
  degradedEnteredAt = 0;
  state.layerWeights = normalizeWeights({ ...DEFAULT_WEIGHTS });
  state.apiUsageFactor = 1;
  state.streamingWeightFactor = 1;
  state.cachePriorityBoost = 0;
  state.prefetchDepth = 1;
  state.lastUpdated = Date.now();
  logger.info({ evt: "predictive.degraded_mode_disabled" }, "predictive: degraded mode disabled");
}

export function preemptivelyReduceApiUsage(): void {
  state.apiUsageFactor = Math.min(state.apiUsageFactor, 0.5);
  state.layerWeights = normalizeWeights({
    ...state.layerWeights,
    api: state.layerWeights.api * 0.6,
    cache: state.layerWeights.cache * 1.15,
  });
  state.lastUpdated = Date.now();
}

export function prioritizeCacheOverApi(): void {
  state.cachePriorityBoost = Math.max(state.cachePriorityBoost, 0.2);
  state.layerWeights = normalizeWeights({
    ...state.layerWeights,
    cache: state.layerWeights.cache * 1.25,
    api: state.layerWeights.api * 0.75,
    streaming: state.layerWeights.streaming * 0.85,
  });
  state.prefetchDepth = capPrefetchDepth(Math.max(state.prefetchDepth, 2));
  state.lastUpdated = Date.now();
}

export function reduceStreamingWeight(): void {
  state.streamingWeightFactor = Math.min(state.streamingWeightFactor, 0.6);
  state.layerWeights = normalizeWeights({
    ...state.layerWeights,
    streaming: state.layerWeights.streaming * 0.65,
    cache: state.layerWeights.cache * 1.1,
  });
  state.lastUpdated = Date.now();
}

export function recordPredictedIncident(
  cause: string,
  metric: string,
  value: number,
  now = Date.now(),
): PredictedIncident {
  const incident: PredictedIncident = {
    type: "predicted_incident",
    cause,
    detectedAt: now,
    metric,
    value,
  };
  predictedIncidents.unshift(incident);
  if (predictedIncidents.length > MAX_INCIDENTS) predictedIncidents.length = MAX_INCIDENTS;
  logger.warn(incident, `predicted incident: ${cause}`);
  return incident;
}

export function relaxPredictiveAdjustments(): void {
  if (state.degradedMode) return;
  state.apiUsageFactor = Math.min(1, state.apiUsageFactor + 0.15);
  state.streamingWeightFactor = Math.min(1, state.streamingWeightFactor + 0.15);
  state.cachePriorityBoost = Math.max(0, state.cachePriorityBoost - 0.05);
  state.layerWeights = normalizeWeights({
    static: DEFAULT_WEIGHTS.static,
    cache: DEFAULT_WEIGHTS.cache + state.cachePriorityBoost * 0.1,
    api: DEFAULT_WEIGHTS.api * state.apiUsageFactor,
    streaming: DEFAULT_WEIGHTS.streaming * state.streamingWeightFactor,
    elevenlabs: DEFAULT_WEIGHTS.elevenlabs,
  });
  if (state.apiUsageFactor >= 0.95 && state.streamingWeightFactor >= 0.95) {
    state.prefetchDepth = 1;
  }
  state.lastUpdated = Date.now();
}

/** Test-only reset. */
export function resetPredictiveOpsStoreForTests(): void {
  state = {
    degradedMode: false,
    layerWeights: { ...DEFAULT_WEIGHTS },
    apiUsageFactor: 1,
    streamingWeightFactor: 1,
    cachePriorityBoost: 0,
    prefetchDepth: 1,
    lastUpdated: Date.now(),
  };
  degradedEnteredAt = 0;
  predictedIncidents.length = 0;
}

/** Test-only — backdate degraded entry for cooldown tests. */
export function setDegradedEnteredAtForTests(ts: number): void {
  degradedEnteredAt = ts;
}

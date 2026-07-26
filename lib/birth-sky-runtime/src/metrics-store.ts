/**
 * In-memory observability + product analytics ring buffers (no PII).
 */

import type {
  CostRollup,
  PipelineObservabilityEvent,
  ProductAnalyticsEvent,
  QualityDashboardMetrics,
} from "./types.js";

const MAX_OBS = 5_000;
const MAX_ANALYTICS = 5_000;

const obsEvents: PipelineObservabilityEvent[] = [];
const analyticsEvents: ProductAnalyticsEvent[] = [];

export function recordPipelineObservability(
  event: Omit<PipelineObservabilityEvent, "ts"> & { ts?: number },
): PipelineObservabilityEvent {
  const row: PipelineObservabilityEvent = {
    ...event,
    ts: event.ts ?? Date.now(),
  };
  obsEvents.push(row);
  if (obsEvents.length > MAX_OBS) {
    obsEvents.splice(0, obsEvents.length - MAX_OBS);
  }
  return row;
}

export function recordProductAnalytics(
  event: Omit<ProductAnalyticsEvent, "ts"> & { ts?: number },
): ProductAnalyticsEvent {
  const row: ProductAnalyticsEvent = {
    ...event,
    ts: event.ts ?? Date.now(),
  };
  analyticsEvents.push(row);
  if (analyticsEvents.length > MAX_ANALYTICS) {
    analyticsEvents.splice(0, analyticsEvents.length - MAX_ANALYTICS);
  }
  return row;
}

export function listObservabilityEvents(): readonly PipelineObservabilityEvent[] {
  return obsEvents;
}

export function listAnalyticsEvents(): readonly ProductAnalyticsEvent[] {
  return analyticsEvents;
}

/** Test helper. */
export function resetRuntimeMetricsForTests(): void {
  obsEvents.length = 0;
  analyticsEvents.length = 0;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeQualityMetrics(
  windowMs = 24 * 60 * 60 * 1000,
): QualityDashboardMetrics {
  const since = Date.now() - windowMs;
  const rows = obsEvents.filter((e) => e.ts >= since);
  const analytics = analyticsEvents.filter((e) => e.ts >= since);

  const pipelineMs = rows.map((r) => r.totalPipelineMs);
  const llmMs = rows
    .map((r) => r.llmLatencyMs)
    .filter((x): x is number => typeof x === "number");
  const responseTimes = rows.map((r) => (r.llmLatencyMs ?? 0) + r.totalPipelineMs);

  const evalScores = rows
    .map((r) => r.evaluationScore)
    .filter((x): x is number => typeof x === "number");
  const safetyScores = rows
    .map((r) => r.safetyScore)
    .filter((x): x is number => typeof x === "number");

  const failures = rows.filter((r) => r.status === "error").length;
  const fallbacks = rows.filter(
    (r) => r.status === "degraded" || r.failoverStages.length > 0,
  ).length;

  const cacheHits = rows.filter((r) => r.cacheHit === true).length;
  const cacheMisses = rows.filter((r) => r.cacheMiss === true).length;
  const cacheDenom = cacheHits + cacheMisses;

  const starts = analytics.filter((a) => a.name === "conversation_start").length;
  const completes = analytics.filter(
    (a) => a.name === "conversation_complete",
  ).length;

  return {
    averageResponseTimeMs: avg(responseTimes.length ? responseTimes : pipelineMs),
    averageEvaluationScore: avg(evalScores),
    averageSafetyScore: avg(safetyScores),
    failureRate: rows.length ? failures / rows.length : 0,
    fallbackRate: rows.length ? fallbacks / rows.length : 0,
    cacheHitRatio: cacheDenom ? cacheHits / cacheDenom : null,
    conversationCompletionRate: starts ? completes / starts : null,
    sampleSize: rows.length,
  };
}

export function computeCostRollup(windowMs = 24 * 60 * 60 * 1000): CostRollup {
  const since = Date.now() - windowMs;
  const rows = obsEvents.filter((e) => e.ts >= since);
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const monthKey = now.toISOString().slice(0, 7);

  const dayStart = Date.parse(`${dayKey}T00:00:00.000Z`);
  const monthStart = Date.parse(`${monthKey}-01T00:00:00.000Z`);

  let totalPrompt = 0;
  let totalCompletion = 0;
  let totalCost = 0;
  let costSamples = 0;
  let dailyCost = 0;
  let monthlyCost = 0;

  for (const r of obsEvents) {
    const c = r.estimatedCostUsd;
    if (typeof c === "number") {
      if (r.ts >= since) {
        totalCost += c;
        costSamples += 1;
      }
      if (r.ts >= dayStart) dailyCost += c;
      if (r.ts >= monthStart) monthlyCost += c;
    }
    if (r.ts >= since) {
      totalPrompt += r.promptTokens ?? 0;
      totalCompletion += r.completionTokens ?? 0;
    }
  }

  return {
    sampleSize: rows.length,
    totalPromptTokens: totalPrompt,
    totalCompletionTokens: totalCompletion,
    totalEstimatedCostUsd: Math.round(totalCost * 1e6) / 1e6,
    averageCostPerConversationUsd:
      costSamples > 0 ? Math.round((totalCost / costSamples) * 1e6) / 1e6 : null,
    dailyCostUsd: Math.round(dailyCost * 1e6) / 1e6,
    monthlyCostUsd: Math.round(monthlyCost * 1e6) / 1e6,
    dayKey,
    monthKey,
  };
}

export function p95(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx]!;
}

export function topErrorCodes(
  windowMs = 24 * 60 * 60 * 1000,
  limit = 10,
): Array<{ code: string; count: number }> {
  const since = Date.now() - windowMs;
  const map = new Map<string, number>();
  for (const e of obsEvents) {
    if (e.ts < since) continue;
    for (const t of e.stageTimings) {
      if (t.status === "failed" && t.errorCode) {
        map.set(t.errorCode, (map.get(t.errorCode) ?? 0) + 1);
      }
    }
  }
  return [...map.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function experimentArmCounts(
  windowMs = 24 * 60 * 60 * 1000,
): Array<{ experimentId: string; armCounts: Record<string, number> }> {
  const since = Date.now() - windowMs;
  const byExp = new Map<string, Record<string, number>>();
  for (const e of obsEvents) {
    if (e.ts < since || !e.experiment) continue;
    const arms = byExp.get(e.experiment.experimentId) ?? {};
    arms[e.experiment.armId] = (arms[e.experiment.armId] ?? 0) + 1;
    byExp.set(e.experiment.experimentId, arms);
  }
  return [...byExp.entries()].map(([experimentId, armCounts]) => ({
    experimentId,
    armCounts,
  }));
}

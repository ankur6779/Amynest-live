/**
 * Phase 7 — Platform health scoring.
 *
 * Aggregates operational signals (sync reliability, reward accuracy,
 * recommendation quality, queue health, render smoothness, retention)
 * into a single 0..100 score with a categorical label. Designed for
 * internal dashboards — never surfaced to children/parents.
 */

import type { RecommendationQualityScore } from "./recommendation-quality";

export interface PlatformHealthInputs {
  /** 0..1 — fraction of sync writes that succeed on the first try. */
  syncSuccessRate?: number;
  /** Median sync latency in ms. */
  syncLatencyMs?: number;
  /** 0..1 — fraction of reward events delivered correctly (no desync). */
  rewardAccuracy?: number;
  /** Recommendation quality score from `recommendation-quality.ts`. */
  recommendation?: RecommendationQualityScore;
  /** Items currently waiting in the sync queue (across all clients sampled). */
  queueDepth?: number;
  /** Median client FPS in the last sample. */
  renderFps?: number;
  /** 0..1 — D7 retention for the latest cohort. */
  d7Retention?: number;
  /** Count of burnout signals raised in the last 24h. */
  burnoutSignals?: number;
}

export interface PlatformHealthScore {
  score: number;
  label: "excellent" | "healthy" | "watch" | "degraded" | "critical";
  signals: {
    sync: number;
    reward: number;
    recommendation: number;
    queue: number;
    render: number;
    retention: number;
    behavior: number;
  };
  notes: string[];
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function scorePlatformHealth(inputs: PlatformHealthInputs): PlatformHealthScore {
  const notes: string[] = [];

  const sync = (() => {
    const rate = inputs.syncSuccessRate ?? 1;
    const lat = inputs.syncLatencyMs ?? 300;
    let s = rate * 100;
    if (lat > 1000) s -= 20;
    else if (lat > 500) s -= 10;
    if (rate < 0.95) notes.push("sync success rate below 95%");
    return clamp(s);
  })();

  const reward = (() => {
    const acc = inputs.rewardAccuracy ?? 1;
    if (acc < 0.99) notes.push("reward desync detected");
    return clamp(acc * 100);
  })();

  const recommendation = (() => {
    if (!inputs.recommendation || inputs.recommendation.shown === 0) return 70;
    const eff = inputs.recommendation.effectiveness; // -1..1
    if (inputs.recommendation.fatigueRisk) notes.push("recommendation fatigue detected");
    return clamp((eff + 1) * 50);
  })();

  const queue = (() => {
    const depth = inputs.queueDepth ?? 0;
    if (depth > 1000) {
      notes.push("queue depth high");
      return 30;
    }
    if (depth > 200) return 60;
    if (depth > 50) return 85;
    return 100;
  })();

  const render = (() => {
    const fps = inputs.renderFps ?? 60;
    if (fps < 30) {
      notes.push("low fps on devices");
      return 30;
    }
    if (fps < 50) return 70;
    return 100;
  })();

  const retention = (() => {
    const r = inputs.d7Retention ?? 0.4;
    return clamp(r * 100);
  })();

  const behavior = (() => {
    const bs = inputs.burnoutSignals ?? 0;
    if (bs > 50) {
      notes.push("widespread burnout signals — pace back");
      return 20;
    }
    if (bs > 10) return 60;
    return 100;
  })();

  // Weighted blend — sync + reward + queue are the foundation; the rest is
  // behavioral quality.
  const score = clamp(
    sync * 0.2 +
      reward * 0.2 +
      queue * 0.15 +
      render * 0.15 +
      recommendation * 0.1 +
      retention * 0.1 +
      behavior * 0.1,
  );

  let label: PlatformHealthScore["label"] = "excellent";
  if (score < 30) label = "critical";
  else if (score < 55) label = "degraded";
  else if (score < 70) label = "watch";
  else if (score < 85) label = "healthy";

  return {
    score: Math.round(score),
    label,
    signals: { sync, reward, recommendation, queue, render, retention, behavior },
    notes,
  };
}

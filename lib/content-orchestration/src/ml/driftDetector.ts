import { computeMlMetrics } from "./metrics.js";
import type { DriftReport } from "./types-meta.js";
import type { MlMetrics } from "./types.js";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

const baselineEngagement = { value: 0.55, samples: 0 };
const baselineAccuracy = { value: 0.6, samples: 0 };

export function updateDriftBaselines(metrics: MlMetrics): void {
  if (metrics.sampleCount < 20) return;
  const eng = clamp01(0.5 + metrics.engagementLift * 0.5);
  const acc = metrics.predictionAccuracy;
  baselineEngagement.value =
    baselineEngagement.samples === 0
      ? eng
      : baselineEngagement.value * 0.9 + eng * 0.1;
  baselineEngagement.samples += 1;
  baselineAccuracy.value =
    baselineAccuracy.samples === 0
      ? acc
      : baselineAccuracy.value * 0.9 + acc * 0.1;
  baselineAccuracy.samples += 1;
}

export function detectDrift(metrics: MlMetrics = computeMlMetrics()): DriftReport {
  updateDriftBaselines(metrics);

  const modelDrift =
    metrics.sampleCount >= 15
      ? clamp01(Math.abs(metrics.predictionAccuracy - baselineAccuracy.value))
      : 0;

  const behaviorDrift =
    metrics.sampleCount >= 15
      ? clamp01(Math.abs(metrics.avgReward - 0.2) * 2)
      : 0;

  const engagementDrop =
    metrics.sampleCount >= 15
      ? clamp01(Math.max(0, baselineEngagement.value - (0.5 + metrics.engagementLift * 0.5)))
      : 0;

  const triggers: string[] = [];
  if (modelDrift > 0.2) triggers.push("model_drift");
  if (behaviorDrift > 0.25) triggers.push("behavior_drift");
  if (engagementDrop > 0.15) triggers.push("engagement_drop");
  if (metrics.fallbackRate > 0.6) triggers.push("high_fallback_rate");

  const maxSignal = Math.max(modelDrift, behaviorDrift, engagementDrop);
  let severity: DriftReport["severity"] = "none";
  if (maxSignal > 0.35 || triggers.length >= 2) severity = "high";
  else if (maxSignal > 0.2) severity = "medium";
  else if (maxSignal > 0.1) severity = "low";

  return { modelDrift, behaviorDrift, engagementDrop, severity, triggers };
}

export function driftResponseActions(report: DriftReport): {
  triggerRetrain: boolean;
  explorationBoost: number;
} {
  return {
    triggerRetrain: report.severity === "high" || report.triggers.includes("model_drift"),
    explorationBoost:
      report.severity === "high"
        ? 0.08
        : report.severity === "medium"
          ? 0.04
          : report.severity === "low"
            ? 0.02
            : 0,
  };
}

export function resetDriftBaselines(): void {
  baselineEngagement.value = 0.55;
  baselineEngagement.samples = 0;
  baselineAccuracy.value = 0.6;
  baselineAccuracy.samples = 0;
}

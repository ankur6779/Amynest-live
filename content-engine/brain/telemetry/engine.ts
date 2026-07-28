import type {
  BrainTelemetry,
  ExperimentResult,
  PerformancePrediction,
  TrendProviderId,
} from "../../types/campaign-plan.js";
import type { AnalyticsReport } from "../../types/analytics.js";

export function buildBrainTelemetry(input: {
  analytics: AnalyticsReport;
  expected: PerformancePrediction;
  experimentResults: ExperimentResult[];
  recommendationCount: number;
  provider: TrendProviderId;
  planningDurationMs: number;
}): BrainTelemetry {
  const actualViews = input.analytics.periodReport.averageViews || 0;
  const predictedViews = input.expected.expectedViews || 1;
  const predictionAccuracy = clamp01(
    1 - Math.min(1, Math.abs(actualViews - predictedViews) / predictedViews),
  );

  const optimizationGains = clamp01(
    input.analytics.recommendations.length / 10 +
      input.analytics.optimizationSignals.length / 20,
  );

  const campaignSuccess = clamp01(
    (input.analytics.periodReport.averageCtr || 0) * 8 +
      (input.analytics.periodReport.averageRetention || 0) * 0.5,
  );

  const experimentSuccess =
    input.experimentResults.length === 0
      ? 0
      : clamp01(
          input.experimentResults.reduce((s, r) => s + r.confidence * (1 + r.lift), 0) /
            input.experimentResults.length /
            1.2,
        );

  const recommendationAcceptance = clamp01(
    Math.min(1, input.recommendationCount / 8) * 0.7 +
      input.expected.confidence * 0.3,
  );

  return {
    predictionAccuracy: Number(predictionAccuracy.toFixed(3)),
    optimizationGains: Number(optimizationGains.toFixed(3)),
    campaignSuccess: Number(campaignSuccess.toFixed(3)),
    experimentSuccess: Number(experimentSuccess.toFixed(3)),
    recommendationAcceptance: Number(recommendationAcceptance.toFixed(3)),
    provider: input.provider,
    planningDurationMs: input.planningDurationMs,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

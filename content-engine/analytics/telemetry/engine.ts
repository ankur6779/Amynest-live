import type {
  AnalyticsProviderId,
  AnalyticsTelemetry,
} from "../../types/analytics.js";

export function buildAnalyticsTelemetry(input: {
  apiLatencyMs: number;
  collectionDurationMs: number;
  missingMetrics: string[];
  errors: string[];
  provider: AnalyticsProviderId;
  videosAnalyzed: number;
}): AnalyticsTelemetry {
  return {
    apiLatencyMs: input.apiLatencyMs,
    collectionDurationMs: input.collectionDurationMs,
    missingMetrics: input.missingMetrics.length,
    errors: [...input.errors],
    provider: input.provider,
    videosAnalyzed: input.videosAnalyzed,
  };
}

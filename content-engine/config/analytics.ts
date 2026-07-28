import type {
  ContentEngineConfig,
  ResolvedAnalyticsConfig,
} from "../types/index.js";
import type { AnalyticsEngineSettings } from "../types/analytics.js";

export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsEngineSettings = {
  analyticsProvider: "mock",
  reportSchedule: "daily",
  minimumSampleSize: 3,
  learningRetentionDays: 90,
  optimizationEnabled: true,
};

/** Merge Phase 8 analytics defaults (backward compatible). */
export function resolveAnalyticsSettings(
  config: ContentEngineConfig,
): ResolvedAnalyticsConfig {
  return {
    ...config,
    analyticsProvider:
      config.analyticsProvider ?? DEFAULT_ANALYTICS_SETTINGS.analyticsProvider,
    reportSchedule: config.reportSchedule ?? DEFAULT_ANALYTICS_SETTINGS.reportSchedule,
    minimumSampleSize:
      config.minimumSampleSize ?? DEFAULT_ANALYTICS_SETTINGS.minimumSampleSize,
    learningRetentionDays:
      config.learningRetentionDays ?? DEFAULT_ANALYTICS_SETTINGS.learningRetentionDays,
    optimizationEnabled:
      config.optimizationEnabled ?? DEFAULT_ANALYTICS_SETTINGS.optimizationEnabled,
  };
}

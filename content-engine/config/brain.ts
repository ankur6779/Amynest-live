import type {
  ContentEngineConfig,
  ResolvedBrainConfig,
} from "../types/index.js";
import type { BrainEngineSettings } from "../types/campaign-plan.js";

export const DEFAULT_BRAIN_SETTINGS: BrainEngineSettings = {
  campaignPlanningEnabled: true,
  optimizationEnabled: true,
  trendProvider: "mock",
  seasonalCalendar: "IN",
  abTestingEnabled: true,
  predictionEnabled: true,
  learningWindowDays: 60,
  confidenceThreshold: 0.55,
};

/** Merge Phase 9 brain defaults (backward compatible). */
export function resolveBrainSettings(
  config: ContentEngineConfig,
): ResolvedBrainConfig {
  return {
    ...config,
    campaignPlanningEnabled:
      config.campaignPlanningEnabled ?? DEFAULT_BRAIN_SETTINGS.campaignPlanningEnabled,
    optimizationEnabled:
      config.optimizationEnabled ?? DEFAULT_BRAIN_SETTINGS.optimizationEnabled,
    trendProvider: config.trendProvider ?? DEFAULT_BRAIN_SETTINGS.trendProvider,
    seasonalCalendar:
      config.seasonalCalendar ?? DEFAULT_BRAIN_SETTINGS.seasonalCalendar,
    abTestingEnabled:
      config.abTestingEnabled ?? DEFAULT_BRAIN_SETTINGS.abTestingEnabled,
    predictionEnabled:
      config.predictionEnabled ?? DEFAULT_BRAIN_SETTINGS.predictionEnabled,
    learningWindowDays:
      config.learningWindowDays ?? DEFAULT_BRAIN_SETTINGS.learningWindowDays,
    confidenceThreshold:
      config.confidenceThreshold ?? DEFAULT_BRAIN_SETTINGS.confidenceThreshold,
  };
}

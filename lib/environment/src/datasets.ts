// Typed dataset loaders. Datasets are JSON so they can be hot-swapped for
// localized, ML-trained, or A/B-test variants without code changes.

import ageEnvironmentalTolerance from "./datasets/ageEnvironmentalTolerance.json" with { type: "json" };
import hydrationProfiles from "./datasets/hydrationProfiles.json" with { type: "json" };
import AQIRiskThresholds from "./datasets/AQIRiskThresholds.json" with { type: "json" };
import weatherEnergyProfiles from "./datasets/weatherEnergyProfiles.json" with { type: "json" };
import seasonalNutritionProfiles from "./datasets/seasonalNutritionProfiles.json" with { type: "json" };
import circadianProfiles from "./datasets/circadianProfiles.json" with { type: "json" };
import environmentalStressProfiles from "./datasets/environmentalStressProfiles.json" with { type: "json" };
import UVExposureRules from "./datasets/UVExposureRules.json" with { type: "json" };
import predictiveWeatherProfiles from "./datasets/predictiveWeatherProfiles.json" with { type: "json" };
import emotionalWeatherProfiles from "./datasets/emotionalWeatherProfiles.json" with { type: "json" };
import environmentalActivityLibrary from "./datasets/environmentalActivityLibrary.json" with { type: "json" };
import environmentalRiskScoring from "./datasets/environmentalRiskScoring.json" with { type: "json" };

export const datasets = {
  ageEnvironmentalTolerance,
  hydrationProfiles,
  AQIRiskThresholds,
  weatherEnergyProfiles,
  seasonalNutritionProfiles,
  circadianProfiles,
  environmentalStressProfiles,
  UVExposureRules,
  predictiveWeatherProfiles,
  emotionalWeatherProfiles,
  environmentalActivityLibrary,
  environmentalRiskScoring,
} as const;

export type EnvironmentDatasets = typeof datasets;

// Public barrel for @workspace/environment.

export type {
  EnvAgeGroup,
  EnvLevel,
  OutdoorSuitability,
  AQIBucket,
  UVBucket,
  WeatherCondition,
  Season,
  AtmosphericSnapshot,
  PredictedWeatherShift,
  EnvironmentalContext,
  EnvironmentalProvider,
} from "./types.js";

export { datasets } from "./datasets.js";
export { OpenMeteoProvider } from "./providers/openMeteo.js";
export { buildEnvironmentalContext, classifyAqi, classifyUv, classifyWeather, classifySeason } from "./risk.js";
export { buildExplanations } from "./explainability.js";
export { mapToWeatherOutdoor, buildAiPromptBlock, buildEnvironmentalSummary } from "./weatherMapper.js";
export { resolveDefaultLocation } from "./locationDefaults.js";
export { getEnvironmentalContext } from "./orchestrator.js";
export { mapAgeGroupToEnvAgeGroup } from "./ageMapper.js";
export {
  applyEnvironmentalEnrichments,
  type EnrichableItem,
} from "./enrichments.js";

/**
 * Builds a unified routine context from API inputs + country profile.
 */
import type { WeatherOutdoor } from "@workspace/family-routine";
import type { EnvLevel } from "@workspace/environment";
import {
  getCountryRoutineProfile,
  normalizeCountryCode,
  type CountryRoutineProfile,
  type LaunchCountry,
} from "./routine-country-profile.js";
import type { RoutineEnvironmentInput } from "./routine-aqi.js";
import type { PreviousDayContext, RoutineRawContext } from "./routine-context-engine.js";

export type BuildRoutineContextInput = {
  weatherOutdoor?: WeatherOutdoor;
  country?: string | null;
  region?: string;
  isWeekendDay?: boolean;
  hasSchool?: boolean;
  mood?: string;
  previousDayContext?: PreviousDayContext;
  environmentalRiskScore?: number;
  outdoorSuitability?: "yes" | "no" | "limited";
  temperatureC?: number | null;
  hydrationNeedLevel?: EnvLevel;
  sensoryStressLevel?: EnvLevel;
  cognitiveComfortLevel?: EnvLevel;
  /** EQIE bundle — temperature, condition label, US AQI. */
  environment?: RoutineEnvironmentInput;
  aqi?: number | null;
};

export type BuiltRoutineContext = RoutineRawContext & {
  country: LaunchCountry;
  countryProfile: CountryRoutineProfile;
};

/**
 * Merges raw signals with `getCountryRoutineProfile(country)` for the context layer.
 */
export function buildRoutineContext(input: BuildRoutineContextInput): BuiltRoutineContext {
  const country = normalizeCountryCode(input.country);
  const countryProfile = getCountryRoutineProfile(country);

  const environment = input.environment;
  const temperatureC =
    input.temperatureC ??
    environment?.temperature ??
    null;
  const aqi =
    input.aqi ??
    environment?.AQI ??
    null;

  return {
    weatherOutdoor: input.weatherOutdoor ?? "yes",
    country,
    countryProfile,
    region: input.region ?? countryProfile.mealPattern,
    isWeekendDay: input.isWeekendDay,
    hasSchool: input.hasSchool,
    mood: input.mood,
    previousDayContext: input.previousDayContext,
    environmentalRiskScore: input.environmentalRiskScore,
    outdoorSuitability: input.outdoorSuitability,
    temperatureC,
    hydrationNeedLevel: input.hydrationNeedLevel,
    sensoryStressLevel: input.sensoryStressLevel,
    cognitiveComfortLevel: input.cognitiveComfortLevel,
    environment: environment
      ? {
          temperature: temperatureC,
          condition: environment.condition,
          AQI: aqi,
        }
      : aqi != null || temperatureC != null
        ? { temperature: temperatureC, AQI: aqi }
        : undefined,
    aqi,
  };
}

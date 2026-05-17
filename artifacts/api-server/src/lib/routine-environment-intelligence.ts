/**
 * Unified environmental severity — combines AQI, temperature, and weather
 * to drive dayPlanningMode and constraint level.
 */
import type { LaunchCountry } from "./routine-country-profile.js";
import { normalizeCountryCode } from "./routine-country-profile.js";
import type { RoutineRawContext } from "./routine-context-engine.js";
import {
  deriveAqiOutdoorPolicy,
  exposureModeFromWeatherBlock,
  mergeExposureModes,
  resolveAqiFromContext,
  type ExposureMode,
} from "./routine-aqi.js";
import type { DayPlanningMode } from "./routine-weather-planning.js";

export type EnvironmentSeverity = "low" | "medium" | "high";

export type EnvironmentAssessment = {
  severity: EnvironmentSeverity;
  dayPlanningMode: DayPlanningMode;
  aqiPolicy: ReturnType<typeof deriveAqiOutdoorPolicy>;
  /** Weather ∩ AQI — stricter exposure wins. */
  mergedExposureMode: ExposureMode;
  signals: string[];
};

/** Merge weather block and AQI exposure (stricter condition applies). */
export function mergeWeatherAndAqiExposure(
  ctx: RoutineRawContext,
  country: LaunchCountry,
  weatherPlanningMode: DayPlanningMode,
): ExposureMode {
  const aqiPolicy = deriveAqiOutdoorPolicy(resolveAqiFromContext(ctx), country);
  const weatherExposure = exposureModeFromWeatherBlock({
    forceIndoorDay: weatherPlanningMode === "indoor_day",
    limitedOutdoor:
      weatherPlanningMode === "limited_outdoor" ||
      weatherPlanningMode === "avoid_afternoon" ||
      weatherPlanningMode === "evening_only",
  });
  return mergeExposureModes(aqiPolicy.exposureMode, weatherExposure);
}

function dayPlanningModeFromExposure(mode: ExposureMode): DayPlanningMode {
  if (mode === "indoor_only") return "indoor_day";
  if (mode === "controlled" || mode === "limited" || mode === "reduced") {
    return "limited_outdoor";
  }
  return "normal";
}

function isRainyOrIndoorOnly(ctx: RoutineRawContext): boolean {
  return ctx.weatherOutdoor === "no" || ctx.outdoorSuitability === "no";
}

function isSnow(ctx: RoutineRawContext): boolean {
  return ctx.temperatureC != null && ctx.temperatureC <= 2;
}

function isExtremeHeat(ctx: RoutineRawContext, country: LaunchCountry): boolean {
  return (
    normalizeCountryCode(country) === "AE" ||
    ctx.hydrationNeedLevel === "extreme" ||
    (ctx.temperatureC != null && ctx.temperatureC >= 40)
  );
}

function isHot(ctx: RoutineRawContext): boolean {
  return ctx.temperatureC != null && ctx.temperatureC >= 32;
}

/**
 * Composite severity from AQI + temperature + weather (predictive, pre-schedule).
 */
export function deriveEnvironmentSeverity(
  ctx: RoutineRawContext,
  country: LaunchCountry,
): EnvironmentSeverity {
  const aqi = resolveAqiFromContext(ctx);
  let points = 0;

  if (aqi != null) {
    if (aqi > 200) return "high";
    if (aqi > 150) points += 3;
    else if (aqi > 100) points += 2;
    else if (aqi > 50) points += 1;
  }

  if (isExtremeHeat(ctx, country)) points += 4;
  else if (isHot(ctx)) points += 3;
  else if (ctx.temperatureC != null && ctx.temperatureC < 8) points += 2;

  if (isRainyOrIndoorOnly(ctx)) points += 3;
  else if (ctx.weatherOutdoor === "limited" || ctx.outdoorSuitability === "limited") {
    points += 2;
  }

  if (isSnow(ctx)) points += 2;
  if ((ctx.environmentalRiskScore ?? 0) >= 70) points += 3;

  if (points >= 5) return "high";
  if (points >= 2) return "medium";
  return "low";
}

export function dayPlanningModeFromEnvironment(
  ctx: RoutineRawContext,
  country: LaunchCountry,
  severity: EnvironmentSeverity,
): DayPlanningMode {
  if (isRainyOrIndoorOnly(ctx) || isSnow(ctx)) {
    return dayPlanningModeFromExposure(
      mergeWeatherAndAqiExposure(ctx, country, "indoor_day"),
    );
  }

  let weatherMode: DayPlanningMode = "normal";
  if (isExtremeHeat(ctx, country) || (severity === "high" && isHot(ctx))) {
    weatherMode = "evening_only";
  } else if (isHot(ctx)) {
    weatherMode = severity === "high" ? "evening_only" : "avoid_afternoon";
  } else if (
    severity === "medium" ||
    ctx.weatherOutdoor === "limited" ||
    (ctx.temperatureC != null && ctx.temperatureC < 12)
  ) {
    weatherMode = "limited_outdoor";
  }

  const merged = mergeWeatherAndAqiExposure(ctx, country, weatherMode);
  if (merged === "indoor_only") {
    return "indoor_day";
  }
  if (weatherMode === "evening_only" || weatherMode === "avoid_afternoon") {
    return weatherMode;
  }
  return dayPlanningModeFromExposure(merged);
}

export function assessEnvironment(
  ctx: RoutineRawContext,
  country: LaunchCountry,
): EnvironmentAssessment {
  const severity = deriveEnvironmentSeverity(ctx, country);
  const aqiPolicy = deriveAqiOutdoorPolicy(resolveAqiFromContext(ctx), country);
  const dayPlanningMode = dayPlanningModeFromEnvironment(ctx, country, severity);
  const mergedExposureMode = mergeWeatherAndAqiExposure(ctx, country, dayPlanningMode);
  const signals: string[] = [
    `severity=${severity}`,
    `dayPlanningMode=${dayPlanningMode}`,
    `exposure=${mergedExposureMode}`,
  ];
  const aqi = resolveAqiFromContext(ctx);
  if (aqi != null) {
    signals.push(`aqi=${aqi} (${aqiPolicy.category}, base=${aqiPolicy.baseExposureMode})`);
  }
  if (ctx.temperatureC != null) signals.push(`temp=${ctx.temperatureC}°C`);
  if (ctx.weatherOutdoor) signals.push(`weatherOutdoor=${ctx.weatherOutdoor}`);
  return { severity, dayPlanningMode, aqiPolicy, mergedExposureMode, signals };
}

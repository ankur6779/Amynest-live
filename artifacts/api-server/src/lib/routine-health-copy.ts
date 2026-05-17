/**
 * Human-friendly health & environment copy for routine blocks.
 */
import type { InterpretedBehavioralState, RoutineRawContext } from "./routine-context-engine.js";
import {
  aqiSeverityLabelForMessaging,
  resolveAqiFromContext,
} from "./routine-aqi.js";
import type { LaunchCountry } from "./routine-country-profile.js";
import { deriveEnvironmentSeverity } from "./routine-environment-intelligence.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";

export type RoutineConfidence = "high" | "medium" | "low";

export const MIN_OUTDOOR_SPORT_MINS = 20;

function aqiBandLabel(aqi: number): string {
  const severity = aqiSeverityLabelForMessaging(aqi);
  if (severity === "good") return "Air quality is good — normal outdoor time is fine.";
  if (severity === "moderate") {
    return "Air quality is moderate — slightly shorter outdoor time is sensible.";
  }
  if (severity === "unhealthy") {
    return "Air quality is unhealthy — limit outdoor time and use a mask if you go out.";
  }
  return "Air quality is very poor — stay indoors for breathing safety.";
}

export function aqiOutdoorLimitNote(
  aqi: number | null | undefined,
  maxMins: number | null | undefined,
): string | null {
  if (aqi == null || maxMins == null || maxMins <= 0) return null;
  if (maxMins < MIN_OUTDOOR_SPORT_MINS) {
    return `${aqiBandLabel(aqi)} A short outdoor window would not be enough today — staying indoors is safer.`;
  }
  return `${aqiBandLabel(aqi)} Aim for about ${maxMins} minutes outside, then head in.`;
}

export function heatAfternoonBlockNote(): string {
  return "Afternoon heat is strong — outdoor time is better in the early morning or evening.";
}

export function heatEveningOnlyNote(): string {
  return "Heat protection: outdoor time is safest after the sun eases in the evening.";
}

export function hydrationHealthNote(): string {
  return "Hydration need: offer water and a short rest, especially after activity.";
}

export function breathingSafetyNote(): string {
  return "Breathing safety: keep windows closed or use filtered air when pollution is high.";
}

export function windOutdoorNote(): string {
  return "Windy day — choose sheltered outdoor spots and keep sessions shorter.";
}

export function rainSnowIndoorNote(): string {
  return "Weather is not suitable for outdoor play — cozy indoor options instead.";
}

export function indoorPlayAirNote(): string {
  return "Indoor play keeps lungs safer when air quality or weather is challenging.";
}

/** Replace technical scheduleDecision / notes phrasing. */
export function humanizeEnvironmentReason(text: string): string {
  return text
    .replace(
      /Outdoor restricted due to high AQI\s*—\s*capped at \d+min/gi,
      "Air quality is moderate — limit outdoor time",
    )
    .replace(
      /Outdoor restricted due to high AQI[^.]*\.?/gi,
      "Air quality is moderate — limit outdoor time",
    )
    .replace(/AQI \d+[^.]*capped[^.]*\./gi, aqiBandLabel(150))
    .replace(
      /Short outdoor — AQI \d+ \(max ~\d+ min\)\.?/gi,
      "Air quality is moderate — limit outdoor time",
    )
    .replace(
      /Reduced exertion — AQI \d+[^.]*\./gi,
      "Easier movement today — air quality calls for lighter activity.",
    )
    .replace(
      /Repositioned to morning — afternoon outdoor blocked by heat\./gi,
      heatAfternoonBlockNote(),
    )
    .replace(
      /Repositioned to evening — afternoon outdoor blocked by heat\./gi,
      heatEveningBlockNote(),
    )
    .replace(
      /Indoor play — outdoor\/air not recommended today\./gi,
      indoorPlayAirNote(),
    );
}

function heatEveningBlockNote(): string {
  return heatEveningOnlyNote();
}

export function deriveRoutineConfidence(
  ctx: RoutineRawContext,
  state: InterpretedBehavioralState,
  country: LaunchCountry,
): RoutineConfidence {
  const aqi = resolveAqiFromContext(ctx);
  const severity = deriveEnvironmentSeverity(ctx, country);
  let conflictScore = 0;

  const fairWeather =
    ctx.weatherOutdoor === "yes" && ctx.outdoorSuitability !== "no";
  if (
    fairWeather &&
    aqi != null &&
    aqi > 200 &&
    !state.aqiMetroAdvisoryMode
  ) {
    conflictScore += 2;
  }
  if (fairWeather && ctx.temperatureC != null && ctx.temperatureC >= 38 && aqi != null && aqi > 150) {
    conflictScore += 2;
  }
  if (ctx.weatherOutdoor === "no" && aqi != null && aqi < 80) conflictScore += 1;
  if (state.dayPlanningMode === "indoor_day" && fairWeather && (aqi == null || aqi <= 100)) {
    conflictScore += 1;
  }
  if (severity === "high" && conflictScore >= 2) return "low";
  if (severity === "high" || conflictScore >= 1) return "medium";
  return "high";
}

const EXTRACURRICULAR_RE =
  /\b(soccer|football club|sports practice|sports club|cricket|training)\b/i;
const OUTDOOR_RE =
  /\b(outdoor|park|playground|backyard|beach|walk|nature|garden)\b/i;

export function isOutdoorOrSportBlock(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "outdoor" || cat === "exercise") return true;
  if (OUTDOOR_RE.test(item.activity)) return true;
  if (EXTRACURRICULAR_RE.test(item.activity)) return true;
  return false;
}

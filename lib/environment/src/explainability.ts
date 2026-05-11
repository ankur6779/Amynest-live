// ─────────────────────────────────────────────────────────────────────────
// "Why this adjustment?" explanation builder.
//
// Generates short, parent-friendly strings that the existing
// RoutineAdaptationsCard renders verbatim on web + mobile. Each binding
// constraint produces at most one explanation so we don't overwhelm.
// ─────────────────────────────────────────────────────────────────────────

import type { EnvironmentalContext } from "./types.js";

const AGE_LABEL: Record<EnvironmentalContext["ageGroup"], string> = {
  infant_0_1: "infants",
  toddler_1_3: "toddlers",
  preschool_3_5: "preschoolers",
  early_school_5_10: "school-age children",
  preteen_10_15: "preteens",
};

export function buildExplanations(ctx: EnvironmentalContext): string[] {
  const out: string[] = [];
  const ageLabel = AGE_LABEL[ctx.ageGroup];

  // AQI
  if (ctx.aqiBucket === "unhealthy_sensitive") {
    out.push(`Outdoor time shortened — air quality (AQI ${ctx.snapshot.aqiUs ?? "elevated"}) is in the sensitive-groups range for ${ageLabel}.`);
  } else if (ctx.aqiBucket === "unhealthy" || ctx.aqiBucket === "very_unhealthy") {
    out.push(`Outdoor activities moved indoors — air quality is unhealthy (AQI ${ctx.snapshot.aqiUs ?? "elevated"}) for ${ageLabel}; we picked indoor alternatives instead.`);
  } else if (ctx.aqiBucket === "hazardous") {
    out.push(`Routine kept fully indoors — air quality is hazardous (AQI ${ctx.snapshot.aqiUs ?? "very high"}). Window-shut, purifier-on day.`);
  }

  // UV
  if (ctx.uvBucket === "very_high" || ctx.uvBucket === "extreme") {
    out.push(`Outdoor sun exposure trimmed — UV index ${ctx.snapshot.uvIndexMax ?? ""} is ${ctx.uvBucket.replace("_", " ")}; safest windows are before 10 AM and after 4 PM.`);
  } else if (ctx.uvBucket === "high") {
    out.push(`Sunscreen + hat reminder added — UV index ${ctx.snapshot.uvIndexMax ?? ""} is high during midday.`);
  }

  // Heat / cold
  const t = ctx.snapshot.apparentC ?? ctx.snapshot.temperatureC;
  if (ctx.weatherCondition === "heatwave") {
    out.push(`Cognitive blocks moved to morning and physical activity dialled down — heat (${t?.toFixed?.(0) ?? "high"}°C) raises fatigue and meltdown risk for ${ageLabel}.`);
  } else if (ctx.weatherCondition === "cold" && t != null && t <= 4) {
    out.push(`Outdoor blocks shortened and warm-up time added — apparent temperature (${t.toFixed(0)}°C) is cold for ${ageLabel}.`);
  }

  // Humidity
  if (ctx.weatherCondition === "humid") {
    out.push(`Activity intensity reduced and hydration reminders increased — humidity (${ctx.snapshot.humidityPct ?? ""}%) makes the day feel heavier and dehydrates faster.`);
  }

  // Storm / rain
  if (ctx.weatherCondition === "stormy") {
    out.push(`Calming bonding routine prepared and outdoor blocks removed — storm conditions can be unsettling; cozy fort + storytime works well.`);
  } else if (ctx.weatherCondition === "rainy") {
    out.push(`Indoor backups added for outdoor blocks — rain is likely today; the routine has matched indoor swaps ready.`);
  }

  // Predictive shift
  if (ctx.predictedWeatherShift && ctx.predictedWeatherShift.kind !== "stable") {
    if (ctx.predictedWeatherShift.kind === "incoming_rain") {
      out.push(`Outdoor block moved earlier — rain is forecast in about ${ctx.predictedWeatherShift.etaHours} hours.`);
    } else if (ctx.predictedWeatherShift.kind === "incoming_storm") {
      out.push(`Outdoor activities front-loaded and a calming wind-down planned — a storm is forecast within ${Math.max(1, ctx.predictedWeatherShift.etaHours)} hours.`);
    } else if (ctx.predictedWeatherShift.kind === "temperature_spike") {
      out.push(`Cognitive blocks shifted earlier — a sharp temperature change is forecast in the next few hours.`);
    } else if (ctx.predictedWeatherShift.kind === "aqi_spike") {
      out.push(`Indoor-only window planned for the afternoon — air quality is forecast to spike.`);
    }
  }

  // Circadian
  if (ctx.circadianLightProfile === "early_dark") {
    out.push(`Wind-down moved earlier — daylight is short today (${ctx.snapshot.daylightMinutes ?? ""} min); melatonin support window starts sooner.`);
  } else if (ctx.circadianLightProfile === "long_daylight") {
    out.push(`Outdoor block extended slightly — long daylight today gives a wider safe activity window.`);
  } else if (ctx.circadianLightProfile === "overcast_dim") {
    out.push(`A mood-lifting indoor activity added — overcast skies dim the light cue and can lower energy.`);
  }

  // Risk score summary tail (only when nothing else fired)
  if (out.length === 0 && ctx.environmentalRiskScore >= 25) {
    out.push(`Routine fine-tuned to today's conditions — environmental risk score for ${ageLabel} is ${ctx.environmentalRiskScore}/100.`);
  }

  if (ctx.degraded) {
    out.push(`Live weather data unavailable — used cached or default conditions; refresh later for sharper adjustments.`);
  }

  return out;
}

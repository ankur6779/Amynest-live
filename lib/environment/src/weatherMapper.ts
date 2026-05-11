// Adapters between EnvironmentalContext and the rest of AmyNest.
//
// Today routine generation only knows about the legacy WeatherOutdoor enum.
// `mapToWeatherOutdoor` translates the orchestrator's verdict into that enum
// so existing code paths Just Work. `buildAiPromptBlock` produces a small
// human-readable section to inject into the OpenAI system message.

import type { EnvironmentalContext, OutdoorSuitability } from "./types.js";

/** Override / merge the parent's manual `weatherOutdoor` choice with the
 *  engine's verdict — environment NEVER over-rules a more cautious parent. */
export function mapToWeatherOutdoor(
  ctx: EnvironmentalContext,
  parentChoice: "yes" | "no" | "limited",
): "yes" | "no" | "limited" {
  const order: OutdoorSuitability[] = ["yes", "limited", "no"];
  const parentIdx = order.indexOf(parentChoice);
  const envIdx = order.indexOf(ctx.outdoorSuitability);
  return order[Math.max(parentIdx, envIdx)] ?? "yes";
}

/** Compact env summary for parents — used in adaptation tags / chips. */
export function buildEnvironmentalSummary(ctx: EnvironmentalContext): string {
  const bits: string[] = [];
  if (ctx.snapshot.temperatureC != null) bits.push(`${Math.round(ctx.snapshot.temperatureC)}°C`);
  if (ctx.snapshot.humidityPct != null) bits.push(`${Math.round(ctx.snapshot.humidityPct)}% humidity`);
  if (ctx.snapshot.aqiUs != null) bits.push(`AQI ${Math.round(ctx.snapshot.aqiUs)}`);
  if (ctx.snapshot.uvIndexMax != null) bits.push(`UV ${ctx.snapshot.uvIndexMax.toFixed(1)}`);
  return bits.join(" · ");
}

/** Inserted into the OpenAI prompt so the model adapts the routine itself. */
export function buildAiPromptBlock(ctx: EnvironmentalContext): string {
  const lines: string[] = [];
  lines.push(`ENVIRONMENTAL CONTEXT (real-time, source: ${ctx.snapshot.source}):`);
  const summary = buildEnvironmentalSummary(ctx);
  if (summary) lines.push(`- Conditions: ${summary}`);
  lines.push(`- Weather classification: ${ctx.weatherCondition}`);
  lines.push(`- AQI bucket: ${ctx.aqiBucket} · UV bucket: ${ctx.uvBucket}`);
  lines.push(`- Age-weighted environmental risk score: ${ctx.environmentalRiskScore}/100`);
  lines.push(`- Outdoor suitability verdict: ${ctx.outdoorSuitability.toUpperCase()}`);
  lines.push(`- Hydration need: ${ctx.hydrationNeedLevel} · sensory stress: ${ctx.sensoryStressLevel} · cognitive comfort: ${ctx.cognitiveComfortLevel}`);
  lines.push(`- Circadian profile: ${ctx.circadianLightProfile}` + (ctx.snapshot.daylightMinutes ? ` (${ctx.snapshot.daylightMinutes} min daylight)` : ""));
  if (ctx.predictedWeatherShift && ctx.predictedWeatherShift.kind !== "stable") {
    lines.push(`- Predicted shift: ${ctx.predictedWeatherShift.label} (eta ${ctx.predictedWeatherShift.etaHours}h, conf ${(ctx.predictedWeatherShift.confidence * 100).toFixed(0)}%)`);
  }
  lines.push("ENVIRONMENTAL RULES — apply BEFORE other adjustments:");
  if (ctx.outdoorSuitability === "no") {
    lines.push("  - All outdoor blocks MUST be replaced with indoor alternatives matched to category (creative / movement / sensory).");
  } else if (ctx.outdoorSuitability === "limited") {
    lines.push("  - Outdoor blocks must be SHORT (<= 30 min) and scheduled in safe UV windows (before 10 AM or after 4 PM).");
  }
  if (ctx.hydrationNeedLevel === "high" || ctx.hydrationNeedLevel === "extreme") {
    lines.push("  - Add explicit hydration reminders in meal/snack notes (water, ORS, or buttermilk depending on cuisine).");
  }
  if (ctx.sensoryStressLevel === "high" || ctx.sensoryStressLevel === "extreme") {
    lines.push("  - Reduce stimulation: shorter blocks, calmer transitions, prefer single-toy / single-task activities.");
  }
  if (ctx.cognitiveComfortLevel === "low" || ctx.cognitiveComfortLevel === "none") {
    lines.push("  - Move learning / focus blocks to the morning before conditions worsen.");
  }
  if (ctx.circadianLightProfile === "early_dark") {
    lines.push("  - Move the wind-down activity 15–30 min earlier and dim screen-time well before bed.");
  }
  return lines.join("\n");
}

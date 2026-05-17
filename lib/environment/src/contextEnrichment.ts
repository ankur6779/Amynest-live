// ─────────────────────────────────────────────────────────────────────────
// Attaches canonical AQI, exposure mode, and confidence to EnvironmentalContext.
// ─────────────────────────────────────────────────────────────────────────

import type { EnvironmentalContext, EnvDataConfidence } from "./types.js";
import {
  deriveExposureMode,
  estimateAQIByCountry,
  outdoorMaxDurationForMode,
  airQualityRiskFromAqi,
  hydrationNeededFromSnapshot,
} from "./snapshotPipeline.js";

export function enrichEnvironmentalContext(
  ctx: EnvironmentalContext,
  opts: { confidence: EnvDataConfidence; country?: string | null },
): EnvironmentalContext {
  const AQI = ctx.snapshot.aqiUs ?? estimateAQIByCountry(opts.country);
  const temperatureC =
    ctx.snapshot.temperatureC ?? ctx.snapshot.apparentC ?? 25;
  const exposureMode = deriveExposureMode(AQI, temperatureC, ctx.weatherCondition);
  const outdoorMaxDuration = outdoorMaxDurationForMode(exposureMode);
  const outdoorAllowed = exposureMode !== "indoor_only";
  const airQualityRisk = airQualityRiskFromAqi(AQI);
  const hydrationNeeded = hydrationNeededFromSnapshot(ctx.snapshot, ctx.weatherCondition);

  const degraded = opts.confidence !== "high";

  return {
    ...ctx,
    snapshot: { ...ctx.snapshot, aqiUs: AQI, temperatureC },
    AQI,
    temperatureC,
    confidence: opts.confidence,
    exposureMode,
    outdoorAllowed,
    outdoorMaxDuration,
    airQualityRisk,
    hydrationNeeded,
    degraded,
  };
}

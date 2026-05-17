// ─────────────────────────────────────────────────────────────────────────
// Resilient snapshot pipeline — validation, normalization, fallback, and
// confidence scoring for Open-Meteo (and any future provider).
// ─────────────────────────────────────────────────────────────────────────

import type {
  AtmosphericSnapshot,
  EnvExposureMode,
  EnvDataConfidence,
  WeatherCondition,
} from "./types.js";
import { classifyWeather } from "./risk.js";

const IS_DEV =
  typeof process !== "undefined" &&
  process.env.NODE_ENV !== "production" &&
  process.env.ENVIRONMENT_PIPELINE_QUIET !== "1";

/** Country-name or ISO-2 → default US AQI when live data is unavailable. */
const COUNTRY_AQI_DEFAULTS: Record<string, number> = {
  India: 180,
  IN: 180,
  UAE: 150,
  AE: 150,
  USA: 60,
  US: 60,
  UK: 50,
  GB: 50,
  Australia: 40,
  AU: 40,
  "New Zealand": 30,
  NZ: 30,
  Austria: 40,
  AT: 40,
};

export function estimateAQIByCountry(country?: string | null): number {
  if (!country?.trim()) return 100;
  const key = country.trim();
  const upper = key.toUpperCase();
  return (
    COUNTRY_AQI_DEFAULTS[key] ??
    COUNTRY_AQI_DEFAULTS[upper] ??
    COUNTRY_AQI_DEFAULTS[upper.slice(0, 2)] ??
    100
  );
}

/**
 * Reject out-of-range AQI; cross-check PM2.5 vs reported AQI when both exist.
 */
export function validateAQI(
  aqi: number | null | undefined,
  pm25?: number | null,
): number | null {
  if (aqi == null || !Number.isFinite(aqi) || aqi < 0 || aqi > 500) return null;
  if (pm25 != null && Number.isFinite(pm25) && pm25 > 150 && aqi < 100) {
    return Math.max(aqi, 180);
  }
  return aqi;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Coerce undefined → null and clamp known ranges. */
export function normalizeSnapshot(
  raw: Partial<AtmosphericSnapshot> & { observedAt: string; source: string },
): AtmosphericSnapshot {
  const aqi = validateAQI(numOrNull(raw.aqiUs), numOrNull(raw.pm25));
  const temp = numOrNull(raw.temperatureC);
  const apparent = numOrNull(raw.apparentC);

  return {
    observedAt: raw.observedAt,
    source: raw.source,
    temperatureC: temp ?? undefined,
    apparentC: apparent ?? temp ?? undefined,
    humidityPct: numOrNull(raw.humidityPct) ?? undefined,
    precipitationMm: numOrNull(raw.precipitationMm) ?? undefined,
    precipitationProbability: numOrNull(raw.precipitationProbability) ?? undefined,
    cloudCoverPct: numOrNull(raw.cloudCoverPct) ?? undefined,
    windKph: numOrNull(raw.windKph) ?? undefined,
    uvIndexMax: numOrNull(raw.uvIndexMax) ?? undefined,
    aqiUs: aqi ?? undefined,
    pm25: numOrNull(raw.pm25) ?? undefined,
    pollenIndex: numOrNull(raw.pollenIndex) ?? undefined,
    sunrise: raw.sunrise ?? undefined,
    sunset: raw.sunset ?? undefined,
    daylightMinutes: numOrNull(raw.daylightMinutes) ?? undefined,
    predictedShift: raw.predictedShift,
  };
}

export function fallbackAtmosphericSnapshot(country?: string | null): AtmosphericSnapshot {
  return normalizeSnapshot({
    observedAt: new Date().toISOString(),
    source: "fallback",
    temperatureC: 25,
    apparentC: 25,
    aqiUs: estimateAQIByCountry(country),
    cloudCoverPct: null as unknown as undefined,
  });
}

export function confidenceFromSource(
  source: string,
  opts?: { aqiRepaired?: boolean },
): EnvDataConfidence {
  if (source === "fallback") return "low";
  if (source === "cache") return "medium";
  if (opts?.aqiRepaired) return "medium";
  return "high";
}

export interface FinalizeSnapshotResult {
  snapshot: AtmosphericSnapshot;
  confidence: EnvDataConfidence;
  aqiRepaired: boolean;
}

/**
 * Normalize a provider response and ensure AQI is always present (country estimate if needed).
 */
export function finalizeSnapshot(
  raw: AtmosphericSnapshot,
  country?: string | null,
): FinalizeSnapshotResult {
  let aqiRepaired = false;
  const normalized = normalizeSnapshot(raw);
  let snap = normalized;

  if (snap.aqiUs == null) {
    const estimated = estimateAQIByCountry(country);
    snap = { ...snap, aqiUs: estimated };
    aqiRepaired = true;
    logEnvDev("aqi_estimated", { country, estimated, source: snap.source });
  }

  const confidence = confidenceFromSource(snap.source, { aqiRepaired });

  if (aqiRepaired && snap.aqiUs != null && snap.aqiUs >= 180) {
    logEnvDev("aqi_anomaly_repair", { aqi: snap.aqiUs, pm25: snap.pm25, country });
  }

  return { snapshot: snap, confidence, aqiRepaired };
}

export function deriveExposureMode(
  aqi: number,
  tempC: number,
  condition: WeatherCondition,
): EnvExposureMode {
  if (aqi > 300) return "indoor_only";
  if (aqi > 200) return "controlled";
  if (aqi > 150) return "limited";
  if (aqi > 100) return "reduced";
  if (tempC > 38) return "controlled";
  if (condition === "rainy" || condition === "stormy" || condition === "cold") {
    return "reduced";
  }
  return "normal";
}

const OUTDOOR_MAX_BY_MODE: Record<EnvExposureMode, number> = {
  normal: 120,
  reduced: 60,
  limited: 30,
  controlled: 15,
  indoor_only: 0,
};

export function outdoorMaxDurationForMode(mode: EnvExposureMode): number {
  return OUTDOOR_MAX_BY_MODE[mode];
}

export function airQualityRiskFromAqi(aqi: number): "low" | "moderate" | "high" {
  if (aqi <= 100) return "low";
  if (aqi <= 200) return "moderate";
  return "high";
}

export function hydrationNeededFromSnapshot(
  snap: AtmosphericSnapshot,
  condition: WeatherCondition,
): boolean {
  const t = snap.apparentC ?? snap.temperatureC ?? 22;
  return t >= 32 || condition === "heatwave" || condition === "humid";
}

export function logEnvDev(event: string, data?: Record<string, unknown>): void {
  if (!IS_DEV) return;
  console.debug(`[environment:${event}]`, data ?? {});
}

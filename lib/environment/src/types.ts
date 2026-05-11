// ─────────────────────────────────────────────────────────────────────────
// Environmental Intelligence Orchestration Engine (EIOE) — public types.
//
// Patent-ready terminology: "environmental orchestration", "atmospheric
// adaptation pipeline", "age-weighted environmental risk scoring",
// "circadian-aware scheduling", "predictive environmental modulation".
// ─────────────────────────────────────────────────────────────────────────

/** Coarse age bands the engine recognises (mirrors the rest of AmyNest). */
export type EnvAgeGroup =
  | "infant_0_1"
  | "toddler_1_3"
  | "preschool_3_5"
  | "early_school_5_10"
  | "preteen_10_15";

/** Levels used across all derived signals — keep ordered low → high. */
export type EnvLevel = "none" | "low" | "moderate" | "high" | "extreme";

/** Outdoor-suitability verdict. Maps cleanly onto the legacy WeatherOutdoor type. */
export type OutdoorSuitability = "yes" | "limited" | "no";

/** AQI risk bucket (matches AQIRiskThresholds.json). */
export type AQIBucket =
  | "excellent"
  | "good"
  | "moderate"
  | "unhealthy_sensitive"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous";

/** UV risk bucket (matches UVExposureRules.json). */
export type UVBucket = "low" | "moderate" | "high" | "very_high" | "extreme";

/** Coarse weather classification (matches weatherEnergyProfiles.json). */
export type WeatherCondition =
  | "sunny"
  | "cloudy"
  | "rainy"
  | "stormy"
  | "humid"
  | "cold"
  | "heatwave"
  | "windy"
  | "foggy";

/** Season — matches seasonalNutritionProfiles.json. */
export type Season = "summer" | "winter" | "monsoon" | "spring" | "autumn";

/** Raw atmospheric snapshot returned by a provider. All fields optional —
 *  the orchestrator gracefully degrades when sensors are missing. */
export interface AtmosphericSnapshot {
  /** ISO8601 timestamp the snapshot represents. */
  observedAt: string;
  /** Source identifier ("open-meteo", "cache", "fallback", …). */
  source: string;
  /** Temperature in degrees Celsius. */
  temperatureC?: number;
  /** Apparent / heat-index temperature in Celsius. */
  apparentC?: number;
  /** Relative humidity 0..100. */
  humidityPct?: number;
  /** Precipitation expected in next hour, mm. */
  precipitationMm?: number;
  /** Probability of precipitation 0..100. */
  precipitationProbability?: number;
  /** Cloud cover 0..100. */
  cloudCoverPct?: number;
  /** Wind speed at 10 m, km/h. */
  windKph?: number;
  /** Max UV index for the day (0..15). */
  uvIndexMax?: number;
  /** Air-quality index (US scale 0..500). */
  aqiUs?: number;
  /** PM2.5 concentration μg/m³. */
  pm25?: number;
  /** Pollen index 0..5 (placeholder — not yet sourced). */
  pollenIndex?: number;
  /** Sunrise (ISO local time). */
  sunrise?: string;
  /** Sunset (ISO local time). */
  sunset?: string;
  /** Daylight duration in minutes. */
  daylightMinutes?: number;
  /** Forecast: shift expected in next 6 hours. */
  predictedShift?: PredictedWeatherShift;
}

export interface PredictedWeatherShift {
  /** Short label, e.g. "incoming rain in 2h". */
  label: string;
  /** Coarse classification key from predictiveWeatherProfiles.json. */
  kind:
    | "incoming_rain"
    | "incoming_storm"
    | "temperature_spike"
    | "aqi_spike"
    | "high_wind_forecast"
    | "rapid_weather_change"
    | "stable";
  /** Hours until shift arrives (0 = now). */
  etaHours: number;
  /** 0..1 confidence. */
  confidence: number;
}

/** The fully-derived environmental context attached to each routine. */
export interface EnvironmentalContext {
  /** Age band the scoring used. */
  ageGroup: EnvAgeGroup;
  /** Coordinates we resolved against. */
  location: { latitude: number; longitude: number; label?: string };
  /** Raw upstream snapshot (kept for explainability/debugging). */
  snapshot: AtmosphericSnapshot;

  // ── Phase 1: derived signals ────────────────────────────────────────────
  /** 0..100 weighted risk score. Higher = more constraints needed. */
  environmentalRiskScore: number;
  /** Coarse outdoor verdict. */
  outdoorSuitability: OutdoorSuitability;
  /** Hydration urgency. */
  hydrationNeedLevel: EnvLevel;
  /** How focus-friendly the atmosphere is. */
  cognitiveComfortLevel: EnvLevel;
  /** Likelihood of sensory overload. */
  sensoryStressLevel: EnvLevel;
  /** Likelihood of environment-induced fatigue. */
  environmentalFatigueRisk: EnvLevel;
  /** Circadian profile derived from daylight + cloud cover. */
  circadianLightProfile: "early_dark" | "normal" | "long_daylight" | "overcast_dim";
  /** Forecast adaptation. */
  predictedWeatherShift?: PredictedWeatherShift;

  // ── Phase 3/4 attribution buckets ───────────────────────────────────────
  aqiBucket: AQIBucket;
  uvBucket: UVBucket;
  weatherCondition: WeatherCondition;
  season: Season;

  /** Plain-English explanations (one per binding constraint). */
  explanations: string[];
  /** Compact tags for chips/badges (e.g. "AQI · unhealthy"). */
  tags: string[];
  /** True when the engine had to fall back (cache / offline / no provider). */
  degraded: boolean;
}

/** Provider abstraction — swap Open-Meteo for any other vendor by implementing this. */
export interface EnvironmentalProvider {
  name: string;
  fetchSnapshot(input: {
    latitude: number;
    longitude: number;
    timezone?: string;
    signal?: AbortSignal;
  }): Promise<AtmosphericSnapshot>;
}

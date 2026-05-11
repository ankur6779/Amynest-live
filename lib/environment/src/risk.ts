// ─────────────────────────────────────────────────────────────────────────
// Age-weighted environmental risk scorer.
//
// Pure, deterministic. Given an AtmosphericSnapshot + EnvAgeGroup it
// produces every derived field on EnvironmentalContext (excluding the
// human-readable explanations, which live in `explainability.ts`).
// ─────────────────────────────────────────────────────────────────────────

import { datasets } from "./datasets.js";
import type {
  AQIBucket,
  AtmosphericSnapshot,
  EnvAgeGroup,
  EnvironmentalContext,
  EnvLevel,
  OutdoorSuitability,
  Season,
  UVBucket,
  WeatherCondition,
} from "./types.js";

const RS = datasets.environmentalRiskScoring as unknown as {
  weights: Record<string, number>;
  ageMultipliers: Record<EnvAgeGroup, number>;
  outdoorSuitabilityThresholds: Record<OutdoorSuitability, { maxScore: number }>;
  fatigueRiskThresholds: Record<EnvLevel, { maxScore: number }>;
  hydrationLevelThresholds: Record<EnvLevel, { maxScore: number }>;
  sensoryStressThresholds: Record<EnvLevel, { maxScore: number }>;
  cognitiveComfortThresholds: Record<EnvLevel, { maxScore: number }>;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function classifyAqi(aqi?: number): AQIBucket {
  if (aqi == null) return "good";
  if (aqi <= 25) return "excellent";
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "unhealthy_sensitive";
  if (aqi <= 200) return "unhealthy";
  if (aqi <= 300) return "very_unhealthy";
  return "hazardous";
}

export function classifyUv(uv?: number): UVBucket {
  if (uv == null) return "low";
  if (uv <= 2) return "low";
  if (uv <= 5) return "moderate";
  if (uv <= 7) return "high";
  if (uv <= 10) return "very_high";
  return "extreme";
}

export function classifyWeather(snap: AtmosphericSnapshot): WeatherCondition {
  const t = snap.apparentC ?? snap.temperatureC ?? 22;
  const cloud = snap.cloudCoverPct ?? 0;
  const precip = snap.precipitationMm ?? 0;
  const probability = snap.precipitationProbability ?? 0;
  const wind = snap.windKph ?? 0;
  const humidity = snap.humidityPct ?? 50;
  const shift = snap.predictedShift?.kind;

  if (shift === "incoming_storm" || (probability > 70 && wind > 30)) return "stormy";
  if (precip > 2 || probability >= 60) return "rainy";
  if (t >= 36) return "heatwave";
  if (humidity >= 80 && t >= 26) return "humid";
  if (t <= 8) return "cold";
  if (wind >= 35) return "windy";
  if (cloud >= 90) return "foggy";
  if (cloud >= 50) return "cloudy";
  return "sunny";
}

/**
 * Northern-hemisphere season classifier. Falls back to month-based bucketing
 * (the engine doesn't get latitude here so we don't try to invert for the
 * southern hemisphere — explainability stays generic enough to be safe).
 */
export function classifySeason(month: number): Season {
  // 1..12 — coarse NH bucketing biased to the Indian sub-continent (the
  // current user base). Spring is a distinct shoulder month set so the
  // dataset's `spring` profile is reachable.
  if (month >= 6 && month <= 9) return "monsoon";
  if (month === 3) return "spring";
  if (month >= 4 && month <= 5) return "summer";
  if (month >= 10 && month <= 11) return "autumn";
  return "winter";
}

function scoreToLevel<L extends string>(
  score: number,
  thresholds: Record<L, { maxScore: number }>,
  ascending: L[],
): L {
  for (const level of ascending) {
    if (score <= thresholds[level].maxScore) return level;
  }
  return ascending[ascending.length - 1]!;
}

interface ComponentScores {
  aqi: number;
  uv: number;
  heatIndex: number;
  humidity: number;
  precipitation: number;
  wind: number;
  stormProbability: number;
  lowDaylight: number;
}

function scoreComponents(snap: AtmosphericSnapshot): ComponentScores {
  // Each sub-score is normalised 0..100 BEFORE weighting.
  const aqi = snap.aqiUs == null ? 0 : clamp((snap.aqiUs / 300) * 100, 0, 100);
  const uv = snap.uvIndexMax == null ? 0 : clamp((snap.uvIndexMax / 11) * 100, 0, 100);
  const t = snap.apparentC ?? snap.temperatureC;
  // Heat-index sub-score: ramps from 28°C, hits 100 at 42°C; cold side ramps from 10°C down.
  let heatIndex = 0;
  if (t != null) {
    if (t >= 28) heatIndex = clamp(((t - 28) / (42 - 28)) * 100, 0, 100);
    else if (t <= 10) heatIndex = clamp(((10 - t) / (10 - -10)) * 100, 0, 100);
  }
  const humidity = snap.humidityPct == null ? 0 : clamp(((snap.humidityPct - 50) / (95 - 50)) * 100, 0, 100);
  const precipitation = snap.precipitationProbability == null ? 0 : clamp(snap.precipitationProbability, 0, 100);
  const wind = snap.windKph == null ? 0 : clamp((snap.windKph / 60) * 100, 0, 100);
  const stormProbability = snap.predictedShift?.kind === "incoming_storm" ? 100 : 0;
  const lowDaylight = snap.daylightMinutes == null ? 0 : clamp(((600 - snap.daylightMinutes) / 200) * 100, 0, 100);
  return { aqi, uv, heatIndex, humidity, precipitation, wind, stormProbability, lowDaylight };
}

function weightedSum(c: ComponentScores, w: ComponentScores): number {
  return (
    c.aqi * w.aqi +
    c.uv * w.uv +
    c.heatIndex * w.heatIndex +
    c.humidity * w.humidity +
    c.precipitation * w.precipitation +
    c.wind * w.wind +
    c.stormProbability * w.stormProbability +
    c.lowDaylight * w.lowDaylight
  );
}

export function buildEnvironmentalContext(input: {
  snapshot: AtmosphericSnapshot;
  ageGroup: EnvAgeGroup;
  location: { latitude: number; longitude: number; label?: string };
  date?: string;
}): EnvironmentalContext {
  const { snapshot, ageGroup, location } = input;
  const components = scoreComponents(snapshot);
  const baseScore = weightedSum(components, RS.weights as unknown as ComponentScores);
  const ageMultiplier = RS.ageMultipliers[ageGroup] ?? 1.0;
  const finalScore = clamp(Math.round(baseScore * ageMultiplier), 0, 100);

  const outdoorSuitability = scoreToLevel<OutdoorSuitability>(
    finalScore,
    RS.outdoorSuitabilityThresholds,
    ["yes", "limited", "no"],
  );
  const environmentalFatigueRisk = scoreToLevel<EnvLevel>(
    finalScore,
    RS.fatigueRiskThresholds,
    ["none", "low", "moderate", "high", "extreme"],
  );
  const hydrationNeedLevel = scoreToLevel<EnvLevel>(
    Math.max(components.heatIndex, components.humidity, components.uv),
    RS.hydrationLevelThresholds,
    ["none", "low", "moderate", "high", "extreme"],
  );
  const sensoryStressLevel = scoreToLevel<EnvLevel>(
    Math.max(components.stormProbability, components.heatIndex, components.aqi * 0.8),
    RS.sensoryStressThresholds,
    ["none", "low", "moderate", "high", "extreme"],
  );
  const cognitiveComfortLevel = scoreToLevel<EnvLevel>(
    finalScore,
    RS.cognitiveComfortThresholds,
    ["high", "moderate", "low", "none"],
  );

  const aqiBucket = classifyAqi(snapshot.aqiUs);
  const uvBucket = classifyUv(snapshot.uvIndexMax);
  const weatherCondition = classifyWeather(snapshot);
  const month = input.date ? new Date(input.date + "T00:00:00").getMonth() + 1 : new Date().getMonth() + 1;
  const season = classifySeason(month);

  // Circadian classification.
  const dayMin = snapshot.daylightMinutes;
  const cloud = snapshot.cloudCoverPct ?? 0;
  let circadianLightProfile: EnvironmentalContext["circadianLightProfile"];
  if (dayMin != null && dayMin < 600) circadianLightProfile = "early_dark";
  else if (dayMin != null && dayMin > 780) circadianLightProfile = "long_daylight";
  else if (cloud >= 80) circadianLightProfile = "overcast_dim";
  else circadianLightProfile = "normal";

  const tags: string[] = [];
  if (aqiBucket !== "good" && aqiBucket !== "excellent") tags.push(`AQI · ${aqiBucket.replace(/_/g, " ")}`);
  if (uvBucket === "high" || uvBucket === "very_high" || uvBucket === "extreme") tags.push(`UV · ${uvBucket.replace("_", " ")}`);
  if (weatherCondition === "heatwave" || weatherCondition === "stormy" || weatherCondition === "humid") {
    tags.push(`Weather · ${weatherCondition}`);
  }
  if (circadianLightProfile === "early_dark") tags.push("Daylight · short");
  if (snapshot.predictedShift && snapshot.predictedShift.kind !== "stable") {
    tags.push(snapshot.predictedShift.label);
  }

  return {
    ageGroup,
    location,
    snapshot,
    environmentalRiskScore: finalScore,
    outdoorSuitability,
    hydrationNeedLevel,
    cognitiveComfortLevel,
    sensoryStressLevel,
    environmentalFatigueRisk,
    circadianLightProfile,
    predictedWeatherShift: snapshot.predictedShift,
    aqiBucket,
    uvBucket,
    weatherCondition,
    season,
    explanations: [], // filled by buildExplanations()
    tags,
    degraded: snapshot.source === "fallback" || snapshot.source === "cache",
  };
}

/** Display helpers for environmental context on routine generate (client-only). */

export type OutdoorSuitability = "yes" | "limited" | "no";

export type EnvSnapshot = {
  temperatureC?: number;
  humidityPct?: number;
  windKph?: number;
  uvIndexMax?: number;
  aqiUs?: number;
  pm25?: number;
};

export type EnvContextDisplay = {
  location: string;
  temperature: string;
  condition: string;
  aqi: string;
  aqiLabel: string;
  aqiTone: "good" | "moderate" | "sensitive" | "unhealthy" | "very_unhealthy" | "unknown";
  outdoorRecommendation: string;
  outdoorSuitability: OutdoorSuitability;
};

const WEATHER_CONDITION_LABELS: Record<string, string> = {
  sunny: "Clear",
  cloudy: "Cloudy",
  rainy: "Rainy",
  stormy: "Stormy",
  humid: "Humid",
  cold: "Cold",
  heatwave: "Hot",
  windy: "Windy",
  foggy: "Foggy",
};

/** User-facing AQI bands (US AQI scale). */
export function aqiBandFromValue(aqi: number | null | undefined): {
  label: string;
  tone: EnvContextDisplay["aqiTone"];
} {
  if (aqi == null || Number.isNaN(aqi)) {
    return { label: "Unknown", tone: "unknown" };
  }
  const v = Math.round(aqi);
  if (v <= 50) return { label: "Good", tone: "good" };
  if (v <= 100) return { label: "Moderate", tone: "moderate" };
  if (v <= 150) return { label: "Sensitive", tone: "sensitive" };
  if (v <= 200) return { label: "Unhealthy", tone: "unhealthy" };
  return { label: "Very Unhealthy", tone: "very_unhealthy" };
}

export function formatTemperature(c?: number): string {
  if (c == null || Number.isNaN(c)) return "—";
  return `${Math.round(c)}°C`;
}

export function formatWeatherCondition(condition?: string): string {
  if (!condition) return "—";
  return WEATHER_CONDITION_LABELS[condition] ?? condition.replace(/_/g, " ");
}

export function outdoorRecommendationText(
  suitability: OutdoorSuitability,
  opts?: { hour?: number; temperatureC?: number },
): string {
  const hour = opts?.hour ?? new Date().getHours();
  const hot = opts?.temperatureC != null && opts.temperatureC >= 32;

  if (suitability === "yes") {
    if (hot && hour >= 11 && hour <= 16) {
      return "OK outdoors — prefer morning or evening when it's cooler";
    }
    return "Full outdoor play OK";
  }
  if (suitability === "no") {
    return "Indoor activities recommended";
  }
  if (hot || hour >= 11 && hour <= 15) {
    return "Limited — morning or evening only";
  }
  return "Limited — short outdoor windows + indoor backup";
}

const CC_TO_COUNTRY: Record<string, string> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  UK: "United Kingdom",
  AE: "United Arab Emirates",
  AU: "Australia",
  CA: "Canada",
  NZ: "New Zealand",
};

export function locationDisplayLabel(
  ctxLabel: string | undefined,
  reverseGeo: string | null | undefined,
): string {
  if (reverseGeo?.trim()) return reverseGeo.trim();
  if (!ctxLabel || ctxLabel === "User location") return "Your area";
  const parts = ctxLabel.split(",");
  const cc = parts[parts.length - 1]?.trim().toUpperCase();
  if (parts.length === 1) {
    return parts[0]!.trim();
  }
  if (cc && CC_TO_COUNTRY[cc]) return CC_TO_COUNTRY[cc]!;
  return ctxLabel.trim();
}

export function buildEnvContextDisplay(input: {
  snapshot: EnvSnapshot;
  weatherCondition?: string;
  outdoorSuitability: OutdoorSuitability;
  locationLabel?: string;
  reverseGeoLabel?: string | null;
}): EnvContextDisplay {
  const { label: aqiLabel, tone: aqiTone } = aqiBandFromValue(input.snapshot.aqiUs);
  const aqiNum =
    input.snapshot.aqiUs != null ? Math.round(input.snapshot.aqiUs) : null;
  const aqi =
    aqiNum != null ? `${aqiNum} (${aqiLabel})` : aqiLabel;

  return {
    location: locationDisplayLabel(input.locationLabel, input.reverseGeoLabel),
    temperature: formatTemperature(input.snapshot.temperatureC),
    condition: formatWeatherCondition(input.weatherCondition),
    aqi,
    aqiLabel,
    aqiTone,
    outdoorSuitability: input.outdoorSuitability,
    outdoorRecommendation: outdoorRecommendationText(input.outdoorSuitability, {
      temperatureC: input.snapshot.temperatureC,
    }),
  };
}

export const AQI_TONE_CLASSES: Record<EnvContextDisplay["aqiTone"], string> = {
  good: "text-emerald-700 bg-emerald-50 border-emerald-200",
  moderate: "text-amber-800 bg-amber-50 border-amber-200",
  sensitive: "text-orange-800 bg-orange-50 border-orange-200",
  unhealthy: "text-red-800 bg-red-50 border-red-200",
  very_unhealthy: "text-purple-800 bg-purple-50 border-purple-200",
  unknown: "text-muted-foreground bg-muted border-border",
};

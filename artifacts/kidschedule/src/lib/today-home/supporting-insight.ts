/**
 * One supporting insight for Today Home.
 * Weather appears ONLY when it changes today’s recommendation — otherwise silent.
 */

export type WeatherInsightSignal = {
  outdoorSuitability?: string | null;
  aqiBucket?: string | null;
  temperatureC?: number | null;
  line: string;
};

export type SupportingInsightInput = {
  weather?: WeatherInsightSignal | null;
  familyHeadline?: string | null;
  infantLine?: string | null;
  /** Continuity emotional line — only if not already the hero why. */
  continuityEmotional?: string | null;
  heroWhy?: string | null;
};

export type SupportingInsight = {
  kind: "weather" | "family" | "infant" | "continuity";
  text: string;
};

/** True when weather should speak — it changes what today asks for. */
export function weatherChangesRecommendation(signal: {
  outdoorSuitability?: string | null;
  aqiBucket?: string | null;
  temperatureC?: number | null;
}): boolean {
  const outdoor = (signal.outdoorSuitability ?? "").toLowerCase();
  const aqi = (signal.aqiBucket ?? "").toLowerCase();
  if (outdoor === "no") return true;
  if (["hazardous", "very_unhealthy", "unhealthy"].includes(aqi)) return true;
  if (signal.temperatureC != null && signal.temperatureC >= 38) return true;
  if (signal.temperatureC != null && signal.temperatureC <= 5) return true;
  return false;
}

export function buildWeatherInsightLine(signal: {
  outdoorSuitability?: string | null;
  aqiBucket?: string | null;
  temperatureC?: number | null;
}): string | null {
  if (!weatherChangesRecommendation(signal)) return null;
  const aqi = (signal.aqiBucket ?? "").toLowerCase();
  if (aqi === "hazardous" || aqi === "very_unhealthy") {
    return "Air quality asks for an indoor day — Amy kept today’s step inside.";
  }
  if (aqi === "unhealthy") {
    return "Air quality is poor — keep today’s step short and sheltered.";
  }
  if ((signal.outdoorSuitability ?? "").toLowerCase() === "no") {
    return "Outdoor time isn’t kind today — Amy chose an indoor next step.";
  }
  if (signal.temperatureC != null && signal.temperatureC >= 38) {
    return "Extreme heat — stay cool; today’s step stays gentle and indoors.";
  }
  if (signal.temperatureC != null && signal.temperatureC <= 5) {
    return "Bitter cold — keep today’s step warm and close to home.";
  }
  return null;
}

/**
 * Pick exactly one supporting insight — or none.
 * Never invents a second hero.
 */
export function resolveSupportingInsight(
  input: SupportingInsightInput,
): SupportingInsight | null {
  const weatherLine =
    input.weather?.line?.trim() ||
    (input.weather
      ? buildWeatherInsightLine(input.weather)
      : null);
  if (
    weatherLine &&
    input.weather &&
    weatherChangesRecommendation(input.weather)
  ) {
    return { kind: "weather", text: weatherLine };
  }

  const family = input.familyHeadline?.trim();
  if (family) return { kind: "family", text: family };

  const infant = input.infantLine?.trim();
  if (infant) return { kind: "infant", text: infant };

  const emotional = input.continuityEmotional?.trim();
  const why = input.heroWhy?.trim() ?? "";
  if (emotional && !why.includes(emotional)) {
    return { kind: "continuity", text: emotional };
  }

  return null;
}

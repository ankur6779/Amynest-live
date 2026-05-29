/** Optional weather enrichment — graceful no-op when unavailable. */
export interface WeatherContext {
  condition: "clear" | "rain" | "heat" | "cold" | "unknown";
  tempC: number | null;
}

export function weatherActivityHint(weather: WeatherContext | null | undefined): string | null {
  if (!weather) return null;
  if (weather.condition === "rain") {
    return "Rainy day? Try an indoor activity today.";
  }
  if (weather.condition === "heat" || (weather.tempC != null && weather.tempC >= 32)) {
    return "Stay hydrated — offer water before snacks today.";
  }
  if (weather.condition === "cold" || (weather.tempC != null && weather.tempC <= 5)) {
    return "Cold day — a warm snack and cosy story time work well.";
  }
  return null;
}

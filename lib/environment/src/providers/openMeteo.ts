// ─────────────────────────────────────────────────────────────────────────
// Open-Meteo provider — free, no API key required.
// Endpoints: https://api.open-meteo.com (forecast) + https://air-quality-api.open-meteo.com (AQI)
//
// Priority: fresh API → 15 min cache → country-based fallback snapshot.
// Never throws; routine generation must not block on weather/AQI.
// ─────────────────────────────────────────────────────────────────────────

import type {
  AtmosphericSnapshot,
  EnvironmentalProvider,
  PredictedWeatherShift,
} from "../types.js";
import {
  fallbackAtmosphericSnapshot,
  logEnvDev,
  normalizeSnapshot,
  validateAQI,
} from "../snapshotPipeline.js";

interface CacheEntry {
  expiresAt: number;
  snapshot: AtmosphericSnapshot;
}

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 2_500;

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

function withTimeout(ms: number, signal?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("open-meteo timeout")), ms);
  const onAbort = (): void => controller.abort(signal!.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", onAbort);
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      if (signal) signal.removeEventListener("abort", onAbort);
    },
  };
}

interface OpenMeteoForecastResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    cloud_cover?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
  daily?: {
    time?: string[];
    sunrise?: string[];
    sunset?: string[];
    uv_index_max?: number[];
    daylight_duration?: number[];
    precipitation_probability_max?: number[];
  };
  hourly?: {
    time?: string[];
    precipitation_probability?: number[];
    temperature_2m?: number[];
    weather_code?: number[];
  };
}

interface OpenMeteoAirQualityResponse {
  current?: {
    us_aqi?: number;
    pm2_5?: number;
  };
}

function deriveShift(forecast: OpenMeteoForecastResponse): PredictedWeatherShift | undefined {
  const hourly = forecast.hourly;
  if (!hourly?.time || !hourly?.precipitation_probability) return undefined;

  const now = Date.now();
  for (let i = 0; i < hourly.time.length && i < 6; i++) {
    const t = Date.parse(hourly.time[i]!);
    if (Number.isNaN(t) || t <= now) continue;
    const etaHours = Math.max(0, Math.round((t - now) / 3_600_000));
    const probability = hourly.precipitation_probability[i] ?? 0;
    const code = hourly.weather_code?.[i] ?? 0;
    if (code >= 95) {
      return { kind: "incoming_storm", label: `Storm expected in ~${etaHours}h`, etaHours, confidence: 0.85 };
    }
    if (probability >= 60) {
      return { kind: "incoming_rain", label: `Rain likely in ~${etaHours}h`, etaHours, confidence: probability / 100 };
    }
  }

  const temps = hourly.temperature_2m ?? [];
  if (temps.length >= 4) {
    const delta = (temps[3] ?? 0) - (temps[0] ?? 0);
    if (Math.abs(delta) >= 5) {
      return {
        kind: "temperature_spike",
        label: `Temperature shift of ${delta > 0 ? "+" : ""}${delta.toFixed(0)}°C in 4h`,
        etaHours: 4,
        confidence: 0.7,
      };
    }
  }

  return { kind: "stable", label: "Conditions stable", etaHours: 0, confidence: 0.6 };
}

function weatherCodeIsSevere(code?: number): boolean {
  if (code == null) return false;
  return code >= 95;
}

export class OpenMeteoProvider implements EnvironmentalProvider {
  readonly name = "open-meteo";
  private ttlMs: number;
  private timeoutMs: number;

  constructor(opts: { ttlMs?: number; timeoutMs?: number } = {}) {
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async fetchSnapshot(input: {
    latitude: number;
    longitude: number;
    timezone?: string;
    country?: string | null;
    signal?: AbortSignal;
  }): Promise<AtmosphericSnapshot> {
    const key = cacheKey(input.latitude, input.longitude);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return normalizeSnapshot({ ...cached.snapshot, source: "cache" });
    }

    const { signal, cleanup } = withTimeout(this.timeoutMs, input.signal);

    try {
      const tz = input.timezone ?? "auto";
      const forecastUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${input.latitude}&longitude=${input.longitude}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m,weather_code` +
        `&hourly=temperature_2m,precipitation_probability,weather_code` +
        `&daily=sunrise,sunset,uv_index_max,daylight_duration,precipitation_probability_max` +
        `&forecast_days=1&forecast_hours=6&timezone=${encodeURIComponent(tz)}`;
      const aqiUrl =
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${input.latitude}&longitude=${input.longitude}` +
        `&current=us_aqi,pm2_5&timezone=${encodeURIComponent(tz)}`;

      const [fcastRes, aqiRes] = await Promise.all([
        fetch(forecastUrl, { signal }),
        fetch(aqiUrl, { signal }).catch(() => null),
      ]);

      if (!fcastRes.ok) throw new Error(`open-meteo forecast HTTP ${fcastRes.status}`);
      const fcast = (await fcastRes.json()) as OpenMeteoForecastResponse;
      const aqi: OpenMeteoAirQualityResponse | null = aqiRes && aqiRes.ok
        ? ((await aqiRes.json()) as OpenMeteoAirQualityResponse)
        : null;

      const rawPm25 = aqi?.current?.pm2_5;
      const rawAqi = validateAQI(aqi?.current?.us_aqi, rawPm25);
      if (rawAqi == null && aqi?.current?.us_aqi != null) {
        logEnvDev("aqi_invalid", { raw: aqi.current.us_aqi, pm25: rawPm25 });
      }

      const daylightSec = fcast.daily?.daylight_duration?.[0];
      const snapshot = normalizeSnapshot({
        observedAt: fcast.current?.time ?? new Date().toISOString(),
        source: "open-meteo",
        temperatureC: fcast.current?.temperature_2m,
        apparentC: fcast.current?.apparent_temperature,
        humidityPct: fcast.current?.relative_humidity_2m,
        precipitationMm: fcast.current?.precipitation,
        precipitationProbability: fcast.daily?.precipitation_probability_max?.[0],
        cloudCoverPct: fcast.current?.cloud_cover,
        windKph: fcast.current?.wind_speed_10m,
        uvIndexMax: fcast.daily?.uv_index_max?.[0],
        aqiUs: rawAqi ?? undefined,
        pm25: rawPm25,
        sunrise: fcast.daily?.sunrise?.[0],
        sunset: fcast.daily?.sunset?.[0],
        daylightMinutes: daylightSec != null ? Math.round(daylightSec / 60) : undefined,
        predictedShift: weatherCodeIsSevere(fcast.current?.weather_code)
          ? { kind: "incoming_storm", label: "Severe weather present", etaHours: 0, confidence: 0.95 }
          : deriveShift(fcast),
      });

      cache.set(key, { expiresAt: Date.now() + this.ttlMs, snapshot });
      return snapshot;
    } catch (err) {
      logEnvDev("api_failure", {
        error: err instanceof Error ? err.message : String(err),
        lat: input.latitude,
        lng: input.longitude,
      });
      if (cached) {
        logEnvDev("fallback_cache", { key });
        return normalizeSnapshot({ ...cached.snapshot, source: "cache" });
      }
      logEnvDev("fallback_country", { country: input.country });
      return fallbackAtmosphericSnapshot(input.country);
    } finally {
      cleanup();
    }
  }
}

/** Test-only: clear the in-memory cache. */
export function _clearOpenMeteoCacheForTests(): void {
  cache.clear();
}

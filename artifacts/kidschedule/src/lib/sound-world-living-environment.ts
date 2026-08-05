/**
 * Living environment schedule for Amy Sound World.
 * Pure logic — no DOM. Day/night + natural weather cadence + tier caps.
 */

import type { WorldId } from "@workspace/world-engine";
import { performanceTier, type PerformanceTier } from "@/lib/performance-tier";

export type DayPeriod = "morning" | "afternoon" | "evening" | "night";
export type WeatherKind = "clear" | "rain" | "wind" | "snow" | "fog" | "sun_rays";
export type AmbienceKind = "forest" | "nature" | "city" | "home" | "studio";

export type LivingEnvironmentCaps = {
  tier: PerformanceTier;
  reduced: boolean;
  /** Soft day/night sky tint */
  allowSky: boolean;
  /** Particle / sprite layers */
  allowAtmosphere: boolean;
  /** Birds, planes, complex paths */
  allowComplexMotion: boolean;
  /** Procedural ambient audio */
  allowAmbientAudio: boolean;
  /** Occasional object life (blink/wiggle) */
  allowObjectLife: boolean;
  maxSprites: number;
};

export function dayPeriodFromHour(hour: number): DayPeriod {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 20) return "evening";
  return "night";
}

export function resolveDayPeriod(now = new Date()): DayPeriod {
  return dayPeriodFromHour(now.getHours());
}

export function ambienceKindForWorld(worldId: WorldId): AmbienceKind {
  switch (worldId) {
    case "animal_world":
      return "forest";
    case "nature_world":
      return "nature";
    case "vehicle_world":
      return "city";
    case "home_sounds_world":
      return "home";
    case "instrument_world":
      return "studio";
    default:
      return "forest";
  }
}

/** Deterministic hash for stable weather windows. */
function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const WEATHER_POOL: WeatherKind[] = ["rain", "wind", "snow", "fog", "sun_rays"];

/**
 * Natural weather: ~12–20 min cycle; weather active for ~2–4 min inside the cycle.
 * Same world+hour bucket → same weather (not jitter every render).
 */
export function resolveWeather(
  worldId: WorldId,
  now = new Date(),
): { weather: WeatherKind; intensity: number } {
  const period = resolveDayPeriod(now);
  const bucket = Math.floor(now.getTime() / (16 * 60 * 1000)); // 16-minute windows
  const seed = hashSeed(`${worldId}:${bucket}:${period}`);
  const phase = seed % 100;

  // Most of the time: clear sky. Weather only in a mid window of the cycle.
  if (phase < 62 || phase > 84) {
    return { weather: "clear", intensity: 0 };
  }

  let pool = WEATHER_POOL;
  if (period === "night") pool = ["fog", "rain", "wind", "snow"];
  if (period === "afternoon") pool = ["sun_rays", "wind", "rain", "fog"];
  if (period === "morning") pool = ["sun_rays", "fog", "wind", "rain"];
  if (worldId === "home_sounds_world") pool = ["rain", "fog", "wind", "sun_rays"];
  if (worldId === "instrument_world") pool = ["fog", "sun_rays"];

  const weather = pool[seed % pool.length]!;
  const intensity = 0.35 + ((seed % 40) / 100);
  return { weather, intensity };
}

export function livingEnvironmentCaps(reduced: boolean): LivingEnvironmentCaps {
  const tier = performanceTier();
  if (reduced || tier === "low") {
    return {
      tier,
      reduced: true,
      allowSky: true,
      allowAtmosphere: false,
      allowComplexMotion: false,
      allowAmbientAudio: false,
      allowObjectLife: false,
      maxSprites: 0,
    };
  }
  if (tier === "mid") {
    return {
      tier,
      reduced: false,
      allowSky: true,
      allowAtmosphere: true,
      allowComplexMotion: false,
      allowAmbientAudio: true,
      allowObjectLife: true,
      maxSprites: 5,
    };
  }
  return {
    tier: "high",
    reduced: false,
    allowSky: true,
    allowAtmosphere: true,
    allowComplexMotion: true,
    allowAmbientAudio: true,
    allowObjectLife: true,
    maxSprites: 12,
  };
}

export type SkyPalette = {
  from: string;
  via: string;
  to: string;
  overlay: string;
};

export function skyPalette(period: DayPeriod, worldId: WorldId): SkyPalette {
  const byPeriod: Record<DayPeriod, SkyPalette> = {
    morning: {
      from: "rgba(255,214,170,0.22)",
      via: "rgba(147,197,253,0.12)",
      to: "transparent",
      overlay: "rgba(255,236,200,0.08)",
    },
    afternoon: {
      from: "rgba(125,211,252,0.16)",
      via: "rgba(191,219,254,0.08)",
      to: "transparent",
      overlay: "rgba(255,255,255,0.04)",
    },
    evening: {
      from: "rgba(251,146,60,0.14)",
      via: "rgba(167,139,250,0.08)",
      to: "transparent",
      overlay: "transparent",
    },
    // Night tint must stay light — stacked under translucent cards it previously
    // read as a near-black full-screen overlay on Android WebView.
    night: {
      from: "rgba(30,41,89,0.16)",
      via: "rgba(15,23,42,0.08)",
      to: "transparent",
      overlay: "transparent",
    },
  };

  const base = byPeriod[period];
  if (worldId === "instrument_world") {
    return {
      ...base,
      via: "rgba(167,139,250,0.12)",
      overlay: "transparent",
    };
  }
  if (worldId === "vehicle_world") {
    return {
      ...base,
      from: period === "night" ? "rgba(15,23,42,0.18)" : "rgba(148,163,184,0.14)",
    };
  }
  return base;
}

export const PRIMARY_SOUND_START = "amynest:sound-world-primary-start";
export const PRIMARY_SOUND_END = "amynest:sound-world-primary-end";

export function emitPrimarySoundStart(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PRIMARY_SOUND_START));
}

export function emitPrimarySoundEnd(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PRIMARY_SOUND_END));
}

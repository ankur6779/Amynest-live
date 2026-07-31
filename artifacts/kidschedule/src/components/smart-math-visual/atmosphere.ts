/**
 * Session atmosphere — time of day + subtle weather.
 * Lighting only; never affects gameplay.
 */

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type WeatherKind =
  | "clear"
  | "breeze"
  | "leaves"
  | "fireflies"
  | "soft_rain"
  | "snow_dust"
  | "magic_dust"
  | "rainbow"
  | "shooting_star";

export type Atmosphere = {
  timeOfDay: TimeOfDay;
  weather: WeatherKind;
  /** Overlay tint for sky / bloom */
  skyTint: string;
  sunGlow: string;
  rimLight: string;
  shaftOpacity: number;
};

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

export function resolveTimeOfDay(date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 16) return "afternoon";
  if (h >= 16 && h < 20) return "evening";
  return "night";
}

const WEATHER_POOL: WeatherKind[] = [
  "clear",
  "breeze",
  "leaves",
  "fireflies",
  "soft_rain",
  "snow_dust",
  "magic_dust",
  "rainbow",
  "shooting_star",
];

/** Pick once per session — seeded so same child/day feels coherent but weather varies. */
export function pickSessionWeather(childName: string, sessionSalt = ""): WeatherKind {
  const seed = hashSeed(
    `${childName}|${new Date().toISOString().slice(0, 10)}|${sessionSalt}|wx`,
  );
  return WEATHER_POOL[seed % WEATHER_POOL.length]!;
}

export function buildAtmosphere(
  childName: string,
  sessionSalt = String(Math.floor(Date.now() / 60000)),
): Atmosphere {
  const timeOfDay = resolveTimeOfDay();
  const weather = pickSessionWeather(childName, sessionSalt);

  const byTime: Record<TimeOfDay, Omit<Atmosphere, "timeOfDay" | "weather">> = {
    morning: {
      skyTint: "rgba(255, 214, 170, 0.18)",
      sunGlow: "rgba(255, 200, 120, 0.42)",
      rimLight: "rgba(255, 236, 200, 0.35)",
      shaftOpacity: 0.22,
    },
    afternoon: {
      skyTint: "rgba(180, 220, 255, 0.10)",
      sunGlow: "rgba(255, 248, 220, 0.28)",
      rimLight: "rgba(255, 255, 255, 0.22)",
      shaftOpacity: 0.16,
    },
    evening: {
      skyTint: "rgba(255, 140, 90, 0.20)",
      sunGlow: "rgba(255, 120, 60, 0.38)",
      rimLight: "rgba(255, 180, 120, 0.32)",
      shaftOpacity: 0.28,
    },
    night: {
      skyTint: "rgba(40, 60, 120, 0.22)",
      sunGlow: "rgba(180, 200, 255, 0.18)",
      rimLight: "rgba(160, 190, 255, 0.28)",
      shaftOpacity: 0.12,
    },
  };

  return { timeOfDay, weather, ...byTime[timeOfDay] };
}

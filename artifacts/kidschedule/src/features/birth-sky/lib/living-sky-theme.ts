/**
 * Living Sky — presentation-only theme derived from existing birth/chart labels.
 * No API / data-model / pipeline changes.
 */

export type LivingSkyMood =
  | "sunrise"
  | "daylight"
  | "twilight"
  | "night"
  | "moon_aurora"
  | "sun_gold"
  | "venus_bloom"
  | "jupiter_royal"
  | "mars_amber"
  | "mercury_silver";

export type LivingSkyTheme = {
  mood: LivingSkyMood;
  /** CSS custom properties applied to ambient root */
  cssVars: Record<string, string>;
  className: string;
  /** Daily variation seed 0–1 for subtle freshness */
  dayVariant: number;
  constellationSeed: number;
};

const ELEMENT: Record<string, "fire" | "earth" | "air" | "water"> = {
  Aries: "fire",
  Leo: "fire",
  Sagittarius: "fire",
  Taurus: "earth",
  Virgo: "earth",
  Capricorn: "earth",
  Gemini: "air",
  Libra: "air",
  Aquarius: "air",
  Cancer: "water",
  Scorpio: "water",
  Pisces: "water",
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Parse HH:MM or HH:MM:SS → hour 0–23, or null. */
export function parseBirthHour(birthTime: string | null | undefined): number | null {
  if (!birthTime) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(birthTime.trim());
  if (!m) return null;
  const h = Number(m[1]);
  if (!Number.isFinite(h) || h < 0 || h > 23) return null;
  return h;
}

function dayPartFromHour(hour: number | null, timePrecision: string | null | undefined): "morning" | "day" | "evening" | "night" | "unknown" {
  if (hour == null || timePrecision === "unknown") return "unknown";
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function dominantMood(
  sunSign: string,
  moonSign: string,
  dayPart: ReturnType<typeof dayPartFromHour>,
): LivingSkyMood {
  const sunEl = ELEMENT[sunSign] ?? "air";
  const moonEl = ELEMENT[moonSign] ?? "water";

  if (dayPart === "morning") return "sunrise";
  if (dayPart === "night") return moonEl === "water" ? "moon_aurora" : "night";
  if (dayPart === "evening") return "twilight";

  if (moonEl === "water" && sunEl !== "fire") return "moon_aurora";
  if (sunEl === "fire") return "sun_gold";
  if (sunEl === "air" || moonEl === "air") return "mercury_silver";
  if (sunEl === "earth") return "jupiter_royal";
  if (moonEl === "fire") return "mars_amber";
  if (dayPart === "day") return "daylight";
  return "venus_bloom";
}

const MOOD_VARS: Record<LivingSkyMood, Record<string, string>> = {
  sunrise: {
    "--sky-nebula-a": "hsl(28 85% 55% / 0.42)",
    "--sky-nebula-b": "hsl(340 60% 45% / 0.22)",
    "--sky-nebula-c": "hsl(42 80% 50% / 0.28)",
    "--sky-aurora": "hsl(32 90% 60% / 0.14)",
    "--sky-particle": "hsl(42 95% 75% / 0.55)",
    "--sky-void": "hsl(250 40% 8%)",
    "--sky-star": "hsl(40 90% 92%)",
  },
  daylight: {
    "--sky-nebula-a": "hsl(220 55% 45% / 0.28)",
    "--sky-nebula-b": "hsl(275 50% 45% / 0.22)",
    "--sky-nebula-c": "hsl(42 60% 48% / 0.18)",
    "--sky-aurora": "hsl(210 70% 60% / 0.1)",
    "--sky-particle": "hsl(210 40% 90% / 0.4)",
    "--sky-void": "hsl(230 48% 7%)",
    "--sky-star": "hsl(40 80% 95%)",
  },
  twilight: {
    "--sky-nebula-a": "hsl(275 60% 42% / 0.4)",
    "--sky-nebula-b": "hsl(320 50% 40% / 0.28)",
    "--sky-nebula-c": "hsl(248 55% 35% / 0.3)",
    "--sky-aurora": "hsl(300 55% 55% / 0.12)",
    "--sky-particle": "hsl(320 60% 80% / 0.45)",
    "--sky-void": "hsl(248 50% 6%)",
    "--sky-star": "hsl(300 40% 92%)",
  },
  night: {
    "--sky-nebula-a": "hsl(248 55% 38% / 0.38)",
    "--sky-nebula-b": "hsl(230 60% 30% / 0.32)",
    "--sky-nebula-c": "hsl(275 45% 28% / 0.25)",
    "--sky-aurora": "hsl(230 70% 55% / 0.1)",
    "--sky-particle": "hsl(210 50% 85% / 0.4)",
    "--sky-void": "hsl(228 55% 4%)",
    "--sky-star": "hsl(40 70% 94%)",
  },
  moon_aurora: {
    "--sky-nebula-a": "hsl(210 70% 50% / 0.4)",
    "--sky-nebula-b": "hsl(248 55% 48% / 0.32)",
    "--sky-nebula-c": "hsl(190 50% 40% / 0.22)",
    "--sky-aurora": "hsl(195 80% 60% / 0.16)",
    "--sky-particle": "hsl(200 80% 85% / 0.5)",
    "--sky-void": "hsl(230 50% 5%)",
    "--sky-star": "hsl(200 60% 95%)",
  },
  sun_gold: {
    "--sky-nebula-a": "hsl(42 85% 48% / 0.4)",
    "--sky-nebula-b": "hsl(28 75% 42% / 0.28)",
    "--sky-nebula-c": "hsl(275 45% 35% / 0.2)",
    "--sky-aurora": "hsl(42 90% 55% / 0.14)",
    "--sky-particle": "hsl(42 95% 72% / 0.55)",
    "--sky-void": "hsl(248 40% 7%)",
    "--sky-star": "hsl(42 90% 92%)",
  },
  venus_bloom: {
    "--sky-nebula-a": "hsl(320 55% 48% / 0.38)",
    "--sky-nebula-b": "hsl(275 50% 45% / 0.3)",
    "--sky-nebula-c": "hsl(340 45% 40% / 0.22)",
    "--sky-aurora": "hsl(330 70% 60% / 0.14)",
    "--sky-particle": "hsl(330 70% 85% / 0.48)",
    "--sky-void": "hsl(275 45% 6%)",
    "--sky-star": "hsl(330 50% 94%)",
  },
  jupiter_royal: {
    "--sky-nebula-a": "hsl(42 70% 42% / 0.38)",
    "--sky-nebula-b": "hsl(275 55% 40% / 0.32)",
    "--sky-nebula-c": "hsl(248 50% 32% / 0.25)",
    "--sky-aurora": "hsl(42 75% 50% / 0.12)",
    "--sky-particle": "hsl(42 80% 70% / 0.5)",
    "--sky-void": "hsl(248 48% 6%)",
    "--sky-star": "hsl(42 70% 92%)",
  },
  mars_amber: {
    "--sky-nebula-a": "hsl(24 80% 48% / 0.38)",
    "--sky-nebula-b": "hsl(12 70% 40% / 0.28)",
    "--sky-nebula-c": "hsl(275 40% 30% / 0.2)",
    "--sky-aurora": "hsl(28 85% 52% / 0.12)",
    "--sky-particle": "hsl(32 90% 70% / 0.5)",
    "--sky-void": "hsl(250 40% 6%)",
    "--sky-star": "hsl(30 70% 92%)",
  },
  mercury_silver: {
    "--sky-nebula-a": "hsl(210 25% 55% / 0.32)",
    "--sky-nebula-b": "hsl(248 35% 45% / 0.28)",
    "--sky-nebula-c": "hsl(220 20% 40% / 0.22)",
    "--sky-aurora": "hsl(210 30% 70% / 0.12)",
    "--sky-particle": "hsl(210 25% 88% / 0.5)",
    "--sky-void": "hsl(230 35% 6%)",
    "--sky-star": "hsl(210 20% 96%)",
  },
};

export type LivingSkyInput = {
  childName?: string | null;
  sunSign?: string | null;
  moonSign?: string | null;
  birthTime?: string | null;
  timePrecision?: string | null;
  /** ISO day key for daily freshness — defaults to today UTC */
  dayKey?: string | null;
};

export function resolveLivingSkyTheme(input: LivingSkyInput): LivingSkyTheme {
  const sun = input.sunSign?.trim() || "Leo";
  const moon = input.moonSign?.trim() || "Cancer";
  const child = input.childName?.trim() || "child";
  const dayKey = input.dayKey || new Date().toISOString().slice(0, 10);
  const hour = parseBirthHour(input.birthTime);
  const dayPart = dayPartFromHour(hour, input.timePrecision);
  const mood = dominantMood(sun, moon, dayPart);
  const seed = hashSeed(`${child}|${sun}|${moon}|${dayKey}|${mood}`);
  const dayVariant = (seed % 1000) / 1000;
  const constellationSeed = seed % 7;

  const base = MOOD_VARS[mood];
  // Subtle daily shift of nebula opacity via CSS var
  const density = 0.92 + dayVariant * 0.16;

  return {
    mood,
    className: `amy-living-sky amy-living-sky--${mood}`,
    dayVariant,
    constellationSeed,
    cssVars: {
      ...base,
      "--sky-density": String(density),
      "--sky-day-shift": `${(dayVariant * 8 - 4).toFixed(2)}%`,
      "--sky-constellation": String(constellationSeed),
    },
  };
}

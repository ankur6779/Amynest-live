/**
 * UI-only world theme + lighting for Cosmic Portrait.
 * Derived from existing portrait chart labels — no API / data-model changes.
 */

export type PortraitWorldId =
  | "moon_lake"
  | "aurora_garden"
  | "galaxy_adventure"
  | "golden_constellation"
  | "nebula_forest"
  | "planet_observatory";

export type PortraitLightingId =
  | "moon"
  | "sun"
  | "venus"
  | "jupiter"
  | "mercury"
  | "mars";

export type PortraitWorldTheme = {
  id: PortraitWorldId;
  label: string;
  amyOpener: string;
  qualitiesLead: string;
  remindersLead: string;
  insightsLead: string;
  closingLine: string;
  lighting: PortraitLightingId;
  /** CSS custom properties for stage tint */
  cssVars: Record<string, string>;
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

const LIGHTING_VARS: Record<PortraitLightingId, Record<string, string>> = {
  moon: {
    "--cp-glow-a": "hsl(210 70% 62% / 0.42)",
    "--cp-glow-b": "hsl(248 55% 55% / 0.28)",
    "--cp-accent": "hsl(210 80% 78%)",
    "--cp-warm": "hsl(220 40% 88%)",
  },
  sun: {
    "--cp-glow-a": "hsl(42 85% 55% / 0.4)",
    "--cp-glow-b": "hsl(28 80% 48% / 0.22)",
    "--cp-accent": "hsl(42 90% 72%)",
    "--cp-warm": "hsl(40 70% 90%)",
  },
  venus: {
    "--cp-glow-a": "hsl(320 55% 58% / 0.38)",
    "--cp-glow-b": "hsl(275 50% 50% / 0.28)",
    "--cp-accent": "hsl(330 70% 82%)",
    "--cp-warm": "hsl(340 40% 92%)",
  },
  jupiter: {
    "--cp-glow-a": "hsl(42 70% 48% / 0.4)",
    "--cp-glow-b": "hsl(275 55% 42% / 0.3)",
    "--cp-accent": "hsl(42 80% 70%)",
    "--cp-warm": "hsl(45 50% 90%)",
  },
  mercury: {
    "--cp-glow-a": "hsl(210 20% 72% / 0.35)",
    "--cp-glow-b": "hsl(248 30% 55% / 0.25)",
    "--cp-accent": "hsl(210 25% 88%)",
    "--cp-warm": "hsl(220 20% 94%)",
  },
  mars: {
    "--cp-glow-a": "hsl(28 80% 52% / 0.38)",
    "--cp-glow-b": "hsl(12 70% 45% / 0.22)",
    "--cp-accent": "hsl(32 85% 72%)",
    "--cp-warm": "hsl(30 55% 90%)",
  },
};

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pickLighting(sunSign: string, moonSign: string): PortraitLightingId {
  const sunEl = ELEMENT[sunSign] ?? "air";
  const moonEl = ELEMENT[moonSign] ?? "water";
  if (moonEl === "water" && sunEl !== "fire") return "moon";
  if (sunEl === "fire") return "sun";
  if (sunEl === "air" || moonEl === "air") return "mercury";
  if (sunEl === "earth") return "jupiter";
  if (moonEl === "fire") return "mars";
  return "venus";
}

function pickWorld(input: {
  childName: string;
  sunSign: string;
  moonSign: string;
  qualities: string[];
}): { id: PortraitWorldId; label: string } {
  const blob = `${input.qualities.join(" ")} ${input.sunSign} ${input.moonSign}`.toLowerCase();
  if (/empathy|feeling|deep|soft|tide/.test(blob)) {
    return { id: "moon_lake", label: "Moon Lake" };
  }
  if (/imagin|creative|curiosity|questions|noticing/.test(blob)) {
    return { id: "aurora_garden", label: "Aurora Garden" };
  }
  if (/courage|brave|initiative|adventure|bridge/.test(blob)) {
    return { id: "galaxy_adventure", label: "Galaxy Adventure" };
  }
  if (/steady|reliab|presence|hands-on/.test(blob)) {
    return { id: "golden_constellation", label: "Golden Constellation" };
  }
  if (/sparkle|social|playful/.test(blob)) {
    return { id: "planet_observatory", label: "Planet Observatory" };
  }
  const worlds: Array<{ id: PortraitWorldId; label: string }> = [
    { id: "nebula_forest", label: "Nebula Forest" },
    { id: "moon_lake", label: "Moon Lake" },
    { id: "aurora_garden", label: "Aurora Garden" },
    { id: "galaxy_adventure", label: "Galaxy Adventure" },
    { id: "golden_constellation", label: "Golden Constellation" },
    { id: "planet_observatory", label: "Planet Observatory" },
  ];
  const seed = hashSeed(`${input.childName}|${input.sunSign}|${input.moonSign}`);
  return worlds[seed % worlds.length]!;
}

export function resolvePortraitWorldTheme(input: {
  childName: string;
  sunSign: string;
  moonSign: string;
  qualities: string[];
}): PortraitWorldTheme {
  const child = input.childName.trim() || "your child";
  const world = pickWorld(input);
  const lighting = pickLighting(input.sunSign, input.moonSign);
  const openers = [
    `Tonight I discovered something beautiful about ${child}.`,
    `The stars whispered a gentle story about ${child}.`,
    `I wandered ${child}'s sky… and found light waiting to be loved.`,
    `Come closer — ${child}'s universe opened a soft door for us.`,
  ];
  const seed = hashSeed(`${child}|${input.sunSign}|${input.moonSign}|opener`);

  return {
    id: world.id,
    label: world.label,
    amyOpener: openers[seed % openers.length]!,
    qualitiesLead: `Here are three lights I noticed shining in ${child}…`,
    remindersLead: `And three ways you can walk beside ${child}…`,
    insightsLead: `More constellations from ${child}'s sky…`,
    closingLine: `I'll keep discovering new stars as ${child} grows.`,
    lighting,
    cssVars: {
      ...LIGHTING_VARS[lighting],
      "--cp-world": world.id,
    },
  };
}

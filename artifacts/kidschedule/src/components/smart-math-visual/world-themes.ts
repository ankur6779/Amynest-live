/**
 * Visual world themes for Smart Math Tricks.
 * Pure presentation — does not alter trick content or learning logic.
 */

export type MathWorldId =
  | "crystal_cave"
  | "sunny_meadow"
  | "moon_forest"
  | "rocket_base"
  | "toy_workshop"
  | "magic_garden";

export type MathWorldTheme = {
  id: MathWorldId;
  label: string;
  /** Deep gradient stops for the living background */
  sky: [string, string, string];
  accent: string;
  glow: string;
  particle: string;
  fog: string;
  mood: "sparkle" | "warm" | "cool" | "cosmic" | "playful" | "garden";
};

export const MATH_WORLDS: Record<MathWorldId, MathWorldTheme> = {
  crystal_cave: {
    id: "crystal_cave",
    label: "Crystal Cave",
    sky: ["#1a0b2e", "#2d1b4e", "#451a03"],
    accent: "#c4b5fd",
    glow: "rgba(167,139,250,0.35)",
    particle: "rgba(216,180,254,0.7)",
    fog: "rgba(139,92,246,0.08)",
    mood: "sparkle",
  },
  sunny_meadow: {
    id: "sunny_meadow",
    label: "Sunny Meadow",
    sky: ["#1c1917", "#292524", "#451a03"],
    accent: "#fbbf24",
    glow: "rgba(251,191,36,0.32)",
    particle: "rgba(253,224,71,0.65)",
    fog: "rgba(245,158,11,0.07)",
    mood: "warm",
  },
  moon_forest: {
    id: "moon_forest",
    label: "Moon Forest",
    sky: ["#0c1222", "#1e293b", "#0f172a"],
    accent: "#7dd3fc",
    glow: "rgba(56,189,248,0.28)",
    particle: "rgba(125,211,252,0.6)",
    fog: "rgba(14,165,233,0.07)",
    mood: "cool",
  },
  rocket_base: {
    id: "rocket_base",
    label: "Rocket Base",
    sky: ["#0f172a", "#1e1b4b", "#312e81"],
    accent: "#a78bfa",
    glow: "rgba(129,140,248,0.32)",
    particle: "rgba(165,180,252,0.65)",
    fog: "rgba(99,102,241,0.08)",
    mood: "cosmic",
  },
  toy_workshop: {
    id: "toy_workshop",
    label: "Toy Workshop",
    sky: ["#1c1917", "#3f2a1a", "#451a03"],
    accent: "#fb7185",
    glow: "rgba(251,113,133,0.28)",
    particle: "rgba(253,164,175,0.65)",
    fog: "rgba(244,63,94,0.06)",
    mood: "playful",
  },
  magic_garden: {
    id: "magic_garden",
    label: "Magic Garden",
    sky: ["#052e16", "#14532d", "#1c1917"],
    accent: "#86efac",
    glow: "rgba(74,222,128,0.28)",
    particle: "rgba(134,239,172,0.6)",
    fog: "rgba(34,197,94,0.07)",
    mood: "garden",
  },
};

/** Infer a visual world from trick title/id — presentation only. */
export function worldForTrick(trick: { id: string; title: string; trick: string }): MathWorldTheme {
  const hay = `${trick.id} ${trick.title} ${trick.trick}`.toLowerCase();
  if (/double|near/.test(hay)) return MATH_WORLDS.crystal_cave;
  if (/÷|divid|share|half|group/.test(hay)) return MATH_WORLDS.toy_workshop;
  if (/−|subtract|minus|take away/.test(hay)) return MATH_WORLDS.moon_forest;
  if (/×|multipl|square|times|zero|tens|rocket|11|25|50|100/.test(hay)) {
    return MATH_WORLDS.rocket_base;
  }
  if (/pattern|split|break/.test(hay)) return MATH_WORLDS.magic_garden;
  return MATH_WORLDS.sunny_meadow;
}

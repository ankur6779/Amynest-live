/**
 * Presentation-only world identity — destinations kids remember.
 * Does not alter game IDs, scoring, or progression.
 */
import type { HealthGameId } from "./types";

export interface WorldIdentity {
  worldName: string;
  kidAction: string;
  atmosphere: string;
  motif: "balloon" | "island" | "rocket" | "garden" | "crystal" | "passport";
  glow: string;
  sky: string;
  ctaClass: string;
  celebrateEmoji: string;
  pin: string;
  /** Arrival / idle greetings — rotate by seed */
  greetings: readonly string[];
  /** Completion lines after a session */
  completeLines: readonly string[];
}

export const WORLD_IDENTITY: Record<HealthGameId, WorldIdentity> = {
  "breath-control": {
    worldName: "Balloon Valley",
    kidAction: "Hold still!",
    atmosphere: "Bright sky · Soft clouds",
    motif: "balloon",
    glow: "rgba(56,189,248,0.55)",
    sky: "from-sky-300 via-sky-500 to-indigo-700",
    ctaClass:
      "bg-gradient-to-br from-sky-300 via-sky-500 to-indigo-600 text-white shadow-[0_4px_18px_-4px_rgba(56,189,248,0.65)]",
    celebrateEmoji: "🎈",
    pin: "bg-sky-400",
    greetings: [
      "The balloons are waiting for you!",
      "Soft skies today — ready to float?",
      "Hold still and rise with me!",
    ],
    completeLines: [
      "What a gentle float!",
      "Balloon Valley cheers for you!",
      "You stayed so steady up high!",
    ],
  },
  "flamingo-balance": {
    worldName: "Sky Island",
    kidAction: "Balance!",
    atmosphere: "Floating islands · Warm wind",
    motif: "island",
    glow: "rgba(244,114,182,0.55)",
    sky: "from-rose-300 via-pink-500 to-orange-500",
    ctaClass:
      "bg-gradient-to-br from-pink-400 via-rose-500 to-orange-500 text-white shadow-[0_4px_18px_-4px_rgba(244,114,182,0.65)]",
    celebrateEmoji: "🏝",
    pin: "bg-rose-400",
    greetings: [
      "The island wind says hello!",
      "Let's train your balance today!",
      "Stand tall — Sky Island awaits!",
    ],
    completeLines: [
      "You balanced like a flamingo!",
      "Sky Island is proud of you!",
      "Steady feet, brave heart!",
    ],
  },
  "reaction-time": {
    worldName: "Rocket Base",
    kidAction: "Tap GO!",
    atmosphere: "Deep space · Launch pad",
    motif: "rocket",
    glow: "rgba(251,191,36,0.55)",
    sky: "from-slate-900 via-indigo-900 to-amber-500",
    ctaClass:
      "bg-gradient-to-br from-amber-300 via-orange-500 to-red-500 text-white shadow-[0_4px_18px_-4px_rgba(251,191,36,0.65)]",
    celebrateEmoji: "🚀",
    pin: "bg-amber-400",
    greetings: [
      "Rocket Base needs another pilot!",
      "Engines warm — ready for launch?",
      "Tap GO when the signal shines!",
    ],
    completeLines: [
      "Lightning-fast launch!",
      "Pilot badge vibes!",
      "That was a stellar launch!",
    ],
  },
  "freeze-statue": {
    worldName: "Crystal Garden",
    kidAction: "Freeze!",
    atmosphere: "Glowing flowers · Soft light",
    motif: "garden",
    glow: "rgba(45,212,191,0.55)",
    sky: "from-emerald-300 via-teal-500 to-cyan-700",
    ctaClass:
      "bg-gradient-to-br from-emerald-300 via-teal-500 to-cyan-600 text-white shadow-[0_4px_18px_-4px_rgba(45,212,191,0.65)]",
    celebrateEmoji: "🌸",
    pin: "bg-teal-400",
    greetings: [
      "The crystals are blooming!",
      "Dance, then freeze like a statue!",
      "Garden magic is awake!",
    ],
    completeLines: [
      "Perfect freeze!",
      "The garden sparkles for you!",
      "Still as a crystal — amazing!",
    ],
  },
  "finger-stability": {
    worldName: "Crystal Cave",
    kidAction: "Stay center!",
    atmosphere: "Ice cave · Energy core",
    motif: "crystal",
    glow: "rgba(167,139,250,0.6)",
    sky: "from-violet-500 via-purple-700 to-fuchsia-600",
    ctaClass:
      "bg-gradient-to-br from-violet-400 via-purple-600 to-fuchsia-500 text-white shadow-[0_4px_18px_-4px_rgba(167,139,250,0.65)]",
    celebrateEmoji: "💎",
    pin: "bg-violet-400",
    greetings: [
      "The core is glowing for you!",
      "Stay center — keep the energy calm!",
      "Crystal Cave whispers… focus!",
    ],
    completeLines: [
      "Core stabilized!",
      "You kept the crystal shining!",
      "Such precise focus!",
    ],
  },
  "calmness-meter": {
    worldName: "Health Passport",
    kidAction: "See growth!",
    atmosphere: "Warm gold · Story book",
    motif: "passport",
    glow: "rgba(251,191,36,0.45)",
    sky: "from-amber-300 via-violet-500 to-indigo-700",
    ctaClass:
      "bg-gradient-to-br from-amber-300 via-orange-400 to-violet-500 text-white shadow-[0_4px_18px_-4px_rgba(251,191,36,0.55)]",
    celebrateEmoji: "✨",
    pin: "bg-amber-400",
    greetings: [
      "Your wellness story is ready!",
      "Let's peek at your growth!",
      "Passport pages sparkle today!",
    ],
    completeLines: [
      "Story saved!",
      "Your passport grew a little!",
      "What a proud chapter!",
    ],
  },
};

export function getWorldIdentity(gameId: HealthGameId): WorldIdentity {
  return WORLD_IDENTITY[gameId];
}

export function pickWorldLine(lines: readonly string[], seed: number): string {
  if (lines.length === 0) return "";
  return lines[Math.abs(seed) % lines.length]!;
}

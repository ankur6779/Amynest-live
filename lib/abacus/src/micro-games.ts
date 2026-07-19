/**
 * Micro-game presentation catalog.
 * Same underlying Practice / Mental / Challenge concepts — only framing changes.
 */

export type MicroGameId =
  | "classic"
  | "lightning"
  | "beat_the_clock"
  | "beat_amy"
  | "treasure_hunt"
  | "coin_collection"
  | "magic_beads"
  | "memory";

export type MicroGameDef = {
  id: MicroGameId;
  title: string;
  emoji: string;
  /** Which core mode this skins. */
  baseMode: "practice" | "mental" | "challenge";
  blurb: string;
  /** Optional timer seconds for the round (presentation). */
  roundSeconds?: number;
  /** Target correct answers to "win" the micro-game. */
  targetCorrect: number;
};

export const MICRO_GAMES: readonly MicroGameDef[] = [
  {
    id: "classic",
    title: "Classic",
    emoji: "✏️",
    baseMode: "practice",
    blurb: "Show the answer on the beads.",
    targetCorrect: 5,
  },
  {
    id: "magic_beads",
    title: "Magic Beads",
    emoji: "✨",
    baseMode: "practice",
    blurb: "Make the beads sparkle with the right number!",
    targetCorrect: 5,
  },
  {
    id: "coin_collection",
    title: "Coin Collection",
    emoji: "🪙",
    baseMode: "practice",
    blurb: "Each correct answer adds a shiny coin.",
    targetCorrect: 5,
  },
  {
    id: "lightning",
    title: "Lightning Round",
    emoji: "⚡",
    baseMode: "mental",
    blurb: "Answer as many as you can — no abacus!",
    roundSeconds: 45,
    targetCorrect: 5,
  },
  {
    id: "memory",
    title: "Memory Mode",
    emoji: "🧠",
    baseMode: "mental",
    blurb: "Picture the abacus, then type the answer.",
    targetCorrect: 5,
  },
  {
    id: "beat_amy",
    title: "Beat Amy",
    emoji: "🏁",
    baseMode: "mental",
    blurb: "Amy's target is 4 correct. Can you beat her?",
    targetCorrect: 4,
    roundSeconds: 60,
  },
  {
    id: "beat_the_clock",
    title: "Beat the Clock",
    emoji: "⏱️",
    baseMode: "challenge",
    blurb: "Race the timer — same Challenge rules.",
    targetCorrect: 5,
  },
  {
    id: "treasure_hunt",
    title: "Treasure Hunt",
    emoji: "🗺️",
    baseMode: "challenge",
    blurb: "Unlock the treasure chest by clearing the set!",
    targetCorrect: 5,
  },
] as const;

export function microGamesForMode(
  mode: "practice" | "mental" | "challenge",
): MicroGameDef[] {
  return MICRO_GAMES.filter((g) => g.baseMode === mode);
}

export function getMicroGame(id: MicroGameId): MicroGameDef {
  const g = MICRO_GAMES.find((x) => x.id === id);
  if (!g) throw new Error(`unknown micro-game ${id}`);
  return g;
}

/** Deterministic daily featured game from date key + childId. */
export function featuredMicroGame(dateKey: string, childId: number): MicroGameDef {
  let h = 0;
  const s = `${dateKey}:${childId}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const playable = MICRO_GAMES.filter((g) => g.id !== "classic");
  return playable[h % playable.length]!;
}

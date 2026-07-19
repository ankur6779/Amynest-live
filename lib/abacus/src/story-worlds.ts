import type { LevelId } from "./index.js";

export type StoryWorldId =
  | "forest"
  | "ocean"
  | "castle"
  | "mountain"
  | "temple"
  | "space"
  | "galaxy";

export type StoryWorld = {
  id: StoryWorldId;
  title: string;
  emoji: string;
  unlockLevel: LevelId;
  blurb: string;
  gradient: string;
};

export const STORY_WORLDS: readonly StoryWorld[] = [
  {
    id: "forest",
    title: "Bead Forest",
    emoji: "🌲",
    unlockLevel: 1,
    blurb: "Count glowing fireflies on the rods.",
    gradient: "from-emerald-500/25 to-lime-500/10",
  },
  {
    id: "ocean",
    title: "Addition Ocean",
    emoji: "🌊",
    unlockLevel: 2,
    blurb: "Stack shells — add without splash!",
    gradient: "from-cyan-500/25 to-blue-500/10",
  },
  {
    id: "castle",
    title: "Subtraction Castle",
    emoji: "🏰",
    unlockLevel: 3,
    blurb: "Guard the jewels — take only what you need.",
    gradient: "from-violet-500/25 to-fuchsia-500/10",
  },
  {
    id: "mountain",
    title: "Carry Mountain",
    emoji: "⛰️",
    unlockLevel: 4,
    blurb: "Climb big numbers with careful carries.",
    gradient: "from-stone-500/30 to-amber-500/10",
  },
  {
    id: "temple",
    title: "Mind Temple",
    emoji: "🛕",
    unlockLevel: 5,
    blurb: "Picture beads with your eyes closed.",
    gradient: "from-orange-500/25 to-rose-500/10",
  },
  {
    id: "space",
    title: "Multiply Space",
    emoji: "🚀",
    unlockLevel: 6,
    blurb: "Launch groups of stars into orbit.",
    gradient: "from-indigo-500/30 to-sky-500/10",
  },
  {
    id: "galaxy",
    title: "Division Galaxy",
    emoji: "🌌",
    unlockLevel: 7,
    blurb: "Share star clusters fairly.",
    gradient: "from-purple-500/30 to-slate-500/10",
  },
] as const;

export function worldForLevel(level: LevelId): StoryWorld {
  return STORY_WORLDS.find((w) => w.unlockLevel === level) ?? STORY_WORLDS[0]!;
}

export function unlockedWorlds(highestUnlocked: LevelId): StoryWorld[] {
  return STORY_WORLDS.filter((w) => w.unlockLevel <= highestUnlocked);
}

export function isWorldUnlocked(worldId: StoryWorldId, highestUnlocked: LevelId): boolean {
  const w = STORY_WORLDS.find((x) => x.id === worldId);
  return w ? w.unlockLevel <= highestUnlocked : false;
}

/**
 * SATPIN “worlds” — presentation themes mapped onto letter groups.
 * Does NOT change unlock order or grapheme content.
 */
import {
  LETTER_INTRODUCTION_GROUPS,
  getLetterGroup,
} from "@workspace/phonics-curriculum";
import type { ReadingAcademyLevelId } from "./reading-academy-levels";

export type SatpinWorld = {
  letterGroupId: number;
  name: string;
  theme: string;
  emoji: string;
  gradient: string;
  treasureEmoji: string;
  badge: string;
  /** Aligns with Reading Academy milestone framing */
  adventureWorld: ReadingAcademyLevelId;
};

/** Hand-crafted kid themes for each letter introduction group. */
export const SATPIN_WORLDS: readonly SatpinWorld[] = [
  {
    letterGroupId: 1,
    name: "Sunny Sound Island",
    theme: "Hear first sounds and smile.",
    emoji: "🏝️",
    gradient: "from-amber-400/25 to-sky-400/15",
    treasureEmoji: "💎",
    badge: "Island Explorer",
    adventureWorld: 1,
  },
  {
    letterGroupId: 2,
    name: "Word Forest",
    theme: "Blend letters into real words.",
    emoji: "🌲",
    gradient: "from-emerald-500/20 to-lime-400/10",
    treasureEmoji: "🏆",
    badge: "Forest Friend",
    adventureWorld: 2,
  },
  {
    letterGroupId: 3,
    name: "Reading River",
    theme: "Sail through short words and digraphs.",
    emoji: "🌊",
    gradient: "from-sky-500/20 to-cyan-400/10",
    treasureEmoji: "⭐",
    badge: "River Reader",
    adventureWorld: 3,
  },
  {
    letterGroupId: 4,
    name: "Story Mountain",
    theme: "Climb toward short stories.",
    emoji: "⛰️",
    gradient: "from-orange-500/20 to-rose-400/10",
    treasureEmoji: "🎖️",
    badge: "Mountain Climber",
    adventureWorld: 4,
  },
  {
    letterGroupId: 5,
    name: "Double Letter Cove",
    theme: "Spot doubles and new sounds.",
    emoji: "🏖️",
    gradient: "from-violet-500/15 to-fuchsia-400/10",
    treasureEmoji: "🌟",
    badge: "Cove Captain",
    adventureWorld: 5,
  },
  {
    letterGroupId: 6,
    name: "Fluent Meadow",
    theme: "Read more smoothly every day.",
    emoji: "🌼",
    gradient: "from-yellow-400/20 to-green-400/10",
    treasureEmoji: "👑",
    badge: "Meadow Star",
    adventureWorld: 6,
  },
  {
    letterGroupId: 7,
    name: "Book Castle",
    theme: "Open longer books with confidence.",
    emoji: "🏰",
    gradient: "from-indigo-500/15 to-amber-400/10",
    treasureEmoji: "📖",
    badge: "Castle Reader",
    adventureWorld: 6,
  },
  {
    letterGroupId: 8,
    name: "Digraph Galaxy",
    theme: "sh, ch, th and friends among the stars.",
    emoji: "🌌",
    gradient: "from-slate-500/20 to-purple-400/10",
    treasureEmoji: "🚀",
    badge: "Galaxy Guide",
    adventureWorld: 7,
  },
] as const;

export function getSatpinWorld(letterGroupIndex: number): SatpinWorld {
  const id = Math.max(1, Math.min(8, Math.round(letterGroupIndex)));
  return (
    SATPIN_WORLDS.find((w) => w.letterGroupId === id) ?? SATPIN_WORLDS[0]!
  );
}

export function worldUnlockStatus(
  letterGroupIndex: number,
  worldGroupId: number,
): "completed" | "current" | "locked" {
  if (worldGroupId < letterGroupIndex) return "completed";
  if (worldGroupId === letterGroupIndex) return "current";
  return "locked";
}

/** Adventure path labels (Reading Eggs–style worlds) — UI framing only. */
export const ADVENTURE_PATH: readonly {
  id: ReadingAcademyLevelId;
  name: string;
  emoji: string;
}[] = [
  { id: 1, name: "Learning Sounds", emoji: "👂" },
  { id: 2, name: "Building Words", emoji: "🧩" },
  { id: 3, name: "Reading Words", emoji: "📖" },
  { id: 4, name: "Reading Sentences", emoji: "✏️" },
  { id: 5, name: "Reading Stories", emoji: "📚" },
  { id: 6, name: "Reading Books", emoji: "📗" },
  { id: 7, name: "Reading Fluently", emoji: "🌟" },
] as const;

export function curriculumGroupBadge(letterGroupIndex: number): string {
  return getLetterGroup(letterGroupIndex).badge;
}

export function allWorldTreasureEmojis(): string[] {
  return LETTER_INTRODUCTION_GROUPS.map((g) => g.treasureEmoji);
}

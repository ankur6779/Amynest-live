import type { LevelId } from "./index.js";
import { chapterForLevel } from "./curriculum.js";
import { worldForLevel } from "./story-worlds.js";

export type BossDef = {
  id: string;
  level: LevelId;
  name: string;
  emoji: string;
  intro: string;
  challengeCount: number;
  rewardTitle: string;
};

export function bossForLevel(level: LevelId): BossDef {
  const chapter = chapterForLevel(level);
  const world = worldForLevel(level);
  const names: Record<LevelId, { name: string; emoji: string }> = {
    1: { name: "Forest Guardian", emoji: "🦊" },
    2: { name: "Ocean Kraken", emoji: "🦑" },
    3: { name: "Castle Knight", emoji: "🛡️" },
    4: { name: "Mountain Yeti", emoji: "🏔️" },
    5: { name: "Temple Sage", emoji: "🧙" },
    6: { name: "Space Comet", emoji: "☄️" },
    7: { name: "Galaxy Dragon", emoji: "🐉" },
  };
  const n = names[level];
  return {
    id: chapter.bossId,
    level,
    name: n.name,
    emoji: n.emoji,
    intro: `${n.emoji} The ${n.name} of ${world.title} appears! Use everything you've learned.`,
    challengeCount: 5,
    rewardTitle: `${world.title} Crest`,
  };
}

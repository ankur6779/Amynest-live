import type { LevelId } from "./index.js";
import type { MasteryState } from "./mastery.js";
import { masterySummary } from "./mastery.js";

/** Guided curriculum chapter — one per level, with clear next-step messaging. */
export type CurriculumChapter = {
  id: string;
  level: LevelId;
  title: string;
  skillFocus: string;
  worldId: string;
  estimatedMinutes: number;
  bossId: string;
};

export const CURRICULUM: readonly CurriculumChapter[] = [
  {
    id: "ch_numbers",
    level: 1,
    title: "Counting Beads",
    skillFocus: "Numbers 0–9 on one rod",
    worldId: "forest",
    estimatedMinutes: 25,
    bossId: "boss_forest_guardian",
  },
  {
    id: "ch_addition",
    level: 2,
    title: "Adding Friends",
    skillFocus: "Simple addition without carry",
    worldId: "ocean",
    estimatedMinutes: 30,
    bossId: "boss_ocean_kraken",
  },
  {
    id: "ch_subtraction",
    level: 3,
    title: "Taking Away",
    skillFocus: "Subtraction on one rod",
    worldId: "castle",
    estimatedMinutes: 30,
    bossId: "boss_castle_knight",
  },
  {
    id: "ch_multidigit",
    level: 4,
    title: "Big Numbers",
    skillFocus: "Multi-digit + carry",
    worldId: "mountain",
    estimatedMinutes: 40,
    bossId: "boss_mountain_yeti",
  },
  {
    id: "ch_mental",
    level: 5,
    title: "Mind Pictures",
    skillFocus: "Mental visualization",
    worldId: "temple",
    estimatedMinutes: 35,
    bossId: "boss_temple_sage",
  },
  {
    id: "ch_multiply",
    level: 6,
    title: "Groups of Beads",
    skillFocus: "Multiplication",
    worldId: "space",
    estimatedMinutes: 40,
    bossId: "boss_space_comet",
  },
  {
    id: "ch_divide",
    level: 7,
    title: "Fair Shares",
    skillFocus: "Division",
    worldId: "galaxy",
    estimatedMinutes: 40,
    bossId: "boss_galaxy_dragon",
  },
] as const;

export type JourneyNodeStatus = "locked" | "current" | "completed" | "boss_ready";

export type JourneyNode = {
  chapter: CurriculumChapter;
  status: JourneyNodeStatus;
  masteryPct: number;
};

export type LearningPathSnapshot = {
  currentLevel: LevelId;
  currentChapter: CurriculumChapter;
  nextChapter: CurriculumChapter | null;
  whatLearned: string;
  whatNext: string;
  estimatedCompletionMinutes: number;
  overallMasteryPct: number;
  nodes: JourneyNode[];
  pathPct: number;
};

export function chapterForLevel(level: LevelId): CurriculumChapter {
  return CURRICULUM.find((c) => c.level === level) ?? CURRICULUM[0]!;
}

export function buildLearningPath(input: {
  currentLevel: LevelId;
  completedLevels: readonly LevelId[];
  mastery?: MasteryState | null;
}): LearningPathSnapshot {
  const completed = new Set(input.completedLevels);
  const current = chapterForLevel(input.currentLevel);
  const next =
    CURRICULUM.find((c) => c.level === ((input.currentLevel + 1) as LevelId)) ?? null;
  const summary = input.mastery ? masterySummary(input.mastery) : null;
  const overallMasteryPct =
    summary?.averageScore ?? Math.round((completed.size / CURRICULUM.length) * 100);

  const nodes: JourneyNode[] = CURRICULUM.map((chapter) => {
    if (completed.has(chapter.level)) {
      return { chapter, status: "completed", masteryPct: 100 };
    }
    const unlocked =
      chapter.level === 1 || completed.has((chapter.level - 1) as LevelId);
    if (!unlocked) {
      return { chapter, status: "locked", masteryPct: 0 };
    }
    if (chapter.level === input.currentLevel) {
      return {
        chapter,
        status: "current",
        masteryPct: Math.min(95, Math.max(15, overallMasteryPct)),
      };
    }
    // Unlocked next chapter waiting after current is cleared → boss_ready cue
    if (chapter.level === ((input.currentLevel + 1) as LevelId)) {
      return { chapter, status: "boss_ready", masteryPct: 5 };
    }
    return { chapter, status: "locked", masteryPct: 0 };
  });

  const remaining = CURRICULUM.filter((c) => !completed.has(c.level));
  const estimatedCompletionMinutes = remaining.reduce((a, c) => a + c.estimatedMinutes, 0);
  const pathPct = Math.round((completed.size / CURRICULUM.length) * 100);

  return {
    currentLevel: input.currentLevel,
    currentChapter: current,
    nextChapter: next,
    whatLearned: completed.size
      ? `Cleared ${completed.size} chapter${completed.size === 1 ? "" : "s"} — now focusing on ${current.skillFocus}.`
      : `Starting with ${current.skillFocus}.`,
    whatNext: completed.has(input.currentLevel)
      ? next
        ? `Next: ${next.title} in the ${next.worldId} world.`
        : "Path complete — polish with Mental + Boss rematches!"
      : `Finish ${current.title}, then defeat the chapter Boss.`,
    estimatedCompletionMinutes,
    overallMasteryPct,
    nodes,
    pathPct,
  };
}

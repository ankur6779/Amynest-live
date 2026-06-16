/**
 * 150+ decodable stories — authored narratives, blends, CVCC, digraphs.
 * Levels 1–5 with full metadata for gating and parent reporting.
 */
import { DECODABLE_STORIES } from "@/lib/phonics-v2/content/decodable-stories";
import { getAllDigraphStories } from "./digraph-catalog";
import { getAuthoredStories } from "./authored-stories";
import { getBlendStories } from "./blend-catalog";
import { getCvccStories } from "./cvcc-catalog";
import { isBlendPathwayAvailable } from "./blend-catalog";
import { isCvccPathwayAvailable } from "./cvcc-catalog";
import { ensureCatalogLineUniqueness } from "./story-uniqueness";
import type { CurriculumLevel } from "@workspace/phonics-curriculum";

export type StoryLevel = 1 | 2 | 3 | 4 | 5;

/** Curriculum level + mastery required to unlock a catalog story tier. */
export const STORY_LEVEL_GATES: Record<
  StoryLevel,
  { requiredCurriculumLevel: CurriculumLevel; masteryMin: number }
> = {
  1: { requiredCurriculumLevel: 2, masteryMin: 10 },
  2: { requiredCurriculumLevel: 2, masteryMin: 20 },
  3: { requiredCurriculumLevel: 3, masteryMin: 40 },
  4: { requiredCurriculumLevel: 4, masteryMin: 60 },
  5: { requiredCurriculumLevel: 7, masteryMin: 65 },
};

export function storyMeetsCurriculumGate(
  story: DecodableStoryMeta,
  curriculumLevel: CurriculumLevel,
  masteryScoreAvg: number,
  masteredFamilies: string[],
): boolean {
  const gate = STORY_LEVEL_GATES[story.level];
  if (curriculumLevel < gate.requiredCurriculumLevel) return false;
  if (masteryScoreAvg < gate.masteryMin) return false;
  if (
    story.requiredFamilies.length > 0 &&
    gate.requiredCurriculumLevel >= 3
  ) {
    const familiesOk = story.requiredFamilies.every(
      (f) => masteredFamilies.includes(f) || masteryScoreAvg >= 50,
    );
    if (!familiesOk) return false;
  }
  return true;
}

export type DecodableStoryLine = {
  text: string;
  highlightWords: string[];
};

export type DecodableStoryMeta = {
  id: string;
  title: string;
  emoji: string;
  level: StoryLevel;
  requiredSounds: string[];
  requiredFamilies: string[];
  /** 1 (easiest) – 10 (hardest) */
  difficulty: number;
  /** Estimated read time in minutes */
  estimatedMinutes: number;
  lines: DecodableStoryLine[];
  comprehensionQuestion?: string;
};

function migrateV2Stories(): DecodableStoryMeta[] {
  return DECODABLE_STORIES.map((s) => ({
    id: s.id,
    title: s.title,
    emoji: s.emoji,
    level: (s.minLevel <= 2 ? 2 : s.minLevel <= 4 ? 3 : 5) as StoryLevel,
    requiredSounds: [],
    requiredFamilies: s.requiredFamilies,
    difficulty: s.minLevel,
    estimatedMinutes: Math.max(1, s.lines.length),
    lines: s.lines,
    comprehensionQuestion: s.comprehensionQuestion,
  }));
}

let _catalog: DecodableStoryMeta[] | null = null;

export function getDecodableStoryCatalog(): DecodableStoryMeta[] {
  if (_catalog) return _catalog;
  const generated = [
    ...migrateV2Stories(),
    ...getAuthoredStories(),
    ...getCvccStories(),
    ...getBlendStories(),
    ...getAllDigraphStories(),
  ];
  const seen = new Set<string>();
  const deduped = generated.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
  _catalog = ensureCatalogLineUniqueness(deduped);
  return _catalog;
}

export function getStoryCount(): number {
  return getDecodableStoryCatalog().length;
}

export function getStoryById(id: string): DecodableStoryMeta | undefined {
  return getDecodableStoryCatalog().find((s) => s.id === id);
}

export function getStoriesForLevel(level: StoryLevel): DecodableStoryMeta[] {
  return getDecodableStoryCatalog().filter((s) => s.level === level);
}

export function getUnlockedStoriesV3(opts: {
  masteredFamilies: string[];
  masteryScoreAvg: number;
  currentLevel?: number;
}): DecodableStoryMeta[] {
  const curriculumLevel = (opts.currentLevel ?? 1) as import("@workspace/phonics-curriculum").CurriculumLevel;
  const catalog = getDecodableStoryCatalog();
  return catalog.filter((s) => {
    if (s.id.startsWith("dig-")) {
      const digraphId = s.id.split("-")[1];
      const unlockMap: Record<string, number> = {
        sh: 65,
        ch: 65,
        th: 70,
        wh: 72,
        ck: 68,
        ng: 75,
      };
      return (
        curriculumLevel >= 4 &&
        opts.masteryScoreAvg >= (unlockMap[digraphId ?? ""] ?? 65)
      );
    }
    if (s.id.startsWith("blend-")) {
      return isBlendPathwayAvailable(opts.masteryScoreAvg, curriculumLevel);
    }
    if (s.id.startsWith("cvcc-")) {
      return isCvccPathwayAvailable(opts.masteryScoreAvg, curriculumLevel);
    }
    return storyMeetsCurriculumGate(
      s,
      curriculumLevel,
      opts.masteryScoreAvg,
      opts.masteredFamilies,
    );
  });
}

export function getDigraphStoriesForId(digraphId: string): DecodableStoryMeta[] {
  return getDecodableStoryCatalog().filter((s) => s.id.startsWith(`dig-${digraphId}-`));
}

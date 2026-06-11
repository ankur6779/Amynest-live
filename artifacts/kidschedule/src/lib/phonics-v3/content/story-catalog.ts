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

export type StoryLevel = 1 | 2 | 3 | 4 | 5;

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
}): DecodableStoryMeta[] {
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
      return opts.masteryScoreAvg >= (unlockMap[digraphId ?? ""] ?? 65);
    }
    if (s.id.startsWith("blend-")) {
      return isBlendPathwayAvailable(opts.masteryScoreAvg);
    }
    if (s.id.startsWith("cvcc-")) {
      return isCvccPathwayAvailable(opts.masteryScoreAvg);
    }
    if (s.level === 5 && s.id.startsWith("auth-")) {
      return opts.masteryScoreAvg >= 65;
    }
    if (s.id.startsWith("auth-")) {
      if (s.level === 1) return true;
      if (s.level === 2) return opts.masteryScoreAvg >= 15;
      if (s.level === 3) return opts.masteryScoreAvg >= 35;
      if (s.level === 4) return opts.masteryScoreAvg >= 55;
      return opts.masteryScoreAvg >= 70;
    }
    if (s.level === 1) return true;
    if (s.level === 2) return opts.masteryScoreAvg >= 20;
    if (s.level === 3) return opts.masteryScoreAvg >= 40;
    if (s.level === 4) return opts.masteryScoreAvg >= 60;
    const familiesOk = s.requiredFamilies.every(
      (f) => opts.masteredFamilies.includes(f) || opts.masteryScoreAvg >= 50,
    );
    return opts.masteryScoreAvg >= 70 && familiesOk;
  });
}

export function getDigraphStoriesForId(digraphId: string): DecodableStoryMeta[] {
  return getDecodableStoryCatalog().filter((s) => s.id.startsWith(`dig-${digraphId}-`));
}

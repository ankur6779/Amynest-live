import { dailyUnlockSeed } from "@workspace/learning-progress-engine";
import type {
  AgeBand,
  ContentBankCategory,
  ContentBankUnlockContext,
} from "./types.js";
import { validateLessonEligibility } from "./lesson-eligibility.js";

export const AGE_BANDS: AgeBand[] = ["2-4", "4-6", "6-8", "8-10", "10-12"];

export function ageBandFromChildAge(ageYears: number): AgeBand {
  if (ageYears <= 4) return "2-4";
  if (ageYears <= 6) return "4-6";
  if (ageYears <= 8) return "6-8";
  if (ageYears <= 10) return "8-10";
  return "10-12";
}

export function contentBankActivityId(
  category: ContentBankCategory,
  itemId: string,
): string {
  return `cb:${category}:${itemId}`;
}

export function parseContentBankActivityId(id: string): {
  category: ContentBankCategory;
  itemId: string;
} | null {
  const m = /^cb:(smart-study|life-skills|event-prep|math-progression):(.+)$/.exec(
    id,
  );
  if (!m) return null;
  return { category: m[1] as ContentBankCategory, itemId: m[2]! };
}

function passesAgeAndDifficulty(
  item: Record<string, unknown>,
  ctx: ContentBankUnlockContext,
): boolean {
  return validateLessonEligibility(ctx, item);
}

/** How many catalog items the child may access (progressive ceiling). */
export function unlockedCatalogLimit(
  category: ContentBankCategory,
  ctx: ContentBankUnlockContext,
  catalogSize: number,
): number {
  const completedInCategory = ctx.completedActivityIds.filter((id) =>
    id.startsWith(`cb:${category}:`),
  ).length;

  const baseByCategory: Record<ContentBankCategory, number> = {
    "smart-study": 8,
    "life-skills": 6,
    "event-prep": 4,
    "math-progression": 5,
  };

  const growth =
    ctx.learningLevel * 2 +
    Math.floor(ctx.masteryScore / 8) +
    Math.floor(ctx.journeyDay / 2) +
    Math.floor(completedInCategory / 2);

  return Math.min(catalogSize, baseByCategory[category] + growth);
}

export function filterUnlockedCatalog<T extends { id: string }>(
  category: ContentBankCategory,
  items: T[],
  ctx: ContentBankUnlockContext,
): T[] {
  const eligible = items.filter((item) =>
    passesAgeAndDifficulty(item as Record<string, unknown>, ctx),
  );
  const limit = unlockedCatalogLimit(category, ctx, eligible.length);
  return eligible.slice(0, limit);
}

function hashPick(seed: number, poolSize: number, count: number): number[] {
  const picks: number[] = [];
  for (let i = 0; i < count && picks.length < poolSize; i += 1) {
    const idx = (seed + i * 17) % poolSize;
    if (!picks.includes(idx)) picks.push(idx);
  }
  return picks;
}

/** Daily rotation: stable subset of unlocked catalog for the feed. */
export function pickDailyFeed<T extends { id: string }>(
  category: ContentBankCategory,
  items: T[],
  ctx: ContentBankUnlockContext,
  limit: number,
  offset = 0,
): ContentBankFeedSlice<T> {
  const unlocked = filterUnlockedCatalog(category, items, ctx);
  const seed = dailyUnlockSeed(ctx.dateIso, ctx.childId);
  const indices = hashPick(seed + category.length, unlocked.length, unlocked.length);
  const rotated = indices.map((i) => unlocked[i]!).filter(Boolean);
  const slice = rotated.slice(offset, offset + limit);
  return {
    items: slice,
    totalUnlocked: unlocked.length,
    totalEligible: items.length,
    offset,
    limit,
    hasMore: offset + limit < unlocked.length,
  };
}

export interface ContentBankFeedSlice<T> {
  items: T[];
  totalUnlocked: number;
  totalEligible: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export function isItemAccessible<T extends { id: string }>(
  category: ContentBankCategory,
  items: T[],
  itemId: string,
  ctx: ContentBankUnlockContext,
): boolean {
  const unlocked = filterUnlockedCatalog(category, items, ctx);
  return unlocked.some((x) => x.id === itemId);
}

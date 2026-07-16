/**
 * Client-side curriculum level filtering for phonics content tiles.
 */
import {
  clampCurriculumLevel,
  isContentUnlocked,
  migrateCurriculumLevel,
  type CurriculumLevel,
} from "@workspace/phonics-curriculum";
import type { DisplayPhonicsItem } from "@/hooks/use-phonics-data";
import { sanitizeDisplayPhonicsItems } from "@/lib/phonics-item-guards";

export function resolveCurriculumLevel(
  level: number | null | undefined,
  totalAgeMonths: number,
): CurriculumLevel {
  if (level != null && level > 0) {
    return migrateCurriculumLevel(level);
  }
  if (totalAgeMonths < 24) return 1;
  if (totalAgeMonths < 36) return 1;
  if (totalAgeMonths < 48) return 2;
  if (totalAgeMonths < 60) return 3;
  return 4;
}

export function filterItemsByCurriculumLevel(
  items: DisplayPhonicsItem[],
  currentLevel: CurriculumLevel,
): DisplayPhonicsItem[] {
  // currentLevel is already a CurriculumLevel in the 7-level scheme; do NOT run
  // the legacy 6→7 migration here or L6 users would see L7 sight words early.
  const safeLevel = clampCurriculumLevel(currentLevel);
  return sanitizeDisplayPhonicsItems(items).filter((item) =>
    isContentUnlocked(item.symbol, safeLevel, item.type),
  );
}

export function filterItemsUpToLevel(
  items: DisplayPhonicsItem[],
  currentLevel: CurriculumLevel,
): DisplayPhonicsItem[] {
  return filterItemsByCurriculumLevel(items, currentLevel);
}

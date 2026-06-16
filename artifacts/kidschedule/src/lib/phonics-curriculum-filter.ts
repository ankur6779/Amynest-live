/**
 * Client-side curriculum level filtering for phonics content tiles.
 */
import {
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
  const safeLevel = migrateCurriculumLevel(currentLevel);
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

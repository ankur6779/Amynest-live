import {
  getPlayCategoriesForChild,
  type PlayCategory,
} from "@workspace/study-zone";
import type { UnlockResult } from "./types";
import { filterAlphabetItems, filterNumberItems } from "./unlocks";

/**
 * Applies LearningProgressEngine unlocks on top of legacy journey-capped play categories.
 * Premium/mastery users get extended number/alphabet ranges beyond day 1–3 caps.
 */
export function applyUnlocksToPlayCategories(
  categories: PlayCategory[],
  unlocks: UnlockResult,
): PlayCategory[] {
  return categories.map((cat) => {
    if (cat.id === "numbers") {
      return {
        ...cat,
        items: filterNumberItems(cat.items, unlocks.numbersMax),
      };
    }
    if (cat.id === "alphabets") {
      return {
        ...cat,
        items: filterAlphabetItems(cat.items, unlocks.alphabetRange),
      };
    }
    if (cat.id === "shapes") {
      const filtered = cat.items.filter((i) => unlocks.unlockedShapes.includes(i.id));
      return {
        ...cat,
        items:
          filtered.length > 0
            ? filtered
            : cat.items.slice(0, unlocks.unlockedShapes.length),
      };
    }
    if (cat.id === "animals" || cat.id === "fruits") {
      return { ...cat, items: cat.items.slice(0, unlocks.unlockedAnimals) };
    }
    return cat;
  });
}

export function getPlayCategoriesWithProgress(
  country: string | null | undefined,
  ageYears: number | undefined,
  journeyDay: number,
  unlocks: UnlockResult,
): PlayCategory[] {
  const base = getPlayCategoriesForChild(country, ageYears, journeyDay);
  return applyUnlocksToPlayCategories(base, unlocks);
}

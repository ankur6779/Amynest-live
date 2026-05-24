import type { PlayCategory } from "../types";
import { PLAY_CATEGORIES } from "./play";

/** Letter → local word overrides for the alphabets play category. */
const PLAY_ALPHABET_OVERRIDES: Record<string, Record<string, { word: string; emoji: string }>> = {
  IN: {
    A: { word: "Alphonso", emoji: "🥭" },
    D: { word: "Dosa", emoji: "🫓" },
    R: { word: "Rupee", emoji: "₹" },
    T: { word: "Tiger", emoji: "🐯" },
  },
  US: {
    A: { word: "Apple", emoji: "🍎" },
    B: { word: "Baseball", emoji: "⚾" },
    E: { word: "Eagle", emoji: "🦅" },
    L: { word: "Liberty", emoji: "🗽" },
  },
  AE: {
    A: { word: "Arab", emoji: "🕌" },
    D: { word: "Date", emoji: "🌴" },
    F: { word: "Falcon", emoji: "🦅" },
    M: { word: "Mall", emoji: "🛍️" },
  },
  UK: {
    A: { word: "Apple", emoji: "🍎" },
    B: { word: "Big Ben", emoji: "🕰️" },
    Q: { word: "Queen", emoji: "👑" },
    T: { word: "Tea", emoji: "🍵" },
  },
};

export function patchPlayCategoriesForCountry(
  categories: PlayCategory[],
  country: string,
): PlayCategory[] {
  const overrides = PLAY_ALPHABET_OVERRIDES[country];
  if (!overrides) return categories;
  return categories.map((cat) => {
    if (cat.id !== "alphabets") return cat;
    return {
      ...cat,
      items: cat.items.map((item) => {
        const o = overrides[item.id];
        if (!o) return item;
        return {
          ...item,
          speak: `${item.label} for ${o.word}`,
          emoji: o.emoji,
        };
      }),
    };
  });
}

export function getPlayCategoriesForCountry(country: string): PlayCategory[] {
  return patchPlayCategoriesForCountry(PLAY_CATEGORIES, country);
}

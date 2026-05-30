import type {
  SpellingAgeGroup,
  SpellingCatalogEntry,
  SpellingDifficulty,
  SpellingManifest,
  SpellingWord,
} from "./types.js";
import { catalogEntryToWord, bucketKey } from "./types.js";
import { SPELLING_MANIFEST } from "../data/index.js";

export function getSpellingManifest(): SpellingManifest {
  return SPELLING_MANIFEST;
}

export function getBucketEntries(
  ageGroup: SpellingAgeGroup,
  difficulty: SpellingDifficulty,
): SpellingCatalogEntry[] {
  return SPELLING_MANIFEST.buckets[bucketKey(ageGroup, difficulty)] ?? [];
}

export function getBucketWordCount(
  ageGroup: SpellingAgeGroup,
  difficulty: SpellingDifficulty,
): number {
  return getBucketEntries(ageGroup, difficulty).length;
}

/** All entries flattened (legacy static-audio / server sampling). */
export function getAllCatalogEntries(): SpellingCatalogEntry[] {
  return Object.values(SPELLING_MANIFEST.buckets).flat();
}

export function getAllCatalogWords(): SpellingWord[] {
  return getAllCatalogEntries().map(catalogEntryToWord);
}

export function spellingAgeGroupFor(ageMonths: number): SpellingAgeGroup {
  if (ageMonths < 48) return "2-4";
  if (ageMonths < 72) return "4-6";
  if (ageMonths < 96) return "6-8";
  return "8-10+";
}

export const SPELLING_AGE_GROUPS = ["2-4", "4-6", "6-8", "8-10+"] as const;

/** @deprecated Use getAllCatalogWords — kept for static-audio compatibility. */
export const SPELLING_WORDS = getAllCatalogWords();

export function getSpellingWordsByAge(
  ageGroup: SpellingAgeGroup,
  difficulty?: SpellingDifficulty,
): SpellingWord[] {
  if (difficulty) {
    return getBucketEntries(ageGroup, difficulty).map(catalogEntryToWord);
  }
  return SPELLING_AGE_GROUPS.flatMap((age) =>
    age === ageGroup
      ? (["easy", "medium", "hard"] as const).flatMap((d) =>
          getBucketEntries(ageGroup, d).map(catalogEntryToWord),
        )
      : [],
  );
}

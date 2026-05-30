export type SpellingAgeGroup = "2-4" | "4-6" | "6-8" | "8-10+";
export type SpellingDifficulty = "easy" | "medium" | "hard";
export type SpellingSource = "catalog" | "ai";

/** Full pre-generated catalog entry (static manifest). */
export interface SpellingCatalogEntry {
  id: string;
  word: string;
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  meaning: string;
  syllables: string[];
  sounds: string[];
  sentence: string;
  phonicsTags: string[];
  /** Player level (1–50+) required to unlock this word. */
  masteryLevel: number;
}

/** UI / legacy shape — `hint` = meaning, `chunks` = sounds. */
export interface SpellingWord {
  id: string;
  word: string;
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  syllables: string[];
  chunks: string[];
  hint: string;
  sentence?: string;
  phonicsTags?: string[];
  masteryLevel?: number;
}

export type SpellingBucketKey = `${SpellingAgeGroup}:${SpellingDifficulty}`;

export interface SpellingManifestMeta {
  version: number;
  generatedAt: string;
  bucketCounts: Record<SpellingBucketKey, number>;
}

export interface SpellingManifest {
  meta: SpellingManifestMeta;
  buckets: Record<SpellingBucketKey, SpellingCatalogEntry[]>;
}

export interface SessionHistoryState {
  seenIds: string[];
  recentCompletedIds: string[];
  lastSessionIds: string[];
}

export interface SelectSessionWordsOptions {
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  playerLevel: number;
  count?: number;
  history: SessionHistoryState;
  excludeIds?: string[];
}

export interface SelectSessionWordsResult {
  words: SpellingWord[];
  history: SessionHistoryState;
}

export function bucketKey(
  ageGroup: SpellingAgeGroup,
  difficulty: SpellingDifficulty,
): SpellingBucketKey {
  return `${ageGroup}:${difficulty}`;
}

export function catalogEntryToWord(entry: SpellingCatalogEntry): SpellingWord {
  return {
    id: entry.id,
    word: entry.word,
    ageGroup: entry.ageGroup,
    difficulty: entry.difficulty,
    syllables: entry.syllables,
    chunks: entry.sounds,
    hint: entry.meaning,
    sentence: entry.sentence,
    phonicsTags: entry.phonicsTags,
    masteryLevel: entry.masteryLevel,
  };
}

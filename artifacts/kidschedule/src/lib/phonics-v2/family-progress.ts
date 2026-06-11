import type { WordFamilyId, WordFamilyStatus } from "./content/word-families";
import { WORD_FAMILIES } from "./content/word-families";

export type FamilyProgressEntry = {
  status: WordFamilyStatus;
  wordsPracticed: string[];
  wordsMastered: string[];
  badgeEarned: boolean;
  lastPracticedAt?: number;
};

export type PhonicsV2FamilyProgress = Record<WordFamilyId, FamilyProgressEntry>;

const STORAGE_PREFIX = "amynest:phonics-v2-families:";

function defaultEntry(): FamilyProgressEntry {
  return {
    status: "not_started",
    wordsPracticed: [],
    wordsMastered: [],
    badgeEarned: false,
  };
}

export function defaultFamilyProgress(): PhonicsV2FamilyProgress {
  const out = {} as PhonicsV2FamilyProgress;
  for (const f of WORD_FAMILIES) {
    out[f.id] = defaultEntry();
  }
  return out;
}

export function loadFamilyProgress(childId: number): PhonicsV2FamilyProgress {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultFamilyProgress();
    const parsed = JSON.parse(raw) as Partial<PhonicsV2FamilyProgress>;
    return { ...defaultFamilyProgress(), ...parsed };
  } catch {
    return defaultFamilyProgress();
  }
}

export function saveFamilyProgress(
  childId: number,
  progress: PhonicsV2FamilyProgress,
): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(progress));
  } catch {
    /* quota */
  }
}

export function recordFamilyWordPractice(
  progress: PhonicsV2FamilyProgress,
  familyId: WordFamilyId,
  word: string,
  mastered = false,
): PhonicsV2FamilyProgress {
  const family = WORD_FAMILIES.find((f) => f.id === familyId);
  if (!family) return progress;

  const entry = { ...progress[familyId] };
  const w = word.trim().toLowerCase();

  if (!entry.wordsPracticed.includes(w)) {
    entry.wordsPracticed = [...entry.wordsPracticed, w];
  }
  if (mastered && !entry.wordsMastered.includes(w)) {
    entry.wordsMastered = [...entry.wordsMastered, w];
  }

  const allMastered = family.words.every((fw) =>
    entry.wordsMastered.includes(fw.word.toLowerCase()),
  );
  const anyPractice = entry.wordsPracticed.length > 0;

  entry.status = allMastered
    ? "mastered"
    : anyPractice
      ? "practicing"
      : "not_started";
  entry.badgeEarned = allMastered;
  entry.lastPracticedAt = Date.now();

  return { ...progress, [familyId]: entry };
}

export function countMasteredFamilies(progress: PhonicsV2FamilyProgress): number {
  return WORD_FAMILIES.filter((f) => progress[f.id]?.status === "mastered").length;
}

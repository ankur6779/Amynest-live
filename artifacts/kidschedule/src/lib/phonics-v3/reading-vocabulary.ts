/**
 * Vocabulary growth — track story words with spaced review.
 */
import type { DecodableBookVocab } from "./decodable-books";

export type VocabCard = DecodableBookVocab & {
  bookId: string;
  introducedAt: number;
  reviews: number;
  lastReviewAt: number;
  strength: number; // 0–100
};

export type VocabularyState = {
  version: 1;
  cards: Record<string, VocabCard>;
};

const STORAGE_PREFIX = "amynest:phonics-academy-vocab:";

export function defaultVocabularyState(): VocabularyState {
  return { version: 1, cards: {} };
}

export function loadVocabularyState(childId: number): VocabularyState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultVocabularyState();
    return { ...defaultVocabularyState(), ...JSON.parse(raw) };
  } catch {
    return defaultVocabularyState();
  }
}

export function saveVocabularyState(childId: number, state: VocabularyState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function introduceBookVocabulary(
  state: VocabularyState,
  bookId: string,
  words: DecodableBookVocab[],
): VocabularyState {
  const cards = { ...state.cards };
  const now = Date.now();
  for (const w of words.slice(0, 3)) {
    const key = w.word.toLowerCase();
    if (cards[key]) continue;
    cards[key] = {
      ...w,
      word: key,
      bookId,
      introducedAt: now,
      reviews: 0,
      lastReviewAt: 0,
      strength: 20,
    };
  }
  return { version: 1, cards };
}

export function reviewVocabularyWord(
  state: VocabularyState,
  word: string,
  remembered: boolean,
): VocabularyState {
  const key = word.toLowerCase();
  const card = state.cards[key];
  if (!card) return state;
  const strength = Math.max(
    0,
    Math.min(100, card.strength + (remembered ? 18 : -12)),
  );
  return {
    version: 1,
    cards: {
      ...state.cards,
      [key]: {
        ...card,
        reviews: card.reviews + 1,
        lastReviewAt: Date.now(),
        strength,
      },
    },
  };
}

/** Words due for light review (weak or not seen in 2+ days). */
export function getVocabularyDueForReview(
  state: VocabularyState,
  limit = 3,
  now = Date.now(),
): VocabCard[] {
  const twoDays = 2 * 24 * 60 * 60 * 1000;
  return Object.values(state.cards)
    .filter(
      (c) =>
        c.strength < 70 ||
        c.lastReviewAt === 0 ||
        now - c.lastReviewAt > twoDays,
    )
    .sort((a, b) => a.strength - b.strength)
    .slice(0, limit);
}

export function vocabularyGrowthStats(state: VocabularyState): {
  total: number;
  strong: number;
  learning: number;
} {
  const all = Object.values(state.cards);
  return {
    total: all.length,
    strong: all.filter((c) => c.strength >= 70).length,
    learning: all.filter((c) => c.strength < 70).length,
  };
}

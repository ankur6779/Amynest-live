/**
 * Persisted Reading Academy progress — books, comprehension, sentences.
 */
export type ReadingAcademyProgress = {
  version: 1;
  completedBookIds: string[];
  bookCompletedAt: Record<string, number>;
  comprehensionScores: number[];
  sentencesRead: number;
  lastBookId: string | null;
};

const STORAGE_PREFIX = "amynest:phonics-academy-progress:";

export function defaultAcademyProgress(): ReadingAcademyProgress {
  return {
    version: 1,
    completedBookIds: [],
    bookCompletedAt: {},
    comprehensionScores: [],
    sentencesRead: 0,
    lastBookId: null,
  };
}

export function loadAcademyProgress(childId: number): ReadingAcademyProgress {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultAcademyProgress();
    return { ...defaultAcademyProgress(), ...JSON.parse(raw) };
  } catch {
    return defaultAcademyProgress();
  }
}

export function saveAcademyProgress(
  childId: number,
  state: ReadingAcademyProgress,
): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function markBookComplete(
  state: ReadingAcademyProgress,
  bookId: string,
  pageCount: number,
  comprehensionScorePct?: number,
): ReadingAcademyProgress {
  const completedBookIds = state.completedBookIds.includes(bookId)
    ? state.completedBookIds
    : [...state.completedBookIds, bookId];
  const comprehensionScores =
    comprehensionScorePct == null
      ? state.comprehensionScores
      : [...state.comprehensionScores, comprehensionScorePct].slice(-20);
  return {
    ...state,
    completedBookIds,
    bookCompletedAt: {
      ...state.bookCompletedAt,
      [bookId]: Date.now(),
    },
    comprehensionScores,
    sentencesRead: state.sentencesRead + Math.max(1, pageCount),
    lastBookId: bookId,
  };
}

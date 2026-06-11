export type PronunciationOutcome = "correct" | "almost" | "retry";

export type PronunciationScoreEntry = {
  word: string;
  outcome: PronunciationOutcome;
  confidence: number;
  recordedAt: number;
};

export type PhonicsV2PronunciationScores = {
  entries: PronunciationScoreEntry[];
  /** Rolling average 0–100 */
  confidenceAvg: number;
};

const STORAGE_PREFIX = "amynest:phonics-v2-pronunciation:";
const MAX_ENTRIES = 50;

export function defaultPronunciationScores(): PhonicsV2PronunciationScores {
  return { entries: [], confidenceAvg: 0 };
}

export function loadPronunciationScores(childId: number): PhonicsV2PronunciationScores {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultPronunciationScores();
    return { ...defaultPronunciationScores(), ...JSON.parse(raw) };
  } catch {
    return defaultPronunciationScores();
  }
}

export function savePronunciationScores(
  childId: number,
  scores: PhonicsV2PronunciationScores,
): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(scores));
  } catch {
    /* quota */
  }
}

export function recordPronunciationScore(
  scores: PhonicsV2PronunciationScores,
  entry: Omit<PronunciationScoreEntry, "recordedAt">,
): PhonicsV2PronunciationScores {
  const full: PronunciationScoreEntry = { ...entry, recordedAt: Date.now() };
  const entries = [full, ...scores.entries].slice(0, MAX_ENTRIES);
  const confidenceAvg =
    entries.length > 0
      ? Math.round(
          entries.reduce((s, e) => s + e.confidence, 0) / entries.length,
        )
      : 0;
  return { entries, confidenceAvg };
}

export function outcomeFromCoachScore(
  correct: boolean,
  score: number,
): PronunciationOutcome {
  if (correct || score >= 0.82) return "correct";
  if (score >= 0.55) return "almost";
  return "retry";
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSpellingManifest,
  getBucketWordCount,
  selectSessionWords,
  markSessionCompleted,
  loadSessionHistory,
  saveSessionHistory,
  historyStorageKey,
  type SpellingAgeGroup,
  type SpellingDifficulty,
  type SpellingWord,
  type SessionHistoryState,
} from "@workspace/spelling-catalog";

const SESSION_COUNT = 5;

export type SpellingSource = "catalog" | "ai";

const memoryHistory = new Map<string, SessionHistoryState>();

export interface UseSpellingCatalogSessionOptions {
  childId: number;
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  playerLevel?: number;
  sessionCount?: number;
}

export interface UseSpellingCatalogSessionState {
  words: SpellingWord[];
  loading: false;
  error: string | null;
  source: SpellingSource;
  bucketSize: number;
  refresh: (opts?: { count?: number }) => SpellingWord[];
  generateWithAI: (difficulty?: SpellingDifficulty, count?: number) => Promise<SpellingWord[]>;
  markCompleted: () => void;
}

function loadHistory(key: string): SessionHistoryState {
  try {
    return loadSessionHistory(key);
  } catch {
    return memoryHistory.get(key) ?? { seenIds: [], recentCompletedIds: [], lastSessionIds: [] };
  }
}

function saveHistory(key: string, history: SessionHistoryState): void {
  memoryHistory.set(key, history);
  try {
    saveSessionHistory(key, history);
  } catch {
    /* localStorage unavailable */
  }
}

export function useSpellingCatalogSession(
  opts: UseSpellingCatalogSessionOptions,
): UseSpellingCatalogSessionState {
  const { childId, ageGroup, difficulty, sessionCount = SESSION_COUNT } = opts;
  const playerLevel = opts.playerLevel ?? 50;

  const historyKey = historyStorageKey(childId, ageGroup, difficulty);
  const historyRef = useRef<SessionHistoryState>(loadHistory(historyKey));
  const manifest = useMemo(() => getSpellingManifest(), []);

  const pickSession = useCallback(
    (count: number, excludeIds?: string[]) => {
      const result = selectSessionWords(manifest, {
        ageGroup,
        difficulty,
        playerLevel,
        count,
        history: historyRef.current,
        excludeIds,
      });
      historyRef.current = result.history;
      saveHistory(historyKey, result.history);
      return result.words;
    },
    [manifest, ageGroup, difficulty, playerLevel, historyKey],
  );

  const [words, setWords] = useState<SpellingWord[]>(() => pickSession(sessionCount));

  useEffect(() => {
    historyRef.current = loadHistory(historyKey);
    setWords(pickSession(sessionCount));
  }, [historyKey, pickSession, sessionCount]);

  const refresh = useCallback(
    (refreshOpts?: { count?: number }) => {
      const count = refreshOpts?.count ?? sessionCount;
      const next = pickSession(count, words.map((w) => w.id));
      setWords(next.length > 0 ? next : pickSession(count));
      return next.length > 0 ? next : pickSession(count);
    },
    [pickSession, sessionCount, words],
  );

  const markCompleted = useCallback(() => {
    historyRef.current = markSessionCompleted(
      historyRef.current,
      words.map((w) => w.id),
    );
    saveHistory(historyKey, historyRef.current);
  }, [words, historyKey]);

  const generateWithAI = useCallback(async (): Promise<SpellingWord[]> => [], []);

  return {
    words,
    loading: false,
    error: null,
    source: "catalog",
    bucketSize: getBucketWordCount(ageGroup, difficulty),
    refresh,
    generateWithAI,
    markCompleted,
  };
}

export { levelFromStars } from "@workspace/spelling-catalog";

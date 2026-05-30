import { filterByPlayerLevel } from "./progression.js";
import {
  bucketKey,
  catalogEntryToWord,
  type SelectSessionWordsOptions,
  type SelectSessionWordsResult,
  type SessionHistoryState,
  type SpellingManifest,
  type SpellingWord,
} from "./types.js";

const MAX_SEEN = 500;
const MAX_RECENT = 20;
const DEFAULT_COUNT = 5;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function sampleFromPool(
  pool: ReturnType<typeof catalogEntryToWord>[],
  count: number,
  exclude: Set<string>,
): SpellingWord[] {
  const available = shuffle(pool.filter((w) => !exclude.has(w.id)));
  if (available.length >= count) return available.slice(0, count);
  const remaining = shuffle(pool.filter((w) => !available.some((a) => a.id === w.id)));
  return [...available, ...remaining].slice(0, count);
}

export function emptySessionHistory(): SessionHistoryState {
  return { seenIds: [], recentCompletedIds: [], lastSessionIds: [] };
}

export function selectSessionWords(
  manifest: SpellingManifest,
  opts: SelectSessionWordsOptions,
): SelectSessionWordsResult {
  const count = opts.count ?? DEFAULT_COUNT;
  const key = bucketKey(opts.ageGroup, opts.difficulty);
  const bucket = manifest.buckets[key] ?? [];
  const unlocked = filterByPlayerLevel(bucket, opts.playerLevel);
  const pool = unlocked.map(catalogEntryToWord);

  if (pool.length === 0) {
    return { words: [], history: opts.history };
  }

  const exclude = new Set<string>([
    ...(opts.excludeIds ?? []),
    ...opts.history.recentCompletedIds,
    ...opts.history.lastSessionIds,
  ]);

  let words = sampleFromPool(pool, count, exclude);

  // Guarantee unique words within a session.
  const seen = new Set<string>();
  words = words.filter((w) => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
  if (words.length < count) {
    for (const w of shuffle(pool)) {
      if (words.length >= count) break;
      if (!seen.has(w.id) && !exclude.has(w.id)) {
        seen.add(w.id);
        words.push(w);
      }
    }
  }

  if (words.length < count) {
    exclude.clear();
    for (const id of opts.history.recentCompletedIds) exclude.add(id);
    for (const id of opts.excludeIds ?? []) exclude.add(id);
    words = sampleFromPool(pool, count, exclude);
  }

  if (words.length < count) {
    words = sampleFromPool(pool, count, new Set(opts.excludeIds ?? []));
  }

  if (words.length < count && pool.length >= count) {
    words = shuffle(pool).slice(0, count);
  }

  const seenIds = [...new Set([...opts.history.seenIds, ...words.map((w) => w.id)])].slice(
    -MAX_SEEN,
  );
  const lastSessionIds = words.map((w) => w.id);

  return {
    words,
    history: { seenIds, recentCompletedIds: opts.history.recentCompletedIds, lastSessionIds },
  };
}

/** Mark current session words as completed (call after learn session finishes). */
export function markSessionCompleted(
  history: SessionHistoryState,
  sessionWordIds: string[],
): SessionHistoryState {
  return {
    ...history,
    recentCompletedIds: [
      ...new Set([...history.recentCompletedIds, ...sessionWordIds]),
    ].slice(-MAX_RECENT),
    lastSessionIds: [],
  };
}

export function historyStorageKey(
  childId: number,
  ageGroup: string,
  difficulty: string,
): string {
  return `amynest:spelling:history:${childId}:${ageGroup}:${difficulty}`;
}

export function loadSessionHistory(key: string): SessionHistoryState {
  if (typeof localStorage === "undefined") return emptySessionHistory();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return emptySessionHistory();
    const parsed = JSON.parse(raw) as SessionHistoryState;
    return {
      seenIds: parsed.seenIds ?? [],
      recentCompletedIds: parsed.recentCompletedIds ?? [],
      lastSessionIds: parsed.lastSessionIds ?? [],
    };
  } catch {
    return emptySessionHistory();
  }
}

export function saveSessionHistory(key: string, history: SessionHistoryState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(history));
  } catch {
    /* quota */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — weak-sound aggregation from practice history
// ─────────────────────────────────────────────────────────────────────────────

import { PRONUNCIATION_PROMPTS } from "./content";

const PROMPT_TEXT = new Map(
  PRONUNCIATION_PROMPTS.map((p) => [p.id, p.text] as const),
);

export interface PracticeAttemptRow {
  promptId: string;
  clarityScore: number | null;
}

export interface WeakSoundEntry {
  promptId: string;
  promptText: string;
  avgScore: number;
  attempts: number;
}

export interface DailyTrendEntry {
  date: string;
  attempts: number;
  clearCount: number;
  avgScore: number;
}

const CLEAR_THRESHOLD = 70;

/** Aggregate per-prompt averages; return lowest-scoring prompts first. */
export function aggregateWeakSounds(
  attempts: readonly PracticeAttemptRow[],
  limit = 6,
): WeakSoundEntry[] {
  const byPrompt = new Map<string, { sum: number; count: number }>();
  for (const a of attempts) {
    const score = a.clarityScore;
    if (score == null || !Number.isFinite(score)) continue;
    const cur = byPrompt.get(a.promptId) ?? { sum: 0, count: 0 };
    cur.sum += score;
    cur.count += 1;
    byPrompt.set(a.promptId, cur);
  }

  const rows: WeakSoundEntry[] = [];
  for (const [promptId, { sum, count }] of byPrompt) {
    if (count < 1) continue;
    rows.push({
      promptId,
      promptText: PROMPT_TEXT.get(promptId) ?? promptId,
      avgScore: Math.round(sum / count),
      attempts: count,
    });
  }

  rows.sort((a, b) => a.avgScore - b.avgScore || b.attempts - a.attempts);
  return rows.slice(0, Math.max(0, limit));
}

/** Build seven daily buckets (Mon–Sun of current week window). */
export function aggregateDailyTrend(
  attempts: readonly { attemptedAt: Date; clarityScore: number | null }[],
  rangeStart: Date,
): DailyTrendEntry[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const buckets: DailyTrendEntry[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(rangeStart.getTime() + i * dayMs);
    const key = d.toISOString().slice(0, 10);
    buckets.push({ date: key, attempts: 0, clearCount: 0, avgScore: 0 });
  }

  const indexByDate = new Map(buckets.map((b, i) => [b.date, i] as const));
  const sums = new Array<number>(7).fill(0);
  const scored = new Array<number>(7).fill(0);

  for (const a of attempts) {
    const key = a.attemptedAt.toISOString().slice(0, 10);
    const idx = indexByDate.get(key);
    if (idx === undefined) continue;
    const b = buckets[idx]!;
    b.attempts += 1;
    const score = a.clarityScore ?? 0;
    if (score >= CLEAR_THRESHOLD) b.clearCount += 1;
    if (a.clarityScore != null && Number.isFinite(a.clarityScore)) {
      sums[idx] = (sums[idx] ?? 0) + a.clarityScore;
      scored[idx] = (scored[idx] ?? 0) + 1;
    }
  }

  for (let i = 0; i < 7; i++) {
    const n = scored[i] ?? 0;
    buckets[i]!.avgScore = n > 0 ? Math.round((sums[i] ?? 0) / n) : 0;
  }

  return buckets;
}

/** Convert raw log rows into adaptive history input. */
export function historyFromAttempts(
  attempts: readonly PracticeAttemptRow[],
): { promptId: string; bestScore: number; attempts: number }[] {
  const map = new Map<string, { best: number; count: number }>();
  for (const a of attempts) {
    const score = a.clarityScore;
    if (score == null || !Number.isFinite(score)) continue;
    const cur = map.get(a.promptId) ?? { best: 0, count: 0 };
    cur.best = Math.max(cur.best, score);
    cur.count += 1;
    map.set(a.promptId, cur);
  }
  return [...map.entries()].map(([promptId, v]) => ({
    promptId,
    bestScore: v.best,
    attempts: v.count,
  }));
}

import type { MathTrick } from "./types.js";

export type TrickMastery = {
  correct: number;
  attempts: number;
};

/** Lower score = higher priority (needs more practice). */
export function trickPracticePriority(
  trickId: string,
  mastery: Record<string, TrickMastery>,
  starIds: string[],
): number {
  if (starIds.includes(trickId)) return 1000;
  const m = mastery[trickId];
  if (!m || m.attempts === 0) return 0;
  const rate = m.correct / m.attempts;
  return Math.round((1 - rate) * 100 + m.attempts * 2);
}

export function pickTricksSpaced(
  pool: MathTrick[],
  count: number,
  seed: number,
  mastery: Record<string, TrickMastery>,
  starIds: string[],
  excludeIds: string[] = [],
): MathTrick[] {
  const candidates = pool.filter((t) => !excludeIds.includes(t.id));
  if (candidates.length <= count) return candidates;

  const sorted = [...candidates].sort((a, b) => {
    const pa = trickPracticePriority(a.id, mastery, starIds);
    const pb = trickPracticePriority(b.id, mastery, starIds);
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });

  const needPractice = sorted.filter((t) => trickPracticePriority(t.id, mastery, starIds) < 500);
  const src = needPractice.length >= count ? needPractice : sorted;

  const shuffled = [...src];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, count);
}

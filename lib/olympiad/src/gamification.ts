import type { OlympiadSubject } from "./types.js";

export interface OlympiadRankTier {
  id: string;
  label: string;
  emoji: string;
  minPoints: number;
}

export const OLYMPIAD_RANK_TIERS: OlympiadRankTier[] = [
  { id: "bronze", label: "Bronze", emoji: "🥉", minPoints: 0 },
  { id: "silver", label: "Silver", emoji: "🥈", minPoints: 100 },
  { id: "gold", label: "Gold", emoji: "🥇", minPoints: 500 },
  { id: "champion", label: "Champion", emoji: "👑", minPoints: 1000 },
];

export function olympiadRankForPoints(totalPoints: number): OlympiadRankTier {
  let tier = OLYMPIAD_RANK_TIERS[0]!;
  for (const t of OLYMPIAD_RANK_TIERS) {
    if (totalPoints >= t.minPoints) tier = t;
  }
  return tier;
}

export function nextRankProgress(totalPoints: number): {
  current: OlympiadRankTier;
  next: OlympiadRankTier | null;
  progressPct: number;
  pointsToNext: number;
} {
  const current = olympiadRankForPoints(totalPoints);
  const idx = OLYMPIAD_RANK_TIERS.findIndex((t) => t.id === current.id);
  const next = OLYMPIAD_RANK_TIERS[idx + 1] ?? null;
  if (!next) {
    return { current, next: null, progressPct: 100, pointsToNext: 0 };
  }
  const span = next.minPoints - current.minPoints;
  const earned = totalPoints - current.minPoints;
  const progressPct = span <= 0 ? 100 : Math.min(100, Math.round((earned / span) * 100));
  return {
    current,
    next,
    progressPct,
    pointsToNext: Math.max(0, next.minPoints - totalPoints),
  };
}

export function subjectMasteryPct(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/** Badge thresholds aligned with olympiad-zone BADGES. */
export const SUBJECT_MASTERY_GOAL = 50;

export function subjectMasteryRingPct(correct: number): number {
  return Math.min(100, Math.round((correct / SUBJECT_MASTERY_GOAL) * 100));
}

export function subjectMasteryRemaining(correct: number): number {
  return Math.max(0, SUBJECT_MASTERY_GOAL - correct);
}

export function weakestSubjects(
  bySubject: Record<OlympiadSubject, { correct: number; total: number }>,
  minAttempts = 3,
): OlympiadSubject[] {
  const entries = (Object.entries(bySubject) as [OlympiadSubject, { correct: number; total: number }][])
    .filter(([, v]) => v.total >= minAttempts)
    .map(([s, v]) => ({ s, acc: v.correct / v.total }))
    .sort((a, b) => a.acc - b.acc);
  return entries.slice(0, 2).map((e) => e.s);
}

import type { InterventionLedgerEntry } from "./types.js";

/** Estimate how long intervention effects persist (days until delta halves). */
export function estimateOutcomeHalfLife(
  validations: InterventionLedgerEntry[],
  interventionKey: string,
): number | null {
  const related = validations
    .filter((v) => v.recommendationKey === interventionKey && v.validatedAt && v.metricDeltas)
    .sort((a, b) => (a.validatedAt ?? "").localeCompare(b.validatedAt ?? ""));

  if (related.length < 2) return related[0]?.halfLifeDays ?? 14;

  const gaps: number[] = [];
  for (let i = 1; i < related.length; i++) {
    const prev = related[i - 1]!;
    const curr = related[i]!;
    const prevImpact = Math.abs(
      (prev.metricDeltas?.routineCompletionRate7d ?? 0) +
        (prev.metricDeltas?.learningSuccess7d ?? 0),
    );
    const currImpact = Math.abs(
      (curr.metricDeltas?.routineCompletionRate7d ?? 0) +
        (curr.metricDeltas?.learningSuccess7d ?? 0),
    );
    if (prevImpact > 0 && currImpact < prevImpact * 0.6) {
      const days = daysBetween(new Date(prev.validatedAt!), new Date(curr.validatedAt!));
      if (days > 0) gaps.push(days);
    }
  }

  if (gaps.length === 0) return 14;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

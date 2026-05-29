/** Privacy-safe cohort comparison using percentile buckets (no raw peer data). */
export interface CohortBenchmarkInput {
  routineCompletionRate7d: number;
  learningSuccess7d: number;
  accountAgeDays: number;
  childCount: number;
}

export interface GlobalBenchmarkResult {
  routinePercentile: number;
  learningPercentile: number;
  cohortLabel: string;
}

/** Static cohort curves — production would load aggregated anonymized stats. */
const ROUTINE_COHORT_CURVES: Array<{ ageDays: number; p25: number; p50: number; p75: number }> = [
  { ageDays: 30, p25: 35, p50: 50, p75: 65 },
  { ageDays: 90, p25: 45, p50: 58, p75: 72 },
  { ageDays: 180, p25: 50, p50: 62, p75: 78 },
  { ageDays: 365, p25: 55, p50: 68, p75: 82 },
];

const LEARNING_COHORT_CURVES: Array<{ ageDays: number; p25: number; p50: number; p75: number }> = [
  { ageDays: 30, p25: 20, p50: 35, p75: 55 },
  { ageDays: 90, p25: 30, p50: 45, p75: 65 },
  { ageDays: 180, p25: 35, p50: 52, p75: 72 },
  { ageDays: 365, p25: 40, p50: 58, p75: 78 },
];

export function computeGlobalBenchmarks(input: CohortBenchmarkInput): GlobalBenchmarkResult {
  const curve = pickCurve(ROUTINE_COHORT_CURVES, input.accountAgeDays);
  const learningCurve = pickCurve(LEARNING_COHORT_CURVES, input.accountAgeDays);

  const routinePercentile = valueToPercentile(input.routineCompletionRate7d, curve);
  const learningPercentile = valueToPercentile(input.learningSuccess7d, learningCurve);

  const cohortLabel =
    input.accountAgeDays < 60
      ? "families in first 2 months"
      : input.accountAgeDays < 180
        ? "families 2–6 months in"
        : "established families";

  return {
    routinePercentile,
    learningPercentile,
    cohortLabel,
  };
}

function pickCurve(
  curves: Array<{ ageDays: number; p25: number; p50: number; p75: number }>,
  ageDays: number,
): { p25: number; p50: number; p75: number } {
  let best = curves[0]!;
  for (const c of curves) {
    if (c.ageDays <= ageDays) best = c;
  }
  return best;
}

function valueToPercentile(
  value: number,
  curve: { p25: number; p50: number; p75: number },
): number {
  if (value <= curve.p25) return Math.round((value / curve.p25) * 25);
  if (value <= curve.p50) return 25 + Math.round(((value - curve.p25) / (curve.p50 - curve.p25)) * 25);
  if (value <= curve.p75) return 50 + Math.round(((value - curve.p50) / (curve.p75 - curve.p50)) * 25);
  return Math.min(99, 75 + Math.round((value - curve.p75) / 2));
}

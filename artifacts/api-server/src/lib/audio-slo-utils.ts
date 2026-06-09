/** Percentile helpers for audio TTFA SLO reporting. */

export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const clamped = Math.max(0, Math.min(100, p));
  const idx = Math.ceil((clamped / 100) * sortedAsc.length) - 1;
  return sortedAsc[Math.max(0, idx)]!;
}

export function computePercentiles(values: number[]): {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  count: number;
} {
  const filtered = values.filter((v) => Number.isFinite(v) && v > 0);
  if (filtered.length === 0) {
    return { p50: 0, p95: 0, p99: 0, avg: 0, count: 0 };
  }
  const sorted = [...filtered].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    avg: Math.round(sum / sorted.length),
    count: sorted.length,
  };
}

/** Production TTFA SLO — p95 under 1200ms in the rolling window. */
export const TTFA_P95_SLO_MS = 1200;

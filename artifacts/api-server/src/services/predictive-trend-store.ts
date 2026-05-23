/**
 * Rolling metrics history for predictive trend + anomaly detection (10-minute window).
 */

export type MetricSample = {
  at: number;
  apiErrorRate: number;
  ttfa: number;
  streamingStallRate: number;
  failureRate: number;
};

export type MetricsHistory = {
  apiErrorRate: number[];
  ttfa: number[];
  streamingStallRate: number[];
  failureRate: number[];
};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_SAMPLES = 20;

const samples: MetricSample[] = [];

function prune(now = Date.now()): void {
  const cutoff = now - WINDOW_MS;
  while (samples.length > 0 && samples[0]!.at < cutoff) {
    samples.shift();
  }
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

export function appendMetricSample(
  sample: Omit<MetricSample, "at">,
  now = Date.now(),
): MetricSample {
  prune(now);
  const row: MetricSample = { ...sample, at: now };
  samples.push(row);
  prune(now);
  return row;
}

export function getMetricSamples(now = Date.now()): MetricSample[] {
  prune(now);
  return [...samples];
}

export function getMetricsHistory(now = Date.now()): MetricsHistory {
  const rows = getMetricSamples(now);
  return {
    apiErrorRate: rows.map((r) => r.apiErrorRate),
    ttfa: rows.map((r) => r.ttfa),
    streamingStallRate: rows.map((r) => r.streamingStallRate),
    failureRate: rows.map((r) => r.failureRate),
  };
}

export function getLatestMetricSample(now = Date.now()): MetricSample | null {
  const rows = getMetricSamples(now);
  return rows.length > 0 ? rows[rows.length - 1]! : null;
}

/** Last N values strictly increasing (each step > previous). */
export function isIncreasingTrend(values: number[], points = 3): boolean {
  if (values.length < points) return false;
  const tail = values.slice(-points);
  for (let i = 1; i < tail.length; i++) {
    if (tail[i]! <= tail[i - 1]!) return false;
  }
  return true;
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Simple anomaly: current value exceeds historical average by 50%+. */
export function detectAnomaly(current: number, history: number[]): boolean {
  if (history.length < 3) return false;
  const prior = history.slice(0, -1);
  const avg = average(prior);
  if (avg <= 0) return current > 0;
  return current > avg * 1.5;
}

/** Fast rise: last delta > 2× average step size. */
export function isRisingFast(values: number[], points = 3): boolean {
  if (values.length < points) return false;
  const tail = values.slice(-points);
  const deltas: number[] = [];
  for (let i = 1; i < tail.length; i++) {
    deltas.push(tail[i]! - tail[i - 1]!);
  }
  if (deltas.length === 0) return false;
  const lastDelta = deltas[deltas.length - 1]!;
  const avgDelta = average(deltas.slice(0, -1));
  return lastDelta > 0 && lastDelta > Math.max(avgDelta * 2, 0.02);
}

/** Test-only reset. */
export function resetPredictiveTrendStoreForTests(): void {
  samples.length = 0;
}

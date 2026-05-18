export interface RequestLogEntry {
  userId: string;
  virtualUserIndex: number;
  responseTimeMs: number;
  timeToFirstResponseMs: number;
  status: number;
  success: boolean;
  coachStatus?: string;
  timestamp: string;
  error?: string;
  sessionId?: string;
  generationId?: string;
  winCount?: number;
  cached?: boolean;
}

export interface PollLogEntry {
  userId: string;
  virtualUserIndex: number;
  backgroundCompletionMs: number;
  success: boolean;
  pollCount: number;
  timestamp: string;
  error?: string;
}

export interface ErrorLogEntry {
  userId: string;
  virtualUserIndex: number;
  phase: "generate" | "poll";
  message: string;
  timestamp: string;
  status?: number;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]!;
}

export function aggregateTimings(values: number[]) {
  if (values.length === 0) {
    return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    avg: Math.round(sum / sorted.length),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    p95: percentile(sorted, 95),
  };
}

export async function runInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item, j) => fn(item, i + j)));
  }
}

import { logger } from "./logger.js";

export type CoachPerfStep =
  | "REQUEST_TOTAL"
  | "CACHE_LOOKUP"
  | "AI_CALL_INITIAL"
  | "DB_WRITE_PARTIAL"
  | "RESPONSE_SENT"
  | "AI_CALL_BACKGROUND"
  | "DB_WRITE_COMPLETE"
  | "BACKGROUND_TOTAL";

export interface CoachPerfMeta {
  userId?: string | null;
  sessionId?: string;
  generationId?: string;
  cacheKey?: string;
  status?: string;
  source?: string;
  cached?: boolean;
  [key: string]: unknown;
}

/** Structured Amy Coach performance log (pino + console for local stress runs). */
export function logCoachPerf(
  step: CoachPerfStep,
  durationMs: number,
  meta: CoachPerfMeta = {},
): void {
  const payload = {
    module: "amy_coach",
    step,
    durationMs,
    ...meta,
  };
  logger.info(payload, `amy-coach perf: ${step}`);
  if (process.env.COACH_PERF_CONSOLE === "1" || process.env.NODE_ENV !== "production") {
    console.log(payload);
  }
}

export function startCoachPerfSpan(step: CoachPerfStep, meta: CoachPerfMeta = {}) {
  const startedAt = performance.now();
  return {
    end(extra: CoachPerfMeta = {}): number {
      const durationMs = Math.round(performance.now() - startedAt);
      logCoachPerf(step, durationMs, { ...meta, ...extra });
      return durationMs;
    },
  };
}

export async function withCoachPerf<T>(
  step: CoachPerfStep,
  meta: CoachPerfMeta,
  fn: () => Promise<T>,
): Promise<T> {
  const span = startCoachPerfSpan(step, meta);
  try {
    return await fn();
  } finally {
    span.end();
  }
}

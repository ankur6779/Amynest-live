/**
 * Client-side Amy AI latency marks. No conversation content. No new analytics platform.
 * Server context / model timings are not visible here — those stay in the job.
 */
import { queueClientLog } from "@/lib/client-logs";

export const AMY_AI_SLOW_MS = 4_000;

export type AmyAiLatencyTrace = {
  requestStart: number;
  fetchStart?: number;
  fetchEnd?: number;
  pollStart?: number;
  responseComplete?: number;
  persistenceComplete?: number;
  totalMs?: number;
  asyncJob?: boolean;
  ok?: boolean;
};

export function startAmyAiLatency(): AmyAiLatencyTrace {
  return { requestStart: performance.now() };
}

export function markAmyAiLatency(
  trace: AmyAiLatencyTrace,
  key: Exclude<keyof AmyAiLatencyTrace, "requestStart" | "asyncJob" | "ok" | "totalMs">,
): void {
  trace[key] = performance.now();
}

export function amyAiLatencyMeta(trace: AmyAiLatencyTrace): Record<string, number | boolean | undefined> {
  const fetchMs =
    trace.fetchStart != null && trace.fetchEnd != null
      ? Math.round(trace.fetchEnd - trace.fetchStart)
      : undefined;
  const pollMs =
    trace.pollStart != null && trace.responseComplete != null
      ? Math.round(trace.responseComplete - trace.pollStart)
      : undefined;
  const persistMs =
    trace.responseComplete != null && trace.persistenceComplete != null
      ? Math.round(trace.persistenceComplete - trace.responseComplete)
      : undefined;
  return {
    fetchMs,
    pollMs,
    persistMs,
    totalMs: trace.totalMs,
    asyncJob: Boolean(trace.asyncJob),
    ok: trace.ok !== false,
  };
}

export function finishAmyAiLatency(
  trace: AmyAiLatencyTrace,
  extra?: { asyncJob?: boolean; ok?: boolean },
): void {
  const end = trace.persistenceComplete ?? trace.responseComplete ?? performance.now();
  trace.totalMs = Math.round(end - trace.requestStart);
  trace.asyncJob = extra?.asyncJob;
  trace.ok = extra?.ok;
  const meta = amyAiLatencyMeta(trace);
  queueClientLog({
    type: "info",
    message: "amy_ai_latency",
    context: "amy_ai",
    durationMs: trace.totalMs,
    meta,
  });
  if (import.meta.env.DEV) {
    console.info("[amy_ai_latency]", meta);
  }
}

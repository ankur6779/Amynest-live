/**
 * Amy Coach generate flow — distributed trace stages (shared API + web + worker docs).
 * Header: x-amynest-coach-trace-id (mirrored to x-request-id on API).
 */
export const COACH_GENERATE_TRACE_HEADER = "x-amynest-coach-trace-id";

export const COACH_GENERATE_TRACE_STAGES = [
  "frontend.request_start",
  "frontend.response_received",
  "cloudflare.request_received",
  "cloudflare.request_forwarded",
  "cloudflare.response_returned",
  "render.request_received",
  "render.job_enqueued",
  "render.job_deduplicated",
  "render.response_sent",
  "bullmq.job_enqueued",
  "bullmq.job_started",
  "openai.request_started",
  "openai.request_completed",
  "bullmq.job_completed",
  "render.middleware.request_timeout",
] as const;

export type CoachGenerateTraceStage = (typeof COACH_GENERATE_TRACE_STAGES)[number];

export type CoachGenerateTraceEvent = {
  stage: CoachGenerateTraceStage | string;
  traceId: string;
  requestId?: string;
  timestamp: string;
  /** ms since trace start (frontend) or since render.request_received (server). */
  durationMs?: number;
  jobId?: string;
  httpStatus?: number;
  contentType?: string;
  timeoutMs?: number;
  layer?: string;
  meta?: Record<string, unknown>;
};

export function createCoachGenerateTraceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `coach-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function coachGenerateTraceHeaders(traceId: string): Record<string, string> {
  return {
    [COACH_GENERATE_TRACE_HEADER]: traceId,
    "x-request-id": traceId,
  };
}

import {
  COACH_GENERATE_TRACE_HEADER,
  type CoachGenerateTraceEvent,
  type CoachGenerateTraceStage,
} from "@workspace/coach-journey";
import { logger } from "./logger.js";
import { unwrapJobPayload } from "../queue/ai-job-payload.js";

const traceStartById = new Map<string, number>();
const traceEventsById = new Map<string, CoachGenerateTraceEvent[]>();

function appendTraceEvent(event: CoachGenerateTraceEvent): void {
  const list = traceEventsById.get(event.traceId) ?? [];
  list.push(event);
  traceEventsById.set(event.traceId, list);
  if (traceEventsById.size > 500) {
    const oldest = traceEventsById.keys().next().value;
    if (oldest) traceEventsById.delete(oldest);
  }
}

export function getCoachGenerateTraceTimeline(traceId: string): CoachGenerateTraceEvent[] {
  return [...(traceEventsById.get(traceId) ?? [])];
}

export function readCoachTraceIdFromHeaders(
  headers: Record<string, string | string[] | undefined> | Headers,
): string | undefined {
  const get = (key: string): string | undefined => {
    if (headers instanceof Headers) {
      const v = headers.get(key);
      return v?.trim() || undefined;
    }
    const raw = headers[key] ?? headers[key.toLowerCase()];
    if (typeof raw === "string") return raw.trim() || undefined;
    if (Array.isArray(raw) && raw[0]) return raw[0].trim();
    return undefined;
  };
  return get(COACH_GENERATE_TRACE_HEADER) ?? get("x-request-id");
}

export function markCoachTraceStart(traceId: string, t0 = Date.now()): void {
  if (!traceStartById.has(traceId)) traceStartById.set(traceId, t0);
  if (traceStartById.size > 500) {
    const oldest = traceStartById.keys().next().value;
    if (oldest) traceStartById.delete(oldest);
  }
}

export function coachTraceDurationMs(traceId: string, now = Date.now()): number | undefined {
  const t0 = traceStartById.get(traceId);
  return t0 !== undefined ? now - t0 : undefined;
}

export function extractCoachTraceIdFromPayload(payload: unknown): string | undefined {
  const { pollContext } = unwrapJobPayload(payload);
  if (!pollContext || typeof pollContext !== "object") return undefined;
  const id = (pollContext as { traceId?: unknown }).traceId;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

/** Structured server log — search Render logs for evt=coach_generate_trace */
export function logCoachGenerateTrace(
  stage: CoachGenerateTraceStage | string,
  meta: {
    traceId: string;
    requestId?: string;
    jobId?: string;
    httpStatus?: number;
    contentType?: string;
    timeoutMs?: number;
    layer?: string;
    t0?: number;
    meta?: Record<string, unknown>;
  },
): void {
  const now = Date.now();
  if (meta.t0 !== undefined) markCoachTraceStart(meta.traceId, meta.t0);
  else markCoachTraceStart(meta.traceId);

  const event: CoachGenerateTraceEvent = {
    stage,
    traceId: meta.traceId,
    requestId: meta.requestId,
    timestamp: new Date(now).toISOString(),
    durationMs: coachTraceDurationMs(meta.traceId, now),
    jobId: meta.jobId,
    httpStatus: meta.httpStatus,
    contentType: meta.contentType,
    timeoutMs: meta.timeoutMs,
    layer: meta.layer ?? "render",
    meta: meta.meta,
  };

  logger.info({ evt: "coach_generate_trace", ...event }, `coach trace ${stage}`);
  appendTraceEvent(event);
}

export function resetCoachTraceStoreForTests(): void {
  traceStartById.clear();
  traceEventsById.clear();
}

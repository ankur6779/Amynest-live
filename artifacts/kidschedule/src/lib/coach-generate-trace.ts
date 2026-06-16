import {
  COACH_GENERATE_TRACE_HEADER,
  createCoachGenerateTraceId,
  coachGenerateTraceHeaders,
  type CoachGenerateTraceEvent,
  type CoachGenerateTraceStage,
} from "@workspace/coach-journey";

const MAX_TIMELINES = 20;

type TraceSession = {
  traceId: string;
  startedAt: number;
  events: CoachGenerateTraceEvent[];
};

const sessions = new Map<string, TraceSession>();

function getSession(traceId: string): TraceSession {
  let s = sessions.get(traceId);
  if (!s) {
    s = { traceId, startedAt: performance.now(), events: [] };
    sessions.set(traceId, s);
    if (sessions.size > MAX_TIMELINES) {
      const first = sessions.keys().next().value;
      if (first) sessions.delete(first);
    }
  }
  return s;
}

export function beginCoachGenerateTrace(): {
  traceId: string;
  headers: Record<string, string>;
  log: (stage: CoachGenerateTraceStage | string, meta?: Partial<CoachGenerateTraceEvent>) => void;
  finish: (stage: CoachGenerateTraceStage | string, meta?: Partial<CoachGenerateTraceEvent>) => CoachGenerateTraceEvent[];
} {
  const traceId = createCoachGenerateTraceId();
  const headers = coachGenerateTraceHeaders(traceId);
  const session = getSession(traceId);

  const log = (stage: CoachGenerateTraceStage | string, meta?: Partial<CoachGenerateTraceEvent>) => {
    const event: CoachGenerateTraceEvent = {
      stage,
      traceId,
      timestamp: new Date().toISOString(),
      durationMs: Math.round(performance.now() - session.startedAt),
      layer: "frontend",
      ...meta,
    };
    session.events.push(event);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info("[coach_generate_trace]", event);
    }
  };

  log("frontend.request_start");

  return {
    traceId,
    headers,
    log,
    finish(stage, meta) {
      log(stage, meta);
      const timeline = [...session.events];
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.table(
          timeline.map((e) => ({
            stage: e.stage,
            ms: e.durationMs,
            status: e.httpStatus,
            contentType: e.contentType?.slice(0, 40),
          })),
        );
      }
      return timeline;
    },
  };
}

export function readResponseTraceHeaders(res: Response): {
  traceId?: string;
  renderMs?: string;
  cfMs?: string;
} {
  return {
    traceId: res.headers.get(COACH_GENERATE_TRACE_HEADER) ?? res.headers.get("x-request-id") ?? undefined,
    renderMs: res.headers.get("x-amynest-trace-render-ms") ?? undefined,
    cfMs: res.headers.get("x-amynest-trace-cf-ms") ?? undefined,
  };
}

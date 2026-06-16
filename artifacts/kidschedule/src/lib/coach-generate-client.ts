import {
  COACH_CLIENT_FETCH_TIMEOUT_MS,
  COACH_CLIENT_POLL_INTERVAL_MS,
  COACH_CLIENT_POLL_MAX_MS,
  COACH_CLIENT_POLL_REQUEST_TIMEOUT_MS,
} from "@workspace/coach-journey";
import {
  COACH_USER_FACING_ERROR,
  safeJsonResponse,
} from "@/lib/safe-json-response";
import {
  beginCoachGenerateTrace,
  readResponseTraceHeaders,
} from "@/lib/coach-generate-trace";
import {
  hasAsyncJobId,
  pollResult,
  resolveAiApiData,
  type AuthFetchFn,
} from "@/lib/poll-result";

type CoachWin = {
  win: number;
  title: string;
  objective: string;
  deep_explanation: string;
  actions: string[];
  example: string;
  mistake_to_avoid: string;
  micro_task: string;
  duration: string;
  science_reference: string;
};

export type CoachGeneratePlanResponse = {
  plan: {
    title: string;
    root_cause: string;
    summary: string;
    wins: CoachWin[];
  };
  sessionId: string;
  planCacheKey?: string;
  status?: "partial" | "complete";
  totalWins?: number;
  initialWins?: number;
  source?: string;
};

export type CoachGenerateAsyncEnvelope = {
  jobId: string;
  status: string;
  sessionId?: string;
  planCacheKey?: string;
  pollUrl?: string;
};

function pollAttemptsFromBudget(): number {
  return Math.ceil(COACH_CLIENT_POLL_MAX_MS / COACH_CLIENT_POLL_INTERVAL_MS);
}

function extractAsyncJobId(
  data: CoachGeneratePlanResponse | CoachGenerateAsyncEnvelope,
): string | null {
  if (hasAsyncJobId(data)) return data.jobId;
  if ("jobId" in data && typeof data.jobId === "string" && data.jobId.length > 0) {
    return data.jobId;
  }
  return null;
}

/**
 * POST /api/coach/generate → sync 200 (cache) or async 202 + poll until plan ready.
 * On any failure, POST /api/coach/generate-fallback guarantees a plan.
 */
export async function fetchCoachGeneratePlan(
  authFetch: AuthFetchFn,
  body: string,
  signal?: AbortSignal,
): Promise<CoachGeneratePlanResponse> {
  const trace = beginCoachGenerateTrace();

  const res = await authFetch(
    "/api/coach/generate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...trace.headers },
      body,
      signal,
    },
    COACH_CLIENT_FETCH_TIMEOUT_MS,
  );

  const responseHeaders = readResponseTraceHeaders(res);
  trace.log("frontend.generate_response", {
    httpStatus: res.status,
    contentType: res.headers.get("content-type") ?? undefined,
    meta: responseHeaders,
  });

  if (res.status === 402) {
    const parsed = await safeJsonResponse<{ error?: string }>(res);
    trace.finish("frontend.response_received", { httpStatus: 402 });
    const err = new Error(parsed.ok ? parsed.data.error ?? "coach_locked" : "coach_locked");
    (err as Error & { status?: number }).status = 402;
    throw err;
  }

  const envelope = await safeJsonResponse<CoachGeneratePlanResponse | CoachGenerateAsyncEnvelope>(res);
  if (!envelope.ok) {
    trace.log("frontend.gateway_error", {
      httpStatus: res.status,
      contentType: res.headers.get("content-type") ?? undefined,
      meta: { kind: envelope.kind, snippet: envelope.snippet?.slice(0, 80) },
    });
    trace.finish("frontend.response_received", { httpStatus: res.status });
    return fetchCoachGenerateFallback(authFetch, body, signal, trace.headers);
  }

  const data = envelope.data;

  if (res.status === 202 || hasAsyncJobId(data)) {
    const jobId = extractAsyncJobId(data);
    if (!jobId) {
      trace.finish("frontend.response_received", { httpStatus: res.status });
      return fetchCoachGenerateFallback(authFetch, body, signal, trace.headers);
    }
    try {
      const result = await pollResult(jobId, authFetch, {
        maxAttempts: pollAttemptsFromBudget(),
        intervalMs: COACH_CLIENT_POLL_INTERVAL_MS,
        requestTimeoutMs: COACH_CLIENT_POLL_REQUEST_TIMEOUT_MS,
        traceHeaders: trace.headers,
        signal,
      });
      const resolved = await resolveAiApiData<CoachGeneratePlanResponse>(result, authFetch);
      if (resolved?.plan?.wins?.length) {
        trace.finish("frontend.response_received", { httpStatus: 200, meta: { jobId, async: true } });
        return resolved;
      }
    } catch {
      /* poll failed — fall through to guaranteed fallback */
    }
    trace.finish("frontend.response_received", { httpStatus: res.status, meta: { pollFailed: true } });
    return fetchCoachGenerateFallback(authFetch, body, signal, trace.headers);
  }

  if (res.ok && (data as CoachGeneratePlanResponse)?.plan?.wins?.length) {
    trace.finish("frontend.response_received", { httpStatus: 200, meta: { cached: true } });
    return data as CoachGeneratePlanResponse;
  }

  trace.finish("frontend.response_received", { httpStatus: res.status });
  return fetchCoachGenerateFallback(authFetch, body, signal, trace.headers);
}

async function fetchCoachGenerateFallback(
  authFetch: AuthFetchFn,
  body: string,
  signal?: AbortSignal,
  traceHeaders?: Record<string, string>,
): Promise<CoachGeneratePlanResponse> {
  try {
    const res = await authFetch(
      "/api/coach/generate-fallback",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...traceHeaders },
        body,
        signal,
      },
      COACH_CLIENT_FETCH_TIMEOUT_MS,
    );
    const parsed = await safeJsonResponse<CoachGeneratePlanResponse>(res);
    if (parsed.ok && parsed.data?.plan?.wins?.length) {
      return parsed.data;
    }
  } catch {
    /* last resort below */
  }

  throw new Error(COACH_USER_FACING_ERROR);
}

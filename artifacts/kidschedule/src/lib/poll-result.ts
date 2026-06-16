import { safeJsonResponse } from "@/lib/safe-json-response";

export type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number,
) => Promise<Response>;

export type PollResultOptions = {
  maxAttempts?: number;
  intervalMs?: number;
  /** Per-poll GET timeout (defaults to 15s for slow mobile networks). */
  requestTimeoutMs?: number;
  /** Propagate coach generate trace id on poll requests. */
  traceHeaders?: Record<string, string>;
  /** Abort polling when the caller unmounts or navigates away. */
  signal?: AbortSignal;
};

export type ResolveAiApiOptions = {
  poll?: PollResultOptions;
};

export class PollTerminalError extends Error {
  readonly terminalStatus: "failed" | "timed_out" | "cancelled";

  constructor(terminalStatus: "failed" | "timed_out" | "cancelled", message: string) {
    super(message);
    this.name = "PollTerminalError";
    this.terminalStatus = terminalStatus;
  }
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function hasAsyncJobId(data: unknown): data is { jobId: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as { jobId?: unknown }).jobId === "string" &&
    (data as { jobId: string }).jobId.length > 0
  );
}

/** Poll GET /api/result/:jobId until a terminal job state (default max ~40s). */
export async function pollResult(
  jobId: string,
  authFetch: AuthFetchFn,
  options?: PollResultOptions,
): Promise<unknown> {
  const maxAttempts = options?.maxAttempts ?? 20;
  const intervalMs = options?.intervalMs ?? 2000;
  const requestTimeoutMs = options?.requestTimeoutMs ?? 15_000;

  for (let i = 0; i < maxAttempts; i++) {
    if (options?.signal?.aborted) {
      throw new PollTerminalError("cancelled", "Poll cancelled");
    }
    if (i > 0) await wait(intervalMs);
    try {
      const res = await authFetch(
        `/api/result/${jobId}`,
        { method: "GET", headers: options?.traceHeaders },
        requestTimeoutMs,
      );
      const parsed = await safeJsonResponse<{
        status?: string;
        result?: unknown;
        error?: string;
      }>(res);
      if (!parsed.ok) {
        if (i === maxAttempts - 1) {
          throw new PollTerminalError("failed", "gateway_response_not_json");
        }
        continue;
      }
      const data = parsed.data;

      if (data.status === "completed") return data.result;

      if (data.status === "failed") {
        throw new PollTerminalError("failed", data.error ?? "AI job failed");
      }
      if (data.status === "timed_out") {
        throw new PollTerminalError("timed_out", data.error ?? "AI job timed out");
      }
      if (data.status === "cancelled") {
        throw new PollTerminalError("cancelled", data.error ?? "AI job cancelled");
      }

      if (res.status === 404) {
        throw new PollTerminalError("failed", data.error ?? "job_not_found");
      }
      if (res.status === 403) {
        throw new PollTerminalError("failed", data.error ?? "forbidden");
      }
    } catch (err) {
      if (err instanceof PollTerminalError) throw err;
      // Transient network/timeout on a single poll — keep trying until budget is exhausted.
      if (i === maxAttempts - 1) throw err;
    }
  }
  throw new PollTerminalError("timed_out", "Timeout");
}

/**
 * If the API returned a BullMQ async envelope ({ jobId }), poll for the final payload.
 * Otherwise return the body as-is (sync 200).
 */
export async function resolveAiApiData<T>(
  data: unknown,
  authFetch: AuthFetchFn,
  options?: ResolveAiApiOptions,
): Promise<T> {
  if (hasAsyncJobId(data)) {
    const result = await pollResult(data.jobId, authFetch, options?.poll);
    return result as T;
  }
  return data as T;
}

export async function parseResponseJson(res: Response): Promise<unknown> {
  const parsed = await safeJsonResponse(res);
  return parsed.ok ? parsed.data : null;
}

/** Parse a successful response body and unwrap async jobs when present. */
export async function readResolvedApiJson<T>(
  res: Response,
  authFetch: AuthFetchFn,
  options?: ResolveAiApiOptions,
): Promise<T> {
  const raw = await parseResponseJson(res);
  return resolveAiApiData<T>(raw, authFetch, options);
}

export { safeJsonResponse };

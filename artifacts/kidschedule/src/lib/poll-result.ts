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
};

export type ResolveAiApiOptions = {
  poll?: PollResultOptions;
};

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

/** Poll GET /api/result/:jobId until completed or failed (default max ~40s). */
export async function pollResult(
  jobId: string,
  authFetch: AuthFetchFn,
  options?: PollResultOptions,
): Promise<unknown> {
  const maxAttempts = options?.maxAttempts ?? 20;
  const intervalMs = options?.intervalMs ?? 2000;
  const requestTimeoutMs = options?.requestTimeoutMs ?? 15_000;

  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await wait(intervalMs);
    try {
      const res = await authFetch(`/api/result/${jobId}`, { method: "GET" }, requestTimeoutMs);
      const data = (await res.json()) as {
        status?: string;
        result?: unknown;
        error?: string;
      };
      if (data.status === "completed") return data.result;
      if (data.status === "failed") {
        throw new Error(data.error ?? "AI job failed");
      }
    } catch (err) {
      // Transient network/timeout on a single poll — keep trying until budget is exhausted.
      if (i === maxAttempts - 1) throw err;
    }
  }
  throw new Error("Timeout");
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
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
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

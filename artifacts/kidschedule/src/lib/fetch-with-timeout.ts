import { adaptiveTimeoutMs } from "@/lib/network-adaptive-timeout";

const DEFAULT_API_TIMEOUT_MS = 8_000;
const DEFAULT_API_TIMEOUT_SLOW_MS = 20_000;

export { adaptiveTimeoutMs, getNetworkLabel, getNetworkTier } from "@/lib/network-adaptive-timeout";

export class FetchTimeoutError extends Error {
  constructor(ms: number) {
    super(`Request timed out after ${ms}ms`);
    this.name = "FetchTimeoutError";
  }
}

/**
 * fetch() with AbortSignal timeout — prevents infinite loading spinners on API calls.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
): Promise<Response> {
  const effectiveMs =
    timeoutMs === DEFAULT_API_TIMEOUT_MS
      ? adaptiveTimeoutMs(DEFAULT_API_TIMEOUT_MS, DEFAULT_API_TIMEOUT_SLOW_MS)
      : timeoutMs;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), effectiveMs);

  const signals: AbortSignal[] = [];
  if (init.signal) signals.push(init.signal);
  signals.push(controller.signal);

  const onAbort = () => controller.abort();
  for (const signal of signals.slice(0, -1)) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (controller.signal.aborted && !(init.signal as AbortSignal | undefined)?.aborted) {
      throw new FetchTimeoutError(effectiveMs);
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

export { DEFAULT_API_TIMEOUT_MS };

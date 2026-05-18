export class FetchTimeoutError extends Error {
  readonly code = "fetch_timeout";

  constructor(ms: number) {
    super(`Request timed out after ${ms}ms`);
    this.name = "FetchTimeoutError";
  }
}

/**
 * fetch() with AbortController timeout. Clears timer in finally.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const { timeoutMs: _omit, signal: extSignal, ...rest } = init;

  if (extSignal) {
    if (extSignal.aborted) {
      clearTimeout(timer);
      controller.abort(extSignal.reason);
    } else {
      extSignal.addEventListener("abort", () => controller.abort(extSignal.reason), {
        once: true,
      });
    }
  }

  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

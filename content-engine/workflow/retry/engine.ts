export function computeWorkflowBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt));
  const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(exp * 0.1)));
  return Math.min(maxDelayMs, exp + jitter);
}

export async function withWorkflowRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    sleep?: (ms: number) => Promise<void>;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void | Promise<void>;
  },
): Promise<{ value: T; attempts: number }> {
  const sleep = options.sleep ?? defaultSleep;
  let attempts = 0;
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    attempts = attempt + 1;
    try {
      const value = await operation();
      return { value, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt >= options.maxRetries) break;
      const delayMs = computeWorkflowBackoff(
        attempt,
        options.baseDelayMs,
        options.maxDelayMs,
      );
      await options.onRetry?.(attempt + 1, error, delayMs);
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "Workflow retry exhausted"));
}

function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

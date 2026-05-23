const DEFAULT_TIMEOUT_MS = 15_000;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Merge caller signal with a wall-clock abort (prevents hung synthesize). */
export function abortSignalWithTimeout(
  timeoutMs = DEFAULT_TIMEOUT_MS,
  parent?: AbortSignal | null,
): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();

  const onAbort = () => controller.abort();
  if (parent) {
    if (parent.aborted) {
      controller.abort();
    } else {
      parent.addEventListener("abort", onAbort, { once: true });
    }
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const clear = () => {
    clearTimeout(timer);
    if (parent) parent.removeEventListener("abort", onAbort);
  };

  return { signal: controller.signal, clear };
}

/** Race any promise against a timeout — returns null on timeout. */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = "operation",
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`[TTS] ${label}_timeout`, { timeoutMs });
          resolve(null);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

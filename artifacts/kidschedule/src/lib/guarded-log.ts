/**
 * Logging helpers that must never throw — crash telemetry runs inside error handlers.
 */

export function safeConsoleError(...args: unknown[]): void {
  try {
    console.error(...args);
  } catch {
    /* ignore */
  }
}

export function safeConsoleWarn(...args: unknown[]): void {
  try {
    console.warn(...args);
  } catch {
    /* ignore */
  }
}

export function safeConsoleInfo(...args: unknown[]): void {
  try {
    console.info(...args);
  } catch {
    /* ignore */
  }
}

/** Fire-and-forget client error log — never throws. */
export function safeLogClientError(payload: {
  message: string;
  stack?: string;
  label?: string;
  meta?: Record<string, unknown>;
}): void {
  void import("@/lib/log-client-error")
    .then(({ logClientError }) => logClientError(payload))
    .catch((err) => {
      safeConsoleError("[guarded-log] logClientError import/call failed", err, payload.message);
    });
}

/** Fire-and-forget onboarding finish telemetry — never throws. */
export function safeLogOnboardingFinish(
  event: string,
  payload: Record<string, unknown>,
  opts?: { userId?: string | null; step?: string },
): void {
  void import("@/lib/onboarding-completion")
    .then(({ logOnboardingFinish }) => {
      logOnboardingFinish(
        event as Parameters<typeof logOnboardingFinish>[0],
        payload,
        opts,
      );
    })
    .catch((err) => {
      safeConsoleError("[guarded-log] logOnboardingFinish failed", event, err);
    });
}

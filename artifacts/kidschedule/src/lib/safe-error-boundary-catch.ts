import type { ErrorInfo } from "react";
import { safeConsoleError, safeLogClientError } from "@/lib/guarded-log";

/** Normalize unknown throws from child trees. */
export function normalizeBoundaryError(err: unknown): Error {
  if (err instanceof Error) return err;
  try {
    return new Error(typeof err === "string" ? err : String(err ?? "Unknown error"));
  } catch {
    return new Error("Unknown error");
  }
}

export function safeBoundaryMessage(err: unknown): string {
  try {
    return normalizeBoundaryError(err).message;
  } catch {
    return "Unknown error";
  }
}

/**
 * Run secondary work inside componentDidCatch without ever rethrowing.
 * Error boundaries must never throw — a secondary failure caused production reload loops.
 */
export function safeInvokeBoundaryHandler(label: string, handler: () => void): void {
  try {
    handler();
  } catch (secondary) {
    safeConsoleError(`[error-boundary:${label}] secondary failure in componentDidCatch`, secondary);
    safeLogClientError({
      label: `error-boundary:${label}`,
      message: safeBoundaryMessage(secondary),
      stack: secondary instanceof Error ? secondary.stack : undefined,
      meta: { kind: "boundary-secondary-failure" },
    });
  }
}

export function safeReportBoundaryCrash(
  label: string,
  error: unknown,
  info: ErrorInfo,
  extra?: Record<string, unknown>,
): void {
  safeInvokeBoundaryHandler(label, () => {
    const err = normalizeBoundaryError(error);
    safeConsoleError(`APP CRASH: ${label}`, err, info.componentStack);
    safeLogClientError({
      label,
      message: err.message,
      stack: [err.stack, info.componentStack].filter(Boolean).join("\n"),
      meta: {
        componentStack: info.componentStack,
        ...extra,
      },
    });
  });
}

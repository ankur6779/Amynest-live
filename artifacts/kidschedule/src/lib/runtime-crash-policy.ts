/**
 * Classifies runtime errors and gates the full-screen crash overlay.
 * Production should log benign failures and recover; overlay is opt-in only.
 */

const BENIGN_PATTERNS = [
  "ResizeObserver loop",
  "ResizeObserver loop limit exceeded",
  "Non-Error promise rejection",
  "AbortError",
  "The user aborted a request",
  "cancelled",
  "canceled",
  "auth-token-pending",
  "auth/unauthorized",
  "NetworkError",
  "Failed to fetch",
  "Load failed",
  "Network request failed",
  "Importing a module script failed",
  "ChunkLoadError",
  "Loading chunk",
  "Failed to fetch dynamically imported module",
  "play_failed_",
  "playback_blocked",
  "tts_",
  "NotAllowedError",
  "FetchTimeoutError",
  "Request timed out after",
  "static_audio",
  "audio_boot",
  "audio_start_timeout",
  "audio_load_failed",
] as const;

const RECOVERABLE_PATTERNS = [
  "Cannot read properties of null (reading 'useState')",
  "Cannot read properties of null (reading 'useEffect')",
  "Cannot read properties of null (reading 'useContext')",
  "Invalid hook call",
  "more than one copy of React",
  "ChunkLoadError",
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "Loading chunk",
] as const;

function messageFromUnknown(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: string }).message ?? err);
  }
  return String(err ?? "");
}

function errorName(err: unknown): string {
  if (err && typeof err === "object" && "name" in err) {
    return String((err as { name?: string }).name ?? "");
  }
  return "";
}

/** Benign — should be logged, not shown as a full-screen fatal crash. */
export function isBenignRuntimeError(err: unknown): boolean {
  if (errorName(err) === "AbortError" || errorName(err) === "FetchTimeoutError") return true;
  const msg = messageFromUnknown(err);
  if (!msg) return false;
  return BENIGN_PATTERNS.some((p) => msg.includes(p));
}

export function isRecoverableRuntimeError(err: unknown): boolean {
  const msg = messageFromUnknown(err);
  if (!msg) return false;
  return RECOVERABLE_PATTERNS.some((p) => msg.includes(p));
}

/** Full-screen debug overlay — off in production unless explicitly enabled. */
export function isCrashDebugOverlayEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    if (typeof window !== "undefined") {
      if (/[?&]crashdebug=1/.test(window.location.search)) return true;
    }
  } catch {
    /* ignore */
  }
  return import.meta.env.VITE_CRASH_DEBUG_OVERLAY === "true";
}

/** Whether the DOM crash overlay should appear for this error. */
export function shouldShowProductionCrashOverlay(err: unknown, kind?: string): boolean {
  if (kind === "bootstrap" || kind === "boot-timeout") return true;
  if (isBenignRuntimeError(err)) return false;
  if (
    kind === "react.render" ||
    kind === "react.recovery" ||
    kind === "recoverable.error" ||
    kind === "recoverable.rejection" ||
    kind === "pre-react.error" ||
    kind === "pre-react.rejection" ||
    kind === "window.error" ||
    kind === "unhandledrejection"
  ) {
    return isCrashDebugOverlayEnabled();
  }
  if (isRecoverableRuntimeError(err) && !isCrashDebugOverlayEnabled()) return false;
  return isCrashDebugOverlayEnabled();
}

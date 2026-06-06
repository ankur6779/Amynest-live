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

const INFINITE_RENDER_PATTERNS = [
  "Maximum update depth exceeded",
  "Too many re-renders",
  "Maximum call stack size exceeded",
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

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
}

/** Preview / staging hosts where developer crash UI is allowed. */
function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host.includes("preview") ||
    host.includes("staging") ||
    host.endsWith(".onrender.com") && !host.startsWith("www.")
  );
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

/** Infinite render loops — log and navigate away; never show crash UI. */
export function isInfiniteRenderError(err: unknown): boolean {
  const msg = messageFromUnknown(err);
  if (!msg) return false;
  return INFINITE_RENDER_PATTERNS.some((p) => msg.includes(p));
}

/** True when end users must never see technical crash details. */
export function isProductionEnvironment(): boolean {
  if (import.meta.env.DEV) return false;
  if (isLocalDevHost()) return false;
  if (isPreviewHost()) return false;
  try {
    if (typeof window !== "undefined" && /[?&]crashdebug=1/.test(window.location.search)) {
      return false;
    }
  } catch {
    /* ignore */
  }
  if (import.meta.env.VITE_CRASH_DEBUG_OVERLAY === "true") return false;
  return true;
}

/** Full-screen debug overlay — off in production unless explicitly enabled. */
export function isCrashDebugOverlayEnabled(): boolean {
  return !isProductionEnvironment();
}

/** Whether the DOM crash overlay should appear for this error. */
export function shouldShowProductionCrashOverlay(err: unknown, _kind?: string): boolean {
  if (isBenignRuntimeError(err)) return false;
  if (isInfiniteRenderError(err)) return false;
  return isCrashDebugOverlayEnabled();
}

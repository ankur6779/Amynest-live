import { logAudioDebug } from "@/lib/audio-debug";
import { isAudioStartupGraceActive } from "@/lib/audio-boot-orchestrator";
import { getApiUrl } from "@/lib/api";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { getFirebaseAuth } from "@/lib/firebase";
import { isStaticAudioDebugEnabled } from "@/lib/is-dev";
import type { StaticAudioMode } from "@workspace/static-audio/browser";

const SESSION_ALERT_THRESHOLD = 8;
const RETRY_DELAY_MS = 300;
/** Never alarm users during background audio boot or its grace window. */
const SESSION_ALERT_BOOT_GRACE_MS = 120_000;

export const VOICE_UNAVAILABLE_USER_MESSAGE =
  "Voice features are temporarily unavailable. AmyNest will retry automatically.";
const sessionStartedAt =
  typeof performance !== "undefined" ? performance.timeOrigin + performance.now() : Date.now();

let sessionFailureCount = 0;
let sessionAlertShown = false;
let clientCircuitOpen = false;
let clientCircuitUntil = 0;
let clientCircuitLogged = false;
const CLIENT_CIRCUIT_MS = 60_000;
const CLIENT_CIRCUIT_THRESHOLD = 8;
/** Dedupe noisy client logs / circuit pressure for the same catalog gap. */
const reportedMissingKeys = new Set<string>();
const reportedEventKeys = new Set<string>();

const TRANSIENT_DEPLOY_ERROR_RE =
  /502|503|504|fetch failed|failed to fetch|network|econnrefused|timeout|unreachable/i;

async function bearerToken(): Promise<string | null> {
  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export type StaticAudioClientEventType =
  | "static_audio_play_failed"
  | "static_audio_missing_url"
  | "static_audio_proxy_failed";

export function isStaticAudioDebug(): boolean {
  return isStaticAudioDebugEnabled();
}

export function isClientStaticAudioCircuitOpen(): boolean {
  if (!clientCircuitOpen) return false;
  if (Date.now() > clientCircuitUntil) {
    clientCircuitOpen = false;
    return false;
  }
  return true;
}

/** Clear client circuit after an explicit user tap (new speak gesture). */
export function resetClientStaticAudioCircuit(): void {
  clientCircuitOpen = false;
  clientCircuitUntil = 0;
  clientCircuitLogged = false;
  sessionFailureCount = 0;
  sessionAlertShown = false;
}

export function getSessionStaticAudioFailureCount(): number {
  return sessionFailureCount;
}

export function staticAudioRetryDelayMs(): number {
  return RETRY_DELAY_MS;
}

let clientCdnHits = 0;
let clientCdnMisses = 0;

/** Track CDN edge signals from prefetch / health fetches (client-side). */
export function recordClientCdnCacheStatus(url: string, res: Response): void {
  const cf = (res.headers.get("cf-cache-status") ?? "").toUpperCase();
  const xCache = (res.headers.get("x-cache") ?? "").toUpperCase();
  const edge = (res.headers.get("x-amynest-edge-cache") ?? "").toUpperCase();
  const swCache = (res.headers.get("x-amynest-sw-cache") ?? "").toUpperCase();
  const origin = res.headers.get("x-amynest-origin-cache") ?? undefined;

  if (
    cf.includes("HIT") ||
    xCache.includes("HIT") ||
    edge === "HIT" ||
    swCache === "HIT"
  ) {
    clientCdnHits += 1;
  } else if (cf.includes("MISS") || xCache.includes("MISS") || edge === "MISS" || swCache === "MISS") {
    clientCdnMisses += 1;
  }

  if (import.meta.env.DEV || isStaticAudioDebug()) {
    console.log("[STATIC AUDIO CDN]", {
      cf: cf || "—",
      xCache: xCache || "—",
      edge: edge || "—",
      swCache: swCache || "—",
      origin,
      status: res.status,
      url: url.slice(-48),
      hits: clientCdnHits,
      misses: clientCdnMisses,
    });
  }
}

export function getClientCdnCacheStats(): { hits: number; misses: number } {
  return { hits: clientCdnHits, misses: clientCdnMisses };
}

function staticAudioVerbose(...args: unknown[]): void {
  if (import.meta.env.DEV || isStaticAudioDebug()) {
    console.log("[STATIC AUDIO]", ...args);
  }
}

async function showStaticAudioToast(title: string, description?: string): Promise<void> {
  try {
    const { toast } = await import("@/hooks/use-toast");
    toast({
      title,
      description,
      duration: 6000,
      className:
        "border-amber-500/40 bg-amber-950/95 text-amber-50 max-w-sm p-3 text-xs shadow-md",
    });
  } catch {
    /* toast optional */
  }
}

function maybeShowSessionAlert(): void {
  if (isAudioStartupGraceActive()) return;
  if (Date.now() - sessionStartedAt < SESSION_ALERT_BOOT_GRACE_MS) return;
  if (sessionFailureCount <= SESSION_ALERT_THRESHOLD || sessionAlertShown) return;
  sessionAlertShown = true;
  void showStaticAudioToast("Voice unavailable", VOICE_UNAVAILABLE_USER_MESSAGE);
}

function isTransientDeployFailure(message: string, meta?: Record<string, unknown>): boolean {
  if (TRANSIENT_DEPLOY_ERROR_RE.test(message)) return true;
  const status = meta?.httpStatus ?? meta?.status;
  if (typeof status === "number" && (status === 0 || status >= 502)) return true;
  return false;
}

function recordSessionFailure(): void {
  sessionFailureCount += 1;
  if (sessionFailureCount >= CLIENT_CIRCUIT_THRESHOLD) {
    clientCircuitOpen = true;
    clientCircuitUntil = Date.now() + CLIENT_CIRCUIT_MS;
    if (!clientCircuitLogged) {
      clientCircuitLogged = true;
      // One log only — further attempts are silently degraded.
      if (import.meta.env.DEV || isStaticAudioDebug()) {
        console.warn("[STATIC AUDIO] Client circuit open — pausing playback attempts");
      }
    }
  }
  maybeShowSessionAlert();
}

/** Called after a successful play — eases client circuit pressure. */
export function recordStaticAudioPlaybackSuccess(): void {
  if (sessionFailureCount > 0) sessionFailureCount -= 1;
  if (sessionFailureCount < CLIENT_CIRCUIT_THRESHOLD - 1) {
    clientCircuitOpen = false;
  }
}

/** Visual fallback when audio cannot play (pulse/highlight in UI). */
export function emitStaticAudioVisualFallback(detail?: {
  phrase?: string;
  mode?: StaticAudioMode;
  highlightWords?: string[];
  showTapToHear?: boolean;
  animated?: boolean;
}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("amynest-static-audio-fallback", {
      detail: {
        showTapToHear: true,
        animated: true,
        ...detail,
      },
    }),
  );
}

export type StaticAudioVisualFallbackDetail = {
  phrase?: string;
  mode?: StaticAudioMode;
  highlightWords?: string[];
  showTapToHear?: boolean;
  animated?: boolean;
};

export function onStaticAudioVisualFallback(
  handler: (detail: StaticAudioVisualFallbackDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    handler((e as CustomEvent<StaticAudioVisualFallbackDetail>).detail ?? {});
  };
  window.addEventListener("amynest-static-audio-fallback", listener);
  return () => window.removeEventListener("amynest-static-audio-fallback", listener);
}

/** Best-effort client telemetry — never throws. */
export function reportStaticAudioEvent(
  type: StaticAudioClientEventType,
  message: string,
  meta?: Record<string, unknown>,
  opts?: { countTowardCircuit?: boolean; dedupeKey?: string },
): void {
  const dedupeKey = opts?.dedupeKey ?? `${type}:${message}:${String(meta?.text ?? "")}`;
  const isDuplicate = reportedEventKeys.has(dedupeKey);
  if (!isDuplicate) reportedEventKeys.add(dedupeKey);

  staticAudioVerbose(type, message, meta);
  // Avoid production console floods — one warn per unique event key.
  if (!isDuplicate && (import.meta.env.DEV || isStaticAudioDebug())) {
    console.warn(`[STATIC AUDIO EVENT] ${type}`, message, meta ?? {});
  }

  const countTowardCircuit =
    !isDuplicate &&
    opts?.countTowardCircuit !== false &&
    !isAudioStartupGraceActive() &&
    !isTransientDeployFailure(message, meta);

  if (countTowardCircuit) {
    recordSessionFailure();
  }

  if (typeof window === "undefined") return;
  // Skip duplicate network telemetry spam for the same gap.
  if (isDuplicate) return;

  if (isStaticAudioDebug()) {
    void showStaticAudioToast("Static audio issue", message);
  }

  void (async () => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = await bearerToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      await fetch(getApiUrl("/api/log-client-error"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          type,
          message: message.slice(0, 4000),
          route: window.location.pathname,
          meta: {
            userAgent: navigator.userAgent,
            href: window.location.href,
            sessionFailureCount,
            ...meta,
          },
        }),
        keepalive: true,
      });
    } catch {
      /* telemetry must not crash playback */
    }
  })();
}

export function reportStaticAudioMissingUrl(text: string, mode: StaticAudioMode): void {
  const key = `${mode}:${text.trim().slice(0, 200)}`;
  const first = !reportedMissingKeys.has(key);
  if (first) reportedMissingKeys.add(key);

  // Missing catalog URL is a soft degrade — report once, never retry-flood.
  if (first) {
    reportStaticAudioEvent(
      "static_audio_missing_url",
      "Catalog phrase has no proxy URL",
      { text: text.slice(0, 200), mode },
      { countTowardCircuit: true, dedupeKey: `missing:${key}` },
    );
  }
  emitStaticAudioVisualFallback({ phrase: text, mode });
}

export function reportStaticAudioProxyFailed(
  detail: Record<string, unknown>,
  text?: string,
  mode?: StaticAudioMode,
): void {
  reportStaticAudioEvent("static_audio_proxy_failed", "Failed to resolve static audio proxy URL", {
    ...detail,
    text: text?.slice(0, 200),
    mode,
  });
  if (text) emitStaticAudioVisualFallback({ phrase: text, mode });
}

export function reportStaticAudioPlayFailed(
  err: unknown,
  audio: HTMLAudioElement,
  extra?: Record<string, unknown>,
): void {
  const message = err instanceof Error ? err.message : String(err);
  const isGestureBlock =
    /USER_INTERACTION|gesture|NotAllowed|autoplay/i.test(message) ||
    extra?.error === "USER_INTERACTION_REQUIRED";
  const isAndroidWatchdog =
    isAndroidAmyNestAudioClient() && /PLAYBACK_WATCHDOG/i.test(message);

  logAudioDebug("static_audio_play_failed", {
    fileUrl: typeof extra?.proxyUrl === "string" ? extra.proxyUrl : audio.src,
    error: message,
    phrase: extra?.phrase,
    mode: extra?.mode,
    mediaError: audio.error?.code,
    sessionFailureCount,
    ...extra,
  }, audio);

  reportStaticAudioEvent(
    "static_audio_play_failed",
    message,
    {
      url: audio.src,
      mediaError: audio.error?.code,
      ...extra,
    },
    {
      countTowardCircuit:
        !isGestureBlock && !isAndroidWatchdog && !isTransientDeployFailure(message, extra),
    },
  );
  const phrase = typeof extra?.phrase === "string" ? extra.phrase : undefined;
  const mode = extra?.mode as StaticAudioMode | undefined;
  emitStaticAudioVisualFallback({ phrase, mode });
}

/** @deprecated Prefer scheduleAudioBoot() — kept for dev console tooling. */
export async function checkStaticAudioHealthOnBoot(): Promise<void> {
  const { scheduleAudioBoot } = await import("@/lib/audio-boot-orchestrator");
  scheduleAudioBoot();
}

export function installStaticAudioDevTools(): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;

  window.checkStaticAudioHealth = () => checkStaticAudioHealthOnBoot();

  window.testStaticAudio = async (hash: string) => {
    const url = getApiUrl(`/api/static-audio/${hash}.mp3`);
    const res = await fetch(url);
    console.info("[AUDIO HEALTH] clip probe", {
      status: res.status,
      ok: res.ok,
      url,
      contentType: res.headers.get("content-type"),
    });
  };
}

declare global {
  interface Window {
    /** Dev console — `await checkStaticAudioHealth()` */
    checkStaticAudioHealth?: () => Promise<void>;
    /** Dev console — `await testStaticAudio("20ccf010450267bfff3fb54c9f09820c")` */
    testStaticAudio?: (hash: string) => Promise<void>;
  }
}

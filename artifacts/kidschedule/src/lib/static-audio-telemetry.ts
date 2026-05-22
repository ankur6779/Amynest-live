import { getApiUrl } from "@/lib/api";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { getFirebaseAuth } from "@/lib/firebase";
import type { StaticAudioMode } from "@workspace/static-audio/browser";

const SESSION_ALERT_THRESHOLD = 3;
const RETRY_DELAY_MS = 300;

let sessionFailureCount = 0;
let sessionAlertShown = false;
let clientCircuitOpen = false;
let clientCircuitUntil = 0;
const CLIENT_CIRCUIT_MS = 60_000;
const CLIENT_CIRCUIT_THRESHOLD = 5;

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
  return import.meta.env.VITE_STATIC_AUDIO_DEBUG === "true";
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
  const origin = res.headers.get("x-amynest-origin-cache") ?? undefined;

  if (cf.includes("HIT") || xCache.includes("HIT")) {
    clientCdnHits += 1;
  } else if (cf.includes("MISS") || xCache.includes("MISS")) {
    clientCdnMisses += 1;
  }

  if (import.meta.env.DEV || isStaticAudioDebug()) {
    console.log("[STATIC AUDIO CDN]", {
      cf: cf || "—",
      xCache: xCache || "—",
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
      variant: "destructive",
    });
  } catch {
    /* toast optional */
  }
}

function maybeShowSessionAlert(): void {
  if (sessionFailureCount <= SESSION_ALERT_THRESHOLD || sessionAlertShown) return;
  sessionAlertShown = true;
  void showStaticAudioToast(
    "Audio system issue",
    "Voice playback is having trouble. Please refresh the page.",
  );
}

function recordSessionFailure(): void {
  sessionFailureCount += 1;
  if (sessionFailureCount >= CLIENT_CIRCUIT_THRESHOLD) {
    clientCircuitOpen = true;
    clientCircuitUntil = Date.now() + CLIENT_CIRCUIT_MS;
    console.error("[STATIC AUDIO] Client circuit open — pausing playback attempts");
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
  opts?: { countTowardCircuit?: boolean },
): void {
  staticAudioVerbose(type, message, meta);
  console.error(`[STATIC AUDIO EVENT] ${type}`, message, meta ?? {});

  if (opts?.countTowardCircuit !== false) {
    recordSessionFailure();
  }

  if (typeof window === "undefined") return;

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
  reportStaticAudioEvent("static_audio_missing_url", "Catalog phrase has no proxy URL", {
    text: text.slice(0, 200),
    mode,
  });
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
  reportStaticAudioEvent(
    "static_audio_play_failed",
    message,
    {
      url: audio.src,
      mediaError: audio.error?.code,
      ...extra,
    },
    { countTowardCircuit: !isGestureBlock && !isAndroidWatchdog },
  );
  const phrase = typeof extra?.phrase === "string" ? extra.phrase : undefined;
  const mode = extra?.mode as StaticAudioMode | undefined;
  emitStaticAudioVisualFallback({ phrase, mode });
}

export async function checkStaticAudioHealthOnBoot(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const healthUrl = getApiUrl("/api/static-audio/health");
    const res = await fetch(healthUrl);
    recordClientCdnCacheStatus(healthUrl, res);
    const body = (await res.json().catch(() => ({}))) as {
      gcs?: boolean;
      bucket?: string;
      status?: string;
      circuitOpen?: boolean;
      gcsProbeOk?: boolean;
    };

    if (body.circuitOpen && !isAndroidAmyNestAudioClient()) {
      clientCircuitOpen = true;
      clientCircuitUntil = Date.now() + CLIENT_CIRCUIT_MS;
    }

    if (!res.ok || body.status !== "ok" || !body.gcs || body.gcsProbeOk === false) {
      console.error("STATIC AUDIO SYSTEM DOWN", { status: res.status, body });
      reportStaticAudioEvent(
        "static_audio_proxy_failed",
        "Static audio health check failed",
        { httpStatus: res.status, ...body },
        { countTowardCircuit: false },
      );
      return;
    }
    staticAudioVerbose("health ok", body);
  } catch (err) {
    console.error("STATIC AUDIO SYSTEM DOWN", err);
    reportStaticAudioEvent("static_audio_proxy_failed", "Static audio health check unreachable", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function installStaticAudioDevTools(): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;

  window.testStaticAudio = async (hash: string) => {
    const url = getApiUrl(`/api/static-audio/${hash}.mp3`);
    const res = await fetch(url);
    console.log("[testStaticAudio]", { status: res.status, url });
  };
}

declare global {
  interface Window {
    testStaticAudio?: (hash: string) => Promise<void>;
  }
}

/**
 * Audio health telemetry — batched client metrics for production monitoring.
 */

import { getApiUrl } from "@/lib/api";
import { getDeviceClass, getNetworkProfile } from "@/lib/amy-voice-pipeline-learning";
import type { SpeakOptions } from "@/lib/amy-voice-controller";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";

export type AudioHealthModule = "lesson" | "parentHub" | "phonics" | "coach";
export type AudioHealthLayer = "static" | "cache" | "api" | "streaming" | "emergency";

export type AudioHealthEventName =
  | "audio_success"
  | "audio_failure"
  | "audio_fallback"
  | "audio_start";

export type AudioHealthEvent = {
  event: AudioHealthEventName;
  module: AudioHealthModule;
  layer?: AudioHealthLayer;
  success?: boolean;
  fallbackUsed?: boolean;
  ttfaMs?: number;
  totalDurationMs?: number;
  bufferingEvents?: number;
  errorType?: string;
  device: "low" | "mid" | "high";
  network: "slow" | "fast";
  timestamp: number;
  sessionId?: string;
  from?: AudioHealthLayer | string;
  to?: AudioHealthLayer | string;
};

const BATCH_MIN = 10;
const BATCH_MAX = 20;
const FLUSH_INTERVAL_MS = 30_000;

const queue: AudioHealthEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sessionId = createSessionId();
let activeSpeak: { module: AudioHealthModule; startedAt: number } | null = null;
let lastEvent: AudioHealthEvent | null = null;
const overlayListeners = new Set<(event: AudioHealthEvent) => void>();

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function resolveAudioHealthModule(opts?: SpeakOptions): AudioHealthModule {
  if (opts?.lessonParagraph) return "lesson";
  if (opts?.parentHub) return "parentHub";
  if (opts?.coach) return "coach";
  if (opts?.mode === "phonics") return "phonics";
  return "coach";
}

export function mapAmyLayerToHealthLayer(
  layer?: AmyVoiceLayer | string,
  usedStreaming?: boolean,
): AudioHealthLayer | undefined {
  if (usedStreaming) return "streaming";
  switch (layer) {
    case "static":
      return "static";
    case "cache":
      return "cache";
    case "api":
    case "elevenlabs":
      return "api";
    case "emergency_local":
      return "emergency";
    default:
      return undefined;
  }
}

export function startAudioHealthSpeak(opts?: SpeakOptions): void {
  activeSpeak = {
    module: resolveAudioHealthModule(opts),
    startedAt: performance.now(),
  };
}

export function clearAudioHealthSpeak(): void {
  activeSpeak = null;
}

export function getLastAudioHealthEvent(): AudioHealthEvent | null {
  return lastEvent;
}

export function subscribeAudioHealthOverlay(
  listener: (event: AudioHealthEvent) => void,
): () => void {
  overlayListeners.add(listener);
  if (lastEvent) listener(lastEvent);
  return () => overlayListeners.delete(listener);
}

function notifyOverlay(event: AudioHealthEvent): void {
  lastEvent = event;
  for (const listener of overlayListeners) listener(event);
}

function baseEvent(
  partial: Omit<AudioHealthEvent, "device" | "network" | "timestamp" | "sessionId"> &
    Partial<Pick<AudioHealthEvent, "module">>,
): AudioHealthEvent {
  return {
    module: partial.module ?? activeSpeak?.module ?? "coach",
    device: getDeviceClass(),
    network: getNetworkProfile(),
    timestamp: Date.now(),
    sessionId,
    ...partial,
  };
}

export function logAudioHealth(
  partial: Omit<AudioHealthEvent, "device" | "network" | "timestamp" | "sessionId"> &
    Partial<Pick<AudioHealthEvent, "module">>,
): void {
  if (typeof window === "undefined") return;
  const event = baseEvent(partial);
  queue.push(event);
  notifyOverlay(event);

  if (import.meta.env.DEV) {
    console.info("[AudioHealth]", event);
  }

  if (queue.length >= BATCH_MAX) {
    void flushAudioHealthQueue();
    return;
  }

  if (!flushTimer) {
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      void flushAudioHealthQueue();
    }, FLUSH_INTERVAL_MS);
  }
}

export async function flushAudioHealthQueue(force = false): Promise<void> {
  if (queue.length === 0) return;
  if (!force && queue.length < BATCH_MIN) return;

  const batch = queue.splice(0, BATCH_MAX);
  try {
    const { getFirebaseAuth } = await import("@/lib/firebase");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const user = getFirebaseAuth().currentUser;
    if (user) {
      const token = await user.getIdToken().catch(() => null);
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    await fetch(getApiUrl("/api/audio-health"), {
      method: "POST",
      headers,
      body: JSON.stringify({ events: batch, sessionId }),
      keepalive: true,
    });
  } catch {
    queue.unshift(...batch);
  }
}

export function markAudioHealthAudibleStart(
  layer: AudioHealthLayer | undefined,
  opts?: { bufferingEvents?: number; startedAt?: number },
): void {
  const startedAt = opts?.startedAt ?? activeSpeak?.startedAt ?? performance.now();
  logAudioHealth({
    event: "audio_start",
    layer,
    ttfaMs: Math.max(0, Math.round(performance.now() - startedAt)),
    bufferingEvents: opts?.bufferingEvents ?? 0,
    success: true,
  });
}

export function logAudioHealthFailure(errorType: string, layer?: AudioHealthLayer): void {
  logAudioHealth({
    event: "audio_failure",
    success: false,
    layer,
    errorType,
  });
}

export function logAudioHealthSuccess(params: {
  layer?: AudioHealthLayer;
  fallbackUsed?: boolean;
  totalDurationMs?: number;
  bufferingEvents?: number;
}): void {
  logAudioHealth({
    event: "audio_success",
    success: true,
    layer: params.layer,
    fallbackUsed: params.fallbackUsed ?? false,
    totalDurationMs: params.totalDurationMs,
    bufferingEvents: params.bufferingEvents ?? 0,
  });
  clearAudioHealthSpeak();
}

export function logAudioHealthFallback(
  from: AudioHealthLayer | string,
  to: AudioHealthLayer | string,
): void {
  logAudioHealth({
    event: "audio_fallback",
    from,
    to,
    fallbackUsed: true,
    success: true,
    layer: typeof to === "string" ? (to as AudioHealthLayer) : to,
  });
}

/** Test-only reset. */
export function resetAudioHealthTelemetryForTests(): void {
  queue.length = 0;
  activeSpeak = null;
  lastEvent = null;
  sessionId = createSessionId();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

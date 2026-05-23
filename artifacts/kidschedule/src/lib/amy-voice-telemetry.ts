/**
 * Amy voice telemetry — layer fallback tracking + structured TTS playback logs.
 */

export type TtsAudioSource =
  | "local"
  | "remote"
  | "gcs"
  | "static"
  | "regenerated"
  | "unknown";

export type TtsDeviceInfo = "ios" | "android" | "web" | "other";

export type TtsLogPayload = {
  module: string;
  cacheKey?: string;
  source: TtsAudioSource;
  latencyMs: number;
  success: boolean;
  errorType?: string;
  requestId?: number;
  phase?: string;
  queueWaitMs?: number;
  playStartDelayMs?: number;
  device?: TtsDeviceInfo;
  network?: string;
};

/** Structured TTS playback log — one line per attempt for production triage. */
export function logTts(payload: TtsLogPayload): void {
  const line = { evt: "tts.playback", ...payload };
  if (payload.success) {
    if (import.meta.env.DEV) console.info("[TTS]", line);
  } else {
    console.warn("[TTS]", line);
  }
}

export type AmyVoiceLayer =
  | "static"
  | "cache"
  | "api"
  | "elevenlabs"
  | "phonics_sequence"
  | "speech_coach_split"
  | "emergency_local"
  | "text_visual";

export type AmyVoiceTelemetryEvent =
  | "static_success"
  | "cache_success"
  | "api_success"
  | "elevenlabs_success"
  | "phonics_sequence_success"
  | "speech_coach_split_success"
  | "emergency_local_success"
  | "text_visual_success"
  | "fallback_used"
  | "layer_failed"
  | "failure_chain";

const LOG = "[AMY VOICE]";

export type FailureChainEntry = {
  layer: AmyVoiceLayer | "static_alt_mode";
  error: string;
};

let lastSuccessLayer: AmyVoiceLayer | null = null;
let lastFailureChain: FailureChainEntry[] = [];

export function resetAmyVoiceTelemetry(): void {
  lastSuccessLayer = null;
  lastFailureChain = [];
}

export function getLastAmyVoiceSuccessLayer(): AmyVoiceLayer | null {
  return lastSuccessLayer;
}

export function getLastAmyVoiceFailureChain(): readonly FailureChainEntry[] {
  return lastFailureChain;
}

function eventToLayer(event: AmyVoiceTelemetryEvent): AmyVoiceLayer | null {
  switch (event) {
    case "static_success":
      return "static";
    case "cache_success":
      return "cache";
    case "api_success":
      return "api";
    case "elevenlabs_success":
      return "elevenlabs";
    case "phonics_sequence_success":
      return "phonics_sequence";
    case "speech_coach_split_success":
      return "speech_coach_split";
    case "emergency_local_success":
      return "emergency_local";
    case "text_visual_success":
      return "text_visual";
    default:
      return null;
  }
}

export function recordAmyVoiceLayerSuccess(
  event: AmyVoiceTelemetryEvent,
  detail?: Record<string, unknown>,
): void {
  const layer = eventToLayer(event);
  if (layer) {
    lastSuccessLayer = layer;
    void import("@/lib/amy-voice-session").then((m) =>
      m.recordSessionLayerOutcome(layer, true),
    );
  }
  if (import.meta.env.DEV || import.meta.env.VITE_STATIC_AUDIO_DEBUG === "true") {
    console.info(LOG, event, detail ?? "");
  }
  reportAmyVoiceTelemetry(event, detail);
}

export function recordAmyVoiceLayerFailed(
  layer: AmyVoiceLayer | "static_alt_mode",
  error: string,
  detail?: Record<string, unknown>,
): void {
  lastFailureChain.push({ layer, error });
  if (layer !== "static_alt_mode") {
    void import("@/lib/amy-voice-session").then((m) =>
      m.recordSessionLayerOutcome(layer, false),
    );
  }
  if (import.meta.env.DEV || import.meta.env.VITE_STATIC_AUDIO_DEBUG === "true") {
    console.warn(LOG, "layer_failed", layer, error, detail ?? "");
  }
  reportAmyVoiceTelemetry("layer_failed", { layer, error, ...detail });
}

export function recordAmyVoiceFallbackUsed(
  fromLayer: AmyVoiceLayer | "static_alt_mode",
  toLayer: AmyVoiceLayer,
  detail?: Record<string, unknown>,
): void {
  if (import.meta.env.DEV) {
    console.info(LOG, "fallback_used", { from: fromLayer, to: toLayer, ...detail });
  }
  reportAmyVoiceTelemetry("fallback_used", { from: fromLayer, to: toLayer, ...detail });
}

export function recordAmyVoiceFailureChain(
  text: string,
  chain: readonly FailureChainEntry[],
  detail?: Record<string, unknown>,
): void {
  lastFailureChain = [...chain];
  console.error(LOG, "failure_chain", {
    text: text.slice(0, 120),
    chain,
    ...detail,
  });
  reportAmyVoiceTelemetry("failure_chain", {
    text: text.slice(0, 200),
    chain,
    ...detail,
  });
}

/** Rolling mode detection + fallback stats for tuning detection rules. */
export type AmyModeStatsSnapshot = {
  totalSpeaks: number;
  byMode: Record<
    string,
    {
      count: number;
      layers: Record<string, number>;
      fallbacks: Record<string, number>;
    }
  >;
};

const modeStats: AmyModeStatsSnapshot = { totalSpeaks: 0, byMode: {} };
const FALLBACK_LAYERS = new Set<AmyVoiceLayer | string>([
  "emergency_local",
  "text_visual",
  "phonics_sequence",
  "speech_coach_split",
]);

function ensureModeBucket(mode: string) {
  if (!modeStats.byMode[mode]) {
    modeStats.byMode[mode] = { count: 0, layers: {}, fallbacks: {} };
  }
  return modeStats.byMode[mode]!;
}

export function recordAmyModeOutcome(
  mode: string,
  layer: string,
  detail?: Record<string, unknown>,
): void {
  modeStats.totalSpeaks += 1;
  const bucket = ensureModeBucket(mode);
  bucket.count += 1;
  bucket.layers[layer] = (bucket.layers[layer] ?? 0) + 1;
  if (FALLBACK_LAYERS.has(layer)) {
    bucket.fallbacks[layer] = (bucket.fallbacks[layer] ?? 0) + 1;
  }
  if (import.meta.env.DEV && modeStats.totalSpeaks % 15 === 0) {
    console.info(LOG, "mode_stats", getAmyModeStatsSnapshot());
  }
  reportAmyVoiceTelemetry("fallback_used", {
    speechMode: mode,
    outcomeLayer: layer,
    modeStats: getAmyModeStatsSnapshot(),
    ...detail,
  });
}

export function getAmyModeStatsSnapshot(): AmyModeStatsSnapshot {
  return JSON.parse(JSON.stringify(modeStats)) as AmyModeStatsSnapshot;
}

function reportAmyVoiceTelemetry(
  type: AmyVoiceTelemetryEvent,
  meta?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  void (async () => {
    try {
      const { getApiUrl } = await import("@/lib/api");
      const { getFirebaseAuth } = await import("@/lib/firebase");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const user = getFirebaseAuth().currentUser;
      if (user) {
        const token = await user.getIdToken().catch(() => null);
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const logType = `amy_voice_${type}`;
      const summary =
        typeof meta?.error === "string"
          ? `${type}: ${meta.error}`
          : typeof meta?.layer === "string"
            ? `${type} (${meta.layer})`
            : type;

      const { getAdaptiveSnapshot } = await import("@/lib/amy-voice-adaptive");
      const { getAmyVoiceHealthSnapshot } = await import("@/lib/amy-voice-health");
      const { getAmyVoiceAnalyticsSnapshot } = await import("@/lib/amy-voice-analytics");
      const res = await fetch(getApiUrl("/api/log-client-error"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: logType,
          message: summary.slice(0, 4000),
          route: window.location.pathname,
          meta: {
            userAgent: navigator.userAgent,
            lastSuccessLayer,
            amyVoiceEvent: type,
            adaptive: getAdaptiveSnapshot(),
            health: getAmyVoiceHealthSnapshot(),
            analytics: getAmyVoiceAnalyticsSnapshot(),
            ...meta,
          },
        }),
        keepalive: true,
      });
      if (!res.ok && (import.meta.env.DEV || import.meta.env.VITE_STATIC_AUDIO_DEBUG === "true")) {
        console.warn(LOG, "telemetry rejected", res.status, logType);
      }
    } catch {
      /* never throw */
    }
  })();
}

/** Post-launch monitoring events (health alerts, periodic snapshots). */
export function reportAmyVoiceMonitoring(
  kind: "health_alert" | "health_snapshot" | "analytics" | "runtime_snapshot",
  meta?: Record<string, unknown>,
): void {
  if (import.meta.env.DEV || import.meta.env.VITE_STATIC_AUDIO_DEBUG === "true") {
    console.info(LOG, kind, meta ?? "");
  }
  reportAmyVoiceTelemetry("fallback_used", { monitoringKind: kind, ...meta });
}

/** Unified runtime snapshot — health, analytics, governance, experiments, delivery. */
export function reportAmyVoiceRuntimeSnapshot(meta?: Record<string, unknown>): void {
  void (async () => {
    try {
      const { getAmyVoiceRuntimeSnapshot } = await import("@/lib/amy-voice-delivery-profile");
      const runtime = await getAmyVoiceRuntimeSnapshot();
      if (import.meta.env.DEV || import.meta.env.VITE_STATIC_AUDIO_DEBUG === "true") {
        console.info(LOG, "runtime_snapshot", runtime);
      }
      reportAmyVoiceTelemetry("fallback_used", {
        monitoringKind: "runtime_snapshot",
        runtime,
        ...meta,
      });
    } catch {
      /* never throw */
    }
  })();
}

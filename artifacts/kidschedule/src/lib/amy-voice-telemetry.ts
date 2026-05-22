/**
 * Amy voice fallback telemetry — which layer succeeded and failure chains.
 */

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
  if (layer) lastSuccessLayer = layer;
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

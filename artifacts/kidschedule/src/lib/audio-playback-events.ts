/**
 * Unified audio playback telemetry — all narration paths emit the same event schema.
 */

export type AudioPlaybackEventName =
  | "audio_started"
  | "audio_completed"
  | "audio_failed"
  | "audio_interrupted"
  | "fallback_used"
  | "source_selected";

export type AudioPlaybackSource =
  | "amy_voice"
  | "phonics"
  | "spelling"
  | "poem_player"
  | "infant_sleep_mp3"
  | "event_prep"
  | "study"
  | "static"
  | "tts"
  | "emergency"
  | "unknown";

export type AudioPlaybackEventDetail = {
  source: AudioPlaybackSource;
  layer?: string;
  phrase?: string;
  proxyUrl?: string;
  error?: string;
  fallback?: string;
  interruptedBy?: string;
};

const LOG = "[AudioPlayback]";

export function emitAudioPlaybackEvent(
  event: AudioPlaybackEventName,
  detail: AudioPlaybackEventDetail,
): void {
  const payload = { evt: event, ...detail, ts: Date.now() };
  if (event === "audio_failed" || event === "audio_interrupted") {
    console.warn(LOG, payload);
  } else if (import.meta.env.DEV || event === "fallback_used") {
    console.info(LOG, payload);
  }
}

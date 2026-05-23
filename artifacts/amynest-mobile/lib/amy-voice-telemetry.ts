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
  const line = {
    evt: "tts.playback",
    ...payload,
  };
  if (payload.success) {
    if (__DEV__) console.info("[TTS]", line);
  } else {
    console.warn("[TTS]", line);
  }
}

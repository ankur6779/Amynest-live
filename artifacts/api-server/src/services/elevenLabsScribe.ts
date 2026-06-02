import { getElevenLabsApiKey, isElevenLabsFallbackEnabled } from "../lib/env";
import { logger } from "../lib/logger";

/** Scribe v1 — ElevenLabs speech-to-text model (per product request). */
export const ELEVEN_SCRIBE_MODEL_ID = "scribe_v1";

/** Hard cap so transcription never blocks the AI worker indefinitely. */
const SCRIBE_TIMEOUT_MS = 20_000;

export function isElevenLabsScribeEnabled(): boolean {
  return isElevenLabsFallbackEnabled();
}

/**
 * Transcribe a short audio clip with ElevenLabs Scribe v1.
 *
 * Used only by the live "Talk with Amy" conversation coach. All other speech
 * features stay on Whisper. Returns the plain transcript, or throws so the
 * caller can fall back to Whisper.
 */
export async function transcribeWithElevenLabsScribe(
  audio: Buffer,
  format: "wav" | "mp3",
): Promise<string> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) throw new Error("scribe_missing_api_key");

  const mime = format === "wav" ? "audio/wav" : "audio/mpeg";
  const filename = format === "wav" ? "speech.wav" : "speech.mp3";

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: mime }), filename);
  form.append("model_id", ELEVEN_SCRIBE_MODEL_ID);
  // Children speak English in the coach; a hint improves short-clip accuracy.
  form.append("language_code", "eng");
  form.append("timestamps_granularity", "none");
  form.append("diarize", "false");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCRIBE_TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
      signal: controller.signal,
    });

    const durationMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      logger.error(
        { evt: "scribe.error", status: response.status, durationMs, detail: detail.slice(0, 300) },
        `[Scribe] Error: HTTP ${response.status}`,
      );
      throw new Error(`scribe_upstream_${response.status}`);
    }

    const data = (await response.json().catch(() => null)) as { text?: unknown } | null;
    const text = typeof data?.text === "string" ? data.text.trim() : "";

    logger.info(
      { evt: "scribe.success", durationMs, chars: text.length },
      "[Scribe] transcription ok",
    );
    return text;
  } finally {
    clearTimeout(timer);
  }
}

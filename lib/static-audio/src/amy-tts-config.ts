/**
 * Canonical Amy TTS configuration — single source of truth for model, voice, and format.
 * All server, client, and build scripts MUST import from here (never hardcode model IDs).
 */

/** English Indian Female — Ananya K (Amy default voice). */
export const AMY_TTS_VOICE_ID = "QbQKfe9vgx5OsbZUvlFv";

/** Primary low-latency ElevenLabs model for all Amy dynamic TTS. */
export const AMY_TTS_MODEL_ID = "eleven_flash_v2_5";

/** Use when Flash is unavailable on the ElevenLabs account (override via AMY_TTS_MODEL_ID env). */
export const AMY_TTS_MODEL_FALLBACK = "eleven_turbo_v2_5";

export const AMY_TTS_OUTPUT_FORMAT = "mp3_44100_128";

/** ElevenLabs streaming latency tier (0–4; 4 = lowest latency). */
export const AMY_TTS_STREAM_LATENCY = 4;

/** Resolve model from optional env override; never returns mixed IDs at runtime. */
export function resolveAmyTtsModelId(envOverride?: string | null): string {
  const raw = (envOverride ?? "").trim();
  if (raw === AMY_TTS_MODEL_ID || raw === AMY_TTS_MODEL_FALLBACK) return raw;
  return AMY_TTS_MODEL_ID;
}

/** @deprecated Use AMY_TTS_MODEL_ID */
export const AMY_MODEL_ID_FLASH = AMY_TTS_MODEL_ID;

/** @deprecated Use AMY_TTS_MODEL_ID */
export const AMY_MODEL_ID_DEFAULT = AMY_TTS_MODEL_ID;

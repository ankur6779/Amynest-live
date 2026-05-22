import { readResolvedApiJson, type AuthFetchFn } from "@/lib/poll-result";
import {
  isValidAudioUrl,
  resolveClientPlaybackUrl,
  type TtsSynthesizeResponse,
} from "@/lib/tts-playback";
import type { StaticAudioMode } from "@workspace/static-audio/browser";

/** English Indian Female — Ananya K (legacy Amy ElevenLabs voice). */
export const ELEVENLABS_VOICE_EN_FEMALE = "QbQKfe9vgx5OsbZUvlFv";
export const ELEVENLABS_MODEL_EN = "eleven_turbo_v2_5";

const OPENAI_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
]);

export function resolveElevenLabsVoiceIds(
  voiceId?: string,
  modelId?: string,
): { voiceId: string; modelId: string } {
  const vid = voiceId?.trim() ?? "";
  if (vid.length >= 15 && !OPENAI_VOICES.has(vid.toLowerCase())) {
    return {
      voiceId: vid,
      modelId: modelId?.trim() || ELEVENLABS_MODEL_EN,
    };
  }
  return { voiceId: ELEVENLABS_VOICE_EN_FEMALE, modelId: ELEVENLABS_MODEL_EN };
}

/**
 * Optional Amy pipeline layer — POST /api/tts/elevenlabs-fallback.
 * Uses legacy ElevenLabs cache when available; server calls ElevenLabs only if needed.
 */
export async function generateElevenLabsFallbackTts(
  authFetch: AuthFetchFn,
  text: string,
  opts?: { mode?: StaticAudioMode; voiceId?: string; modelId?: string },
): Promise<TtsSynthesizeResponse> {
  const phrase = text.trim();
  if (!phrase) return { success: false, ok: false, error: "tts_empty_text" };

  const { voiceId, modelId } = resolveElevenLabsVoiceIds(opts?.voiceId, opts?.modelId);
  const mode = opts?.mode === "phonics" ? "phonics" : "default";

  try {
    const res = await authFetch("/api/tts/elevenlabs-fallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: phrase, voiceId, modelId, mode }),
    });
    const data = await readResolvedApiJson<{
      ok?: boolean;
      url?: string;
      audioUrl?: string;
      cacheKey?: string;
      cached?: boolean;
      error?: string;
    }>(res, authFetch).catch(() => null);

    if (res.status === 503) {
      return { success: false, ok: false, error: "elevenlabs_fallback_disabled" };
    }
    if (!res.ok || !data?.ok) {
      return {
        success: false,
        ok: false,
        error: data?.error ?? `elevenlabs_failed_${res.status}`,
      };
    }
    const audioUrl = data.url ?? data.audioUrl;
    if (!isValidAudioUrl(audioUrl)) {
      return { success: false, ok: false, error: "tts_invalid_audio_url" };
    }
    const playbackUrl = resolveClientPlaybackUrl(audioUrl, data.cacheKey) ?? audioUrl;
    return {
      success: true,
      ok: true,
      audioUrl: playbackUrl,
      cacheKey: data.cacheKey,
      cached: data.cached,
    };
  } catch {
    return { success: false, ok: false, error: "elevenlabs_failed" };
  }
}

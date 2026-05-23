import { resolveApiMediaUrl } from "@/lib/api";
import { audioManager } from "@/lib/audio-manager";
import {
  isCatalogPhrase,
  logDynamicTtsViolation,
} from "@/lib/static-audio";
import { readResolvedApiJson, type AuthFetchFn } from "@/lib/poll-result";
import { getTtsRequestTimeoutMs } from "@/lib/tts-guard";
import {
  getPhonicsAudioText,
  getPhonemeAudioText,
  getCvcWordAudioText,
  formatBlendLine,
} from "@workspace/phonics-sounds";
import type { StaticAudioMode } from "@workspace/static-audio/browser";

const LOG = "[TTS]";

/** Reject missing URLs and template strings that contain the literal "undefined". */
export function isValidAudioUrl(audioUrl: string | null | undefined): audioUrl is string {
  const u = (audioUrl ?? "").trim();
  return u.length > 0 && !u.includes("undefined");
}

export type TtsSynthesizeResponse = {
  ok?: boolean;
  success?: boolean;
  audioUrl?: string;
  cacheKey?: string;
  cached?: boolean;
  error?: string;
};

/** Create an `HTMLAudioElement` for a resolved HTTPS or API stream URL. */
export function playAudio(url: string): HTMLAudioElement | null {
  if (!isValidAudioUrl(url)) {
    return null;
  }
  try {
    return audioManager.create(url);
  } catch (e) {
    console.error("Invalid audio URL", url, e);
    return null;
  }
}

function resolvePhrase(body: Record<string, unknown>): string {
  const phonemeKey = String(body.phoneme ?? "").trim();
  const cvcWord = String(body.word ?? "").trim().toLowerCase();
  const blendWord = String(body.blend ?? "").trim().toLowerCase();
  const letterKey = String(body.letter ?? "").trim().toLowerCase();
  const raw = String(body.text ?? "").trim();

  if (phonemeKey) return getPhonemeAudioText(phonemeKey);
  if (blendWord) return formatBlendLine(blendWord);
  if (letterKey) return getPhonicsAudioText(letterKey);
  if (cvcWord && !raw) return getCvcWordAudioText(cvcWord);
  return getPhonicsAudioText(raw) || raw;
}

/**
 * Unified TTS — always POST /api/tts/generate (OpenAI, cache-first).
 */
export async function generateTts(
  authFetch: AuthFetchFn,
  body: Record<string, unknown>,
  init?: Omit<RequestInit, "method" | "body" | "headers"> & {
    headers?: Record<string, string>;
  },
): Promise<TtsSynthesizeResponse> {
  const phonemeKey = String(body.phoneme ?? "").trim();
  const cvcWord = String(body.word ?? "").trim().toLowerCase();
  const blendWord = String(body.blend ?? "").trim().toLowerCase();
  const letterKey = String(body.letter ?? "").trim().toLowerCase();
  const phrase = resolvePhrase(body);
  if (!phrase && !phonemeKey && !cvcWord && !blendWord && !letterKey) {
    return { success: false, ok: false, error: "tts_empty_text" };
  }

  const mode: StaticAudioMode = body.mode === "phonics" ? "phonics" : "default";
  if (phrase && isCatalogPhrase(phrase, mode) && import.meta.env.DEV) {
    logDynamicTtsViolation(phrase, mode);
  }

  try {
    const voiceOverride = String(body.voice ?? body.voiceId ?? "").trim();
    const payload: Record<string, unknown> = {
      text: phrase,
      letter: letterKey || undefined,
      phoneme: phonemeKey || undefined,
      word: cvcWord || undefined,
      blend: blendWord || undefined,
      speed: body.speed ?? 0.9,
      mode,
      category: body.category ?? (mode === "phonics" ? "phonics" : "words"),
    };
    // Omit voice when unset — server uses OPENAI_TTS_VOICE (coral/nova female default).
    // Never default to "alloy" here; it sounds male/neutral and bypasses server config.
    if (voiceOverride) payload.voice = voiceOverride;

    const res = await authFetch(
      "/api/tts/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...init?.headers },
        body: JSON.stringify(payload),
        signal: init?.signal,
      },
      getTtsRequestTimeoutMs(),
    );
    const data = await readResolvedApiJson<{
      ok?: boolean;
      url?: string;
      audioUrl?: string;
      cacheKey?: string;
      cached?: boolean;
      error?: string;
    }>(res, authFetch).catch(() => null);
    if (!res.ok || !data?.ok) {
      return { success: false, ok: false, error: data?.error ?? `generate_failed_${res.status}` };
    }
    const audioUrl = data.url ?? data.audioUrl;
    if (!isValidAudioUrl(audioUrl)) {
      return { success: false, ok: false, error: "tts_invalid_audio_url" };
    }
    return {
      success: true,
      ok: true,
      audioUrl,
      cacheKey: data.cacheKey,
      cached: data.cached,
    };
  } catch {
    return { success: false, ok: false, error: "tts_failed" };
  }
}

/** @deprecated Alias — all callers should use generateTts. */
export const synthesizeTtsWithBackgroundPoll = generateTts;

/** @deprecated Alias — all callers should use generateTts. */
export const synthesizeTts = generateTts;

export function resolveTtsAudioUrl(audioUrl: string): string {
  return resolveApiMediaUrl(audioUrl);
}

export function resolveClientPlaybackUrl(
  audioUrl: string,
  cacheKey?: string,
): string | null {
  if (!isValidAudioUrl(audioUrl)) return null;
  const resolved = resolveTtsAudioUrl(audioUrl);
  if (
    typeof window !== "undefined" &&
    cacheKey &&
    resolved.includes("storage.googleapis.com")
  ) {
    return resolveTtsAudioUrl(`/api/tts/audio/${cacheKey}.mp3`);
  }
  return resolved;
}

export function logTtsClient(step: string, detail?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.info(LOG, step, detail ?? "");
  }
}

export function logTtsClientError(step: string, err: unknown, detail?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(LOG, step, message, detail ?? "");
}

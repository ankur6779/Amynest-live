/**
 * Temporary bypass: route Phonics / Blending / Spelling off phonics-library &
 * spelling-library URLs onto the same static catalog path as Parent Hub / lessons.
 */
import { getPhonicsAudioText } from "@workspace/phonics-sounds";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import type { SpeakOptions } from "@/lib/amy-voice-controller";
import { lookupStaticAudioUrl } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";

export const BYPASS_PHONICS_SPELLING_LIBRARIES = true;

/** Static phrase for Abacus voice probe — proves TTS vs catalog path. */
export const ABACUS_STATIC_TTS_PROBE =
  "count with me from 1 to 5. tap each item as you say the number.";

export function shouldBypassPhonicsSpellingLibraries(): boolean {
  return BYPASS_PHONICS_SPELLING_LIBRARIES;
}

export function resolvePhonicsCatalogPhrase(
  input: string,
  phoneme?: string | null,
): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";
  const fromLetter = getPhonicsAudioText(trimmed.toLowerCase());
  const candidates = [fromLetter, trimmed, (phoneme ?? "").trim()].filter(Boolean);
  for (const phrase of candidates) {
    if (lookupStaticAudioUrl(phrase, "phonics")) return phrase;
    if (lookupStaticAudioUrl(phrase, "default")) return phrase;
  }
  return fromLetter || trimmed;
}

export function hasStaticCatalogAudio(phrase: string): boolean {
  const resolved = resolvePhonicsCatalogPhrase(phrase);
  if (!resolved) return false;
  return (
    Boolean(lookupStaticAudioUrl(resolved, "phonics")) ||
    Boolean(lookupStaticAudioUrl(resolved, "default"))
  );
}

export function catalogPlaybackSpeakOptions(
  phrase: string,
  extra?: Partial<SpeakOptions>,
): SpeakOptions {
  const text = phrase.trim();
  return {
    catalogPlayback: true,
    staticCatalogTexts: text ? [text] : undefined,
    waitUntilEnd: true,
    ...extra,
  };
}

/** Play a static catalog clip through audioManager (controller prepared URL). */
export async function playCatalogPreparedUrl(
  phrase: string,
  opts?: {
    playbackRate?: number;
    isCancelled?: () => boolean;
    source?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const resolved = resolvePhonicsCatalogPhrase(phrase);
  if (!resolved) return { ok: false, error: "tts_empty_text" };
  if (opts?.isCancelled?.()) return { ok: false, error: "tts_cancelled" };

  for (const mode of ["phonics", "default"] as const) {
    const raw = lookupStaticAudioUrl(resolved, mode);
    if (!raw) continue;
    recordTtsUserGesture();
    const result = await amyVoiceController.playPreparedUrl(raw, {
      source: opts?.source ?? "catalog",
      phrase: resolved,
      srcType: "static",
      playbackRate: opts?.playbackRate,
      isCancelled: opts?.isCancelled,
      waitUntilEnd: true,
    });
    if (result.success) return { ok: true };
    if (opts?.isCancelled?.()) return { ok: false, error: "tts_cancelled" };
    return { ok: false, error: result.error ?? "playback_failed" };
  }
  return { ok: false, error: "tts_static_missing_url" };
}

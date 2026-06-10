/**
 * Temporary bypass: route Phonics / Blending / Spelling off phonics-library &
 * spelling-library URLs onto the same static catalog path as Parent Hub / lessons.
 */
import { getPhonicsAudioText } from "@workspace/phonics-sounds";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import type { SpeakOptions } from "@/lib/amy-voice-controller";
import { lookupStaticAudioUrl } from "@/lib/static-audio";
import type { StaticAudioMode } from "@workspace/static-audio/browser";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import {
  getAudioTraceModule,
  traceAudioManagerPlayResult,
  traceBrokenModulePreflight,
  tracePlayPreparedUrlInput,
} from "@/lib/audio-root-cause-trace";

export const BYPASS_PHONICS_SPELLING_LIBRARIES = false;

/** Static phrase for Abacus voice probe — proves TTS vs catalog path. */
export const ABACUS_STATIC_TTS_PROBE =
  "count with me from 1 to 5. tap each item as you say the number.";

export function shouldBypassPhonicsSpellingLibraries(): boolean {
  return BYPASS_PHONICS_SPELLING_LIBRARIES;
}

/** Short isolated CVC/sight words must never map to default-catalog lesson paragraphs. */
function isIsolatedPhonicsWord(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^[a-z]{2,5}$/.test(t) && !/\s/.test(t);
}

export function resolvePhonicsCatalogPhrase(
  input: string,
  phoneme?: string | null,
): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";
  const fromLetter = getPhonicsAudioText(trimmed.toLowerCase());
  const candidates = [fromLetter, trimmed, (phoneme ?? "").trim()].filter(Boolean);
  const phonicsOnly = isIsolatedPhonicsWord(trimmed);
  for (const phrase of candidates) {
    if (lookupStaticAudioUrl(phrase, "phonics")) return phrase;
    if (!phonicsOnly && lookupStaticAudioUrl(phrase, "default")) return phrase;
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
  const traceModule = getAudioTraceModule();
  if (traceModule) {
    traceBrokenModulePreflight(traceModule, {
      audioIdentity: undefined,
      resolvedText: resolved,
      staticCatalogTexts: resolved ? [resolved] : undefined,
      catalogPlayback: true,
    });
  }
  if (!resolved) return { ok: false, error: "tts_empty_text" };
  if (opts?.isCancelled?.()) return { ok: false, error: "tts_cancelled" };

  const modes: StaticAudioMode[] = isIsolatedPhonicsWord(resolved)
    ? ["phonics"]
    : ["phonics", "default"];
  for (const mode of modes) {
    const raw = lookupStaticAudioUrl(resolved, mode);
    if (!raw) continue;
    if (traceModule && !tracePlayPreparedUrlInput(traceModule, raw)) {
      return { ok: false, error: "tts_static_missing_url" };
    }
    recordTtsUserGesture();
    const result = await amyVoiceController.playPreparedUrl(raw, {
      source: opts?.source ?? "catalog",
      phrase: resolved,
      srcType: "static",
      playbackRate: opts?.playbackRate,
      isCancelled: opts?.isCancelled,
      waitUntilEnd: true,
    });
    if (traceModule) {
      traceAudioManagerPlayResult(traceModule, result.success);
    }
    if (result.success) return { ok: true };
    if (opts?.isCancelled?.()) return { ok: false, error: "tts_cancelled" };
    return { ok: false, error: result.error ?? "playback_failed" };
  }
  if (traceModule) {
    traceAudioManagerPlayResult(traceModule, false);
  }
  return { ok: false, error: "tts_static_missing_url" };
}

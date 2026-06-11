/**
 * Temporary bypass: route Phonics / Blending / Spelling off phonics-library &
 * spelling-library URLs onto the same static catalog path as Parent Hub / lessons.
 */
import { getPhonicsAudioText } from "@workspace/phonics-sounds";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import type { SpeakOptions } from "@/lib/amy-voice-controller";
import { lookupStaticAudioUrlStrict } from "@/lib/static-audio";
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

/** Short tile clips (letters, digraphs, CVC) — never map to Parent Hub lesson paragraphs. */
export function isPhonicsOnlyCatalogText(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/^[a-z]{1,5}$/.test(t)) return true;
  if (/^[a-z]{1,2}\s+as\s+in\s+[a-z]+$/i.test(t)) return true;
  return false;
}

export type PhonicsCatalogResolveOptions = {
  phoneme?: string | null;
  /** When true, never resolve or play from the default Parent Hub / lesson catalog. */
  phonicsOnly?: boolean;
};

export function resolvePhonicsCatalogPhrase(
  input: string,
  phonemeOrOpts?: string | null | PhonicsCatalogResolveOptions,
  legacyPhonicsOnly?: boolean,
): string {
  const opts: PhonicsCatalogResolveOptions =
    typeof phonemeOrOpts === "object" && phonemeOrOpts !== null
      ? phonemeOrOpts
      : { phoneme: phonemeOrOpts ?? null, phonicsOnly: legacyPhonicsOnly };
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";
  const fromLetter = getPhonicsAudioText(trimmed.toLowerCase());
  const candidates = [fromLetter, trimmed, (opts.phoneme ?? "").trim()].filter(Boolean);
  const phonicsOnly = opts.phonicsOnly || isPhonicsOnlyCatalogText(trimmed);
  for (const phrase of candidates) {
    if (lookupStaticAudioUrlStrict(phrase, "phonics")) return phrase;
    if (!phonicsOnly && lookupStaticAudioUrlStrict(phrase, "default")) return phrase;
  }
  return fromLetter || trimmed;
}

export function hasStaticCatalogAudio(
  phrase: string,
  opts?: { phonicsOnly?: boolean },
): boolean {
  const resolved = resolvePhonicsCatalogPhrase(phrase, {
    phonicsOnly: opts?.phonicsOnly,
  });
  if (!resolved) return false;
  if (opts?.phonicsOnly || isPhonicsOnlyCatalogText(resolved)) {
    return Boolean(lookupStaticAudioUrlStrict(resolved, "phonics"));
  }
  return (
    Boolean(lookupStaticAudioUrlStrict(resolved, "phonics")) ||
    Boolean(lookupStaticAudioUrlStrict(resolved, "default"))
  );
}

/** Phonics tiles — availability checks must not treat Parent Hub lesson clips as phoneme audio. */
export function hasPhonicsStaticCatalogAudio(phrase: string): boolean {
  return hasStaticCatalogAudio(phrase, { phonicsOnly: true });
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
    phonicsOnly?: boolean;
  },
): Promise<{ ok: boolean; error?: string }> {
  const resolved = resolvePhonicsCatalogPhrase(phrase, {
    phonicsOnly: opts?.phonicsOnly,
  });
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

  const phonicsOnly = opts?.phonicsOnly || isPhonicsOnlyCatalogText(resolved);
  const modes: StaticAudioMode[] = phonicsOnly ? ["phonics"] : ["phonics", "default"];
  for (const mode of modes) {
    const raw = lookupStaticAudioUrlStrict(resolved, mode);
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

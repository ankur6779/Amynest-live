import {
  delay,
  getPhonicsAudioText,
  getPhonicsWordAudioText,
  getPhonemeAudioText,
  getCvcWordAudioText,
  getCvcWordEntry,
  playCvcBlend,
  resolveGraphemeToAudioKey,
  resolvePhonicsPlaybackText as resolvePhonicsPlaybackTextShared,
  type CvcWordEntry,
  type CvcBlendPhase,
  type PlayCvcBlendOptions,
} from "@workspace/phonics-sounds";
import { phonicsEnginePlayCvcBlend } from "@/lib/phonics-audio-engine";
import { audioManager } from "@/lib/audio-manager";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import {
  playPhonicsStaticAudio,
  playPhonicsSequence,
  playBlendPhonemeClip,
  playPhonicsContentAudio,
  prefetchPhonicsAudioKeys,
  resolvePhonicsAudioKey,
} from "@/lib/phonics-static-audio";
import { lookupStaticAudioUrl } from "@/lib/static-audio";
import {
  playCatalogPreparedUrl,
  resolvePhonicsCatalogPhrase,
  shouldBypassPhonicsSpellingLibraries,
} from "@/lib/unified-catalog-playback";
import type { SpeakOptions, SpeakResult } from "@/hooks/use-amy-voice";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";

export type PhonicsSpeakFn = (
  text: string,
  opts?: SpeakOptions & { phoneme?: string; word?: string },
) => Promise<SpeakResult>;

const DEFAULT_SLOW_GAP_MS = 350;
const DEFAULT_FAST_GAP_MS = 120;

export function resolvePhonicsPlaybackText(input: {
  symbol: string;
  phoneme?: string | null;
  sound?: string;
}): string {
  return resolvePhonicsPlaybackTextShared(input);
}

/** True for short hub clips (single words / phonemes) — skip heavy TTS pipeline. */
export function isPhonicsHubFastClip(text: string, opts?: SpeakOptions): boolean {
  if (shouldBypassPhonicsSpellingLibraries() || opts?.catalogPlayback) {
    return false;
  }
  if (opts?.lessonParagraph || opts?.parentHub || opts?.coach || opts?.narration) {
    return false;
  }
  const t = (text ?? "").trim();
  if (!t || t.length > 32) return false;
  if (opts?.mode === "phonics") return true;
  return !/\s/.test(t);
}

/**
 * Fast phonics hub playback — library MP3 only (no wrong fallbacks).
 */
export async function speakPhonicsFastClip(
  text: string,
  opts?: {
    phoneme?: string;
    playbackRate?: number;
    isCancelled?: () => boolean;
  },
): Promise<SpeakResult & { layer?: AmyVoiceLayer }> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { success: false, error: "tts_empty_text" };
  if (opts?.isCancelled?.()) return { success: false, error: "tts_cancelled" };

  recordTtsUserGesture();

  const audioKey =
    resolvePhonicsAudioKey({
      text: trimmed,
      phoneme: opts?.phoneme ?? null,
      letter: trimmed,
    }) ?? null;

  if (audioKey) {
    const local = await playPhonicsStaticAudio(audioKey, {
      waitUntilEnd: true,
      playbackRate: opts?.playbackRate,
      isCancelled: opts?.isCancelled,
    });
    if (local.ok) return { success: true, layer: "static" };
    if (local.error === "phonics_cancelled" || opts?.isCancelled?.()) {
      return { success: false, error: "tts_cancelled" };
    }
    if (local.error === "phonics_library_missing") {
      return { success: false, error: "phonics_audio_preparing" };
    }
  }

  if (opts?.isCancelled?.()) return { success: false, error: "tts_cancelled" };

  const contentTypes = ["cvc", "sight_word", "sentence", "quiz"] as const;
  for (const contentType of contentTypes) {
    const library = await playPhonicsContentAudio(trimmed, {
      contentType,
      waitUntilEnd: true,
      playbackRate: opts?.playbackRate,
      isCancelled: opts?.isCancelled,
    });
    if (library.ok) return { success: true, layer: "static" };
    if (library.error === "phonics_cancelled" || opts?.isCancelled?.()) {
      return { success: false, error: "tts_cancelled" };
    }
  }

  if (shouldBypassPhonicsSpellingLibraries()) {
    const phrase = resolvePhonicsCatalogPhrase(trimmed, opts?.phoneme);
    const catalog = await playCatalogPreparedUrl(phrase, {
      playbackRate: opts?.playbackRate,
      isCancelled: opts?.isCancelled,
      source: "phonics-catalog-fallback",
    });
    if (catalog.ok) return { success: true, layer: "static" };
    if (opts?.isCancelled?.()) return { success: false, error: "tts_cancelled" };
    return { success: false, error: catalog.error ?? "tts_static_missing_url" };
  }

  {
    const phrase = resolvePhonicsCatalogPhrase(trimmed, opts?.phoneme);
    const catalog = await playCatalogPreparedUrl(phrase, {
      playbackRate: opts?.playbackRate,
      isCancelled: opts?.isCancelled,
      source: "phonics-static-catalog",
    });
    if (catalog.ok) return { success: true, layer: "static" };
    if (opts?.isCancelled?.()) return { success: false, error: "tts_cancelled" };
  }

  return { success: false, error: "phonics_audio_preparing" };
}

async function playStaticKey(
  audioKey: string,
  meta?: { phoneme?: string; word?: string; phase?: CvcBlendPhase },
  opts?: { isCancelled?: () => boolean; playbackRate?: number },
): Promise<SpeakResult> {
  if (opts?.isCancelled?.()) return { success: false, error: "cancelled" };
  if (meta?.phase === "word" && meta?.word) {
    return playCvcWordFinale(meta.word, opts);
  }
  const res = await playBlendPhonemeClip(audioKey, {
    isCancelled: opts?.isCancelled,
    playbackRate: opts?.playbackRate,
  });
  if (res.ok) return { success: true };
  return { success: false, error: res.error };
}

/** Whole-word clip from static catalog — canonical controller prepared URL playback. */
async function playCvcWordFinale(
  word: string,
  opts?: { isCancelled?: () => boolean },
): Promise<SpeakResult> {
  const w = word.trim().toLowerCase();
  if (!w) return { success: false, error: "empty_word" };
  if (opts?.isCancelled?.()) return { success: false, error: "cancelled" };

  recordTtsUserGesture();

  const library = await playPhonicsContentAudio(w, {
    contentType: "cvc",
    isCancelled: opts?.isCancelled,
    waitUntilEnd: true,
  });
  if (library.ok) return { success: true, layer: "static" };

  if (shouldBypassPhonicsSpellingLibraries()) {
    const catalog = await playCatalogPreparedUrl(w, {
      isCancelled: opts?.isCancelled,
      source: "phonics-cvc-word-fallback",
    });
    if (catalog.ok) return { success: true, layer: "static" };
  }

  for (const mode of ["phonics", "default"] as const) {
    if (opts?.isCancelled?.()) return { success: false, error: "cancelled" };
    const proxyUrl = lookupStaticAudioUrl(w, mode);
    if (!proxyUrl) continue;
    const result = await amyVoiceController.playPreparedUrl(proxyUrl, {
      source: "phonics",
      phrase: w,
      srcType: "static",
      isCancelled: opts?.isCancelled,
      waitUntilEnd: true,
    });
    if (result.success) return result;
  }

  const entry = getCvcWordEntry(w);
  if (entry) {
    for (let i = 0; i < entry.phonemes.length; i++) {
      if (opts?.isCancelled?.()) return { success: false, error: "cancelled" };
      const key = resolveGraphemeToAudioKey(entry.phonemes[i]!) ?? entry.phonemes[i]!.trim().toLowerCase();
      const res = await playBlendPhonemeClip(key, { isCancelled: opts?.isCancelled });
      if (!res.ok) return { success: false, error: res.error };
      if (i < entry.phonemes.length - 1) await delay(70);
    }
    return { success: true };
  }

  return { success: false, error: "word_finale_unresolved" };
}

async function playGraphemeBlend(
  word: string,
  options?: {
    slow?: boolean;
    onLetter?: (index: number, letter: string) => void;
  },
): Promise<void> {
  const w = word.trim().toLowerCase();
  if (!w) return;

  const slowGap = options?.slow ? 650 : DEFAULT_SLOW_GAP_MS;
  const fastGap = DEFAULT_FAST_GAP_MS;

  const runPass = async (gap: number) => {
    const keys = w.split("").filter((ch) => /[a-z]/.test(ch));
    for (let i = 0; i < keys.length; i++) {
      const ch = keys[i]!;
      const audioKey = resolveGraphemeToAudioKey(ch);
      if (!audioKey) continue;
      options?.onLetter?.(i, ch);
      await playPhonicsStaticAudio(audioKey, { waitUntilEnd: true });
      await delay(gap);
    }
  };

  if (options?.slow !== false) {
    await runPass(slowGap);
  }
  await runPass(fastGap);
}

export async function playPhonicsBlend(
  word: string,
  _speak?: PhonicsSpeakFn,
  options?: {
    delayMs?: number;
    slow?: boolean;
    onLetter?: (index: number, letter: string) => void;
  },
): Promise<void> {
  const w = word.trim().toLowerCase();
  if (!w) return;

  const entry = getCvcWordEntry(w);
  if (entry) {
    await playCvcBlendWithSpeak(entry, {
      skipSlowPass: options?.slow === false,
      slowGapMs: options?.slow ? 650 : (options?.delayMs ?? DEFAULT_SLOW_GAP_MS),
      fastGapMs: DEFAULT_FAST_GAP_MS,
      onPhoneme: (idx, phase) => {
        if (phase === "word") {
          options?.onLetter?.(-1, w);
          return;
        }
        if (idx >= 0) {
          const letters = w.split("");
          options?.onLetter?.(idx, letters[idx] ?? "");
        }
      },
    });
    return;
  }

  await playPhonicsSequence(w, {
    waitUntilEnd: true,
    gapMs: options?.slow ? 650 : DEFAULT_FAST_GAP_MS,
  });
  if (options?.onLetter) {
    w.split("").forEach((ch, i) => options.onLetter?.(i, ch));
  }
}

export async function playCvcBlendWithSpeak(
  wordObj: CvcWordEntry,
  options?: PlayCvcBlendOptions & {
    onPhoneme?: (index: number, phase: CvcBlendPhase) => void;
    isCancelled?: () => boolean;
    fastPlaybackRate?: number;
  },
): Promise<void> {
  const keys = wordObj.phonemes.map((p) => resolveGraphemeToAudioKey(p) ?? p.trim().toLowerCase());
  prefetchPhonicsAudioKeys(keys);

  await phonicsEnginePlayCvcBlend(wordObj, {
    skipSlowPass: options?.skipSlowPass ?? false,
    isCancelled: options?.isCancelled,
    onStep: (index, step) => {
      if (step.kind === "word") {
        options?.onPhoneme?.(-1, "word");
        return;
      }
      options?.onPhoneme?.(index, options?.skipSlowPass ? "fast" : "slow");
    },
  });
}

export {
  getPhonicsAudioText,
  getPhonicsWordAudioText,
  getPhonemeAudioText,
  getCvcWordAudioText,
  playCvcBlend,
};

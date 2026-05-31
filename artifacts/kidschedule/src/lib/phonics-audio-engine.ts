/**
 * Central phonics audio orchestration — delegates to phonics-player (single owner).
 *
 * Speech-coach freeze: no new Audio() paths here. All playback goes through
 * phonics-static-audio → playPhonicsUrl().
 */
import type { CvcWordEntry } from "@workspace/phonics-sounds";
import { CVC_WORDS, resolveGraphemeToAudioKey } from "@workspace/phonics-sounds";
import {
  playBlendPhonemeClip,
  playPhonicsContentAudio,
  prefetchPhonicsAudioKeys,
  prefetchPhonicsContentTexts,
} from "@/lib/phonics-static-audio";
import {
  isPhonicsPlaying,
  stopPhonicsPlayback,
  subscribePhonicsPlayback,
} from "@/lib/phonics-player";
import {
  checkPhonicsLetterClip,
  checkPhonicsWordClip,
  validatePhonicsWordAudio,
} from "@/lib/phonics-audio-availability";
import { recordPhonicsTelemetry } from "@/lib/phonics-telemetry";
import { shouldBypassPhonicsSpellingLibraries } from "@/lib/unified-catalog-playback";

export { subscribePhonicsPlayback, isPhonicsPlaying, stopPhonicsPlayback };
export { validatePhonicsWordAudio };

/** @deprecated use validatePhonicsWordAudio — validates word + phoneme + blend clips */
export function validatePhonicsAudioManifest(): ReturnType<typeof validateAllCvcWordAudio> {
  return validateAllCvcWordAudio();
}

export type PhonicsWordAudioValidation = {
  word: string;
  wordAudio: boolean;
  phonemeAudio: boolean[];
  blendAudio: boolean;
  available: boolean;
};

/** Validate every shipped CVC word has word + phoneme + blend clips in manifest. */
export function validateAllCvcWordAudio(): {
  ok: boolean;
  words: PhonicsWordAudioValidation[];
  missing: PhonicsWordAudioValidation[];
} {
  const seen = new Set<string>();
  const words: PhonicsWordAudioValidation[] = [];
  for (const entry of CVC_WORDS) {
    if (seen.has(entry.word)) continue;
    seen.add(entry.word);
    words.push(validatePhonicsWordAudio(entry.word, entry.phonemes));
  }
  const missing = words.filter((w) => !w.available);
  return { ok: missing.length === 0, words, missing };
}

let sessionToken = 0;

export type PhonicsEnginePlayOptions = {
  playbackRate?: number;
  isCancelled?: () => boolean;
  childId?: number;
  lessonId?: string;
  wordId?: string;
  level?: number;
};

/** Stop all phonics audio and invalidate in-flight queues. */
export async function phonicsEngineStop(reason = "engine_stop"): Promise<void> {
  sessionToken += 1;
  stopPhonicsPlayback(reason);
}

function isSessionActive(token: number): boolean {
  return token === sessionToken;
}

async function playLetterClipDirect(
  audioKey: string,
  options: PhonicsEnginePlayOptions = {},
): Promise<{ ok: boolean; error?: string }> {
  const result = await playBlendPhonemeClip(audioKey, {
    playbackRate: options.playbackRate,
    isCancelled: options.isCancelled,
  });
  if (result.ok) return { ok: true };
  return { ok: false, error: result.error };
}

async function playWordClipDirect(
  word: string,
  options: PhonicsEnginePlayOptions = {},
): Promise<{ ok: boolean; error?: string }> {
  const result = await playPhonicsContentAudio(word, {
    contentType: "cvc",
    waitUntilEnd: true,
    playbackRate: options.playbackRate,
    isCancelled: options.isCancelled,
  });
  if (result.ok) return { ok: true };
  return { ok: false, error: result.error };
}

/** Always stop prior clip before starting — for single user taps only. */
export async function phonicsEnginePlayLetter(
  audioKey: string,
  options: PhonicsEnginePlayOptions = {},
): Promise<{ ok: boolean; error?: string }> {
  const key = (audioKey ?? "").trim().toLowerCase();
  if (!shouldBypassPhonicsSpellingLibraries()) {
    const availability = checkPhonicsLetterClip(key);
    if (!availability.available) {
      return { ok: false, error: "phonics_audio_preparing" };
    }
  }

  await phonicsEngineStop("engine_play_letter");
  if (options.isCancelled?.()) return { ok: false, error: "phonics_cancelled" };

  recordPhonicsTelemetry("phonics_audio_started", {
    audioId: key,
    wordId: options.wordId,
    lessonId: options.lessonId,
    childId: options.childId,
    level: options.level,
    clipType: "letter",
  });

  const result = await playLetterClipDirect(key, options);

  if (result.ok) {
    recordPhonicsTelemetry("phonics_audio_completed", {
      audioId: key,
      wordId: options.wordId,
      lessonId: options.lessonId,
    });
    return { ok: true };
  }

  recordPhonicsTelemetry("phonics_audio_failed", {
    audioId: key,
    wordId: options.wordId,
    error: result.error,
  });
  return { ok: false, error: result.error };
}

export async function phonicsEnginePlayWord(
  word: string,
  options: PhonicsEnginePlayOptions = {},
): Promise<{ ok: boolean; error?: string }> {
  const w = (word ?? "").trim().toLowerCase();
  const availability = checkPhonicsWordClip(w);
  if (!availability.available) {
    return { ok: false, error: "phonics_audio_preparing" };
  }

  await phonicsEngineStop("engine_play_word");
  if (options.isCancelled?.()) return { ok: false, error: "phonics_cancelled" };

  recordPhonicsTelemetry("phonics_audio_started", {
    audioId: w,
    wordId: options.wordId ?? w,
    lessonId: options.lessonId,
    clipType: "cvc",
  });

  const result = await playWordClipDirect(w, options);

  if (result.ok) {
    recordPhonicsTelemetry("phonics_audio_completed", { audioId: w, wordId: w });
    return { ok: true };
  }

  recordPhonicsTelemetry("phonics_audio_failed", { audioId: w, error: result.error });
  return { ok: false, error: result.error };
}

export type CvcBlendQueueStep = {
  id: string;
  kind: "phoneme" | "word";
  audioKey: string;
};

/** Build sequential blend queue: b → a → t → bat (no loops). */
export function buildCvcBlendQueue(
  entry: CvcWordEntry,
  opts?: { includeWordFinale?: boolean },
): CvcBlendQueueStep[] {
  const steps: CvcBlendQueueStep[] = [];
  for (let i = 0; i < entry.phonemes.length; i++) {
    const p = entry.phonemes[i]!;
    const audioKey = resolveGraphemeToAudioKey(p) ?? p.trim().toLowerCase();
    steps.push({ id: `${entry.word}-p${i}-${audioKey}`, kind: "phoneme", audioKey });
  }
  if (opts?.includeWordFinale !== false) {
    steps.push({ id: `${entry.word}-whole`, kind: "word", audioKey: entry.word });
  }
  return steps;
}

/** Preload all clips for a lesson word — call on user gesture at lesson entry. */
export function phonicsEnginePreloadWord(entry: CvcWordEntry): void {
  const keys = entry.phonemes.map(
    (p) => resolveGraphemeToAudioKey(p) ?? p.trim().toLowerCase(),
  );
  prefetchPhonicsAudioKeys(keys);
  prefetchPhonicsContentTexts([entry.word], "cvc");
}

/**
 * Play CVC blend queue sequentially — stop once at start, then one clip at a time.
 * Never calls phonicsEngineStop between steps (that would break the queue).
 */
export async function phonicsEnginePlayCvcBlend(
  entry: CvcWordEntry,
  options: PhonicsEnginePlayOptions & {
    skipSlowPass?: boolean;
    onStep?: (index: number, step: CvcBlendQueueStep) => void;
  } = {},
): Promise<{ ok: boolean; error?: string }> {
  await phonicsEngineStop("engine_blend_start");
  const token = sessionToken;
  if (options.isCancelled?.()) return { ok: false, error: "phonics_cancelled" };

  if (!shouldBypassPhonicsSpellingLibraries()) {
    const validation = validatePhonicsWordAudio(entry.word, entry.phonemes);
    if (!validation.available) {
      recordPhonicsTelemetry("phonics_audio_manifest_missing", {
        wordId: entry.word,
        validation,
      });
      return { ok: false, error: "phonics_audio_preparing" };
    }
  }

  recordPhonicsTelemetry("phonics_audio_started", {
    audioId: entry.word,
    wordId: entry.word,
    clipType: "cvc_blend",
    level: options.level,
  });

  const phonemeSteps = buildCvcBlendQueue(entry, { includeWordFinale: false });
  const wordStep = buildCvcBlendQueue(entry).find((s) => s.kind === "word");
  const gapMs = options.skipSlowPass ? 120 : 350;

  const runStep = async (step: CvcBlendQueueStep, index: number, rate = 1) => {
    if (!isSessionActive(token) || options.isCancelled?.()) {
      return { ok: false as const, error: "phonics_cancelled" };
    }
    options.onStep?.(index, step);
    if (step.kind === "word") {
      return playWordClipDirect(step.audioKey, { ...options, playbackRate: rate });
    }
    return playLetterClipDirect(step.audioKey, { ...options, playbackRate: rate });
  };

  for (let i = 0; i < phonemeSteps.length; i++) {
    const step = phonemeSteps[i]!;
    const res = await runStep(step, i, options.skipSlowPass ? 1.12 : 1);
    if (!res.ok) return res;
    if (i < phonemeSteps.length - 1) {
      await new Promise((r) => setTimeout(r, gapMs));
    }
  }

  if (wordStep) {
    await new Promise((r) => setTimeout(r, 150));
    const res = await runStep(wordStep, phonemeSteps.length, 1);
    if (!res.ok) return res;
  }

  if (isSessionActive(token)) {
    recordPhonicsTelemetry("phonics_audio_completed", { audioId: entry.word, wordId: entry.word });
  }
  return { ok: true };
}

export async function phonicsEnginePlaySequence(
  audioKeys: string[],
  options: PhonicsEnginePlayOptions & { gapMs?: number } = {},
): Promise<{ ok: boolean; error?: string }> {
  await phonicsEngineStop("engine_sequence");
  const token = sessionToken;
  prefetchPhonicsAudioKeys(audioKeys);

  for (let i = 0; i < audioKeys.length; i++) {
    if (!isSessionActive(token) || options.isCancelled?.()) {
      return { ok: false, error: "phonics_cancelled" };
    }
    const key = audioKeys[i]!;
    if (!shouldBypassPhonicsSpellingLibraries()) {
      const availability = checkPhonicsLetterClip(key);
      if (!availability.available) {
        return { ok: false, error: "phonics_audio_preparing" };
      }
    }
    const res = await playLetterClipDirect(key, options);
    if (!res.ok) return res;
    if (i < audioKeys.length - 1) {
      await new Promise((r) => setTimeout(r, options.gapMs ?? 120));
    }
  }
  return { ok: true };
}

/** Pause/resume — phonics-player uses HTMLAudioElement; pause via stop for now. */
export function phonicsEnginePause(): void {
  stopPhonicsPlayback("engine_pause");
}

export async function phonicsEnginePreload(id: string): Promise<void> {
  const key = id.trim().toLowerCase();
  prefetchPhonicsAudioKeys([key]);
  prefetchPhonicsContentTexts([key], "cvc");
}

export function phonicsEngineRelease(): void {
  void phonicsEngineStop("engine_release");
}

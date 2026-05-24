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
import {
  playPhonicsStaticAudio,
  playPhonicsSequence,
  playBlendPhonemeClip,
  prefetchPhonicsAudioKeys,
} from "@/lib/phonics-static-audio";
import { audioManager } from "@/lib/audio-manager";
import { lookupStaticAudioUrl, prepareStaticPlaybackAudio } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import type { SpeakOptions, SpeakResult } from "@/hooks/use-amy-voice";

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

/** Whole-word clip from static catalog — uses speech pipeline (blob-safe on Android). */
async function playCvcWordFinale(
  word: string,
  opts?: { isCancelled?: () => boolean },
): Promise<SpeakResult> {
  const w = word.trim().toLowerCase();
  if (!w) return { success: false, error: "empty_word" };
  if (opts?.isCancelled?.()) return { success: false, error: "cancelled" };

  recordTtsUserGesture();

  for (const mode of ["phonics", "default"] as const) {
    if (opts?.isCancelled?.()) return { success: false, error: "cancelled" };
    const proxyUrl = lookupStaticAudioUrl(w, mode);
    if (!proxyUrl) continue;
    const audio = await prepareStaticPlaybackAudio(w, mode, { quiet: true });
    if (!audio) continue;
    const started = await audioManager.play(
      audio,
      {
        proxyUrl,
        source: "cvc-word-finale",
        phrase: w,
        channel: "speech",
        interrupt: true,
      },
      { channel: "speech", interrupt: true, maxRetries: 0, skipForceRestart: true },
    );
    if (!started) continue;
    const ended = await audioManager.waitUntilEnd(audio, () => opts?.isCancelled?.() ?? false);
    if (ended.ok) return { success: true };
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
    /** Playback rate for fast repeat pass (default 1.12). */
    fastPlaybackRate?: number;
  },
): Promise<void> {
  const keys = wordObj.phonemes.map((p) => resolveGraphemeToAudioKey(p) ?? p.trim().toLowerCase());
  prefetchPhonicsAudioKeys(keys);

  const skipSlow = options?.skipSlowPass ?? false;
  const fastRate = options?.fastPlaybackRate ?? 1.12;

  await playCvcBlend(
    wordObj,
    async (audioKey, meta) => {
      const res = await playStaticKey(audioKey, meta, {
        isCancelled: options?.isCancelled,
        playbackRate: meta?.phase === "fast" ? fastRate : 1,
      });
      return { success: res.success };
    },
    {
      includeWordFinale: options?.includeWordFinale ?? true,
      ...options,
      skipFastPass: options?.skipFastPass ?? !skipSlow,
      isCancelled: options?.isCancelled,
    },
  );
}

export {
  getPhonicsAudioText,
  getPhonicsWordAudioText,
  getPhonemeAudioText,
  getCvcWordAudioText,
  playCvcBlend,
};

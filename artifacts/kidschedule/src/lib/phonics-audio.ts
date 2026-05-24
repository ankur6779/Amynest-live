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
  prefetchPhonicsAudioKeys,
} from "@/lib/phonics-static-audio";
import { audioManager } from "@/lib/audio-manager";
import { lookupStaticAudioUrl } from "@/lib/static-audio";
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
): Promise<SpeakResult> {
  if (meta?.phase === "word" && meta?.word) {
    return playCvcWordFinale(meta.word);
  }
  const res = await playPhonicsStaticAudio(audioKey, { waitUntilEnd: true });
  if (res.ok) return { success: true };
  return { success: false, error: res.error };
}

/** Whole-word clip from static catalog (word_cat in GCS), not /phonics-audio/{letter}.mp3. */
async function playCvcWordFinale(word: string): Promise<SpeakResult> {
  const w = word.trim().toLowerCase();
  if (!w) return { success: false, error: "empty_word" };

  recordTtsUserGesture();
  audioManager.stop();

  const url =
    lookupStaticAudioUrl(w, "phonics") ??
    lookupStaticAudioUrl(getCvcWordAudioText(w), "phonics") ??
    lookupStaticAudioUrl(w, "default");
  if (url) {
    const audio = audioManager.create(url);
    const started = await audioManager.play(
      audio,
      { proxyUrl: url, source: "cvc-word-finale", phrase: w },
      { channel: "ui", interrupt: true },
    );
    if (!started) return { success: false, error: "word_finale_play_failed" };
    const ended = await audioManager.waitUntilEnd(audio, () => false);
    return ended.ok ? { success: true } : { success: false, error: ended.error };
  }

  const entry = getCvcWordEntry(w);
  if (entry) {
    const res = await playPhonicsSequence(w, { waitUntilEnd: true, gapMs: 60 });
    return res.ok ? { success: true } : { success: false, error: res.error };
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
  },
): Promise<void> {
  const keys = wordObj.phonemes.map((p) => resolveGraphemeToAudioKey(p) ?? p.trim().toLowerCase());
  prefetchPhonicsAudioKeys(keys);

  await playCvcBlend(
    wordObj,
    async (audioKey, meta) => {
      const res = await playStaticKey(audioKey, meta);
      return { success: res.success };
    },
    {
      includeWordFinale: true,
      skipFastPass: true,
      ...options,
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

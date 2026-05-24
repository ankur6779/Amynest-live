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
} from "@/lib/phonics-static-audio";
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
  meta?: { phoneme?: string; word?: string },
): Promise<SpeakResult> {
  const res = await playPhonicsStaticAudio(audioKey, { waitUntilEnd: true });
  if (res.ok) return { success: true };
  return { success: false, error: res.error };
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
  await playCvcBlend(
    wordObj,
    async (audioKey, meta) => {
      const res = await playStaticKey(audioKey, meta);
      return { success: res.success };
    },
    { includeWordFinale: false, ...options },
  );
}

export {
  getPhonicsAudioText,
  getPhonicsWordAudioText,
  getPhonemeAudioText,
  getCvcWordAudioText,
  playCvcBlend,
};

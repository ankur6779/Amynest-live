import {
  delay,
  getPhonicsAudioText,
  getPhonicsWordAudioText,
  getPhonemeAudioText,
  getCvcWordAudioText,
  getCvcWordEntry,
  playCvcBlend,
  resolvePhonicsLetterFromSymbol,
  type CvcWordEntry,
  type CvcBlendPhase,
  type PlayCvcBlendOptions,
} from "@workspace/phonics-sounds";
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
  const key = resolvePhonicsLetterFromSymbol(input.symbol, input.phoneme ?? null);
  if (key) return getPhonicsAudioText(key);
  if (input.phoneme) return getPhonicsAudioText(input.phoneme);
  if (/ as in /i.test(input.sound ?? "")) return input.sound!.trim();
  return input.sound?.trim() || input.symbol;
}

async function playGraphemeBlend(
  word: string,
  speak: PhonicsSpeakFn,
  options?: {
    slow?: boolean;
    onLetter?: (index: number, letter: string) => void;
  },
): Promise<void> {
  const letters = word.split("").filter((ch) => /[a-z]/.test(ch));
  if (letters.length === 0) return;

  const slowGap = options?.slow ? 650 : DEFAULT_SLOW_GAP_MS;
  const fastGap = DEFAULT_FAST_GAP_MS;
  const rateOpts: SpeakOptions = { mode: "phonics", waitUntilEnd: true };

  if (options?.slow !== false) {
    for (let i = 0; i < letters.length; i++) {
      const ch = letters[i]!;
      options?.onLetter?.(i, ch);
      await speak(getPhonicsAudioText(ch), rateOpts);
      await delay(slowGap);
    }
  }

  for (let i = 0; i < letters.length; i++) {
    const ch = letters[i]!;
    options?.onLetter?.(i, ch);
    await speak(getPhonicsAudioText(ch), rateOpts);
    await delay(fastGap);
  }

  await delay(150);
  options?.onLetter?.(-1, word);
  await speak(getCvcWordAudioText(word), { ...rateOpts, word });
}

export async function playPhonicsBlend(
  word: string,
  speak: PhonicsSpeakFn,
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
    await playCvcBlendWithSpeak(entry, speak, {
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

  await playGraphemeBlend(w, speak, options);
}

export async function playCvcBlendWithSpeak(
  wordObj: CvcWordEntry,
  speak: PhonicsSpeakFn,
  options?: PlayCvcBlendOptions & {
    onPhoneme?: (index: number, phase: CvcBlendPhase) => void;
  },
): Promise<void> {
  await playCvcBlend(
    wordObj,
    async (text, meta) => {
      const res = await speak(text, {
        mode: "phonics",
        waitUntilEnd: true,
        phoneme: meta?.phoneme,
        word: meta?.word,
      });
      return { success: res.success };
    },
    options,
  );
}

export {
  getPhonicsAudioText,
  getPhonicsWordAudioText,
  getPhonemeAudioText,
  getCvcWordAudioText,
  playCvcBlend,
};

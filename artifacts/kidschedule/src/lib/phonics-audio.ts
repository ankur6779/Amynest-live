import {
  delay,
  getPhonicsAudioText,
  getPhonicsWordAudioText,
  getPhonemeAudioText,
  getCvcWordAudioText,
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

/** Resolve tile/API fields to the TTS phrase children should hear. */
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

/** Legacy letter-by-letter blend (non-IPA). Prefer playCVCBlend when dataset has the word. */
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

  const gap = options?.slow ? 650 : (options?.delayMs ?? 400);
  const rateOpts: SpeakOptions = { mode: "phonics" };

  const letters = w.split("").filter((ch) => /[a-z]/.test(ch));
  for (let i = 0; i < letters.length; i++) {
    const ch = letters[i]!;
    options?.onLetter?.(i, ch);
    const res = await speak(getPhonicsAudioText(ch), rateOpts);
    if (!res.success) return;
    await delay(gap);
  }

  options?.onLetter?.(-1, w);
  await speak(getPhonicsWordAudioText(w), rateOpts);
}

/** IPA phoneme CVC blend: slow → fast → whole word. */
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

import type { CvcWordEntry } from "./cvc.js";
import { getCvcWordAudioText, getPhonemeAudioText } from "./cvc.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type CvcBlendPhase = "slow" | "fast" | "word";

export type CvcBlendSpeakFn = (
  text: string,
  meta?: { phoneme?: string; word?: string; phase?: CvcBlendPhase },
) => Promise<{ success: boolean }>;

export type PlayCvcBlendOptions = {
  onPhoneme?: (index: number, phase: CvcBlendPhase) => void;
  slowGapMs?: number;
  fastGapMs?: number;
  /** Skip the slow first pass (e.g. repeat only). */
  skipSlowPass?: boolean;
};

/**
 * Three-step CVC blend: slow phonemes → fast phonemes → whole word.
 * Uses PHONEME_AUDIO lines (k sound, a as in apple), never letter names.
 */
export async function playCvcBlend(
  wordObj: CvcWordEntry,
  speak: CvcBlendSpeakFn,
  options?: PlayCvcBlendOptions,
): Promise<void> {
  const { phonemes, word } = wordObj;
  const slowGap = options?.slowGapMs ?? 350;
  const fastGap = options?.fastGapMs ?? 120;

  if (!options?.skipSlowPass) {
    for (let i = 0; i < phonemes.length; i++) {
      const p = phonemes[i]!;
      options?.onPhoneme?.(i, "slow");
      const res = await speak(getPhonemeAudioText(p), { phoneme: p, phase: "slow" });
      if (!res.success) return;
      await delay(slowGap);
    }
  }

  for (let i = 0; i < phonemes.length; i++) {
    const p = phonemes[i]!;
    options?.onPhoneme?.(i, "fast");
    const res = await speak(getPhonemeAudioText(p), { phoneme: p, phase: "fast" });
    if (!res.success) return;
    await delay(fastGap);
  }

  options?.onPhoneme?.(-1, "word");
  await speak(getCvcWordAudioText(word), { word, phase: "word" });
}

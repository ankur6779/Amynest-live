import type { CvcWordEntry } from "./cvc.js";
import { resolveGraphemeToAudioKey } from "./phoneme-map.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type CvcBlendPhase = "slow" | "fast" | "word";

export type CvcBlendSpeakFn = (
  audioKey: string,
  meta?: { phoneme?: string; word?: string; phase?: CvcBlendPhase },
) => Promise<{ success: boolean }>;

export type PlayCvcBlendOptions = {
  onPhoneme?: (index: number, phase: CvcBlendPhase) => void;
  slowGapMs?: number;
  fastGapMs?: number;
  /** Skip the slow first pass (e.g. repeat only). */
  skipSlowPass?: boolean;
  /** Play whole word after phoneme sequence (default false — phoneme-only blending). */
  includeWordFinale?: boolean;
};

function phonemeToAudioKey(phoneme: string): string {
  return resolveGraphemeToAudioKey(phoneme) ?? phoneme.trim().toLowerCase();
}

/**
 * CVC blend: slow phonemes → fast phonemes → optional whole word.
 * Uses static phoneme audio keys — never letter names or runtime TTS.
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
      const audioKey = phonemeToAudioKey(p);
      options?.onPhoneme?.(i, "slow");
      await speak(audioKey, { phoneme: p, phase: "slow" });
      await delay(slowGap);
    }
  }

  for (let i = 0; i < phonemes.length; i++) {
    const p = phonemes[i]!;
    const audioKey = phonemeToAudioKey(p);
    options?.onPhoneme?.(i, "fast");
    await speak(audioKey, { phoneme: p, phase: "fast" });
    await delay(fastGap);
  }

  if (options?.includeWordFinale) {
    await delay(150);
    options?.onPhoneme?.(-1, "word");
    await speak(word.trim().toLowerCase(), { word, phase: "word" });
  }
}

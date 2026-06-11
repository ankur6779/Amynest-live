/**
 * Preload phonics clips for the active V2 lesson — uses existing prefetch APIs only.
 */
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import { prefetchPhonicsAudioKeys, prefetchPhonicsContentTexts } from "@/lib/phonics-static-audio";
import { resolveGraphemeToAudioKey } from "@workspace/phonics-sounds";

export function prefetchCvcWordAudio(word: string): void {
  const entry = getCvcWordEntry(word.trim().toLowerCase());
  if (!entry) {
    prefetchPhonicsContentTexts([word.trim().toLowerCase()], "cvc");
    return;
  }
  const keys = entry.phonemes.map(
    (p) => resolveGraphemeToAudioKey(p) ?? p.trim().toLowerCase(),
  );
  prefetchPhonicsAudioKeys(keys);
  prefetchPhonicsContentTexts([entry.word], "cvc");
}

export function prefetchCvcWordList(words: string[]): void {
  const unique = [...new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean))];
  for (const w of unique.slice(0, 8)) {
    prefetchCvcWordAudio(w);
  }
}

export function prefetchFamilyAudio(familyWords: string[]): void {
  prefetchCvcWordList(familyWords);
}

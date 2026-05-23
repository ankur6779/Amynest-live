import { SPELLING_WORDS } from "./words.js";

/**
 * Lines for static-audio pre-generation.
 * - Full words (Learn / Parent / Dictation cues when curated).
 * - Multi-character chunks & syllables (digraphs, vowel teams) — single letters
 *   use live TTS at runtime (too many collisions with the phonics catalog).
 */
export function getSpellingAudioTextsForStaticCatalog(): string[] {
  const lines = new Set<string>();
  for (const entry of SPELLING_WORDS) {
    const word = entry.word.trim();
    if (word) lines.add(word);
    for (const chunk of entry.chunks) {
      const c = chunk.trim();
      if (c.length >= 2) lines.add(c);
    }
    for (const syllable of entry.syllables) {
      const s = syllable.trim();
      if (s.length >= 2 && s !== word) lines.add(s);
    }
  }
  return [...lines];
}

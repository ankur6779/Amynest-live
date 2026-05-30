import { getAllCatalogEntries } from "./manifest.js";

/**
 * Lines for static-audio pre-generation.
 * - Full words (Learn / Parent / Dictation cues when curated).
 * - Multi-character chunks & syllables (digraphs, vowel teams) — single letters
 *   use live TTS at runtime (too many collisions with the phonics catalog).
 */
/**
 * Word-level audio corpus for legacy static-audio map.
 * @deprecated Spelling Mastery uses spelling-audio-manifest.json (OpenAI v2 library).
 */
export function getSpellingAudioTextsForStaticCatalog(): string[] {
  const lines = new Set<string>();
  for (const entry of getAllCatalogEntries()) {
    const word = entry.word.trim();
    if (word) lines.add(word);
    for (const chunk of entry.sounds) {
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

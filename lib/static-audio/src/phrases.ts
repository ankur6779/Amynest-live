import { getMathTrickAudioTextsForStaticCatalog } from "@workspace/math-tricks";
import { getSpellingAudioTextsForStaticCatalog } from "@workspace/spelling-catalog";
import { getPhonicsAudioTextByLetter } from "@workspace/phonics-sounds";
import { normalizeStaticAudioKey } from "./normalize.js";
import type { StaticAudioMode, StaticTtsEntry } from "./types.js";

/** Instructional TTS lines per letter/digraph — OpenAI phonics catalog. */
export const PHONEME_PROMPTS: Record<string, string> = getPhonicsAudioTextByLetter();

/** UI feedback and coaching lines used across games, phonics, and study flows. */
const UI_PHRASES: string[] = [
  "Good job!",
  "Try again",
  "Well done",
  "Let's learn phonics",
  "Correct! Well done!",
  "Great job!",
  "Amazing!",
  "Nice work!",
  "You got it!",
  "Almost there!",
  "Keep going!",
  "Let's try again",
  "Listen carefully",
  "Your turn!",
  "Tap to hear Amy",
];

const TIER_12_24M_SOUNDS = [
  "Moo.",
  "Woof. Woof.",
  "Meow.",
  "Baa.",
  "Quack.",
  "Oink.",
  "Roar!",
  "Tweet tweet.",
  "Vroom vroom!",
  "Ding ding.",
];

function unique(entries: StaticTtsEntry[]): StaticTtsEntry[] {
  const seen = new Set<string>();
  const out: StaticTtsEntry[] = [];
  for (const e of entries) {
    const text = e.text.trim();
    if (!text) continue;
    const key = `${e.mode}\0${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text, mode: e.mode });
  }
  return out;
}

/**
 * Phrases that must live in static-audio-map.json (OpenAI pre-generated).
 * Phonics curriculum clips are validated separately via check:phonics-library
 * and served from phonics-audio-map.json (ElevenLabs GCS library).
 */
export function getStaticTtsEntries(): StaticTtsEntry[] {
  const entries: StaticTtsEntry[] = [];

  for (const text of UI_PHRASES) {
    entries.push({ text, mode: "default" });
  }

  for (const text of TIER_12_24M_SOUNDS) {
    entries.push({ text, mode: "default" });
  }

  for (const text of getMathTrickAudioTextsForStaticCatalog()) {
    entries.push({ text, mode: "default" });
  }

  for (const text of getSpellingAudioTextsForStaticCatalog()) {
    entries.push({ text, mode: "default" });
  }

  return unique(entries);
}

function staticTtsLookupKey(text: string, mode: StaticAudioMode): string {
  return `${mode}\0${normalizeStaticAudioKey(text)}`;
}

/** Fast lookup set for server-side guards. */
export function buildStaticTtsLookup(): Set<string> {
  return new Set(getStaticTtsEntries().map((e) => staticTtsLookupKey(e.text, e.mode)));
}

export function isStaticTtsText(
  rawText: string,
  mode: StaticAudioMode = "default",
  lookup?: Set<string>,
): boolean {
  const text = rawText.trim();
  if (!text) return false;
  const key = staticTtsLookupKey(text, mode);
  if (lookup) return lookup.has(key);
  return buildStaticTtsLookup().has(key);
}

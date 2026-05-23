import { getMathTrickAudioTextsForStaticCatalog } from "@workspace/math-tricks";
import { getSpellingAudioTextsForStaticCatalog } from "@workspace/spelling-catalog";
import {
  formatBlendLine,
  getPhonicsAudioTextByLetter,
  getPhonicsAudioTextsForStaticCatalog,
  getCvcPhonemeAudioTextsForStaticCatalog,
  CVC_WORDS as PHONICS_CVC_ENTRIES,
} from "@workspace/phonics-sounds";
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

// ─── Canonical phonics catalog (mirrors api-server/scripts/seedPhonics.ts) ───

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

const ALPHABET: Array<[string, string, string]> = [
  ["A", "ah", "Apple"],
  ["B", "buh", "Ball"],
  ["C", "kuh", "Cat"],
  ["D", "duh", "Dog"],
  ["E", "eh", "Egg"],
  ["F", "fff", "Fish"],
  ["G", "guh", "Goat"],
  ["H", "huh", "Hat"],
  ["I", "ih", "Igloo"],
  ["J", "juh", "Jug"],
  ["K", "kuh", "Kite"],
  ["L", "lll", "Lion"],
  ["M", "mmm", "Moon"],
  ["N", "nnn", "Nest"],
  ["O", "oh", "Orange"],
  ["P", "puh", "Pig"],
  ["Q", "kwuh", "Queen"],
  ["R", "rrr", "Rain"],
  ["S", "sss", "Sun"],
  ["T", "tuh", "Tiger"],
  ["U", "uh", "Umbrella"],
  ["V", "vvv", "Van"],
  ["W", "wuh", "Water"],
  ["X", "ks", "Box"],
  ["Y", "yuh", "Yo-yo"],
  ["Z", "zzz", "Zebra"],
];

const CVC_WORDS: Array<[string, string]> = [
  ["cat", "c–a–t"],
  ["bat", "b–a–t"],
  ["hat", "h–a–t"],
  ["mat", "m–a–t"],
  ["pen", "p–e–n"],
  ["bed", "b–e–d"],
  ["pig", "p–i–g"],
  ["pin", "p–i–n"],
  ["dog", "d–o–g"],
  ["pot", "p–o–t"],
  ["cup", "c–u–p"],
  ["bus", "b–u–s"],
];

const SIGHT_WORDS = ["the", "and", "is", "it", "to"];

const SIMPLE_SENTENCES = [
  "The cat is fat.",
  "I see a red bus.",
  "Mum and Dad play.",
  "The sun is up.",
  "I like my hat.",
  "The dog is in bed.",
];

const DIGRAPHS: Array<[string, string, string]> = [
  ["sh", "shhh", "ship"],
  ["ch", "chuh", "chop"],
  ["th", "thhh", "thumb"],
  ["wh", "wuh", "whale"],
  ["ph", "fff", "phone"],
  ["ck", "kuh", "duck"],
];

const STORY_LINES = [
  "The little duck sat by the pond.",
  "She saw a big ship sail past.",
  "A whale popped up and waved hello.",
  "The duck laughed and flapped her wings.",
  "What a fun day at the pond!",
];

/** Legacy kidschedule fallback lines (phonics-content.ts) not in seed. */
const LEGACY_PHONICS_SOUNDS: string[] = [
  "Ba",
  "Ma",
  "Da",
  "Pa",
  "Na",
  "Moo",
  "Baa",
  "Woof",
  "Meow",
  "Quack",
  "A says ah",
  "B says buh",
  "C says kuh",
  "D says duh",
  "E says eh",
  "F says fff",
  "G says guh",
  "H says huh",
  "I says ih",
  "J says juh",
  "c. a. t. cat.",
  "b. a. t. bat.",
  "h. a. t. hat.",
  "p. e. n. pen.",
  "b. u. s. bus.",
  "s. u. n. sun.",
  "d. o. g. dog.",
  "c. u. p. cup.",
  "p. i. g. pig.",
  "b. e. d. bed.",
  "I see a dog.",
  "It is a red bus.",
  "Mum and Dad.",
  "The sun is hot.",
  "The big brown dog ran fast.",
  "I like to play in the park.",
  "My mum makes the best food.",
  "We went to school on the bus.",
  "The little bird flew up to the sky.",
  "Can you help me find my book?",
  "I love my baby sister.",
  "Wow, look at the rainbow!",
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

/** All phrases that must be pre-generated — never synthesized at runtime. */
export function getStaticTtsEntries(): StaticTtsEntry[] {
  const entries: StaticTtsEntry[] = [];

  for (const text of UI_PHRASES) {
    entries.push({ text, mode: "default" });
  }

  for (const text of TIER_12_24M_SOUNDS) {
    entries.push({ text, mode: "default" });
  }

  for (const [letter, phon, word] of ALPHABET) {
    entries.push({
      text: `${letter} says ${phon}. ${letter} for ${word}.`,
      mode: "default",
    });
  }

  for (const text of getPhonicsAudioTextsForStaticCatalog()) {
    entries.push({ text, mode: "phonics" });
  }
  for (const text of getCvcPhonemeAudioTextsForStaticCatalog()) {
    entries.push({ text, mode: "phonics" });
  }
  for (const entry of PHONICS_CVC_ENTRIES) {
    entries.push({ text: formatBlendLine(entry.word), mode: "phonics" });
  }

  for (const [word, blend] of CVC_WORDS) {
    const sounds = blend.split("–");
    entries.push({ text: `${sounds.join(". ")}. ${word}.`, mode: "default" });
  }

  for (const word of SIGHT_WORDS) {
    entries.push({ text: `${word}.`, mode: "default" });
  }

  for (const s of SIMPLE_SENTENCES) {
    entries.push({ text: s, mode: "default" });
  }

  for (const [dig, phon, word] of DIGRAPHS) {
    entries.push({ text: `${dig} says ${phon}, like in ${word}.`, mode: "default" });
    entries.push({ text: phon, mode: "phonics" });
  }

  for (const line of STORY_LINES) {
    entries.push({ text: line, mode: "default" });
  }

  for (const text of LEGACY_PHONICS_SOUNDS) {
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

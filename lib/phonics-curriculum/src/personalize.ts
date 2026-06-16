import { CVC_WORDS, getCvcWordEntry } from "@workspace/phonics-sounds";
import type { CurriculumLevel } from "./types.js";
import {
  WORD_FAMILY_ANCHOR_WORDS,
  WORD_FAMILY_IDS,
  getCurriculumLevelDef,
} from "./levels.js";
import { isContentUnlocked } from "./level-gating.js";

/** Words that reinforce a weak vowel/consonant phoneme. */
export function wordsForWeakPhoneme(phoneme: string, limit = 4): string[] {
  const p = phoneme.trim();
  const fromCvc = CVC_WORDS.filter((w) => w.phonemes.includes(p)).map((w) => w.word);
  if (fromCvc.length >= limit) return fromCvc.slice(0, limit);

  const levelDef = PHONICS_WEAK_FALLBACK[p] ?? [];
  return [...new Set([...fromCvc, ...levelDef])].slice(0, limit);
}

const PHONICS_WEAK_FALLBACK: Record<string, string[]> = {
  ɪ: ["sit", "hit", "pin", "pig"],
  æ: ["cat", "bat", "mat", "hat"],
  ɛ: ["pen", "hen", "ten", "bed"],
  ɒ: ["dog", "log", "fog", "pot"],
  ʌ: ["cup", "sun", "bus", "rug"],
  i: ["sit", "hit", "pin"],
  a: ["cat", "bat", "mat"],
};

function pickFamilyPracticeTargets(
  weakPhonemes: string[],
  count: number,
  seed: number,
): string[] {
  const anchors = WORD_FAMILY_IDS.map((id) => WORD_FAMILY_ANCHOR_WORDS[id]);
  const pool = [...anchors];
  for (const ph of weakPhonemes.slice(0, 2)) {
    for (const w of wordsForWeakPhoneme(ph, 2)) {
      if (isContentUnlocked(w, 3, "word")) pool.push(w);
    }
  }
  const unique = [...new Set(pool.map((s) => s.trim().toLowerCase()))];
  const shuffled = shuffle(unique, seed);
  const out: string[] = [];
  for (const word of shuffled) {
    if (out.length >= count) break;
    if (isContentUnlocked(word, 3, "word")) out.push(word);
  }
  while (out.length < count && unique.length > 0) {
    const next = unique[out.length % unique.length]!;
    if (!out.includes(next)) out.push(next);
    else break;
  }
  return out.slice(0, count);
}

export function pickPracticeTargets(
  level: CurriculumLevel,
  weakPhonemes: string[],
  count: number,
  seed: number,
): string[] {
  if (level === 3) {
    return pickFamilyPracticeTargets(weakPhonemes, count, seed);
  }

  const def = getCurriculumLevelDef(level);
  const pool = [...def.content];
  for (const ph of weakPhonemes.slice(0, 2)) {
    for (const w of wordsForWeakPhoneme(ph, 2)) {
      if (isContentUnlocked(w, level, "word")) pool.push(w);
    }
  }
  const unique = [...new Set(pool.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  const shuffled = shuffle(unique, seed);
  const out: string[] = [];
  for (const item of shuffled) {
    if (out.length >= count) break;
    const word = item.replace(/\.$/, "").split(/\s+/)[0]!;
    if (word.length <= 12 && isContentUnlocked(word, level)) out.push(word);
  }
  while (out.length < count && unique.length > 0) {
    const candidate = unique[out.length % unique.length]!;
    const word = candidate.replace(/\.$/, "").split(/\s+/)[0]!;
    if (word.length <= 12 && isContentUnlocked(word, level) && !out.includes(word)) {
      out.push(word);
    } else {
      break;
    }
  }
  return out.slice(0, count);
}

export function pickRevisionPhoneme(
  weakPhonemes: string[],
  level: CurriculumLevel,
  seed: number,
): string {
  if (weakPhonemes.length > 0) {
    return weakPhonemes[seed % weakPhonemes.length]!;
  }
  const vowels = ["æ", "ɪ", "ɛ", "ɒ", "ʌ"];
  return vowels[(level + seed) % vowels.length]!;
}

export function phonemeToRevisionLabel(phoneme: string): string {
  const map: Record<string, string> = {
    æ: "a as in apple",
    ɛ: "e as in egg",
    ɪ: "i as in igloo",
    ɒ: "o as in octopus",
    ʌ: "u as in umbrella",
    k: "k sound",
    b: "b sound",
    t: "t sound",
  };
  return map[phoneme] ?? `${phoneme} sound`;
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

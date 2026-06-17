/**
 * AmyNest phonics dataset — production letter/digraph/blend/CVC definitions.
 * Audio keys map to `/phonics-audio/{audioKey}.mp3` (never runtime TTS).
 */

export type LetterSoundEntry = {
  phoneme: string;
  example: string;
  audioKey: string;
};

export type DigraphSoundEntry = LetterSoundEntry;

/** Letter phonemes A–Z (short vowels + consonants). */
export const LETTER_SOUNDS: Record<string, LetterSoundEntry> = {
  a: { phoneme: "ah", example: "apple", audioKey: "a" },
  b: { phoneme: "b", example: "bat", audioKey: "b" },
  c: { phoneme: "k", example: "cat", audioKey: "c" },
  d: { phoneme: "d", example: "dog", audioKey: "d" },
  e: { phoneme: "eh", example: "egg", audioKey: "e" },
  f: { phoneme: "f", example: "fish", audioKey: "f" },
  g: { phoneme: "g", example: "goat", audioKey: "g" },
  h: { phoneme: "h", example: "hat", audioKey: "h" },
  i: { phoneme: "ih", example: "igloo", audioKey: "i" },
  j: { phoneme: "j", example: "jam", audioKey: "j" },
  k: { phoneme: "k", example: "kite", audioKey: "k" },
  l: { phoneme: "l", example: "lion", audioKey: "l" },
  m: { phoneme: "mmm", example: "man", audioKey: "m" },
  n: { phoneme: "nnn", example: "nest", audioKey: "n" },
  o: { phoneme: "ah", example: "octopus", audioKey: "o" },
  p: { phoneme: "p", example: "pen", audioKey: "p" },
  q: { phoneme: "kw", example: "queen", audioKey: "q" },
  r: { phoneme: "r", example: "rat", audioKey: "r" },
  s: { phoneme: "sss", example: "sun", audioKey: "s" },
  t: { phoneme: "t", example: "tap", audioKey: "t" },
  u: { phoneme: "uh", example: "umbrella", audioKey: "u" },
  v: { phoneme: "v", example: "van", audioKey: "v" },
  w: { phoneme: "w", example: "water", audioKey: "w" },
  x: { phoneme: "ks", example: "box", audioKey: "x" },
  y: { phoneme: "y", example: "yak", audioKey: "y" },
  z: { phoneme: "zzz", example: "zebra", audioKey: "z" },
};

/** Digraph phonemes — th1/th2 = unvoiced/voiced. */
export const DIGRAPHS: Record<string, DigraphSoundEntry> = {
  sh: { phoneme: "sh", example: "ship", audioKey: "sh" },
  ch: { phoneme: "ch", example: "chip", audioKey: "ch" },
  th_unvoiced: { phoneme: "th", example: "thin", audioKey: "th1" },
  th_voiced: { phoneme: "th", example: "this", audioKey: "th2" },
  wh: { phoneme: "wh", example: "whale", audioKey: "wh" },
  ph: { phoneme: "f", example: "phone", audioKey: "ph" },
  ng: { phoneme: "ng", example: "ring", audioKey: "ng" },
  ck: { phoneme: "k", example: "duck", audioKey: "ck" },
  qu: { phoneme: "kw", example: "queen", audioKey: "qu" },
};

/** Consonant blends — example words only (sounds are sequential letter phonemes). */
export const BLENDS: Record<string, string[]> = {
  bl: ["black", "blue"],
  cl: ["clap", "clock"],
  fl: ["flag", "flower"],
  gl: ["glass", "glow"],
  br: ["brush", "brown"],
  cr: ["crab", "cry"],
  dr: ["drum", "drop"],
  fr: ["frog", "fruit"],
  gr: ["green", "grape"],
  tr: ["tree", "train"],
  sk: ["sky", "skip"],
  sm: ["smile", "small"],
  sn: ["snake", "snow"],
  sp: ["spin", "spoon"],
  st: ["star", "stop"],
  sw: ["swim", "sweet"],
};

/** Starter CVC pool for blending practice. */
export const CVC_WORD_LIST = [
  "cat",
  "bat",
  "rat",
  "mat",
  "dog",
  "log",
  "fog",
  "pen",
  "ten",
  "hen",
  "sit",
  "hit",
  "bit",
  "cup",
  "sun",
  "run",
] as const;

// P5 fix — "ck" (/k/) and "qu" (/kw/) are single grapheme units so blending
// segments e.g. "duck" → ["d","u","ck"] and "queen" → ["qu","ee"...] rather
// than splitting them into individual letters.
const DIGRAPH_GRAPHEMES = ["sh", "ch", "th", "ng", "ph", "wh", "ck", "qu"] as const;

/** Words where "th" is voiced (this, that, them…). */
const TH_VOICED_WORDS = new Set([
  "this",
  "that",
  "them",
  "then",
  "than",
  "these",
  "those",
  "their",
  "there",
  "they",
  "mother",
  "father",
  "brother",
  "other",
  "with",
]);

/**
 * Split a lowercase word into grapheme chunks (digraph-aware).
 * "ship" → ["sh","i","p"]; "cat" → ["c","a","t"].
 */
export function getPhonemeSequence(word: string, wholeWord?: string): string[] {
  const w = word.trim().toLowerCase();
  const context = (wholeWord ?? word).trim().toLowerCase();
  const result: string[] = [];
  let i = 0;

  while (i < w.length) {
    const pair = w.slice(i, i + 2);
    if (pair === "th") {
      result.push(TH_VOICED_WORDS.has(context) ? "th_voiced" : "th_unvoiced");
      i += 2;
      continue;
    }
    if ((DIGRAPH_GRAPHEMES as readonly string[]).includes(pair)) {
      result.push(pair);
      i += 2;
      continue;
    }
    result.push(w[i]!);
    i += 1;
  }

  return result;
}

/** Public URL path for a curated phonics MP3. */
export function getPhonicsAudioPath(audioKey: string): string {
  const key = (audioKey ?? "").trim().toLowerCase();
  return `/phonics-audio/${key}.mp3`;
}

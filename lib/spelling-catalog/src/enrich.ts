import type { SpellingAgeGroup, SpellingCatalogEntry, SpellingDifficulty } from "./types.js";

const VOWEL_GROUPS = /[aeiouy]+/gi;
const DIGRAPHS = ["sh", "ch", "th", "ph", "wh", "ck", "ng", "qu", "ee", "ea", "oo", "ai", "ay", "oa", "ou", "ow", "oi", "oy", "ar", "er", "ir", "or", "ur"];

const MEANINGS: Record<string, string> = {
  cat: "A small furry pet that says meow.",
  dog: "A friendly pet that says woof.",
  sun: "It shines brightly in the sky.",
  ball: "Round — you can throw or kick it.",
  school: "Where you go to learn.",
  elephant: "A huge grey animal with a long trunk.",
  adventure: "An exciting trip or experience.",
  beautiful: "Very nice to look at.",
  knowledge: "Things you have learned.",
};

function splitSyllables(word: string): string[] {
  const w = word.toLowerCase();
  if (w.length <= 3) return [w];
  const parts: string[] = [];
  let i = 0;
  while (i < w.length) {
    let best = 1;
    for (const dg of DIGRAPHS) {
      if (w.slice(i, i + dg.length) === dg) best = Math.max(best, dg.length);
    }
    const chunk = w.slice(i, i + Math.min(best + 1, w.length - i));
    parts.push(chunk);
    i += chunk.length;
    if (parts.length >= 4) break;
  }
  if (i < w.length) parts.push(w.slice(i));
  return parts.length > 0 ? parts : [w];
}

function splitSounds(word: string): string[] {
  const w = word.toLowerCase();
  const sounds: string[] = [];
  let i = 0;
  while (i < w.length) {
    let matched = false;
    for (const dg of [...DIGRAPHS].sort((a, b) => b.length - a.length)) {
      if (w.slice(i, i + dg.length) === dg) {
        sounds.push(dg);
        i += dg.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      sounds.push(w[i]!);
      i += 1;
    }
  }
  return sounds;
}

function inferPhonicsTags(word: string, sounds: string[]): string[] {
  const tags = new Set<string>();
  const w = word.toLowerCase();
  if (w.length <= 3 && sounds.length === w.length) tags.add("cvc");
  if (sounds.some((s) => DIGRAPHS.includes(s))) tags.add("digraph");
  if (/^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw)/.test(w)) tags.add("blend");
  if (w.endsWith("ing")) tags.add("suffix-ing");
  if (w.endsWith("ed")) tags.add("suffix-ed");
  if (w.includes("tion")) tags.add("tion");
  if (w.length >= 8) tags.add("multisyllable");
  if (tags.size === 0) tags.add("phonics");
  return [...tags];
}

function defaultMeaning(word: string, ageGroup: SpellingAgeGroup): string {
  if (MEANINGS[word]) return MEANINGS[word]!;
  if (ageGroup === "2-4") return `A simple word: ${word}.`;
  if (ageGroup === "4-6") return `A word to learn: ${word}.`;
  if (ageGroup === "6-8") return `A spelling word: ${word}.`;
  return `An advanced spelling word: ${word}.`;
}

function defaultSentence(word: string, ageGroup: SpellingAgeGroup): string {
  const w = word.toLowerCase();
  if (ageGroup === "2-4") return `Look at the ${w}.`;
  if (ageGroup === "4-6") return `I can spell ${w}.`;
  if (ageGroup === "6-8") return `The word is ${w}.`;
  return `She used the word "${w}" in her story.`;
}

/** Map pool rank (0-based) + difficulty → mastery level 1–50. */
export function masteryLevelForRank(
  rank: number,
  total: number,
  difficulty: SpellingDifficulty,
): number {
  const base =
    difficulty === "easy" ? 1 : difficulty === "medium" ? 8 : 18;
  const span =
    difficulty === "easy" ? 14 : difficulty === "medium" ? 22 : 32;
  const t = total <= 1 ? 0 : rank / (total - 1);
  return Math.min(50, Math.max(1, Math.round(base + t * span)));
}

export function enrichWord(
  word: string,
  ageGroup: SpellingAgeGroup,
  difficulty: SpellingDifficulty,
  rank: number,
  total: number,
  overrides?: Partial<Pick<SpellingCatalogEntry, "meaning" | "sentence" | "syllables" | "sounds" | "phonicsTags">>,
): SpellingCatalogEntry {
  const w = word.toLowerCase().trim();
  const syllables = overrides?.syllables ?? splitSyllables(w);
  const sounds = overrides?.sounds ?? splitSounds(w);
  const phonicsTags = overrides?.phonicsTags ?? inferPhonicsTags(w, sounds);
  return {
    id: `${ageGroup}:${difficulty}:${w}`,
    word: w,
    ageGroup,
    difficulty,
    meaning: overrides?.meaning ?? defaultMeaning(w, ageGroup),
    syllables,
    sounds,
    sentence: overrides?.sentence ?? defaultSentence(w, ageGroup),
    phonicsTags,
    masteryLevel: masteryLevelForRank(rank, total, difficulty),
  };
}

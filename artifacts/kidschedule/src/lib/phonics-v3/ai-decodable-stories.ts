/**
 * AI-style decodable story generation constrained to unlocked SATPIN graphemes.
 * Never introduces graphemes the child has not unlocked.
 */
import {
  getUnlockedGraphemes,
  getUnlockedGroupWords,
  wordDecodableWithGraphemes,
} from "@workspace/phonics-curriculum";

export type DecodableStoryLine = {
  text: string;
  words: string[];
};

export type GeneratedDecodableStory = {
  id: string;
  title: string;
  letterGroupIndex: number;
  lines: DecodableStoryLine[];
  graphemesUsed: string[];
};

const NAME_BY_GROUP: Record<number, string[]> = {
  1: ["Sam", "Pat", "Nat", "Pip"],
  2: ["Tom", "Dom", "Kim", "Pam"],
  3: ["Ned", "Ken", "Ruf", "Peg"],
  4: ["Ben", "Hal", "Finn", "Len"],
  5: ["Jill", "Jess", "Bill", "Miss"],
  6: ["Val", "Wes", "Zak", "Yv"],
  7: ["Quinn"],
  8: ["Ash", "Chip", "Theo"],
};

function capitalize(word: string): string {
  if (!word) return word;
  return word[0]!.toUpperCase() + word.slice(1);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]!;
}

/**
 * Build a short decodable story using only words/graphemes unlocked
 * through `letterGroupIndex`.
 */
export function generateDecodableStory(
  letterGroupIndex: number,
  seed = 1,
): GeneratedDecodableStory {
  const group = Math.max(1, Math.min(8, Math.round(letterGroupIndex)));
  const graphemes = getUnlockedGraphemes(group);
  const words = getUnlockedGroupWords(group).filter((w) =>
    wordDecodableWithGraphemes(w, graphemes),
  );
  const names = (NAME_BY_GROUP[group] ?? NAME_BY_GROUP[1]!).filter((n) =>
    wordDecodableWithGraphemes(n.toLowerCase(), graphemes) ||
    [...n.toLowerCase()].every((ch) => graphemes.has(ch)),
  );
  const name = pick(names.length ? names : ["Sam"], seed);
  const w1 = pick(words.length ? words : ["sat"], seed + 1);
  const w2 = pick(words.length ? words : ["sit"], seed + 2);
  const w3 = pick(words.length ? words : ["tap"], seed + 3);

  const templates: string[][] = [
    [`${name} ${w1}.`, `${capitalize(w2)}.`, `${name} is in.`],
    [`Pat ${w1}.`, `${name} ${w2}.`, `${capitalize(w3)}!`],
    [`${name} sat.`, `${name} ${w2}.`, `I ${w3}.`],
  ];

  if (group >= 2) {
    templates.push(
      [`The dog ${w1}.`, `The cat ${w2}.`, `${name} got a ${w3}.`],
      [`${name} can ${w2}.`, `A cat sat.`, `${name} ${w1}.`],
    );
  }

  const linesRaw = pick(templates, seed + 7);
  const lines: DecodableStoryLine[] = linesRaw.map((text) => ({
    text,
    words: text
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter(Boolean),
  }));

  // Safety: drop any line that somehow includes locked graphemes
  const safeLines = lines.filter((line) =>
    line.words.every(
      (w) =>
        ["the", "a", "i", "is", "in"].includes(w) ||
        wordDecodableWithGraphemes(w, graphemes),
    ),
  );

  const used = new Set<string>();
  for (const line of safeLines) {
    for (const w of line.words) {
      for (const ch of w) if (graphemes.has(ch)) used.add(ch);
    }
  }

  return {
    id: `ai-decodable-g${group}-${seed}`,
    title: group <= 1 ? `${name} Sat` : `${name} and the Cat`,
    letterGroupIndex: group,
    lines: safeLines.length > 0 ? safeLines : lines.slice(0, 2),
    graphemesUsed: [...used].sort(),
  };
}

/** Sight words allowed as high-frequency glue in early stories. */
export const EARLY_GLUE_WORDS = ["a", "i", "is", "in", "the"] as const;

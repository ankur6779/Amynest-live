/**
 * Word family catalog — pure data for Phonics V2.
 * Families group decodable CVC words by rime pattern.
 */

export type WordFamilyId = "at" | "an" | "og" | "in" | "ip";

export type WordFamilyStatus = "not_started" | "practicing" | "mastered";

export type WordFamilyWord = {
  word: string;
  emoji: string;
};

export type WordFamilyDef = {
  id: WordFamilyId;
  /** Display suffix e.g. "-at" */
  suffix: string;
  /** Rime letters highlighted in UI (without leading consonant) */
  rime: string;
  title: string;
  badgeName: string;
  badgeEmoji: string;
  words: WordFamilyWord[];
};

export const WORD_FAMILIES: WordFamilyDef[] = [
  {
    id: "at",
    suffix: "-at",
    rime: "at",
    title: "AT Family",
    badgeName: "AT Explorer",
    badgeEmoji: "🐱",
    words: [
      { word: "cat", emoji: "🐱" },
      { word: "bat", emoji: "🦇" },
      { word: "hat", emoji: "🎩" },
      { word: "mat", emoji: "🧶" },
      { word: "rat", emoji: "🐀" },
    ],
  },
  {
    id: "an",
    suffix: "-an",
    rime: "an",
    title: "AN Family",
    badgeName: "AN Explorer",
    badgeEmoji: "🥫",
    words: [
      { word: "can", emoji: "🥫" },
      { word: "fan", emoji: "🌀" },
      { word: "man", emoji: "👨" },
      { word: "pan", emoji: "🍳" },
    ],
  },
  {
    id: "og",
    suffix: "-og",
    rime: "og",
    title: "OG Family",
    badgeName: "OG Explorer",
    badgeEmoji: "🐶",
    words: [
      { word: "dog", emoji: "🐶" },
      { word: "log", emoji: "🪵" },
      { word: "fog", emoji: "🌫️" },
    ],
  },
  {
    id: "in",
    suffix: "-in",
    rime: "in",
    title: "IN Family",
    badgeName: "IN Explorer",
    badgeEmoji: "📍",
    words: [
      { word: "pin", emoji: "📍" },
      { word: "win", emoji: "🏆" },
      { word: "fin", emoji: "🐟" },
    ],
  },
  {
    id: "ip",
    suffix: "-ip",
    rime: "ip",
    title: "IP Family",
    badgeName: "IP Explorer",
    badgeEmoji: "💧",
    words: [
      { word: "sip", emoji: "🥤" },
      { word: "lip", emoji: "👄" },
      { word: "tip", emoji: "💡" },
    ],
  },
];

const FAMILY_BY_ID = new Map(WORD_FAMILIES.map((f) => [f.id, f]));
const FAMILY_BY_WORD = new Map<string, WordFamilyId>();

for (const family of WORD_FAMILIES) {
  for (const w of family.words) {
    FAMILY_BY_WORD.set(w.word.toLowerCase(), family.id);
  }
}

export function getWordFamily(id: WordFamilyId): WordFamilyDef | undefined {
  return FAMILY_BY_ID.get(id);
}

export function getFamilyForWord(word: string): WordFamilyDef | undefined {
  const id = FAMILY_BY_WORD.get(word.trim().toLowerCase());
  return id ? FAMILY_BY_ID.get(id) : undefined;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Build a guaranteed-valid "Find the Family" question.
 *
 * Picks a target family (preferring one represented in `seedWords`) and returns
 * exactly one correct word plus two distractors from other families, so the
 * prompt always has a single right answer. Never produces an impossible round.
 */
export function buildFamilyQuestion(seedWords: string[] = []): {
  familyId: WordFamilyId;
  options: string[];
} {
  const target =
    WORD_FAMILIES.find((f) =>
      seedWords.some((w) => getFamilyForWord(w)?.id === f.id),
    ) ??
    shuffleArray(WORD_FAMILIES)[0]!;

  const correct = shuffleArray(target.words.map((w) => w.word))[0]!;
  const distractors = shuffleArray(
    WORD_FAMILIES.filter((f) => f.id !== target.id).flatMap((f) =>
      f.words.map((w) => w.word),
    ),
  ).slice(0, 2);

  return {
    familyId: target.id,
    options: shuffleArray([correct, ...distractors]),
  };
}

/** Split display word into onset + rime for pattern highlighting. */
export function splitOnsetRime(word: string, rime: string): { onset: string; rime: string } {
  const w = word.trim().toLowerCase();
  const r = rime.trim().toLowerCase();
  if (w.endsWith(r) && w.length > r.length) {
    return { onset: w.slice(0, w.length - r.length), rime: r };
  }
  return { onset: w.slice(0, 1), rime: w.slice(1) };
}

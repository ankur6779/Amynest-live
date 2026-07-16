/**
 * Synthetic Phonics letter introduction groups (SATPIN-style).
 *
 * Children unlock graphemes in research-backed clusters so they can blend
 * meaningful CVC words after Group 1 — not after finishing A–Z.
 *
 * Aligns with Letters and Sounds Phase 2 / Jolly Phonics grouping principles.
 */

export type LetterGroupId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type LetterIntroductionGroup = {
  id: LetterGroupId;
  /** Short UI label */
  name: string;
  /** Parent-facing description */
  description: string;
  /**
   * Graphemes introduced in this group (lowercase).
   * Multi-letter graphemes (ck, qu, sh, …) are included as taught units.
   */
  graphemes: readonly string[];
  /** Decodable words unlocked after this group is complete (lowercase). */
  words: readonly string[];
  /** Celebration / gamification */
  badge: string;
  treasureEmoji: string;
};

/**
 * Core letter groups (1–7) + digraph expansion (8).
 * Order is pedagogical — never alphabetical.
 */
export const LETTER_INTRODUCTION_GROUPS: readonly LetterIntroductionGroup[] = [
  {
    id: 1,
    name: "SATPIN",
    description: "First sounds — start blending real words right away",
    graphemes: ["s", "a", "t", "p", "i", "n"],
    words: ["sat", "sit", "pin", "pan", "tap", "pat", "nip", "tin"],
    badge: "First Reader",
    treasureEmoji: "💎",
  },
  {
    id: 2,
    name: "MDGOCK",
    description: "More consonants and short o — build a bigger word bank",
    graphemes: ["m", "d", "g", "o", "c", "k"],
    words: ["dog", "dig", "got", "mat", "cat", "cot", "kit", "mop"],
    badge: "Word Builder",
    treasureEmoji: "🏆",
  },
  {
    id: 3,
    name: "CKEUR",
    description: "ck digraph plus short e, u, and r",
    graphemes: ["ck", "e", "u", "r"],
    words: ["duck", "neck", "pen", "red", "cup", "run", "rug", "net"],
    badge: "Sound Spotter",
    treasureEmoji: "⭐",
  },
  {
    id: 4,
    name: "HBFL",
    description: "h, b, f, l — lots of new CVC blends",
    graphemes: ["h", "b", "f", "l"],
    words: ["hat", "bed", "fan", "log", "hop", "bus", "fog", "lip"],
    badge: "Blend Champ",
    treasureEmoji: "🎖️",
  },
  {
    id: 5,
    name: "Doubles + J",
    description: "Double letters ll/ss/ff and j",
    graphemes: ["ll", "ss", "ff", "j"],
    words: ["bell", "hiss", "puff", "jam", "hill", "mess", "off", "jet"],
    badge: "Double Star",
    treasureEmoji: "🌟",
  },
  {
    id: 6,
    name: "VWXYZ",
    description: "The last single-letter consonants",
    graphemes: ["v", "w", "x", "y", "z"],
    words: ["van", "win", "box", "yes", "zip", "wet", "fox", "yum"],
    badge: "Alphabet Finisher",
    treasureEmoji: "👑",
  },
  {
    id: 7,
    name: "QU",
    description: "Q is always taught with U — /kw/",
    graphemes: ["qu"],
    words: ["quit", "quiz", "quill"],
    badge: "QU Quest",
    treasureEmoji: "🔑",
  },
  {
    id: 8,
    name: "Digraphs",
    description: "Two letters, one sound — sh, ch, th, ng and friends",
    graphemes: [
      "sh",
      "ch",
      "th",
      "ng",
      "ai",
      "ee",
      "oa",
      "oo",
      "ar",
      "or",
      "ur",
      "ow",
      "oi",
      "ear",
      "air",
      "ure",
    ],
    words: ["ship", "chip", "thin", "ring", "rain", "see", "boat", "moon"],
    badge: "Digraph Hero",
    treasureEmoji: "🌈",
  },
] as const;

/** Single letters a–z in SATPIN introduction order (q deferred → taught as qu). */
export const SATPIN_LETTER_ORDER: readonly string[] = [
  "s",
  "a",
  "t",
  "p",
  "i",
  "n",
  "m",
  "d",
  "g",
  "o",
  "c",
  "k",
  "e",
  "u",
  "r",
  "h",
  "b",
  "f",
  "l",
  "j",
  "v",
  "w",
  "x",
  "y",
  "z",
  "q",
];

export const MAX_LETTER_GROUP: LetterGroupId = 8;

export function clampLetterGroupIndex(n: number): LetterGroupId {
  const v = Math.max(1, Math.min(MAX_LETTER_GROUP, Math.round(n)));
  return v as LetterGroupId;
}

export function getLetterGroup(id: number): LetterIntroductionGroup {
  return (
    LETTER_INTRODUCTION_GROUPS.find((g) => g.id === id) ??
    LETTER_INTRODUCTION_GROUPS[0]!
  );
}

/** All graphemes unlocked through (and including) `groupIndex`. */
export function getUnlockedGraphemes(groupIndex: number): Set<string> {
  const max = clampLetterGroupIndex(groupIndex);
  const out = new Set<string>();
  for (const g of LETTER_INTRODUCTION_GROUPS) {
    if (g.id > max) break;
    for (const gr of g.graphemes) {
      out.add(gr);
      // Single-letter aliases: "ck" also unlocks using c/k in CVC checks via expand
      if (gr.length === 1) out.add(gr);
    }
  }
  // qu unlocks q for letter-tile purposes
  if (out.has("qu")) out.add("q");
  // doubles map to base letter for CVC letter checks
  if (out.has("ll")) out.add("l");
  if (out.has("ss")) out.add("s");
  if (out.has("ff")) out.add("f");
  return out;
}

/** Decodable words unlocked through `groupIndex` (groups 1–7 word banks). */
export function getUnlockedGroupWords(groupIndex: number): string[] {
  const max = clampLetterGroupIndex(groupIndex);
  const words: string[] = [];
  for (const g of LETTER_INTRODUCTION_GROUPS) {
    if (g.id > max) break;
    if (g.id === 8) continue; // digraph words gated by curriculum L4
    words.push(...g.words);
  }
  return [...new Set(words)];
}

/**
 * Can this CVC/simple word be decoded with the unlocked grapheme set?
 * Handles ck/qu as digraph units inside the word.
 */
export function wordDecodableWithGraphemes(
  word: string,
  unlocked: Set<string>,
): boolean {
  const w = word.trim().toLowerCase();
  if (!w || !/^[a-z]+$/.test(w)) return false;

  const multi = [
    "qu",
    "ck",
    "ll",
    "ss",
    "ff",
    "sh",
    "ch",
    "th",
    "ng",
    "wh",
    "ph",
  ] as const;

  let i = 0;
  while (i < w.length) {
    let matched = false;
    for (const dig of multi) {
      if (w.startsWith(dig, i) && unlocked.has(dig)) {
        i += dig.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const ch = w[i]!;
    if (!unlocked.has(ch)) return false;
    i += 1;
  }
  return true;
}

/**
 * Infer highest unlocked letter group from mastered letter symbols.
 * Used for migration of existing A–Z progress → SATPIN without reset.
 */
export function inferLetterGroupFromMasteredLetters(
  masteredLetters: Iterable<string>,
  currentLevel: number,
): LetterGroupId {
  if (currentLevel >= 2) return MAX_LETTER_GROUP;

  const mastered = new Set(
    [...masteredLetters].map((l) => l.trim().toLowerCase()).filter(Boolean),
  );
  if (mastered.size === 0) return 1;

  let unlocked: LetterGroupId = 1;
  for (const g of LETTER_INTRODUCTION_GROUPS) {
    if (g.id === 8) break; // digraphs follow curriculum L4, not letter mastery
    const needed = g.graphemes.map((gr) => {
      if (gr === "qu") return "q";
      if (gr === "ck") return "c";
      if (gr === "ll") return "l";
      if (gr === "ss") return "s";
      if (gr === "ff") return "f";
      return gr.length === 1 ? gr : gr;
    });
    const allMastered = needed.every((l) => {
      if (l === "c") return mastered.has("c") || mastered.has("k");
      return mastered.has(l);
    });
    if (allMastered) unlocked = g.id as LetterGroupId;
    else break;
  }
  return unlocked;
}

/**
 * Advance letter group when the child has mastered every grapheme in the
 * current group (single letters). Digraph group (8) is advanced via L4 pathway.
 */
export function nextLetterGroupAfterMastery(
  currentGroup: number,
  masteredLetters: Iterable<string>,
): LetterGroupId {
  const cur = clampLetterGroupIndex(currentGroup);
  if (cur >= 7) return cur;
  const g = getLetterGroup(cur);
  const mastered = new Set(
    [...masteredLetters].map((l) => l.trim().toLowerCase()),
  );
  const needed = g.graphemes.map((gr) => {
    if (gr === "qu") return "q";
    if (gr === "ck") return "c"; // accept c or k
    if (gr === "ll") return "l";
    if (gr === "ss") return "s";
    if (gr === "ff") return "f";
    return gr;
  });
  const done = needed.every((l) => {
    if (l === "c") return mastered.has("c") || mastered.has("k");
    return mastered.has(l);
  });
  return done ? clampLetterGroupIndex(cur + 1) : cur;
}

/** Gamification: treasure chest reward for completing a group. */
export function getGroupCompletionReward(groupId: number): {
  badge: string;
  treasureEmoji: string;
  stars: number;
  label: string;
} {
  const g = getLetterGroup(groupId);
  return {
    badge: g.badge,
    treasureEmoji: g.treasureEmoji,
    stars: 3 + groupId,
    label: `Group ${g.id} complete — ${g.name}!`,
  };
}
